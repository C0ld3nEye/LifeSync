"use client";

import { motion } from "framer-motion";
import { Clock, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { format, isToday, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface AgendaTodayWidgetProps {
    events: any[];
}

export default function AgendaTodayWidget({ events }: AgendaTodayWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    const today = new Date();
    const todayEvents = events
        .filter(e => {
            const start = startOfDay(parseISO(e.start));
            const end = endOfDay(parseISO(e.end));
            return isWithinInterval(today, { start, end });
        })
        .sort((a, b) => a.start.localeCompare(b.start));

    return (
        <motion.div variants={item}>
            <Link href="/agenda" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <Calendar size={80} />
                </div>

                <div className="flex justify-between items-center mb-5 relative z-10">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <Clock size={18} className="text-blue-500" /> Agenda du Jour
                    </h3>
                    <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase">Aujourd'hui</span>
                </div>

                <div className="space-y-4 relative z-10">
                    {todayEvents.length > 0 ? todayEvents.map(event => (
                        <div key={event.id} className="flex gap-4 items-start group/event">
                            <div className="pt-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 group-hover/event:scale-150 transition-transform" />
                            </div>
                            <div className="flex-1">
                                {!(event.allDay || event.type === 'birthday') && (
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{format(parseISO(event.start), "HH:mm")}</p>
                                )}
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                                    {event.type === 'birthday' ? `🎂 Anniversaire : ${event.title}` : event.title}
                                </p>
                                {event.description && <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{event.description}</p>}
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-4 gap-2 opacity-60">
                            <CheckCircle2 size={24} className="text-emerald-500" />
                            <p className="text-xs text-slate-400 font-bold uppercase italic">Journée tranquille !</p>
                        </div>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}
