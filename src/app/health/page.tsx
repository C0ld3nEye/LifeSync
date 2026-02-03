"use client";

import { useState, useEffect, Suspense } from "react";
import { useHealth, HealthProfile, Medication, HealthEntry } from "@/hooks/useHealth";
import { useDailyChallenges } from "@/hooks/useDailyChallenges";
import { Activity, Apple, Award, Baby, Bird, BookOpen, Brain, Calendar, CalendarDays, Cat, Check, ChevronRight, ClipboardList, Clock, Coffee, Dog, Droplets, Dumbbell, Flame, Heart, HelpCircle, Info, Laugh, Moon, Pencil, Pill, Plus, Shield, Smile, Sparkles, Star, Swords, Target, Timer, Trash2, TrendingUp, Trophy, UserPlus, Users, X, Zap } from "lucide-react";
import InfoModal from "@/components/ui/InfoModal";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday, addDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import confetti from "canvas-confetti";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHousehold } from "@/hooks/useHousehold";
import { useSearchParams } from "next/navigation";

const COLORS = ["emerald", "blue", "purple", "rose", "orange", "indigo"];

function HealthContent() {
    const { user } = useAuth();
    const {
        profiles, medications, history, loading, medCompletions,
        addProfile, updateProfile, deleteProfile,
        addMedication, updateMedication, deleteMedication, addHealthEntry, deleteHealthEntry, toggleMedication
    } = useHealth();
    const { household } = useHousehold();
    const { challenge, history: challengeHistory, stats, toggleCompletion, loading: challengeLoading } = useDailyChallenges();

    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') === 'challenges' ? 'challenges' : 'medical';
    const [activeTab, setActiveTab] = useState<"medical" | "challenges">(initialTab);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && profiles.length > 0 && !selectedProfileId) {
            // Priority: User's profile > First Human > First Profile
            const myProfile = profiles.find(p => p.userId === user?.uid);
            const firstHuman = profiles.find(p => p.type === 'human');
            setSelectedProfileId(myProfile?.id || firstHuman?.id || profiles[0].id);
        }
    }, [loading, profiles, selectedProfileId, user?.uid]);




    // Modals
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [showAddMed, setShowAddMed] = useState(false);
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Form states
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingMedId, setEditingMedId] = useState<string | null>(null);

    const [newProfile, setNewProfile] = useState({ name: "", birthDate: "", bloodType: "", allergies: "", notes: "", type: "human" as "human" | "pet", species: "dog" as any, breed: "", userId: "" });
    const [newMed, setNewMed] = useState({
        name: "", dosage: "", instruction: "",
        frequency: "daily" as any, customDays: 30, times: ["08:00"],
        startDate: format(new Date(), 'yyyy-MM-dd'),
        isPrivate: false,
        category: 'medication' as 'medication' | 'pet_care',
        treatmentType: 'care' as 'medication' | 'care' | 'task'
    });
    const [newEntry, setNewEntry] = useState({ title: "", content: "", type: "note" as any, isCounter: false, counterStartDate: todayStr });
    const [syncOptions, setSyncOptions] = useState({ agenda: false, task: false });

    const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

    const handleAddProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const profileData = {
            ...newProfile,
            allergies: newProfile.allergies.split(',').map(s => s.trim()).filter(s => s)
        };

        if (editingProfileId) {
            await updateProfile(editingProfileId, profileData);
        } else {
            await addProfile(profileData);
        }
        setNewProfile({ name: "", birthDate: "", bloodType: "", allergies: "", notes: "", type: "human", species: "dog" as any, breed: "", userId: "" });
        setShowAddProfile(false);
        setEditingProfileId(null);
    };

    const handleAddMed = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfileId) return;

        const medData = {
            ...newMed,
            profileId: selectedProfileId,
            active: true
        };

        if (editingMedId) {
            await updateMedication(editingMedId, medData as any);
        } else {
            await addMedication(medData, syncOptions);
        }
        setShowAddMed(false);
        setEditingMedId(null);
        setNewMed({ name: "", dosage: "", instruction: "", frequency: "daily", customDays: 30, times: ["08:00"], startDate: format(new Date(), 'yyyy-MM-dd'), isPrivate: false, category: 'medication', treatmentType: 'care' });
        setSyncOptions({ agenda: false, task: false });
    };

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfileId) return;
        await addHealthEntry({
            ...newEntry,
            profileId: selectedProfileId,
            date: new Date()
        });
        setShowAddEntry(false);
        setNewEntry({ title: "", content: "", type: "note", isCounter: false, counterStartDate: todayStr });
    };




    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 transition-colors">
            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Santé & Bien-être"
                description="Suivez votre santé médicale et relevez des défis quotidiens."
                accentColor="rose"
                items={[
                    { title: "Profils Médicaux", description: "Saisissez les infos vitales (groupe sanguin, allergies) pour chaque membre.", icon: UserPlus, color: "emerald" },
                    { title: "Traitements", description: "Suivez vos médicaments. Une alerte foyer se déclenche à 18h en cas d'oubli.", icon: Pill, color: "blue" },
                    { title: "Journal & Notes", description: "Consignez les symptômes, rendez-vous ou observations au fil de l'eau.", icon: ClipboardList, color: "purple" },
                    { title: "Défis Quotidiens", description: "Relevez des défis bien-être personnalisés pour booster votre santé.", icon: Zap, color: "orange" }
                ]}
                tips={[
                    "Le widget d'accueil vous prévient automatiquement si un traitement est en retard.",
                    "Tapez sur un médicament pour le marquer comme pris pour la journée."
                ]}
            />
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 px-6 pt-8 pb-6 shadow-sm sticky top-0 z-30 transition-colors">
                <div className="max-w-xl mx-auto flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Heart className="text-rose-500 fill-rose-500/20" /> Santé
                            </h1>
                            <button onClick={() => setShowHelp(true)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                <HelpCircle size={18} />
                            </button>
                        </div>
                        <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">LifeSync Health</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab("medical")}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                                activeTab === "medical" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
                            )}
                        >
                            Médical
                        </button>
                        <button
                            onClick={() => setActiveTab("challenges")}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                                activeTab === "challenges" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
                            )}
                        >
                            Défis
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-6">
                {activeTab === "medical" ? (
                    <>
                        {/* Profiles Horizontal Scroll */}
                        <div className={cn(
                            "flex items-center gap-3 pb-2 -mx-4 px-4 no-scrollbar",
                            profiles.length > 4 ? "overflow-x-auto" : "justify-center"
                        )}>
                            <button
                                onClick={() => setShowAddProfile(true)}
                                className="flex-shrink-0 w-16 h-16 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 hover:border-emerald-500 hover:text-emerald-500 transition-all"
                            >
                                <UserPlus size={24} />
                            </button>
                            {profiles.map(p => {
                                const isPet = p.type === 'pet';
                                const PetIcon = p.species === 'cat' ? Cat : p.species === 'bird' ? Bird : Dog;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProfileId(p.id)}
                                        className={cn(
                                            "flex-shrink-0 w-16 h-16 rounded-3xl flex flex-col items-center justify-center transition-all relative border-2",
                                            selectedProfileId === p.id
                                                ? (isPet ? "bg-indigo-500 border-indigo-500" : "bg-emerald-500 border-emerald-500") + " scale-110 shadow-lg"
                                                : "bg-white dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-400"
                                        )}
                                    >
                                        <span className={cn("text-lg font-black uppercase", selectedProfileId === p.id ? "text-white" : "text-slate-800 dark:text-white")}>
                                            {isPet ? <PetIcon size={24} /> : p.name.charAt(0)}
                                        </span>
                                        <span className={cn("absolute -bottom-6 text-[10px] font-black truncate w-16 text-center uppercase tracking-tighter", selectedProfileId === p.id ? (isPet ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400") : "text-slate-400")}>
                                            {p.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedProfile ? (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={selectedProfile.id} className="space-y-6 pt-4">
                                {/* Profile Stats / Quick Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                            {selectedProfile.type === 'pet' ? 'Race / Espèce' : 'Groupe Sanguin'}
                                        </p>
                                        <p className={cn("text-xl font-black", selectedProfile.type === 'pet' ? "text-indigo-500" : "text-rose-500")}>
                                            {selectedProfile.type === 'pet' ? (selectedProfile.breed || selectedProfile.species || '?') : (selectedProfile.bloodType || '?')}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                            {selectedProfile.userId ? 'Responsable' : 'Médicaments'}
                                        </p>
                                        {selectedProfile.userId ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                                    {household?.memberProfiles?.find(p => p.uid === selectedProfile.userId)?.photoURL ? (
                                                        <img src={household.memberProfiles.find(p => p.uid === selectedProfile.userId)?.photoURL} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-black">{household?.memberProfiles?.find(p => p.uid === selectedProfile.userId)?.displayName?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-300 truncate">
                                                    {household?.memberProfiles?.find(p => p.uid === selectedProfile.userId)?.displayName || 'Inconnu'}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xl font-black text-blue-500">{medications.filter(m => m.profileId === selectedProfile.id && m.active).length}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Active Medications */}
                                <section>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Soins & Rappels</h2>
                                        <button onClick={() => { setSelectedProfileId(selectedProfile.id); setShowAddMed(true); }} className="text-emerald-500 hover:text-emerald-600 font-bold text-xs flex items-center gap-1">
                                            <Plus size={14} /> Nouveau
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {medications.filter(m => {
                                            if (m.profileId !== selectedProfile.id || !m.active) return false;
                                            if (m.isPrivate && selectedProfile.userId !== user?.uid) return false;
                                            return true;
                                        }).map(m => {
                                            const completionId = `${m.id}-${todayStr}-${m.times?.[0]?.replace(':', '') || ''}`;
                                            const isDone = medCompletions[completionId];
                                            let MedIcon = Pill;
                                            if (m.category === 'pet_care') {
                                                if (m.treatmentType === 'task') MedIcon = ClipboardList;
                                                else if (m.treatmentType === 'care') MedIcon = Activity;
                                            }

                                            return (
                                                <div key={m.id} className={cn(
                                                    "bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border flex justify-between items-center group transition-all",
                                                    isDone ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/10" : "border-slate-100 dark:border-slate-800"
                                                )}>
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => toggleMedication(m.id, todayStr, m.times?.[0] || "08:00")}
                                                            className={cn(
                                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                                                                isDone ? "bg-emerald-500 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-500 hover:scale-110"
                                                            )}
                                                        >
                                                            {isDone ? <Check size={20} /> : <MedIcon size={20} />}
                                                        </button>
                                                        <div>
                                                            <h3 className={cn("font-bold text-slate-800 dark:text-white capitalize", isDone && "line-through opacity-50")}>{m.name}</h3>
                                                            <p className="text-xs text-slate-400 font-medium">
                                                                {m.dosage && `${m.dosage} • `}
                                                                {m.frequency === 'daily' ? 'Quotidien' : m.frequency === 'weekly' ? 'Hebdomadaire' : m.frequency === 'yearly' ? 'Annuel' : `Tous les ${m.customDays} jours`}
                                                                {m.category === 'pet_care' && m.nextOccurrence && (
                                                                    <span className="block text-indigo-500 font-bold mt-0.5">
                                                                        Prochain : {format(parseISO(m.nextOccurrence), 'dd MMM yyyy', { locale: fr })}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => {
                                                            setNewMed({
                                                                name: m.name,
                                                                dosage: m.dosage || "",
                                                                instruction: m.instruction || "",
                                                                frequency: m.frequency,
                                                                customDays: m.customDays || 30,
                                                                times: m.times || ["08:00"],
                                                                startDate: m.startDate,
                                                                isPrivate: m.isPrivate || false,
                                                                category: m.category || 'medication',
                                                                treatmentType: m.treatmentType || 'medication'
                                                            });
                                                            setEditingMedId(m.id);
                                                            setShowAddMed(true);
                                                        }} className="p-2 text-slate-300 hover:text-blue-500 transition-all">
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button onClick={() => deleteMedication(m.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {medications.filter(m => m.profileId === selectedProfile.id && m.active).length === 0 && (
                                            <p className="text-center py-6 text-slate-400 text-xs font-medium italic">Aucun traitement actif</p>
                                        )}
                                    </div>
                                </section>

                                {/* Health Journal */}
                                <section>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Journal de santé</h2>
                                        <button onClick={() => { setSelectedProfileId(selectedProfile.id); setShowAddEntry(true); }} className="text-purple-500 hover:text-purple-600 font-bold text-xs flex items-center gap-1">
                                            <Plus size={14} /> Note
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {history.filter(h => h.profileId === selectedProfile.id).map(h => {
                                            let counterDay = null;
                                            if (h.isCounter && h.counterStartDate) {
                                                const start = startOfDay(parseISO(h.counterStartDate));
                                                const current = startOfDay(new Date());
                                                counterDay = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                            }

                                            return (
                                                <div key={h.id} className="relative pl-6 pb-4 last:pb-0 border-l-2 border-slate-100 dark:border-slate-800 ml-4">
                                                    <div className={cn("absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-4", h.isCounter ? "border-indigo-500" : "border-emerald-500")} />
                                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 group relative">
                                                        <button
                                                            onClick={() => deleteHealthEntry(h.id)}
                                                            className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <div className="flex justify-between items-start mb-2 pr-6">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-800 dark:text-white">{h.title}</h4>
                                                                {counterDay !== null && (
                                                                    <span className="bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Jour {counterDay}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter">
                                                                {format(h.date instanceof Date ? h.date : h.date.toDate(), "d MMM", { locale: fr })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{h.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {history.filter(h => h.profileId === selectedProfile.id).length === 0 && (
                                            <p className="text-center py-6 text-slate-400 text-xs font-medium italic">Le journal est vide</p>
                                        )}
                                    </div>
                                </section>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setNewProfile({
                                                name: selectedProfile.name,
                                                birthDate: selectedProfile.birthDate || "",
                                                bloodType: selectedProfile.bloodType || "",
                                                allergies: selectedProfile.allergies?.join(", ") || "",
                                                notes: selectedProfile.notes || "",
                                                type: selectedProfile.type,
                                                species: selectedProfile.species || "dog",
                                                breed: selectedProfile.breed || "",
                                                userId: selectedProfile.userId || ""
                                            });
                                            setEditingProfileId(selectedProfile.id);
                                            setShowAddProfile(true);
                                        }}
                                        className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        Modifier le profil
                                    </button>
                                    <button onClick={() => { if (confirm("Supprimer ce profil ?")) deleteProfile(selectedProfile.id); }} className="flex-1 py-4 text-rose-500 font-bold text-xs uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity">
                                        Supprimer le profil
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="text-center py-20">
                                <Activity size={64} className="mx-auto text-slate-100 dark:text-slate-800 mb-4" />
                                <p className="text-slate-400 font-bold">Sélectionnez ou créez un profil pour commencer</p>
                            </div>
                        )}
                    </>
                ) : (
                    /* CHALLENGES TAB */
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                        {/* Hero Stats */}
                        <div className="flex gap-4">
                            <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-500 mb-3">
                                    <Flame size={24} className="fill-orange-500" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Streak</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.currentStreak} Jours</p>
                            </div>
                            <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-500 mb-3">
                                    <Trophy size={24} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meilleur</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.bestStreak} Jours</p>
                            </div>
                        </div>

                        {/* Mega Challenge Card */}
                        <section>
                            <div className={cn(
                                "relative rounded-[3.5rem] p-8 text-white shadow-2xl overflow-hidden group transition-all duration-500",
                                challenge?.completed
                                    ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/20"
                                    : "bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 shadow-purple-500/20"
                            )}>
                                {/* Animated background elements */}
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/30">
                                            <Sparkles size={16} className="text-yellow-300 fill-yellow-300" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Défi du Jour</span>
                                        </div>
                                        {challenge?.category && (
                                            <div className="text-white/60">
                                                {challenge.category === 'hydration' && <Droplets size={24} />}
                                                {challenge.category === 'activity' && <Dumbbell size={24} />}
                                                {challenge.category === 'mental' && <Moon size={24} />}
                                                {challenge.category === 'nutrition' && <Coffee size={24} />}
                                                {challenge.category === 'social' && <Heart size={24} />}
                                                {challenge.category === 'household' && <Sparkles size={24} />}
                                                {challenge.category === 'fun' && <Laugh size={24} />}
                                            </div>
                                        )}
                                    </div>

                                    {challenge ? (
                                        <>
                                            <motion.h3
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                className="text-4xl font-black mb-4 leading-tight tracking-tight"
                                            >
                                                {challenge.title}
                                            </motion.h3>
                                            <motion.p
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.1 }}
                                                className="text-lg text-white/90 font-medium mb-8 leading-relaxed max-w-[90%]"
                                            >
                                                {challenge.description}
                                            </motion.p>

                                            <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 mb-8 border border-white/10 space-y-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {/* DIFFICULTY BADGE */}
                                                    {challenge.difficulty && (
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                                            challenge.difficulty === 'easy' && "bg-emerald-500/20 text-emerald-100 border-emerald-500/30",
                                                            challenge.difficulty === 'medium' && "bg-blue-500/20 text-blue-100 border-blue-500/30",
                                                            challenge.difficulty === 'hard' && "bg-orange-500/20 text-orange-100 border-orange-500/30",
                                                            challenge.difficulty === 'expert' && "bg-rose-500/20 text-rose-100 border-rose-500/30 animate-pulse",
                                                        )}>
                                                            {challenge.difficulty}
                                                        </span>
                                                    )}

                                                    {/* TYPE BADGES */}
                                                    {challenge.type === 'coop' && (
                                                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-100 border border-indigo-500/30">
                                                            <Users size={10} /> Coop
                                                        </span>
                                                    )}
                                                    {challenge.type === 'competitive' && (
                                                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-100 border border-amber-500/30">
                                                            <Swords size={10} /> Versus
                                                        </span>
                                                    )}
                                                    {challenge.type === 'prank' && (
                                                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-100 border border-purple-500/30">
                                                            <Laugh size={10} /> Prank
                                                        </span>
                                                    )}

                                                    {/* REWARD BADGE */}
                                                    {challenge.pointsReward && challenge.pointsReward > 0 && (
                                                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-100 border border-yellow-500/30">
                                                            <Flame size={10} /> +{challenge.pointsReward} Pts
                                                        </span>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Target size={18} className="text-emerald-300" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Objectif Bien-être</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white/80">{challenge.target}</p>
                                                </div>

                                                {/* SPECIAL MOTIVATION MESSAGE */}
                                                {challenge.isSpecial && (
                                                    <div className="flex items-start gap-3 p-4 bg-orange-500/20 border border-orange-500/30 rounded-2xl">
                                                        <TrendingUp size={20} className="text-orange-200 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-black uppercase tracking-widest text-orange-200 mb-1">Coup de pouce !</p>
                                                            <p className="text-xs text-orange-100/80 leading-relaxed">
                                                                Tu es actuellement dernier du classement ménage. Réussis ce défi pour gagner <strong>{challenge.pointsReward} points</strong> et remonter la pente !
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    await toggleCompletion();
                                                    if (!challenge.completed) {
                                                        const end = Date.now() + 3000;
                                                        const colors = ['#f43f5e', '#8b5cf6', '#ec4899'];
                                                        (function frame() {
                                                            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
                                                            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
                                                            if (Date.now() < end) requestAnimationFrame(frame);
                                                        }());
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full py-6 rounded-3xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl",
                                                    challenge.completed
                                                        ? "bg-emerald-500/30 text-white border-2 border-white/40 backdrop-blur-sm"
                                                        : "bg-white text-indigo-600 hover:scale-[1.02] active:scale-[0.98] hover:shadow-white/20"
                                                )}
                                            >
                                                {challenge.completed ? (
                                                    <><Star size={24} className="fill-white" /> Défi Accompli !</>
                                                ) : (
                                                    "Valider mon défi"
                                                )}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                            <p className="font-black uppercase tracking-widest text-white/60 animate-pulse">Préparation de votre défi...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* History Section */}
                        {challengeHistory.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-4">Précédents</h3>
                                <div className="space-y-3 px-2">
                                    {challengeHistory.map((h) => (
                                        <div key={h.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                                                    h.completed ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20" : "bg-slate-50 text-slate-300 dark:bg-slate-800"
                                                )}>
                                                    {h.completed ? <Check size={20} /> : <Zap size={20} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{h.title}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        {format(parseISO(h.generatedAt), "eeee d MMMM", { locale: fr })}
                                                    </p>
                                                </div>
                                            </div>
                                            {h.completed && (
                                                <div className="flex bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                                    <Trophy size={14} className="text-emerald-500" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            {/* MODALS (Simplified for brevity) */}
            <AnimatePresence>
                {showAddProfile && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8">
                            <h3 className="text-xl font-black mb-6 dark:text-white">Nouveau Profil</h3>
                            <form onSubmit={handleAddProfile} className="space-y-4">
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setNewProfile({ ...newProfile, type: 'human' })}
                                        className={cn("flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all", newProfile.type === 'human' ? "bg-white dark:bg-slate-700 text-emerald-500 shadow-sm" : "text-slate-400")}
                                    >
                                        Humain
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewProfile({ ...newProfile, type: 'pet' })}
                                        className={cn("flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all", newProfile.type === 'pet' ? "bg-white dark:bg-slate-700 text-indigo-500 shadow-sm" : "text-slate-400")}
                                    >
                                        Animal
                                    </button>
                                </div>

                                <input required placeholder="Nom" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-emerald-500 dark:text-white font-bold" value={newProfile.name} onChange={e => setNewProfile({ ...newProfile, name: e.target.value })} />

                                {newProfile.type === 'human' ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-emerald-500 dark:text-white text-xs font-bold" value={newProfile.birthDate} onChange={e => setNewProfile({ ...newProfile, birthDate: e.target.value })} />
                                        <input placeholder="G. Sanguin" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-emerald-500 dark:text-white font-bold" value={newProfile.bloodType} onChange={e => setNewProfile({ ...newProfile, bloodType: e.target.value })} />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'dog', icon: Dog },
                                                { id: 'cat', icon: Cat },
                                                { id: 'bird', icon: Bird }
                                            ].map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => setNewProfile({ ...newProfile, species: s.id as any })}
                                                    className={cn("flex-1 p-3 rounded-2xl flex items-center justify-center transition-all", newProfile.species === s.id ? "bg-indigo-500 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400")}
                                                >
                                                    <s.icon size={20} />
                                                </button>
                                            ))}
                                        </div>
                                        <input placeholder="Race (ex: Golden Retriever)" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-indigo-500 dark:text-white font-bold" value={newProfile.breed} onChange={e => setNewProfile({ ...newProfile, breed: e.target.value })} />
                                    </div>
                                )}


                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Profil Foyer Lié</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-emerald-500 dark:text-white font-bold appearance-none cursor-pointer"
                                        value={newProfile.userId}
                                        onChange={e => setNewProfile({ ...newProfile, userId: e.target.value })}
                                    >
                                        <option value="">Aucun lien (Public)</option>
                                        {household?.memberProfiles?.map(p => (
                                            <option key={p.uid} value={p.uid}>{p.displayName}</option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-slate-400 font-medium px-2">Lier un profil permet de rendre certains traitements confidentiels.</p>
                                </div>

                                <textarea placeholder="Allergies / Particularités" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-emerald-500 dark:text-white font-medium" rows={2} value={newProfile.allergies} onChange={e => setNewProfile({ ...newProfile, allergies: e.target.value })} />
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAddProfile(false)} className="flex-1 py-4 font-bold text-slate-400">Annuler</button>
                                    <button className={cn("flex-[2] py-4 text-white rounded-2xl font-black shadow-lg", newProfile.type === 'pet' ? "bg-indigo-600" : "bg-emerald-600")}>Créer</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showAddMed && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
                            <h3 className="text-xl font-black mb-6 dark:text-white">{editingMedId ? 'Modifier' : 'Nouveau'} soin / rappel</h3>
                            <form onSubmit={handleAddMed} className="space-y-4">
                                {selectedProfile.type === 'pet' ? (
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setNewMed({ ...newMed, category: 'pet_care', treatmentType: 'medication' })}
                                            className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2", newMed.treatmentType === 'medication' ? "bg-white dark:bg-slate-700 text-blue-500 shadow-sm" : "text-slate-400")}
                                        >
                                            <Pill size={14} /> Médic.
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewMed({ ...newMed, category: 'pet_care', treatmentType: 'care' })}
                                            className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2", newMed.treatmentType === 'care' ? "bg-white dark:bg-slate-700 text-indigo-500 shadow-sm" : "text-slate-400")}
                                        >
                                            <Activity size={14} /> Soin
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewMed({ ...newMed, category: 'pet_care', treatmentType: 'task' });
                                                setSyncOptions(prev => ({ ...prev, task: true }));
                                            }}
                                            className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2", newMed.treatmentType === 'task' ? "bg-white dark:bg-slate-700 text-orange-500 shadow-sm" : "text-slate-400")}
                                        >
                                            <ClipboardList size={14} /> Tâche
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl mb-4 flex items-center justify-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-wider">
                                        <Pill size={16} /> Traitement
                                    </div>
                                )}

                                <input required placeholder="Titre (ex: Vaccin, Litière, Doliprane)" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-blue-500 dark:text-white font-bold" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} />
                                <input placeholder="Note/Dosage (ex: 1 comprimé, Rappel annuel)" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-blue-500 dark:text-white font-bold" value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })} />

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Fréquence</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-blue-500 dark:text-white font-bold appearance-none cursor-pointer"
                                        value={newMed.frequency}
                                        onChange={e => setNewMed({ ...newMed, frequency: e.target.value as any })}
                                    >
                                        <option value="daily">Quotidien</option>
                                        <option value="weekly">Hebdomadaire</option>
                                        <option value="yearly">Annuel (Vaccins...)</option>
                                        <option value="custom">Fréquence personnalisée (jours)</option>
                                    </select>
                                </div>

                                {newMed.frequency === 'custom' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Tous les combien de jours ?</label>
                                        <input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-blue-500 dark:text-white font-bold" value={newMed.customDays} onChange={e => setNewMed({ ...newMed, customDays: parseInt(e.target.value) })} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Heure</label>
                                        <input type="time" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-blue-500 dark:text-white font-bold" value={newMed.times[0]} onChange={e => setNewMed({ ...newMed, times: [e.target.value] })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Date début</label>
                                        <input type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-blue-500 dark:text-white font-bold text-xs" value={newMed.startDate} onChange={e => setNewMed({ ...newMed, startDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Shield size={16} className="text-rose-500" />
                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Réglage Confidentiel</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setNewMed({ ...newMed, isPrivate: !newMed.isPrivate })}
                                            className={cn("w-10 h-5 rounded-full relative transition-colors", newMed.isPrivate ? "bg-rose-500" : "bg-slate-200 dark:bg-slate-700")}
                                        >
                                            <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", newMed.isPrivate ? "right-1" : "left-1")} />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium">Si activé, ce traitement n'apparaîtra jamais aux autres membres, même en cas de retard à 18h.</p>
                                </div>

                                {!editingMedId && (
                                    <div className="space-y-2 px-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div onClick={() => setSyncOptions({ ...syncOptions, agenda: !syncOptions.agenda })} className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", syncOptions.agenda ? "bg-blue-500 border-blue-500" : "border-slate-200 dark:border-slate-800")}>
                                                {syncOptions.agenda && <Check size={12} className="text-white" />}
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 group-hover:text-blue-500 transition-colors">Ajouter à l'Agenda</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div onClick={() => setSyncOptions({ ...syncOptions, task: !syncOptions.task })} className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", syncOptions.task ? "bg-blue-500 border-blue-500" : "border-slate-200 dark:border-slate-800")}>
                                                {syncOptions.task && <Check size={12} className="text-white" />}
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 group-hover:text-blue-500 transition-colors">Créer une Tâche Foyer</span>
                                        </label>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => { setShowAddMed(false); setEditingMedId(null); }} className="flex-1 py-4 font-bold text-slate-400">Annuler</button>
                                    <button className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">{editingMedId ? 'Enregistrer' : 'Ajouter'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}


                {showAddEntry && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8">
                            <h3 className="text-xl font-black mb-6 dark:text-white">Note Journal</h3>
                            <form onSubmit={handleAddEntry} className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewEntry({ ...newEntry, isCounter: !newEntry.isCounter })}
                                        className={cn("p-2 rounded-xl border flex items-center gap-2 transition-all", newEntry.isCounter ? "bg-indigo-500 border-indigo-500 text-white" : "text-slate-400 border-slate-100 dark:border-slate-800")}
                                    >
                                        <CalendarDays size={16} />
                                        <span className="text-[10px] font-black uppercase">Compteur de jours</span>
                                    </button>
                                </div>

                                {newEntry.isCounter && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl mb-2 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-black uppercase mb-2">Calculateur de durée</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">Sert à afficher "Jour X" depuis un événement (ex: sortie d'opération, début de traitement).</p>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Date de l'événement (Début)</label>
                                        <input type="date" className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl outline-indigo-500 dark:text-white font-bold text-sm" value={newEntry.counterStartDate} onChange={e => setNewEntry({ ...newEntry, counterStartDate: e.target.value })} />
                                    </div>
                                )}
                                <input required placeholder="Titre (ex: Traitement tiques, Boiterie)" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-purple-500 dark:text-white font-bold" value={newEntry.title} onChange={e => setNewEntry({ ...newEntry, title: e.target.value })} />
                                <textarea required placeholder="Détails, observations..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-purple-500 dark:text-white font-medium" rows={3} value={newEntry.content} onChange={e => setNewEntry({ ...newEntry, content: e.target.value })} />
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAddEntry(false)} className="flex-1 py-4 font-bold text-slate-400">Annuler</button>
                                    <button className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg">Ajouter</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function HealthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest text-[10px]">Chargement Santé...</p>
                </div>
            </div>
        }>
            <HealthContent />
        </Suspense>
    );
}
