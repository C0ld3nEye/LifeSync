"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Share, PlusSquare, X, Download, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PWAInstallBanner() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<"ios" | "android" | "other" | null>(null);

    useEffect(() => {
        // 1. Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        // 2. Check if dismissed
        const isDismissed = localStorage.getItem("pwa-banner-dismissed");
        if (isDismissed) return;

        // 3. Detect platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform("ios");
        } else if (/android/.test(userAgent)) {
            setPlatform("android");
        } else {
            setPlatform("other");
        }

        // 4. Show banner with a slight delay
        const timer = setTimeout(() => setIsVisible(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem("pwa-banner-dismissed", "true");
    };

    if (pathname?.startsWith("/budget")) return null;
    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-4 right-4 z-50"
            >
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />

                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                            <img src="/logo.png" alt="LifeSync" className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Installer LifeSync</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                                {platform === "ios"
                                    ? "Appuie sur 'Partager' puis 'Sur l'écran d'accueil' pour activer les rappels."
                                    : "Ajoute l'app sur ton écran d'accueil pour une expérience optimale et les notifications."}
                            </p>
                        </div>

                        <button
                            onClick={dismiss}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {platform === "ios" && (
                        <div className="mt-3 flex items-center justify-center gap-4 py-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                <Share size={14} className="text-blue-500" /> Partager
                            </div>
                            <div className="text-slate-300 dark:text-slate-700">|</div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                <PlusSquare size={14} className="text-emerald-500" /> Sur l'écran d'accueil
                            </div>
                        </div>
                    )}

                    {platform !== "ios" && (
                        <div className="mt-3">
                            <button
                                onClick={() => alert("Utilise le menu de ton navigateur pour installer l'application.")}
                                className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Installer l'app
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
