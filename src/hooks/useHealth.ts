import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy, Timestamp, setDoc, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { addDays, format, parseISO } from "date-fns";

// Minimal interfaces for Agenda and Chores to avoid circular imports
interface SyncAgendaEvent {
    title: string;
    start: string;
    end: string;
    type: 'health';
    assignees: string[];
    createdBy: string;
    ownerName: string;
}

interface SyncChore {
    title: string;
    done: boolean;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    points: number;
    category: 'household';
    createdAt: string;
    createdBy: string;
    assignees: string[];
    dueDate?: string | null;
}

export interface HealthProfile {
    id: string;
    userId?: string;
    type: 'human' | 'pet';
    species?: 'dog' | 'cat' | 'bird' | 'other';
    name: string;
    birthDate?: string;
    bloodType?: string;
    breed?: string;
    chipNumber?: string;
    allergies?: string[];
    notes?: string;
    avatar?: string;
}

export interface Medication {
    id: string;
    profileId: string;
    name: string;
    dosage: string;
    instruction?: string;
    frequency: 'daily' | 'weekly' | 'custom' | 'yearly';
    customDays?: number; // For "every 37 days"
    times?: string[];
    startDate: string;
    endDate?: string;
    active: boolean;
    isPrivate?: boolean;
    category?: 'medication' | 'pet_care'; // 'medication' = Human, 'pet_care' = Pet (Any type)
    treatmentType?: 'medication' | 'care' | 'task'; // Sub-category for pets
    lastOccurrence?: string;
    nextOccurrence?: string;
}

export interface HealthEntry {
    id: string;
    profileId: string;
    date: any;
    type: 'visit' | 'symptom' | 'note' | 'measure' | 'counter';
    title: string;
    content: string;
    isCounter?: boolean;
    counterStartDate?: string; // YYYY-MM-DD
    attachments?: string[];
}

export function useHealth() {
    const { household, updateMemberProfile, addPoints } = useHousehold();
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<HealthProfile[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [medCompletions, setMedCompletions] = useState<Record<string, boolean>>({});
    const [history, setHistory] = useState<HealthEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household) return;

        const profilesRef = collection(db, "households", household.id, "healthProfiles");
        const medsRef = collection(db, "households", household.id, "medications");
        const historyRef = collection(db, "households", household.id, "healthHistory");
        const completionsRef = collection(db, "households", household.id, "medicationCompletions");

        const unsubProfiles = onSnapshot(profilesRef, (snapshot) => {
            setProfiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthProfile)));
        });

        const unsubMeds = onSnapshot(medsRef, (snapshot) => {
            setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
        });

        const unsubCompletions = onSnapshot(completionsRef, (snapshot) => {
            const data: Record<string, boolean> = {};
            snapshot.docs.forEach(doc => {
                data[doc.id] = doc.data().completed;
            });
            setMedCompletions(data);
        });

        const unsubHistory = onSnapshot(query(historyRef, orderBy("date", "desc")), (snapshot) => {
            setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthEntry)));
            setLoading(false);
        });

        return () => {
            unsubProfiles();
            unsubMeds();
            unsubCompletions();
            unsubHistory();
        };
    }, [household]);

    const addProfile = async (profile: Omit<HealthProfile, "id">) => {
        if (!household) return;
        const userId = profile.userId || (profile.type === 'human' ? user?.uid : null);

        // Sync birthDate to User Profile
        if (userId && profile.birthDate) {
            await updateMemberProfile(userId, { birthDate: profile.birthDate });
        }

        return addDoc(collection(db, "households", household.id, "healthProfiles"), {
            ...profile,
            type: profile.type || 'human',
            userId
        });
    };

    const updateProfile = async (id: string, updates: Partial<HealthProfile>) => {
        if (!household) return;

        // Sync birthDate if changed
        if (updates.birthDate) {
            const currentProfile = profiles.find(p => p.id === id);
            const targetUid = updates.userId || currentProfile?.userId;

            if (targetUid) {
                await updateMemberProfile(targetUid, { birthDate: updates.birthDate });
            }
        }

        return updateDoc(doc(db, "households", household.id, "healthProfiles", id), updates);
    };

    const deleteProfile = async (id: string) => {
        if (!household) return;
        return deleteDoc(doc(db, "households", household.id, "healthProfiles", id));
    };

    const addMedication = async (med: Omit<Medication, "id">, syncTo?: { agenda?: boolean, task?: boolean }) => {
        if (!household || !user) return;

        const medicationData = {
            ...med,
            isPrivate: med.isPrivate ?? false,
            category: med.category || 'medication'
        };

        const docRef = await addDoc(collection(db, "households", household.id, "medications"), medicationData);

        // Optional Sync Logic
        // [MODIFIED] Agenda sync is now virtual only, so we don't creating physical events to avoid duplicates.

        if (syncTo?.task) {
            const isPet = profiles.find(p => p.id === med.profileId)?.type === 'pet';
            let prefix = isPet ? "🐾 " : "💊 ";
            if (isPet && med.treatmentType) {
                if (med.treatmentType === 'task') prefix = "📋 ";
                else if (med.treatmentType === 'care') prefix = "🩺 ";
                else if (med.treatmentType === 'medication') prefix = "💊 ";
            }

            await addDoc(collection(db, "households", household.id, "chores"), {
                title: `${prefix}${med.name}`,
                done: false,
                frequency: med.frequency === 'custom' ? 'custom' : (med.frequency === 'daily' ? 'daily' : (med.frequency === 'yearly' ? 'annual' : 'once')),
                customInterval: med.customDays,
                points: isPet ? 0 : 5,
                category: isPet ? 'pet' : 'household',
                createdAt: new Date().toISOString(),
                createdBy: user.uid,
                assignees: [],
                dueDate: med.startDate + "T23:59:59Z",
                metadata: { medId: docRef.id }
            } as any);
        }

        return docRef;
    };

    const updateMedication = async (id: string, updates: Partial<Medication>) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id, "medications", id), updates);

        // Sync with Agenda Event (Always try to sync)
        try {
            const eventsRef = collection(db, "households", household.id, "events");
            const q = query(eventsRef, where("metadata.medId", "==", id));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const eventDoc = snapshot.docs[0];
                const med = medications.find(m => m.id === id); // Current state (might be stale vs updates, but we merge)
                if (!med) return;

                const newMed = { ...med, ...updates };
                const profile = profiles.find(p => p.id === newMed.profileId);
                const isPet = profile?.type === 'pet';

                const targetUid = profile?.userId || user?.uid;
                const assignees = [targetUid!];

                let icon = isPet ? '🐾' : '💊';
                const finalTitle = `${icon} ${newMed.name}`; // Simplified title for test

                await updateDoc(eventDoc.ref, {
                    assignees,
                    title: finalTitle
                });
            }
        } catch (err) {
            console.error("Failed to sync medication update to agenda:", err);
        }
    };

    const deleteMedication = async (id: string) => {
        if (!household) return;
        return deleteDoc(doc(db, "households", household.id, "medications", id));
    };

    const toggleMedication = async (medId: string, date: string, time: string) => {
        if (!household) return;
        const completionId = `${medId}-${date}-${time.replace(':', '')}`;
        const isCompleted = medCompletions[completionId] || false;

        const med = medications.find(m => m.id === medId);

        // Logic for Pet Tasks Gamification
        // [MODIFIED] Points disabled for pets as per user request (Only household chores award points)
        /*
        if (med && med.category === 'pet_care' && user) {
            const points = 5;
            const reason = med.treatmentType === 'task' ? med.name : `Soin : ${med.name}`;
            const pointsChange = !isCompleted ? points : -points;

            // Log points
            addPoints(user.uid, pointsChange, reason, 'pet');
        }
        */

        // If it's a pet care task and matches the most recent occurrence, update next occurrence
        if (med && med.category === 'pet_care' && !isCompleted) {
            let nextDate = parseISO(date);
            if (med.frequency === 'daily') nextDate = addDays(nextDate, 1);
            else if (med.frequency === 'weekly') nextDate = addDays(nextDate, 7);
            else if (med.frequency === 'yearly') nextDate = addDays(nextDate, 365);
            else if (med.frequency === 'custom' && med.customDays) nextDate = addDays(nextDate, med.customDays);

            await updateDoc(doc(db, "households", household.id, "medications", medId), {
                lastOccurrence: date,
                nextOccurrence: format(nextDate, 'yyyy-MM-dd')
            });
        }

        return setDoc(doc(db, "households", household.id, "medicationCompletions", completionId), {
            medId,
            date,
            time,
            completed: !isCompleted,
            updatedAt: Timestamp.now()
        });
    };

    const addHealthEntry = async (entry: Omit<HealthEntry, "id">) => {
        if (!household) return;
        return addDoc(collection(db, "households", household.id, "healthHistory"), {
            ...entry,
            date: Timestamp.now()
        });
    };

    const deleteHealthEntry = async (id: string) => {
        if (!household) return;
        return deleteDoc(doc(db, "households", household.id, "healthHistory", id));
    };

    return {
        profiles,
        medications,
        medCompletions,
        history,
        loading,
        addProfile,
        updateProfile,
        deleteProfile,
        addMedication,
        updateMedication,
        deleteMedication,
        toggleMedication,
        addHealthEntry,
        deleteHealthEntry
    };
}
