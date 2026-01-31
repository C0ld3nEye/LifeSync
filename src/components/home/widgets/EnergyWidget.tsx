"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Coffee, PartyPopper, Plane, Sofa } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { cn } from "@/lib/utils";

interface EnergyWidgetProps {
    household: any;
}

export default function EnergyWidget({ household }: EnergyWidgetProps) {
    const { updateHousehold } = useHousehold();
    const currentEnergy = household?.energyLevel || 'chill';

    const levels = [
        { id: 'chill', icon: Sofa, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950', label: 'Chill' },
        { id: 'work', icon: Coffee, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', label: 'Travail' },
        { id: 'productive', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950', label: 'Productif' },
        { id: 'party', icon: PartyPopper, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950', label: 'Fête' },
        { id: 'travel', icon: Plane, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950', label: 'Voyage' },
    ];

    const handleUpdate = async (id: string) => {
        await updateHousehold({ energyLevel: id as any });
    };

    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    return (
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                    <Sparkles size={18} className="text-amber-500" /> État du Foyer
                </h3>
            </div>

            <div className="flex justify-between gap-2">
                {levels.map((level) => {
                    const isActive = currentEnergy === level.id;
                    return (
                        <button
                            key={level.id}
                            onClick={() => handleUpdate(level.id)}
                            className="flex flex-col items-center gap-2 flex-1 group"
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                                isActive ? `${level.bg} ${level.color} scale-110 shadow-lg shadow-current/10 border-2 border-current/20` : "bg-slate-50 dark:bg-slate-800 text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            )}>
                                <level.icon size={22} className={cn(isActive ? "animate-pulse" : "group-hover:scale-110 transition-transform")} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-tighter transition-colors",
                                isActive ? "text-slate-900 dark:text-white" : "text-slate-400"
                            )}>
                                {level.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
}
