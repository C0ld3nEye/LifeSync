"use client";

import { motion } from "framer-motion";
import { Plus, Wallet, CheckSquare, Utensils, Calendar } from "lucide-react";
import Link from "next/link";

export default function QuickActionsWidget() {
    const item = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200 } as const },
    };

    const actions = [
        { label: 'Dépense', icon: Wallet, color: 'bg-emerald-100 text-emerald-600', href: '/budget?action=add' },
        { label: 'Tâche', icon: CheckSquare, color: 'bg-indigo-100 text-indigo-600', href: '/chores?action=add' },
        { label: 'Repas', icon: Utensils, color: 'bg-orange-100 text-orange-600', href: '/meals' },
        { label: 'Évènement', icon: Calendar, color: 'bg-blue-100 text-blue-600', href: '/agenda' },
    ];

    return (
        <motion.div variants={item} className="grid grid-cols-4 gap-3">
            {actions.map((action, idx) => (
                <Link key={idx} href={action.href} className="group">
                    <div className="bg-white dark:bg-slate-900 aspect-square rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-2 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all active:scale-95">
                        <div className={`p-2 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                            <action.icon size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">{action.label}</span>
                    </div>
                </Link>
            ))}
        </motion.div>
    );
}
