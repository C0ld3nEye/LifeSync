"use client";

import { useProjects } from "@/hooks/useProjects";
import { Rocket, Info, ChevronRight, Truck, Plane, Sparkles, Hammer, Baby, Car, PartyPopper } from "lucide-react"; // Default icons
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { differenceInDays, startOfDay } from "date-fns";

export default function ProjectsWidget() {
    const { projects, loading } = useProjects();

    // Filter for active/planning projects
    const activeProjects = projects.filter(p => p.status === 'planning' || p.status === 'active');

    if (loading) return null; // Or skeleton

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'move': return <Truck className="text-white" size={20} />;
            case 'travel': return <Plane className="text-white" size={20} />;
            case 'renovation': return <Hammer className="text-white" size={20} />;
            case 'event': return <PartyPopper className="text-white" size={20} />;
            case 'baby': return <Baby className="text-white" size={20} />;
            case 'vehicle': return <Car className="text-white" size={20} />;
            default: return <Rocket className="text-white" size={20} />;
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
        return null;
    };

    // If no active projects, show minimal "Launcher"
    if (activeProjects.length === 0) {
        return (
            <Link href="/projects">
                <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-violet-500 transition-colors">
                            <Rocket size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">Projets de vie</p>
                            <p className="text-[10px] text-slate-400">Aucun projet en cours</p>
                        </div>
                    </div>
                </motion.div>
            </Link>
        );
    }

    // If active projects, show the first/most important one largely
    const mainProject = activeProjects[0];
    const taskCount = mainProject.tasks?.length || 0;
    const tasksDone = mainProject.tasks?.filter(t => t.status === 'done').length || 0;
    const progress = taskCount > 0 ? Math.round((tasksDone / taskCount) * 100) : 0;

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                    <Rocket size={16} className="text-violet-500" />
                    En ce moment
                </h3>
                <Link href="/projects" className="text-[10px] font-bold text-violet-500 hover:underline">
                    Voir tout
                </Link>
            </div>

            <Link href={`/projects/${mainProject.id}`}>
                <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2rem] p-5 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                                    {getTypeIcon(mainProject.type)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg leading-tight">{mainProject.title}</h4>
                                    <p className="text-xs text-violet-200 font-medium opacity-80 uppercase tracking-wide">
                                        {mainProject.type === 'move' ? 'Déménagement' :
                                            mainProject.type === 'travel' ? 'Voyage' :
                                                mainProject.type === 'renovation' ? 'Rénovation' :
                                                    mainProject.type === 'event' ? 'Événement' :
                                                        mainProject.type === 'baby' ? 'Bébé' :
                                                            mainProject.type === 'vehicle' ? 'Véhicule' : 'Projet'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold border border-white/10">
                                    {progress}%
                                </div>
                                {mainProject.dates?.start && getCountdown(mainProject.dates.start) && (
                                    <div className="bg-amber-400 text-white px-2 py-0.5 rounded-full text-[9px] font-black shadow-lg shadow-amber-500/30">
                                        {getCountdown(mainProject.dates.start)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mini Dashboard */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-black/20 rounded-xl p-2 backdrop-blur-sm border border-white/5">
                                <p className="text-[10px] uppercase opacity-70 mb-0.5">Tâches</p>
                                <p className="font-bold text-sm">{tasksDone}/{taskCount}</p>
                            </div>
                            <div className="bg-black/20 rounded-xl p-2 backdrop-blur-sm border border-white/5">
                                <p className="text-[10px] uppercase opacity-70 mb-0.5">Budget</p>
                                <p className="font-bold text-sm">
                                    {Math.round(mainProject.budget?.expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0)}€
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </Link>

            {/* If more than 1 project, show small pills for others? Maybe later. For now, focus on main project to keep it clean. */}
        </div>
    );
}
