import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy, where, Timestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { startOfMonth, endOfMonth } from "date-fns";

export interface TrackedPrice {
    date: string;
    price: number;
}

export interface TrackedProduct {
    id: string;
    url: string;
    name: string;
    currentPrice?: number;
    lowestPrice?: number;
    priceHistory?: TrackedPrice[];
    lastChecked?: any; // Firestore Timestamp
    merchant?: string;
}

export interface Expense {
    id: string;
    amount: number;
    label: string;
    category: 'courses' | 'loyer' | 'plaisir' | 'facture' | 'autre' | 'internet' | 'eau' | 'elec' | 'streaming' | 'assurance' | 'tel';
    paidBy: string; // User ID
    date: any; // Firestore Timestamp
    splitType: 'equal' | 'proportional' | 'individual' | 'custom' | 'rounded';
    description?: string;
    repayments?: { uid: string; amount: number; date: string }[]; // Array of repayment history
    trackedProducts?: TrackedProduct[];
    isSettled?: boolean; // If true, it won't appear in "Dettes Précédentes"
    type?: 'personal' | 'shared';
    projectId?: string | null; // Linked project ID
    paidByJoint?: boolean; // If true, expense is paid by Joint Account
    isSubscription?: boolean;
    renewsOn?: number; // Day of the month
    customShares?: Record<string, number>; // Map of uid -> percentage
}

export function useBudget(monthOverride?: Date) {
    const { household } = useHousehold();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [unsettledExpenses, setUnsettledExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const currentMonth = monthOverride || new Date();

    useEffect(() => {
        if (!household) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        // 1. Current Month Expenses
        const qCurrent = query(
            collection(db, "households", household.id, "expenses"),
            where("date", ">=", start),
            where("date", "<=", end),
            orderBy("date", "desc")
        );

        // 2. Unsettled Past Expenses (Simplified query to avoid composite index)
        const qUnsettled = query(
            collection(db, "households", household.id, "expenses"),
            where("isSettled", "==", false)
        );

        const unsubCurrent = onSnapshot(qCurrent, (snap) => {
            const list: Expense[] = [];
            snap.forEach(doc => {
                const data = doc.data() as Omit<Expense, 'id'>;
                if (data.type === 'personal' && data.paidBy !== user?.uid) return;
                list.push({ ...data, id: doc.id } as Expense);
            });
            setExpenses(list);
        });

        const unsubUnsettled = onSnapshot(qUnsettled, (snap) => {
            const list: Expense[] = [];
            snap.forEach(doc => {
                const data = doc.data() as Omit<Expense, 'id'>;
                // We only want items from BEFORE the current month in this specific list
                const expenseDate = (data.date as any)?.toDate ? (data.date as any).toDate() : new Date(data.date);
                if (expenseDate < start) {
                    if (data.type === 'personal' && data.paidBy !== user?.uid) return;
                    list.push({ ...data, id: doc.id } as Expense);
                }
            });
            setUnsettledExpenses(list);
            setLoading(false);
        });

        return () => {
            unsubCurrent();
            unsubUnsettled();
        };
    }, [household, currentMonth]);

    const addExpense = async (
        label: string,
        amount: number,
        category: Expense['category'],
        splitType: Expense['splitType'] = 'equal',
        paidBy?: string,
        description?: string,
        type: 'personal' | 'shared' = 'shared',
        projectId?: string,
        paidByJoint: boolean = false,
        isSubscription: boolean = false,
        renewsOn?: number,
        customShares?: Record<string, number>
    ) => {
        if (!household || !user) return null;
        const docRef = await addDoc(collection(db, "households", household.id, "expenses"), {
            label,
            amount,
            category,
            paidBy: paidBy || user.uid,
            date: new Date(),
            splitType,
            description: description || "",
            repayments: [],
            isSettled: false, // Pot needs refilling
            type,
            projectId: projectId || null,
            paidByJoint,
            isSubscription,
            renewsOn: renewsOn || null,
            customShares: customShares || null
        });
        return docRef.id;
    };

    const deleteExpense = async (id: string) => {
        if (!household) return;
        await deleteDoc(doc(db, "households", household.id, "expenses", id));
    };

    const updateExpense = async (id: string, data: Partial<Omit<Expense, "id">>) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id, "expenses", id), data);
    };

    const addRepayment = async (expenseId: string, amount: number, fromUid: string) => {
        if (!household) return;
        const repayment = { uid: fromUid, amount, date: new Date().toISOString() };

        await updateDoc(doc(db, "households", household.id, "expenses", expenseId), {
            repayments: arrayUnion(repayment)
        });
    };

    const settleExpense = async (expenseId: string) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id, "expenses", expenseId), {
            isSettled: true
        });
    };

    return { expenses, unsettledExpenses, loading, addExpense, deleteExpense, updateExpense, addRepayment, settleExpense };
}
