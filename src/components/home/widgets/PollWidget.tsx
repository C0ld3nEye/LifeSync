"use client";

import { useState } from "react";
import { useCommunication, Poll } from "@/hooks/useCommunication";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Plus, X, Check, ListChecks } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function PollWidget() {
    const { polls, votePoll, createPoll, closePoll } = useCommunication();
    const { user } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["Oui", "Non"]);

    const activePoll = polls.length > 0 ? polls[0] : null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || options.some(o => !o.trim())) return;
        await createPoll(question, options.filter(o => o.trim() !== ""));
        setQuestion("");
        setOptions(["Oui", "Non"]);
        setIsCreating(false);
    };

    const addOption = () => setOptions([...options, ""]);
    const updateOption = (idx: number, val: string) => {
        const newOptions = [...options];
        newOptions[idx] = val;
        setOptions(newOptions);
    };

    if (!activePoll && !isCreating) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                            <ListChecks className="text-indigo-500" size={20} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Sondage Express</h3>
                    </div>
                    <button onClick={() => setIsCreating(true)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                        <Plus size={20} />
                    </button>
                </div>
                <div className="mt-6 text-center py-4">
                    <p className="text-xs text-slate-400">Aucun débat en cours...</p>
                    <button onClick={() => setIsCreating(true)} className="mt-2 text-indigo-500 font-bold text-[10px] uppercase tracking-widest">Lancer un sondage</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <AnimatePresence mode="wait">
                {isCreating ? (
                    <motion.form
                        key="create"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSubmit={handleCreate}
                        className="space-y-4"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Nouveau Sondage</h3>
                            <button type="button" onClick={() => setIsCreating(false)}><X size={16} className="text-slate-300" /></button>
                        </div>
                        <input
                            autoFocus
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ta question ?"
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="space-y-2">
                            {options.map((opt, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={opt}
                                        onChange={(e) => updateOption(i, e.target.value)}
                                        placeholder={`Option ${i + 1}`}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {options.length > 2 && (
                                        <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))}>
                                            <X size={14} className="text-slate-300" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {options.length < 5 && (
                                <button type="button" onClick={addOption} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 flex items-center gap-1">
                                    <Plus size={12} /> Ajouter une option
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            Lancer le vote
                        </button>
                    </motion.form>
                ) : activePoll && (
                    <motion.div
                        key="vote"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/50 mb-1 block">Le débat du moment</span>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{activePoll.question}</h4>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsCreating(true)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-300">
                                    <Plus size={16} />
                                </button>
                                {user?.uid === activePoll.authorId && activePoll.status === 'open' && (
                                    <button onClick={() => closePoll(activePoll.id)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-300">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {activePoll.options.map((option, idx) => {
                                const totalVotes = Object.keys(activePoll.votes || {}).length;
                                const optionVotes = Object.values(activePoll.votes || {}).filter(v => v === idx).length;
                                const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
                                const hasVoted = activePoll.votes?.[user?.uid || ''] === idx;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => activePoll.status === 'open' && votePoll(activePoll.id, idx)}
                                        disabled={activePoll.status === 'closed'}
                                        className={cn(
                                            "w-full relative h-14 rounded-2xl border transition-all overflow-hidden",
                                            hasVoted ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20",
                                            activePoll.status === 'closed' && "opacity-80"
                                        )}
                                    >
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            className={cn(
                                                "absolute inset-y-0 left-0 transition-all",
                                                hasVoted ? "bg-indigo-500/20" : "bg-slate-200 dark:bg-slate-700/50"
                                            )}
                                        />
                                        <div className="absolute inset-0 px-4 flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                    hasVoted ? "border-indigo-500 bg-indigo-500" : "border-slate-300 dark:border-slate-600"
                                                )}>
                                                    {hasVoted && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className={cn("text-sm font-bold", hasVoted ? "text-indigo-900 dark:text-indigo-100" : "text-slate-600 dark:text-slate-400")}>
                                                    {option}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">{Math.round(percentage)}%</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {activePoll.status === 'closed' && (
                            <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                                <Check size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vote clôturé</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
