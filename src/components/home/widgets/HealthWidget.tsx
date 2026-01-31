"use client";

import { useHealth } from "@/hooks/useHealth";
import { Heart, Pill, CheckCircle2, ChevronRight, Activity, Smile, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays, parseISO, isSameDay, addDays, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthProvider";

export default function HealthWidget() {
    const { medications, profiles, medCompletions, toggleMedication } = useHealth();
    const { user } = useAuth();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const currentHour = now.getHours();
    const isAlertTime = currentHour >= 18;

    // Helper to calculate next occurrence from today
    const getNextOccurrence = (med: any): Date | null => {
        const start = parseISO(med.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (med.endDate && differenceInCalendarDays(today, parseISO(med.endDate)) > 0) return null;

        // If start date is in future, that's the next occurrence
        if (differenceInCalendarDays(start, today) > 0) return start;

        if (med.frequency === 'daily') return today;

        if (med.frequency === 'weekly') {
            const dayDiff = differenceInCalendarDays(today, start) % 7;
            if (dayDiff === 0) return today;
            const daysToAdd = 7 - dayDiff;
            const next = new Date(today);
            next.setDate(today.getDate() + daysToAdd);
            return next;
        }

        if (med.frequency === 'custom' && med.customDays) {
            const dayDiff = differenceInCalendarDays(today, start) % med.customDays;
            if (dayDiff === 0) return today;
            const daysToAdd = med.customDays - dayDiff;
            const next = new Date(today);
            next.setDate(today.getDate() + daysToAdd);
            return next;
        }

        if (med.frequency === 'yearly') {
            const next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
            if (differenceInCalendarDays(next, today) < 0) next.setFullYear(today.getFullYear() + 1);
            return next;
        }

        return null;
    };

    const upcomingMeds = medications
        .map(med => {
            const nextDate = getNextOccurrence(med);
            return { ...med, nextDate };
        })
        .filter(item => {
            if (!item.active || !item.nextDate) return false;

            // Filter: Next 30 days
            const diff = differenceInCalendarDays(item.nextDate, now);
            if (diff < 0 || diff > 30) return false;

            // Visibility Logic
            const profile = profiles.find(p => p.id === item.profileId);
            const isPersonal = !profile || !profile.userId || profile.userId === user?.uid;

            if (item.isPrivate && !isPersonal) return false;

            // Completion check for TODAY only. If it's today and done, we might want to hide it or keep it visible as done.
            // Requirement says "show items planned for next month WITH dates".
            // So we keep today's items.

            return true;
        })
        .sort((a, b) => a.nextDate!.getTime() - b.nextDate!.getTime());

    const visibleMeds = upcomingMeds;

    const categories = [
        { id: 'medication', label: 'Médicaments', icon: Pill },
        { id: 'pet_care', label: 'Soins Animaux', icon: Activity }
    ];

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500">
                        <Heart size={20} className="fill-rose-500" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Santé & Bien-être</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {isAlertTime ? "Alerte + 30 Jours" : "30 Jours à venir"}
                        </p>
                    </div>
                </div>
                <Link href="/health" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors">
                    <ChevronRight size={18} />
                </Link>
            </div>

            <div className="space-y-6">
                {categories.map(cat => {
                    const catMeds = visibleMeds.filter(m => (m.category || 'medication') === cat.id);
                    if (catMeds.length === 0) return null;

                    return (
                        <div key={cat.id} className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1">
                                <cat.icon size={10} />
                                {cat.label}
                            </span>
                            <div className="space-y-2">
                                {catMeds.slice(0, 3).map(med => { // Show max 3 per category
                                    const profile = profiles.find(p => p.id === med.profileId);

                                    // Check completion status IF it is today
                                    const isToday = isSameDay(med.nextDate!, new Date());
                                    const completionId = `${med.id}-${todayStr}-${med.times?.[0]?.replace(':', '') || ''}`;
                                    const isDone = isToday && medCompletions[completionId];

                                    const isAlert = isAlertTime && isToday && profile?.userId !== user?.uid && !isDone && !med.isPrivate;

                                    return (
                                        <button
                                            key={med.id}
                                            onClick={() => {
                                                // Only allow toggle if it's today
                                                if (isToday) {
                                                    toggleMedication(med.id, todayStr, med.times?.[0] || "08:00");
                                                } else {
                                                    alert("Vous ne pouvez valider que les traitements du jour.");
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-2 px-3 border rounded-2xl transition-all",
                                                isDone ? "bg-slate-50 dark:bg-slate-800/30 border-transparent opacity-60" :
                                                    isAlert ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50 animate-pulse" :
                                                        "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                                isDone ? "bg-slate-100 dark:bg-slate-800 text-slate-400" :
                                                    isAlert ? "bg-rose-500 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-500"
                                            )}>
                                                {isDone ? <CheckCircle2 size={16} /> : (cat.id === 'pet_care' ? <Activity size={16} /> : <Pill size={16} />)}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <h4 className={cn("font-bold text-xs truncate", isDone ? "text-slate-400 line-through" : "text-slate-800 dark:text-white")}>
                                                    {med.name}
                                                </h4>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter truncate flex items-center gap-1">
                                                    {profile?.name} • {med.times?.[0]}

                                                    {isToday ? (
                                                        <span className={cn("ml-1 px-1.5 py-0.5 rounded text-[8px]", isDone ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>
                                                            AUJ
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center ml-1 text-slate-400">
                                                            <Calendar size={8} className="mr-0.5" />
                                                            {format(med.nextDate!, "d MMM", { locale: fr })}
                                                        </span>
                                                    )}

                                                    {isAlert && <span className="ml-2 text-rose-500">⚠️ RETARD</span>}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {visibleMeds.length === 0 && (
                    <div className="py-4 text-center">
                        <Smile size={24} className="mx-auto text-slate-200 dark:text-slate-800 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 italic">Tout est calme pour le mois à venir !</p>
                    </div>
                )}
            </div>
        </div>
    );
}
