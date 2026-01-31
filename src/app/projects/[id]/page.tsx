"use client";

import { useState, useMemo } from "react";
import { useProjects, ProjectTask, ProjectExpense } from "@/hooks/useProjects";
import { useBudget } from "@/hooks/useBudget";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Plus, Trash2, Wallet, ListTodo, Calendar, Loader, Euro, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { projects, loading, addTask, updateTask, deleteTask, addExpense, deleteExpense, updateBudgetTarget, deleteProject } = useProjects();
    const { expenses: externalExpenses } = useBudget();

    // UI State
    const [activeTab, setActiveTab] = useState<'tasks' | 'budget'>('tasks');
    const [newTaskTitle, setNewTaskTitle] = useState("");

    // Budget Form
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expenseLabel, setExpenseLabel] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [targetAmountInput, setTargetAmountInput] = useState("");

    const project = useMemo(() => projects.find(p => p.id === id), [projects, id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400"><Loader className="animate-spin mr-2" /> Chargement...</div>;
    if (!project) return <div className="min-h-screen flex flex-col items-center justify-center text-slate-400"><p>Projet introuvable</p><Link href="/projects" className="text-blue-500 mt-4 font-bold">Retour aux projets</Link></div>;

    // Derived Data
    const tasks = project.tasks || [];
    const todoTasks = tasks.filter(t => t.status !== 'done');
    const doneTasks = tasks.filter(t => t.status === 'done');
    const budget = project.budget || { targetAmount: 0, expenses: [] };
    const linkedExpenses = externalExpenses.filter(e => e.projectId === id);
    const totalSpent = budget.expenses.reduce((acc, curr) => acc + curr.amount, 0) + linkedExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Handlers
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        await addTask(project.id, {
            title: newTaskTitle,
            status: 'todo',
            priority: 'medium'
        });
        setNewTaskTitle("");
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseLabel.trim() || !expenseAmount) return;

        await addExpense(project.id, {
            label: expenseLabel,
            amount: parseFloat(expenseAmount),
            date: new Date().toISOString(),
            paidBy: "me", // TODO: Implement real user ID
            category: 'other'
        });

        setExpenseLabel("");
        setExpenseAmount("");
        setShowAddExpense(false);
    };

    const handleUpdateTarget = async () => {
        const val = parseFloat(targetAmountInput);
        if (!isNaN(val)) {
            await updateBudgetTarget(project.id, val);
        }
        setIsEditingTarget(false);
    };

    const handleDeleteProject = async () => {
        if (confirm("Voulez-vous vraiment supprimer ce projet ?")) {
            await deleteProject(project.id);
            router.push("/projects");
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/projects" className="p-2 -ml-2 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex-1 text-center">
                        <h1 className="font-bold text-slate-800 dark:text-white truncate px-4">{project.title}</h1>
                    </div>
                    <button onClick={handleDeleteProject} className="p-2 -mr-2 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={cn("flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors relative",
                            activeTab === 'tasks' ? "text-violet-600 dark:text-violet-400" : "text-slate-400"
                        )}
                    >
                        <ListTodo size={16} /> Tâches
                        {activeTab === 'tasks' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('budget')}
                        className={cn("flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors relative",
                            activeTab === 'budget' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                        )}
                    >
                        <Wallet size={16} /> Budget
                        {activeTab === 'budget' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400" />}
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4">
                <AnimatePresence mode="wait">
                    {activeTab === 'tasks' ? (
                        <motion.div
                            key="tasks"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Add Task Input */}
                            <form onSubmit={handleAddTask} className="relative">
                                <input
                                    className="w-full p-4 pr-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 font-medium outline-violet-500 placeholder:text-slate-300 dark:text-white"
                                    placeholder="Ajouter une tâche..."
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newTaskTitle.trim()}
                                    className="absolute right-2 top-2 bottom-2 aspect-square bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center hover:bg-violet-200 dark:hover:bg-violet-900/50 transition disabled:opacity-50"
                                >
                                    <Plus size={20} />
                                </button>
                            </form>

                            {/* Todo List */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider ml-2 flex items-center gap-2">
                                    À Faire ({todoTasks.length})
                                </h3>
                                {todoTasks.length === 0 && <p className="text-center italic text-slate-400 py-4 text-sm">Rien à faire, profitez-en ! 🎉</p>}
                                {todoTasks.map(task => (
                                    <motion.div layout key={task.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3 group">
                                        <button
                                            onClick={() => updateTask(project.id, task.id, { status: 'done' })}
                                            className="text-slate-300 hover:text-emerald-500 transition-colors"
                                        >
                                            <Circle size={22} strokeWidth={2.5} />
                                        </button>
                                        <span className="flex-1 font-bold text-slate-700 dark:text-slate-200">{task.title}</span>
                                        <button onClick={() => deleteTask(project.id, task.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Done List */}
                            {doneTasks.length > 0 && (
                                <div className="space-y-3 opacity-60">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider ml-2">Complétées ({doneTasks.length})</h3>
                                    {doneTasks.map(task => (
                                        <motion.div layout key={task.id} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                            <button
                                                onClick={() => updateTask(project.id, task.id, { status: 'todo' })}
                                                className="text-emerald-500"
                                            >
                                                <CheckCircle2 size={22} />
                                            </button>
                                            <span className="flex-1 font-medium text-slate-500 line-through decoration-slate-300">{task.title}</span>
                                            <button onClick={() => deleteTask(project.id, task.id)} className="text-slate-300 hover:text-red-400">
                                                <Trash2 size={16} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="budget"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Budget Summary Card */}
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 text-white shadow-lg shadow-emerald-500/20">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Dépensé</p>
                                        <p className="text-4xl font-black">{totalSpent}€</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Budget Cible</p>
                                        {isEditingTarget ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    className="w-24 bg-white/20 text-white font-bold p-1 rounded text-right outline-none"
                                                    value={targetAmountInput}
                                                    onChange={e => setTargetAmountInput(e.target.value)}
                                                    onBlur={() => handleUpdateTarget()}
                                                    onKeyDown={e => e.key === 'Enter' && handleUpdateTarget()}
                                                />
                                                <span className="text-sm">€</span>
                                            </div>
                                        ) : (
                                            <p
                                                onClick={() => { setTargetAmountInput(budget.targetAmount.toString()); setIsEditingTarget(true); }}
                                                className="text-xl font-bold cursor-pointer hover:bg-white/10 px-2 py-1 rounded transition"
                                            >
                                                {budget.targetAmount}€
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="bg-black/20 h-3 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((totalSpent / (budget.targetAmount || 1)) * 100, 100)}%` }}
                                        className={cn("h-full rounded-full bg-white", totalSpent > budget.targetAmount && budget.targetAmount > 0 ? "bg-red-400" : "bg-white")}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] font-bold text-emerald-100">
                                    <span>0%</span>
                                    <span>{budget.targetAmount > 0 ? Math.round((totalSpent / budget.targetAmount) * 100) : 0}% du budget</span>
                                </div>
                            </div>

                            {/* Expenses List */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center mb-2 px-2">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                        Dépenses ({budget.expenses.length + linkedExpenses.length})
                                    </h3>
                                    <button
                                        onClick={() => setShowAddExpense(true)}
                                        className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition"
                                    >
                                        + Ajouter
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showAddExpense && (
                                        <motion.form
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            onSubmit={handleAddExpense}
                                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden mb-4"
                                        >
                                            <div className="flex gap-2 mb-3">
                                                <input
                                                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold outline-emerald-500"
                                                    placeholder="Quoi ? (ex: Cartons)"
                                                    value={expenseLabel}
                                                    onChange={e => setExpenseLabel(e.target.value)}
                                                    autoFocus
                                                />
                                                <input
                                                    type="number"
                                                    className="w-24 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold outline-emerald-500 text-right"
                                                    placeholder="Montant"
                                                    value={expenseAmount}
                                                    onChange={e => setExpenseAmount(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => setShowAddExpense(false)} className="px-3 py-1.5 text-xs font-bold text-slate-400">Annuler</button>
                                                <button type="submit" disabled={!expenseLabel || !expenseAmount} className="px-3 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-500/20">Ajouter</button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>

                                {/* Direct Project Expenses */}
                                {budget.expenses.map(expense => (
                                    <div key={expense.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                <Euro size={14} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{expense.label}</p>
                                                <p className="text-[10px] text-slate-400">{format(parseISO(expense.date), "d MMM", { locale: fr })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-slate-800 dark:text-white">{expense.amount}€</span>
                                            <button onClick={() => deleteExpense(project.id, expense.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Linked Budget Expenses */}
                                {linkedExpenses.map(expense => (
                                    <div key={expense.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center group ring-1 ring-violet-500/10">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                                                <Wallet size={14} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{expense.label}</p>
                                                    <span className="text-[8px] font-black bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full uppercase">Budget</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400">{expense.date?.toDate ? format(expense.date.toDate(), "d MMM", { locale: fr }) : "Récemment"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-slate-800 dark:text-white">{expense.amount}€</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div >
    );
}

// Simple Helper for safe date parsing since imported elsewhere
function parseISO(dateStr: string) {
    return new Date(dateStr);
}
