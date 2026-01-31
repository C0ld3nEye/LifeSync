"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ALL_CATEGORIES } from "@/lib/budget-constants";

interface BudgetNextWidgetProps {
    household: any;
}

export default function BudgetNextWidget({ household }: BudgetNextWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const fixedCharges = household?.budgetConfig?.fixedCharges || [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;

    // Find next upcoming charge
    const upcomingCharges = fixedCharges.map((charge: any) => {
        let dueDate: Date;
        if (charge.frequency === 'yearly') {
            dueDate = new Date(today.getFullYear(), (charge.dueMonth || 1) - 1, charge.dueDay || 1);
            if (dueDate < today) dueDate.setFullYear(today.getFullYear() + 1);
        } else {
            dueDate = new Date(today.getFullYear(), today.getMonth(), charge.dueDay || 1);
            if (dueDate < today) dueDate.setMonth(today.getMonth() + 1);
        }
        return { ...charge, absoluteDate: dueDate };
    }).sort((a: any, b: any) => a.absoluteDate.getTime() - b.absoluteDate.getTime());

    const nextCharge = upcomingCharges[0];
    const category = nextCharge ? ALL_CATEGORIES.find(c => c.id === nextCharge.category) : null;

    if (!nextCharge) return null;

    const isVerySoon = (nextCharge.absoluteDate.getTime() - today.getTime()) < (1000 * 60 * 60 * 24 * 3);

    return (
        <motion.div variants={item}>
            <Link href="/budget" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <Calendar size={18} className="text-red-500" /> Prochaine Échéance
                    </h3>
                    {isVerySoon && <div className="animate-pulse flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">Bientôt</div>}
                </div>

                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex flex-col items-center justify-center border",
                        category ? category.color : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                    )}>
                        {category ? (
                            <category.icon size={24} />
                        ) : (
                            <>
                                <span className="text-[10px] font-bold text-red-500 uppercase">{format(nextCharge.absoluteDate, "MMM", { locale: fr })}</span>
                                <span className="text-lg font-black leading-none text-slate-700 dark:text-slate-200">{format(nextCharge.absoluteDate, "dd")}</span>
                            </>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{nextCharge.label}</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                            {nextCharge.amount.toFixed(2)} <span className="text-xs font-bold opacity-50">€</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <Clock size={16} className="text-slate-400" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
