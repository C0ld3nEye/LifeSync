"use client";

import { useWishlist } from "@/hooks/useWishlist";
import { useBudget } from "@/hooks/useBudget";
import { TrendingDown, Tag, ArrowRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function PriceWatchWidget() {
    const { wishlist, loading: wishing } = useWishlist();
    const { expenses, loading: budgeting } = useBudget();

    const allProducts = [
        ...(wishlist.flatMap(w => (w.trackedProducts || []).map(p => ({ ...p, parent: w.label, type: 'wish' })))),
        ...(expenses.flatMap(e => (e.trackedProducts || []).map(p => ({ ...p, parent: e.label, type: 'expense' }))))
    ];

    const sortedProducts = allProducts.sort((a, b) => {
        // Highlight those with price drop or recent updates
        const aDrop = (a.lowestPrice && a.currentPrice) ? a.lowestPrice - a.currentPrice : -Infinity;
        const bDrop = (b.lowestPrice && b.currentPrice) ? b.lowestPrice - b.currentPrice : -Infinity;
        return bDrop - aDrop;
    }).slice(0, 3);

    if (wishing || budgeting) return <div className="h-40 animate-pulse bg-white/50 dark:bg-slate-800/50 rounded-[2.5rem]" />;
    if (sortedProducts.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full hover:shadow-xl hover:shadow-blue-500/5 transition-all">
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Tag size={14} className="text-blue-500" /> Veille Prix
                </h3>
                <Link href="/budget?tab=wishlist" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <ArrowRight size={16} className="text-slate-400" />
                </Link>
            </div>

            <div className="space-y-3 flex-1">
                {sortedProducts.map((p, idx) => {
                    const hasDrop = p.lowestPrice && p.currentPrice && p.currentPrice <= p.lowestPrice;
                    return (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[8px] font-black uppercase text-slate-400 truncate max-w-[100px]">{p.parent}</span>
                                <a
                                    href={p.url.startsWith('http') ? p.url : `https://www.google.com/search?q=${p.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <ExternalLink size={10} />
                                </a>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-bold dark:text-white truncate pr-2 max-w-[120px]">{p.name}</p>
                                <div className="flex flex-col items-end shrink-0">
                                    <span className={cn("text-[10px] font-black", hasDrop ? "text-emerald-500" : "text-slate-800 dark:text-white")}>
                                        {p.currentPrice ? `${p.currentPrice.toFixed(2)}€` : '--'}
                                    </span>
                                    {hasDrop && (
                                        <span className="text-[7px] font-bold text-emerald-500 flex items-center gap-0.5 uppercase">
                                            <TrendingDown size={8} /> Prix Bas
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {allProducts.length > 3 && (
                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                        +{allProducts.length - 3} autres produits en veille
                    </p>
                </div>
            )}
        </div>
    );
}
