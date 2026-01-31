"use client";

import { motion, Reorder, AnimatePresence } from "framer-motion";
import { X, GripVertical, Check, Layout, Sparkles, Star, Trophy, Wallet, Landmark, Calendar, PiggyBank, Clock, CheckSquare, TrendingUp, Utensils, Coffee, ShoppingCart, Plus, Minus, ArrowDown, Tag, Rocket, Bell, BellOff, Volume2, Heart, MessageSquare, ListChecks, Zap } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";


interface HomeSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ALL_WIDGETS = [
    // --- SOCIAL & IDENTITY ---
    { id: 'hero', label: 'Résumé & Points', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', description: 'Points, météo et résumé' },
    { id: 'leaderboard', label: 'Classement', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', description: 'Scores et badges' },
    { id: 'motto', label: 'Motto du Foyer', icon: Layout, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', description: 'Phrase du jour' },
    { id: 'projects', label: 'Projets de Vie', icon: Rocket, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', description: 'Déménagement, Voyages...' },
    { id: 'energy', label: 'Énergie', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', description: 'Vibe générale' },

    // --- COMMUNICATION ---
    { id: 'memos', label: 'Mémo Frigo', icon: MessageSquare, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', description: 'Post-its et petits mots' },
    { id: 'polls', label: 'Sondage Express', icon: ListChecks, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', description: 'Pizza ou Sushi ?' },

    // --- SANTÉ & DÉFIS ---
    { id: 'challenges', label: 'Défis du Foyer', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', description: 'Votre défi personnel quotidien' },
    { id: 'health', label: 'Santé & Médicaments', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', description: 'Suivi médical et rappels' },

    // --- AGENDA ---
    { id: 'agenda_today', label: 'Aujourd\'hui', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', description: 'Planning heure par heure' },
    { id: 'agenda', label: 'Prochainement', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', description: 'Futurs événements' },

    // --- REPAS ---
    { id: 'meals', label: 'Menu du Jour', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', description: 'Midi et Soir' },
    { id: 'meals_next', label: 'Prochain Repas', icon: Coffee, color: 'text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', description: 'Juste le prochain' },
    { id: 'shopping', label: 'Co-Shopping', icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', description: 'Liste de courses' },

    // --- TACHES ---
    { id: 'chores', label: 'Liste Tâches', icon: CheckSquare, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', description: 'À faire aujourd\'hui' },
    { id: 'chores_circle', label: 'Progression', icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', description: 'Jauge circulaire' },

    // --- BUDGET ---
    { id: 'budget', label: 'Budget Mensuel', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', description: 'Vue d\'ensemble' },
    { id: 'budget_balance', label: 'Reste à vivre', icon: Landmark, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', description: 'Votre solde réel' },
    { id: 'budget_next', label: 'Échéance', icon: Calendar, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', description: 'Prochain prélèvement' },
    { id: 'budget_savings', label: 'Épargne', icon: PiggyBank, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', description: 'Objectifs réserves' },
    { id: 'budget_price_watch', label: 'Veille Prix', icon: Tag, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', description: 'Suivez vos baisses de prix' },

    // --- UTILS ---
    { id: 'quick_actions', label: 'Actions Rapides', icon: Plus, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', description: 'Boutons d\'ajout rapide' },
    { id: 'ai_chat', label: 'Assistant IA', icon: Sparkles, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', description: 'Posez vos questions en direct' },
    { id: 'ai_humor', label: 'Inspo du Jour (IA)', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', description: 'Une petite phrase marrante par jour' },
];

export const DEFAULT_WIDGETS = ['hero', 'challenges', 'memos', 'polls', 'projects', 'agenda_today', 'meals', 'chores', 'budget_balance', 'ai_chat', 'shopping'];

export default function HomeSettings({ isOpen, onClose }: HomeSettingsProps) {
    const { user, signOut } = useAuth();
    const { household, updateMemberPreferences, updateAIWidgetConfig } = useHousehold();
    const [saving, setSaving] = useState(false);
    const currentWidgetsPrefRaw = household?.memberPreferences?.[user?.uid || '']?.widgets || DEFAULT_WIDGETS;
    // [MIGRATION] Map legacy 'ai_widget' to 'ai_chat'
    const currentWidgetsPref = currentWidgetsPrefRaw.map(id => id === 'ai_widget' ? 'ai_chat' : id);

    // Convert saved IDs to full objects for Reorder, but handle case where ID might not exist in ALL_WIDGETS
    const [activeWidgets, setActiveWidgets] = useState(() => {
        return currentWidgetsPref
            .map(id => ALL_WIDGETS.find(w => w.id === id))
            .filter((w): w is typeof ALL_WIDGETS[0] => !!w);
    });

    // Keep activeWidgets in sync with household
    // This fixed the "reset to default" bug by ensuring that once household data loads,
    // we use it to populate the list if we're not already in the middle of a change.
    useEffect(() => {
        if (household && user) {
            const mapped = currentWidgetsPref
                .map(id => ALL_WIDGETS.find(w => w.id === id))
                .filter((w): w is typeof ALL_WIDGETS[0] => !!w);

            // Only sync from household if the IDs themselves have changed in the source
            // to avoid resetting local reorders while the modal is open.
            const currentIds = activeWidgets.map(w => w.id);
            const prefIds = mapped.map(w => w.id);
            if (JSON.stringify(currentIds) !== JSON.stringify(prefIds) && !saving) {
                setActiveWidgets(mapped);
            }
        }
    }, [household, user, isOpen]);

    // Available are those NOT in active
    const availableWidgets = ALL_WIDGETS.filter(w => !activeWidgets.find(a => a.id === w.id));

    // Auto-save when activeWidgets changes
    useEffect(() => {
        const widgetIds = activeWidgets.map(w => w.id);
        const prefIds = (household?.memberPreferences?.[user?.uid || '']?.widgets || []).map(id => id === 'ai_widget' ? 'ai_chat' : id);

        if (JSON.stringify(widgetIds) !== JSON.stringify(prefIds) && user && household && activeWidgets.length > 0) {
            const timer = setTimeout(() => {
                updateMemberPreferences(user.uid, { widgets: widgetIds });
            }, 1000); // Debounce 1s
            return () => clearTimeout(timer);
        }
    }, [activeWidgets, user, household]);

    const handleSave = async () => {
        onClose();
    };

    const addWidget = async (widget: typeof ALL_WIDGETS[0]) => {
        const newWidgets = [...activeWidgets, widget];
        setActiveWidgets(newWidgets);
        // Optional: Auto-save or wait for manual save?
        // Let's stick to manual save for now but ensure state isn't lost.
    };

    const removeWidget = (id: string) => {
        setActiveWidgets(activeWidgets.filter(w => w.id !== id));
    };



    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-md"
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-slate-50 dark:bg-slate-950 w-full max-w-lg h-[92dvh] sm:h-[85vh] rounded-t-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative"
            >
                {/* Header */}
                <div className="pt-10 pb-4 px-6 sm:pt-6 flex justify-between items-center bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <Layout className="text-emerald-500" size={24} />
                            Widgets
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Personnalisez votre accueil</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth">



                    {/* SECTION 1: ACTIVE WIDGETS (REORDER) */}
                    <div>
                        <div className="flex justify-between items-end mb-4 px-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Check size={14} className="text-emerald-500" /> Ma Page d'Accueil ({activeWidgets.length})
                            </h3>
                            <p className="text-[10px] text-slate-400 italic">Maintenez pour réorganiser</p>
                        </div>

                        {activeWidgets.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                                <Layout className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-xs font-bold text-slate-400">Votre page est vide</p>
                                <p className="text-[10px] text-slate-400">Ajoutez des widgets ci-dessous</p>
                            </div>
                        ) : (
                            <Reorder.Group axis="y" values={activeWidgets} onReorder={setActiveWidgets} className="space-y-3">
                                {activeWidgets.map((widget) => (
                                    <Reorder.Item key={widget.id} value={widget} className="touch-none relative">
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 relative overflow-hidden group">
                                            {/* Drag Handle */}
                                            <div className="p-2 text-slate-200 dark:text-slate-700 cursor-grab active:cursor-grabbing">
                                                <GripVertical size={20} />
                                            </div>

                                            {/* Icon */}
                                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", widget.bg)}>
                                                <widget.icon className={widget.color} size={22} />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{widget.label}</p>
                                                <p className="text-[10px] font-medium text-slate-400 truncate">{widget.description}</p>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => removeWidget(widget.id)}
                                                className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center active:scale-90 transition-transform"
                                            >
                                                <Minus size={18} strokeWidth={3} />
                                            </button>
                                        </div>

                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        )}
                    </div>

                    {/* DIVIDER */}
                    <div className="relative py-4 flex items-center justify-center">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 w-full absolute" />
                        <span className="relative z-10 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <ArrowDown size={14} /> Bibliothèque
                        </span>
                    </div>

                    {/* SECTION 2: AVAILABLE WIDGETS (ADD) */}
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
                            Bibliothèque ({availableWidgets.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-10">
                            {availableWidgets.map((widget) => (
                                <button
                                    key={widget.id}
                                    onClick={() => addWidget(widget)}
                                    className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 hover:border-emerald-500/50 transition-colors text-left group"
                                >
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", widget.bg)}>
                                        <widget.icon className={widget.color} size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 dark:text-white text-xs">{widget.label}</p>
                                        <p className="text-[9px] font-medium text-slate-400 truncate">{widget.description}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus size={16} strokeWidth={3} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Fixed */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t dark:border-slate-800 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                        <Check size={18} /> Terminer
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
