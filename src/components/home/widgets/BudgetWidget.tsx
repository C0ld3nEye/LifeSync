"use client";

import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import Link from "next/link";

interface BudgetWidgetProps {
    totalExpenses: number;
}

export default function BudgetWidget({ totalExpenses }: BudgetWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    return (
        <motion.div variants={item}>
            <Link href="/budget" className="block bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white hover:scale-[1.02] transition-transform flex flex-col justify-between h-full min-h-[160px]">
                <div>
                    <div className="p-2 bg-white/10 text-emerald-400 rounded-xl w-fit mb-3">
                        <Wallet size={20} />
                    </div>
                    <h3 className="text-sm font-black mb-1">Budget</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Dépenses partagées</p>
                </div>
                <div className="mt-4">
                    <p className="text-2xl font-black">{totalExpenses.toFixed(2)} <span className="text-xs">€</span></p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, (totalExpenses / 1000) * 100)}%` }}></div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
