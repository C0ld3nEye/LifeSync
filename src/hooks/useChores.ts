import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";

export interface Chore {
    id: string;
    title: string;
    assignees: string[]; // User UIDs
    done: boolean;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    customInterval?: number; // Number of days for custom frequency
    dueDate?: string | null; // ISO String or null (Optional)
    points: number; // For gamification
    category: 'household' | 'general' | 'pet';
    createdAt: string;
    createdBy: string;
    privateFor?: string; // UID if this is a private task (e.g. debt repayment)
    reminders?: number[]; // Minutes before dueDate
}

export function useChores() {
    const { household } = useHousehold();
    const { user } = useAuth();
    const [chores, setChores] = useState<Chore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const q = query(
            collection(db, "households", household.id, "chores"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Chore))
                .filter(c => !c.privateFor || c.privateFor === user?.uid);
            setChores(items);
            setLoading(false);
        });
        return () => unsub();
    }, [household]);

    const addChore = async (title: string, dueDate?: string, points: number = 10, category: 'household' | 'general' | 'pet' = 'household', frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom' = 'once', customInterval?: number, reminders?: number[]) => {
        if (!household || !user) return;

        const choreData: any = {
            title,
            assignees: [],
            done: false,
            frequency,
            points,
            category,
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            dueDate: dueDate || null,
            reminders: reminders || []
        };

        if (frequency === 'custom' && customInterval) {
            choreData.customInterval = customInterval;
        }

        await addDoc(collection(db, "households", household.id, "chores"), choreData);
    };

    const addPrivateChore = async (title: string, privateFor: string, points: number = 0, category: 'general' = 'general', reminders?: number[]) => {
        if (!household || !user) return;
        await addDoc(collection(db, "households", household.id, "chores"), {
            title,
            assignees: [privateFor],
            done: false,
            frequency: 'once',
            points,
            category,
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            privateFor,
            reminders: reminders || []
        });
    };

    const { addPoints } = useHousehold();

    const toggleChore = async (id: string, currentStatus: boolean, points: number = 10, category: 'household' | 'general' | 'pet' = 'household', frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom' = 'once', currentDueDate?: string | null, customInterval?: number, title?: string) => {
        if (!household || !user) return;

        // 1. Update chore status
        await updateDoc(doc(db, "households", household.id, "chores", id), {
            done: !currentStatus
        });

        // 2. Add/Remove points for the CURRENT user toggle
        // Skip if category is general
        if (category === 'general') return;

        const pointsChange = !currentStatus ? points : -points;

        // Robust title resolution: Use argument OR find in local state
        const choreRef = chores.find(c => c.id === id);
        const resolvedTitle = title || choreRef?.title;
        const reason = resolvedTitle ? `Tâche : ${resolvedTitle}` : "Tâche complétée";

        await addPoints(user.uid, pointsChange, reason, category);

        // 3. Handle recurring tasks - reset after 2 seconds if marking as done
        if (!currentStatus && frequency !== 'once') {
            setTimeout(async () => {
                // Use current time as base so that doing a task early resets the timer from today
                const nextDueDate = calculateNextDueDate(new Date().toISOString(), frequency, customInterval);
                await updateDoc(doc(db, "households", household.id, "chores", id), {
                    done: false,
                    assignees: [],
                    dueDate: nextDueDate
                });
            }, 2000);
        }
    };

    // Helper function to calculate next due date
    const calculateNextDueDate = (currentDate: string, frequency: 'daily' | 'weekly' | 'monthly' | 'custom', customInterval?: number): string => {
        const date = new Date(currentDate);
        switch (frequency) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                break;
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'custom':
                date.setDate(date.getDate() + (customInterval || 1));
                break;
        }
        return date.toISOString();
    };

    const deleteChore = async (id: string) => {
        if (!household) return;
        await deleteDoc(doc(db, "households", household.id, "chores", id));
    };

    const assignToMe = async (chore: Chore) => {
        if (!household || !user) return;
        const newAssignees = chore.assignees.includes(user.uid)
            ? chore.assignees.filter(id => id !== user.uid)
            : [...chore.assignees, user.uid];

        await updateDoc(doc(db, "households", household.id, "chores", chore.id), {
            assignees: newAssignees
        });
    };

    const updateChore = async (id: string, updates: Partial<Omit<Chore, "id">>) => {
        if (!household) return;

        // Special handling for frequency changes to cleanup customInterval
        const finalUpdates: any = { ...updates };
        if (updates.frequency && updates.frequency !== 'custom') {
            finalUpdates.customInterval = null; // Use null to remove in Firestore via updateDoc
        }

        // Filter out undefined values to avoid Firestore errors
        const cleanUpdates = Object.fromEntries(
            Object.entries(finalUpdates).filter(([_, value]) => value !== undefined)
        );

        await updateDoc(doc(db, "households", household.id, "chores", id), cleanUpdates);
    };

    return { chores, loading, addChore, addPrivateChore, toggleChore, deleteChore, assignToMe, updateChore };
}
