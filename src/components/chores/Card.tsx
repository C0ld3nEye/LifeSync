import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimalCard, RARITY_CONFIG } from "@/lib/collection";
import { Lock, X } from "lucide-react";

interface CardProps {
    card: AnimalCard;
    count: number;
    size?: "sm" | "md" | "lg" | "xl";
    onClick?: () => void;
    showDetails?: boolean;
}

export const Card = ({ card, count, size = "md", onClick, showDetails = false }: CardProps) => {
    const isLocked = count === 0;
    const config = RARITY_CONFIG[card.rarity];

    const sizeClasses = {
        sm: "w-20 h-28 text-2xl",
        md: "w-28 h-40 text-4xl",
        lg: "w-40 h-56 text-6xl",
        xl: "w-64 h-80 text-8xl"
    };

    return (
        <motion.div
            layout // Enable layout animation for grid reordering
            whileHover={!isLocked ? { scale: 1.05, rotate: 2, y: -5 } : {}}
            whileTap={!isLocked ? { scale: 0.95 } : {}}
            onClick={onClick}
            className={cn(
                "relative rounded-xl shadow-md border-2 overflow-hidden cursor-pointer transition-all flex flex-col group items-center justify-center bg-white dark:bg-slate-800",
                sizeClasses[size],
                isLocked ? "border-slate-200 dark:border-slate-800 grayscale opacity-60" : `border-${config.color}-500 shadow-${config.color}-500/30`
            )}
            style={{
                borderColor: isLocked ? undefined : undefined // Tailwind dynamic classes might need safelist or explicit style if config.color is variable
            }}
        >
            {/* Rarity Glow (only if unlocked) */}
            {!isLocked && (
                <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", `from-${config.color}-400 to-${config.color}-600`)} />
            )}

            {/* Image or Icon */}
            {card.image ? (
                <div className="absolute inset-0 z-0">
                    <img
                        src={card.image}
                        alt={card.name}
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                            isLocked ? "grayscale opacity-50" : ""
                        )}
                    />
                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
            ) : (
                <div className="z-10 relative drop-shadow-md transform transition-transform group-hover:scale-110 duration-300">
                    {isLocked ? <Lock className="text-slate-300 mx-auto" size={size === 'sm' ? 16 : 24} /> : card.icon}
                </div>
            )}

            {/* Locked Overlay Icon if Image exists */}
            {isLocked && card.image && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                    <Lock className="text-white/80 drop-shadow-md" size={size === 'sm' ? 24 : 40} />
                </div>
            )}

            {/* Name (if not small) */}
            {size !== 'sm' && (
                <div className={cn(
                    "absolute bottom-0 inset-x-0 p-2 text-center z-10",
                    isLocked ? "bg-slate-100 dark:bg-slate-800" : `bg-${config.color}-500 text-white`
                )}>
                    <p className="text-[10px] font-black uppercase tracking-wider truncate">
                        {isLocked ? "???" : card.name}
                    </p>
                </div>
            )}

            {/* Count Badge */}
            {count > 1 && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-sm border border-white">
                    x{count}
                </div>
            )}

            {/* Rarity Badge Top Left */}
            {!isLocked && size !== 'sm' && (
                <div className={cn("absolute top-2 left-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded text-white bg-black/20 backdrop-blur-sm")}>
                    {config.label}
                </div>
            )}
        </motion.div>
    );
}


export const CardDetails = ({ card, count, onClose, onTrade, hideDetails = false }: { card: AnimalCard, count: number, onClose: () => void, onTrade?: () => void, hideDetails?: boolean }) => {
    const config = RARITY_CONFIG[card.rarity];
    const isSpecial = ['totem', 'legendary'].includes(card.rarity);
    const isEpic = card.rarity === 'epic';
    const canTrade = count >= 6 && ['common', 'rare', 'epic'].includes(card.rarity);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
            onClick={onClose}
        >
            {/* Ambient Rarity Glow Background */}
            <div className={cn("absolute inset-0 z-0 opacity-40 bg-radial-gradient from-transparent via-transparent to-transparent")} style={{
                background: `radial-gradient(circle at center, ${config.color === 'slate' ? '#94a3b8' : config.color} 0%, transparent 70%)`
            }} />

            {/* GOD RAYS for Totem/Legendary */}
            {isSpecial && (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute z-0 w-[200vw] h-[200vw] opacity-10"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0deg, ${config.color} 20deg, transparent 40deg, ${config.color} 60deg, transparent 80deg, ${config.color} 100deg, transparent 120deg, ${config.color} 140deg, transparent 160deg)`,
                    }}
                />
            )}

            {/* Sparkles for Epic */}
            {isEpic && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className={cn("absolute w-1 h-1 rounded-full", `bg-${config.color}-400`)}
                            initial={{
                                x: Math.random() * window.innerWidth,
                                y: Math.random() * window.innerHeight,
                                opacity: 0
                            }}
                            animate={{
                                y: [null, Math.random() * -100],
                                opacity: [0, 1, 0]
                            }}
                            transition={{
                                duration: 2 + Math.random() * 3,
                                repeat: Infinity,
                                repeatDelay: Math.random() * 2
                            }}
                        />
                    ))}
                </div>
            )}

            <motion.div
                initial={{ scale: 0.9, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 50, opacity: 0 }}
                transition={{ type: "spring", damping: 20 }}
                className="relative z-10 max-w-md w-full flex flex-col items-center"
                onClick={e => e.stopPropagation()}
            >
                {/* Floating Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/20"
                >
                    <X size={24} />
                </button>

                {/* Hero Card */}
                <div className="relative mb-8">
                    {/* Shadow/Glow behind card */}
                    <div className={cn("absolute inset-0 blur-2xl opacity-50 transform scale-90 translate-y-4", `bg-${config.color}-500`)} />
                    <Card card={card} count={count} size="xl" />
                </div>

                {/* Info Container */}
                <div className="text-center space-y-6 w-full px-4">

                    {/* Header Info */}
                    <div>
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className={cn("inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-white/20 backdrop-blur-md shadow-lg", `bg-${config.color}-500/80 text-white`)}
                        >
                            {config.label}
                        </motion.div>
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl md:text-5xl font-black text-white drop-shadow-lg"
                        >
                            {card.name}
                        </motion.h2>
                    </div>

                    {/* Description Pill - Hidden if hideDetails is true */}
                    {hideDetails ? (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/5 flex flex-col items-center gap-3"
                        >
                            <Lock size={32} className="text-white/20" />
                            <p className="text-sm text-white/40 italic font-medium">
                                Les détails de cette carte sont secrets
                            </p>
                            <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">
                                Débloque-la pour en savoir plus
                            </p>
                        </motion.div>
                    ) : (
                        <>
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl"
                            >
                                <p className="text-sm md:text-base text-white/90 font-medium leading-relaxed italic">
                                    "{card.description}"
                                </p>
                            </motion.div>

                            {/* Fun Fact Pill */}
                            {card.funFact && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md p-5 rounded-3xl border border-yellow-500/20 text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <span className="text-4xl">💡</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-yellow-300 mb-2 flex items-center gap-2">
                                        <span className="bg-yellow-400 text-yellow-950 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">!</span>
                                        Le saviez-vous ?
                                    </p>
                                    <p className="text-xs md:text-sm text-white/80 font-bold leading-relaxed">
                                        {card.funFact}
                                    </p>
                                </motion.div>
                            )}

                            {/* Trade Button Logic */}
                            {canTrade && onTrade && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <button
                                        onClick={onTrade}
                                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-4 px-6 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all mb-4 border border-white/20"
                                    >
                                        <span className="block text-xs opacity-80 uppercase tracking-wider mb-1">5 doublons disponibles</span>
                                        <span className="flex items-center justify-center gap-2">
                                            ♻️ Echanger 5 contre 1 rareté supérieure
                                        </span>
                                    </button>
                                </motion.div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

