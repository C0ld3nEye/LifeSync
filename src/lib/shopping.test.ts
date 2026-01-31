import { describe, it, expect } from 'vitest';
import { calculateShoppingList } from './shopping';
import { WeekMenu } from '@/types/smartmeal';

const EMPTY_SLOT = { type: "Midi", mode: "single", attendees: [], isIgnored: false, recipe: null } as const;

describe('calculateShoppingList', () => {
    it('should return empty list for empty menu', () => {
        const menu: WeekMenu = {
            "Lundi": { date: "Lundi", dayName: "Lundi", Midi: { ...EMPTY_SLOT, type: "Midi" }, Soir: { ...EMPTY_SLOT, type: "Soir" } }
        };
        const list = calculateShoppingList(menu);
        expect(list).toEqual([]);
    });

    it('should aggregate ingredients from single recipes', () => {
        const menu: WeekMenu = {
            "Lundi": {
                date: "Lundi", dayName: "Lundi",
                Midi: {
                    ...EMPTY_SLOT, type: "Midi",
                    recipe: {
                        recipeName: "Pasta",
                        ingredients: [{ item: "Pâtes", q: 200, u: "g" }, { item: "Tomate", q: 2, u: "pcs" }]
                    } as any
                },
                Soir: { ...EMPTY_SLOT, type: "Soir" }
            }
        };
        const list = calculateShoppingList(menu);
        expect(list).toContain("Pâtes : 200 g");
        expect(list).toContain("Tomate : 2 pcs");
        expect(list.length).toBe(2);
    });

    it('should ignore ignored slots', () => {
        const menu: WeekMenu = {
            "Lundi": {
                date: "Lundi", dayName: "Lundi",
                Midi: {
                    ...EMPTY_SLOT, type: "Midi",
                    isIgnored: true,
                    recipe: {
                        recipeName: "Pasta",
                        ingredients: [{ item: "Pâtes", q: 200, u: "g" }]
                    } as any
                },
                Soir: { ...EMPTY_SLOT, type: "Soir" }
            }
        };
        const list = calculateShoppingList(menu);
        expect(list).toEqual([]);
    });

    it('should handle split mode recipes', () => {
        const menu: WeekMenu = {
            "Lundi": {
                date: "Lundi", dayName: "Lundi",
                Midi: {
                    ...EMPTY_SLOT, type: "Midi",
                    mode: 'split',
                    meals: [
                        { recipe: { ingredients: [{ item: "A", q: 1, u: "u" }] } as any, attendees: [] },
                        { recipe: { ingredients: [{ item: "B", q: 1, u: "u" }] } as any, attendees: [] }
                    ]
                },
                Soir: { ...EMPTY_SLOT, type: "Soir" }
            }
        };
        const list = calculateShoppingList(menu);
        expect(list).toContain("A : 1 u");
        expect(list).toContain("B : 1 u");
    });
});
