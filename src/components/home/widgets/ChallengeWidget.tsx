"use client";

import { useDailyChallenges } from "@/hooks/useDailyChallenges";
import { Zap, Flame, Check, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function ChallengeWidget() {
    const { challenge, stats, toggleCompletion, loading } = useDailyChallenges();

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse">
                <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-full mb-4" />
                <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="relative group">
            <Link
                href="/health?tab=challenges"
                className={cn(
                    "block p-6 rounded-[2.5rem] shadow-lg transition-all duration-500 overflow-hidden border",
                    challenge?.completed
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                )}
            >
                {/* Background Sparkle only on completed */}
                {challenge?.completed && (
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                )}

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                            challenge?.completed ? "bg-white/20" : "bg-orange-50 dark:bg-orange-900/30 text-orange-500"
                        )}>
                            <Zap size={20} className={cn(challenge?.completed ? "fill-white" : "fill-orange-500")} />
                        </div>
                        <div>
                            <h3 className={cn("font-black uppercase tracking-tight text-sm", challenge?.completed ? "text-white" : "text-slate-800 dark:text-white")}>
                                Défi du Jour
                            </h3>
                            <div className="flex items-center gap-1">
                                <span className={cn("text-[10px] font-black tracking-tighter", challenge?.completed ? "text-white/80" : "text-slate-400")}>Mon Streak</span>
                                <div className="flex items-center gap-0.5">
                                    <span className={cn("text-xs font-black", challenge?.completed ? "text-white" : "text-orange-500")}>{stats.currentStreak}</span>
                                    <Flame size={12} className={challenge?.completed ? "text-white" : "text-orange-500 fill-orange-500"} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={cn("p-2 rounded-xl transition-colors", challenge?.completed ? "bg-white/20 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400")}>
                        <ChevronRight size={18} />
                    </div>
                </div>

                {challenge ? (
                    <div className="relative z-10">
                        <p className={cn("text-lg font-black leading-tight mb-4", challenge.completed ? "text-white" : "text-slate-900 dark:text-white")}>
                            {challenge.title}
                        </p>

                        {!challenge.completed && (
                            <button
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    await toggleCompletion();
                                    const end = Date.now() + 2000;
                                    const colors = ['#10b981', '#ffffff'];
                                    (function frame() {
                                        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
                                        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
                                        if (Date.now() < end) requestAnimationFrame(frame);
                                    }());
                                }}
                                className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-800"
                            >
                                <Sparkles size={14} className="animate-pulse" />
                                Je l'ai fait !
                            </button>
                        )}

                        {challenge.completed && (
                            <div className="flex items-center gap-2 text-white/90 font-bold text-xs bg-white/10 py-2 px-4 rounded-xl w-fit">
                                <Check size={16} strokeWidth={3} /> Bravo, à demain !
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-4 text-slate-400">
                        <Sparkles size={24} className="animate-spin mb-2 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">En attente de l'IA...</p>
                    </div>
                )}
            </Link>
        </div>
    );
}
