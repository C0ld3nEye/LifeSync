import { motion } from "framer-motion";
import { X, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemCardProps {
    text: string;
    checked: boolean;
    onToggle: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    variant?: "manual" | "meal";
}

export function ItemCard({ text, checked, onToggle, onDelete, onEdit, variant = "manual" }: ItemCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "group flex items-center gap-3 p-4 rounded-2xl border transition-all",
                checked
                    ? "bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-60"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 shadow-sm"
            )}
        >
            <button
                onClick={onToggle}
                className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    checked
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : cn("border-slate-200 dark:border-slate-700", variant === "meal" ? "group-hover:border-orange-300" : "group-hover:border-emerald-300")
                )}
            >
                {checked && <Check size={14} strokeWidth={4} />}
            </button>
            <span
                onClick={onToggle}
                className={cn(
                    "flex-1 font-bold text-sm transition-all cursor-pointer",
                    checked ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"
                )}
            >
                {text}
            </span>
            <div className="flex gap-1 shrink-0">
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                    >
                        <Pencil size={16} />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
