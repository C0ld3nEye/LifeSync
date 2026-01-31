"use client";

import { useState } from "react";
import { useProjects, Project, ProjectTask } from "@/hooks/useProjects";
import { Plus, X, Rocket, Truck, Plane, Sparkles, Calendar, ChevronRight, Hammer, Baby, Car, PartyPopper, HelpCircle } from "lucide-react";
import InfoModal from "@/components/ui/InfoModal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format, differenceInDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

export default function ProjectsPage() {
    const { projects, loading, addProject, deleteProject } = useProjects();
    const [showAdd, setShowAdd] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [type, setType] = useState<Project['type']>('other');
    const [description, setDescription] = useState("");
    const [dates, setDates] = useState({ start: "", end: "" });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        let initialTasks: ProjectTask[] = [];

        // Template Logic
        if (type === 'move') {
            initialTasks = [
                { id: "1", title: "Trier les affaires", status: "todo", priority: "medium" },
                { id: "2", title: "Acheter des cartons", status: "todo", priority: "medium" },
                { id: "3", title: "Faire les cartons", status: "todo", priority: "high" },
                { id: "4", title: "Changement d'adresse (Services)", status: "todo", priority: "high" },
                { id: "5", title: "État des lieux Sortie", status: "todo", priority: "high" },
                { id: "6", title: "État des lieux Entrée", status: "todo", priority: "high" },
                { id: "7", title: "Réserver camion/déménageurs", status: "todo", priority: "high" },
            ];
        } else if (type === 'renovation') {
            initialTasks = [
                { id: "1", title: "Définir le budget", status: "todo", priority: "high" },
                { id: "2", title: "Demander des devis", status: "todo", priority: "high" },
                { id: "3", title: "Acheter les matériaux", status: "todo", priority: "medium" },
                { id: "4", title: "Protéger les sols/meubles", status: "todo", priority: "medium" },
                { id: "5", title: "Travaux : Gros œuvre", status: "todo", priority: "high" },
                { id: "6", title: "Finitions & Nettoyage", status: "todo", priority: "medium" },
            ];
        } else if (type === 'event') {
            initialTasks = [
                { id: "1", title: "Liste d'invités", status: "todo", priority: "high" },
                { id: "2", title: "Réserver lieu / Restau", status: "todo", priority: "high" },
                { id: "3", title: "Boissons & Nourriture", status: "todo", priority: "medium" },
                { id: "4", title: "Playlist / Musique", status: "todo", priority: "low" },
                { id: "5", title: "Décoration", status: "todo", priority: "low" },
            ];
        } else if (type === 'baby') {
            initialTasks = [
                { id: "1", title: "Préparer la chambre", status: "todo", priority: "medium" },
                { id: "2", title: "Liste de naissance", status: "todo", priority: "high" },
                { id: "3", title: "Achat Poussette/Siège auto", status: "todo", priority: "high" },
                { id: "4", title: "Vêtements (0-3 mois)", status: "todo", priority: "medium" },
                { id: "5", title: "Inscription Crèche/Nounou", status: "todo", priority: "high" },
                { id: "6", title: "Valise maternité", status: "todo", priority: "high" },
            ];
        } else if (type === 'vehicle') {
            initialTasks = [
                { id: "1", title: "Définir critères & budget", status: "todo", priority: "high" },
                { id: "2", title: "Sélectionner annonces", status: "todo", priority: "medium" },
                { id: "3", title: "Essais véhicules", status: "todo", priority: "high" },
                { id: "4", title: "Vérifier historique/entretien", status: "todo", priority: "high" },
                { id: "5", title: "Assurance & Carte grise", status: "todo", priority: "high" },
            ];
        }

        await addProject({
            title,
            type,
            description,
            status: 'planning',
            dates: dates.start ? { start: new Date(dates.start).toISOString(), end: dates.end ? new Date(dates.end).toISOString() : "" } : undefined,
            initialTasks
        });

        setShowAdd(false);
        resetForm();
    };

    const resetForm = () => {
        setTitle("");
        setType("other");
        setDescription("");
        setDates({ start: "", end: "" });
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'move': return <Truck className="text-blue-500" />;
            case 'travel': return <Plane className="text-emerald-500" />;
            case 'renovation': return <Hammer className="text-orange-500" />;
            case 'event': return <PartyPopper className="text-purple-500" />;
            case 'baby': return <Baby className="text-pink-500" />;
            case 'vehicle': return <Car className="text-slate-600" />;
            default: return <Rocket className="text-slate-500" />;
        }
    };

    const getCountdown = (dateStr?: string) => {
        if (!dateStr) return null;
        const today = startOfDay(new Date());
        const projectDate = startOfDay(new Date(dateStr));
        const diff = differenceInDays(projectDate, today);

        if (diff === 0) return "Aujourd'hui";
        if (diff === 1) return "Demain";
        if (diff > 1) return `J-${diff}`;
        if (diff < 0) return `Passé (${Math.abs(diff)} j)`;
        return null;
    };


    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 p-4 transition-colors">
            <header className="mb-6 flex justify-between items-center">
                <Link href="/" className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                    <ChevronRight className="rotate-180 mr-1" size={16} /> Accueil
                </Link>
            </header>

            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Vos Projets de Vie"
                description="Gérez vos grands événements et travaux avec des listes dédiées."
                accentColor="violet"
                items={[
                    { title: "Modèles Thématiques", description: "Déménagement, Voyage, Travaux, Bébé... avec tâches pré-remplies.", icon: Sparkles, color: "violet" },
                    { title: "Suivi du Budget", description: "Définissez un objectif et suivez vos dépenses réelles par projet.", icon: Car, color: "emerald" },
                    { title: "Gestion des Tâches", description: "Listez et assignez tout ce qu'il y a à faire pour réussir.", icon: Rocket, color: "blue" }
                ]}
                tips={[
                    "Les jauges de progression vous indiquent l'avancement global en un coup d'œil.",
                    "Supprimez un projet une fois terminé pour libérer votre tableau de bord."
                ]}
            />

            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Rocket className="text-violet-600 dark:text-violet-400" /> Projets de Vie
                        <button onClick={() => setShowHelp(true)} className="text-slate-300 hover:text-violet-500 transition-colors">
                            <HelpCircle size={20} />
                        </button>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Gérez vos grands moments, sans stress.
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)} className="bg-violet-600 text-white px-4 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-violet-500/30 hover:bg-violet-700 transition flex items-center gap-2 active:scale-95">
                    <Plus size={18} /> Nouveau Projet
                </button>
            </div>

            <div className="grid gap-4">
                {projects.map(project => {
                    const taskCount = project.tasks?.length || 0;
                    const tasksDone = project.tasks?.filter(t => t.status === 'done').length || 0;
                    const progress = taskCount > 0 ? Math.round((tasksDone / taskCount) * 100) : 0;

                    const budgetSpent = project.budget?.expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
                    const budgetTarget = project.budget?.targetAmount || 0;

                    return (
                        <Link href={`/projects/${project.id}`} key={project.id}>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-bl-[4rem] -mr-8 -mt-8 z-0 transition-colors group-hover:bg-violet-50 dark:group-hover:bg-violet-900/10" />

                                <div className="relative z-10 flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                                            {getTypeIcon(project.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">{project.title}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                                {project.type === 'move' ? 'Déménagement' :
                                                    project.type === 'travel' ? 'Voyage' :
                                                        project.type === 'renovation' ? 'Rénovation' :
                                                            project.type === 'event' ? 'Événement' :
                                                                project.type === 'baby' ? 'Bébé' :
                                                                    project.type === 'vehicle' ? 'Véhicule' : 'Projet'}
                                            </p>
                                        </div>
                                    </div>
                                    {project.dates?.start && (
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                                                <Calendar size={10} /> {format(new Date(project.dates.start), "MMM yyyy", { locale: fr })}
                                            </span>
                                            {getCountdown(project.dates.start) && (
                                                <span className={cn(
                                                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                                                    (getCountdown(project.dates.start)?.startsWith('J-') || getCountdown(project.dates.start) === 'Demain')
                                                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                                                        : getCountdown(project.dates.start) === "Aujourd'hui"
                                                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                )}>
                                                    {getCountdown(project.dates.start)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10 grid grid-cols-2 gap-4 mt-6">
                                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tâches</span>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{tasksDone}/{taskCount}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Budget</span>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{Math.round(budgetSpent)}€</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-500", budgetSpent > budgetTarget && budgetTarget > 0 ? "bg-red-500" : "bg-emerald-500")}
                                                style={{ width: budgetTarget > 0 ? `${Math.min((budgetSpent / budgetTarget) * 100, 100)}%` : '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    );
                })}

                {projects.length === 0 && !loading && (
                    <div className="text-center py-12 bg-slate-100/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Rocket className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="font-bold text-slate-600 dark:text-slate-400">Aucun projet en cours</h3>
                        <p className="text-xs text-slate-400 mt-1">Lancez-vous dans une nouvelle aventure !</p>
                        <button onClick={() => setShowAdd(true)} className="mt-4 text-violet-600 font-bold text-sm hover:underline">Créer un projet</button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showAdd && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
                            <button
                                onClick={() => setShowAdd(false)}
                                className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition z-10"
                            >
                                <X size={20} />
                            </button>

                            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 pr-10">
                                Nouveau Projet
                            </h2>
                            <p className="text-xs text-slate-400 font-medium mb-6">Sélectionnez un type pour pré-remplir les tâches.</p>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('move')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                            type === 'move' ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <Truck size={24} />
                                        <span className="font-bold text-[10px] uppercase">Déménag.</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('travel')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                            type === 'travel' ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <Plane size={24} />
                                        <span className="font-bold text-[10px] uppercase">Voyage</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('renovation')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                            type === 'renovation' ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" : "border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <Hammer size={24} />
                                        <span className="font-bold text-[10px] uppercase">Travaux</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('event')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                            type === 'event' ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <PartyPopper size={24} />
                                        <span className="font-bold text-[10px] uppercase">Fête</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('baby')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                            type === 'baby' ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400" : "border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <Baby size={24} />
                                        <span className="font-bold text-[10px] uppercase">Bébé</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('vehicle')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                            type === 'vehicle' ? "border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300" : "border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <Car size={24} />
                                        <span className="font-bold text-[10px] uppercase">Auto</span>
                                    </button>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Titre du projet</label>
                                    <input
                                        autoFocus
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl font-bold outline-violet-500 border-none"
                                        placeholder={type === 'move' ? "Ex: Déménagement Lyon" : "Ex: Roadtrip Japon"}
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Début (Approx)</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl font-bold outline-violet-500 text-sm"
                                            value={dates.start}
                                            onChange={e => setDates({ ...dates, start: e.target.value })}
                                        />
                                        {dates.start && (
                                            <button
                                                type="button"
                                                onClick={() => setDates({ ...dates, start: "" })}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Fin</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl font-bold outline-violet-500 text-sm"
                                            value={dates.end}
                                            onChange={e => setDates({ ...dates, end: e.target.value })}
                                        />
                                        {dates.end && (
                                            <button
                                                type="button"
                                                onClick={() => setDates({ ...dates, end: "" })}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!title.trim()}
                                    className="w-full bg-violet-600 text-white rounded-2xl py-4 font-black shadow-xl shadow-violet-500/30 hover:bg-violet-700 transition active:scale-95 disabled:opacity-50 disabled:shadow-none"
                                >
                                    Valider le Projet
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
