import { useState, useEffect, useRef, useCallback } from "react";
import { doc, onSnapshot, setDoc, getDocs, getDoc, collection, query, where, deleteDoc, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useInventory } from "./useInventory";
import { generateRecipe, generateWeekPlan, sortShoppingList } from "@/lib/gemini";
import { WeekMenu, MealSlot, SmartMealHookResult } from "@/types/smartmeal";
import { startOfWeek, addDays, format, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { useMealWeek } from "@/components/providers/MealWeekProvider";

// Initialize an empty week structure
const DEFAULT_WEEK: WeekMenu = {};
["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].forEach(d => {
    DEFAULT_WEEK[d] = {
        date: d,
        dayName: d,
        Midi: { type: "Midi", mode: "single", attendees: [] },
        Soir: { type: "Soir", mode: "single", attendees: [] },
    };
});

export function useSmartMeal(): SmartMealHookResult {
    const { household } = useHousehold();
    const { items: inventory } = useInventory();
    const { currentWeekStart, setCurrentWeekStart } = useMealWeek();
    const [menu, setMenu] = useState<WeekMenu>(DEFAULT_WEEK);
    const [prevMenu, setPrevMenu] = useState<WeekMenu | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null); // e.g. "Lundi-Midi" or "FULL"
    const [sortedShopList, setSortedShopList] = useState<any>(null);
    const [lastSortedHash, setLastSortedHash] = useState<string | null>(null);
    const [isSortingShop, setIsSortingShop] = useState(false);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [removedItems, setRemovedItems] = useState<string[]>([]);

    const weekId = format(currentWeekStart, "yyyy-MM-dd"); // Firestore document ID for the week
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const lastSortedItemsRef = useRef<string>("");

    // ---------------------------------------------------------------------
    // Sync menu for the current week from Firestore
    // ---------------------------------------------------------------------
    useEffect(() => {
        if (!household) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const ref = doc(db, "households", household.id, "meal_weeks", weekId);
        const unsub = onSnapshot(ref, snap => {
            if (snap.exists()) {
                const data = snap.data();
                setMenu(prev => ({ ...DEFAULT_WEEK, ...data.week }));
                setCheckedItems(data.checkedItems || []);
                setRemovedItems(data.removedItems || []);
                setSortedShopList(data.sortedShopList || null);
                setLastSortedHash(data.lastSortedHash || null);
            } else {
                // Initialise an empty week document
                setDoc(ref, { week: DEFAULT_WEEK, checkedItems: [], removedItems: [], sortedShopList: null, lastSortedHash: null }, { merge: true });
                setMenu(DEFAULT_WEEK);
                setCheckedItems([]);
                setRemovedItems([]);
                setSortedShopList(null);
                setLastSortedHash(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [household, weekId]);

    // Fetch previous week for variety
    useEffect(() => {
        if (!household) return;
        const prevWeekId = format(subWeeks(currentWeekStart, 1), "yyyy-MM-dd");
        const ref = doc(db, "households", household.id, "meal_weeks", prevWeekId);
        getDoc(ref).then(snap => {
            if (snap.exists()) setPrevMenu(snap.data().week);
            else setPrevMenu(null);
        });
    }, [household, currentWeekStart]);

    // ---------------------------------------------------------------------
    // Storage Hygiene: Keep only 8 weeks of history
    // ---------------------------------------------------------------------
    useEffect(() => {
        if (!household) return;
        const cleanup = async () => {
            try {
                const limitDate = format(subWeeks(new Date(), 8), "yyyy-MM-dd");
                const q = query(
                    collection(db, "households", household.id, "meal_weeks"),
                    where(documentId(), "<", limitDate)
                );
                const snap = await getDocs(q);
                snap.forEach(d => deleteDoc(d.ref));
            } catch (e) {
                console.error("Meal cleanup error:", e);
            }
        };
        cleanup();
    }, [household]);

    // ---------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------
    const changeWeek = useCallback((offset: number) => {
        setCurrentWeekStart(prev => (offset > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)));
    }, []);

    const updateSlot = useCallback(async (day: string, type: "Midi" | "Soir", data: Partial<MealSlot>) => {
        if (!household) return;
        const newMenu = { ...menu };
        newMenu[day][type] = { ...newMenu[day][type], ...data };

        // LEFTOVER LOGIC SIDE-EFFECT
        if (data.cookForLeftover !== undefined) {
            const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
            const dayIdx = DAYS.indexOf(day);
            if (dayIdx !== -1 && dayIdx < 6) { // Not Sunday
                const nextDay = DAYS[dayIdx + 1];
                if (data.cookForLeftover) {
                    // Block Next Lunch
                    newMenu[nextDay]["Midi"] = {
                        ...newMenu[nextDay]["Midi"],
                        mode: 'leftover',
                        recipe: { recipeName: "Restes de la veille", description: "Cuisiné le soir précédent", ingredients: [], instructions: [], prepTime: "0", cookTime: "0", cookingMethod: "Réchauffé", nutriFocus: "Anti-gaspillage", protein: "" }
                    };
                } else {
                    // Unblock Next Lunch
                    // Only reset if it looks like a leftover (avoids overwriting manual edits if user changed it)
                    if (newMenu[nextDay]["Midi"].mode === 'leftover') {
                        newMenu[nextDay]["Midi"] = {
                            ...newMenu[nextDay]["Midi"],
                            mode: 'single',
                            recipe: null
                        };
                    }
                }
            }
        }


        // IGNORE SIDE-EFFECT: Clear recipe if ignored
        if (data.isIgnored) {
            newMenu[day][type].recipe = null;
            newMenu[day][type].mode = 'single'; // Reset mode too?
        }

        setMenu(newMenu); // optimistic UI
        await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), { week: newMenu }, { merge: true });
    }, [household, menu, weekId]);

    const toggleShoppingItem = useCallback(async (itemName: string) => {
        if (!household) return;

        let newChecked = [...checkedItems];
        if (newChecked.includes(itemName)) {
            newChecked = newChecked.filter(i => i !== itemName);
        } else {
            newChecked.push(itemName);
        }

        setCheckedItems(newChecked); // optimistic UI
        await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), { checkedItems: newChecked }, { merge: true });
    }, [household, checkedItems, weekId]);

    const checkCategory = useCallback(async (items: string[], checked: boolean) => {
        if (!household) return;

        let newChecked = [...checkedItems];
        if (checked) {
            // Add all items if not already present
            items.forEach(it => {
                if (!newChecked.includes(it)) newChecked.push(it);
            });
        } else {
            // Remove all items
            newChecked = newChecked.filter(it => !items.includes(it));
        }

        setCheckedItems(newChecked); // optimistic UI
        await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), { checkedItems: newChecked }, { merge: true });
    }, [household, checkedItems, weekId]);

    const syncCheckedItems = useCallback(async (newChecked: string[]) => {
        if (!household) return;
        setCheckedItems(newChecked);
        await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), { checkedItems: newChecked }, { merge: true });
    }, [household, weekId]);

    const removeShoppingItem = useCallback(async (itemName: string) => {
        if (!household) return;
        const newRemoved = [...removedItems, itemName];
        setRemovedItems(newRemoved);

        // Also uncheck it if checked
        const newChecked = checkedItems.filter(i => i !== itemName);
        setCheckedItems(newChecked);

        await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), {
            removedItems: newRemoved,
            checkedItems: newChecked
        }, { merge: true });
    }, [household, weekId, removedItems, checkedItems]);

    const restoreShoppingItem = useCallback(async (itemName: string) => {
        if (!household) return;
        const newRemoved = removedItems.filter(i => i !== itemName);
        setRemovedItems(newRemoved);
        await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), { removedItems: newRemoved }, { merge: true });
    }, [household, weekId, removedItems]);

    const generateSlot = useCallback(async (dayName: string, type: "Midi" | "Soir") => {
        if (!household) return;
        const slotKey = `${dayName}-${type}`;
        setGenerating(slotKey);
        try {
            const eventsSnap = await getDocs(collection(db, "households", household.id, "events"));
            const allEvents = eventsSnap.docs.map(d => d.data());
            const dayIdx = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"].indexOf(dayName.toLowerCase());
            const slotDate = addDays(currentWeekStart, dayIdx);
            const slotDateStr = format(slotDate, "yyyy-MM-dd");
            const dayEvents = allEvents.filter((e: any) => e.start.startsWith(slotDateStr));

            // 1. Resolve attendees and their dislikes
            const slotAttendeesIds = menu[dayName][type].attendees?.length
                ? menu[dayName][type].attendees
                : household.members;

            const participants = household.memberProfiles?.filter(p => slotAttendeesIds?.includes(p.uid)).map(p => ({
                uid: p.uid,
                displayName: p.displayName,
                dislikes: household.memberPreferences?.[p.uid]?.dislikes || [],
                allergies: household.memberPreferences?.[p.uid]?.allergies || []
            })) || [];

            const commonDislikes = household.preferences?.forbiddenIngredients || [];

            const lastWeekMeals = prevMenu
                ? Object.values(prevMenu).flatMap(d => [d.Midi.recipe?.recipeName, d.Soir.recipe?.recipeName]).filter(Boolean) as string[]
                : [];

            const recentMeals = Object.values(menu)
                .flatMap(d => [d.Midi.recipe?.recipeName, d.Soir.recipe?.recipeName])
                .filter((name): name is string => Boolean(name));

            const recentProteins: string[] = [];

            // 3. Generate
            if (menu[dayName][type].mode === 'split') {
                const meals = [...(menu[dayName][type].meals || [])];
                for (let i = 0; i < meals.length; i++) {
                    if (meals[i].recipe) continue;

                    const mealAttendees = meals[i].attendees.length ? meals[i].attendees : household.members;
                    const mealParticipants = household.memberProfiles?.filter(p => mealAttendees.includes(p.uid)).map(p => ({
                        uid: p.uid,
                        displayName: p.displayName,
                        dislikes: household.memberPreferences?.[p.uid]?.dislikes || [],
                        allergies: household.memberPreferences?.[p.uid]?.allergies || []
                    })) || [];

                    meals[i].recipe = await generateRecipe({
                        day: dayName,
                        type,
                        attendees: mealParticipants as any,
                        commonDislikes,
                        kitchenTools: household.preferences?.kitchenTools || ["Four", "Plaques"],
                        isExpress: menu[dayName][type].isExpress || false,
                        isBasic: menu[dayName][type].isBasic || false,
                        customRequest: menu[dayName][type].customRequest,
                        recentMeals,
                        recentProteins: [],
                        lastWeekMeals,
                        agendaEvents: dayEvents as any[],
                        inventory: inventory.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, expiryDate: i.expiryDate }))
                    });
                }
                await updateSlot(dayName, type, { meals });
            } else {
                const recipe = await generateRecipe({
                    day: dayName,
                    type,
                    attendees: participants as any,
                    commonDislikes,
                    kitchenTools: household.preferences?.kitchenTools || ["Four", "Plaques"],
                    isExpress: menu[dayName][type].isExpress || false,
                    isBasic: menu[dayName][type].isBasic || false,
                    customRequest: menu[dayName][type].customRequest,
                    cookForLeftover: menu[dayName][type].cookForLeftover,
                    recentMeals,
                    recentProteins,
                    lastWeekMeals,
                    agendaEvents: dayEvents as any[],
                    inventory: inventory.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, expiryDate: i.expiryDate }))
                });
                await updateSlot(dayName, type, { recipe });
            }
        } catch (e) {
            console.error(e);
            alert("Erreur génération");
        } finally {
            setGenerating(null);
        }
    }, [household, menu, currentWeekStart, updateSlot]);

    const generateWeek = useCallback(async () => {
        if (!household) return;
        setGenerating("FULL");
        try {
            // 1. Fetch ALL events for the week once
            const eventsSnap = await getDocs(collection(db, "households", household.id, "events"));
            const allEvents = eventsSnap.docs.map(d => d.data());

            const weekEvents = allEvents.filter((e: any) => {
                const eDate = new Date(e.start);
                return eDate >= currentWeekStart && eDate < addDays(currentWeekStart, 7);
            });

            // 2. Prepare Context
            const commonDislikes = household.preferences?.forbiddenIngredients || [];
            const lastWeekMeals = prevMenu
                ? Object.values(prevMenu).flatMap(d => [d.Midi.recipe?.recipeName, d.Soir.recipe?.recipeName]).filter(Boolean) as string[]
                : [];

            const individualRestrictions: string[] = [];
            household.memberProfiles?.forEach(p => {
                const prefs = household.memberPreferences?.[p.uid];
                if (prefs?.dislikes?.length) individualRestrictions.push(`${p.displayName} déteste: ${prefs.dislikes.join(', ')}`);
                if (prefs?.allergies?.length) individualRestrictions.push(`${p.displayName} est ALLERGIQUE à: ${prefs.allergies.join(', ')}`);
            });

            // 3. Call AI with PROGRESS CALLBACK
            await generateWeekPlan({
                startDate: format(currentWeekStart, "yyyy-MM-dd"),
                agendaEvents: weekEvents as any[],
                existingMenu: menu,
                lastWeekMeals,
                commonDislikes,
                individualRestrictions,
                inventory: inventory.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, expiryDate: i.expiryDate })),
                kitchenTools: household.preferences?.kitchenTools || ["Four", "Plaques"],
                attendees: household.memberProfiles?.map(p => ({ uid: p.uid, displayName: p.displayName })) || []
            }, async (partialMenu: any) => {
                // INCREMENTAL UPDATE LOGIC
                setMenu(prev => {
                    const newMenu = JSON.parse(JSON.stringify(prev));
                    for (const [key, recipe] of Object.entries(partialMenu)) {
                        if (!recipe) continue;
                        const [day, type] = key.split('-');
                        if (newMenu[day] && (type === 'Midi' || type === 'Soir')) {
                            // Only update if not already set (safety)
                            newMenu[day][type].recipe = recipe;
                            newMenu[day][type].mode = 'single';
                        }
                    }
                    return newMenu;
                });

                // Optional: Save intermediate progress to firestore to prevent data loss?
                // For now, we save only at the end or if we really want real-time sync.
                // Let's do a basic save.
                const newMenuForSave = JSON.parse(JSON.stringify(menu)); // Capture CURRENT state (might lag slightly behind setter but OK)
                for (const [key, recipe] of Object.entries(partialMenu)) {
                    if (!recipe) continue;
                    const [day, type] = key.split('-');
                    if (newMenuForSave[day] && (type === 'Midi' || type === 'Soir')) {
                        newMenuForSave[day][type].recipe = recipe;
                        newMenuForSave[day][type].mode = 'single';
                    }
                }
                await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), { week: newMenuForSave }, { merge: true });
            });

        } catch (e) {
            console.error("Error generating week:", e);
            alert("Erreur lors de la génération globale");
        } finally {
            setGenerating(null);
        }
    }, [household, menu, prevMenu, currentWeekStart, updateSlot]);

    // ---------------------------------------------------------------------
    // Shopping list sorting with persistence
    // ---------------------------------------------------------------------
    const sortShop = useCallback(async (items: string[], force: boolean = false) => {
        if (!household) return;
        const currentHash = JSON.stringify(items.sort());

        // Skip if hash matches what we already have in state (already persisted)
        if (currentHash === lastSortedHash && !force) return;

        setIsSortingShop(true);
        try {
            const sorted = await sortShoppingList(items);
            setSortedShopList(sorted);
            setLastSortedHash(currentHash);

            // Persist to Firestore
            await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), {
                sortedShopList: sorted,
                lastSortedHash: currentHash
            }, { merge: true });

        } catch (e) {
            console.error(e);
        } finally {
            setIsSortingShop(false);
        }
    }, [household, weekId, lastSortedHash]);

    const copyPreviousWeek = useCallback(async () => {
        if (!household) return;
        const prevWeekStart = subWeeks(currentWeekStart, 1);
        const prevWeekId = format(prevWeekStart, "yyyy-MM-dd");

        try {
            const prevDocRef = doc(db, "households", household.id, "meal_weeks", prevWeekId);
            const prevDocSnap = await getDoc(prevDocRef);

            if (prevDocSnap.exists()) {
                const prevData = prevDocSnap.data().week;
                const newMenu = JSON.parse(JSON.stringify(DEFAULT_WEEK));

                (["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as string[]).forEach(day => {
                    if (prevData[day]) {
                        ['Midi', 'Soir'].forEach(type => {
                            const prevSlot = prevData[day][type as 'Midi' | 'Soir'];
                            const { recipe, meals, customRequest, ...config } = prevSlot;

                            newMenu[day][type] = {
                                ...config,
                                type,
                                recipe: prevSlot.mode === 'leftover' ? recipe : null,
                                meals: meals ? meals.map((m: any) => ({ ...m, recipe: null })) : []
                            };
                        });
                    }
                });

                setMenu(newMenu);
                await setDoc(doc(db, "households", household.id, "meal_weeks", weekId), { week: newMenu }, { merge: true });
                alert("Structure de la semaine précédente copiée (sans les repas) !");
            } else {
                alert("Pas de données pour la semaine précédente.");
            }
        } catch (e) {
            console.error("Copy error:", e);
            alert("Erreur lors de la copie.");
        }
    }, [household, currentWeekStart, weekId]);

    // ---------------------------------------------------------------------
    // Return hook API
    // ---------------------------------------------------------------------
    return {
        menu,
        loading,
        generating,
        weekId,
        currentWeekStart,
        sortedShopList,
        lastSortedHash,
        isSortingShop,
        changeWeek,
        updateSlot,
        generateSlot,
        generateWeek,
        sortShop,
        copyPreviousWeek,
        checkedItems,
        toggleShoppingItem,
        checkCategory,
        syncCheckedItems,
        removedItems,
        removeShoppingItem,
        restoreShoppingItem
    };
}
