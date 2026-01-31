"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PieChart, BarChart2, TrendingUp, ArrowRight, Wallet, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Expense } from "@/hooks/useBudget";
import { subDays, format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

interface BudgetChartsProps {
    expenses: Expense[];
    userUid?: string;
    household?: any;
}

import { ALL_CATEGORIES } from "@/lib/budget-constants";

const CATEGORY_COLORS: Record<string, string> = ALL_CATEGORIES.reduce((acc, cat) => ({
    ...acc,
    [cat.id]: cat.solidColor || cat.color.split(' ')[0].replace('-100', '-500')
}), {});

const CATEGORY_LABELS: Record<string, string> = ALL_CATEGORIES.reduce((acc, cat) => ({
    ...acc,
    [cat.id]: cat.label
}), {});

export default function BudgetCharts({ expenses: rawExpenses, userUid, household }: BudgetChartsProps) {
    const [viewMode, setViewMode] = useState<'foyer' | 'perso'>('foyer');

    // Simplified share calculation for the charts (copied from page.tsx logic)
    const getShare = (ex: Expense, uid: string) => {
        if (ex.type === 'personal') return ex.paidBy === uid ? ex.amount : 0;
        if (ex.splitType === 'individual') return ex.paidBy === uid ? ex.amount : 0;
        if (ex.splitType === 'equal') return ex.amount / (household?.members?.length || 1);

        // For proportional, use current month if available, else 50/50 as fallback for charts
        const salaries = household?.budgetConfig?.monthlySalaries?.[format(new Date(), "yyyy-MM")];
        if (salaries && salaries[uid]) {
            const totalSalary = Object.values(salaries).reduce((s: any, v: any) => s + v, 0) as number;
            return totalSalary > 0 ? (ex.amount * (salaries[uid] / totalSalary)) : (ex.amount / 2);
        }
        return ex.amount / 2;
    };

    const expenses = rawExpenses.filter(e => {
        if (viewMode === 'foyer') return e.type !== 'personal';
        return true;
    }).map(e => {
        if (viewMode === 'perso' && e.type === 'shared') {
            return { ...e, amount: getShare(e, userUid || '') };
        }
        return e;
    });

    const total = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 1; // Avoid division by zero

    // Full vibrant palette
    const RAINBOW_COLORS = [
        'bg-rose-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
        'bg-sky-500', 'bg-fuchsia-500', 'bg-orange-500', 'bg-teal-500',
        'bg-violet-500', 'bg-lime-500', 'bg-pink-500', 'bg-cyan-500'
    ];

    const chartData = expenses.reduce((acc, curr) => {
        let categoryId = curr.category as any || 'autre';

        // Handle legacy corrupted data where index was saved instead of ID
        if (categoryId === '0') categoryId = 'loyer';
        if (categoryId === '1') categoryId = 'courses';

        const isPersonal = curr.type === 'personal';
        const isBill = categoryId === 'facture';

        let key = "";
        let label = "";

        // 1. Determine Key & Base Label
        if (isBill) {
            // Individual bills
            key = `item-${curr.id || Math.random()}`;
            label = curr.label || 'Facture';
        } else {
            // Others grouped by category
            key = `${categoryId}-${isPersonal ? 'perso' : 'foyer'}`;
            label = CATEGORY_LABELS[categoryId] || categoryId || 'Autre';
        }

        // 2. Add (Perso) suffix if applicable
        if (isPersonal) {
            label = `${label} (Perso)`;
        }

        if (!acc[key]) {
            const colorIndex = Object.keys(acc).length;
            acc[key] = {
                amount: 0,
                label,
                color: RAINBOW_COLORS[colorIndex % RAINBOW_COLORS.length],
                id: key
            };
        }

        acc[key].amount += (curr.amount || 0);
        return acc;
    }, {} as Record<string, { amount: number, label: string, color: string, id: string }>);

    const sortedGroups = Object.values(chartData)
        .filter(g => g.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    // Calculate daily data for last 14 days
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
        const date = subDays(new Date(), 13 - i);
        const dayTotal = expenses.reduce((acc, curr) => {
            const expDate = curr.date?.toDate ? curr.date.toDate() : new Date(curr.date);
            if (isSameDay(expDate, date)) {
                return acc + curr.amount;
            }
            return acc;
        }, 0);
        return {
            date,
            amount: dayTotal,
            label: format(date, 'd MMM', { locale: fr })
        };
    });

    const maxDayAmount = Math.max(...last14Days.map(d => d.amount), 1);

    // Calc "Top Dépenses"
    const topExpenses = [...expenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    // Calc "Fixe vs Variable"
    // Exclude reserves from this specific binary comparison as they are "Savings"
    const expensesForFixVar = expenses.filter(e => !e.id.startsWith('reserve-'));

    // STRICT Logic: 
    // Fixed = marked as Fixed (matches Config Label or is Subscription) OR is a Virtual Fixed Charge
    const fixedExpenses = expensesForFixVar.filter(e => (e as any).isFixed || (e as any).isFixedCharge);

    const variableExpenses = expensesForFixVar.filter(e => !fixedExpenses.includes(e));

    const fixedTotal = fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const variableTotal = variableExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalCalc = fixedTotal + variableTotal; // Total of only Fixed + Variable (excluding Savings)

    return (
        <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2 text-sm">
                            <PieChart size={18} className="text-indigo-500" /> Répartition
                        </h3>
                        <button
                            onClick={() => setViewMode(prev => prev === 'foyer' ? 'perso' : 'foyer')}
                            className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all group/toggle"
                        >
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover/toggle:text-indigo-500">
                                {viewMode === 'foyer' ? 'Foyer' : 'Perso'}
                            </span>
                            <ArrowRight size={10} className={cn("text-slate-300 transition-transform group-hover/toggle:text-indigo-500", viewMode === 'perso' && "rotate-180")} />
                        </button>
                    </div>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{Math.round(total)}€</span>
                </div>

                <div className="space-y-4">
                    {/* Visual Progress Bars */}
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                        {sortedGroups.map((group) => (
                            <motion.div
                                key={group.id}
                                initial={{ width: 0 }}
                                animate={{ width: `${(group.amount / total) * 100}%` }}
                                className={cn("h-full", group.color)}
                            />
                        ))}
                    </div>

                    {/* Legend / Details */}
                    <div className="grid grid-cols-1 gap-3 pt-2">
                        {sortedGroups.map((group) => (
                            <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-3 h-3 rounded-full", group.color)} />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{group.label}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-slate-800 dark:text-white">{Math.round(group.amount)}€</span>
                                    <span className="text-[10px] font-bold text-slate-400 block">{Math.round((group.amount / total) * 100)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Dépenses */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2 text-sm">
                        <ArrowUpRight size={18} className="text-rose-500" /> Top Dépenses
                    </h3>
                </div>
                <div className="space-y-3">
                    {topExpenses.map(expense => (
                        <div key={expense.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-black", CATEGORY_COLORS[expense.category])}>
                                    {CATEGORY_LABELS[expense.category]?.[0] || expense.category[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[150px]">{expense.label}</p>
                                    <p className="text-[10px] text-slate-400 font-bold flex gap-2 items-center">
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                            expense.type === 'personal' ? "bg-blue-50 text-blue-500" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {expense.type === 'personal' ? 'Perso' : 'Foyer'}
                                        </span>
                                        {format(expense.date?.toDate ? expense.date.toDate() : new Date(expense.date), 'd MMM', { locale: fr })}
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-black text-rose-500">-{expense.amount.toFixed(2)}€</span>
                        </div>
                    ))}
                    {topExpenses.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucune dépense...</p>}
                </div>
            </div>

            {/* Fixe vs Variable */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Wallet size={16} /></div>
                        <span className="text-[10px] font-black uppercase text-slate-400">Fixe</span>
                    </div>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{Math.round(fixedTotal)}€</p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${totalCalc > 0 ? (fixedTotal / totalCalc) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><TrendingUp size={16} /></div>
                        <span className="text-[10px] font-black uppercase text-slate-400">Variable</span>
                    </div>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{Math.round(variableTotal)}€</p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${totalCalc > 0 ? (variableTotal / totalCalc) * 100 : 0}%` }} />
                    </div>
                </div>
            </div>

            {/* Daily Trends (Renamed) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2 text-sm">
                        <BarChart2 size={18} className="text-emerald-500" /> Dépenses Quotidiennes
                    </h3>
                    <TrendingUp size={14} className="text-slate-300" />
                </div>

                <div className="flex items-end justify-between h-32 gap-1.5 px-1">
                    {last14Days.map((day, i) => {
                        const height = (day.amount / maxDayAmount) * 100;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                                <div className="relative w-full flex flex-col justify-end h-full">
                                    <AnimatePresence>
                                        {day.amount > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                whileHover={{ opacity: 1, y: -5 }}
                                                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black py-1 px-1.5 rounded pointer-events-none opacity-0 transition-opacity z-20 whitespace-nowrap"
                                            >
                                                {Math.round(day.amount)}€
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.max(height, day.amount > 0 ? 5 : 0)}%` }}
                                        className={cn(
                                            "w-full rounded-t-lg transition-all duration-300",
                                            day.amount > 0 ? "bg-emerald-500" : "bg-slate-100 dark:bg-slate-800"
                                        )}
                                    />
                                </div>
                                <span className={cn(
                                    "text-[7px] font-black uppercase tracking-tighter truncate w-full text-center",
                                    i === 13 ? "text-emerald-500" : "text-slate-400"
                                )}>
                                    {i % 4 === 0 || i === 13 ? day.label : ''}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne / jour</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white">
                            {Math.round(last14Days.reduce((acc, d) => acc + d.amount, 0) / 14)}€
                        </p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Pic d'activité</p>
                        <p className="text-sm font-black text-emerald-500">
                            {Math.round(maxDayAmount)}€
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
