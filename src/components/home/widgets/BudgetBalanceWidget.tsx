"use client";

import { motion } from "framer-motion";
import { Landmark, TrendingDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ALL_CATEGORIES } from "@/lib/budget-constants";

interface BudgetBalanceWidgetProps {
    household: any;
    expenses: any[];
    user: any;
    wishlist: any[];
}

export default function BudgetBalanceWidget({ household, expenses, user, wishlist }: BudgetBalanceWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const budgetConfig = household?.budgetConfig;
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

    const getSalaryForUser = (uid: string) => {
        const monthly = budgetConfig?.monthlySalaries?.[monthKey]?.[uid];
        if (monthly !== undefined) return monthly;
        return budgetConfig?.salaries?.[uid] || 0;
    };

    const totalHouseholdSalary = (household?.members || []).reduce((acc: number, uid: string) => acc + getSalaryForUser(uid), 0);
    const mySalary = getSalaryForUser(user?.uid || '');

    const getSplitRatio = (uid: string) => {
        if (totalHouseholdSalary === 0) return 0;
        return getSalaryForUser(uid) / totalHouseholdSalary;
    };

    const calculateTotalShareForUser = (items: any[], targetUid: string) => {
        return items.reduce((acc, curr) => {
            const amount = curr.frequency === 'yearly' ? (curr.amount || 0) / 12 : (curr.amount || 0);
            const memberCount = household?.members.length || 1;

            if (curr.splitType === 'custom' && curr.customShares && curr.customShares[targetUid] !== undefined) {
                return acc + (amount * (curr.customShares[targetUid] / 100));
            }
            if (curr.splitType === 'rounded') {
                const ratio = getSplitRatio(targetUid);
                return acc + Math.round(amount * ratio);
            }
            return acc + (amount / memberCount);
        }, 0);
    };

    const calculateShareForUser = (amount: number, type: 'equal' | 'proportional', targetUid: string) => {
        let share = 0;
        if (type === 'equal') {
            const memberCount = household?.members.length || 1;
            share = amount / memberCount;
        } else {
            const ratio = getSplitRatio(targetUid);
            share = amount * ratio;
        }
        return Math.round(share);
    };

    // Household Totals
    const householdFixed = (budgetConfig?.fixedCharges || []).reduce((acc: number, curr: any) => acc + (curr.frequency === 'yearly' ? curr.amount / 12 : curr.amount), 0);
    const householdReserves = (budgetConfig?.reserves || []).reduce((acc: number, curr: any) => acc + (curr.frequency === 'yearly' ? curr.amount / 12 : curr.amount), 0);
    const householdExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const householdLeft = totalHouseholdSalary - householdFixed - householdReserves - householdExpenses;

    // Personal Totals
    const myFixedShare = calculateTotalShareForUser(budgetConfig?.fixedCharges || [], user?.uid || '');
    const myWishlistSavings = wishlist.reduce((acc, curr) => {
        const monthly = curr.monthlySaving || 0;
        if (curr.type === 'shared') {
            const memberCount = household?.members.length || 1;
            return acc + (monthly / memberCount);
        }
        if (curr.createdBy === user?.uid) {
            return acc + monthly;
        }
        return acc;
    }, 0);
    const myReservesShare = calculateTotalShareForUser(budgetConfig?.reserves || [], user?.uid || '') + myWishlistSavings;
    const myExpensesShare = expenses.reduce((acc, curr) => acc + calculateShareForUser(curr.amount, curr.splitType, user?.uid || ''), 0);
    const myLeft = mySalary - myFixedShare - myReservesShare - myExpensesShare;

    return (
        <motion.div variants={item}>
            <Link href="/budget" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute -top-6 -right-6 text-emerald-500/5 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                    <Landmark size={120} />
                </div>

                <div className="flex justify-between items-center mb-5 relative z-10">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <Landmark size={18} className="text-emerald-600" /> Reste à vivre
                    </h3>
                    <ArrowUpRight size={18} className="text-slate-300 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {Math.round(myLeft)} <span className="text-xs font-bold opacity-40">€</span>
                        </p>
                        <div className="h-1 w-8 bg-emerald-500 rounded-full" />
                    </div>
                    <div className="space-y-1 border-l border-slate-100 dark:border-slate-800 pl-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foyer</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {Math.round(householdLeft)} <span className="text-xs font-bold opacity-40">€</span>
                        </p>
                        <div className="h-1 w-8 bg-blue-500 rounded-full" />
                    </div>
                </div>

                {/* Categorized Summary (Combined Expenses + Fixed Charges + Reserves) */}
                <div className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {ALL_CATEGORIES.map(cat => {
                        const actualTotal = expenses.filter(e => e.category === cat.id).reduce((acc, curr) => acc + curr.amount, 0);
                        const fixedTotal = (budgetConfig?.fixedCharges || [])
                            .filter((f: any) => f.category === cat.id)
                            .reduce((acc: number, curr: any) => acc + (curr.frequency === 'yearly' ? curr.amount / 12 : curr.amount), 0);
                        const reserveTotal = (budgetConfig?.reserves || [])
                            .filter((r: any) => r.category === cat.id)
                            .reduce((acc: number, curr: any) => acc + curr.amount, 0);

                        const total = actualTotal + fixedTotal + reserveTotal;

                        if (total === 0) return null;
                        return (
                            <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl whitespace-nowrap">
                                <div className={cn("w-2 h-2 rounded-full", cat.solidColor || "bg-slate-400")} />
                                <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">{cat.label}: {Math.round(total)}€</span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider italic">Calculé après charges & épargne</p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase italic">Live</span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
