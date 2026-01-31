import { motion, AnimatePresence } from "framer-motion";
import { X, Package, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackAlertProps {
    score: number;
    onClick: () => void;
    onClose: () => void;
}

export default function PackAlert({ score, onClick, onClose }: PackAlertProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 z-40"
            >
                <div
                    onClick={onClick}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-1 shadow-2xl cursor-pointer group hover:scale-[1.02] transition-transform"
                >
                    <div className="bg-slate-900/40 backdrop-blur-md rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />

                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 animate-bounce">
                            <Package className="text-white" size={24} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-0.5">Pack Disponible !</p>
                            <p className="text-white font-black text-sm truncate">
                                Tu as {score} points
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center font-bold shadow-lg">
                                <ArrowRight size={16} />
                            </div>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="absolute top-2 right-2 p-1 text-white/50 hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
