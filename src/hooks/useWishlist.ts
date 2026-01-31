import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";

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

export interface WishlistItem {
    id: string;
    label: string;
    amount: number;
    category: 'courses' | 'loyer' | 'plaisir' | 'facture' | 'autre';
    type?: 'personal' | 'shared';
    dueDate?: string | null; // ISO Date string
    monthlySaving?: number; // Auto-deduct from budget
    currentSavings?: number; // Total saved so far
    createdAt: string;
    createdBy: string;
    trackedProducts?: TrackedProduct[];
}

export function useWishlist() {
    const { household } = useHousehold();
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const q = query(
            collection(db, "households", household.id, "wishlist"),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const list: WishlistItem[] = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as WishlistItem));
            setWishlist(list);
            setLoading(false);
        });
        return () => unsub();
    }, [household]);

    const addWishlistItem = async (label: string, amount: number, category: WishlistItem['category'], dueDate?: string, monthlySaving: number = 0, type: WishlistItem['type'] = 'personal') => {
        if (!household || !user) return null;
        const docRef = await addDoc(collection(db, "households", household.id, "wishlist"), {
            label,
            amount,
            category,
            type,
            dueDate: dueDate || null,
            monthlySaving,
            currentSavings: 0,
            createdAt: new Date().toISOString(),
            createdBy: user.uid
        });
        return docRef.id;
    };

    const deleteWishlistItem = async (id: string) => {
        if (!household) return;
        await deleteDoc(doc(db, "households", household.id, "wishlist", id));
    };

    const updateWishlistItem = async (id: string, data: Partial<Omit<WishlistItem, "id">>) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id, "wishlist", id), data);
    };

    return { wishlist, loading, addWishlistItem, deleteWishlistItem, updateWishlistItem };
}
