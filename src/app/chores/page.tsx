"use client";

import { useState } from "react";
import { useChores, Chore } from "@/hooks/useChores";
import { CheckSquare, Plus, Trash2, Repeat, UserPlus, Check, Calendar, Pencil, Loader, CreditCard, X, HelpCircle, Pill, Heart, List, Trophy, Sparkles as SparkleIcon, History, Crown, Zap, ShoppingBag, ChevronRight } from "lucide-react";
import { useHealth } from "@/hooks/useHealth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/providers/AuthProvider";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import confetti from "canvas-confetti";
import { suggestChorePoints } from "@/lib/gemini";
import { useHousehold } from "@/hooks/useHousehold";
import InfoModal from "@/components/ui/InfoModal";
import CollectionZone from "@/components/chores/CollectionZone";
import PointsHistory from "@/components/chores/PointsHistory";
import PackAlert from "@/components/chores/PackAlert";
import { ChoreCard } from "@/components/chores/ChoreCard";

export default function ChoresPage() {
    const { chores, loading, addChore, toggleChore, deleteChore, assignToMe, updateChore } = useChores();
    const { medications, profiles, medCompletions, toggleMedication, addMedication } = useHealth();
    const { user } = useAuth();
    const { household, togglePaymentStatus } = useHousehold();

    // UI State
    const [activeTab, setActiveTab] = useState<'todo' | 'all' | 'rank' | 'collection'>('todo');
    const [showAdd, setShowAdd] = useState(false);
    const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // Form State
    const [newChore, setNewChore] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState(10);
    const [category, setCategory] = useState<'household' | 'general' | 'pet'>('household');
    const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'custom'>('once');
    const [customInterval, setCustomInterval] = useState(2);
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    const [reminders, setReminders] = useState<number[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);

    const openAddModal = () => {
        setEditingChoreId(null);
        setNewChore("");
        setDueDate("");
        setPoints(10);
        setCategory('household');
        setFrequency('once');
        setCustomInterval(2);
        setReminders([]);
        setSelectedProfile("");
        setShowAdd(true);
    };

    const handleEdit = (chore: Chore) => {
        setEditingChoreId(chore.id);
        setNewChore(chore.title);
        setDueDate(chore.dueDate ? chore.dueDate.slice(0, 16) : "");
        setPoints(chore.points || 10);
        setCategory(chore.category || 'household');
        setFrequency(chore.frequency || 'once');
        setCustomInterval(chore.customInterval || 2);
        setReminders(chore.reminders || []);
        setShowAdd(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation Check
        if (!newChore.trim()) {
            // Optional: You could set an error state here to show a red border
            alert("Le titre de la tâche ne peut pas être vide.");
            return;
        }

        if (category === 'pet' && !selectedProfile && profiles.filter(p => p.type === 'pet').length > 0) {
            alert("Veuillez sélectionner un animal.");
            return;
        }

        try {
            if (category === 'pet') {
                // ... (Pet Logic)
                const f = frequency === 'once' ? 'daily' : frequency;
                await addMedication({
                    profileId: selectedProfile,
                    name: newChore,
                    dosage: "1",
                    frequency: f as any,
                    customDays: frequency === 'custom' ? customInterval : undefined,
                    startDate: dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                    active: true,
                    category: 'pet_care',
                    treatmentType: 'task',
                    times: ["08:00"]
                });
            } else if (editingChoreId) {
                await updateChore(editingChoreId, {
                    title: newChore.trim(),
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    points: points,
                    category: category,
                    frequency: frequency,
                    customInterval: frequency === 'custom' ? customInterval : undefined,
                    reminders: reminders
                });
            } else {
                const finalPoints = category === 'household' ? points : 0;
                await addChore(newChore.trim(), dueDate ? new Date(dueDate).toISOString() : undefined, finalPoints, category, frequency, customInterval, reminders);
            }

            // Reset Form only on success
            setNewChore("");
            setDueDate("");
            setPoints(10);
            setFrequency('once');
            setCustomInterval(2);
            setShowAdd(false);
            setEditingChoreId(null);
            setReminders([]);
            setSelectedProfile("");
        } catch (error) {
            console.error("Failed to save chore:", error);
            alert("Une erreur est survenue lors de la sauvegarde.");
        }
    };

    const handleSuggestPoints = async () => {
        if (!newChore.trim()) return;
        setIsSuggesting(true);
        try {
            const { points: suggested } = await suggestChorePoints(newChore);
            setPoints(suggested);
        } catch (e) {
            console.error(e);
            alert("L'IA n'a pas pu suggérer de points.");
        } finally {
            setIsSuggesting(false);
        }
    };

    // Filter Logic
    // Map Health Items to Chores Interface
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const healthChores = medications
        .filter(m => m.category === 'pet_care' && m.active)
        .map(m => {
            const nextDate = m.nextOccurrence ? parseISO(m.nextOccurrence) : parseISO(m.startDate);
            const isToday = format(nextDate, 'yyyy-MM-dd') === todayStr;
            const completionId = `${m.id}-${todayStr}-${m.times?.[0]?.replace(':', '') || "0800"}`; // Simplified time check
            // Note: Simplification for demo. Real app needs robust time matching.
            // We assume 1st time slot for single toggle.

            const isDone = isToday && medCompletions[completionId];

            return {
                id: m.id,
                title: m.name,
                done: !!isDone, // Ensure boolean
                points: 0, // [MODIFIED] No points for pet/health tasks
                category: 'pet',
                frequency: m.frequency,
                assignees: [], // Assigned to pet usually
                dueDate: m.nextOccurrence || m.startDate,
                isHealth: true, // Marker
                healthData: m // Full original data
            } as any; // Cast to 'any' or intersection type to fit Chore
        });

    // Filter Logic
    const upcomingChores = [...chores, ...healthChores].filter(c => {
        if (c.done) return false;

        // If it's a household recurring task, only show if due today or earlier (or no due date)
        if (c.category === 'household' || (!c.category && c.frequency !== 'once')) {
            if (!c.dueDate) return true; // Show if no date
            const due = new Date(c.dueDate);
            const endToday = new Date();
            endToday.setHours(23, 59, 59, 999);
            return due <= endToday;
        }

        // Show all pending general/pet tasks
        return true;
    }).sort((a, b) => {
        // Sort by due date if available, otherwise created at
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });

    const householdChores = chores.filter(c => (c.category === 'household' || !c.category));
    const petChores = [...chores.filter(c => c.category === 'pet'), ...healthChores]; // Merge real chores and health items
    const generalChores = chores.filter(c => c.category === 'general');

    const handleToggleChore = (chore: any) => {
        if (chore.isHealth) {
            // Handle Health Item Toggle
            const m = chore.healthData;
            const today = format(new Date(), 'yyyy-MM-dd');
            // Use first time or default
            const time = m.times?.[0] || "08:00";
            toggleMedication(m.id, today, time);

            if (!chore.done) {
                confetti({
                    particleCount: 30,
                    spread: 50,
                    origin: { y: 0.7 },
                    colors: ['#6366f1', '#a855f7'] // Indigo/Purple for pets
                });
            }
        } else {
            // Handle Standard Chore Toggle
            toggleChore(chore.id, chore.done, chore.points, chore.category, chore.frequency, chore.dueDate, chore.customInterval, chore.title);
            if (!chore.done) {
                confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.7 },
                    colors: ['#3b82f6', '#10b981']
                });
            }
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-32 p-4 transition-colors">
            {/* HEADER SIMPLIFIED */}
            <header className="mb-6 flex justify-between items-center sticky top-0 bg-slate-50 dark:bg-slate-950 z-30 py-2 border-b border-transparent transition-colors">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Tâches
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">LifeSync</p>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setShowHelp(true)} className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 transition shadow-sm">
                        <HelpCircle size={20} />
                    </button>
                    <button onClick={openAddModal} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition active:scale-95 shadow-blue-500/30">
                        <Plus size={24} />
                    </button>
                </div>
            </header>

            {/* SCORE SUMMARY WIDGET */}
            {household && (
                <div onClick={() => setActiveTab('rank')} className="mb-6 cursor-pointer transform hover:scale-[1.02] transition-transform active:scale-95">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 shadow-lg flex items-center justify-between text-white relative overflow-hidden">
                        {/* Background decorations */}
                        <div className="absolute -top-4 -right-4 p-4 opacity-20 transform rotate-12"><Crown size={120} className="fill-white" /></div>

                        {/* Champion Section */}
                        <div className="flex items-center gap-4 z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-full backdrop-blur-sm border-2 border-white/50 flex items-center justify-center shadow-inner">
                                <Crown size={32} className="text-white fill-white drop-shadow-md" />
                            </div>
                            <div>
                                {(() => {
                                    const lastChampUid = household.currentChampion;
                                    const lastChampName = lastChampUid ? household.memberProfiles?.find(p => p.uid === lastChampUid)?.displayName : null;

                                    if (lastChampName) {
                                        return (
                                            <>
                                                <p className="text-[9px] font-bold uppercase opacity-90 tracking-widest text-yellow-100">Champion du mois dernier</p>
                                                <p className="text-2xl font-black tracking-tight leading-none filter drop-shadow-sm">{lastChampName}</p>
                                            </>
                                        );
                                    } else {
                                        // Fallback: Current Leader
                                        const sorted = (household.members || [])
                                            .map(uid => ({
                                                uid,
                                                score: household.scores?.[uid] || 0,
                                                name: household.memberProfiles?.find(p => p.uid === uid)?.displayName || "Inconnu"
                                            }))
                                            .sort((a, b) => b.score - a.score);
                                        const leader = sorted[0];
                                        const leaderName = (leader && leader.score > 0) ? leader.name : "En attente...";

                                        return (
                                            <>
                                                <p className="text-[9px] font-bold uppercase opacity-90 tracking-widest text-yellow-100">Meneur Actuel</p>
                                                <p className="text-2xl font-black tracking-tight leading-none filter drop-shadow-sm">{leaderName}</p>
                                            </>
                                        );
                                    }
                                })()}
                            </div>
                        </div>

                        {/* Mini Scoreboard (Current Leaders) */}
                        <div className="flex -space-x-2 z-10 pl-4 items-center">
                            {household.members && household.members
                                .map(uid => ({
                                    uid,
                                    score: household.scores?.[uid] || 0,
                                    name: household.memberProfiles?.find(p => p.uid === uid)?.displayName || "?"
                                }))
                                .sort((a, b) => b.score - a.score)
                                .slice(0, 3)
                                .map((m, idx) => (
                                    <div key={m.uid} className={cn("w-10 h-10 rounded-full border-2 border-yellow-400 bg-white text-slate-900 flex flex-col items-center justify-center shadow-lg relative z-10", idx === 0 && "w-12 h-12 z-20 border-white ring-2 ring-yellow-300")}>
                                        <span className="font-black text-[10px] leading-none">{m.name.slice(0, 1)}</span>
                                        <span className="text-[8px] font-bold text-orange-500 leading-none">{m.score}</span>
                                    </div>
                                ))
                            }
                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white text-[10px] ml-1">
                                <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TABS NAVIGATION */}
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6 sticky top-[5rem] z-20">
                {[
                    { id: 'todo', label: 'À Faire', icon: CheckSquare },
                    { id: 'all', label: 'Liste', icon: List },
                    { id: 'rank', label: 'Scores', icon: Trophy },
                    { id: 'collection', label: 'Collection', icon: Trophy },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex flex-col items-center gap-1 transition-all",
                            activeTab === tab.id
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                                : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                    >
                        <tab.icon size={18} className={cn(activeTab === tab.id ? "text-blue-500" : "opacity-50")} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="max-w-xl mx-auto min-h-[50vh]">
                {loading && <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2"><Loader className="animate-spin" /> Chargement...</div>}

                {/* TAB 1: TO DO (Priority) */}
                {activeTab === 'todo' && !loading && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                        {/* Highlights */}
                        {upcomingChores.length === 0 && (
                            <div className="text-center py-10 opacity-50">
                                <CheckSquare size={48} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-bold text-slate-400">Rien à faire, profitez !</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            {upcomingChores.map(chore => (
                                <ChoreCard
                                    key={chore.id}
                                    chore={chore}
                                    onToggle={() => handleToggleChore(chore)}
                                    onEdit={() => handleEdit(chore)}
                                    onDelete={() => deleteChore(chore.id)}
                                />
                            ))}
                        </div>

                        {/* BUDGET SECTION (Simplified) */}
                        {household?.budgetConfig && (
                            <div className="mt-8">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 pl-2">Paiements en attente</h3>
                                <div className="space-y-2">
                                    {(() => {
                                        const now = new Date();
                                        const monthYear = format(now, "yyyy-MM");
                                        const payments = [
                                            ...(household.budgetConfig.fixedCharges || []),
                                            ...(household.budgetConfig.reserves || [])
                                        ].filter((item: any) => item.type !== 'personal' || item.paidBy === user?.uid);

                                        return payments.map((item, idx) => {
                                            const key = `${item.label}-${monthYear}-${user?.uid}`;
                                            const isDone = household.budgetConfig?.budgetCompletions?.[key] || false;
                                            if (isDone) return null; // Only show pending in 'To Do' tab

                                            return (
                                                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center opacity-80">
                                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                                                    <button onClick={() => togglePaymentStatus(item.label, monthYear)} className="text-xs font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                        Payer {item.amount}€
                                                    </button>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: EVERYTHING (Grouped) */}
                {activeTab === 'all' && !loading && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <section>
                            <h3 className="text-xs font-black uppercase text-emerald-500 tracking-widest mb-3 pl-2 flex items-center gap-2"><SparkleIcon size={14} /> Ménage</h3>
                            <div className="space-y-2">
                                {householdChores.map(c => (
                                    <ChoreCard
                                        key={c.id}
                                        chore={c}
                                        compact
                                        onToggle={() => handleToggleChore(c)}
                                        onEdit={() => handleEdit(c)}
                                        onDelete={() => deleteChore(c.id)}
                                    />
                                ))}
                            </div>
                        </section>

                        {petChores.length > 0 && (
                            <section>
                                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-widest mb-3 pl-2 flex items-center gap-2"><Heart size={14} /> Animaux</h3>
                                <div className="space-y-2">
                                    {petChores.map(c => (
                                        <ChoreCard
                                            key={c.id}
                                            chore={c}
                                            compact
                                            onToggle={() => handleToggleChore(c)}
                                            onEdit={() => handleEdit(c)}
                                            onDelete={() => deleteChore(c.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {generalChores.length > 0 && (
                            <section>
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3 pl-2 flex items-center gap-2"><History size={14} /> Divers</h3>
                                <div className="space-y-2">
                                    {generalChores.map(c => (
                                        <ChoreCard
                                            key={c.id}
                                            chore={c}
                                            compact
                                            onToggle={() => handleToggleChore(c)}
                                            onEdit={() => handleEdit(c)}
                                            onDelete={() => deleteChore(c.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* TAB 3: RANKING & HISTORY */}
                {activeTab === 'rank' && !loading && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <PointsHistory />
                    </div>
                )}

                {/* TAB 4: COLLECTION */}
                {activeTab === 'collection' && !loading && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <CollectionZone isOpen={true} onClose={() => { }} embedded />
                    </div>
                )}
            </div>

            {/* ADD COMPONENT MODAL (Same as before but simplified visually?) */}
            <AnimatePresence>
                {showAdd && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setShowAdd(false)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={20} /></button>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">{editingChoreId ? "Modifier" : "Nouvelle tâche"}</h2>

                            <form onSubmit={handleSave} className="space-y-4 pb-8">
                                <input autoFocus required className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl font-bold outline-blue-500 placeholder:font-normal" placeholder="Titre de la tâche..." value={newChore} onChange={e => setNewChore(e.target.value)} />

                                <div className="grid grid-cols-3 gap-2">
                                    {[{ id: 'household', label: 'Ménage', icon: SparkleIcon, color: 'emerald' }, { id: 'pet', label: 'Animaux', icon: Heart, color: 'indigo' }, { id: 'general', label: 'Autre', icon: CheckSquare, color: 'slate' }].map(cat => (
                                        <button key={cat.id} type="button" onClick={() => setCategory(cat.id as any)} className={cn("p-2 rounded-xl border-2 font-bold text-[10px] uppercase flex flex-col items-center gap-1 transition-all", category === cat.id ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20 text-${cat.color}-600` : "border-slate-100 dark:border-slate-800 text-slate-400")}>
                                            <cat.icon size={16} /> {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {category === 'pet' ? (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl">
                                        <label className="text-xs font-bold text-indigo-400 uppercase mb-2 block">Animal concerné</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-800">
                                            {profiles.filter(p => p.type === 'pet').map(profile => (
                                                <button
                                                    key={profile.id}
                                                    type="button"
                                                    onClick={() => setSelectedProfile(profile.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all border-2 shrink-0",
                                                        selectedProfile === profile.id
                                                            ? "bg-indigo-500 text-white border-indigo-500 shadow-indigo-500/30"
                                                            : "bg-white dark:bg-slate-800 text-slate-500 border-transparent hover:border-indigo-200"
                                                    )}
                                                >
                                                    <span className="text-lg">🐾</span>
                                                    <span className="font-bold text-sm whitespace-nowrap">{profile.name}</span>
                                                </button>
                                            ))}
                                            {profiles.filter(p => p.type === 'pet').length === 0 && (
                                                <p className="text-xs text-slate-400 italic">Aucun profil animal trouvé.</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {category === 'household' && (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold text-slate-400 uppercase">Points</label>
                                                    <button type="button" onClick={handleSuggestPoints} disabled={isSuggesting} className="text-xs font-bold text-blue-500 flex items-center gap-1">{isSuggesting ? "..." : "✨ Suggérer"}</button>
                                                </div>
                                                <input type="range" min="5" max="50" step="5" className="w-full accent-blue-500" value={points} onChange={e => setPoints(parseInt(e.target.value))} />
                                                <div className="text-center font-black text-xl text-blue-600 dark:text-blue-400 mt-1">{points} pts</div>
                                            </div>
                                        )}
                                    </>
                                )}


                                {category !== 'household' && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Date d'échéance (Optionnel)</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full p-2 bg-white dark:bg-slate-700 rounded-xl font-bold dark:text-white"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    {['once', 'daily', 'weekly', 'monthly', 'custom'].map(f => (
                                        <button key={f} type="button" onClick={() => setFrequency(f as any)} className={cn("p-3 rounded-xl border-2 font-bold text-xs capitalize", frequency === f ? "border-purple-500 bg-purple-50 text-purple-600" : "border-slate-100 dark:border-slate-800 text-slate-400")}>
                                            {f === 'once' ? 'Une fois' : f === 'daily' ? 'Quotidien' : f === 'weekly' ? 'Hebdo' : f === 'monthly' ? 'Mensuel' : 'Perso'}
                                        </button>
                                    ))}
                                </div>
                                {frequency === 'custom' && (
                                    <div className="flex items-center gap-2 justify-center p-2 bg-purple-50 rounded-xl">
                                        <span className="text-xs font-bold text-purple-600">Tous les</span>
                                        <input type="number" value={customInterval} onChange={e => setCustomInterval(parseInt(e.target.value))} className="w-16 p-1 text-center font-bold bg-white rounded border border-purple-200" />
                                        <span className="text-xs font-bold text-purple-600">jours</span>
                                    </div>
                                )}

                                <button type="submit" disabled={!newChore.trim()} className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black shadow-lg hover:bg-blue-700 transition active:scale-95 mt-4">
                                    {editingChoreId ? "Sauvegarder" : "Ajouter la tâche"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Aide Tâches"
                description="Gérez votre foyer simplement."
                accentColor="blue"
                items={[
                    { title: "À Faire", description: "Votre tableau de bord du jour. Les tâches ménagères futures sont masquées.", icon: CheckSquare },
                    { title: "Liste", description: "Vue complète de toutes les tâches, classées par catégorie.", icon: List },
                    { title: "Scores", description: "Classement du mois et historique détaillé de vos points.", icon: Trophy },
                    { title: "Collection", description: "Ouvrez des packs, collectionnez des animaux rares et devenez le Champion pour gagner des récompenses exclusives !", icon: Crown }
                ]}
                tips={[
                    "Les tâches récurrentes ne s'affichent dans 'À Faire' que le jour J.",
                    "Cliquez sur la carte d'une tâche pour la modifier.",
                    "Devenez Champion du mois pour gagner un Pack Gratuit !",
                    "Les animaux ont des niveaux de rareté : Commun, Rare, Épique, Légendaire et Totem.",
                    "Échangez 5 doublons contre une carte de rareté supérieure !",
                    "Vous pouvez voir la collection des autres membres mais leurs détails restent secrets."
                ]}
            />

            {/* Pack Alert Notification */}
            {household && user && (household.balance?.[user.uid] || household.scores?.[user.uid] || 0) >= 750 && activeTab !== 'collection' && (
                <PackAlert
                    score={household.balance?.[user.uid] || household.scores?.[user.uid] || 0}
                    onClick={() => setActiveTab('collection')}
                    onClose={() => {/* Add dismissal logic if needed, currently permanent until tab switch or point spend */ }}
                />
            )}
        </div>
    );
}
