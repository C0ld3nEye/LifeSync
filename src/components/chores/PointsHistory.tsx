"use client";

import { useState, useEffect } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { cn } from "@/lib/utils";
import { Crown, Trophy, TrendingUp, History, Medal, Activity, ChevronRight, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthProvider";
import { format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PointsHistory() {
    const { household, deletePointEntry } = useHousehold();
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // ... (unchanged code)

    // Inside the map loop:
    // Inside the map loop:

    useEffect(() => {
        if (!household) return;

        // Fetch history for current month (simplified: last 50 items)
        // In a real optimized app, we would query by timestamp range for the current month
        const q = query(
            collection(db, "households", household.id, "pointHistory"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(items);
            setLoadingHistory(false);
        });

        return () => unsub();
    }, [household]);

    if (!household || !household.scores) return null;

    const sortedMembers = (household.memberProfiles || [])
        .map(m => ({
            ...m,
            score: household.scores?.[m.uid] || 0
        }))
        .sort((a, b) => b.score - a.score);

    const maxScore = sortedMembers[0]?.score || 1;
    const currentMonth = format(new Date(), "MMMM", { locale: fr });

    return (
        <div className="space-y-6">
            {/* Current Month Leaderboard */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-500">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-800 dark:text-white text-lg">Classement</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{currentMonth}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {sortedMembers.map((member, index) => (
                        <div key={member.uid} className="relative">
                            <div className="flex items-center gap-4 z-10 relative">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2",
                                    index === 0 ? "bg-yellow-400 border-yellow-400 text-white" :
                                        index === 1 ? "bg-slate-300 border-slate-300 text-white" :
                                            index === 2 ? "bg-amber-600 border-amber-600 text-white" :
                                                "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400"
                                )}>
                                    {index + 1}
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{member.displayName}</span>
                                        <span className="font-black text-slate-900 dark:text-white">{member.score} pts</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(member.score / maxScore) * 100}%` }}
                                            className={cn(
                                                "h-full rounded-full",
                                                index === 0 ? "bg-yellow-400" :
                                                    index === 1 ? "bg-slate-400" :
                                                        index === 2 ? "bg-amber-600" : "bg-slate-300 dark:bg-slate-700"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* REAL History LOG */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-800 dark:text-white text-lg">Activité Récente</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{currentMonth}</p>
                    </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    {loadingHistory ? (
                        <p className="text-center text-slate-400 text-xs italic py-4">Chargement...</p>
                    ) : history.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs italic py-4">Aucune activité enregistrée pour l'instant.</p>
                    ) : (
                        history.map(item => {

                            const profile = household.memberProfiles?.find(p => p.uid === item.uid);
                            const isPositive = item.points > 0;
                            const isMe = item.uid === useAuth().user?.uid;

                            return (
                                <div key={item.id} className="group flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl relative">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-slate-100 dark:border-slate-600">
                                        {profile?.displayName?.slice(0, 1) || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.reason || "Tâche"}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {format(new Date(item.timestamp), "d MMM HH:mm", { locale: fr })} • {profile?.displayName}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "font-black text-xs px-2 py-1 rounded-lg",
                                            isPositive ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                        )}>
                                            {isPositive ? "+" : ""}{item.points}
                                        </span>
                                        {isMe && deletePointEntry && (
                                            <button
                                                onClick={async () => {
                                                    if (confirm("Supprimer cette entrée et annuler les points ?")) {
                                                        await deletePointEntry(item.id, item.uid, item.points);
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                    <Medal className="text-indigo-500 mb-2" size={24} />
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate">{sortedMembers[0]?.score > 0 ? sortedMembers[0].displayName : '-'}</p>
                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Meneur</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                    <TrendingUp className="text-emerald-500 mb-2" size={24} />
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{sortedMembers.reduce((acc, curr) => acc + curr.score, 0)}</p>
                    <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Points Totaux</p>
                </div>
            </div>
        </div>
    );
}
