"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSmartMeal } from "@/hooks/useSmartMeal";
import { AnimatePresence, motion } from "framer-motion";
import { ChefHat, Settings, Loader, Sparkles, RefreshCw, Trash2, Clock, Flame, X, Lightbulb, ChevronLeft, ChevronRight, Copy, Check, EyeOff, MessageSquare, ListTodo, Plus, HelpCircle, Search, Archive, Snowflake, Box, Calendar, Scale, AlertTriangle, Wind, Leaf, Share2 } from "lucide-react";
import InfoModal from "@/components/ui/InfoModal";
import { cn } from "@/lib/utils";
import { Recipe } from "@/types/smartmeal";
import { useHousehold } from "@/hooks/useHousehold";
import { format, startOfWeek, addDays, endOfWeek, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function MealsPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-400"><Loader className="animate-spin" /></div>}>
            <MealsContent />
        </Suspense>
    );
}

function MealsContent() {
    const { household, updatePreferences, updateMemberPreferences } = useHousehold();
    const {
        menu,
        loading,
        generating,
        currentWeekStart,
        changeWeek,
        generateSlot,
        generateWeek,
        updateSlot,
        copyPreviousWeek,
    } = useSmartMeal();
    const [activeTab, setActiveTab] = useState<'planning' | 'config'>('planning');
    const [viewSlot, setViewSlot] = useState<{ day: string, type: 'Midi' | 'Soir', mealIdx?: number } | null>(null);
    const [configSlot, setConfigSlot] = useState<{ day: string, type: 'Midi' | 'Soir' } | null>(null);
    const [showWeekConfig, setShowWeekConfig] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'shopping') {
            setActiveTab('planning');
        } else if (tab === 'config') {
            setActiveTab('config');
        }
    }, [searchParams]);



    // Helper to get date for a day name within the displayed week
    const getWeekDate = (dayName: string) => {
        const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        const idx = days.indexOf(dayName.toLowerCase());
        if (idx === -1) return new Date();
        return addDays(currentWeekStart, idx);
    };

    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

    if (loading) return <div className="h-screen flex items-center justify-center text-slate-400"><Loader className="animate-spin" /></div>;

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 transition-colors">
            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="SmartMeal Pro"
                description="Génération intelligente de repas avec respect strict des stocks et des saisons."
                accentColor="orange"
                items={[
                    { title: "Génération Globale", description: "Une seule demande à l'IA pour planifier toute votre semaine intelligemment.", icon: Sparkles, color: "orange" },
                    { title: "Règle des Restes", description: "L'IA double les doses du soir pour vos déjeuners du lendemain si l'option est active.", icon: RefreshCw, color: "blue" },
                    { title: "Ustensiles & Saisons", description: "Priorité à l'Air Fryer et aux légumes de saison pour une cuisine saine.", icon: Leaf, color: "emerald" }
                ]}
                tips={[
                    "L'IA calcule désormais les quantités totales pour tout le foyer (ex: 320g de pâtes pour 4 pers).",
                    "Les slots 'RESTES' sont automatiquement bloqués pour éviter les doubles générations."
                ]}
            />
            {!household && !loading && (
                <div className="bg-red-500 text-white p-2 text-center text-sm font-bold">⚠️ Aucun foyer détecté. Retournez à l'accueil pour configurer.</div>
            )}
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-30 shadow-sm border-b border-slate-100 dark:border-slate-800 transition-colors">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeWeek(-1)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
                            <ChefHat className="text-orange-500" /> SmartMeal
                        </h1>
                        <button onClick={() => setShowHelp(true)} className="text-slate-300 hover:text-orange-500 transition-colors">
                            <HelpCircle size={18} />
                        </button>
                        <button onClick={() => changeWeek(1)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="text-xs text-slate-400 font-medium ml-1">
                        Semaine du {format(currentWeekStart, "d MMM", { locale: fr })} au {format(currentWeekEnd, "d MMM", { locale: fr })}
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl items-center gap-2">
                    <button onClick={() => setActiveTab('planning')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition", activeTab === 'planning' ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-400")}>Planning</button>
                    <button onClick={() => setActiveTab('config')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition", activeTab === 'config' ? "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 shadow-sm" : "text-slate-400")}>Config</button>
                </div>

                {
                    activeTab === 'planning' && (
                        <div className="flex justify-end gap-2 mt-3">
                            <button onClick={copyPreviousWeek} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Copier semaine précédente">
                                <Copy size={16} />
                            </button>
                            <button onClick={generateWeek} disabled={!!generating} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800 transition flex items-center gap-2">
                                {generating ? <Loader className="animate-spin" size={14} /> : <Sparkles size={14} />} <span>Générer</span>
                            </button>
                            <button onClick={() => setShowWeekConfig(true)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2">
                                <Settings size={14} /> <span>Préparer</span>
                            </button>
                        </div>
                    )
                }
            </header >

            {/* Content */}
            < div className="p-4 space-y-4" >
                {
                    activeTab === 'planning' && (
                        <div className="space-y-4">
                            {DAYS.map(day => {
                                const dayData = menu[day];
                                if (!dayData) return null;
                                const date = getWeekDate(day);
                                return (
                                    <div key={day} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                                        <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{day}</span>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{format(date, 'd MMM', { locale: fr })}</span>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {['Midi', 'Soir'].map(type => {
                                                const slot = dayData[type as 'Midi' | 'Soir'];
                                                const isGen = generating === `${day}-${type}` || (generating === 'FULL' && !slot.recipe && !slot.isIgnored && slot.mode !== 'leftover' && slot.mode !== 'split');
                                                return (
                                                    <div key={type} className="p-4 flex gap-4">
                                                        <span className="text-xs font-bold text-slate-400 uppercase w-8 pt-1">{type}</span>
                                                        <div className="flex-1">
                                                            {isGen ? (
                                                                <div className="flex items-center gap-2 text-orange-500 text-sm font-bold max-w-fit px-3 py-1 bg-orange-50 dark:bg-orange-900/30 rounded-lg animate-pulse">
                                                                    <Loader className="animate-spin" size={14} /> Chef cuisine...
                                                                </div>
                                                            ) : slot.isIgnored ? (
                                                                <div className="flex items-center gap-2 text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                                                                    <EyeOff size={16} />
                                                                    <span className="text-sm">Repas sauté</span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); updateSlot(day, type as any, { isIgnored: false }); }}
                                                                        className="ml-auto p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400"
                                                                        title="Rétablir"
                                                                    >
                                                                        <RefreshCw size={12} />
                                                                    </button>
                                                                </div>
                                                            ) : slot.mode === 'split' ? (
                                                                <div className="space-y-3">
                                                                    {(slot.meals || []).map((m, idx) => (
                                                                        <div key={idx} className="flex gap-3 items-start group">
                                                                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer" onClick={() => setViewSlot({ day, type: type as any, mealIdx: idx })}>
                                                                                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex gap-2 items-center">
                                                                                    {m.recipe?.recipeName || "Sans titre"}
                                                                                </h3>
                                                                                <p className="text-[10px] text-slate-500 line-clamp-1 italic">{m.recipe?.description}</p>
                                                                                <div className="flex gap-1 mt-2">
                                                                                    {m.attendees.map(uid => {
                                                                                        const member = household?.memberProfiles?.find(p => p.uid === uid);
                                                                                        return member ? (
                                                                                            <div key={uid} className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                                                                {member.displayName[0]}
                                                                                            </div>
                                                                                        ) : null;
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                            <div className="pt-1 flex flex-col gap-1">
                                                                                <button onClick={() => setConfigSlot({ day, type: type as any })} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"><Settings size={12} /></button>
                                                                                <button onClick={() => updateSlot(day, type as any, { meals: slot.meals?.filter((_, i) => i !== idx) })} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-300 hover:text-red-500"><Trash2 size={12} /></button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : slot.recipe ? (
                                                                <div onClick={() => setViewSlot({ day, type: type as any })} className="group cursor-pointer">
                                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex gap-2 items-center">
                                                                        {slot.recipe.recipeName}
                                                                        {slot.isExpress && <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 px-1 rounded flex items-center"><Clock size={10} className="mr-0.5" /> 15'</span>}
                                                                    </h3>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1">{slot.recipe.description}</p>
                                                                    <div className="flex gap-2 mt-2">
                                                                        <button onClick={(e) => { e.stopPropagation(); setConfigSlot({ day, type: type as any }); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"><Settings size={14} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); generateSlot(day, type as any); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"><RefreshCw size={14} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); updateSlot(day, type as any, { recipe: null }); }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => generateSlot(day, type as any)}
                                                                        className="flex-1 text-sm font-bold text-slate-400 flex items-center gap-2 hover:text-orange-500 transition border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 justify-center hover:border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/10"
                                                                    >
                                                                        <Sparkles size={14} /> Suggérer
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfigSlot({ day, type: type as any })}
                                                                        className="p-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-300 hover:text-slate-500 hover:border-slate-300 transition"
                                                                    >
                                                                        <Settings size={18} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                }



                {
                    activeTab === 'config' && (
                        <div className="space-y-6">
                            {/* Common Dislikes */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                        <ChefHat className="text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Ingrédients Interdits (Foyer)</h3>
                                        <p className="text-sm text-slate-400">Pour toute la famille.</p>
                                    </div>
                                </div>

                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem('ingredient') as HTMLInputElement;
                                        const val = input.value.trim();
                                        if (val && household) {
                                            const current = household.preferences?.forbiddenIngredients || [];
                                            if (!current.includes(val)) {
                                                updatePreferences({ forbiddenIngredients: [...current, val] });
                                            }
                                            input.value = "";
                                        }
                                    }}
                                    className="flex gap-2 mb-4"
                                >
                                    <input name="ingredient" placeholder="Ex: Champignons..." className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 dark:text-slate-200 rounded-xl font-bold outline-orange-500" />
                                    <button type="submit" className="bg-slate-800 dark:bg-slate-700 text-white px-4 rounded-xl font-bold hover:bg-slate-900 transition">Ajouter</button>
                                </form>

                                <div className="flex flex-wrap gap-2">
                                    {(household?.preferences?.forbiddenIngredients || []).map(ing => (
                                        <div key={ing} className="bg-slate-100 dark:bg-slate-800 pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{ing}</span>
                                            <button onClick={() => updatePreferences({ forbiddenIngredients: household!.preferences!.forbiddenIngredients!.filter(i => i !== ing) })} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md text-slate-400 hover:text-red-500 transition"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Per-Member Dislikes */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                        <Settings className="text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Préférences Individuelles</h3>
                                        <p className="text-sm text-slate-400">Gérez ce que chaque membre ne veut pas manger.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {household?.memberProfiles?.map(member => {
                                        const dislikes = household.memberPreferences?.[member.uid]?.dislikes || [];
                                        return (
                                            <div key={member.uid} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                            {member.displayName[0]}
                                                        </div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{member.displayName}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">DÉGOÛTS (PRÉFÉRENCES)</label>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {dislikes.map(d => (
                                                                <div key={d} className="bg-white dark:bg-slate-900 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1 border border-slate-200 dark:border-slate-700 group">
                                                                    {d}
                                                                    <button
                                                                        onClick={() => updateMemberPreferences(member.uid, { dislikes: dislikes.filter(i => i !== d) })}
                                                                        className="text-slate-300 hover:text-red-500 transition"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                const input = (e.target as HTMLFormElement).elements.namedItem(`dislike-${member.uid}`) as HTMLInputElement;
                                                                const val = input.value.trim();
                                                                if (val && !dislikes.includes(val)) {
                                                                    updateMemberPreferences(member.uid, { dislikes: [...dislikes, val] });
                                                                    input.value = "";
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-2 py-1 border border-slate-200 dark:border-slate-700"
                                                        >
                                                            <input
                                                                name={`dislike-${member.uid}`}
                                                                placeholder="Ajouter un dégoût..."
                                                                className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-400 flex-1 py-1"
                                                            />
                                                            <button type="submit" className="p-1 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition">
                                                                <Plus size={14} strokeWidth={3} />
                                                            </button>
                                                        </form>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                                            <X size={10} className="text-red-500" /> ALLERGIES (STRICT)
                                                        </label>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {(household.memberPreferences?.[member.uid]?.allergies || []).map(a => (
                                                                <div key={a} className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg text-[10px] font-black text-red-600 dark:text-red-400 flex items-center gap-1 border border-red-100 dark:border-red-900/30 group">
                                                                    {a}
                                                                    <button
                                                                        onClick={() => {
                                                                            const cur = household.memberPreferences?.[member.uid]?.allergies || [];
                                                                            updateMemberPreferences(member.uid, { allergies: cur.filter(i => i !== a) });
                                                                        }}
                                                                        className="text-red-300 hover:text-red-500 transition"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                const input = (e.target as HTMLFormElement).elements.namedItem(`allergy-${member.uid}`) as HTMLInputElement;
                                                                const val = input.value.trim();
                                                                const cur = household.memberPreferences?.[member.uid]?.allergies || [];
                                                                if (val && !cur.includes(val)) {
                                                                    updateMemberPreferences(member.uid, { allergies: [...cur, val] });
                                                                    input.value = "";
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 bg-red-50/50 dark:bg-red-900/10 rounded-xl px-2 py-1 border border-red-100/50 dark:border-red-900/20"
                                                        >
                                                            <input
                                                                name={`allergy-${member.uid}`}
                                                                placeholder="Ajouter allergie..."
                                                                className="bg-transparent border-none outline-none text-[10px] font-bold text-red-400 placeholder:text-red-200 flex-1 py-1"
                                                            />
                                                            <button type="submit" className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition">
                                                                <Plus size={14} strokeWidth={3} />
                                                            </button>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Kitchen Tools */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                        <Flame className="text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Mes Ustensiles</h3>
                                        <p className="text-sm text-slate-400">Activez les appareils que vous possédez.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {[
                                        "Air Fryer", "Cookeo", "Four", "Plaques", "Micro-ondes", "Vapeur", "Thermomix", "Presse"
                                    ].map(tool => {
                                        const isSelected = household?.preferences?.kitchenTools?.includes(tool);
                                        return (
                                            <button
                                                key={tool}
                                                onClick={() => {
                                                    const current = household?.preferences?.kitchenTools || [];
                                                    const next = isSelected ? current.filter(t => t !== tool) : [...current, tool];
                                                    updatePreferences({ kitchenTools: next });
                                                }}
                                                className={cn(
                                                    "p-4 rounded-2xl border-2 transition-all font-bold text-sm text-center",
                                                    isSelected
                                                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-200 shadow-md"
                                                        : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400"
                                                )}
                                            >
                                                {tool}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Slot Config Modal */}
            <AnimatePresence>
                {
                    configSlot && (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfigSlot(null)}>
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative border dark:border-slate-800"
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setConfigSlot(null)}
                                    className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition z-10"
                                >
                                    <X size={20} />
                                </button>

                                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 pr-10">{configSlot.day} - {configSlot.type}</h2>
                                <p className="text-sm text-slate-400 mb-8 font-medium">Configure ce repas spécifique avant de le générer.</p>

                                <div className="space-y-8 pb-8">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Qui mange ?</label>
                                            {menu[configSlot.day][configSlot.type].mode !== 'split' && (
                                                <button
                                                    onClick={() => {
                                                        const slot = menu[configSlot.day][configSlot.type];
                                                        const currentAttendees = slot.attendees?.length ? slot.attendees : (household?.members || []);
                                                        updateSlot(configSlot.day, configSlot.type, {
                                                            mode: 'split',
                                                            meals: [
                                                                { recipe: slot.recipe || null, attendees: currentAttendees },
                                                                { recipe: null, attendees: [] }
                                                            ]
                                                        });
                                                    }}
                                                    className="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition flex items-center gap-1"
                                                >
                                                    <Copy size={12} /> Diviser ce repas
                                                </button>
                                            )}
                                        </div>

                                        {menu[configSlot.day][configSlot.type].mode === 'split' ? (
                                            <div className="space-y-4">
                                                {(menu[configSlot.day][configSlot.type].meals || []).map((m, idx) => (
                                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-slate-100 dark:border-slate-800">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Plat alternative {idx + 1}</span>
                                                            <button onClick={() => {
                                                                const currentMeals = menu[configSlot.day][configSlot.type].meals || [];
                                                                const nextMeals = currentMeals.filter((_, i) => i !== idx);
                                                                if (nextMeals.length <= 1) {
                                                                    updateSlot(configSlot.day, configSlot.type, {
                                                                        mode: 'single',
                                                                        meals: [],
                                                                        attendees: nextMeals[0]?.attendees || [],
                                                                        recipe: nextMeals[0]?.recipe || null
                                                                    });
                                                                } else {
                                                                    updateSlot(configSlot.day, configSlot.type, { meals: nextMeals });
                                                                }
                                                            }} className="text-slate-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg hover:text-red-500"><X size={14} /></button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {household?.memberProfiles?.map(member => {
                                                                const isSel = m.attendees.includes(member.uid);
                                                                return (
                                                                    <button
                                                                        key={member.uid}
                                                                        onClick={() => {
                                                                            const nextMeals = [...(menu[configSlot.day][configSlot.type].meals || [])];
                                                                            nextMeals[idx].attendees = isSel
                                                                                ? nextMeals[idx].attendees.filter(u => u !== member.uid)
                                                                                : [...nextMeals[idx].attendees, member.uid];
                                                                            updateSlot(configSlot.day, configSlot.type, { meals: nextMeals });
                                                                        }}
                                                                        className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all",
                                                                            isSel ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400"
                                                                        )}
                                                                    >
                                                                        {member.displayName[0]}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => {
                                                        const nextMeals = [...(menu[configSlot.day][configSlot.type].meals || []), { recipe: null, attendees: [] }];
                                                        updateSlot(configSlot.day, configSlot.type, { meals: nextMeals });
                                                    }}
                                                    className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 text-sm font-bold hover:border-orange-300 hover:text-orange-400 transition bg-slate-50/50 dark:bg-slate-800/30"
                                                >
                                                    + Ajouter un repas alternatif
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-3">
                                                {household?.memberProfiles?.map(member => {
                                                    const attendees = menu[configSlot.day][configSlot.type].attendees || [];
                                                    const isSelected = attendees.length === 0 ? true : attendees.includes(member.uid);
                                                    return (
                                                        <button
                                                            key={member.uid}
                                                            onClick={() => {
                                                                const current = menu[configSlot.day][configSlot.type].attendees || [];
                                                                const currentList = current.length === 0 ? household.members : current;
                                                                const next = isSelected
                                                                    ? currentList.filter(id => id !== member.uid)
                                                                    : [...currentList, member.uid];
                                                                updateSlot(configSlot.day, configSlot.type, { attendees: next });
                                                            }}
                                                            className={cn(
                                                                "px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2",
                                                                isSelected
                                                                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                                                                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-orange-200"
                                                            )}
                                                        >
                                                            {member.displayName}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block">Options</label>
                                        <button
                                            onClick={() => updateSlot(configSlot.day, configSlot.type, { isBasic: !menu[configSlot.day][configSlot.type].isBasic })}
                                            className={cn(
                                                "w-full p-4 rounded-3xl border-2 flex items-center justify-between transition-all group mb-3",
                                                menu[configSlot.day][configSlot.type].isBasic
                                                    ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-xl", menu[configSlot.day][configSlot.type].isBasic ? "bg-white/20" : "bg-white dark:bg-slate-700 shadow-sm")}>
                                                    <ChefHat size={20} className={menu[configSlot.day][configSlot.type].isBasic ? "text-white" : "text-blue-500"} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-sm">Mode Basique</p>
                                                    <p className={cn("text-[10px] font-medium opacity-70")}>Recettes simples, ingrédients standards</p>
                                                </div>
                                            </div>
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", menu[configSlot.day][configSlot.type].isBasic ? "border-white" : "border-slate-200 dark:border-slate-600")}>
                                                {menu[configSlot.day][configSlot.type].isBasic && <Check size={12} />}
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => updateSlot(configSlot.day, configSlot.type, { isExpress: !menu[configSlot.day][configSlot.type].isExpress })}
                                            className={cn(
                                                "w-full p-4 rounded-3xl border-2 flex items-center justify-between transition-all group mb-3",
                                                menu[configSlot.day][configSlot.type].isExpress
                                                    ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                                                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-xl", menu[configSlot.day][configSlot.type].isExpress ? "bg-white/20" : "bg-white dark:bg-slate-700 shadow-sm")}>
                                                    <Clock size={20} className={menu[configSlot.day][configSlot.type].isExpress ? "text-white" : "text-amber-500"} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-sm">Mode Express</p>
                                                    <p className={cn("text-[10px] font-medium opacity-70")}>Repas prêt en moins de 15 minutes</p>
                                                </div>
                                            </div>
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", menu[configSlot.day][configSlot.type].isExpress ? "border-white" : "border-slate-200 dark:border-slate-600")}>
                                                {menu[configSlot.day][configSlot.type].isExpress && <Check size={12} />}
                                            </div>
                                        </button>

                                        {/* Leftover Toggle - ONLY FOR DINNER */}
                                        {configSlot.type === 'Soir' && (
                                            <button
                                                onClick={() => updateSlot(configSlot.day, configSlot.type, { cookForLeftover: !menu[configSlot.day][configSlot.type].cookForLeftover })}
                                                className={cn(
                                                    "w-full p-4 rounded-3xl border-2 flex items-center justify-between transition-all group mb-3",
                                                    menu[configSlot.day][configSlot.type].cookForLeftover
                                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                                        : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-2 rounded-xl", menu[configSlot.day][configSlot.type].cookForLeftover ? "bg-white/20" : "bg-white dark:bg-slate-700 shadow-sm")}>
                                                        <RefreshCw size={20} className={menu[configSlot.day][configSlot.type].cookForLeftover ? "text-white" : "text-emerald-500"} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-black text-sm">Cuisiner pour demain midi</p>
                                                        <p className={cn("text-[10px] font-medium opacity-70")}>Double les quantités pour les lunchbox</p>
                                                    </div>
                                                </div>
                                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", menu[configSlot.day][configSlot.type].cookForLeftover ? "border-white" : "border-slate-200 dark:border-slate-600")}>
                                                    {menu[configSlot.day][configSlot.type].cookForLeftover && <Check size={12} />}
                                                </div>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => updateSlot(configSlot.day, configSlot.type, { isIgnored: !menu[configSlot.day][configSlot.type].isIgnored })}
                                            className={cn(
                                                "w-full p-4 rounded-3xl border-2 flex items-center justify-between transition-all group",
                                                menu[configSlot.day][configSlot.type].isIgnored
                                                    ? "bg-slate-500 border-slate-500 text-white shadow-lg shadow-slate-500/20"
                                                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-xl", menu[configSlot.day][configSlot.type].isIgnored ? "bg-white/20" : "bg-white dark:bg-slate-700 shadow-sm")}>
                                                    <EyeOff size={20} className={menu[configSlot.day][configSlot.type].isIgnored ? "text-white" : "text-slate-500"} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-sm">Ignorer ce repas</p>
                                                    <p className={cn("text-[10px] font-medium opacity-70")}>Pas de recette, pas de courses</p>
                                                </div>
                                            </div>
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", menu[configSlot.day][configSlot.type].isIgnored ? "border-white" : "border-slate-200 dark:border-slate-600")}>
                                                {menu[configSlot.day][configSlot.type].isIgnored && <Check size={12} />}
                                            </div>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block">Une envie particulière ?</label>
                                        <textarea
                                            value={menu[configSlot.day][configSlot.type].customRequest || ""}
                                            onChange={(e) => updateSlot(configSlot.day, configSlot.type, { customRequest: e.target.value })}
                                            placeholder="Ex: Un plat avec du saumon, sans gluten, riche en légumes..."
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-medium outline-orange-500 min-h-[100px] resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            generateSlot(configSlot.day, configSlot.type);
                                            setConfigSlot(null);
                                        }}
                                        disabled={generating !== null}
                                        className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-3xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {generating === `${configSlot.day}-${configSlot.type}` ? <Loader className="animate-spin" /> : <Sparkles size={18} />}
                                        Générer le repas
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* Recipe Modal */}
            {/* Recipe Modal */}
            <AnimatePresence>
                {viewSlot && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewSlot(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative border dark:border-slate-700"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setViewSlot(null)}
                                className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                <X size={20} />
                            </button>

                            {/* Render Logic */}
                            {(() => {
                                const slot = menu[viewSlot.day][viewSlot.type];
                                const recipe = (slot.mode === 'split' && viewSlot.mealIdx !== undefined)
                                    ? slot.meals?.[viewSlot.mealIdx]?.recipe
                                    : slot.recipe;

                                if (!recipe) return <p className="text-center py-10 text-slate-400 italic">Aucune recette générée.</p>;

                                const handleShare = async () => {
                                    const shareText = `${recipe.recipeName}\n\n${recipe.description}\n\nIngrédients :\n${recipe.ingredients.map(i => `- ${i.item} : ${i.q} ${i.u}`).join('\n')}\n\nInstructions :\n${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;

                                    if (navigator.share) {
                                        try {
                                            await navigator.share({
                                                title: recipe.recipeName,
                                                text: shareText,
                                            });
                                        } catch (error) {
                                            console.error('Error sharing', error);
                                        }
                                    } else {
                                        try {
                                            await navigator.clipboard.writeText(shareText);
                                            alert("Recette copiée dans le presse-papier !");
                                        } catch (error) {
                                            console.error('Error copying', error);
                                        }
                                    }
                                };

                                const attendees = (slot.mode === 'split' && viewSlot.mealIdx !== undefined)
                                    ? slot.meals?.[viewSlot.mealIdx]?.attendees || []
                                    : (slot.attendees || []);

                                const attendeesCount = attendees.length === 0 ? (household?.memberProfiles?.length || 1) : attendees.length;
                                const multiplier = 1; // AI handles total quantities now

                                return (
                                    <>
                                        <button
                                            onClick={handleShare}
                                            className="absolute top-4 right-14 p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                                            title="Partager la recette"
                                        >
                                            <Share2 size={20} />
                                        </button>

                                        <div className="mb-6">
                                            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight mb-2 pr-10">{recipe.recipeName}</h2>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{recipe.description}</p>
                                        </div>

                                        <div className="flex gap-2 mb-6 flex-wrap">
                                            <span className="bg-orange-50 dark:bg-orange-900/50 text-orange-600 dark:text-orange-200 px-2 py-1.5 rounded-xl text-[10px] font-black flex gap-1 items-center uppercase tracking-wider"><Flame size={12} /> {recipe.cookingMethod}</span>
                                            <span className="bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-200 px-2 py-1.5 rounded-xl text-[10px] font-black flex gap-1 items-center uppercase tracking-wider"><Clock size={12} /> {recipe.prepTime} + {recipe.cookTime}</span>
                                            <div className="flex -space-x-2 ml-1 items-center">
                                                {(attendees.length === 0 ? household?.members || [] : attendees).map((uid, i) => {
                                                    const m = household?.memberProfiles?.find(p => p.uid === uid);
                                                    return (
                                                        <div key={uid} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-600 dark:text-slate-300 shadow-sm" title={m?.displayName}>
                                                            {m?.displayName[0]}
                                                        </div>
                                                    );
                                                })}
                                                <span className="ml-3 text-[10px] font-bold text-slate-400">{attendeesCount} pers.</span>
                                            </div>
                                        </div>

                                        {recipe.rationale && (
                                            <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 flex gap-3">
                                                <Lightbulb className="text-emerald-500 flex-shrink-0" size={20} />
                                                <div>
                                                    <h3 className="font-bold text-emerald-800 dark:text-emerald-400 text-xs uppercase tracking-wider mb-1">Pourquoi ce choix ?</h3>
                                                    <p className="text-sm text-emerald-700 dark:text-emerald-300 italic opacity-90 leading-relaxed">"{recipe.rationale}"</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider mb-2">Ingrédients (Portion totale pour {attendeesCount} pers.)</h3>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(recipe.ingredients || []).map((ing, i) => (
                                                        <div key={i} className="flex justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-sm text-slate-700 dark:text-slate-200">
                                                            <span>{ing.item}</span>
                                                            <span className="font-bold text-slate-500 dark:text-slate-400">{Math.round(ing.q * multiplier * 10) / 10} {ing.u}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider mb-2">Instructions</h3>
                                                <ol className="list-decimal pl-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                                    {(recipe.instructions || []).map((step, i) => (
                                                        <li key={i}>{step}</li>
                                                    ))}
                                                </ol>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                            <div className="h-12" /> {/* Mobile safe area */}
                        </motion.div >
                    </div>
                )}
            </AnimatePresence>
            {/* Week Config Modal */}
            <AnimatePresence>
                {showWeekConfig && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowWeekConfig(false)}>
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-4xl h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl relative border dark:border-slate-700 flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Settings className="text-slate-400" /> Préparer la semaine
                                </h2>
                                <button onClick={() => setShowWeekConfig(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
                                <div className="hidden sm:grid grid-cols-[100px_1fr_1fr] gap-4 mb-4 font-bold text-slate-400 uppercase text-xs tracking-wider px-2">
                                    <div>Jour</div>
                                    <div>Midi</div>
                                    <div>Soir</div>
                                </div>
                                <div className="space-y-4 sm:space-y-2">
                                    {DAYS.map(day => (
                                        <div key={day} className="flex flex-col sm:grid sm:grid-cols-[100px_1fr_1fr] gap-4 items-stretch sm:items-start bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                            <div className="font-bold text-slate-700 dark:text-slate-300 sm:pt-1 text-sm bg-slate-200/50 dark:bg-slate-700/50 sm:bg-transparent -mx-4 -mt-4 sm:mx-0 sm:mt-0 px-4 py-2 sm:p-0 rounded-t-2xl sm:rounded-none">{day}</div>

                                            {/* MIDI & SOIR */}
                                            <div className="grid grid-cols-2 sm:contents gap-4">
                                                {(['Midi', 'Soir'] as const).map(type => {
                                                    const slot = menu[day][type];
                                                    const isIgnored = slot.isIgnored;
                                                    const attendees = slot.attendees || [];

                                                    return (
                                                        <div key={type} className="space-y-3">
                                                            <div className="flex gap-2 flex-wrap items-center">
                                                                <button
                                                                    onClick={() => updateSlot(day, type, { isIgnored: !isIgnored })}
                                                                    className={cn("p-1.5 rounded-lg border-2 transition", isIgnored ? "bg-slate-500 border-slate-500 text-white" : "border-slate-200 dark:border-slate-700 text-slate-400")}
                                                                    title="Ignorer"
                                                                >
                                                                    <EyeOff size={14} />
                                                                </button>

                                                                {!isIgnored && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => updateSlot(day, type, { isBasic: !slot.isBasic })}
                                                                            className={cn("p-1.5 rounded-lg border-2 transition", slot.isBasic ? "bg-blue-500 border-blue-500 text-white" : "border-slate-200 dark:border-slate-700 text-slate-400")}
                                                                            title="Basique"
                                                                        >
                                                                            <ChefHat size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => updateSlot(day, type, { isExpress: !slot.isExpress })}
                                                                            className={cn("p-1.5 rounded-lg border-2 transition", slot.isExpress ? "bg-amber-500 border-amber-500 text-white" : "border-slate-200 dark:border-slate-700 text-slate-400")}
                                                                            title="Express"
                                                                        >
                                                                            <Clock size={14} />
                                                                        </button>
                                                                        {type === 'Soir' && (
                                                                            <button
                                                                                onClick={() => updateSlot(day, 'Soir', { cookForLeftover: !slot.cookForLeftover })}
                                                                                className={cn("p-1.5 rounded-lg border-2 transition", slot.cookForLeftover ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 dark:border-slate-700 text-slate-400")}
                                                                                title="Restes"
                                                                            >
                                                                                <RefreshCw size={14} />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => {
                                                                                const req = prompt("Consigne particulière ?", slot.customRequest || "");
                                                                                if (req !== null) updateSlot(day, type, { customRequest: req });
                                                                            }}
                                                                            className={cn("p-1.5 rounded-lg border-2 transition", slot.customRequest ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200 dark:border-slate-700 text-slate-400")}
                                                                            title="Consigne"
                                                                        >
                                                                            <MessageSquare size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>

                                                            {!isIgnored && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {household?.memberProfiles?.map(m => {
                                                                        const isSelected = attendees.length === 0 ? true : attendees.includes(m.uid);
                                                                        return (
                                                                            <button
                                                                                key={m.uid}
                                                                                onClick={() => {
                                                                                    const currentList = attendees.length === 0 ? household.members : attendees;
                                                                                    const next = isSelected
                                                                                        ? currentList.filter(id => id !== m.uid)
                                                                                        : [...currentList, m.uid];
                                                                                    updateSlot(day, type, { attendees: next });
                                                                                }}
                                                                                className={cn(
                                                                                    "w-6 h-6 rounded-full text-[10px] font-bold transition-all flex items-center justify-center border",
                                                                                    isSelected
                                                                                        ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent"
                                                                                        : "bg-transparent text-slate-400 border-slate-200 dark:border-slate-700"
                                                                                )}
                                                                                title={m.displayName}
                                                                            >
                                                                                {m.displayName[0]}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {slot.customRequest && !isIgnored && (
                                                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 italic bg-indigo-50 dark:bg-indigo-900/20 p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 truncate max-w-full" title={slot.customRequest}>
                                                                    &quot;{slot.customRequest}&quot;
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                                <button
                                    onClick={() => {
                                        generateWeek();
                                        setShowWeekConfig(false);
                                    }}
                                    disabled={generating === "FULL"}
                                    className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 active:scale-95 transition flex items-center gap-2"
                                >
                                    {generating === "FULL" ? <Loader className="animate-spin" /> : <Sparkles size={20} />}
                                    Générer la semaine
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}


