"use client";

import { useState, useEffect } from "react";
import { useAgenda, AgendaEvent } from "@/hooks/useAgenda";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO, set, isValid, addHours, startOfWeek, endOfWeek, differenceInDays, startOfDay, endOfDay, isWithinInterval, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { fromZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Clock, MapPin, Users, Calendar as CalIcon, Trash2, Eye, EyeOff, Cake, Pencil, CreditCard, PiggyBank, X, Check, Sparkles, HelpCircle, CheckSquare, Pill, Heart, Dog, List, Rows } from "lucide-react";
import { useHealth, Medication } from "@/hooks/useHealth";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useAuth } from "@/components/providers/AuthProvider";

import { useHousehold } from "@/hooks/useHousehold";
import { useChores } from "@/hooks/useChores";
import { sendTelegramMessage } from "@/lib/telegram";
import InfoModal from "@/components/ui/InfoModal";
import AddressAutocomplete, { AddressResult } from "@/components/ui/AddressAutocomplete";
import TravelEstimationModal from "@/components/agenda/TravelEstimationModal";

export default function AgendaPage() {
    const { household, updateMemberPreferences, togglePaymentStatus } = useHousehold();
    const { events, loading, addEvent, deleteEvent, updateEvent } = useAgenda();
    const { chores, toggleChore } = useChores();
    const { user } = useAuth();
    const { medications, profiles, medCompletions, toggleMedication } = useHealth();



    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEvents, setShowEvents] = useState(true);
    const [showHousehold, setShowHousehold] = useState(true);
    const [showGeneral, setShowGeneral] = useState(true);
    const [showHealth, setShowHealth] = useState(true);
    const [showAnimals, setShowAnimals] = useState(true);

    const [isFilterLoaded, setIsFilterLoaded] = useState(false);

    // [MODIFIED] Persist Filters - Load first, then enable saving
    useEffect(() => {
        const saved = localStorage.getItem('lifesync_agenda_filters');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setShowEvents(parsed.showEvents ?? true);
                setShowHousehold(parsed.showHousehold ?? true);
                setShowGeneral(parsed.showGeneral ?? true);
                setShowHealth(parsed.showHealth ?? true);
                setShowAnimals(parsed.showAnimals ?? true);
            } catch (e) {
                console.error("Failed to parse agenda filters", e);
            }
        }
        setIsFilterLoaded(true);
    }, []);

    useEffect(() => {
        if (!isFilterLoaded) return;
        localStorage.setItem('lifesync_agenda_filters', JSON.stringify({
            showEvents, showHousehold, showGeneral, showHealth, showAnimals
        }));
    }, [showEvents, showHousehold, showGeneral, showHealth, showAnimals, isFilterLoaded]);

    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const [showHelp, setShowHelp] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false); // [NEW] Advanced toggle

    const [newEvent, setNewEvent] = useState<any>({
        title: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        start: "09:00",
        end: "10:00",
        type: "family",
        assignees: ["family"],
        recurrence: "none",
        allDay: false,
        reminders: [10],
        address: "" // Add address state
    });

    const [showTravelModal, setShowTravelModal] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<any>(null);

    const openAddModal = () => {
        setEditingEventId(null);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        setNewEvent({
            title: "",
            date: dateStr,
            endDate: dateStr,
            start: "09:00",
            end: "10:00",
            type: "family",
            assignees: ["family"],
            recurrence: "none",
            allDay: false,
            reminders: [15],
            address: ""
        });
        setShowAdvanced(false);
        setShowAddModal(true);
    };

    const handleAddModal = (date?: Date) => {
        if (date) setSelectedDate(date);
        setEditingEventId(null);
        setNewEvent({
            title: '',
            start: format(date || selectedDate, "yyyy-MM-dd'T'HH:00"),
            end: format(addHours(date || selectedDate, 1), "yyyy-MM-dd'T'HH:00"),
            type: 'other',
            assignees: ['family'],
            allDay: false,
            reminders: [15], // Changed from [] to [15]
            date: format(date || selectedDate, 'yyyy-MM-dd'),
            endDate: format(date || selectedDate, 'yyyy-MM-dd'),

            recurrence: 'none',
            address: ""
        });
        setShowAdvanced(false);
        setShowAddModal(true);
    };

    // --- TELEGRAM NOTIFICATIONS ---
    const notifyHousehold = async (title: string, message: string) => {
        if (!household) return;
        // Loop through all members preferences
        const preferences = household.memberPreferences || {};
        for (const [uid, prefs] of Object.entries(preferences)) {
            // Don't notify self (Commented out for testing/confirmation)
            // if (uid === user?.uid) continue;
            // Send if they have a chat ID
            if (prefs.telegramChatId) {
                await sendTelegramMessage(prefs.telegramChatId, `📅 *Agenda LifeSync*\n\n${message}`);
            }
        }
    };

    const handleDelete = async (id: string) => {
        await deleteEvent(id);
    };

    const handleEdit = (event: AgendaEvent) => {
        setEditingEventId(event.id);
        const startDate = parseISO(event.start);
        const endDate = parseISO(event.end);

        setNewEvent({
            title: event.title,
            date: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            start: format(startDate, 'HH:mm'),
            end: format(endDate, 'HH:mm'),
            type: event.type,
            assignees: event.assignees,
            recurrence: event.recurrence || 'none',
            allDay: event.allDay || false,
            reminders: event.reminders || [15],
            address: event.address || ""
        });
        setShowAddModal(true);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        // If event has a location with valid coordinates, trigger travel estimation flow
        if (newEvent.location && newEvent.location.lat !== 0) {
            setPendingEvent(newEvent);
            setShowTravelModal(true);
            setShowAddModal(false);
            return;
        }

        // Otherwise save directly
        await saveEventFinal(newEvent);
    };

    const handleConfirmTravel = async (travelData: any) => {
        if (!pendingEvent) return;

        const eventWithTravel = {
            ...pendingEvent,
            ...travelData
        };

        await saveEventFinal(eventWithTravel);
        setShowTravelModal(false);
    };

    const handleCancelTravel = async () => {
        // Save without travel data if cancelled/ignored
        if (pendingEvent) {
            await saveEventFinal(pendingEvent);
        }
        setShowTravelModal(false);
    }

    const saveEventFinal = async (eventData: any) => {
        const startDate = parseISO(eventData.date!);
        const endDate = parseISO(eventData.endDate!);

        if (endDate < startDate) {
            alert("La date de fin ne peut pas être avant la date de début.");
            return;
        }

        let startIso: string;
        let endIso: string;

        const tz = household?.timezone || 'Europe/Paris';

        if (eventData.allDay) {
            startIso = fromZonedTime(`${eventData.date} 00:00:00`, tz).toISOString();
            endIso = fromZonedTime(`${eventData.endDate} 23:59:59`, tz).toISOString();
        } else {
            startIso = fromZonedTime(`${eventData.date} ${eventData.start}:00`, tz).toISOString();
            endIso = fromZonedTime(`${eventData.endDate} ${eventData.end}:00`, tz).toISOString();
        }

        try {
            if (editingEventId) {
                const editingEvent = events.find(ev => ev.id === editingEventId);
                if (!editingEvent) throw new Error("Événement à modifier introuvable.");

                await updateEvent(editingEvent.id, {
                    ...eventData, // Spread first
                    start: startIso, // Overwrite with correct ISO
                    end: endIso
                });
            } else {
                await addEvent({
                    ...eventData, // Spread first to capture location, travelTime etc.
                    title: eventData.title!,
                    start: startIso, // Overwrite with correct ISO
                    end: endIso,
                    type: eventData.type as any,
                    assignees: eventData.assignees!,
                    recurrence: eventData.recurrence as any,
                    allDay: eventData.allDay,
                    reminders: eventData.reminders,
                    address: eventData.address
                });
            }
            setShowAddModal(false);
            setEditingEventId(null);
            setPendingEvent(null);
        } catch (err: any) {
            const error = err as any;
            console.error("Operation failed", error);
            alert("Erreur: " + (error?.message || "Unknown error"));
        }
    };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
    });

    const EVENT_TYPES: Record<string, string> = {
        family: "Famille", work: "Travail", sport: "Sport", health: "Santé", birthday: "Anniversaire", other: "Autre"
    };

    type CalendarItem = AgendaEvent & {
        isChore?: boolean;
        isVirtual?: boolean;
        isBudget?: boolean;
        isMedication?: boolean;
        medData?: Medication;
        profileName?: string;
        done?: boolean;
        category?: string
    };

    const projectedEvents: CalendarItem[] = events
        .filter(e => !e.metadata?.medId) // [NEW] Filter out physical events linked to meds (handle virtual only)
        .flatMap(e => {
            if (e.recurrence === 'annual') {
                const originalStart = parseISO(e.start);
                const originalEnd = parseISO(e.end);

                const viewStartYear = days[0].getFullYear();
                const viewEndYear = days[days.length - 1].getFullYear();
                const occurrences: CalendarItem[] = [];

                for (let year = viewStartYear; year <= viewEndYear; year++) {
                    const currentStart = set(originalStart, { year });
                    const currentEnd = set(originalEnd, { year });
                    occurrences.push({ ...e, start: currentStart.toISOString(), end: currentEnd.toISOString(), isVirtual: true });
                }
                return occurrences;
            }
            return [e];
        });

    const choreEvents: CalendarItem[] = chores
        .filter(c => c.dueDate)
        .flatMap(c => {
            const baseDate = parseISO(c.dueDate!);
            const isHousehold = c.category === 'household';

            if (isHousehold && !showHousehold) return [];
            if (!isHousehold && !showGeneral) return [];

            if (c.frequency === 'once') {
                if (c.done) return [];
                return [{
                    id: c.id, title: `Tâche: ${c.title}`, start: c.dueDate!, end: addHours(baseDate, 1).toISOString(),
                    type: 'chore' as any, assignees: c.assignees, createdBy: 'system', isChore: true,
                    category: c.category
                }];
            }

            // Projection for recurring chores
            const occurrences: CalendarItem[] = [];
            let current = baseDate;
            const viewEnd = days[days.length - 1];

            // Safety limit to prevent infinite loops (max 50 occurrences per chore per view)
            let count = 0;
            while (current <= viewEnd && count < 50) {
                occurrences.push({
                    id: `${c.id}-${current.toISOString()}`,
                    title: `Tâche: ${c.title}`,
                    start: current.toISOString(),
                    end: addHours(current, 1).toISOString(),
                    type: 'chore' as any,
                    assignees: c.assignees,
                    createdBy: 'system',
                    isChore: true,
                    choreData: c,
                    done: c.done && isSameDay(current, baseDate),
                    isVirtual: !isSameDay(current, baseDate),
                    category: c.category
                } as CalendarItem);

                const next = new Date(current);
                if (c.frequency === 'daily') next.setDate(next.getDate() + 1);
                else if (c.frequency === 'weekly') next.setDate(next.getDate() + 7);
                else if (c.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
                else if (c.frequency === 'custom') next.setDate(next.getDate() + (c.customInterval || 1));

                if (next <= current) break;
                current = next;
                count++;
            }

            return occurrences;
        });

    const budgetEvents: CalendarItem[] = [
        ...(household?.budgetConfig?.fixedCharges || []),
        ...(household?.budgetConfig?.reserves || [])
    ].filter(charge => charge.type !== 'personal' || charge.paidBy === user?.uid)
        .map((charge, idx) => {
            let date: Date | null = null;

            if (charge.dueDate) {
                date = parseISO(charge.dueDate);
            } else if (charge.dayOfMonth) {
                const day = Math.min(charge.dayOfMonth, 31);
                date = set(currentMonth, { date: day, hours: 9, minutes: 0, seconds: 0 });
            } else if (charge.dueDay) { // Fallback for old data
                const day = Math.min(charge.dueDay, 31);
                date = set(currentMonth, { date: day, hours: 9, minutes: 0, seconds: 0 });
            }

            if (!date || !isValid(date)) return null;

            const monthYear = format(date, "yyyy-MM");
            const key = `${charge.label}-${monthYear}-${user?.uid}`;
            const isDone = household?.budgetConfig?.budgetCompletions?.[key] || false;
            const isYearly = charge.frequency === 'yearly';

            // For yearly with dueDate, it only shows on that specific month
            if (isYearly && charge.dueDate) {
                if (!isSameMonth(date, currentMonth)) return null;
            }

            let displayTitle = charge.label;
            let displayAmount = charge.amount;

            if (isYearly) {
                // If it's the month of the deadline, or if it's just a general yearly charge
                if (charge.dueDate && isSameMonth(date, currentMonth)) {
                    displayTitle = `Calcul Final: ${charge.label}`;
                } else {
                    displayTitle = `Épargne: ${charge.label}`;
                    displayAmount = charge.amount / 12; // Simplified, the real lissage is in BudgetPage but this gives a hint
                }
            } else {
                displayTitle = `Paiement: ${charge.label}`;
            }

            return {
                id: `budget-${idx}-${charge.label}`,
                title: `${displayTitle} (${Math.round(displayAmount)}€)`,
                start: date.toISOString(),
                end: addHours(date, 1).toISOString(),
                type: 'other',
                createdBy: 'system',
                assignees: ['family'],
                isVirtual: true,
                isBudget: true,
                done: isDone,
                budgetLabel: charge.label,
                budgetMonthKey: monthYear
            } as CalendarItem;
        }).filter((e): e is CalendarItem => e !== null);

    const medicationEvents: CalendarItem[] = medications
        .flatMap(m => {
            const profile = profiles.find(p => p.id === m.profileId);
            const occurrences: CalendarItem[] = [];

            // Project for each day in the current view
            days.forEach(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isToday = isSameDay(day, new Date());
                const currentHour = new Date().getHours();
                const isLate = isToday && currentHour >= 18;

                // Frequency Logic Check
                const startDay = parseISO(m.startDate);
                if (differenceInCalendarDays(day, startDay) < 0) return; // Not started yet
                if (m.endDate && differenceInCalendarDays(day, parseISO(m.endDate)) > 0) return; // Ended

                let isDue = false;
                if (m.frequency === 'daily') isDue = true;
                else if (m.frequency === 'weekly') {
                    isDue = differenceInCalendarDays(day, startDay) % 7 === 0;
                }
                else if (m.frequency === 'yearly') {
                    isDue = day.getDate() === startDay.getDate() && day.getMonth() === startDay.getMonth();
                }
                else if (m.frequency === 'custom' && m.customDays) {
                    isDue = differenceInCalendarDays(day, startDay) % m.customDays === 0;
                }

                if (!isDue) return;

                m.times?.forEach(time => {
                    const [h, min] = time.split(':').map(Number);
                    const start = set(day, { hours: h, minutes: min, seconds: 0 });
                    const isDone = medCompletions[`${m.id}-${dayStr}-${time.replace(':', '')}`] || false;

                    // Visibility Logic:
                    // 1. Always show my own meds or shared meds
                    // 2. Show others' meds ONLY IF NOT PRIVATE and IF late (today, >18h, not done)
                    const isMine = !profile?.userId || profile.userId === user?.uid;

                    if (m.isPrivate && !isMine) return;

                    const showAlert = !isMine && isLate && !isDone;
                    const isPet = m.category === 'pet_care';

                    if (isPet && !showAnimals) return;
                    if (!isPet && !showHealth) return;
                    if (!isMine && !showAlert) return;

                    let icon = isPet ? '🐾 ' : '💊 ';
                    if (isPet && m.treatmentType) {
                        if (m.treatmentType === 'task') icon = '📋 ';
                        else if (m.treatmentType === 'care') icon = '🩺 ';
                        else if (m.treatmentType === 'medication') icon = '💊 ';
                    }

                    occurrences.push({
                        id: `med-${m.id}-${dayStr}-${time}`,
                        title: `${showAlert ? '⚠️ ALERTE: ' : ''}${icon}${profile?.name ? profile.name + ' : ' : ''}${m.name}`,
                        start: start.toISOString(),
                        end: start.toISOString(),
                        type: 'health' as any,
                        assignees: [profile?.userId || user?.uid || 'family'],
                        createdBy: 'system',
                        isMedication: true,
                        isVirtual: true,
                        medData: m,
                        profileName: profile?.name,
                        done: isDone,
                        isAlert: showAlert
                    } as CalendarItem);
                });
            });

            return occurrences;
        });


    const allItems: CalendarItem[] = [...projectedEvents, ...choreEvents, ...budgetEvents, ...medicationEvents];

    const getDayItems = (day: Date) => {
        return allItems.filter(e => {
            const start = startOfDay(parseISO(e.start));
            const end = endOfDay(parseISO(e.end));

            let inRange = false;
            if (!e.isVirtual) {
                inRange = isWithinInterval(day, { start, end });
            } else if (e.isBudget) {
                inRange = isSameDay(start, day);
            } else {
                // Annual events and recurring chores
                inRange = isSameDay(start, day);
            }

            if (!inRange) return false;

            if (e.isChore) {
                if (e.category === 'pet') return showAnimals;
                return e.category === 'household' ? showHousehold : showGeneral;
            }
            if (e.isMedication) return (e as any).medData?.category === 'pet_care' ? showAnimals : showHealth;
            if (e.isBudget) return true;
            return showEvents;
        });
    };

    const selectedEvents = getDayItems(selectedDate).sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-6 transition-colors duration-300">
            {!household && !loading && (
                <div className="bg-red-500 text-white p-2 text-center text-sm font-bold">
                    ⚠️ Aucun foyer d&eacute;tect&eacute;. Retournez &agrave; l&apos;accueil pour configurer.
                </div>
            )}

            <header className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-30 shadow-sm flex justify-between items-center transition-colors">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Agenda</h1>
                    <button onClick={() => setShowHelp(true)} className="text-slate-300 hover:text-emerald-500 transition-colors">
                        <HelpCircle size={18} />
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => {
                        if (viewMode === 'day') {
                            const newDate = subDays(selectedDate, 1);
                            setSelectedDate(newDate);
                            setCurrentMonth(newDate);
                        } else if (viewMode === 'week') {
                            const newDate = subWeeks(selectedDate, 1);
                            setSelectedDate(newDate);
                            setCurrentMonth(newDate);
                        } else {
                            setCurrentMonth(subMonths(currentMonth, 1));
                        }
                    }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300"><ChevronLeft /></button>

                    <span className="font-bold text-slate-700 dark:text-slate-200 capitalize w-24 text-center">
                        {viewMode === 'day'
                            ? format(selectedDate, "d MMM", { locale: fr })
                            : format(currentMonth, "MMMM", { locale: fr })
                        }
                    </span>

                    <button onClick={() => {
                        if (viewMode === 'day') {
                            const newDate = addDays(selectedDate, 1);
                            setSelectedDate(newDate);
                            setCurrentMonth(newDate);
                        } else if (viewMode === 'week') {
                            const newDate = addWeeks(selectedDate, 1);
                            setSelectedDate(newDate);
                            setCurrentMonth(newDate);
                        } else {
                            setCurrentMonth(addMonths(currentMonth, 1));
                        }
                    }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300"><ChevronRight /></button>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setViewMode('month')} className={cn("p-1.5 rounded-md transition-all", viewMode === 'month' ? "bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600")}>
                        <CalIcon size={16} />
                    </button>
                    <button onClick={() => setViewMode('week')} className={cn("p-1.5 rounded-md transition-all", viewMode === 'week' ? "bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600")}>
                        <Rows size={16} className="rotate-90" />
                    </button>
                    <button onClick={() => setViewMode('day')} className={cn("p-1.5 rounded-md transition-all", viewMode === 'day' ? "bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600")}>
                        <List size={16} />
                    </button>
                </div>
            </header>

            {/* Filters - Always Visible - Grid/Wrap optimized */}
            <div className="px-4 pt-2 -mb-2">
                <div className="flex flex-wrap gap-1.5 justify-center pb-2">
                    {[
                        { id: 'events', label: 'Agenda', active: showEvents, setter: setShowEvents, color: 'text-blue-500', icon: Eye, iconOff: EyeOff },
                        { id: 'general', label: 'Tâches', active: showGeneral, setter: setShowGeneral, color: 'text-purple-500', icon: Sparkles, iconOff: Sparkles },
                        { id: 'household', label: 'Ménage', active: showHousehold, setter: setShowHousehold, color: 'text-pink-500', icon: CheckSquare, iconOff: CheckSquare },
                        { id: 'health', label: 'Santé', active: showHealth, setter: setShowHealth, color: 'text-rose-500', icon: Heart, iconOff: Heart },
                        { id: 'animals', label: 'Animaux', active: showAnimals, setter: setShowAnimals, color: 'text-indigo-500', icon: Dog, iconOff: Dog }
                    ].map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => filter.setter(!filter.active)}
                            className={cn(
                                "px-2 py-1 rounded-xl transition-all flex items-center gap-1.5 border",
                                filter.active
                                    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                                    : "bg-slate-50 dark:bg-slate-900/40 border-transparent text-slate-400 opacity-60"
                            )}
                        >
                            <div className={cn("w-4 h-4 rounded-md flex items-center justify-center", filter.active ? filter.color + " bg-slate-50 dark:bg-slate-900" : "bg-slate-100 dark:bg-slate-800")}>
                                {filter.active ? <filter.icon size={10} /> : <filter.iconOff size={10} />}
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-tighter", filter.active ? "text-slate-600 dark:text-slate-300" : "text-slate-400")}>
                                {filter.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {viewMode === 'month' && (
                <div className="p-2 grid grid-cols-7 gap-1 text-center mb-4">
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={`${d}-${i}`} className="text-xs font-bold text-slate-300 dark:text-slate-600 mb-2">{d}</span>)}
                    {days.map(d => {
                        const DayItems = getDayItems(d);
                        const isSelected = isSameDay(d, selectedDate);
                        const isCurrentMonth = isSameMonth(d, currentMonth);

                        // Sort priorities: Birthday > Event > Chore > Budget
                        const sortedItems = [...DayItems].sort((a, b) => {
                            if (a.type === 'birthday') return -1;
                            if (b.type === 'birthday') return 1;
                            return 0;
                        });

                        return (
                            <button
                                key={d.toISOString()}
                                onClick={() => setSelectedDate(d)}
                                onDoubleClick={() => { setSelectedDate(d); setViewMode('day'); }}
                                className={cn(
                                    "min-h-[80px] rounded-lg flex flex-col items-start justify-start p-1 relative transition-all border",
                                    isSelected ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-500" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900",
                                    !isCurrentMonth && "opacity-40 bg-slate-50 dark:bg-slate-950",
                                    isToday(d) && !isSelected && "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday(d) ? "bg-blue-500 text-white" : "text-slate-700 dark:text-slate-300",
                                    isSelected && !isToday(d) && "bg-emerald-500 text-white"
                                )}>{format(d, "d")}</span>

                                <div className="flex flex-col gap-0.5 w-full text-left">
                                    {sortedItems.slice(0, 3).map((e, idx) => (
                                        <div key={idx} className={cn(
                                            "text-[9px] truncate px-1 rounded-sm w-full font-medium",
                                            e.type === 'birthday' ? "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300" :
                                                e.isChore ? cn("bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", e.done && "line-through opacity-60") :
                                                    e.isMedication ? cn("bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300", e.done && "line-through opacity-60") :
                                                        e.isBudget ? cn("bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", e.done && "line-through opacity-60") :
                                                            "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                        )}>
                                            {e.type === 'birthday' ? '🎂 ' : ''}{e.title}
                                        </div>
                                    ))}
                                    {sortedItems.length > 3 && (
                                        <div className="text-[8px] text-slate-400 pl-0.5">+{sortedItems.length - 3} autres</div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {viewMode === 'week' && (
                <div className="p-2 grid grid-cols-1 gap-2 mb-4">
                    {eachDayOfInterval({
                        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                        end: endOfWeek(selectedDate, { weekStartsOn: 1 })
                    }).map(d => {
                        const DayItems = getDayItems(d);
                        const isSelected = isSameDay(d, selectedDate);

                        return (
                            <div key={d.toISOString()}
                                onClick={() => setSelectedDate(d)}
                                className={cn(
                                    "flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                                    isSelected ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900",
                                    isToday(d) && !isSelected && "border-blue-300 dark:border-blue-700"
                                )}>
                                <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-slate-100 dark:border-slate-800 pr-3">
                                    <span className="text-xs uppercase text-slate-400 font-bold">{format(d, "EEE", { locale: fr })}</span>
                                    <span className={cn("text-xl font-black", isToday(d) ? "text-blue-500" : "text-slate-700 dark:text-slate-200")}>{format(d, "d")}</span>
                                </div>
                                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                    {DayItems.length === 0 && <span className="text-xs text-slate-400 italic mt-2">Rien de prévu</span>}
                                    {DayItems.slice(0, 5).map((e, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs truncate">
                                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                                                e.isChore ? 'bg-slate-400' :
                                                    e.isMedication ? 'bg-rose-400' :
                                                        e.type === 'birthday' ? 'bg-pink-500' : 'bg-blue-500'
                                            )} />
                                            <span className={cn("font-bold truncate", e.done ? "line-through opacity-60 text-slate-500 dark:text-slate-500" : "text-slate-700 dark:text-slate-300")}>{e.title}</span>
                                            {e.start && !e.allDay && <span className="text-slate-400 text-[10px] ml-auto">{format(parseISO(e.start), 'HH:mm')}</span>}
                                        </div>
                                    ))}
                                    {DayItems.length > 5 && <span className="text-[10px] text-slate-400">+{DayItems.length - 5} autres...</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}


            {/* Help Modal */}
            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Agenda de Maison"
                description="Synchronisez les emplois du temps de tout le monde en un seul endroit."
                accentColor="emerald"
                items={[
                    { title: "Agenda Foyer", description: "Partagé avec tous les membres de la maison. Idéal pour les repas ou sorties.", icon: Users, color: "emerald" },
                    { title: "Agenda Perso", description: "Événements privés visibles uniquement par vous.", icon: EyeOff, color: "purple" },
                    { title: "Auto-Sync GCal", description: "Synchronisation bidirectionnelle : vos événements GCal apparaissent ici et vice versa.", icon: Sparkles, color: "blue" }
                ]}
                tips={[
                    "Activez l'Auto-Sync en haut à droite pour ne plus jamais rater un rendez-vous.",
                    "Les tâches de ménage et rappels de santé s'affichent aussi dans votre vue quotidienne."
                ]}
            />

            {viewMode !== 'month' && (
                <div className="px-6 py-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 capitalize">{format(selectedDate, "EEEE d MMMM", { locale: fr })}</h2>
                        <button onClick={openAddModal} className="bg-slate-900 dark:bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition flex items-center gap-2">
                            <Plus size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Ajouter</span>
                        </button>
                    </div>


                </div>
            )}
            {viewMode === 'month' && (
                <div className="fixed bottom-24 right-4 z-20">
                    <button onClick={openAddModal} className="bg-emerald-600 text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition flex items-center justify-center">
                        <Plus size={24} />
                    </button>
                </div>
            )}

            {/* Day list - visible in all modes but different style */}
            <div className={cn("px-4 space-y-3", viewMode === 'month' && "hidden")}>
                {loading && <p className="text-center text-slate-400 text-sm">Chargement...</p>}
                {!loading && selectedEvents.length === 0 && (
                    <div className="text-center py-12 opacity-50">
                        <CalIcon size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-600">Rien de prévu ce jour-là</p>
                    </div>
                )}
                <AnimatePresence>
                    {selectedEvents.map(e => (
                        <motion.div
                            key={e.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center group transition-colors"
                        >
                            <div className="flex gap-4 items-center flex-1">
                                {(e.isChore || e.isBudget || e.isMedication) && (
                                    <button
                                        onClick={(evt) => {
                                            evt.stopPropagation();
                                            if (e.isChore && (e as any).choreData) {
                                                const c = (e as any).choreData;
                                                toggleChore(c.id, c.done, c.points, c.category, c.frequency, c.dueDate, c.customInterval, c.title);
                                                if (!c.done) {
                                                    confetti({
                                                        particleCount: 100,
                                                        spread: 70,
                                                        origin: { y: 0.6 },
                                                        colors: ['#3b82f6', '#10b981', '#f59e0b']
                                                    });
                                                }
                                            } else if (e.isBudget) {
                                                togglePaymentStatus((e as any).budgetLabel, (e as any).budgetMonthKey);
                                            } else if (e.isMedication && e.medData) {
                                                const dateStr = format(parseISO(e.start), 'yyyy-MM-dd');
                                                const timeStr = format(parseISO(e.start), 'HH:mm');
                                                toggleMedication(e.medData.id, dateStr, timeStr);
                                            }
                                        }}
                                        className={cn(
                                            "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                            e.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"
                                        )}
                                    >
                                        {e.done && <Check size={14} />}
                                    </button>
                                )}
                                <div className={cn("w-1 h-12 rounded-full",
                                    e.isChore ? 'bg-blue-400' :
                                        e.isMedication ? 'bg-rose-400' :
                                            e.type === 'sport' ? 'bg-orange-500' :
                                                e.type === 'birthday' ? 'bg-pink-500' :
                                                    (e.assignees.includes('family') ? 'bg-emerald-500' : 'bg-purple-500')
                                )} />
                                <div>
                                    <h3 className={cn(
                                        "font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2",
                                        e.done && "line-through text-slate-400"
                                    )}>
                                        {e.isBudget && <CreditCard size={14} className={e.done ? "text-slate-400" : "text-emerald-500"} />}
                                        {e.isMedication && <Pill size={14} className={e.done ? "text-slate-400" : "text-rose-400"} />}
                                        {e.title}
                                        {e.type === 'birthday' && <Cake size={14} className="text-pink-500" />}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                                        <Clock size={12} />
                                        {e.isChore ? 'Avant 23:59' : (
                                            e.allDay || e.type === 'birthday' ? 'Toute la journée' :
                                                e.isMedication ? format(parseISO(e.start), "HH:mm") :
                                                    `${format(parseISO(e.start), "HH:mm")} - ${format(parseISO(e.end), "HH:mm")}`
                                        )}
                                        {(() => {
                                            const start = startOfDay(parseISO(e.start));
                                            const end = startOfDay(parseISO(e.end));
                                            const total = differenceInDays(end, start) + 1;
                                            const current = differenceInDays(startOfDay(selectedDate), start) + 1;
                                            if (total > 1) {
                                                return <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase">Jour {current}/{total}</span>;
                                            }
                                            return null;
                                        })()}
                                        {e.type === 'sport' && <span className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-200 px-1 rounded">SPORT</span>}
                                        {e.type === 'birthday' && <span className="bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-200 px-1 rounded">ANNIV</span>}
                                        {e.isChore && <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 px-1 rounded">TÂCHE</span>}
                                        {(e as any).isBudget && <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-200 px-1 rounded">BUDGET</span>}

                                        {!e.isChore && !(e as any).isBudget && e.type !== 'birthday' && (
                                            e.assignees.includes('family') ? (
                                                <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-200 px-1 rounded flex items-center gap-1 uppercase text-[9px]">FAMILLE</span>
                                            ) : (
                                                <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 px-1 rounded flex items-center gap-1 uppercase text-[9px]">PERSO</span>
                                            )
                                        )}
                                    </div>

                                    {(e.address || e.location) && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location?.label || e.address || "")}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline mt-1"
                                            onClick={(evt) => evt.stopPropagation()}
                                        >
                                            <MapPin size={10} />
                                            <span className="truncate max-w-[150px]">{e.location?.label || e.address}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                            {!e.isChore && !e.isVirtual && (
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handleEdit(e)} className="text-slate-300 hover:text-blue-500 p-2 transition-colors"><Pencil size={18} /></button>
                                    <button onClick={() => { if (confirm("Supprimer cet événement ?")) deleteEvent(e.id); }} className="text-slate-300 hover:text-rose-500 p-2 transition-colors"><Trash2 size={18} /></button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition z-10"
                            >
                                <X size={20} />
                            </button>
                            <h3 className="font-bold text-xl mb-4 text-slate-800 dark:text-white pr-10">{editingEventId ? "Modifier l'événement" : "Nouvel événement"}</h3>
                            <form onSubmit={handleAdd} className="space-y-4 pb-8">
                                <input
                                    autoFocus
                                    required
                                    placeholder="Titre (ex: Rdv Dentiste)"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl border-none font-bold text-lg outline-emerald-500 placeholder:text-slate-400"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                />

                                <AddressAutocomplete
                                    value={newEvent.location || newEvent.address || ""}
                                    onChange={(val: AddressResult) => setNewEvent({ ...newEvent, location: val, address: val.label })}
                                    placeholder="Lieu / Adresse (ex: Cinema, Gare...)"
                                />



                                {/* [NEW] DATE PICKER */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Date de début</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl font-bold outline-emerald-500"
                                            value={newEvent.date}
                                            onChange={e => {
                                                setNewEvent({ ...newEvent, date: e.target.value });
                                                // Auto-update end date if it's before the new start date
                                                if (e.target.value > newEvent.endDate) {
                                                    setNewEvent(prev => ({ ...prev, date: e.target.value, endDate: e.target.value }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Date de fin</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl font-bold outline-emerald-500"
                                            value={newEvent.endDate}
                                            min={newEvent.date}
                                            onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newEvent.allDay}
                                        onChange={e => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                                        className="w-5 h-5 accent-emerald-500 rounded"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Toute la journée</span>
                                </label>

                                {!newEvent.allDay && (
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Début</label>
                                            <input type="time" className="w-full p-2 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg font-bold" value={newEvent.start} onChange={e => setNewEvent({ ...newEvent, start: e.target.value })} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Fin</label>
                                            <input type="time" className="w-full p-2 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg font-bold" value={newEvent.end} onChange={e => setNewEvent({ ...newEvent, end: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                {/* [NEW] ADVANCED TOGGLE */}
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-500 transition"
                                >
                                    {showAdvanced ? "Moins d'options" : "Plus d'options (Type, Rappels, Participants)"}
                                    <ChevronDown size={16} className={cn("transition-transform", showAdvanced && "rotate-180")} />
                                </button>

                                {showAdvanced && (
                                    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                                        {/* TYPE SELECTION */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Type</label>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(EVENT_TYPES).map(([key, label]) => {
                                                    if (key === 'other') return null;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setNewEvent({
                                                                ...newEvent,
                                                                type: key,
                                                                recurrence: key === 'birthday' ? 'annual' : 'none',
                                                                allDay: key === 'birthday' ? true : newEvent.allDay
                                                            })}
                                                            className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize border transition", newEvent.type === key ? "bg-slate-800 text-white border-slate-800" : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700")}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* RECURRENCE (Only if Birthday or specific) - Usually handled by Type but we keep Logic */}
                                        {newEvent.type === 'birthday' && (
                                            <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-xl border border-pink-100 dark:border-pink-900/50">
                                                <label className="flex items-center gap-2 text-pink-700 dark:text-pink-300 font-bold text-sm">
                                                    <Cake size={16} /> Répéter chaque année
                                                </label>
                                            </div>
                                        )}

                                        {/* REMINDERS */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Rappels</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {[0, 10, 15, 60, 1440].map(value => {
                                                    const isActive = newEvent.reminders?.includes(value);
                                                    let label = "";
                                                    if (value === 0) label = "Début";
                                                    else if (value === 10) label = "10m";
                                                    else if (value === 15) label = "15m";
                                                    else if (value === 60) label = "1h";
                                                    else if (value === 1440) label = "1j";

                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = newEvent.reminders || [];
                                                                const next = isActive ? current.filter(r => r !== value) : [...current, value];
                                                                setNewEvent({ ...newEvent, reminders: next });
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1 rounded-full text-xs font-bold border transition",
                                                                isActive ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                                                            )}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {/* Custom Input Simplified if needed or kept same */}
                                            <input
                                                type="number"
                                                placeholder="Min perso..."
                                                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg font-bold"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = parseInt((e.target as HTMLInputElement).value);
                                                        if (!isNaN(val) && val > 0 && !(newEvent.reminders || []).includes(val)) {
                                                            setNewEvent({ ...newEvent, reminders: [...(newEvent.reminders || []), val] });
                                                            (e.target as HTMLInputElement).value = "";
                                                        }
                                                    }
                                                }}
                                            />
                                            {newEvent.reminders && newEvent.reminders.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {newEvent.reminders.filter(r => ![0, 10, 15, 60, 1440].includes(r)).map(r => (
                                                        <span key={r} className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            {r}m <button type="button" onClick={() => setNewEvent({ ...newEvent, reminders: (newEvent.reminders || []).filter(x => x !== r) })}>×</button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* ASSIGNEES SIMPLIFIED */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Participants</label>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewEvent({ ...newEvent, assignees: ['family'] })}
                                                    className={cn("px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2",
                                                        newEvent.assignees.includes('family') ? "bg-emerald-100 border-emerald-500 text-emerald-700" : "bg-white dark:bg-slate-800 text-slate-500"
                                                    )}
                                                >
                                                    <Users size={14} /> Foyer
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewEvent({ ...newEvent, assignees: [user?.uid || ''] })}
                                                    className={cn("px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2",
                                                        !newEvent.assignees.includes('family') && newEvent.assignees.length === 1 && newEvent.assignees.includes(user?.uid || '')
                                                            ? "bg-purple-100 border-purple-500 text-purple-700" : "bg-white dark:bg-slate-800 text-slate-500"
                                                    )}
                                                >
                                                    <EyeOff size={14} /> Privé
                                                </button>
                                                {household?.memberProfiles?.filter(m => m.uid !== user?.uid).map((m) => (
                                                    <button
                                                        key={m.uid}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = newEvent.assignees.filter(a => a !== 'family');
                                                            const createNew = current.includes(m.uid) ? current.filter(id => id !== m.uid) : [...current, m.uid];
                                                            setNewEvent({ ...newEvent, assignees: createNew.length > 0 ? createNew : ['family'] });
                                                        }}
                                                        className={cn("px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2",
                                                            !newEvent.assignees.includes('family') && newEvent.assignees.includes(m.uid)
                                                                ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-white dark:bg-slate-800 text-slate-500"
                                                        )}
                                                    >
                                                        {m.photoURL ? <img src={m.photoURL} className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 bg-slate-300 rounded-full flex items-center justify-center text-[8px] text-white">{m.displayName[0]}</span>}
                                                        {m.displayName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">Annuler</button>
                                    <button type="submit" className="flex-1 py-3 font-bold bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700">{editingEventId ? "Modifier" : "Ajouter"}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }
            {showTravelModal && pendingEvent && pendingEvent.location && (
                <TravelEstimationModal
                    isOpen={showTravelModal}
                    onClose={handleCancelTravel}
                    onConfirm={handleConfirmTravel}
                    destination={pendingEvent.location}
                    eventStart={(() => {
                        const tz = household?.timezone || 'Europe/Paris';
                        const time = pendingEvent.allDay ? '09:00' : pendingEvent.start;
                        return fromZonedTime(`${pendingEvent.date} ${time}:00`, tz).toISOString();
                    })()}
                />
            )}
        </div >
    );
}
