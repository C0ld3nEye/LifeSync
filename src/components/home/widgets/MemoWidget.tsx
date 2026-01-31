"use client";

import { useState } from "react";
import { useCommunication, Memo } from "@/hooks/useCommunication";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, StickyNote, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const COLORS = [
    { id: "yellow", bg: "bg-yellow-100", border: "border-yellow-200", darkBg: "dark:bg-yellow-900/40", text: "text-yellow-800" },
    { id: "blue", bg: "bg-blue-100", border: "border-blue-200", darkBg: "dark:bg-blue-900/40", text: "text-blue-800" },
    { id: "pink", bg: "bg-rose-100", border: "border-rose-200", darkBg: "dark:bg-rose-900/40", text: "text-rose-800" },
    { id: "green", bg: "bg-emerald-100", border: "border-emerald-200", darkBg: "dark:bg-emerald-900/40", text: "text-emerald-800" },
];

export default function MemoWidget() {
    const { memos, addMemo, deleteMemo } = useCommunication();
    const [isAdding, setIsAdding] = useState(false);
    const [newText, setNewText] = useState("");
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newText.trim()) return;
        await addMemo(newText, selectedColor.id);
        setNewText("");
        setIsAdding(false);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                        <StickyNote className="text-yellow-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Mémo Frigo</h3>
                        <p className="text-xs text-slate-500">{memos.length} note{memos.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                    <Plus size={20} />
                </button>
            </div>

            <AnimatePresence mode="wait">
                {isAdding ? (
                    <motion.form
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <textarea
                            autoFocus
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="Écris ton mot ici..."
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-yellow-500 min-h-[100px] resize-none"
                        />
                        <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedColor(c)}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 transition-all",
                                            c.bg,
                                            selectedColor.id === c.id ? "scale-125 border-slate-400" : "border-transparent opacity-60"
                                        )}
                                    />
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={!newText.trim()}
                                className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white p-2 px-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                            >
                                <Send size={14} /> Poster
                            </button>
                        </div>
                    </motion.form>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        {memos.length === 0 && (
                            <div className="col-span-2 py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Frigo vide...</p>
                            </div>
                        )}
                        {memos.map((memo, idx) => {
                            const color = COLORS.find(c => c.id === memo.color) || COLORS[0];
                            const dateStr = memo.createdAt?.toDate ? format(memo.createdAt.toDate(), "HH:mm", { locale: fr }) : "";

                            // Random rotation for "magnet" effect
                            const rotation = (idx % 3 - 1) * 2;

                            return (
                                <motion.div
                                    key={memo.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1, rotate: rotation }}
                                    whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                                    className={cn(
                                        "p-4 rounded-2xl border aspect-square flex flex-col justify-between shadow-sm relative group",
                                        color.bg, color.border, color.darkBg
                                    )}
                                >
                                    <button
                                        onClick={() => deleteMemo(memo.id)}
                                        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-black/20 rounded-lg"
                                    >
                                        <X size={12} />
                                    </button>
                                    <p className={cn("text-xs font-medium leading-relaxed overflow-hidden", color.text)}>
                                        {memo.text}
                                    </p>
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-[9px] font-bold uppercase tracking-tighter opacity-40">{memo.authorName?.split(' ')[0]}</span>
                                        <span className="text-[8px] opacity-30">{dateStr}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
