"use client";

import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";

interface ChoresCircleWidgetProps {
    chores: any[];
}

export default function ChoresCircleWidget({ chores }: ChoresCircleWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const total = chores.length;
    const done = chores.filter(c => c.done).length;
    const progress = total > 0 ? (done / total) * 100 : 0;

    // SVG Circle properties
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <motion.div variants={item}>
            <Link href="/chores" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group overflow-hidden relative">
                <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="48"
                                cy="48"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-slate-100 dark:text-slate-800"
                            />
                            <motion.circle
                                cx="48"
                                cy="48"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: offset }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="text-indigo-600 dark:text-indigo-400"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-slate-900 dark:text-white">{Math.round(progress)}%</span>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs mb-2">
                            Objectif Tâches
                        </h3>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                {done} de {total} terminées
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase">
                                <TrendingUp size={12} /> {total - done} restantes
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
