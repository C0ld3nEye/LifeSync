"use client";

import { motion } from "framer-motion";
import { Coffee, Utensils, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MealsNextWidgetProps {
    menu: any;
}

export default function MealsNextWidget({ menu }: MealsNextWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const now = new Date();
    const currentHour = now.getHours();

    let targetDay = format(now, "EEEE", { locale: fr });
    targetDay = targetDay.charAt(0).toUpperCase() + targetDay.slice(1);

    let targetType: "Midi" | "Soir" = currentHour < 14 ? "Midi" : "Soir";

    // If it's late night, show tomorrow's lunch
    if (currentHour >= 21) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDay = format(tomorrow, "EEEE", { locale: fr });
        targetDay = targetDay.charAt(0).toUpperCase() + targetDay.slice(1);
        targetType = "Midi";
    }

    const nextMeal = menu[targetDay]?.[targetType];
    const recipeName = nextMeal?.recipe?.recipeName || "À planifier";

    return (
        <motion.div variants={item}>
            <Link href="/meals" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-orange-500/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <Coffee size={80} />
                </div>

                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <Coffee size={18} className="text-orange-400" /> Prochain Repas
                    </h3>
                    <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        {targetDay} • {targetType}
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-lg font-black text-slate-900 dark:text-white line-clamp-2 pr-4">
                            {recipeName}
                        </p>
                        {nextMeal?.recipe?.duration && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                ⏱️ {nextMeal.recipe.duration} mins
                            </p>
                        )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        <ArrowRight size={20} />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
