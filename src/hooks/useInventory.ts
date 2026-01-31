import { useState, useEffect, useCallback } from "react";
import { collection, doc, onSnapshot, setDoc, addDoc, deleteDoc, query, orderBy, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string; // e.g., "g", "ml", "pcs", "pack"
    category: 'fridge' | 'freezer' | 'pantry' | 'other';
    expiryDate: string | null;
    addedAt: any;
    updatedAt: any;
}

export function useInventory() {
    const { household } = useHousehold();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "households", household.id, "inventory"),
            orderBy("expiryDate", "asc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const inventory = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as InventoryItem));
            setItems(inventory);
            setLoading(false);
        });

        return () => unsub();
    }, [household]);

    const addItem = async (item: Omit<InventoryItem, 'id' | 'addedAt' | 'updatedAt'>) => {
        if (!household) return;
        await addDoc(collection(db, "households", household.id, "inventory"), {
            ...item,
            addedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    };

    const updateItem = async (id: string, updates: Partial<Omit<InventoryItem, 'id' | 'addedAt' | 'updatedAt'>>) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id, "inventory", id), {
            ...updates,
            updatedAt: serverTimestamp()
        });
    };

    const removeItem = async (id: string) => {
        if (!household) return;
        await deleteDoc(doc(db, "households", household.id, "inventory", id));
    };

    const consumeItem = async (id: string, amount: number) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const newQuantity = Math.max(0, item.quantity - amount);
        if (newQuantity === 0) {
            await removeItem(id);
        } else {
            await updateItem(id, { quantity: newQuantity });
        }
    };

    return {
        items,
        loading,
        addItem,
        updateItem,
        removeItem,
        consumeItem
    };
}
