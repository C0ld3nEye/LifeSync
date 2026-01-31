"use client";

import { motion } from "framer-motion";
import { CheckSquare, Star } from "lucide-react";
import Link from "next/link";

interface ChoreWidgetProps {
    pendingChores: any[];
}

export default function ChoreWidget({ pendingChores }: ChoreWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const totalPoints = pendingChores.reduce((acc, chore) => acc + (chore.points || 0), 0);

    return (
        <motion.div variants={item}>
            <Link href="/chores" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between h-full min-h-[160px]">
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit">
                            <CheckSquare size={20} />
                        </div>
                        {totalPoints > 0 && (
                            <div className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 rounded-full flex items-center gap-1">
                                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400">+{totalPoints}</span>
                            </div>
                        )}
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1">Tâches</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{pendingChores.length} en attente</p>
                </div>
                <div className="mt-4 space-y-1.5">
                    {pendingChores.slice(0, 3).map(chore => (
                        <div key={chore.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{chore.title}</span>
                            </div>
                            {chore.points > 0 && (
                                <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 shrink-0">{chore.points}pts</span>
                            )}
                        </div>
                    ))}
                    {pendingChores.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic">Tout est fait ! ✨</p>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}
