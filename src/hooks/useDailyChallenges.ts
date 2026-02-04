import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, updateDoc, getDoc, getDocs, collection, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { format, subDays, parseISO, isSameDay } from "date-fns";
import { generateDailyChallenge } from "@/lib/gemini";
import { sendTelegramMessage } from "@/lib/telegram";

export interface DailyChallenge {
    id: string;
    uid: string;
    title: string;
    description: string;
    target: string;
    category: 'hydration' | 'activity' | 'mental' | 'nutrition' | 'social' | 'household' | 'fun';
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    type: 'solo' | 'coop' | 'competitive' | 'prank';
    pointsReward?: number;
    isSpecial?: boolean;
    completed: boolean;
    generatedAt: string;
}

export interface UserChallengeStats {
    currentStreak: number;
    bestStreak: number;
    lastCompletionDate: string | null;
}

export function useDailyChallenges() {
    const { household, addPoints } = useHousehold();
    const { user } = useAuth();
    const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
    const [history, setHistory] = useState<DailyChallenge[]>([]);
    const [stats, setStats] = useState<UserChallengeStats>({ currentStreak: 0, bestStreak: 0, lastCompletionDate: null });
    const [loading, setLoading] = useState(true);

    const today = format(new Date(), 'yyyy-MM-dd');

    useEffect(() => {
        if (!household || !user) return;

        const challengeId = `${today}_${user.uid}`;
        const challengeRef = doc(db, "households", household.id, "dailyChallenges", challengeId);
        const statsRef = doc(db, "households", household.id, "memberMetadata", user.uid, "challengeStats", "main");
        const historyRef = collection(db, "households", household.id, "dailyChallenges");

        // Listen to stats
        const unsubStats = onSnapshot(statsRef, (snap) => {
            if (snap.exists()) {
                setStats(snap.data() as UserChallengeStats);
            }
        });

        // Listen to history
        const historyQuery = query(
            historyRef,
            where("uid", "==", user.uid),
            orderBy("generatedAt", "desc"),
            limit(10)
        );
        const unsubHistory = onSnapshot(historyQuery, (snap) => {
            const h = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as DailyChallenge))
                .filter(d => d.id !== challengeId); // Exclude today
            setHistory(h);
        });

        // Listen to today's challenge
        const unsubChallenge = onSnapshot(challengeRef, async (snap) => {
            if (snap.exists()) {
                setChallenge({ id: snap.id, ...snap.data() } as DailyChallenge);
                setLoading(false);
            } else {
                // Generate it for me!
                await triggerGeneration(user.uid);
            }
        });

        // [NEW] Check for other members' challenges to ensure everyone gets a Telegram notification
        const checkOtherMembers = async () => {
            if (!household) return;
            for (const memberUid of household.members) {
                if (memberUid === user.uid) continue;
                const otherChallengeId = `${today}_${memberUid}`;
                const otherChallengeRef = doc(db, "households", household.id, "dailyChallenges", otherChallengeId);
                const otherSnap = await getDoc(otherChallengeRef);
                if (!otherSnap.exists()) {
                    console.log(`Triggering generation for member ${memberUid}`);
                    await triggerGeneration(memberUid);
                }
            }
        };
        checkOtherMembers();

        return () => {
            unsubStats();
            unsubHistory();
            unsubChallenge();
        };
    }, [household?.id, user?.uid, today]);

    const triggerGeneration = async (targetUid: string) => {
        if (!household || !user) return;
        if (targetUid === user.uid) setLoading(true);

        try {
            // Get recent challenges for variety
            const recentChallengesQuery = query(
                collection(db, "households", household.id, "dailyChallenges"),
                where("uid", "==", targetUid),
                orderBy("generatedAt", "desc"),
                limit(10)
            );
            const recentSnap = await getDocs(recentChallengesQuery);
            const recentHistory = recentSnap?.docs?.map((d: any) => {
                const data = d.data();
                return `[${data.difficulty || 'moyen'}] [${data.pointsReward || 0}pts] [${data.category || 'diverse'}] ${data.title}`;
            }) || [];

            // Get target member stats
            const statsRef = doc(db, "households", household.id, "memberMetadata", targetUid, "challengeStats", "main");
            const statsSnap = await getDoc(statsRef);
            const targetStats = statsSnap.exists() ? statsSnap.data() as UserChallengeStats : { currentStreak: 0, bestStreak: 0, lastCompletionDate: null };

            // AI Context
            const familyContext = household.memberProfiles?.map(m => ({
                role: "Membre",
                age: m.age || (m.birthDate ? Math.floor((Date.now() - new Date(m.birthDate).getTime()) / 31557600000) : 30)
            })) || [];

            // Find current user age
            const currentUserProfile = household.memberProfiles?.find(m => m.uid === targetUid);
            const userAge = currentUserProfile?.age || (currentUserProfile?.birthDate ? Math.floor((Date.now() - new Date(currentUserProfile.birthDate).getTime()) / 31557600000) : undefined);

            // Sync with Scheduler: Tue (2), Sat (6) -> 2 days/week ONLY
            const isCollectiveDay = [2, 6].includes(new Date().getDay());

            // RANKING CHECK (For Hardcore/Catch-up Challenges)
            const scores = household.monthlyScores || {};
            const memberIds = household.members || [];
            let isLastInRanking = false;

            if (memberIds.length > 1) { // Only relevant if multiple people
                const myScore = scores[targetUid] || 0;
                // Check if anyone has a LOWER score. If NO one has lower score, I am last (or tied last).
                // Actually simpler: Sort scores.
                const sorted = memberIds.map(id => ({ id, score: scores[id] || 0 })).sort((a, b) => a.score - b.score);
                // The first one (index 0) has the LOWEST score.
                // ADDED RULE: Only activate Catch-up mode sometimes (e.g. 15% chance) to avoid spamming Hardcore challenges every day.
                if (sorted[0].id === targetUid) {
                    if (Math.random() < 0.10) { // 5% chance (Rare/Exceptional)
                        isLastInRanking = true;
                    }
                }
            }

            // 1. CHECK FOR SHARED COLLECTIVE CHALLENGE (Tue/Sat)
            let aiChallenge: any = null;
            if (isCollectiveDay) {
                const sharedId = `${today}_SHARED`;
                const sharedRef = doc(db, "households", household.id, "dailyChallenges", sharedId);
                const sharedSnap = await getDoc(sharedRef);

                if (sharedSnap.exists()) {
                    // Found the Master Challenge
                    const existing = sharedSnap.data();
                    aiChallenge = {
                        title: existing.title,
                        description: existing.description,
                        target: existing.target,
                        category: existing.category,
                        difficulty: existing.difficulty,
                        type: existing.type,
                        pointsReward: 0,
                        isSpecial: false
                    };
                } else {
                    // I am the first one! Generate and Save Master Key
                    const generated = await generateDailyChallenge({
                        targetMember: { uid: targetUid, role: "Membre", successes: targetStats.currentStreak, age: userAge, isLastInRanking },
                        familyContext,
                        recentChallenges: recentHistory,
                        isCollective: true
                    });

                    // Save as SHARED first
                    await setDoc(sharedRef, {
                        ...generated,
                        uid: "SHARED",
                        generatedAt: new Date().toISOString()
                    });

                    aiChallenge = generated;
                }
            }

            // 2. IF NO SHARED FOUND, GENERATE NEW
            if (!aiChallenge) {
                aiChallenge = await generateDailyChallenge({
                    targetMember: { uid: targetUid, role: "Membre", successes: targetStats.currentStreak, age: userAge, isLastInRanking },
                    familyContext,
                    recentChallenges: recentHistory,
                    isCollective: isCollectiveDay
                });
            }

            const challengeId = `${today}_${targetUid}`;
            const challengeData = {
                uid: targetUid,
                ...aiChallenge,
                completed: false,
                generatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, "households", household.id, "dailyChallenges", challengeId), challengeData);

            // Trigger Notification (Telegram)
            const telegramChatId = household.memberPreferences?.[targetUid]?.telegramChatId;
            if (telegramChatId) {
                await sendTelegramMessage(telegramChatId, `🔥 *Nouveau Défi LifeSync !*\n\n${aiChallenge.title}\n_${aiChallenge.description}_`);
            }
        } catch (error) {
            console.error(`Error generating challenge for ${targetUid}:`, error);
        } finally {
            if (targetUid === user.uid) setLoading(false);
        }
    };

    const toggleCompletion = async () => {
        if (!household || !user || !challenge) return;

        const newStatus = !challenge.completed;
        const challengeRef = doc(db, "households", household.id, "dailyChallenges", challenge.id);
        const statsRef = doc(db, "households", household.id, "memberMetadata", user.uid, "challengeStats", "main");

        await updateDoc(challengeRef, { completed: newStatus });

        if (newStatus) {
            // REWARD: Add Chore Points if applicable
            // SECURITY: Double check it is EXPERT
            if (challenge.pointsReward && challenge.pointsReward > 0 && challenge.difficulty === 'expert') {
                await addPoints(user.uid, challenge.pointsReward, `Défi Santé Expert : ${challenge.title}`, 'health');
            }

            // Update Streak
            const lastDate = stats.lastCompletionDate;
            const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

            let newStreak = stats.currentStreak;

            if (!lastDate || lastDate === yesterday || lastDate === today) {
                // Normal increment (if not already done today, assuming logic elsewhere handles daily limit or just increment)
                // Actually if lastDate == today, we shouldn't increment, just update status. 
                // But toggle implies switching. If we toggle ON, we assume it wasn't ON.
                // If lastDate was today, it means we probably unchecked and checked again.
                // Simpler logic: Recalculate based on CONTINUITY.
                if (lastDate !== today) newStreak += 1;
            } else {
                // BROKEN STREAK CANDIDATE
                // Check if yesterday was a SPECIAL challenge (Forgiveness Policy)
                try {
                    const yesterdayId = `${yesterday}_${user.uid}`;
                    const yesterdaySnap = await getDoc(doc(db, "households", household.id, "dailyChallenges", yesterdayId));
                    let forgiven = false;

                    if (yesterdaySnap.exists()) {
                        const yData = yesterdaySnap.data() as DailyChallenge;
                        // Special challenges don't break streak if missed
                        if (yData.isSpecial) {
                            forgiven = true;
                        }
                    }

                    if (forgiven) {
                        newStreak += 1; // Continue streak as if yesterday didn't exist or was neutral
                    } else {
                        newStreak = 1; // Reset
                    }
                } catch (e) {
                    console.error("Error checking streak forgiveness", e);
                    newStreak = 1;
                }
            }

            await setDoc(statsRef, {
                currentStreak: newStreak,
                bestStreak: Math.max(newStreak, stats.bestStreak),
                lastCompletionDate: today
            }, { merge: true });
        }
    };

    return { challenge, history, stats, loading, toggleCompletion };
}
