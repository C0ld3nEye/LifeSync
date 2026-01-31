"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Receipt, CalendarClock, Coins, User, Users, Check, AlertCircle, RefreshCw, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHousehold } from "@/hooks/useHousehold";
import { useBudget } from "@/hooks/useBudget";
import { CATEGORIES, SUBSCRIPTION_CATEGORIES } from "@/lib/budget-constants";
import { format } from "date-fns";

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'expense' | 'subscription';
    monthDate?: Date; // Context month (affects effective date for subs)

    // For Editing
    editId?: string; // If provided, we are editing
    editData?: any; // Pre-filled data
    onSuccess?: () => void;
}

export default function TransactionModal({ isOpen, onClose, initialMode = 'expense', monthDate = new Date(), editId, editData, onSuccess }: TransactionModalProps) {
    const { user } = useAuth();
    const { household, updateSubscription, updateBudgetConfig } = useHousehold();
    const { addExpense, updateExpense } = useBudget(monthDate);

    const [mode, setMode] = useState<'expense' | 'subscription'>(initialMode);

    // Form State
    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("autre");
    const [paidBy, setPaidBy] = useState("");
    const [splitType, setSplitType] = useState<'equal' | 'proportional' | 'individual' | 'custom'>('equal');
    const [description, setDescription] = useState("");
    const [type, setType] = useState<'shared' | 'personal'>('shared');
    const [customShares, setCustomShares] = useState<Record<string, number>>({});

    // Subscription specific
    const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
    const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD or Day number

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setMode(initialMode);
            if (editData) {
                // Pre-fill
                setLabel(editData.label || "");
                setAmount(editData.amount?.toString() || "");
                setCategory(editData.category || "autre");
                setPaidBy(editData.paidBy || user?.uid || "");
                setSplitType(editData.splitType || "equal");
                setDescription(editData.description || "");
                setType(editData.type || "shared");
                if (editData.customShares) setCustomShares(editData.customShares);

                if (initialMode === 'subscription') {
                    setFrequency(editData.frequency || 'monthly');
                    setDueDate(editData.renewsOn ? editData.renewsOn.toString() : '1');
                } else if (editData.date) {
                    const d = editData.date.toDate ? editData.date.toDate() : new Date(editData.date);
                    setDueDate(format(d, 'yyyy-MM-dd'));
                }
            } else {
                // Reset
                setLabel("");
                setAmount("");
                setCategory(initialMode === 'expense' ? "courses" : "loyer");
                setPaidBy(user?.uid || "");
                setSplitType("equal");
                setDescription("");
                setType("shared");
                setFrequency('monthly');
                setCustomShares({});
                setDueDate(initialMode === 'expense' ? format(new Date(), 'yyyy-MM-dd') : '1');
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, initialMode, editData, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!label || isNaN(numAmount)) return;

        if (mode === 'expense') {
            const expenseData = {
                label,
                amount: numAmount,
                category: category as any,
                paidBy,
                splitType: type === 'personal' ? 'individual' : splitType,
                description,
                type,
                customShares: splitType === 'custom' ? customShares : null,
                date: dueDate ? new Date(dueDate) : new Date()
            };

            // Remove undefined/null keys if needed, but here null is valid for resetting. 
            // However, Firestore update needs explicit values. 
            // If splitType != custom, we might want to DELETE customShares field? 
            // Or just set to null? deleteField() is needed for deletion.
            // For now, let's just make sure it's not undefined.

            // Actually, if I pass `undefined` to updateDoc, it throws. 
            // If I pass `null`, it sets it to null.
            // Let's rely on cleaning the object of undefineds.
            const cleanData = Object.fromEntries(
                Object.entries(expenseData).filter(([_, v]) => v !== undefined)
            );

            if (editId) {
                await updateExpense(editId, cleanData);
            } else {
                await addExpense(
                    label,
                    numAmount,
                    category as any,
                    type === 'personal' ? 'individual' : splitType,
                    paidBy,
                    description,
                    type,
                    undefined, // projectId
                    false, // paidByJoint
                    false, // isSubscription
                    undefined, // renewsOn
                    splitType === 'custom' ? customShares : undefined
                );
            }
        } else {
            // Subscription Logic
            const newSub = {
                label,
                amount: numAmount,
                category,
                paidBy,
                splitType: type === 'personal' ? 'individual' : splitType,
                type,
                frequency,
                customShares: splitType === 'custom' ? customShares : undefined,
                renewsOn: parseInt(dueDate) || 1,
            };

            // Clean undefined from newSub
            const cleanSub = JSON.parse(JSON.stringify(newSub)); // Simple trick to strip undefined

            if (editId !== undefined && household?.budgetConfig?.fixedCharges) {
                // Editing
                const idx = parseInt(editId);
                if (!isNaN(idx)) {
                    await updateSubscription(idx, cleanSub, monthDate);
                }
            } else {
                // Creating New
                const currentCharges = household?.budgetConfig?.fixedCharges || [];
                const nextCharges = [...currentCharges, cleanSub];
                await updateBudgetConfig({ ...household?.budgetConfig, fixedCharges: nextCharges });
            }
        }

        if (onSuccess) onSuccess();
        onClose();
    };

    const categories = mode === 'expense' ? CATEGORIES : SUBSCRIPTION_CATEGORIES;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {/* Header & Tabs */}
                        <div className="p-6 pb-2 shrink-0">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                    {editId ? "Modifier" : "Ajouter"}
                                </h2>
                                <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            {!editId && (
                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-2">
                                    <button
                                        onClick={() => setMode('expense')}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                            mode === 'expense' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-500" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Receipt size={16} /> Dépense
                                    </button>
                                    <button
                                        onClick={() => setMode('subscription')}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                            mode === 'subscription' ? "bg-white dark:bg-slate-700 shadow-sm text-purple-500" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <CalendarClock size={16} /> Abonnement
                                    </button>
                                </div>
                            )}

                            {editId && initialMode === 'subscription' && (
                                <div className="text-xs bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-100 flex items-start gap-2 mb-2">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <p>Modifier cet abonnement ici affectera <strong>ce mois ({format(monthDate, 'MMMM yyyy')}) et les futurs</strong>. Le passé restera inchangé.</p>
                                </div>
                            )}
                        </div>

                        {/* Scrollable Form */}
                        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">

                            {/* Amount & Label */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Montant</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            className="w-full bg-white dark:bg-slate-900 p-4 pl-10 rounded-xl text-2xl font-black text-slate-800 dark:text-white outline-none border-2 border-transparent focus:border-blue-500/20 transition-all placeholder:text-slate-200"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            autoFocus={!editId}
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">€</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Titre</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Courses, Loyer..."
                                        className="w-full bg-white dark:bg-slate-900 p-4 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none border-2 border-transparent focus:border-blue-500/20 transition-all"
                                        value={label}
                                        onChange={e => setLabel(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Catégorie</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {categories.map((conf) => (
                                        <button
                                            key={conf.id}
                                            type="button"
                                            onClick={() => setCategory(conf.id)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all gap-1 h-20",
                                                category === conf.id
                                                    ? `bg-${conf.color}-50 dark:bg-${conf.color}-900/10 border-${conf.color}-500 ring-1 ring-${conf.color}-500/20`
                                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm",
                                                category === conf.id ? `bg-${conf.color}-500` : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                                            )}>
                                                <conf.icon size={14} />
                                            </div>
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase tracking-wide truncate max-w-full",
                                                category === conf.id ? `text-${conf.color}-700 dark:text-${conf.color}-300` : "text-slate-400"
                                            )}>{conf.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date / Renewal */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-4">
                                {mode === 'subscription' ? (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Jour du prélèvement</label>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-sm font-bold text-slate-500">Le</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={31}
                                                placeholder="1"
                                                className="w-20 bg-white dark:bg-slate-900 p-3 rounded-xl text-center font-bold outline-none border-2 border-transparent focus:border-blue-500/20"
                                                value={dueDate}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val) && val >= 1 && val <= 31) setDueDate(val.toString());
                                                    else if (e.target.value === '') setDueDate('');
                                                }}
                                            />
                                            <span className="text-sm font-bold text-slate-500">du mois</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-blue-500/20"
                                            value={editData?.date ? format(editData.date.toDate ? editData.date.toDate() : new Date(editData.date), 'yyyy-MM-dd') : (dueDate || format(new Date(), 'yyyy-MM-dd'))}
                                            onChange={e => setDueDate(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Settings (Paid By, Type, Splits) */}
                            <div className="space-y-4">
                                {/* Paid By */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Payé par</label>
                                    <div className="flex gap-2">
                                        {household?.members.map(uid => {
                                            const profile = household.memberProfiles?.find(m => m.uid === uid);
                                            const isSelected = paidBy === uid;
                                            return (
                                                <button
                                                    key={uid}
                                                    type="button"
                                                    onClick={() => setPaidBy(uid)}
                                                    className={cn(
                                                        "flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                                        isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                                                    )}
                                                >
                                                    {profile?.photoURL ? (
                                                        <img src={profile.photoURL} className="w-6 h-6 rounded-full" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center"><User size={12} /></div>
                                                    )}
                                                    <span className={cn("text-xs font-bold", isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-500")}>
                                                        {profile?.displayName || "Membre"}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {mode === 'subscription' && (
                                            <button
                                                type="button"
                                                onClick={() => setPaidBy('joint')}
                                                className={cn(
                                                    "px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                                    paidBy === 'joint' ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                                                )}
                                            >
                                                <Users size={16} className={paidBy === 'joint' ? "text-emerald-500" : "text-slate-400"} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Type (Shared/Personal) */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setType('shared')}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                            type === 'shared' ? "bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white" : "text-slate-400"
                                        )}
                                    >
                                        Commun
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('personal')}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                            type === 'personal' ? "bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white" : "text-slate-400"
                                        )}
                                    >
                                        Personnel
                                    </button>
                                </div>

                                {/* Split Type (If shared) */}
                                {type === 'shared' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Répartition</label>
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'equal', label: '50/50', icon: Coins },
                                                { id: 'proportional', label: 'Au salaire', icon: Check },
                                                { id: 'custom', label: 'Personnalisé', icon: Percent },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setSplitType(opt.id as any)}
                                                    className={cn(
                                                        "flex-1 p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                                        splitType === opt.id || (splitType === undefined && opt.id === 'equal')
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                                            : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400"
                                                    )}
                                                >
                                                    <opt.icon size={16} />
                                                    <span className="text-[10px] font-black uppercase">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Custom Split Inputs */}
                                        {splitType === 'custom' && (
                                            <div className="mt-4 space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Répartition en %</p>
                                                {household?.members.map(uid => {
                                                    const profile = household.memberProfiles?.find(m => m.uid === uid);
                                                    const share = customShares[uid] || 0;
                                                    return (
                                                        <div key={uid} className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                                                {profile?.photoURL && <img src={profile.photoURL} className="w-full h-full object-cover" />}
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1">{profile?.displayName}</p>
                                                            <div className="relative w-24">
                                                                <input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    className="w-full bg-white dark:bg-slate-900 p-2 pr-6 rounded-lg text-right text-xs font-bold outline-none border focus:border-blue-500"
                                                                    value={share || ''}
                                                                    onChange={e => {
                                                                        const val = parseFloat(e.target.value);
                                                                        setCustomShares(prev => ({ ...prev, [uid]: isNaN(val) ? 0 : val }));
                                                                    }}
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                                    <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
                                                    <span className={cn(
                                                        "text-xs font-black",
                                                        Object.values(customShares).reduce((a, b) => a + b, 0) === 100 ? "text-emerald-500" : "text-red-500"
                                                    )}>
                                                        {Object.values(customShares).reduce((a, b) => a + b, 0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>


                        </div>

                        {/* Footer / Submit */}
                        <div className="p-6 pt-2 border-t border-slate-50 dark:border-slate-800 mt-auto">
                            <button
                                onClick={handleSubmit}
                                disabled={!amount || !label}
                                className={cn(
                                    "w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                                    (!amount || !label) ? "bg-slate-300 cursor-not-allowed" :
                                        mode === 'expense' ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20" : "bg-purple-500 hover:bg-purple-600 shadow-purple-500/20"
                                )}
                            >
                                {editId ? "Enregistrer les modifications" : (mode === 'expense' ? "Ajouter la dépense" : "Créer l'abonnement")}
                            </button>

                            {editId && mode === 'subscription' && (
                                <button
                                    onClick={async () => {
                                        if (confirm("Êtes-vous sûr de vouloir arrêter cet abonnement ? Cela l'arrêtera pour ce mois et les futurs, mais gardera l'historique.")) {
                                            const idx = parseInt(editId);
                                            if (!isNaN(idx)) {
                                                await updateSubscription(idx, {
                                                    amount: 0,
                                                    label: editData?.label || label,
                                                    category: editData?.category || category,
                                                    isDeleted: true
                                                }, monthDate);
                                                if (onSuccess) onSuccess();
                                                onClose();
                                            }
                                        }
                                    }}
                                    className="w-full mt-3 py-3 rounded-2xl text-red-500 font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs border border-transparent hover:border-red-100 dark:hover:border-red-900"
                                >
                                    Arrêter cet abonnement
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
