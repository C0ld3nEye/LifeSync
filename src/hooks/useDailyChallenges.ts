import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, updateDoc, getDoc, getDocs, collection, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { format, subDays, parseISO, isSameDay } from "date-fns";


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
    lastJokerUsedAt?: string | null; // [NEW] Joker Tracking
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
            // Call Server Action
            // We import it dynamically or assume it's available via module import
            const { generateDailyChallengeAction } = await import("@/app/actions/challenges");
            const result = await generateDailyChallengeAction(household.id, targetUid);

            if (!result.success) {
                console.error("Failed to generate challenge via Server Action:", result.error);
            }
        } catch (error) {
            console.error(`Error generating challenge for ${targetUid}:`, error);
        } finally {
            if (targetUid === user.uid) setLoading(false);
        }
    };

    const triggerJoker = async () => {
        if (!household || !user) return;
        setLoading(true);
        try {
            const { useJokerAction } = await import("@/app/actions/challenges");
            const result = await useJokerAction(household.id, user.uid);
            if (!result.success) {
                // Return error to UI? For now just log
                console.error("Joker failed:", result.error);
                throw new Error(result.error);
            }
            // Add UI Feedback (Confetti reversed? Sound?)
        } catch (e) {
            console.error("Joker Error", e);
            throw e; // Rethrow for UI handling
        } finally {
            setLoading(false);
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

    return { challenge, history, stats, loading, toggleCompletion, triggerJoker };
}
