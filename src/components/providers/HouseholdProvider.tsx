"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, increment, addDoc, collection, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { format, parseISO, startOfMonth, isBefore } from "date-fns";
import { getRandomCard, AnimalCard, getCardById, getRandomCardByRarity, RARITY_CONFIG } from "@/lib/collection";

// --- Interfaces (Copied/Moved from hook) ---
export interface HouseholdData {
    id: string;
    name: string;
    members: string[]; // User IDs
    memberProfiles?: { uid: string; displayName: string; photoURL?: string; activeBadge?: string; age?: number; birthDate?: string }[];
    memberPreferences?: Record<string, { dislikes: string[]; allergies?: string[]; activeBadge?: string; widgets?: string[]; telegramChatId?: string }>;
    preferences?: {
        forbiddenIngredients: string[];
        kitchenTools?: string[];
        motto?: string;
    };
    energyLevel?: 'chill' | 'productive' | 'party' | 'tired' | 'peaceful';
    scores?: Record<string, number>;
    monthlyScores?: Record<string, number>;
    balance?: Record<string, number>;
    collections?: Record<string, Record<string, number>>;
    unopenedPacks?: Record<string, number>;
    badges?: Record<string, string[]>;
    currentChampion?: string;
    lastScoreReset?: string;
    timezone?: string;
    budgetConfig?: {
        salaries: Record<string, number>;
        fixedCharges: {
            label: string;
            amount: number;
            frequency?: 'monthly' | 'yearly';
            dueDay?: number;
            dayOfMonth?: number | null;
            dueDate?: string | null;
            dueMonth?: number;
            splitType?: 'equal' | 'rounded' | 'custom' | 'individual';
            customShares?: Record<string, number>;
            paidBy?: string;
            reminders?: number[];
            type?: 'personal' | 'shared';
            category?: string;
            history?: {
                effectiveDate: string;
                amount: number;
                splitType?: 'equal' | 'rounded' | 'custom' | 'individual';
                customShares?: Record<string, number>;
                paidBy?: string;
                isDeleted?: boolean;
            }[];
        }[];
        reserves: {
            label: string;
            amount: number;
            frequency?: 'monthly' | 'yearly';
            dueDay?: number;
            dayOfMonth?: number | null;
            dueDate?: string | null;
            dueMonth?: number;
            splitType?: 'equal' | 'rounded' | 'custom' | 'individual';
            customShares?: Record<string, number>;
            paidBy?: string;
            reminders?: number[];
            type?: 'personal' | 'shared';
            category?: string;
        }[];
        budgetCompletions?: Record<string, boolean>;
        monthlySalaries?: Record<string, Record<string, number>>;
    };
    aiWidgetConfig?: {
        lastQuestion?: string;
        shortAnswer?: string;
        longAnswer?: string;
        lastUpdate?: string;
        heroWeatherSummary?: string;
        heroFunnyRemark?: string;
        heroLastUpdate?: string;
        dailyJoke?: string;
        dailyJokeDate?: string;
    };
}

interface HouseholdContextType {
    household: HouseholdData | null;
    loading: boolean;
    createHousehold: (name: string) => Promise<void>;
    joinHousehold: (code: string) => Promise<void>;
    updatePreferences: (prefs: Partial<HouseholdData['preferences']>) => Promise<void>;
    addPoints: (uid: string, points: number, reason?: string, category?: string) => Promise<void>;
    updateHouseholdName: (name: string) => Promise<void>;
    updateMemberPreferences: (uid: string, prefs: any) => Promise<void>;
    updateMemberProfile: (uid: string, data: any) => Promise<void>;
    updateBudgetConfig: (config: any) => Promise<void>;
    togglePaymentStatus: (label: string, monthYear: string) => Promise<void>;
    updateMonthlySalary: (monthKey: string, uid: string, amount: number) => Promise<void>;
    updateAIWidgetConfig: (config: any) => Promise<void>;
    updateHousehold: (data: Partial<HouseholdData>) => Promise<void>; // Generic update
    openPack: (uid: string) => Promise<AnimalCard | null>;
    buyPack: (uid: string) => Promise<boolean>;
    tradeUp: (uid: string, cardId: string) => Promise<AnimalCard | null>;
    deletePointEntry: (historyId: string, uid: string, points: number) => Promise<void>;
    getEffectiveSubscription: (charge: any, targetDate: Date) => any;
    updateSubscription: (index: number, newData: any, effectiveDate: Date) => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [household, setHousehold] = useState<HouseholdData | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. User Household Binding
    useEffect(() => {
        if (!user) {
            setLoading(false);
            setHousehold(null);
            return;
        }

        const userRef = doc(db, "users", user.uid);
        const unsub = onSnapshot(userRef, (snap) => {
            if (snap.exists() && snap.data().householdId) {
                setHouseholdId(snap.data().householdId);
            } else {
                setHouseholdId(null);
                setLoading(false);
            }
        });
        return () => unsub();
    }, [user]);

    // 2. Household Data Listener
    useEffect(() => {
        if (!householdId) {
            setHousehold(null);
            return;
        }
        setLoading(true);
        const ref = doc(db, "households", householdId);
        const unsub = onSnapshot(ref, async (snap) => {
            if (snap.exists()) {
                const data = snap.data() as HouseholdData;

                // Optim: Only fetch profiles if members changed or forced refresh
                // For now, keep simple but maybe we can optimize this part later
                // fetching profiles...
                const profiles = await Promise.all(data.members.map(async (uid) => {
                    const uSnap = await getDoc(doc(db, "users", uid));
                    const prefs = data.memberPreferences?.[uid];
                    return {
                        uid,
                        displayName: uSnap.exists() ? (uSnap.data().displayName || "Membre") : "Inconnu",
                        photoURL: uSnap.exists() ? uSnap.data().photoURL : undefined,
                        age: uSnap.exists() ? uSnap.data().age : undefined,
                        birthDate: uSnap.exists() ? uSnap.data().birthDate : undefined,
                        activeBadge: prefs?.activeBadge
                    };
                }));

                setHousehold({ ...data, id: snap.id, memberProfiles: profiles } as HouseholdData);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [householdId]);

    // 3. Score Reset Logic (Monthly) implementation
    useEffect(() => {
        if (!household) return;

        const checkReset = async () => {
            const now = new Date();
            const lastResetStr = household.lastScoreReset;
            const lastReset = lastResetStr ? parseISO(lastResetStr) : new Date(0);

            if (isBefore(lastReset, startOfMonth(now))) {
                // Logic copy-pasted from original hook
                let maxScore = -1;
                let winners: string[] = [];
                Object.entries(household.scores || {}).forEach(([uid, score]) => {
                    if (score > maxScore) {
                        maxScore = score;
                        winners = [uid];
                    } else if (score === maxScore) {
                        winners.push(uid);
                    }
                });

                if (maxScore > 0) {
                    const badgeName = `Champion ${format(lastResetStr ? parseISO(lastResetStr) : new Date(), "MMM yyyy")}`;
                    for (const winnerId of winners) {
                        await updateDoc(doc(db, "households", household.id), {
                            [`badges.${winnerId}`]: arrayUnion(badgeName),
                            [`unopenedPacks.${winnerId}`]: increment(1)
                        });
                    }
                    if (winners.length > 0) {
                        const champ = winners[0];
                        await updateDoc(doc(db, "households", household.id), {
                            currentChampion: champ,
                            [`memberPreferences.${champ}.activeBadge`]: badgeName
                        });
                    }
                }

                const resetScores: Record<string, number> = {};
                household.members.forEach(m => resetScores[m] = 0);

                await updateDoc(doc(db, "households", household.id), {
                    scores: resetScores,
                    monthlyScores: resetScores,
                    lastScoreReset: now.toISOString()
                });
            }
        };
        checkReset();
    }, [household?.lastScoreReset]); // Only check if date changes or household loads

    // --- Actions ---

    // Define all actions here (Stable references via useCallback not strictly necessary as they depend on current scope, 
    // but good practice if we pass them down. For simplicity, plain functions inside component for now).

    // NOTE: Copied from useHousehold.ts, keeping logic identical
    const createHousehold = async (name: string) => {
        if (!user) return;
        const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(doc(db, "households", newId), {
            name,
            members: [user.uid],
            createdAt: new Date().toISOString()
        });
        await setDoc(doc(db, "users", user.uid), { householdId: newId }, { merge: true });
    };

    const joinHousehold = async (code: string) => {
        if (!user) return;
        const houseRef = doc(db, "households", code.trim().toUpperCase());
        const houseSnap = await getDoc(houseRef);
        if (!houseSnap.exists()) throw new Error("Code foyer invalide");
        await updateDoc(houseRef, { members: arrayUnion(user.uid) });
        await setDoc(doc(db, "users", user.uid), { householdId: code.trim().toUpperCase() }, { merge: true });
    };

    const updatePreferences = async (prefs: any) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id), { "preferences": { ...household.preferences, ...prefs } });
    };

    const addPoints = async (uid: string, points: number, reason: string = "Tâche complétée", category: string = "general") => {
        if (!household) return;
        const currentScore = household.monthlyScores?.[uid] || household.scores?.[uid] || 0;
        const currentBalance = household.balance?.[uid] || household.scores?.[uid] || 0;
        const newBalance = currentBalance + points;

        // Check for 750 points threshold (Pack availability)
        if (currentBalance < 750 && newBalance >= 750) {
            const chatId = household.memberPreferences?.[uid]?.telegramChatId;
            if (chatId) {
                // Dynamically import to avoid circular dependencies if any, though lib should be fine
                import("@/lib/telegram").then(({ sendTelegramMessage }) => {
                    sendTelegramMessage(chatId, "🎉 *Félicitations !* \n\nTu as atteint les **750 points**. \nUn nouveau pack de cartes est disponible dans ta Collection ! 🃏");
                });
            }
        }

        await updateDoc(doc(db, "households", household.id), {
            [`scores.${uid}`]: currentScore + points,
            [`monthlyScores.${uid}`]: currentScore + points,
            [`balance.${uid}`]: newBalance
        });
        try {
            await addDoc(collection(db, "households", household.id, "pointHistory"), { uid, points, reason, category, timestamp: new Date().toISOString() });
        } catch { }
    };

    const spendPoints = async (uid: string, amount: number, rewardName: string = "Récompense") => {
        if (!household) return;
        const currentBalance = household.balance?.[uid] || household.scores?.[uid] || 0;
        if (currentBalance < amount) throw new Error("Points insuffisants");
        await updateDoc(doc(db, "households", household.id), { [`balance.${uid}`]: currentBalance - amount });
        try {
            await addDoc(collection(db, "households", household.id, "pointHistory"), { uid, points: -amount, reason: `Achat : ${rewardName}`, category: "shop", timestamp: new Date().toISOString() });
        } catch { }
    };

    const updateHouseholdName = async (name: string) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id), { name });
    };

    const updateMemberPreferences = async (uid: string, prefs: any) => {
        if (!household) return;
        const current = household.memberPreferences?.[uid] || { dislikes: [] };
        const nextPrefs = { ...current, ...prefs };
        // Optimistic update
        setHousehold(prev => prev ? ({ ...prev, memberPreferences: { ...prev.memberPreferences, [uid]: nextPrefs } }) : null);
        await updateDoc(doc(db, "households", household.id), { [`memberPreferences.${uid}`]: nextPrefs });
    };

    const updateMemberProfile = async (uid: string, data: any) => {
        if (!household) return;
        await setDoc(doc(db, "users", uid), data, { merge: true });
        await updateDoc(doc(db, "households", household.id), { _lastProfileUpdate: new Date().toISOString() });
    };

    const updateBudgetConfig = async (config: any) => {
        if (!household) return;
        // Global safety net: remove any undefined values before sending to Firestore
        const cleanConfig = JSON.parse(JSON.stringify(config));
        await updateDoc(doc(db, "households", household.id), { budgetConfig: cleanConfig });
    };

    const togglePaymentStatus = async (label: string, monthYear: string) => {
        if (!household || !user) return;
        const key = `${label}-${monthYear}-${user.uid}`;
        const current = household.budgetConfig?.budgetCompletions || {};
        const next = { ...current };
        if (next[key]) delete next[key]; else next[key] = true;
        await updateDoc(doc(db, "households", household.id), { "budgetConfig.budgetCompletions": next });
    };

    const updateMonthlySalary = async (monthKey: string, uid: string, amount: number) => {
        if (!household) return;
        const current = household.budgetConfig?.monthlySalaries || {};
        const monthData = current[monthKey] || {};
        const next = { ...current, [monthKey]: { ...monthData, [uid]: amount } };
        await updateDoc(doc(db, "households", household.id), { "budgetConfig.monthlySalaries": next });
    };

    const updateAIWidgetConfig = async (config: any) => {
        if (!household) return;
        // Optimistic
        setHousehold(prev => prev ? ({ ...prev, aiWidgetConfig: { ...(prev.aiWidgetConfig || {}), ...config } as any }) : null);
        const updates: any = {};
        // Mapping... lazy mapping for now, just iterate keys if object?
        // Hardcoded mapping for safety and type match
        if (config?.lastQuestion !== undefined) updates["aiWidgetConfig.lastQuestion"] = config.lastQuestion;
        if (config?.shortAnswer !== undefined) updates["aiWidgetConfig.shortAnswer"] = config.shortAnswer;
        if (config?.longAnswer !== undefined) updates["aiWidgetConfig.longAnswer"] = config.longAnswer;
        if (config?.lastUpdate !== undefined) updates["aiWidgetConfig.lastUpdate"] = config.lastUpdate;
        if (config?.heroWeatherSummary !== undefined) updates["aiWidgetConfig.heroWeatherSummary"] = config.heroWeatherSummary;
        if (config?.heroFunnyRemark !== undefined) updates["aiWidgetConfig.heroFunnyRemark"] = config.heroFunnyRemark;
        if (config?.heroLastUpdate !== undefined) updates["aiWidgetConfig.heroLastUpdate"] = config.heroLastUpdate;
        if (config?.dailyJoke !== undefined) updates["aiWidgetConfig.dailyJoke"] = config.dailyJoke;
        if (config?.dailyJokeDate !== undefined) updates["aiWidgetConfig.dailyJokeDate"] = config.dailyJokeDate;

        await updateDoc(doc(db, "households", household.id), updates);
    };

    const deletePointEntry = async (historyId: string, uid: string, points: number) => {
        if (!household) return;

        // 1. Delete history doc
        await deleteDoc(doc(db, "households", household.id, "pointHistory", historyId));

        // 2. Reverse points (increment by negative amount)
        // We must update scores, monthlyScores AND balance
        const reversePoints = -points;
        await updateDoc(doc(db, "households", household.id), {
            [`scores.${uid}`]: increment(reversePoints),
            [`balance.${uid}`]: increment(reversePoints),
            [`monthlyScores.${uid}`]: increment(reversePoints)
        });
    };

    const updateHousehold = async (data: Partial<HouseholdData>) => {
        if (!household) return;
        const cleanData = JSON.parse(JSON.stringify(data));
        await updateDoc(doc(db, "households", household.id), cleanData);
    };

    const openPack = async (uid: string): Promise<AnimalCard | null> => {
        if (!household) return null;
        const packs = household.unopenedPacks?.[uid] || 0;
        if (packs <= 0) return null;
        const card = getRandomCard();
        await updateDoc(doc(db, "households", household.id), {
            [`unopenedPacks.${uid}`]: increment(-1),
            [`collections.${uid}.${card.id}`]: increment(1)
        });
        return card;
    };

    const buyPack = async (uid: string): Promise<boolean> => {
        if (!household) return false;
        const userColl = household.collections?.[uid] || {};
        const ownedCount = Object.keys(userColl).length;
        const isFree = ownedCount === 0;
        const currentBalance = household.balance?.[uid] || household.scores?.[uid] || 0;
        const COST = 750;

        if (!isFree && currentBalance < COST) throw new Error("Pas assez de points (750 requis)");

        const updates: any = { [`unopenedPacks.${uid}`]: increment(1) };
        if (!isFree) updates[`balance.${uid}`] = currentBalance - COST;
        await updateDoc(doc(db, "households", household.id), updates);
        if (!isFree) {
            try {
                await addDoc(collection(db, "households", household.id, "pointHistory"), { uid, points: -COST, reason: "Achat Pack Cartes", category: "shop", timestamp: new Date().toISOString() });
            } catch { }
        }
        return true;
    };

    const tradeUp = async (uid: string, cardId: string): Promise<AnimalCard | null> => {
        if (!household) return null;

        const card = getCardById(cardId);
        if (!card) throw new Error("Carte introuvable");

        const userColl = household.collections?.[uid] || {};
        const count = userColl[cardId] || 0;

        if (count < 2) throw new Error("Il faut au moins un doublon pour échanger");

        // Determine target rarity
        let targetRarity;
        switch (card.rarity) {
            case 'common': targetRarity = 'rare'; break;
            case 'rare': targetRarity = 'epic'; break;
            case 'epic': targetRarity = 'legendary'; break;
            default: throw new Error("Cette rareté ne peut pas être échangée");
        }

        const newCard = getRandomCardByRarity(targetRarity as any);
        if (!newCard) throw new Error("Erreur: pas de carte disponible");

        await updateDoc(doc(db, "households", household.id), {
            [`collections.${uid}.${cardId}`]: increment(-2),
            [`collections.${uid}.${newCard.id}`]: increment(1)
        });

        return newCard;
    };

    // --- Subscription History Helpers ---

    const getEffectiveSubscription = (charge: any, targetDate: Date) => {
        if (!charge.history || charge.history.length === 0) {
            return charge;
        }

        const sorted = [...charge.history].sort((a: any, b: any) => b.effectiveDate.localeCompare(a.effectiveDate));
        const targetMonthStr = format(startOfMonth(targetDate), "yyyy-MM-dd");

        // Find the first version that starts ON or BEFORE the target month
        const match = sorted.find((v: any) => v.effectiveDate <= targetMonthStr);

        if (match) {
            return { ...charge, ...match };
        }

        // Return the oldest version as fallback if target date is before all history
        // Or strictly strictly speaking we could return null if it didn't exist then, 
        // but for "fixed charges" usually we want the oldest known config.
        const oldest = sorted[sorted.length - 1];
        return { ...charge, ...oldest };
    };

    const updateSubscription = async (index: number, newData: any, effectiveDate: Date) => {
        if (!household || !household.budgetConfig?.fixedCharges) return;

        const charges = [...household.budgetConfig.fixedCharges];
        const charge = charges[index];
        const effectiveStr = format(startOfMonth(effectiveDate), "yyyy-MM-dd");

        let history = charge.history ? [...charge.history] : [];

        // Init history if empty
        if (history.length === 0) {
            history.push({
                effectiveDate: "2000-01-01",
                amount: charge.amount,
                splitType: charge.splitType,
                paidBy: charge.paidBy || 'joint',
                customShares: charge.customShares
            });
        }

        const existingIndex = history.findIndex(h => h.effectiveDate === effectiveStr);

        const newEntry = {
            effectiveDate: effectiveStr,
            amount: newData.amount,
            splitType: newData.splitType,
            paidBy: newData.paidBy,
            customShares: newData.customShares || null,
            isDeleted: newData.isDeleted || null
        };

        if (existingIndex >= 0) {
            history[existingIndex] = newEntry;
        } else {
            history.push(newEntry);
        }

        // Update "current" view for quick access (optional but good for consistency)
        // We only update the top-level keys if the effectiveDate is <= NOW (roughly)
        // But simpler: just save the history. 
        // NOTE: The app generally uses top-level keys for "Config" view. 
        // We might want to update top-level keys to represent the "Latest" or "Current Month" version.
        // Let's update top-level to match the *latest* added entry if it's for current or future.
        charges[index] = {
            ...charge,
            history
        };

        // Also update standard fields if this change affects *current* month or *future* (which is usually what happens)
        // Actually, let's keep top-level fields as "Default/Latest" so UI that doesn't use history still works somewhat.
        if (effectiveStr >= format(startOfMonth(new Date()), "yyyy-MM-dd")) {
            // Merge but remove undefineds from result
            const merged = { ...charges[index], ...newData };
            charges[index] = JSON.parse(JSON.stringify(merged));
        }

        await updateBudgetConfig({
            ...household.budgetConfig,
            fixedCharges: charges
        });
    };

    const value = useMemo(() => ({
        household,
        loading,
        createHousehold,
        joinHousehold,
        updatePreferences,
        addPoints,
        updateHouseholdName,
        updateMemberPreferences,
        updateMemberProfile,
        updateBudgetConfig,
        togglePaymentStatus,
        updateMonthlySalary,
        updateAIWidgetConfig,
        updateHousehold,
        spendPoints,
        openPack,
        buyPack,
        tradeUp,
        getEffectiveSubscription,
        updateSubscription,
        deletePointEntry
    }), [household, loading, user]);

    return (
        <HouseholdContext.Provider value={value}>
            {children}
        </HouseholdContext.Provider>
    );
}

export function useHousehold() {
    const context = useContext(HouseholdContext);
    if (context === undefined) {
        throw new Error("useHousehold must be used within a HouseholdProvider");
    }
    return context;
}
