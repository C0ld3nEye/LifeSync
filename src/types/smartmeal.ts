export type Ingredient = {
    item: string;
    q: number;
    u: string;
};

export type Recipe = {
    recipeName: string;
    protein: string;
    ingredients: Ingredient[];
    prepTime: string;
    cookTime: string;
    cookingMethod: string;
    nutriFocus: string;
    description: string;
    instructions: string[];
    rationale?: string; // AI Explanation of why this meal was chosen
};

export type MealType = 'Midi' | 'Soir';

export type MealSlot = {
    type: MealType;
    mode: 'single' | 'split' | 'leftover';
    recipe?: Recipe | null; // For single mode
    meals?: { recipe: Recipe | null; attendees: string[] }[]; // For split mode
    attendees?: string[]; // User IDs (for single mode)
    sportNote?: string;
    isExpress?: boolean;
    isBasic?: boolean; // Simple ingredients, easy cooking
    isIgnored?: boolean; // Skip this meal
    customRequest?: string;
    cookForLeftover?: boolean;
    reheatMethod?: string; // For leftovers
};

export type DayMenu = {
    date: string; // YYYY-MM-DD
    dayName: string; // Lundi, Mardi...
    Midi: MealSlot;
    Soir: MealSlot;
};

export type WeekMenu = {
    [key: string]: DayMenu; // Keyed by YYYY-MM-DD or simple Day Name if we stick to static week
};

export interface SmartMealHookResult {
    menu: WeekMenu;
    loading: boolean;
    generating: string | null;
    weekId: string;
    currentWeekStart: Date;
    sortedShopList: Record<string, string[]> | null;
    lastSortedHash: string | null;
    isSortingShop: boolean;
    changeWeek: (offset: number) => void;
    updateSlot: (day: string, type: "Midi" | "Soir", updates: Partial<MealSlot>) => Promise<void>;
    generateSlot: (dayName: string, type: "Midi" | "Soir") => Promise<void>;
    generateWeek: () => Promise<void>;
    sortShop: (items: string[], force?: boolean) => Promise<void>;
    copyPreviousWeek: () => Promise<void>;
    checkedItems: string[];
    toggleShoppingItem: (item: string) => Promise<void>;
    checkCategory: (items: string[], checked: boolean) => Promise<void>;
    syncCheckedItems: (items: string[]) => Promise<void>;
    removedItems: string[];
    removeShoppingItem: (item: string) => Promise<void>;
    restoreShoppingItem: (item: string) => Promise<void>;
}
