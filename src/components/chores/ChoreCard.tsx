import { motion } from "framer-motion";
import { Check, Calendar, Repeat, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Chore } from "@/hooks/useChores";

interface ChoreCardProps {
    chore: Chore & { isHealth?: boolean; healthData?: any }; // Extended type for hybrid items
    compact?: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function ChoreCard({ chore, compact = false, onToggle, onEdit, onDelete }: ChoreCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
                "bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 group transition-all",
                compact ? "p-3" : "p-4",
                chore.done ? "opacity-60" : "hover:shadow-md"
            )}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={cn(
                    "flex-shrink-0 rounded-xl flex items-center justify-center transition-all",
                    compact ? "w-8 h-8" : "w-10 h-10",
                    chore.done
                        ? "bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                )}>
                <Check size={compact ? 16 : 20} strokeWidth={3} />
            </button>

            <div className="flex-1 min-w-0" onClick={onEdit}>
                <div className="flex justify-between items-start">
                    <p className={cn("font-bold text-slate-800 dark:text-slate-200 truncate pr-2", compact ? "text-sm" : "text-base", chore.done && "line-through text-slate-400")}>{chore.title}</p>
                    {chore.points > 0 && (
                        <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                            {chore.points} pts
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 mt-1 items-center">
                    {chore.dueDate && (
                        <span className={cn("flex items-center gap-1 font-bold",
                            new Date(chore.dueDate) < new Date() && !chore.done ? "text-rose-500" : "text-slate-400",
                            compact ? "text-[9px]" : "text-[10px]"
                        )}>
                            <Calendar size={compact ? 8 : 10} />
                            {format(new Date(chore.dueDate), "d MMM", { locale: fr })}
                        </span>
                    )}

                    {chore.frequency && chore.frequency !== 'once' && (
                        <span className={cn("flex items-center gap-1 font-bold text-purple-500 dark:text-purple-400", compact ? "text-[9px]" : "text-[10px]")}>
                            <Repeat size={compact ? 8 : 10} />
                        </span>
                    )}

                    {chore.assignees.length > 0 && (
                        <div className="flex -space-x-1">
                            {chore.assignees.map(uid => (
                                <div key={uid} className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-600 dark:text-slate-300 border border-white dark:border-slate-900">
                                    {uid.slice(0, 1).toUpperCase()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button onClick={() => { if (confirm("Supprimer ?")) onDelete(); }} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 px-2">
                <Trash2 size={16} />
            </button>
        </motion.div>
    );
}
