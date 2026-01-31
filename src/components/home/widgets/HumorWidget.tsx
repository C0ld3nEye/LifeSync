"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, MessageCircle, Send, X, Loader2 } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { generateDailyJoke, askAIAssistant } from "@/lib/gemini";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function HumorWidget() {
    const { household, updateAIWidgetConfig } = useHousehold();
    const [loading, setLoading] = useState(false);
    const [isChatting, setIsChatting] = useState(false);
    const [question, setQuestion] = useState("");
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        const checkAndGenerate = async () => {
            if (!household) return;

            const today = format(new Date(), "yyyy-MM-dd");
            const config = household.aiWidgetConfig;

            // If no joke for today, generate one
            if (config?.dailyJokeDate !== today && !loading) {
                setLoading(true);
                try {
                    const joke = await generateDailyJoke(household);
                    await updateAIWidgetConfig({
                        dailyJoke: joke,
                        dailyJokeDate: today
                    });
                } catch (error) {
                    console.error("Failed to generate daily humor:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        checkAndGenerate();
    }, [household?.id]);

    const handleRefresh = async () => {
        if (!household || loading) return;
        setLoading(true);
        try {
            const joke = await generateDailyJoke(household);
            await updateAIWidgetConfig({
                dailyJoke: joke,
                dailyJokeDate: format(new Date(), "yyyy-MM-dd")
            });
        } catch (error) {
            console.error("Failed to refresh humor:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || chatLoading) return;

        setChatLoading(true);
        try {
            const result = await askAIAssistant(question, household);
            await updateAIWidgetConfig({
                lastQuestion: question,
                shortAnswer: result.short,
                longAnswer: result.long,
                lastUpdate: new Date().toISOString()
            });
            setQuestion("");
        } catch (error) {
            console.error("AI Error:", error);
        } finally {
            setChatLoading(false);
        }
    };

    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0 },
    };

    const joke = household?.aiWidgetConfig?.dailyJoke;

    return (
        <motion.div variants={item} className="h-full">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden h-full flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-violet-500/10 rounded-xl flex items-center justify-center">
                            <Sparkles className="text-violet-500" size={18} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Le Mot de l'IA</h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsChatting(!isChatting)}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                isChatting ? "bg-violet-500 text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400"
                            )}
                        >
                            <MessageCircle size={18} />
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center min-h-0">
                    <AnimatePresence mode="wait">
                        {isChatting ? (
                            <motion.div
                                key="chat"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="h-full flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto mb-3 space-y-3 custom-scrollbar">
                                    {household?.aiWidgetConfig?.shortAnswer ? (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                            <p className="text-[10px] font-black text-violet-500 mb-1">Dernière réponse</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                                                {household.aiWidgetConfig.shortAnswer}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-center text-xs text-slate-400 pt-4">Posez-moi une question !</p>
                                    )}
                                </div>
                                <form onSubmit={handleAsk} className="relative mt-auto">
                                    <input
                                        type="text"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder="Une question ?"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-4 pr-10 py-3 text-xs font-bold focus:ring-2 focus:ring-violet-500/20"
                                    />
                                    <button type="submit" className="absolute right-2 top-2 p-1 text-violet-500">
                                        {chatLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={18} />}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="joke"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="text-center space-y-4"
                            >
                                {loading ? (
                                    <div className="py-8 flex flex-col items-center gap-2">
                                        <Loader2 className="animate-spin text-violet-500" size={24} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inspiration en cours...</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight italic">
                                            "{joke || "Je n'ai pas de blague sous le coude aujourd'hui... bizarre."}"
                                        </p>
                                        <div className="h-0.5 w-12 bg-violet-100 dark:bg-slate-800 mx-auto rounded-full" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aujourd'hui, c'est cadeau</p>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
