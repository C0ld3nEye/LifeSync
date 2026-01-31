import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";

export interface ProjectExpense {
    id: string;
    label: string;
    amount: number;
    paidBy: string; // uid
    date: string; // ISO
    category?: 'transport' | 'accommodation' | 'food' | 'activity' | 'material' | 'service' | 'other';
}

export interface ProjectTask {
    id: string;
    title: string;
    status: 'todo' | 'doing' | 'done';
    assignee?: string; // uid
    dueDate?: string; // ISO
    priority?: 'low' | 'medium' | 'high';
}

export interface Project {
    id: string;
    title: string;
    type: 'move' | 'travel' | 'renovation' | 'event' | 'baby' | 'vehicle' | 'other';
    status: 'planning' | 'active' | 'completed' | 'paused';
    description?: string;
    dates?: { start: string; end: string }; // ISO
    location?: string;
    coverImage?: string; // Emoji or predefined image URL

    // Embedded collections (initially embedded for simplicity, could be subcollections if large)
    budget: {
        targetAmount: number;
        expenses: ProjectExpense[];
    };
    tasks: ProjectTask[];

    createdBy: string;
    createdAt: string;
}

export function useProjects() {
    const { household } = useHousehold();
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household?.id) {
            setProjects([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        // Projects are stored in a subcollection of the household
        const q = query(collection(db, "households", household.id, "projects"), orderBy("createdAt", "desc"));

        const unsub = onSnapshot(q, (snapshot) => {
            const list: Project[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Project);
            });
            setProjects(list);
            setLoading(false);
        });

        return () => unsub();
    }, [household?.id]);

    const addProject = async (data: Omit<Project, "id" | "createdAt" | "createdBy" | "budget" | "tasks"> & { initialTasks?: ProjectTask[] }) => {
        if (!household?.id || !user) return;

        const newProject = {
            ...data,
            budget: { targetAmount: 0, expenses: [] },
            tasks: data.initialTasks || [],
            createdBy: user.uid,
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, "households", household.id, "projects"), newProject);
    };

    const updateProject = async (projectId: string, data: Partial<Project>) => {
        if (!household?.id) return;
        const ref = doc(db, "households", household.id, "projects", projectId);
        await updateDoc(ref, data);
    };

    const deleteProject = async (projectId: string) => {
        if (!household?.id) return;
        await deleteDoc(doc(db, "households", household.id, "projects", projectId));
    };

    // --- Task Management Helpers ---
    const addTask = async (projectId: string, task: Omit<ProjectTask, "id">) => {
        const project = projects.find(p => p.id === projectId);
        if (!project || !household?.id) return;

        const newTask: ProjectTask = { ...task, id: Math.random().toString(36).substring(2, 9) };
        const updatedTasks = [...(project.tasks || []), newTask]; // Initialize empty if undefined

        await updateDoc(doc(db, "households", household.id, "projects", projectId), {
            tasks: updatedTasks
        });
    };

    const updateTask = async (projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
        const project = projects.find(p => p.id === projectId);
        if (!project || !household?.id) return;

        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        await updateDoc(doc(db, "households", household.id, "projects", projectId), {
            tasks: updatedTasks
        });
    };

    const deleteTask = async (projectId: string, taskId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project || !household?.id) return;

        const updatedTasks = project.tasks.filter(t => t.id !== taskId);
        await updateDoc(doc(db, "households", household.id, "projects", projectId), {
            tasks: updatedTasks
        });
    };

    // --- Budget Management Helpers ---
    const addExpense = async (projectId: string, expense: Omit<ProjectExpense, "id">) => {
        const project = projects.find(p => p.id === projectId);
        if (!project || !household?.id) return;

        const newExpense: ProjectExpense = { ...expense, id: Math.random().toString(36).substring(2, 9) };
        const currentBudget = project.budget || { targetAmount: 0, expenses: [] };

        await updateDoc(doc(db, "households", household.id, "projects", projectId), {
            budget: {
                ...currentBudget,
                expenses: [...currentBudget.expenses, newExpense]
            }
        });
    };

    const deleteExpense = async (projectId: string, expenseId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project || !household?.id) return;

        const currentBudget = project.budget || { targetAmount: 0, expenses: [] };

        await updateDoc(doc(db, "households", household.id, "projects", projectId), {
            budget: {
                ...currentBudget,
                expenses: currentBudget.expenses.filter(e => e.id !== expenseId)
            }
        });
    };

    const updateBudgetTarget = async (projectId: string, amount: number) => {
        const project = projects.find(p => p.id === projectId);
        if (!project || !household?.id) return;

        const currentBudget = project.budget || { targetAmount: 0, expenses: [] };

        await updateDoc(doc(db, "households", household.id, "projects", projectId), {
            budget: {
                ...currentBudget,
                targetAmount: amount
            }
        });
    };


    return {
        projects,
        loading,
        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        addExpense,
        deleteExpense,
        updateBudgetTarget
    };
}
