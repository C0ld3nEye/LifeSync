"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { startOfWeek } from "date-fns";

interface MealWeekContextType {
    currentWeekStart: Date;
    setCurrentWeekStart: React.Dispatch<React.SetStateAction<Date>>;
}

const MealWeekContext = createContext<MealWeekContextType | undefined>(undefined);

export function MealWeekProvider({ children }: { children: ReactNode }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    return (
        <MealWeekContext.Provider value={{ currentWeekStart, setCurrentWeekStart }}>
            {children}
        </MealWeekContext.Provider>
    );
}

export function useMealWeek() {
    const context = useContext(MealWeekContext);
    if (context === undefined) {
        throw new Error("useMealWeek must be used within a MealWeekProvider");
    }
    return context;
}
