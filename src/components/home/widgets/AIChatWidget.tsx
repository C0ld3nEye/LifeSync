"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { askAIAssistant } from "@/lib/gemini";
import { cn } from "@/lib/utils";

export default function AIChatWidget() {
    const { household, updateAIWidgetConfig } = useHousehold();
    const config = household?.aiWidgetConfig;

    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || loading) return;

        setLoading(true);
        try {
            const result = await askAIAssistant(question, household);
            await updateAIWidgetConfig({
                lastQuestion: question,
                shortAnswer: result.short,
                longAnswer: result.long,
                lastUpdate: new Date().toISOString()
            });
            setQuestion("");
            setShowDetail(false);
        } catch (error) {
            console.error("AI Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    return (
        <motion.div variants={item} className="h-full">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col">
                <div className="flex justify-between items-center mb-5 relative z-10 shrink-0">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <Sparkles size={18} className="text-violet-500" /> Assistant IA
                    </h3>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    {/* Last Answer Display */}
                    <div className="flex-1 min-h-0 overflow-y-auto mb-3 space-y-3 custom-scrollbar">
                        {config?.lastQuestion ? (
                            <div className="space-y-3">
                                <div className="flex gap-2 items-start">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl rounded-tl-none border border-blue-100 dark:border-blue-800/50">
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                                            <MessageSquare size={10} /> Ma question
                                        </p>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{config.lastQuestion}"</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 items-start justify-end">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-2xl rounded-tr-none border border-emerald-100 dark:border-emerald-800/50 max-w-[95%]">
                                        <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 mb-1 uppercase tracking-widest flex items-center gap-1">
                                            <Sparkles size={10} /> Assistant
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                                            {config.shortAnswer}
                                        </p>

                                        {config.longAnswer && (
                                            <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-800/50">
                                                <button
                                                    onClick={() => setShowDetail(!showDetail)}
                                                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                                                >
                                                    {showDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                    {showDetail ? "Masquer les détails" : "En savoir plus"}
                                                </button>

                                                <AnimatePresence>
                                                    {showDetail && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                                                {config.longAnswer}
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-50 py-6">
                                <Sparkles size={32} className="text-violet-400 mb-2 animate-pulse" />
                                <p className="text-xs font-bold text-slate-400">Posez une question à votre assistant !</p>
                                <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">"Que faire pour dîner ?", "Conseil ménage...", "Budget du mois ?"</p>
                            </div>
                        )}
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleAsk} className="relative shrink-0">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Posez votre question..."
                            disabled={loading}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-4 pr-12 py-4 text-xs font-bold focus:ring-2 focus:ring-violet-500/20 transition-all dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!question.trim() || loading}
                            className={cn(
                                "absolute right-2 top-2 p-2 rounded-xl transition-all",
                                question.trim() && !loading ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30 scale-100" : "bg-transparent text-slate-400 scale-90"
                            )}
                        >
                            {loading ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
                        </button>
                    </form>
                </div>
            </div>
        </motion.div>
    );
}
