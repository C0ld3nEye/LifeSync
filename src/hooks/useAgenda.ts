import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";

export interface AgendaEvent {
    id: string;
    title: string;
    start: string; // ISO String
    end: string;   // ISO String
    type: 'family' | 'work' | 'sport' | 'health' | 'birthday' | 'other';
    recurrence?: 'none' | 'annual';
    allDay?: boolean;
    createdBy: string; // User UID
    assignees: string[]; // ['family'] or specific user UIDs
    reminders?: number[]; // List of minutes before the event to notify
    ownerName?: string; // Optional for display
    address?: string; // Optional location address

    metadata?: Record<string, any>; // Optional metadata for internal links
}

export function useAgenda() {
    const { household } = useHousehold();
    const { user } = useAuth();
    const [events, setEvents] = useState<AgendaEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household) {
            setLoading(false);
            return;
        }

        setLoading(true);
        // Sub-collection 'events' inside the household document
        const q = query(
            collection(db, "households", household.id, "events"),
            orderBy("start", "asc")
        );

        const unsub = onSnapshot(q, async (snap) => {
            const list: AgendaEvent[] = [];
            snap.forEach(doc => {
                const data = doc.data() as AgendaEvent;
                const isFamily = data.assignees.includes('family');
                const isForMe = data.assignees.includes(user?.uid || '');
                const isByMe = data.createdBy === user?.uid;

                if (isFamily || isForMe || isByMe) {
                    list.push({ ...data, id: doc.id });
                }
            });

            // Fetch wishlist items with due dates
            const wishlistRef = collection(db, "households", household.id, "wishlist");
            const qWish = query(wishlistRef, orderBy("dueDate", "asc"));

            const unsubWish = onSnapshot(qWish, (wSnap) => {
                const finalList = [...list];
                wSnap.forEach(wDoc => {
                    const wData = wDoc.data();
                    if (wData.dueDate) {
                        const progress = wData.amount > 0 ? Math.round(((wData.currentSavings || 0) / wData.amount) * 100) : 0;
                        const progressText = progress > 0 ? ` [${progress}%]` : "";

                        finalList.push({
                            id: `wish-${wDoc.id}`,
                            title: `Pres: ${wData.label} (${wData.amount}€)${progressText}`,
                            start: wData.dueDate,
                            end: wData.dueDate, // Single point in time
                            type: 'other',
                            allDay: true,
                            createdBy: wData.createdBy,
                            assignees: ['family'],
                            ownerName: "Wishlist"
                        });
                    }
                });
                // Inject Birthdays
                const birthdays = (household.memberProfiles || []).filter(m => m.birthDate).map(m => {
                    if (!m.birthDate) return null;
                    const birth = new Date(m.birthDate);
                    const today = new Date();
                    let nextBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());

                    if (nextBday < new Date(today.setHours(0, 0, 0, 0))) {
                        nextBday.setFullYear(today.getFullYear() + 1);
                    }

                    return {
                        id: `bday-${m.uid}-${nextBday.getFullYear()}`,
                        title: `🎂 Anniv ${m.displayName}`,
                        start: nextBday.toISOString(),
                        end: nextBday.toISOString(),
                        type: 'birthday' as const,
                        allDay: true,
                        createdBy: 'system',
                        assignees: ['family'],
                        ownerName: 'LifeSync'
                    } as AgendaEvent;
                }).filter(Boolean) as AgendaEvent[];

                setEvents([...finalList, ...birthdays].sort((a, b) => a.start.localeCompare(b.start)));
                setLoading(false);
            });

            return () => unsubWish();
        });

        return () => unsub();
    }, [household, user?.uid]);

    const addEvent = async (evt: Omit<AgendaEvent, "id" | "createdBy">) => {
        if (!household || !user) {
            console.error("AddEvent: No household or user", { household, user });
            alert("Erreur: Vous n'êtes pas connecté à un foyer. Retournez à l'accueil.");
            return;
        }

        const docRef = await addDoc(collection(db, "households", household.id, "events"), {
            ...evt,
            createdBy: user.uid,
            ownerName: user.displayName || "Membre",
        });
        return docRef.id;
    };

    const deleteEvent = async (id: string) => {
        if (!household) return;
        await deleteDoc(doc(db, "households", household.id, "events", id));
    };

    const updateEvent = async (id: string, evt: Partial<Omit<AgendaEvent, "id" | "createdBy">>) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id, "events", id), evt);
    };

    return { events, loading, addEvent, deleteEvent, updateEvent };
}
