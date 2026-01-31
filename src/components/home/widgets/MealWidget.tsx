"use client";

import { motion } from "framer-motion";
import { Utensils, Zap, Package, PackagePlus } from "lucide-react";
import Link from "next/link";

interface MealWidgetProps {
    todaysMenu: any;
    capitalizedDay: string;
}

export default function MealWidget({ todaysMenu, capitalizedDay }: MealWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    return (
        <motion.div variants={item}>
            <Link href="/meals" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute -top-6 -right-6 text-orange-500/5 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                    <Utensils size={120} />
                </div>

                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <Utensils size={18} className="text-orange-500" />
                        {new Date().getHours() < 14 ? "On mange quoi ce midi ?" : "On mange quoi ce soir ?"}
                    </h3>
                    <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">{capitalizedDay}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Midi</p>
                            <div className="flex gap-1">
                                {todaysMenu?.Midi?.isExpress && <Zap size={10} className="text-yellow-500 fill-yellow-500" />}
                                {todaysMenu?.Midi?.mode === 'leftover' && <Package size={10} className="text-blue-500" />}
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 min-h-[2.5rem]">
                            {todaysMenu?.Midi.recipe?.recipeName || (todaysMenu?.Midi?.mode === 'leftover' ? "Restes" : "À planifier")}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Soir</p>
                            <div className="flex gap-1">
                                {todaysMenu?.Soir?.isExpress && <Zap size={10} className="text-yellow-500 fill-yellow-500" />}
                                {todaysMenu?.Soir?.cookForLeftover && <PackagePlus size={10} className="text-teal-500" />}
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 min-h-[2.5rem]">
                            {todaysMenu?.Soir.recipe?.recipeName || "À planifier"}
                        </p>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
