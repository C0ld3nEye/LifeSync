"use client";

import { motion } from "framer-motion";
import { ShoppingCart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { calculateShoppingList, CATEGORY_ORDER } from "@/lib/shopping";
import { WeekMenu } from "@/types/smartmeal";

interface ShoppingWidgetProps {
    menu: WeekMenu;
    sortedShopList?: Record<string, string[]> | null;
}

export default function ShoppingWidget({ menu, sortedShopList }: ShoppingWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const shoppingItems = sortedShopList
        ? Object.entries(sortedShopList)
            .sort(([a], [b]) => {
                const idxA = CATEGORY_ORDER.indexOf(a);
                const idxB = CATEGORY_ORDER.indexOf(b);
                if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            })
            .flatMap(([_, items]) => items)
        : calculateShoppingList(menu);

    return (
        <motion.div variants={item}>
            <Link href="/shopping" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute -top-6 -right-6 text-emerald-500/5 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                    <ShoppingCart size={120} />
                </div>

                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <ShoppingCart size={18} className="text-emerald-500" /> Liste de courses
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                        {shoppingItems.length} articles
                    </span>
                </div>

                <div className="space-y-2 relative z-10">
                    {shoppingItems.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                <ShoppingBag size={10} className="text-slate-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{item}</span>
                        </div>
                    ))}
                    {shoppingItems.length > 3 && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 pl-8">
                            + {shoppingItems.length - 3} autres articles
                        </p>
                    )}
                    {shoppingItems.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-2">
                            Rien à acheter pour le moment
                        </p>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}
