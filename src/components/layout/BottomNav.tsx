"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ShoppingCart, Utensils, CheckSquare, Wallet, Home, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const items = [
    { label: "Accueil", icon: Home, href: "/" },
    { label: "Agenda", icon: Calendar, href: "/agenda" },
    { label: "Repas", icon: Utensils, href: "/meals" },
    { label: "Santé", icon: Heart, href: "/health" },
    { label: "Courses", icon: ShoppingCart, href: "/shopping" },
    { label: "Tâches", icon: CheckSquare, href: "/chores" },
    { label: "Budget", icon: Wallet, href: "/budget" },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-area-bottom z-50 transition-colors">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center p-2 w-full h-full text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-bg"
                                    className="absolute inset-0 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-lg"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <item.icon
                                size={22}
                                className={cn(
                                    "z-10 transition-all",
                                    isActive ? "text-emerald-600 dark:text-emerald-400 scale-110 mb-0" : "mb-0"
                                )}
                            />
                            {isActive && (
                                <motion.span
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="z-10 text-[10px] font-bold mt-1 text-emerald-700 dark:text-emerald-300 whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
