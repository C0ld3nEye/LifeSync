import { WeekMenu, Recipe } from "@/types/smartmeal";

export interface ShoppingItem {
    key: string;
    text: string;
    category: string;
    checked: boolean;
}

export const CATEGORY_ORDER = [
    "Fruits & Légumes",
    "Boucherie & Poisson",
    "Frais & Crèmerie",
    "Épicerie Salée",
    "Épicerie Sucrée",
    "Boissons",
    "Surgelés",
    "Hygiène & Maison",
    "Divers"
];

export function calculateShoppingList(menu: WeekMenu): string[] {
    const rawItems: string[] = [];

    const add = (r: Recipe | null | undefined) => {
        if (!r || !r.ingredients) return;
        r.ingredients.forEach(ing => {
            const q = Math.round(ing.q * 10) / 10;
            if (q > 0) rawItems.push(`${ing.item} : ${q} ${ing.u}`);
        });
    };

    Object.values(menu).forEach(day => {
        ['Midi', 'Soir'].forEach(type => {
            const slot = day[type as 'Midi' | 'Soir'];
            if (slot.isIgnored) return;

            if (slot.mode === 'single') {
                add(slot.recipe);
            } else if (slot.mode === 'split') {
                slot.meals?.forEach(m => {
                    add(m.recipe);
                });
            }
        });
    });

    return rawItems;
}
