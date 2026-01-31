"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, Sparkles, CheckCircle2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoItem {
    title: string;
    description: string;
    icon?: any;
    color?: string;
}

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    items: InfoItem[];
    tips?: string[];
    accentColor?: string;
}

export default function InfoModal({ isOpen, onClose, title, description, items, tips, accentColor = "emerald" }: InfoModalProps) {
    const colorMaps: Record<string, string> = {
        emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800",
        blue: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800",
        violet: "text-violet-500 bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800",
        purple: "text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800",
        orange: "text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800",
        pink: "text-pink-500 bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800",
    };

    const btnColorMaps: Record<string, string> = {
        emerald: "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600",
        blue: "bg-blue-500 shadow-blue-500/20 hover:bg-blue-600",
        violet: "bg-violet-500 shadow-violet-500/20 hover:bg-violet-600",
        purple: "bg-purple-500 shadow-purple-500/20 hover:bg-purple-600",
        orange: "bg-orange-500 shadow-orange-500/20 hover:bg-orange-600",
        pink: "bg-pink-500 shadow-pink-500/20 hover:bg-pink-600",
    };

    const colorClasses = colorMaps[accentColor] || colorMaps.emerald;
    const btnColor = btnColorMaps[accentColor] || btnColorMaps.emerald;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border", colorClasses)}>
                                <HelpCircle size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                                    {title}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Guide d'utilisation</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                            {description}
                        </p>

                        <div className="space-y-4 mb-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Fonctionnalités clés</h3>
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                        item.color ? colorMaps[item.color] : colorClasses
                                    )}>
                                        {item.icon ? <item.icon size={20} /> : <CheckCircle2 size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white text-sm mb-0.5">{item.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tips && tips.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl mb-8">
                                <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                                    <Lightbulb size={16} /> Astuces Pro
                                </h3>
                                <ul className="space-y-2">
                                    {tips.map((tip, idx) => (
                                        <li key={idx} className="text-xs text-amber-700/80 dark:text-amber-300/60 leading-relaxed flex gap-2">
                                            <span className="text-amber-400">•</span> {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className={cn("w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs", btnColor)}
                        >
                            J'ai compris
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
