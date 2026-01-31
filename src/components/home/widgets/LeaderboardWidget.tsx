"use client";

import { motion } from "framer-motion";
import { Trophy, Star } from "lucide-react";
import { HouseholdData } from "@/hooks/useHousehold";
import { cn } from "@/lib/utils";

interface LeaderboardWidgetProps {
    household: HouseholdData;
}

export default function LeaderboardWidget({ household }: LeaderboardWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    // Sort members by score
    const membersWithScores = household.members.map(uid => ({
        uid,
        score: household.scores?.[uid] || 0,
        profile: household.memberProfiles?.find(p => p.uid === uid)
    })).sort((a, b) => b.score - a.score);

    return (
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                    <Trophy size={18} className="text-purple-500" /> Classement
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ce mois</span>
            </div>

            <div className="space-y-4">
                {membersWithScores.map((member, idx) => (
                    <div key={member.uid} className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs",
                            idx === 0 ? "bg-yellow-100 text-yellow-600 shadow-sm" :
                                idx === 1 ? "bg-slate-100 text-slate-600" :
                                    idx === 2 ? "bg-orange-100 text-orange-600" :
                                        "bg-slate-50 text-slate-400"
                        )}>
                            {idx + 1}
                        </div>

                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {member.profile?.displayName || "Membre"}
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{member.score}</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
