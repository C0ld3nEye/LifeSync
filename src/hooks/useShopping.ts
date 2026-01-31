import { useState, useEffect, useMemo } from "react";
import { collection, doc, onSnapshot, addDoc, deleteDoc, query, orderBy, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useSmartMeal } from "./useSmartMeal";
import { useInventory } from "./useInventory";
import { calculateShoppingList } from "@/lib/shopping";

export interface ManualShoppingItem {
    id: string;
    text: string;
    checked: boolean;
    category?: string;
    createdAt: any;
}

export function useShopping() {
    const { household } = useHousehold();
    const {
        menu,
        weekId,
        changeWeek,
        currentWeekStart,
        checkedItems: mealCheckedItems,
        toggleShoppingItem: toggleMealItem,
        sortShop,
        sortedShopList,
        isSortingShop,
        lastSortedHash,
        checkCategory: checkMealCategory,
        removedItems,
        removeShoppingItem,
        restoreShoppingItem
    } = useSmartMeal();
    const { items: inventoryItems } = useInventory();
    const [manualItems, setManualItems] = useState<ManualShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Sync Manual Items from Firestore
    useEffect(() => {
        if (!household || !weekId) return;

        const q = query(
            collection(db, "households", household.id, "meal_weeks", weekId, "shopping_manual"),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as ManualShoppingItem));
            setManualItems(items);
            setLoading(false);
        });

        return () => unsub();
    }, [household, weekId]);

    // 2. Actions for Manual Items
    const addManualItem = async (text: string) => {
        if (!household || !text.trim() || !weekId) return;
        await addDoc(collection(db, "households", household.id, "meal_weeks", weekId, "shopping_manual"), {
            text: text.trim(),
            checked: false,
            createdAt: serverTimestamp()
        });
    };

    const updateManualItem = async (id: string, text: string) => {
        if (!household || !text.trim() || !weekId) return;
        await updateDoc(doc(db, "households", household.id, "meal_weeks", weekId, "shopping_manual", id), {
            text: text.trim()
        });
    };

    const toggleManualItem = async (id: string, checked: boolean) => {
        if (!household || !weekId) return;
        await updateDoc(doc(db, "households", household.id, "meal_weeks", weekId, "shopping_manual", id), {
            checked
        });
    };

    const removeManualItem = async (id: string) => {
        if (!household || !weekId) return;
        await deleteDoc(doc(db, "households", household.id, "meal_weeks", weekId, "shopping_manual", id));
    };

    const clearCheckedManualItems = async () => {
        if (!household || !weekId) return;
        const toDelete = manualItems.filter(i => i.checked);
        for (const item of toDelete) {
            await deleteDoc(doc(db, "households", household.id, "meal_weeks", weekId, "shopping_manual", item.id));
        }
    };

    // 3. Derived Meal Ingredients
    const allMealIngredients = calculateShoppingList(menu);
    const mealIngredients = allMealIngredients.filter(item => {
        if (removedItems.includes(item)) return false;

        // Deduction Logic: Check if item is already in inventory
        const [name] = item.split(" : ");
        const isInStock = inventoryItems.some(inv =>
            inv.name.toLowerCase() === name.toLowerCase() && inv.quantity > 0
        );

        return !isInStock;
    });

    const currentItemsHash = JSON.stringify([...mealIngredients].sort());
    const isOutOfSync = mealIngredients.length > 0 && lastSortedHash !== currentItemsHash;

    // Filter the sorted list against inventory dynamically
    const filteredSortedShopList = useMemo(() => {
        if (!sortedShopList) return null;
        const result: any = {};
        Object.keys(sortedShopList).forEach(category => {
            const items = sortedShopList[category];
            // Filter items
            const filtered = items.filter((item: string) => {
                if (removedItems.includes(item)) return false;
                const [name] = item.split(" : ");
                const isInStock = inventoryItems.some(inv => inv.name.toLowerCase() === name.toLowerCase() && inv.quantity > 0);
                return !isInStock;
            });
            if (filtered.length > 0) result[category] = filtered;
        });
        return result;
    }, [sortedShopList, inventoryItems, removedItems]);

    return {
        manualItems,
        mealIngredients,
        mealCheckedItems,
        loading,
        isSortingShop,
        sortedShopList: filteredSortedShopList,
        lastSortedHash,
        isOutOfSync,
        currentWeekStart,
        addManualItem,
        updateManualItem,
        toggleManualItem,
        removeManualItem,
        toggleMealItem,
        checkMealCategory,
        clearCheckedManualItems,
        changeWeek,
        refreshSort: () => sortShop(mealIngredients, true),
        removeMealItem: removeShoppingItem,
        restoreMealItem: restoreShoppingItem
    };
}
