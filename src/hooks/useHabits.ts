import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { format } from "date-fns";

export interface Habit {
    id: string;
    title: string;
    icon: string;
    color: string;
    frequency: 'daily' | 'weekly';
    category?: string;
    createdAt: string;
    createdBy: string;
}

export interface HabitCompletion {
    id: string; // Often formatted as habitId-date
    habitId: string;
    date: string; // YYYY-MM-DD
    completed: boolean;
}

export function useHabits() {
    const { household } = useHousehold();
    const { user } = useAuth();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [completions, setCompletions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household) return;

        const habitsRef = collection(db, "households", household.id, "habits");
        const completionsRef = collection(db, "households", household.id, "habitCompletions");

        const unsubHabits = onSnapshot(habitsRef, (snapshot) => {
            setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
        });

        const unsubCompletions = onSnapshot(completionsRef, (snapshot) => {
            const data: Record<string, boolean> = {};
            snapshot.docs.forEach(doc => {
                data[doc.id] = doc.data().completed;
            });
            setCompletions(data);
            setLoading(false);
        });

        return () => {
            unsubHabits();
            unsubCompletions();
        };
    }, [household]);

    const addHabit = async (habit: Omit<Habit, "id" | "createdAt" | "createdBy">) => {
        if (!household || !user) return;
        return addDoc(collection(db, "households", household.id, "habits"), {
            ...habit,
            createdAt: new Date().toISOString(),
            createdBy: user.uid
        });
    };

    const deleteHabit = async (id: string) => {
        if (!household) return;
        return deleteDoc(doc(db, "households", household.id, "habits", id));
    };

    const toggleHabit = async (habitId: string, date: string) => {
        if (!household) return;
        const completionId = `${habitId}-${date}`;
        const isCompleted = completions[completionId] || false;

        return setDoc(doc(db, "households", household.id, "habitCompletions", completionId), {
            habitId,
            date,
            completed: !isCompleted
        });
    };

    return {
        habits,
        completions,
        loading,
        addHabit,
        deleteHabit,
        toggleHabit
    };
}
