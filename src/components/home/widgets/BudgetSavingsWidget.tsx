"use client";

import { motion } from "framer-motion";
import { PiggyBank, Target, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/AuthProvider";

interface BudgetSavingsWidgetProps {
    household: any;
}

export default function BudgetSavingsWidget({ household }: BudgetSavingsWidgetProps) {
    const { user } = useAuth();
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const budgetConfig = household?.budgetConfig;
    const reserves = budgetConfig?.reserves || [];
    const completions = budgetConfig?.budgetCompletions || {};

    const currentMonth = format(new Date(), "yyyy-MM");

    const totalTarget = reserves.reduce((acc: number, r: any) => acc + r.amount, 0);
    const validatedAmount = reserves.reduce((acc: number, r: any) => {
        const key = `${r.label}-${currentMonth}-${user?.uid}`;
        return completions[key] ? acc + r.amount : acc;
    }, 0);

    const progress = totalTarget > 0 ? (validatedAmount / totalTarget) * 100 : 0;

    return (
        <motion.div variants={item}>
            <Link href="/budget" className="block bg-gradient-to-br from-pink-500 to-rose-600 p-6 rounded-[2rem] shadow-xl text-white hover:scale-[1.02] transition-transform relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                    <PiggyBank size={100} />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black flex items-center gap-2 uppercase tracking-wide text-xs">
                            <Target size={18} className="text-pink-200" /> Objectif Épargne
                        </h3>
                        {progress === 100 && <CheckCircle2 size={18} className="text-pink-200" />}
                    </div>

                    <div className="flex flex-col gap-1">
                        <p className="text-3xl font-black">
                            {validatedAmount.toFixed(0)} <span className="text-sm opacity-60">/ {totalTarget.toFixed(0)} €</span>
                        </p>

                        <div className="w-full bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-white h-full rounded-full"
                            />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-pink-100/70">
                            {progress.toFixed(0)}% de l'objectif atteint
                        </p>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
