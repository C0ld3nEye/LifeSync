"use client";

import { useState, useEffect, useMemo } from "react";
import { useBudget, Expense } from "@/hooks/useBudget";
import { useChores } from "@/hooks/useChores";
import { useWishlist, WishlistItem, TrackedProduct } from "@/hooks/useWishlist";
import { useProjects } from "@/hooks/useProjects";
import {
    Wallet, Plus, Trash2, ShoppingCart, Home, Coffee, FileText,
    MoreHorizontal, Settings, PiggyBank, ArrowDownCircle, ArrowUpCircle,
    Users as UsersIcon, Percent, Scale, ChevronLeft, ChevronRight,
    CreditCard, Landmark, TrendingUp, Calendar, Info, X, Check, Sparkles as SparkleIcon,
    Gift, ArrowRight, ExternalLink, Eye, EyeOff, Link, History, TrendingDown, Search, Loader,
    Layers, UserMinus, CheckCircle2, HelpCircle, Rocket,
    Wifi, Droplets, Zap, Tv, Shield, Phone, Edit2, ChevronDown
} from "lucide-react";
import InfoModal from "@/components/ui/InfoModal";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, startOfDay, parseISO, differenceInCalendarMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useHousehold, HouseholdData } from "@/hooks/useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchProductPrice } from "@/lib/gemini";
import BudgetCharts from "@/components/budget/BudgetCharts";
import TransactionModal from "@/components/budget/TransactionModal";

// --- COMPONENTS ---

function PriceWatchSection({
    products,
    onAdd,
    onRemove,
    onRefresh,
    loading
}: {
    products?: TrackedProduct[],
    onAdd: (url: string) => void,
    onRemove: (id: string) => void,
    onRefresh?: () => void,
    loading?: boolean
}) {
    const [url, setUrl] = useState('');
    const [showInput, setShowInput] = useState(false);

    return (
        <div className={cn("mt-8 space-y-4 border-t border-slate-50 dark:border-slate-800 pt-6", loading && "opacity-50 pointer-events-none")}>
            <div className="flex justify-between items-center mb-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingDown size={14} className="text-blue-500" /> Veille Produit {loading && <Loader className="animate-spin" size={12} />}
                </h5>
                <div className="flex gap-2">
                    {onRefresh && (
                        <button onClick={onRefresh} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:text-blue-500 transition-colors">
                            <History size={14} />
                        </button>
                    )}
                    {!showInput && (
                        <button onClick={() => setShowInput(true)} className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Plus size={14} />
                        </button>
                    )}
                </div>
            </div>

            {showInput && (
                <div className="flex gap-2">
                    <input
                        autoFocus
                        placeholder="Lien ou nom du produit..."
                        className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-[10px] font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/20"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                onAdd(url);
                                setUrl('');
                                setShowInput(false);
                            }
                        }}
                    />
                    <button onClick={() => setShowInput(false)} className="p-3 text-slate-400"><X size={14} /></button>
                </div>
            )}

            <div className="space-y-3">
                {(() => {
                    const validPrices = products?.map(p => p.currentPrice).filter((p): p is number => !!p) || [];
                    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

                    return products?.map(p => (
                        <div key={p.id} className={cn(
                            "p-3 rounded-2xl border flex flex-col gap-3 group transition-all relative overflow-hidden",
                            p.currentPrice === minPrice && minPrice !== null
                                ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20"
                                : "bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                        )}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all",
                                        p.currentPrice === minPrice && minPrice !== null ? "bg-emerald-500" : "bg-blue-500/10"
                                    )}>
                                        <Search size={14} className={p.currentPrice === minPrice && minPrice !== null ? "text-white" : "text-blue-500"} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-wrap gap-2 mb-0.5">
                                            <p className="text-[11px] font-black dark:text-white break-words leading-tight line-clamp-2">{p.name || p.url}</p>
                                            {p.currentPrice === minPrice && minPrice !== null && (
                                                <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Gagnant</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{p.currentPrice ? `${p.currentPrice}€` : '--'}</span>
                                            {p.merchant && (
                                                <span className="text-[9px] font-bold text-slate-400 capitalize bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md truncate max-w-[100px] border dark:border-slate-700">{p.merchant}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => onRemove(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                                {p.url && (
                                    <a
                                        href={p.url.startsWith('http') ? p.url : `https://www.google.com/search?q=${encodeURIComponent(p.name || p.url)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 hover:underline truncate bg-blue-500/5 px-2 py-1 rounded-lg"
                                    >
                                        <ExternalLink size={10} /> Voir l'offre
                                    </a>
                                )}
                                <div className="flex items-center gap-2">
                                    {p.lowestPrice && p.currentPrice && p.currentPrice > p.lowestPrice && (
                                        <span className="text-[8px] font-black text-red-500 flex items-center gap-0.5 bg-red-500/10 px-1.5 py-0.5 rounded">
                                            <TrendingUp size={8} /> +{(p.currentPrice - p.lowestPrice).toFixed(1)}€
                                        </span>
                                    )}
                                    {p.lowestPrice && p.currentPrice && p.currentPrice <= p.lowestPrice && (
                                        <span className="text-[8px] font-black text-emerald-500 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                            <TrendingDown size={8} /> Prix bas
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ));
                })()}

                {products && products.length > 0 && products.length < 5 && !showInput && (
                    <button
                        onClick={() => setShowInput(true)}
                        className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-500/30 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> Comparer un autre modèle
                    </button>
                )}

                {(!products || products.length === 0) && !showInput && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Aucun modèle suivi</p>
                        <p className="text-[9px] text-slate-400 italic">Ajoute des produits pour laisser l&apos;IA trouver la meilleure offre pour toi.</p>
                        <button onClick={() => setShowInput(true)} className="mt-4 px-4 py-2 bg-blue-500 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-blue-500/20">Lancer une veille</button>
                    </div>
                )}
            </div>
        </div>
    );
}

import { CATEGORIES, SUBSCRIPTION_CATEGORIES, ALL_CATEGORIES } from "@/lib/budget-constants";

export default function BudgetPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'budget' | 'flux' | 'épargne' | 'revenus' | 'wishlist' | 'analyses' | 'abonnements'>('budget');

    const { user } = useAuth();
    const { expenses, unsettledExpenses, loading, addExpense, deleteExpense, updateExpense, addRepayment, settleExpense } = useBudget(selectedMonth);
    const visibleExpenses = expenses.filter(e => e.type !== 'personal' || e.paidBy === user?.uid);
    const { household, updateBudgetConfig, togglePaymentStatus, updateMonthlySalary, getEffectiveSubscription } = useHousehold();
    const { addPrivateChore } = useChores();
    const { wishlist, addWishlistItem, deleteWishlistItem } = useWishlist();
    const { projects } = useProjects();
    const [showAdd, setShowAdd] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const selectedExpense = expenses.find(e => e.id === selectedExpenseId);
    const selectedWish = wishlist.find(w => w.id === selectedWishId);
    const [newEx, setNewEx] = useState({ label: '', amount: '', category: 'courses', splitType: 'equal' as Expense['splitType'], type: 'shared' as 'shared' | 'personal', paidBy: '', description: '', projectId: '', paidByJoint: false, isSubscription: false, renewsOn: 1, customShares: {} as Record<string, number> });
    const [repaymentTarget, setRepaymentTarget] = useState<{ expenseId: string; amount: number; label: string; memberUid: string; creditorUid?: string; expenseIds?: string[] } | null>(null);
    const [repaymentAmount, setRepaymentAmount] = useState<string>('');
    const [debtDetailUid, setDebtDetailUid] = useState<string | null>(null);

    const monthKey = format(selectedMonth, "yyyy-MM");

    useEffect(() => {
        if (showAdd && !newEx.paidBy && user) {
            setNewEx(prev => ({ ...prev, paidBy: user.uid }));
        }
    }, [showAdd, user]);

    // --- UTILS ---
    const isSameMonth = (d1: Date, d2: Date) => {
        return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    };

    const renderItem = (item: any, m: any) => {
        const typedItem = item as any;
        const share = calculateShareForUser(typedItem.amount, (typedItem.splitType as any) || 'equal', m.uid, typedItem.paidBy || 'joint', safeDate(typedItem.date));

        let repaid = 0;
        let isBudgetedDone = false;

        if (typedItem.isBudgeted) {
            const key = `${typedItem.label}-${monthKey}-${m.uid}`;
            isBudgetedDone = household?.budgetConfig?.budgetCompletions?.[key] || false;
            if (isBudgetedDone) repaid = share; // Visually treat as fully paid
        } else {
            repaid = typedItem.isExpense ? (Array.isArray(typedItem.repayments) ? typedItem.repayments.filter((r: any) => r.uid === m.uid).reduce((sum: number, r: any) => sum + r.amount, 0) : 0) : 0;
        }

        const remaining = share - repaid;
        const date = safeDate(typedItem.date);
        const isPastYear = date.getFullYear() !== new Date().getFullYear();
        const dateFormat = isPastYear ? "dd MMM yyyy" : "dd MMM";

        return (
            <div
                key={typedItem.id}
                onClick={() => {
                    if (m.uid !== user?.uid && item.paidBy !== user?.uid) return;
                    if (typedItem.isBudgeted) {
                        if (m.uid === user?.uid) togglePaymentStatus(typedItem.label, monthKey);
                    } else {
                        if (m.uid === user?.uid || typedItem.paidBy === user?.uid) {
                            setRepaymentTarget({ expenseId: typedItem.id, amount: remaining, label: typedItem.label, memberUid: m.uid });
                            setRepaymentAmount(remaining.toFixed(2));
                        }
                    }
                }}
                className={cn(
                    "flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl border border-white/5 transition-all group/item",
                    (m.uid === user?.uid || typedItem.paidBy === user?.uid) && remaining > 0.5 ? "cursor-pointer hover:bg-white/10" : "opacity-70"
                )}
            >
                <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                        <p className={cn("text-[10px] font-bold truncate transition-colors", isBudgetedDone ? "text-slate-500 line-through decoration-slate-600" : "text-slate-300 group-hover/item:text-white")}>{typedItem.label}</p>
                        {remaining <= 0.5 && <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />}
                    </div>
                    {typedItem.isBudgeted ? (
                        <p className="text-[8px] text-indigo-400 font-black uppercase tracking-tighter">Charge Fixe</p>
                    ) : (
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                            {format(date, dateFormat, { locale: fr })}
                        </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className={cn("text-[10px] font-black", remaining <= 0.5 ? "text-emerald-500/50" : "text-white")}>
                        {remaining <= 0.5 ? "Réglé" : `${remaining.toFixed(2)}€`}
                    </p>
                    {remaining > 0.5 && (
                        <p className="text-[7px] font-bold text-slate-500">Part: {share.toFixed(2)}€</p>
                    )}
                </div>
            </div>
        );
    };

    const safeDate = (d: any): Date => {
        if (!d) return new Date();
        if (typeof d?.toDate === 'function') return d.toDate();
        if (d instanceof Date) return d;
        return new Date(d);
    };

    // --- CALCULATIONS ---

    const getSalaryForUser = (uid: string) => {
        const monthly = household?.budgetConfig?.monthlySalaries?.[monthKey]?.[uid];
        if (monthly !== undefined) return monthly;
        return household?.budgetConfig?.salaries?.[uid] || 0;
    };

    const totalHouseholdSalary = (household?.members || []).reduce((acc, uid) => acc + getSalaryForUser(uid), 0);
    const mySalary = getSalaryForUser(user?.uid || '');

    const getSplitRatio = (uid: string) => {
        if (totalHouseholdSalary === 0) return 0;
        return getSalaryForUser(uid) / totalHouseholdSalary;
    };

    const calculateMonthlyTotal = (items: { amount: number; frequency?: 'monthly' | 'yearly' }[]) => {
        return items.reduce((acc, curr) => {
            const amount = curr.amount || 0;
            return acc + (curr.frequency === 'yearly' ? amount / 12 : amount);
        }, 0);
    };

    // Memoized set of existing expense labels for the current month
    const actualExpenseLabels = useMemo(() => {
        return new Set(expenses
            .filter(ex => !ex.isSettled)
            .map(ex => ex.label.toLowerCase().trim())
        );
    }, [expenses]);

    const calculateShareForUser = (amount: number, type: 'equal' | 'proportional' | 'individual' | 'custom' | 'rounded', targetUid: string, paidBy?: string, date?: Date, customShares?: Record<string, number>) => {
        let share = 0;
        if (type === 'individual') {
            share = (targetUid === paidBy) ? amount : 0;
        } else if (type === 'equal') {
            const memberCount = Math.max(1, household?.members?.length || household?.memberProfiles?.length || 1);
            share = amount / memberCount;
        } else if (type === 'custom' && customShares && customShares[targetUid] !== undefined) {
            share = amount * (customShares[targetUid] / 100);
        } else if (type === 'rounded') {
            const ratio = getSplitRatio(targetUid);
            share = Math.round(amount * ratio);
        } else {
            // Proportional / Default
            // Use historical ratio if date provided, otherwise current month ratio
            const targetMonthKey = date ? format(date, "yyyy-MM") : monthKey;
            const salary = (uid: string) => {
                const monthly = household?.budgetConfig?.monthlySalaries?.[targetMonthKey]?.[uid];
                if (monthly !== undefined) return monthly;
                return household?.budgetConfig?.salaries?.[uid] || 0;
            };
            const totalSalary = (household?.members || []).reduce((acc, uid) => acc + salary(uid), 0);
            const ratio = totalSalary === 0 ? 0 : salary(targetUid) / totalSalary;
            share = amount * ratio;
        }
        return Math.round(share);
    };

    const calculateTotalShareForUser = (items: any[], targetUid: string) => {
        return items.reduce((acc, curr) => {
            let amount = (curr.amount || 0);

            if (curr.frequency === 'yearly') {
                if (curr.dueDate) {
                    const target = parseISO(curr.dueDate);
                    const monthsLeft = differenceInCalendarMonths(target, selectedMonth) + 1;
                    if (monthsLeft > 0) {
                        amount = amount / monthsLeft;
                    }
                } else {
                    amount = amount / 12;
                }
            }

            if (curr.type === 'personal' && curr.paidBy !== targetUid) return acc;

            const memberCount = household?.members.length || 1;

            if (curr.splitType === 'individual') {
                return acc + (targetUid === curr.paidBy ? amount : 0);
            }
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

    const myExpensesShare = visibleExpenses.reduce((acc, curr) => {
        return acc + calculateShareForUser(curr.amount, curr.splitType, user?.uid || '', curr.paidBy, safeDate(curr.date), curr.customShares);
    }, 0);

    const myPastDebtsShare = unsettledExpenses.reduce((acc, curr) => {
        const share = calculateShareForUser(curr.amount, curr.splitType, user?.uid || '', curr.paidBy, safeDate(curr.date), curr.customShares);
        const repaid = Array.isArray(curr.repayments)
            ? curr.repayments.filter((r: any) => r.uid === user?.uid).reduce((sum: number, r: any) => sum + r.amount, 0)
            : 0;
        return acc + (curr.paidBy !== user?.uid ? Math.max(0, share - repaid) : 0);
    }, 0);

    const budgetCompletions = household?.budgetConfig?.budgetCompletions || {};
    const myFixedShare = Math.round(calculateTotalShareForUser(
        (household?.budgetConfig?.fixedCharges || []).map(c => getEffectiveSubscription(c, selectedMonth)).filter(item => !item.isDeleted && budgetCompletions[`${item.label}-${monthKey}-${user?.uid}`]),
        user?.uid || ''
    ));
    const myWishlistSavingsShare = wishlist.reduce((acc, curr) => {
        const monthly = curr.monthlySaving || 0;
        if (!budgetCompletions[`${curr.label}-${monthKey}-${user?.uid}`]) return acc;
        if (curr.type === 'shared') {
            const memberCount = household?.members.length || 1;
            return acc + (monthly / memberCount);
        }
        if (curr.createdBy === user?.uid) {
            return acc + monthly;
        }
        return acc;
    }, 0);
    const myReservesShare = Math.round(calculateTotalShareForUser(
        (household?.budgetConfig?.reserves || []).filter(item => budgetCompletions[`${item.label}-${monthKey}-${user?.uid}`]),
        user?.uid || ''
    ) + myWishlistSavingsShare);

    const myRemaining = mySalary - myFixedShare - myReservesShare - myExpensesShare - myPastDebtsShare;

    // --- ESTIMATED REMAINING (Assuming everything will be paid) ---
    const myTotalPotentialFixed = Math.round(calculateTotalShareForUser(
        (household?.budgetConfig?.fixedCharges || []),
        user?.uid || ''
    ));
    const myTotalPotentialWishlist = wishlist.reduce((acc, curr) => {
        const monthly = curr.monthlySaving || 0;
        if (monthly <= 0) return acc;
        if (curr.type === 'shared') {
            const memberCount = household?.members.length || 1;
            return acc + (monthly / memberCount);
        }
        if (curr.createdBy === user?.uid) {
            return acc + monthly;
        }
        return acc;
    }, 0);
    const myTotalPotentialReserves = Math.round(calculateTotalShareForUser(
        (household?.budgetConfig?.reserves || []),
        user?.uid || ''
    ) + myTotalPotentialWishlist);

    const myEstimatedRemaining = mySalary - myTotalPotentialFixed - myTotalPotentialReserves - myExpensesShare - myPastDebtsShare;

    const balances = (household?.members || []).reduce((acc, memberUid) => {
        if (memberUid === user?.uid) return acc;
        let net = 0;
        expenses.forEach(ex => {
            const myShareOfThis = calculateShareForUser(ex.amount, ex.splitType, user?.uid || '', ex.paidBy, undefined, ex.customShares);
            const theirShareOfThis = calculateShareForUser(ex.amount, ex.splitType, memberUid, ex.paidBy, undefined, ex.customShares);

            const myRepayment = Array.isArray(ex.repayments)
                ? ex.repayments.filter((r: any) => r.uid === user?.uid).reduce((sum: number, r: any) => sum + r.amount, 0)
                : 0;
            const theirRepayment = Array.isArray(ex.repayments)
                ? ex.repayments.filter((r: any) => r.uid === memberUid).reduce((sum: number, r: any) => sum + r.amount, 0)
                : 0;

            if (ex.paidBy === user?.uid) net += (theirShareOfThis - theirRepayment);
            else if (ex.paidBy === memberUid) net -= (myShareOfThis - myRepayment);
        });
        acc[memberUid] = net;
        return acc;
    }, {} as Record<string, number>);



    const groupExpensesByDate = (exList: Expense[]) => {
        const groups: Record<string, Expense[]> = {};
        exList.forEach(ex => {
            const date = safeDate(ex.date);
            const dayKey = startOfDay(date).toISOString();
            if (!groups[dayKey]) groups[dayKey] = [];
            groups[dayKey].push(ex);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    };

    const expensesByCategory = expenses.reduce((acc, expense) => {
        if (!acc[expense.category]) {
            acc[expense.category] = [];
        }
        acc[expense.category].push(expense);
        return acc;
    }, {} as Record<string, Expense[]>);

    const myTotalIncome = mySalary;
    const myTotalSpent = myExpensesShare + myFixedShare;

    const getDayLabel = (dateIso: string) => {
        const date = safeDate(dateIso);
        if (isToday(date)) return "Aujourd'hui";
        if (isYesterday(date)) return "Hier";
        return format(date, 'd MMMM', { locale: fr });
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEx.label || !newEx.amount) return;
        const amountNum = parseFloat(newEx.amount);
        const effectiveSplitType = newEx.type === 'personal' ? 'individual' : newEx.splitType;

        if (editingExpenseId) {
            await updateExpense(editingExpenseId, {
                label: newEx.label,
                amount: amountNum,
                category: newEx.category as any,
                splitType: effectiveSplitType,
                paidBy: newEx.paidBy,
                description: newEx.description,
                type: newEx.type,
                projectId: newEx.projectId || null,
                paidByJoint: newEx.paidByJoint,
                isSubscription: newEx.isSubscription,
                renewsOn: newEx.renewsOn
            });
            setEditingExpenseId(null);
        } else {
            const expenseId = await addExpense(
                newEx.label,
                amountNum,
                newEx.category as any,
                newEx.splitType,
                newEx.paidBy,
                newEx.description,
                newEx.type,
                newEx.projectId || undefined,
                newEx.paidByJoint,
                newEx.isSubscription,
                newEx.renewsOn
            );

            // Auto-Persist Subscription to Permanent Charges Budget
            if (newEx.isSubscription && household?.budgetConfig) {
                const normalizedLabel = newEx.label.trim().toLowerCase();
                const existingIndex = (household.budgetConfig.fixedCharges || []).findIndex(
                    fc => fc.label.trim().toLowerCase() === normalizedLabel
                );

                if (existingIndex === -1) {
                    const newFixedCharges = [...(household.budgetConfig.fixedCharges || [])];
                    newFixedCharges.push({
                        label: newEx.label,
                        amount: amountNum,
                        category: newEx.category as any,
                        frequency: 'monthly',
                        type: newEx.type, // Persist type (shared/personal)
                        splitType: newEx.splitType as any,
                        paidBy: newEx.paidBy
                    });

                    updateBudgetConfig({
                        ...household.budgetConfig,
                        fixedCharges: newFixedCharges
                    } as any).catch(err => console.error("Failed to persist subscription to permanent charges", err));
                }
            }

            if (expenseId && household && newEx.paidBy) {
                const payer = newEx.paidBy;
                const otherMembers = household.members.filter(uid => uid !== payer);

                for (const memberUid of otherMembers) {
                    const share = calculateShareForUser(amountNum, effectiveSplitType, memberUid, payer, undefined, newEx.customShares); // Assuming newEx has customShares? Check state
                    if (share >= 1) {
                        const payerName = household.memberProfiles?.find(m => m.uid === payer)?.displayName || "Coloc";
                        await addPrivateChore(`Rembourser ${payerName} : ${newEx.label} (${share}€)`, memberUid, 0, 'general', [60]);
                    }
                }
            }
        }

        if (finalizingWishId) {
            await deleteWishlistItem(finalizingWishId);
            setFinalizingWishId(null);
        }

        setNewEx({ label: '', amount: '', category: 'courses', splitType: 'equal', type: 'shared', paidBy: user?.uid || '', description: '', projectId: '', paidByJoint: false, isSubscription: false, renewsOn: 1, customShares: {} });
        setShowAdd(false);
    };

    const updateConfigField = async (type: 'fixedCharges' | 'reserves', index: number, field: string, value: any) => {
        const newList = [...(household?.budgetConfig?.[type] || [])];
        newList[index] = { ...newList[index], [field]: value };
        await updateBudgetConfig({ ...household?.budgetConfig, [type]: newList } as any);
    };

    const deleteConfigItem = async (type: 'fixedCharges' | 'reserves', index: number) => {
        const newList = [...(household?.budgetConfig?.[type] || [])];
        newList.splice(index, 1);
        await updateBudgetConfig({ ...household?.budgetConfig, [type]: newList } as any);
    };

    const addNewConfigItem = async (type: 'fixedCharges' | 'reserves') => {
        const newList = [...(household?.budgetConfig?.[type] || [])];
        newList.push({ label: 'Nouvel élément', amount: 0, frequency: 'monthly' });
        await updateBudgetConfig({ ...household?.budgetConfig, [type]: newList } as any);
    };

    const cycleSplitType = async (type: 'fixedCharges' | 'reserves', index: number) => {
        const newList = [...(household?.budgetConfig?.[type] || [])];
        const current = newList[index].splitType || 'equal';
        let next: any = 'equal';
        if (current === 'equal') next = 'rounded';
        else if (current === 'rounded') next = 'custom';
        else if (current === 'custom') next = 'individual';
        else next = 'equal';

        newList[index].splitType = next;
        if (next === 'custom' && !newList[index].customShares) {
            const shares: Record<string, number> = {};
            household?.members.forEach(m => shares[m] = 100 / (household?.members.length || 1));
            newList[index].customShares = shares;
        }
        await updateBudgetConfig({ ...household?.budgetConfig, [type]: newList } as any);
    };

    const handleFinalizeWish = async (item: WishlistItem) => {
        // Open the expenses modal pre-filled
        setNewEx({
            label: item.label,
            amount: item.amount.toString(),
            category: item.category,
            splitType: item.type === 'personal' ? 'individual' : 'equal',
            type: item.type === 'personal' ? 'personal' : 'shared',
            paidBy: user?.uid || '',
            description: "Achat prévu finalisé",
            projectId: "",
            paidByJoint: false,
            isSubscription: false,
            renewsOn: 1,
            customShares: {}
        });
        setShowAdd(true);
        // We define a state to track if we're finalizing a wish
        setFinalizingWishId(item.id);
    };

    const [finalizingWishId, setFinalizingWishId] = useState<string | null>(null);

    const [newWish, setNewWish] = useState({ label: '', amount: '', category: 'plaisir', dueDate: '', monthlySaving: '', type: 'shared' as 'personal' | 'shared' });
    const [showAddWish, setShowAddWish] = useState(false);

    const [savingAmount, setSavingAmount] = useState('');
    const [selectedWishForSaving, setSelectedWishForSaving] = useState<WishlistItem | null>(null);

    const handleAddWish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWish.label || !newWish.amount) return;
        await addWishlistItem(newWish.label, parseFloat(newWish.amount), newWish.category as any, newWish.dueDate, parseFloat(newWish.monthlySaving) || 0, newWish.type);
        setNewWish({ label: '', amount: '', category: 'plaisir', dueDate: '', monthlySaving: '', type: 'shared' });
        setShowAddWish(false);
    };

    const { updateWishlistItem } = useWishlist();

    const [newProductUrl, setNewProductUrl] = useState('');
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const handleAddSavingsToWish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWishForSaving || !savingAmount) return;
        const amount = parseFloat(savingAmount);
        const nextSavings = (selectedWishForSaving.currentSavings || 0) + amount;

        await updateWishlistItem(selectedWishForSaving.id, { currentSavings: nextSavings });

        // Also create an expense for this saving
        const splitType = selectedWishForSaving.type === 'personal' ? 'individual' : 'equal';
        await addExpense(`Épargne : ${selectedWishForSaving.label}`, amount, 'autre', splitType, user?.uid, "Mis de côté pour un achat futur");

        setSavingAmount('');
        setSelectedWishForSaving(null);
    };



    const handleAddProductToWish = async (wishId: string, url: string) => {
        const item = wishlist.find(w => w.id === wishId);
        if (!item) return;

        setIsSearching(true);
        try {
            const result = await fetchProductPrice(url);
            const products = item.trackedProducts || [];
            const newProduct: TrackedProduct = {
                id: Math.random().toString(36).substr(2, 9),
                url: result.url || url,
                name: result.name,
                currentPrice: result.price,
                merchant: result.merchant,
                lastChecked: new Date().toISOString(),
                priceHistory: [{ price: result.price, date: new Date().toISOString() }]
            };
            await updateWishlistItem(wishId, { trackedProducts: [...products, newProduct] });
        } catch (err) {
            console.error(err);
            const products = item.trackedProducts || [];
            const newProduct: TrackedProduct = {
                id: Math.random().toString(36).substr(2, 9),
                url,
                name: url.startsWith('http') ? url.split('/').pop() || url : url,
                priceHistory: []
            };
            await updateWishlistItem(wishId, { trackedProducts: [...products, newProduct] });
        } finally {
            setIsSearching(false);
        }
    };

    const handleRemoveProductFromWish = async (wishId: string, productId: string) => {
        const item = wishlist.find(w => w.id === wishId);
        if (!item) return;
        const products = (item.trackedProducts || []).filter(p => p.id !== productId);
        await updateWishlistItem(wishId, { trackedProducts: products });
    };



    const handleRefreshPricesForWish = async (wishId: string) => {
        const item = wishlist.find(w => w.id === wishId);
        if (!item || !item.trackedProducts?.length) return;

        setIsSearching(true);
        try {
            const nextProducts = [...item.trackedProducts];
            for (let i = 0; i < nextProducts.length; i++) {
                try {
                    const result = await fetchProductPrice(nextProducts[i].url);
                    const history = nextProducts[i].priceHistory || [];

                    if (!nextProducts[i].lowestPrice || result.price < nextProducts[i].lowestPrice!) {
                        nextProducts[i].lowestPrice = result.price;
                    }

                    nextProducts[i] = {
                        ...nextProducts[i],
                        currentPrice: result.price,
                        merchant: result.merchant,
                        lastChecked: new Date().toISOString(),
                        priceHistory: [...history, { price: result.price, date: new Date().toISOString() }].slice(-10)
                    };
                } catch (e) { console.error(`Failed to update ${nextProducts[i].name}`, e); }
            }
            await updateWishlistItem(wishId, { trackedProducts: nextProducts });
        } finally {
            setIsSearching(false);
        }
    };



    const [configModal, setConfigModal] = useState<{ itemId: number | null, type: 'fixedCharges' | 'reserves', data?: any } | null>(null);
    const [showGlobalEnvelope, setShowGlobalEnvelope] = useState(false);
    const [isSynthesisExpanded, setIsSynthesisExpanded] = useState(false);

    // --- HOUSEHOLD CONTRIBUTION & ENVELOPE LOGIC ---
    const calculateHouseholdNeeds = () => {
        if (!household || !user) return { jointNeeds: {}, memberDebts: {}, jointPaid: {}, memberPaid: {}, envelope: { total: 0, items: [] } };

        const monthKey = format(selectedMonth, "yyyy-MM");
        const jointNeeds: Record<string, number> = {}; // uid -> amount to transfer to joint
        const memberDebts: Record<string, Record<string, number>> = {}; // debtor -> creditor -> amount
        const jointPaid: Record<string, number> = {};
        const memberPaid: Record<string, Record<string, number>> = {};
        const envelopeItems: any[] = [];
        let envelopeTotal = 0;

        // 1. Collect all monthly valid items (Fixed Charges, Reserves, Wishlist Savings)
        const allItems = [
            ...(household.budgetConfig?.fixedCharges || []).map(c => getEffectiveSubscription(c, selectedMonth)).filter(c => !c.isDeleted),
            ...(household.budgetConfig?.reserves || []),
            ...wishlist.filter(w => (w.monthlySaving || 0) > 0 && (w.type === 'shared' || w.createdBy === user.uid)).map(w => ({
                label: w.label,
                amount: w.monthlySaving || 0,
                splitType: (w.type === 'personal' ? 'individual' : 'equal') as any,
                paidBy: w.type === 'personal' ? w.createdBy : 'joint',
                type: w.type as any,
                frequency: 'monthly' as const,
                dueDate: null,
                dueDay: undefined,
                dayOfMonth: null,
                isWishlist: true,
                wishId: w.id
            }))
        ].filter(item => item.type !== 'personal' || item.paidBy === user.uid);

        allItems.forEach(item => {
            // Filter by date/frequency logic
            if (item.frequency === 'yearly') {
                let isValidMonth = false;
                if (item.dueDate) {
                    isValidMonth = true;
                } else {
                    if (item.dueMonth) isValidMonth = item.dueMonth === (selectedMonth.getMonth() + 1);
                    else isValidMonth = true;
                }
            }

            // Calculate Monthly Amount
            let monthlyAmount = item.amount;
            if (item.frequency === 'yearly') {
                if (item.dueDate) {
                    const target = parseISO(item.dueDate);
                    const monthsLeft = differenceInCalendarMonths(target, selectedMonth) + 1;
                    if (monthsLeft > 0) monthlyAmount = item.amount / monthsLeft;
                    else monthlyAmount = 0; // Overdue or done
                } else {
                    monthlyAmount = item.amount / 12;
                }
            }

            // Skip invalid amounts
            if (monthlyAmount <= 0) return;

            const isAlreadyAnExpense = actualExpenseLabels.has(item.label.toLowerCase().trim());

            // Add to Envelope (Validation List) if NOT done for ME
            const isDoneForMe = household.budgetConfig?.budgetCompletions?.[`${item.label}-${monthKey}-${user.uid}`] || isAlreadyAnExpense;
            const myShare = calculateShareForUser(monthlyAmount, item.splitType || 'equal', user.uid, item.paidBy, undefined, item.customShares);

            if (!isDoneForMe && myShare > 0) {
                envelopeItems.push({ ...item, monthlyAmount: myShare, key: `${item.label}-${monthKey}-${user.uid}` });
                envelopeTotal += myShare;
            }

            // Logic: Who owes whom for BUDGETED items
            // IF it's already an expense, we skip Step 1 logic to avoid double-counting 
            // the money flow (which will be handled by the actual Expense in Step 2)
            if (isAlreadyAnExpense) return;

            household.members.forEach(memberUid => {
                const share = calculateShareForUser(monthlyAmount, item.splitType || 'equal', memberUid, item.paidBy, undefined, item.customShares);
                if (share <= 0) return;

                const memberIsDone = household.budgetConfig?.budgetCompletions?.[`${item.label}-${monthKey}-${memberUid}`] || isAlreadyAnExpense;

                if (memberIsDone) {
                    // Already Paid / Done
                    if (item.paidBy === 'joint' || !item.paidBy) {
                        jointPaid[memberUid] = (jointPaid[memberUid] || 0) + share;
                    } else if (item.paidBy !== memberUid) {
                        if (!memberPaid[memberUid]) memberPaid[memberUid] = {};
                        memberPaid[memberUid][item.paidBy] = (memberPaid[memberUid][item.paidBy] || 0) + share;
                    }
                } else {
                    // Remaining to be Paid
                    if (item.paidBy === 'joint' || !item.paidBy) {
                        jointNeeds[memberUid] = (jointNeeds[memberUid] || 0) + share;
                    } else if (item.paidBy !== memberUid) {
                        if (!memberDebts[memberUid]) memberDebts[memberUid] = {};
                        memberDebts[memberUid][item.paidBy] = (memberDebts[memberUid][item.paidBy] || 0) + share;
                    }
                }
            });
        });

        // 2. Process Actual Expenses (Current Month + Unsettled Past)
        const allExpensesToProcess = [...expenses, ...unsettledExpenses];

        allExpensesToProcess.forEach(ex => {
            if (ex.isSettled) return;

            const exDate = safeDate(ex.date);

            household.members.forEach(memberUid => {
                const share = calculateShareForUser(ex.amount, ex.splitType || 'equal', memberUid, ex.paidBy, exDate, ex.customShares);

                const totalRepaid = Array.isArray(ex.repayments)
                    ? ex.repayments.filter((r: any) => r.uid === memberUid).reduce((sum: number, r: any) => sum + r.amount, 0)
                    : 0;

                const repaidThisMonth = Array.isArray(ex.repayments)
                    ? ex.repayments.filter((r: any) => r.uid === memberUid && isSameMonth(safeDate(r.date), selectedMonth)).reduce((sum: number, r: any) => sum + r.amount, 0)
                    : 0;

                const remaining = share - totalRepaid;

                // Track Remaining (Needs)
                if (remaining > 0.5) {
                    if (ex.paidByJoint || ex.paidBy === 'joint') {
                        jointNeeds[memberUid] = (jointNeeds[memberUid] || 0) + remaining;
                    } else if (ex.paidBy && ex.paidBy !== memberUid) {
                        if (!memberDebts[memberUid]) memberDebts[memberUid] = {};
                        memberDebts[memberUid][ex.paidBy] = (memberDebts[memberUid][ex.paidBy] || 0) + remaining;
                    }
                }

                // Track Repaid (Paid) - ONLY counts acts of payment done THIS MONTH
                if (repaidThisMonth > 0) {
                    if (ex.paidByJoint || ex.paidBy === 'joint') {
                        jointPaid[memberUid] = (jointPaid[memberUid] || 0) + repaidThisMonth;
                    } else if (ex.paidBy && ex.paidBy !== memberUid) {
                        if (!memberPaid[memberUid]) memberPaid[memberUid] = {};
                        memberPaid[memberUid][ex.paidBy] = (memberPaid[memberUid][ex.paidBy] || 0) + repaidThisMonth;
                    }
                }
            });
        });

        return { jointNeeds, memberDebts, jointPaid, memberPaid, envelope: { total: envelopeTotal, items: envelopeItems } };
    };

    const householdNeeds = calculateHouseholdNeeds();
    const myTotalDue = Math.round(
        (householdNeeds.jointNeeds[user?.uid || ''] || 0) +
        Object.values(householdNeeds.memberDebts[user?.uid || ''] || {}).reduce((a, b: any) => a + b, 0)
    );

    const handleBulkValidate = async () => {
        if (!household || !householdNeeds.envelope.items.length) return;
        const updates: Record<string, boolean> = { ...(household.budgetConfig?.budgetCompletions || {}) };

        householdNeeds.envelope.items.forEach(item => {
            updates[item.key] = true;
        });

        await updateBudgetConfig({ ...household.budgetConfig, budgetCompletions: updates } as any);
        setShowGlobalEnvelope(false);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 relative transition-colors font-sans">
            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Finance & Budget"
                description="Suivez vos dépenses, gérez vos charges et projetez vos économies."
                accentColor="emerald"
                items={[
                    { title: "Saisie Unifiée", description: "Ajoutez dépenses et abonnements via le même bouton (+).", icon: Rocket, color: "violet" },
                    { title: "Abos & Services", description: "Loyer, EDF, Netflix... Gérez tout ce qui tombe chaque mois.", icon: CreditCard, color: "blue" },
                    { title: "Synthèse Foyer", description: "Cliquez sur un montant pour voir le détail des dettes et régler vos parts.", icon: Scale, color: "orange" },
                    { title: "Épargne & Projets", description: "Mettez de côté pour vos projets. Vos réserves sont isolées du reste à vivre.", icon: PiggyBank, color: "emerald" }
                ]}
                tips={[
                    "Le reste à vivre (Moi) déduit vos charges prévues même si elles ne sont pas encore payées.",
                    "Utilisez la répartition 'Perso (%)' pour définir des partages précis par membre.",
                    "Vous pouvez régler une charge fixe directement depuis le détail d'une dette dans la synthèse."
                ]}
            />

            <header className="bg-slate-900 text-white pt-6 pb-20 px-6 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500 rounded-full blur-[120px] opacity-20 transform translate-x-32 -translate-y-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-10 transform -translate-x-10 translate-y-10" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <img src="/logo.png" alt="" className="w-4 h-4 rounded-full" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">LifeSync Finance</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black">{format(selectedMonth, "MMMM yyyy", { locale: fr })}</h1>
                                <button onClick={() => setShowHelp(true)} className="text-white/30 hover:text-emerald-400 transition-colors">
                                    <HelpCircle size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                            <button onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronLeft size={18} /></button>
                            <button onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronRight size={18} /></button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-black">Reste à vivre (Moi)</p>
                        <motion.div key={myRemaining} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                            <div className="flex items-baseline">
                                <span className={cn("text-7xl font-[1000] tracking-tighter", myRemaining < 0 ? "text-red-400" : "text-white")}>
                                    {Math.round(myRemaining)}
                                </span>
                                <span className="text-3xl font-black text-slate-500 ml-2">€</span>
                            </div>
                            {Math.round(myRemaining) !== Math.round(myEstimatedRemaining) && (
                                <p className="text-[11px] font-black text-slate-500 mt-1 uppercase tracking-wider">
                                    Est. final : <span className={myEstimatedRemaining < 0 ? "text-red-400/80" : "text-white/60"}>{Math.round(myEstimatedRemaining)}€</span>
                                </p>
                            )}
                        </motion.div>
                    </div>

                    <div className="flex justify-around mt-8 bg-white/5 border border-white/5 p-4 rounded-[2.5rem] backdrop-blur-md">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Entrées (Moi)</p>
                            <p className="text-lg font-black text-emerald-400">+{myTotalIncome}€</p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Dépensé (Moi)</p>
                            <p className="text-lg font-black text-red-400">-{myTotalSpent}€</p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Épargné (Moi)</p>
                            <p className="text-lg font-black text-blue-400">+{myWishlistSavingsShare + myReservesShare}€</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="px-6 -mt-10 relative z-20">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-xl flex flex-wrap gap-1 border border-slate-100 dark:border-slate-800">
                    <button onClick={() => setActiveTab('budget')} className={cn("flex-1 min-w-[30%] px-4 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'budget' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>Dépenses</button>
                    <button onClick={() => setActiveTab('analyses')} className={cn("flex-1 min-w-[30%] px-4 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'analyses' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>Analyses</button>
                    <button onClick={() => setActiveTab('abonnements')} className={cn("flex-1 min-w-[30%] px-4 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'abonnements' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>Abos et charges fixes</button>
                    <button onClick={() => setActiveTab('épargne')} className={cn("flex-1 min-w-[30%] px-4 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'épargne' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>Épargne</button>
                    <button onClick={() => setActiveTab('revenus')} className={cn("flex-1 min-w-[30%] px-4 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'revenus' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>Revenus</button>
                    <button onClick={() => setActiveTab('wishlist')} className={cn("flex-1 min-w-[30%] px-4 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'wishlist' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>Prévu</button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* SYNTHÈSE FOYER (Collapsible) */}
                <div className="bg-slate-900 dark:bg-slate-800 rounded-[2rem] p-5 text-white shadow-xl mb-4 relative overflow-hidden transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-20 transform translate-x-10 -translate-y-10" />

                    <div
                        onClick={() => setIsSynthesisExpanded(!isSynthesisExpanded)}
                        className="flex justify-between items-center relative z-10 cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl bg-white/5 transition-colors", isSynthesisExpanded ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 group-hover:text-emerald-400")}>
                                <Scale size={18} />
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400 leading-none">Synthèse Foyer</h2>
                                <p className="text-[10px] text-slate-400 font-bold mt-1">
                                    {isSynthesisExpanded ? 'Transferts & Dettes du mois' : `${household?.members.length} membres · ${myTotalDue}€ à régler (Moi)`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isSynthesisExpanded && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowGlobalEnvelope(true); }}
                                    className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border border-white/5"
                                >
                                    <Layers size={14} />
                                </button>
                            )}
                            <div className={cn("p-2 text-slate-500 transition-transform duration-300", isSynthesisExpanded && "rotate-180")}>
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {isSynthesisExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-6 space-y-6 relative z-10">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Détail des transferts</p>
                                        <button
                                            onClick={() => setShowGlobalEnvelope(true)}
                                            className="text-emerald-400 hover:text-emerald-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                                        >
                                            <Layers size={12} /> Enveloppe Globale
                                        </button>
                                    </div>

                                    {household?.memberProfiles?.map(m => {
                                        const jointDebt = Math.round(householdNeeds?.jointNeeds?.[m.uid] || 0);
                                        const jointAlreadyPaid = Math.round(householdNeeds?.jointPaid?.[m.uid] || 0);
                                        const debtsToOthers = householdNeeds?.memberDebts?.[m.uid] || {};

                                        const totalDue = jointDebt + Object.values(debtsToOthers).reduce((a, b) => a + b, 0);

                                        return (
                                            <div key={m.uid} className="flex flex-col gap-2 p-4 bg-white/5 rounded-[1.5rem] border border-white/5">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black uppercase">{m.displayName[0]}</div>
                                                        <span className="font-bold text-sm">{m.displayName}</span>
                                                    </div>
                                                    {totalDue > 0 && (
                                                        <div className="text-right">
                                                            <p className="text-[7px] font-black uppercase text-orange-400 tracking-widest">Total à régler</p>
                                                            <p className="text-sm font-black text-orange-400">{totalDue}€</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    {(jointDebt > 0 || jointAlreadyPaid > 0) && (
                                                        <div className="space-y-2">
                                                            <div
                                                                className={cn(
                                                                    "w-full flex justify-between items-center p-2.5 rounded-xl border transition-all",
                                                                    jointDebt > 0 ? "bg-slate-900 dark:bg-white/10 border-slate-800 dark:border-white/10 text-white" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                                                )}
                                                            >
                                                                <div
                                                                    onClick={() => setDebtDetailUid(debtDetailUid === `joint-${m.uid}` ? null : `joint-${m.uid}`)}
                                                                    className="flex items-center gap-2 cursor-pointer flex-1"
                                                                >
                                                                    <Landmark size={12} className={jointDebt > 0 ? "text-slate-400" : "text-emerald-400"} />
                                                                    <span className={cn("text-[10px] font-bold", jointDebt > 0 ? "text-slate-300" : "text-emerald-200")}>
                                                                        {jointDebt > 0 ? "Vers Compte Commun" : "Part commune réglée"}
                                                                    </span>
                                                                    <ChevronDown size={10} className={cn("transition-transform", debtDetailUid === `joint-${m.uid}` && "rotate-180")} />
                                                                </div>
                                                                <div className="text-right leading-none">
                                                                    <span className={cn("font-black text-xs", jointDebt > 0 ? "text-white" : "text-emerald-300")}>
                                                                        {jointDebt > 0 ? `${jointDebt}€` : `${jointAlreadyPaid}€`}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {debtDetailUid === `joint-${m.uid}` && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="pl-4 border-l-2 border-white/5 space-y-2 pb-2 mt-2">
                                                                            {(() => {
                                                                                const currentMonthExpenseLabels = new Set(expenses.map(e => e.label.toLowerCase().trim()));
                                                                                const allItems = [
                                                                                    ...[
                                                                                        ...expenses,
                                                                                        ...unsettledExpenses
                                                                                    ].filter(ex => {
                                                                                        if (ex.isSettled) return false;
                                                                                        return (ex.paidByJoint || ex.paidBy === 'joint');
                                                                                    }).map(ex => ({ ...ex, isExpense: true, isBudgeted: false })),
                                                                                    ...[
                                                                                        ...(household?.budgetConfig?.fixedCharges || []).map(c => getEffectiveSubscription(c, selectedMonth)).filter(c => !c.isDeleted).map(c => ({ ...c, amount: c.frequency === 'yearly' ? c.amount / 12 : c.amount })),
                                                                                        ...(household?.budgetConfig?.reserves || []),
                                                                                        ...wishlist.filter(w => (w.monthlySaving || 0) > 0 && (w.type === 'shared' || w.createdBy === m.uid)).map(w => ({
                                                                                            label: w.label,
                                                                                            amount: w.monthlySaving || 0,
                                                                                            splitType: (w.type === 'personal' ? 'individual' : 'equal') as any,
                                                                                            paidBy: w.type === 'personal' ? w.createdBy : 'joint',
                                                                                            isWishlist: true
                                                                                        }))
                                                                                    ].filter(item => {
                                                                                        // Allow Joint expenses OR Shared expenses paid by THIS user (Visual contribution)
                                                                                        const isToJoint = item.paidBy === 'joint' || !item.paidBy || (item.paidBy === m.uid && item.type !== 'personal');
                                                                                        if (!isToJoint) return false;
                                                                                        const share = calculateShareForUser(item.amount, (item.splitType as any) || 'equal', m.uid, item.paidBy || 'joint', selectedMonth, item.customShares);

                                                                                        // Only hide if the matching expense is ALSO 'Joint Paid' (would appear in this list)
                                                                                        // If it's paid by a User, it won't appear here as an Expense, so we keep the Budget item (strikethrough)
                                                                                        const matchingExpense = expenses.find(e => e.label.toLowerCase().trim() === item.label.toLowerCase().trim());
                                                                                        const isConvertedToJointExpense = matchingExpense && (matchingExpense.paidByJoint || matchingExpense.paidBy === 'joint');

                                                                                        return !isConvertedToJointExpense && share > 0.5;
                                                                                    }).map(item => ({ ...item, isBudgeted: true, isExpense: false, id: `budget-${item.label}`, date: selectedMonth }))
                                                                                ].reduce((acc: any[], item) => {
                                                                                    if (!acc.find(i => i.id === item.id)) acc.push(item);
                                                                                    return acc;
                                                                                }, []).sort((a, b) => safeDate((b as any).date).getTime() - safeDate((a as any).date).getTime());

                                                                                const currentItems = allItems.filter(i => i.isBudgeted || isSameMonth(safeDate(i.date), selectedMonth));
                                                                                const pastItems = allItems.filter(i => !i.isBudgeted && !isSameMonth(safeDate(i.date), selectedMonth));

                                                                                return (
                                                                                    <>
                                                                                        {currentItems.map(item => renderItem(item, m))}
                                                                                        {pastItems.length > 0 && (
                                                                                            <>
                                                                                                <div className="flex items-center gap-2 py-2">
                                                                                                    <div className="h-px bg-white/10 flex-1" />
                                                                                                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Anciens / Retards</span>
                                                                                                    <div className="h-px bg-white/10 flex-1" />
                                                                                                </div>
                                                                                                {pastItems.map(item => renderItem(item, m))}
                                                                                            </>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}

                                                    {Object.entries(debtsToOthers).map(([creditorUid, amount]) => {
                                                        const creditorName = household.memberProfiles?.find(p => p.uid === creditorUid)?.displayName || 'Autre';
                                                        const isDetailed = debtDetailUid === `${m.uid}-${creditorUid}`;

                                                        // Get specific items contributing to this debt (Expenses + Budgeted)
                                                        const relevantItems = [
                                                            ...Array.from(new Map([...expenses, ...unsettledExpenses].map(ex => [ex.id, ex])).values()).filter(ex => {
                                                                if (ex.isSettled) return false;
                                                                if (ex.paidByJoint || ex.paidBy === 'joint') return false;
                                                                if (ex.paidBy !== creditorUid) return false;
                                                                const share = calculateShareForUser(ex.amount, (ex.splitType as any) || 'equal', m.uid, ex.paidBy, safeDate(ex.date), ex.customShares);
                                                                const repaid = Array.isArray(ex.repayments)
                                                                    ? ex.repayments.filter((r: any) => r.uid === m.uid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                                                    : 0;
                                                                return (share - repaid) > 0.5;
                                                            }).map(ex => ({ ...ex, isExpense: true })),
                                                            ...[
                                                                ...(household?.budgetConfig?.fixedCharges || []),
                                                                ...(household?.budgetConfig?.reserves || [])
                                                            ].filter(item => {
                                                                if (item.paidBy !== creditorUid) return false;
                                                                const share = calculateShareForUser(item.amount, (item.splitType as any) || 'equal', m.uid, item.paidBy, selectedMonth, item.customShares);
                                                                const isConverted = actualExpenseLabels.has(item.label.toLowerCase().trim());
                                                                // Show even if Done, just mark as paid in renderItem. Only hide if Converted to Expense.
                                                                return !isConverted && share > 0.5;
                                                            }).map(item => ({ ...item, isBudgeted: true, id: `budget-${item.label}`, date: new Date() }))
                                                        ].sort((a, b) => safeDate((b as any).date).getTime() - safeDate((a as any).date).getTime());

                                                        return (
                                                            <div key={creditorUid} className="space-y-2">
                                                                <div
                                                                    className="w-full flex justify-between items-center bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20 text-orange-200"
                                                                >
                                                                    <div
                                                                        onClick={() => setDebtDetailUid(isDetailed ? null : `${m.uid}-${creditorUid}`)}
                                                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                                                    >
                                                                        <UserMinus size={12} className="text-orange-400" />
                                                                        <span className="text-[10px] font-bold">Doit à {creditorName}</span>
                                                                        <ChevronDown size={10} className={cn("transition-transform", isDetailed && "rotate-180")} />
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="font-black text-xs">{Math.round(amount)}€</span>
                                                                        {m.uid === user?.uid && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    // Find the first relevant expense to use as a label for the modal
                                                                                    setRepaymentTarget({
                                                                                        expenseId: 'global',
                                                                                        expenseIds: (relevantItems as any[]).filter(e => !e.isBudgeted).map(e => e.id),
                                                                                        amount: amount,
                                                                                        label: `Dette à ${creditorName}`,
                                                                                        memberUid: m.uid,
                                                                                        creditorUid
                                                                                    });
                                                                                    setRepaymentAmount(amount.toFixed(0));
                                                                                }}
                                                                                className="px-2 py-1 bg-orange-400 text-slate-900 text-[8px] font-black rounded uppercase hover:bg-orange-300 active:scale-95 transition-all"
                                                                            >
                                                                                Régler
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <AnimatePresence>
                                                                    {isDetailed && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <div className="pl-4 border-l-2 border-orange-500/20 space-y-2 pb-2">
                                                                                {(() => {
                                                                                    const currentMonthExpenseLabels = new Set(expenses.map(e => e.label.toLowerCase().trim()));
                                                                                    const relevantItems = [
                                                                                        ...[...expenses, ...unsettledExpenses].filter(ex => {
                                                                                            if (ex.isSettled) return false;
                                                                                            if (ex.paidBy !== creditorUid) return false;
                                                                                            const share = calculateShareForUser(ex.amount, ex.splitType || 'equal', m.uid, ex.paidBy, safeDate(ex.date), ex.customShares);
                                                                                            const repaid = Array.isArray(ex.repayments)
                                                                                                ? ex.repayments.filter((r: any) => r.uid === m.uid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                                                                                : 0;
                                                                                            return (share - repaid) > 0.5;
                                                                                        }).map(ex => ({ ...ex, isExpense: true })),
                                                                                        ...[
                                                                                            ...(household?.budgetConfig?.fixedCharges || []).map(c => getEffectiveSubscription(c, selectedMonth)).filter(c => !c.isDeleted).map(c => ({ ...c, amount: c.frequency === 'yearly' ? c.amount / 12 : c.amount })),
                                                                                            ...(household?.budgetConfig?.reserves || [])
                                                                                        ].filter(item => {
                                                                                            if (item.paidBy !== creditorUid) return false;
                                                                                            const share = calculateShareForUser(item.amount, (item.splitType as any) || 'equal', m.uid, item.paidBy, selectedMonth, item.customShares);
                                                                                            const isConverted = currentMonthExpenseLabels.has(item.label.toLowerCase().trim());
                                                                                            // Show even if Done, just mark as paid in renderItem. Only hide if Converted to Expense.
                                                                                            return !isConverted && share > 0.5;
                                                                                        }).map(item => ({ ...item, isBudgeted: true, id: `budget-${item.label}`, date: selectedMonth }))
                                                                                    ].reduce((acc: any[], item) => { if (!acc.find(i => i.id === item.id)) acc.push(item); return acc; }, []).sort((a, b) => safeDate((b as any).date).getTime() - safeDate((a as any).date).getTime());

                                                                                    const currentItems = relevantItems.filter(i => i.isBudgeted || isSameMonth(safeDate((i as any).date), selectedMonth));
                                                                                    const pastItems = relevantItems.filter(i => !(i as any).isBudgeted && !isSameMonth(safeDate((i as any).date), selectedMonth));

                                                                                    return (
                                                                                        <>
                                                                                            {currentItems.map((item: any) => renderItem(item, m))}
                                                                                            {pastItems.length > 0 && (
                                                                                                <>
                                                                                                    <div className="flex items-center gap-2 py-2">
                                                                                                        <div className="h-px bg-orange-500/10 flex-1" />
                                                                                                        <span className="text-[8px] font-black uppercase text-orange-500/50 tracking-widest">Anciennes Dettes</span>
                                                                                                        <div className="h-px bg-orange-500/10 flex-1" />
                                                                                                    </div>
                                                                                                    {pastItems.map((item: any) => renderItem(item, m))}
                                                                                                </>
                                                                                            )}
                                                                                            {relevantItems.length === 0 && (
                                                                                                <p className="text-[8px] text-slate-500 italic p-2">Dépôts ou transferts directs non calculés ici.</p>
                                                                                            )}
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'budget' && (
                        <motion.div key="budget" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

                            <div className="flex justify-between items-center px-2">
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dépenses du mois</h2>
                                <button onClick={() => setShowAdd(true)} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg shadow-slate-900/20 active:scale-95 transition-all"><Plus size={20} /></button>
                            </div>

                            {/* DETTES PRÉCÉDENTES (ROLLOVER) */}
                            {unsettledExpenses.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-8">
                                    <div className="flex justify-between items-center px-1">
                                        <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                                            <History size={14} /> Dettes Précédentes
                                        </h2>
                                    </div>
                                    <div className="space-y-3">
                                        {unsettledExpenses.filter(item => {
                                            const myShare = calculateShareForUser(item.amount, item.splitType || 'equal', user?.uid || '', item.paidBy);
                                            const myRepaid = Array.isArray(item.repayments)
                                                ? item.repayments.filter((r: any) => r.uid === user?.uid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                                : 0;
                                            const myRemainingDebt = Math.max(0, myShare - myRepaid);

                                            // Show if I owe > 0.5
                                            if (myRemainingDebt > 0.5 && item.paidBy !== user?.uid) return true;

                                            // Show if I am the payer and someone else owes me > 0.5 total
                                            if (item.paidBy === user?.uid) {
                                                const totalSharedShare = (household?.members || [])
                                                    .filter(m => m !== user?.uid)
                                                    .reduce((acc, m) => acc + calculateShareForUser(item.amount, (item.splitType as any) || 'equal', m, user?.uid || ''), 0);
                                                const totalRepaidToMe = Array.isArray(item.repayments)
                                                    ? item.repayments.filter((r: any) => r.uid !== user?.uid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                                    : 0;
                                                if (totalSharedShare - totalRepaidToMe > 0.5) return true;
                                            }

                                            return false;
                                        }).map(item => {
                                            const myShare = calculateShareForUser(item.amount, (item.splitType as any) || 'equal', user?.uid || '', item.paidBy);
                                            const myRepaid = Array.isArray(item.repayments)
                                                ? item.repayments.filter((r: any) => r.uid === user?.uid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                                : 0;
                                            const myRemainingDebt = Math.max(0, myShare - myRepaid);
                                            const isMyDebt = myRemainingDebt > 0 && item.paidBy !== user?.uid;

                                            // Show if I have a remaining debt on this item
                                            // OR if I am the payer and someone else owes me (not fully paid back) ??? 
                                            // User request: "purchases paid by one not fully refunded by other should transfer".
                                            // The item is "unsettled" so it appears for everyone.
                                            // We can filter display to only show if relevant to ME? 
                                            // Let's show all for now, as transparency is good.

                                            return (
                                                <div key={item.id} className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 group relative">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-xs dark:text-white mb-0.5">{item.label}{item.type === 'personal' && ' (Perso)'}</p>
                                                            <p className="text-[9px] font-bold text-orange-400 uppercase">{format(safeDate(item.date), "dd MMM yyyy")}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-xs dark:text-white">{item.amount.toFixed(2)}€</p>
                                                            {isMyDebt && <p className="text-[9px] font-bold text-red-500">Reste à payer: {myRemainingDebt.toFixed(2)}€</p>}
                                                        </div>
                                                    </div>

                                                    {/* Repayment Action */}
                                                    {isMyDebt && (
                                                        <div className="flex gap-2 mt-3">
                                                            <button
                                                                onClick={() => {
                                                                    setRepaymentTarget({ expenseId: item.id, amount: myRemainingDebt, label: item.label, memberUid: user?.uid || '' });
                                                                    setRepaymentAmount(myRemainingDebt.toFixed(1));
                                                                }}
                                                                className="flex-1 py-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 rounded-xl text-[10px] font-black uppercase"
                                                            >
                                                                Rembourser
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Settlement Action (Only Payer) */}
                                                    {item.paidBy === user?.uid && (
                                                        <button
                                                            onClick={() => settleExpense(item.id)}
                                                            className="w-full mt-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle2 size={12} /> Marquer comme Soldé
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* DÉPENSES DU MOIS */}
                            <div className="space-y-4">
                                {(() => {
                                    const BILL_CAT_IDS = ['facture', 'internet', 'eau', 'elec', 'streaming', 'assurance', 'tel'];

                                    // Separate bills and regular categories
                                    const billItems: Expense[] = [];
                                    const regularGroups: Record<string, Expense[]> = {};

                                    const allItemsForList = [
                                        ...visibleExpenses,
                                        ...(household?.budgetConfig?.fixedCharges || [])
                                            .filter((item: any) => item.type !== 'personal' || item.paidBy === user?.uid)
                                            .map((item: any) => ({
                                                id: `fixed-${item.label}`,
                                                label: item.label,
                                                amount: item.frequency === 'yearly' ? item.amount / 12 : item.amount,
                                                category: item.category || 'facture',
                                                date: selectedMonth,
                                                type: item.type || 'shared',
                                                splitType: item.splitType || 'equal',
                                                paidBy: item.paidBy || 'joint',
                                                isVirtual: true
                                            } as any)),
                                        ...(household?.budgetConfig?.reserves || [])
                                            .filter((item: any) => item.type !== 'personal' || item.paidBy === user?.uid)
                                            .map((item: any) => ({
                                                id: `reserve-${item.label}`,
                                                label: item.label,
                                                amount: item.amount,
                                                category: item.category || 'autre',
                                                date: selectedMonth,
                                                type: item.type || 'shared',
                                                splitType: item.splitType || 'equal',
                                                paidBy: item.paidBy || 'joint',
                                                isVirtual: true
                                            } as any))
                                    ];

                                    allItemsForList.forEach(item => {
                                        if (BILL_CAT_IDS.includes(item.category)) {
                                            billItems.push(item);
                                        } else {
                                            if (!regularGroups[item.category]) regularGroups[item.category] = [];
                                            regularGroups[item.category].push(item);
                                        }
                                    });

                                    const renderGroup = (title: string, items: Expense[], icon?: any, color?: string, itemsCount?: number) => {
                                        if (items.length === 0) return null;
                                        const total = items.reduce((sum, item) => sum + item.amount, 0);

                                        return (
                                            <div key={title} className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-3 mb-4">
                                                    {icon && (
                                                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg", ALL_CATEGORIES.find(c => c.label === title)?.solidColor || "bg-indigo-500")}>
                                                            {(() => { const Icon = icon; return <Icon size={18} />; })()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">{title}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400">{itemsCount || items.length} dépense{(itemsCount || items.length) > 1 ? 's' : ''}</p>
                                                    </div>
                                                    <span className="font-black text-slate-800 dark:text-white">{total.toFixed(2)}€</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {items.map((item: any) => {
                                                        const myShare = calculateShareForUser(item.amount, item.splitType || 'equal', user?.uid || '', item.paidBy);
                                                        const cat = ALL_CATEGORIES.find(c => c.id === item.category) || CATEGORIES.find(c => c.id === 'facture')!;
                                                        return (
                                                            <div key={item.id} onClick={() => !item.isVirtual && setSelectedExpenseId(item.id)} className={cn("flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors group", !item.isVirtual ? "cursor-pointer" : "opacity-80 grayscale-[0.3]")}>
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", cat.color.replace('text-', 'bg-').replace('100', '500'))}>
                                                                        <cat.icon size={14} className="text-white" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-xs dark:text-white mb-0.5 truncate">{item.label}{item.type === 'personal' && ' (Perso)'}</p>
                                                                        <div className="flex items-center gap-1">
                                                                            {item.paidByJoint && <span className="p-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded"><Landmark size={10} /></span>}
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                                                {item.isVirtual ? (
                                                                                    <span className="text-emerald-500">Prévu (Fixe)</span>
                                                                                ) : (
                                                                                    format(safeDate(item.date), "dd MMM")
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-black text-xs dark:text-white mb-0.5">{item.amount.toFixed(2)}€</p>
                                                                    <p className="text-[9px] font-bold text-emerald-500">Part: {myShare.toFixed(2)}€</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    };

                                    return (
                                        <>
                                            {/* Render Regular Groups in a fixed order */}
                                            {CATEGORIES.filter(c => c.id !== 'facture').map(cat => {
                                                const items = regularGroups[cat.id];
                                                if (!items || items.length === 0) return null;
                                                return renderGroup(cat.label, items, cat.icon, cat.color);
                                            })}

                                            {/* Render Merged Bills Section */}
                                            {billItems.length > 0 && renderGroup("Factures & Abos", billItems, FileText, "bg-orange-100 text-orange-600")}

                                            {/* Render 'Autre' group if it has items not covered by standard CATEGORIES */}
                                            {(() => {
                                                const otherItems = Object.entries(regularGroups)
                                                    .filter(([catId]) => !CATEGORIES.find(c => c.id === catId))
                                                    .flatMap(([, items]) => items);

                                                if (otherItems.length === 0) return null;
                                                return renderGroup("Autres", otherItems, MoreHorizontal, "bg-slate-100 text-slate-600");
                                            })()}
                                        </>
                                    );
                                })()}
                            </div>

                        </motion.div>
                    )}

                    {activeTab === 'épargne' && (
                        <motion.div key="épargne" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <PiggyBank size={14} className="text-emerald-500" /> Objectifs Épargne
                                    </h2>
                                    <button onClick={() => setConfigModal({ itemId: null, type: 'reserves' })} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-emerald-500 hover:text-white transition-all"><Plus size={16} /></button>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        ...(household?.budgetConfig?.reserves || [])
                                            .map((item, i) => ({ ...item, isFromConfig: true, originalIndex: i }))
                                            .filter(item => item.type !== 'personal' || item.paidBy === user?.uid),
                                        ...wishlist.filter(w => (w.monthlySaving || 0) > 0 && (w.type === 'shared' || w.createdBy === user?.uid)).map(w => ({
                                            label: w.label,
                                            amount: w.monthlySaving || 0,
                                            splitType: w.type === 'personal' ? 'individual' : 'equal',
                                            category: w.category || 'autre',
                                            isFromWishlist: true,
                                            wishId: w.id,
                                            wishType: w.type,
                                            type: w.type,
                                            paidBy: w.createdBy,
                                            originalIndex: -1
                                        }))
                                    ].sort((a: any, b: any) => {
                                        const ordA = ALL_CATEGORIES.findIndex(c => c.id === a.category);
                                        const ordB = ALL_CATEGORIES.findIndex(c => c.id === b.category);
                                        if (ordA !== ordB) return (ordA === -1 ? 999 : ordA) - (ordB === -1 ? 999 : ordB);
                                        return a.label.localeCompare(b.label);
                                    }).map((item: any, idx) => {
                                        const isDone = household?.budgetConfig?.budgetCompletions?.[`${item.label}-${monthKey}-${user?.uid}`];
                                        const displaySplitLabel = item.type === 'personal'
                                            ? 'Personnel'
                                            : item.splitType === 'custom' ? 'Perso' : item.splitType === 'rounded' ? 'Prorata' : 'Égal';

                                        return (
                                            <div
                                                key={`reserves-${idx}`}
                                                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group relative active:scale-[0.98] transition-all cursor-pointer hover:border-emerald-500/30"
                                                onClick={() => item.isFromConfig && setConfigModal({ itemId: item.originalIndex, type: 'reserves', data: { ...item } })}
                                            >
                                                <div className="flex gap-4 items-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePaymentStatus(item.label, monthKey);
                                                        }}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0",
                                                            isDone
                                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                                : item.category
                                                                    ? (ALL_CATEGORIES.find(c => c.id === item.category)?.color || "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-300")
                                                                    : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-300"
                                                        )}
                                                    >
                                                        {isDone
                                                            ? <Check size={20} />
                                                            : (() => {
                                                                const Icon = (item.category && ALL_CATEGORIES.find(c => c.id === item.category)?.icon) || PiggyBank;
                                                                return <Icon size={20} />;
                                                            })()
                                                        }
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.label}{item.type === 'personal' && ' (Perso)'}</h3>
                                                            {!item.isFromConfig && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded">Auto</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-400">
                                                                {(() => {
                                                                    if (item.frequency === 'yearly') {
                                                                        if (item.dueDate) {
                                                                            const target = parseISO(item.dueDate);
                                                                            const monthsLeft = differenceInCalendarMonths(target, selectedMonth) + 1;
                                                                            if (monthsLeft > 0) return (item.amount / monthsLeft).toFixed(0);
                                                                        }
                                                                        return (item.amount / 12).toFixed(0);
                                                                    }
                                                                    return item.amount;
                                                                })()}€
                                                                {item.frequency === 'yearly' && (
                                                                    <span className="text-[8px] opacity-60 ml-1">
                                                                        {item.dueDate ? `(/${differenceInCalendarMonths(parseISO(item.dueDate), selectedMonth) + 1})` : '(/12)'}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                            <span className={cn(
                                                                "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                                                item.type === 'personal' ? "bg-blue-50 text-blue-500" : "bg-orange-50 text-orange-500"
                                                            )}>
                                                                {displaySplitLabel}
                                                            </span>
                                                            {item.dayOfMonth && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase">Le {item.dayOfMonth}</span>
                                                                </>
                                                            )}
                                                            {item.dueDate && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Fin : {format(new Date(item.dueDate), "dd/MM")}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.isFromConfig && (
                                                        <ChevronRight size={16} className="text-slate-300" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'revenus' && (
                        <motion.div key="revenus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Landmark size={14} className="text-emerald-500" /> Revenus nets
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {household?.memberProfiles?.map(m => {
                                    const salary = getSalaryForUser(m.uid);
                                    const ratio = getSplitRatio(m.uid);

                                    return (
                                        <div key={m.uid} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase text-slate-400">{m.displayName[0]}</div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">{m.displayName}</h3>
                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Quote-part : {Math.round(ratio * 100)}%</p>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={salary || ''}
                                                        onChange={async (e) => {
                                                            const newVal = parseFloat(e.target.value) || 0;
                                                            await updateMonthlySalary(monthKey, m.uid, newVal);
                                                        }}
                                                        className="w-24 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs font-black text-right pr-6 outline-none dark:text-white ring-2 ring-transparent focus:ring-emerald-500/10 transition-all"
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">€</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'wishlist' && (
                        <motion.div key="wishlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="flex justify-between items-center px-2">
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achats prévus (Foyer)</h2>
                                <button onClick={() => setShowAddWish(true)} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg shadow-slate-900/20 active:scale-95 transition-all"><Plus size={20} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {wishlist.map(item => {
                                    const progress = Math.min(100, ((item.currentSavings || 0) / item.amount) * 100);
                                    return (
                                        <div key={item.id} onClick={() => setSelectedWishId(item.id)} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400", ALL_CATEGORIES.find(c => c.id === item.category)?.color)}>
                                                        {(() => { const Icon = ALL_CATEGORIES.find(c => c.id === item.category)?.icon || MoreHorizontal; return <Icon size={18} />; })()}
                                                    </div>
                                                    <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg dark:text-white">{item.amount}€</span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 dark:text-white text-xs mb-3 truncate">{item.label}{item.type === 'personal' && ' (Perso)'}</h3>
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'analyses' && (
                        <motion.div key="analyses" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                            <BudgetCharts
                                expenses={[
                                    ...(visibleExpenses.map(e => ({
                                        ...e,
                                        isFixed: e.isSubscription || (household?.budgetConfig?.fixedCharges || []).some(fc => fc.label.toLowerCase().trim() === e.label.toLowerCase().trim())
                                    }))),
                                    ...(household?.budgetConfig?.fixedCharges || [])
                                        .map(item => getEffectiveSubscription(item, selectedMonth))
                                        .filter(item => {
                                            if (item.isDeleted) return false;
                                            const isPersonal = item.type === 'personal';
                                            const isMine = item.paidBy === user?.uid;
                                            if (isPersonal && !isMine) return false;

                                            const hasMatchingExpense = visibleExpenses.some(e => e.label.toLowerCase().trim() === item.label.toLowerCase().trim());
                                            return !hasMatchingExpense;
                                        })
                                        .map(item => ({
                                            id: `fixed-${item.label}`,
                                            label: item.label,
                                            amount: item.frequency === 'yearly' ? item.amount / 12 : item.amount,
                                            category: (item.category || 'facture') as any,
                                            date: selectedMonth,
                                            type: item.type || 'shared',
                                            splitType: item.splitType || 'equal',
                                            paidBy: item.paidBy || 'joint',
                                            isFixedCharge: true
                                        } as any)),
                                    ...(household?.budgetConfig?.reserves || [])
                                        .filter(item => item.type !== 'personal' || item.paidBy === user?.uid)
                                        .map(item => ({
                                            id: `reserve-${item.label}`,
                                            label: item.label,
                                            amount: item.amount,
                                            category: (item.category || 'autre') as any,
                                            date: selectedMonth,
                                            type: item.type || 'shared',
                                            splitType: item.splitType || 'equal',
                                            paidBy: item.paidBy || 'joint',
                                        } as any))
                                ]}
                                userUid={user?.uid}
                                household={household}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'abonnements' && (
                        <motion.div key="abonnements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="flex justify-between items-center px-2">
                                <div>
                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abonnements & Services</h2>
                                    <p className="text-[9px] font-bold text-slate-400 italic">Gérez vos prélèvements récurrents.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowAdd(true)} className="p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl shadow-lg active:scale-95 transition-all border border-slate-100 dark:border-slate-700"><Plus size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* PERMANENT CHARGES (From Config) */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1">Services Permanents</h3>
                                    {(household?.budgetConfig?.fixedCharges || []).filter(item => item.type !== 'personal' || item.paidBy === user?.uid).length === 0 ? (
                                        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aucun service permanent</p>
                                        </div>
                                    ) : (
                                        (household?.budgetConfig?.fixedCharges || [])
                                            .map((item, i) => ({ ...getEffectiveSubscription(item, selectedMonth), originalIndex: i }))
                                            .filter(item => !item.isDeleted && (item.type !== 'personal' || item.paidBy === user?.uid))
                                            .map((item: any, idx) => {
                                                const cat = ALL_CATEGORIES.find(c => c.id === item.category) || ALL_CATEGORIES.find(c => c.id === 'facture')!;
                                                const isDone = household?.budgetConfig?.budgetCompletions?.[`${item.label}-${monthKey}-${user?.uid}`];

                                                return (
                                                    <div
                                                        key={`permanent-${idx}`}
                                                        className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
                                                        onClick={() => { setEditingExpenseId(item.originalIndex.toString()); setShowAdd(true); }}
                                                    >
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    togglePaymentStatus(item.label, monthKey);
                                                                }}
                                                                className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all", isDone ? "bg-emerald-500 border-emerald-500 text-white" : cat.color)}
                                                            >
                                                                {isDone ? <Check size={18} /> : <cat.icon size={18} />}
                                                            </button>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-slate-800 dark:text-white truncate text-xs">{item.label}{item.type === 'personal' && ' (Perso)'}</h4>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[9px] font-black text-indigo-500">{item.amount}€ / mois</span>
                                                                    {item.dayOfMonth && <span className="text-[9px] font-bold text-slate-400">Le {item.dayOfMonth}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-slate-300" />
                                                    </div>
                                                );
                                            })
                                    )}
                                </div>

                                {/* ONE-TIME SUBSCRIPTIONS (From list of expenses marked as isSubscription) */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prélèvements du mois</h3>
                                    {visibleExpenses.filter(e => e.isSubscription).length === 0 ? (
                                        <div className="p-10 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aucune dépense recurrente saisie</p>
                                        </div>
                                    ) : (
                                        visibleExpenses.filter(e => e.isSubscription).map(sub => {
                                            const category = ALL_CATEGORIES.find(c => c.id === sub.category) || ALL_CATEGORIES.find(c => c.id === 'facture')!;
                                            return (
                                                <div key={sub.id} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", category.color)}>
                                                            <category.icon size={14} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 dark:text-white leading-tight text-xs">{sub.label}</h4>
                                                            <p className="text-[9px] font-bold text-indigo-500">{sub.amount}€</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => deleteExpense(sub.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {((household?.budgetConfig?.fixedCharges?.length || 0) + visibleExpenses.filter(e => e.isSubscription).length) > 0 && (
                                    <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Total Budget Fixe</p>
                                                <p className="text-3xl font-black">
                                                    {Math.round(
                                                        (household?.budgetConfig?.fixedCharges || [])
                                                            .map(c => getEffectiveSubscription(c, selectedMonth))
                                                            .filter(c => !c.isDeleted)
                                                            .reduce((acc, curr) => acc + (curr.frequency === 'yearly' ? curr.amount / 12 : curr.amount), 0) +
                                                        visibleExpenses.filter(e => e.isSubscription).reduce((acc, curr) => acc + curr.amount, 0)
                                                    )}€
                                                    <span className="text-sm opacity-60 ml-2">/ mois</span>
                                                </p>
                                            </div>
                                            <CreditCard size={32} className="opacity-20" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                    {configModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                                <h3 className="text-lg font-black dark:text-white mb-6">
                                    {configModal.itemId !== null ? 'Modifier' : 'Ajouter'} {configModal.type === 'fixedCharges' ? 'Charge Fixe' : 'Dépense Épargne'}
                                </h3>

                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const newData = {
                                        label: formData.get('label') as string,
                                        amount: parseFloat(formData.get('amount') as string) || 0,
                                        dayOfMonth: formData.get('dayOfMonth') ? parseInt(formData.get('dayOfMonth') as string) : null,
                                        dueDate: (formData.get('dueDate') as string) || null,
                                        frequency: ((configModal.data?.type || 'shared') === 'personal' ? 'monthly' : (configModal.data?.frequency || 'monthly')) as any,
                                        type: (configModal.data?.type || 'shared') as any,
                                        splitType: (configModal.data?.splitType || 'equal') as any,
                                        paidBy: (((configModal.data?.type || 'shared') === 'personal' ? user?.uid : formData.get('paidBy')) || user?.uid) as string,
                                        category: (configModal.data?.category || 'facture') as string,
                                    };

                                    const list = [...(household?.budgetConfig?.[configModal.type] || [])];
                                    if (configModal.itemId !== null) {
                                        // If editing, uncheck the old label if it was checked
                                        if (configModal.data?.label && household?.budgetConfig?.budgetCompletions?.[`${configModal.data.label}-${monthKey}`]) {
                                            togglePaymentStatus(configModal.data.label, monthKey);
                                        }
                                        list[configModal.itemId] = { ...list[configModal.itemId], ...newData };
                                    } else {
                                        list.push(newData as any);
                                    }

                                    // Also ensure the new label is unchecked (in case of rename to an existing checked label or just to be safe)
                                    if (newData.label !== configModal.data?.label && household?.budgetConfig?.budgetCompletions?.[`${newData.label}-${monthKey}`]) {
                                        togglePaymentStatus(newData.label, monthKey);
                                    }

                                    updateBudgetConfig({ ...household?.budgetConfig, [configModal.type]: list } as any);
                                    setConfigModal(null);
                                }} className="space-y-4">
                                    <div className="space-y-6">
                                        {/* Type & Visibility Selector - Top Level Choice */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl flex">
                                            {['personal', 'shared'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setConfigModal(prev => prev ? { ...prev, data: { ...prev.data, type: t as any, frequency: t === 'personal' ? 'monthly' : (prev.data?.frequency || 'monthly'), ...(t === 'personal' ? { splitType: 'individual', paidBy: user?.uid } : {}) } } : null)}
                                                    className={cn(
                                                        "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                                                        (configModal.data?.type || 'shared') === t
                                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    )}
                                                >
                                                    {t === 'personal' ? <UsersIcon size={14} /> : <Home size={14} />}
                                                    {t === 'personal' ? 'Personnel' : 'Foyer'}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Core Details */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Détails</label>
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <input name="label" required defaultValue={configModal.data?.label} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-300" placeholder="Nom..." />
                                                    </div>
                                                    <div className="w-1/3 relative">
                                                        <input name="amount" type="number" step="0.01" required defaultValue={configModal.data?.amount} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-right pr-10" placeholder="0.00" />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-black">€</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Catégorie</label>
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {ALL_CATEGORIES.map(cat => (
                                                        <button
                                                            type="button"
                                                            key={cat.id}
                                                            onClick={() => setConfigModal(prev => prev ? { ...prev, data: { ...prev.data, category: cat.id } } : null)}
                                                            className={cn(
                                                                "p-3 rounded-2xl border flex flex-col items-center gap-2 min-w-[70px] transition-all",
                                                                (configModal.data?.category || (configModal.type === 'fixedCharges' ? 'facture' : 'autre')) === cat.id
                                                                    ? `${cat.color} ring-1 ring-current shadow-sm`
                                                                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            <cat.icon size={18} />
                                                            <span className="text-[9px] font-black uppercase tracking-tighter">{cat.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Timing Section - Grouped */}
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-4 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar size={14} className="text-emerald-500" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planification</span>
                                                </div>

                                                {(configModal.data?.type || 'shared') === 'shared' && (
                                                    <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        {['monthly', 'yearly'].map(f => (
                                                            <label key={f}
                                                                onClick={() => setConfigModal(prev => prev ? { ...prev, data: { ...prev.data, frequency: f as any } } : null)}
                                                                className={cn(
                                                                    "flex-1 py-2 text-center text-[9px] font-black uppercase rounded-lg cursor-pointer transition-all",
                                                                    (configModal.data?.frequency || 'monthly') === f ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                )}>
                                                                <input type="radio" name="frequency" value={f} checked={(configModal.data?.frequency || 'monthly') === f} readOnly className="hidden" />
                                                                {f === 'monthly' ? 'Mensuel' : 'Annuel (Lissé)'}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <label className="block text-[9px] font-bold text-slate-400 mb-1.5 ml-1">Jour du prélèvement</label>
                                                        <div className="relative">
                                                            <input name="dayOfMonth" type="number" min="1" max="31" defaultValue={configModal.data?.dayOfMonth} className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl font-bold dark:text-white outline-none border border-slate-200 dark:border-slate-700/50 focus:border-emerald-500 transition-all text-sm" placeholder="Ex: 5" />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase">du mois</span>
                                                        </div>
                                                    </div>
                                                    {configModal.data?.frequency === 'yearly' && (
                                                        <div className="flex-1">
                                                            <label className="block text-[9px] font-bold text-slate-400 mb-1.5 ml-1">Date butoir</label>
                                                            <input name="dueDate" type="date" defaultValue={configModal.data?.dueDate} className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl font-bold dark:text-white outline-none border border-slate-200 dark:border-slate-700/50 focus:border-emerald-500 transition-all text-sm" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Assignments - Only for Shared */}
                                        {(configModal.data?.type || 'shared') !== 'personal' && (
                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Répartition</label>
                                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                                        {['equal', 'rounded', 'custom', 'individual'].map(st => (
                                                            <label key={st}
                                                                onClick={() => setConfigModal(prev => prev ? { ...prev, data: { ...prev.data, splitType: st } } : null)}
                                                                className={cn(
                                                                    "flex-1 min-w-[60px] py-2 px-1 text-center text-[9px] font-black uppercase rounded-xl cursor-pointer border transition-all whitespace-nowrap",
                                                                    (configModal.data?.splitType || 'equal') === st ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                                                                )}>
                                                                <input type="radio" name="splitType" value={st} checked={(configModal.data?.splitType || 'equal') === st} readOnly className="hidden" />
                                                                {st === 'equal' ? 'Égal' : st === 'rounded' ? 'Prorata' : st === 'custom' ? 'Perso' : 'Indiv.'}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payé par (Défaut)</label>
                                                    <select name="paidBy" defaultValue={configModal.data?.paidBy} className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold dark:text-white outline-none text-xs appearance-none">
                                                        <option value="">Choisir un payeur...</option>
                                                        <option value="joint">Compte Commun</option>
                                                        {household?.memberProfiles?.map(m => (
                                                            <option key={m.uid} value={m.uid}>{m.displayName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button type="button" onClick={() => setConfigModal(null)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Annuler</button>
                                        <button type="submit" className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20">Enregistrer</button>
                                    </div>

                                    {configModal.itemId !== null && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm('Supprimer cet élément ?')) {
                                                    const list = [...(household?.budgetConfig?.[configModal.type] || [])];
                                                    list.splice(configModal.itemId!, 1);
                                                    updateBudgetConfig({ ...household?.budgetConfig, [configModal.type]: list } as any);
                                                    setConfigModal(null);
                                                }
                                            }}
                                            className="w-full mt-2 p-3 text-[9px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={14} /> Supprimer définitivement
                                        </button>
                                    )}
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {/* Add Wish Modal - Updated to remove Personal option */}
                    {showAddWish && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl">
                                <h3 className="text-lg font-black dark:text-white mb-6">Ajouter un souhait (Foyer)</h3>
                                <form onSubmit={handleAddWish} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Titre</label>
                                        <input value={newWish.label} onChange={e => setNewWish(prev => ({ ...prev, label: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Ex: Vacances, PS5..." autoFocus />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Montant</label>
                                            <input type="number" value={newWish.amount} onChange={e => setNewWish(prev => ({ ...prev, amount: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="0 €" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Échéance</label>
                                            <input type="date" value={newWish.dueDate} onChange={e => setNewWish(prev => ({ ...prev, dueDate: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Catégorie</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {CATEGORIES.map(cat => (
                                                <button type="button" key={cat.id} onClick={() => setNewWish(prev => ({ ...prev, category: cat.id }))} className={cn("p-2 rounded-xl border flex flex-col items-center gap-1 min-w-[60px] transition-all", newWish.category === cat.id ? `${cat.color} ring-1 ring-current shadow-sm` : "border-slate-100 text-slate-400")}>
                                                    <cat.icon size={16} />
                                                    <span className="text-[9px] font-black uppercase">{cat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Auto-épargne (Optionnel)</label>
                                            <PiggyBank size={14} className="text-emerald-500" />
                                        </div>
                                        <div className="relative">
                                            <input type="number" value={newWish.monthlySaving} onChange={e => setNewWish(prev => ({ ...prev, monthlySaving: e.target.value }))} className="w-full bg-white dark:bg-slate-900/50 p-2 rounded-lg text-sm font-bold text-emerald-600 dark:text-emerald-400 outline-none border border-emerald-100 placeholder:text-emerald-200" placeholder="Montant / mois" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-300">€/mois</span>
                                        </div>
                                        <p className="text-[9px] font-medium text-emerald-500/70 mt-1.5 leading-tight">Sera automatiquement ajouté à votre budget mensuel dans l&apos;onglet Charges.</p>
                                    </div>

                                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button type="button" onClick={() => setShowAddWish(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Annuler</button>
                                        <button type="submit" className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20">Ajouter (Foyer)</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showAdd && (
                        <TransactionModal
                            isOpen={showAdd}
                            onClose={() => {
                                setShowAdd(false);
                                setEditingExpenseId(null);
                                setNewEx({ ...newEx, label: '', amount: '' });
                            }}
                            initialMode={activeTab === 'abonnements' || (editingExpenseId && expenses.find(e => e.id === editingExpenseId)?.isSubscription) || (editingExpenseId && !isNaN(parseInt(editingExpenseId))) ? 'subscription' : 'expense'}
                            monthDate={selectedMonth}
                            editId={editingExpenseId || undefined}
                            editData={
                                editingExpenseId
                                    ? (expenses.find(e => e.id === editingExpenseId) || household?.budgetConfig?.fixedCharges?.[parseInt(editingExpenseId)])
                                    : (finalizingWishId && newEx.label ? newEx : undefined)
                            }
                            onSuccess={() => {
                                if (finalizingWishId) {
                                    deleteWishlistItem(finalizingWishId);
                                    setFinalizingWishId(null);
                                }
                            }}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {selectedExpense && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", ALL_CATEGORIES.find(c => c.id === selectedExpense.category)?.color)}>
                                        {(() => { const Icon = ALL_CATEGORIES.find(c => c.id === selectedExpense.category)?.icon || MoreHorizontal; return <Icon size={24} />; })()}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setNewEx({
                                                    label: selectedExpense.label,
                                                    amount: selectedExpense.amount.toString(),
                                                    category: selectedExpense.category as any,
                                                    splitType: selectedExpense.splitType as any,
                                                    type: selectedExpense.type || 'shared',
                                                    paidBy: selectedExpense.paidBy,
                                                    description: selectedExpense.description || '',
                                                    projectId: selectedExpense.projectId || '',
                                                    paidByJoint: selectedExpense.paidByJoint || false,
                                                    isSubscription: selectedExpense.isSubscription || false,
                                                    renewsOn: selectedExpense.renewsOn || 1,
                                                    customShares: selectedExpense.customShares || {}
                                                });
                                                setEditingExpenseId(selectedExpense.id);
                                                setSelectedExpenseId(null);
                                                setShowAdd(true);
                                            }}
                                            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-indigo-500 transition-all"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button onClick={() => setSelectedExpenseId(null)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white mb-1">{selectedExpense.label}</h4>
                                <p className="text-3xl font-black text-slate-900 dark:text-white mb-6">-{selectedExpense.amount.toFixed(2)}€</p>
                                <div className="space-y-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                                    <div className="flex justify-between text-xs font-bold font-mono"><span className="text-slate-400">Date</span><span className="text-slate-800 dark:text-white">{format(safeDate(selectedExpense.date), "d MMMM yyyy", { locale: fr })}</span></div>
                                    <div className="flex justify-between text-xs font-bold font-mono">
                                        <span className="text-slate-400">Payeur</span>
                                        <span className="text-slate-800 dark:text-white">
                                            {(selectedExpense.paidBy === 'joint' || selectedExpense.paidByJoint) ? 'Compte Commun' : (household?.memberProfiles?.find(m => m.uid === selectedExpense.paidBy)?.displayName || 'Inconnu')}
                                        </span>
                                    </div>
                                    {household?.members.filter(m => m !== selectedExpense.paidBy).map(memberUid => {
                                        const share = calculateShareForUser(selectedExpense.amount, selectedExpense.splitType, memberUid);
                                        if (share < 1) return null;
                                        const amountRepaid = Array.isArray(selectedExpense.repayments)
                                            ? selectedExpense.repayments.filter((r: any) => r.uid === memberUid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                            : 0;
                                        const isFullyRepaid = amountRepaid >= share;
                                        const profile = household?.memberProfiles?.find(m => m.uid === memberUid);

                                        return (
                                            <div key={memberUid} className="space-y-2">
                                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-black">{profile?.displayName[0]}</div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold dark:text-white leading-tight">{profile?.displayName}</span>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase">{amountRepaid.toFixed(2)}€ / {share.toFixed(2)}€</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-1">
                                                        {!isFullyRepaid && (
                                                            <button
                                                                onClick={() => {
                                                                    const diff = share - amountRepaid;
                                                                    if (diff > 0) addRepayment(selectedExpense.id, diff, memberUid);
                                                                }}
                                                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg text-[8px] font-black uppercase transition-all"
                                                            >
                                                                Tout régler
                                                            </button>
                                                        )}
                                                        {isFullyRepaid && (
                                                            <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase">
                                                                Tout réglé
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {!isFullyRepaid && (
                                                    <div className="px-3 flex items-center gap-2">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase shrink-0">Ajouter un versement</span>
                                                        <button
                                                            onClick={() => {
                                                                const share = calculateTotalShareForUser([selectedExpense], memberUid);
                                                                const amountRepaid = Array.isArray(selectedExpense.repayments)
                                                                    ? selectedExpense.repayments.filter((r: any) => r.uid === memberUid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                                                    : 0;
                                                                const remaining = share - amountRepaid;
                                                                setRepaymentTarget({ expenseId: selectedExpense.id, amount: remaining, label: selectedExpense.label, memberUid });
                                                                setRepaymentAmount(remaining.toFixed(2));
                                                            }}
                                                            className="flex-1 py-1 px-2 bg-slate-100 dark:bg-slate-800/50 text-slate-500 rounded text-[9px] font-bold text-left border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
                                                        >
                                                            Cliquer pour verser...
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}


                                </div>
                                <button onClick={() => { if (confirm('Supprimer cette dépense ?')) { deleteExpense(selectedExpense.id); setSelectedExpenseId(null); } }} className="w-full mt-8 p-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all hover:bg-red-100 transition-colors"><Trash2 size={16} /> Supprimer</button>
                            </motion.div>
                        </div>
                    )}

                    {selectedWish && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", CATEGORIES.find(c => c.id === selectedWish.category)?.color)}>
                                        {(() => { const Icon = CATEGORIES.find(c => c.id === selectedWish.category)?.icon || MoreHorizontal; return <Icon size={24} />; })()}
                                    </div>
                                    <button onClick={() => setSelectedWishId(null)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
                                </div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white mb-1 break-words">{selectedWish.label}</h4>
                                <p className="text-3xl font-black text-slate-900 dark:text-white mb-6">{selectedWish.amount.toFixed(2)}€</p>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                                            <span>Progression Épargne</span>
                                            <span>{Math.round(((selectedWish.currentSavings || 0) / selectedWish.amount) * 100)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, ((selectedWish.currentSavings || 0) / selectedWish.amount) * 100)}%` }}
                                                className="h-full bg-emerald-500"
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 text-center mt-2">{selectedWish.currentSavings || 0}€ mis de côté sur {selectedWish.amount}€</p>
                                    </div>

                                    {['courses', 'plaisir', 'loyer'].includes(selectedWish.category) && (
                                        <PriceWatchSection
                                            products={selectedWish.trackedProducts}
                                            onAdd={(url) => handleAddProductToWish(selectedWish.id, url)}
                                            onRemove={(pid) => handleRemoveProductFromWish(selectedWish.id, pid)}
                                            onRefresh={() => handleRefreshPricesForWish(selectedWish.id)}
                                            loading={isSearching}
                                        />
                                    )}

                                    <button
                                        onClick={() => setSelectedWishForSaving(selectedWish)}
                                        className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-800/50"
                                    >
                                        <PiggyBank size={16} /> Mettre de côté
                                    </button>
                                </div>

                                <div className="flex gap-2 mt-8">
                                    <button onClick={() => { deleteWishlistItem(selectedWish.id); setSelectedWishId(null); }} className="flex-1 p-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all hover:bg-red-100"><Trash2 size={16} /> Supprimer</button>
                                    <button
                                        onClick={() => {
                                            handleFinalizeWish(selectedWish);
                                            setSelectedWishId(null);
                                        }}
                                        className="flex-[2] p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-900/20"
                                    >
                                        Finaliser l&apos;achat <ArrowRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showGlobalEnvelope && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
                                <button onClick={() => setShowGlobalEnvelope(false)} className="absolute top-6 right-6 p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>

                                <div className="mb-6">
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white mb-1">Enveloppe Globale</h3>
                                    <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Total Restant à Payer</p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] text-center mb-6 border border-slate-100 dark:border-slate-800">
                                    <span className="text-5xl font-[1000] text-slate-900 dark:text-white tracking-tighter block mb-2">{Math.round(householdNeeds.envelope.total)}€</span>
                                    <p className="text-xs font-bold text-slate-400">Pour tout solder ce mois-ci</p>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-2">
                                    {householdNeeds.envelope.items.map((item: any) => (
                                        <div key={item.key} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate flex-1">{item.label}</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white">{Math.round(item.monthlyAmount)}€</span>
                                        </div>
                                    ))}
                                    {householdNeeds.envelope.items.length === 0 && (
                                        <p className="text-center text-xs text-slate-300 dark:text-slate-600 font-bold py-4">Tout est à jour ! 🎉</p>
                                    )}
                                </div>

                                <button
                                    onClick={handleBulkValidate}
                                    disabled={householdNeeds.envelope.items.length === 0}
                                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase shadow-xl hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} />
                                    Tout Payer & Valider
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>


                <AnimatePresence>
                    {selectedWishForSaving && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
                                <button onClick={() => setSelectedWishForSaving(null)} className="absolute top-6 right-6 p-2 text-slate-400 transition"><X size={20} /></button>
                                <h3 className="font-black text-xl text-slate-800 dark:text-white mb-2">Mettre de côté</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">Pour : {selectedWishForSaving.label}</p>

                                <form onSubmit={handleAddSavingsToWish} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Montant à épargner (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            autoFocus
                                            placeholder="0.00"
                                            className="w-full text-4xl font-black p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none"
                                            value={savingAmount}
                                            onChange={e => setSavingAmount(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase shadow-xl">Confirmer le dépôt</button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {repaymentTarget && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
                                <button onClick={() => setRepaymentTarget(null)} className="absolute top-6 right-6 p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
                                <h3 className="font-black text-xl text-slate-800 dark:text-white mb-2">Remboursement</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">Dépense : {repaymentTarget.label}</p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Montant du versement (€)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                autoFocus
                                                className="w-full text-4xl font-[1000] p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500/20 transition-all"
                                                value={repaymentAmount}
                                                onChange={e => setRepaymentAmount(e.target.value)}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <button
                                                    onClick={() => setRepaymentAmount(repaymentTarget.amount.toFixed(2))}
                                                    className="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black rounded-lg uppercase"
                                                >
                                                    Max
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRepaymentTarget(null)}
                                            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase text-[10px]"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const amount = parseFloat(repaymentAmount);
                                                if (amount > 0) {
                                                    if (repaymentTarget.expenseId === 'global' && repaymentTarget.expenseIds) {
                                                        let remainingToPay = amount;
                                                        const targets = [...expenses, ...unsettledExpenses]
                                                            .filter(e => repaymentTarget.expenseIds?.includes(e.id))
                                                            .sort((a, b) => safeDate(a.date).getTime() - safeDate(b.date).getTime());

                                                        for (const tx of targets) {
                                                            if (remainingToPay <= 0.01) break;
                                                            const share = calculateShareForUser(tx.amount, tx.splitType, repaymentTarget.memberUid, tx.paidBy);
                                                            const repaid = Array.isArray(tx.repayments)
                                                                ? tx.repayments.filter((r: any) => r.uid === repaymentTarget.memberUid).reduce((sum: number, r: any) => sum + r.amount, 0)
                                                                : 0;
                                                            const debt = Math.max(0, share - repaid);
                                                            const pay = Math.min(debt, remainingToPay);

                                                            if (pay > 0.01) {
                                                                await addRepayment(tx.id, pay, repaymentTarget.memberUid);
                                                                remainingToPay -= pay;
                                                            }
                                                        }
                                                    } else {
                                                        await addRepayment(repaymentTarget.expenseId, amount, repaymentTarget.memberUid);
                                                    }
                                                    setRepaymentTarget(null);
                                                }
                                            }}
                                            className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase shadow-xl shadow-emerald-500/20 text-[10px]"
                                        >
                                            Confirmer
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div >
        </div >
    );
}
