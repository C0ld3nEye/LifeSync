"use client";

import { motion } from "framer-motion";
import { Calendar, ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface AgendaWidgetProps {
    nextEvents: any[];
}

export default function AgendaWidget({ nextEvents }: AgendaWidgetProps) {
    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    return (
        <motion.div variants={item}>
            <Link href="/agenda" className="block bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                        <Calendar size={18} className="text-blue-500" /> Prochainement
                    </h3>
                    <ArrowUpRight size={18} className="text-slate-300 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>

                <div className="space-y-3">
                    {nextEvents.length > 0 ? nextEvents.map(event => (
                        <div key={event.id} className="flex gap-4 items-center">
                            <div className="flex-shrink-0 w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-blue-500 uppercase">{format(parseISO(event.start), "MMM", { locale: fr })}</span>
                                <span className="text-lg font-black leading-none text-slate-700 dark:text-slate-200">{format(parseISO(event.start), "dd")}</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-1">
                                    {event.type === 'birthday' ? `🎂 Anniversaire : ${event.title}` : event.title}
                                </p>
                                {!(event.allDay || event.type === 'birthday') && (
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock size={10} /> {format(parseISO(event.start), "HH:mm")}
                                    </p>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-slate-400 italic text-center py-2">Rien de prévu pour le moment</p>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}
