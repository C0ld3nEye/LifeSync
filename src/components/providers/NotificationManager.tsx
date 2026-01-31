"use client";

import { useEffect, useRef } from "react";
import { useAgenda } from "@/hooks/useAgenda";
import { useChores } from "@/hooks/useChores";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHealth } from "@/hooks/useHealth";
import { parseISO, differenceInMinutes, isSameMinute, addMinutes, set, subHours, format, isSameDay, getDay, differenceInDays } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { sendTelegramMessage } from "@/lib/telegram";

import { useFcmToken } from "@/hooks/useFcmToken";

export function NotificationManager() {
    useFcmToken(); // Initialize FCM and retrieve token
    const { events } = useAgenda();
    const { chores } = useChores();
    const { household } = useHousehold();
    const { user } = useAuth();
    const { medications, profiles, medCompletions } = useHealth();
    // Load processed notifications from session storage on mount
    const processedNotifications = useRef<Set<string>>(new Set());
    const lastChecked = useRef<Date>(subHours(new Date(), 1)); // Look back 1 hour to catch missed ones on reload

    useEffect(() => {
        // Hydrate from session storage
        try {
            const stored = sessionStorage.getItem("processedNotifications");
            if (stored) {
                const parsed = JSON.parse(stored);
                processedNotifications.current = new Set(parsed);
            }
        } catch (e) { console.error("Error loading notifications from session", e); }
    }, []);

    const saveProcessed = () => {
        try {
            sessionStorage.setItem("processedNotifications", JSON.stringify(Array.from(processedNotifications.current)));
        } catch (e) {
            // Ignore quota errors
        }
    };

    useEffect(() => {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        // Request permission on mount if default
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }

        const checkReminders = () => {
            if (Notification.permission !== "granted") return;
            if (!user) return;

            const now = new Date();

            // 1. AGENDA EVENTS
            events.forEach(event => {
                if (!event.reminders || event.reminders.length === 0) return;
                const startDate = parseISO(event.start);
                if (differenceInMinutes(now, startDate) > 1440) return; // Skip if event was > 24h ago

                event.reminders.forEach(minutesBefore => {
                    const notifyTime = addMinutes(startDate, -minutesBefore);
                    // Check if notifyTime is within the window [lastChecked, now]
                    // AND make sure we haven't already shown it (processedNotifications persists in memory session)
                    // Note: This naive Set implementation resets on Page Reload, which is actually GOOD 
                    // because we initialized lastChecked to -24h. 
                    // So on reload, it catches up on everything from the last 24h!
                    // BUT we don't want to SPAM 50 notifications on reload.
                    // Solution: If lastChecked is the initial -24h value (checked via a flag or just time diff), 
                    // maybe we only show notifications that are "recent" (e.g. < 1h ago) or just show them all but limit sound?
                    // Let's keep it simple: Show all valid valid missed notifications from last 2 hours to avoid overwhelming, then sync to now.

                    const missedWindowStart = addMinutes(now, -120); // 2 hours ago
                    const effectiveLastChecked = lastChecked.current < missedWindowStart ? missedWindowStart : lastChecked.current;

                    if (notifyTime > effectiveLastChecked && notifyTime <= now) {
                        const notificationId = `event-${event.id}-${minutesBefore}`;
                        if (!processedNotifications.current.has(notificationId)) {
                            processedNotifications.current.add(notificationId);
                            saveProcessed();
                            let bodyText = getBodyText(minutesBefore);
                            try {
                                new Notification(`📅 Rappel : ${event.title}`, {
                                    body: `${bodyText} - ${event.title}`,
                                    icon: "/icon-192x192.png",
                                    silent: false,
                                    tag: notificationId // Prevent duplicates at OS level
                                });
                            } catch (e) { console.error("Notification error", e); }
                        }
                    }
                });
            });

            // 2. CHORES (TÂCHES)
            chores.forEach(chore => {
                if (chore.done || !chore.dueDate || !chore.reminders || chore.reminders.length === 0) return;
                const tz = household?.timezone || 'Europe/Paris';
                // If dueDate is ISO with time, parse it.
                // If dueDate is YYYY-MM-DD, assume it's Midnight in Household TZ? Or 9AM? 
                // Chores typically don't have time unless specified. 
                // Let's assume if it contains 'T', it's full ISO.
                // If not, we treat it as "Day" and maybe reminders are relative to start of day?

                let dueDate: Date;
                if (chore.dueDate && chore.dueDate.includes('T')) {
                    dueDate = parseISO(chore.dueDate); // It's already an absolute time (e.g. from AgendaPage creation)
                } else if (chore.dueDate) {
                    // Date only string (YYYY-MM-DD)
                    // Assume 09:00 AM default for "Day Task" if no time? 
                    // Or assume 00:00? 
                    // Previous logic was parseISO(dateString) which is UTC midnight.
                    // Better: "Midnight Household TZ"
                    dueDate = fromZonedTime(`${chore.dueDate} 09:00:00`, tz);
                } else {
                    return;
                }

                if (differenceInMinutes(now, dueDate) > 1440) return;

                chore.reminders.forEach(minutesBefore => {
                    const notifyTime = addMinutes(dueDate, -minutesBefore);
                    const missedWindowStart = addMinutes(now, -120);
                    const effectiveLastChecked = lastChecked.current < missedWindowStart ? missedWindowStart : lastChecked.current;

                    if (notifyTime > effectiveLastChecked && notifyTime <= now) {
                        const notificationId = `chore-${chore.id}-${minutesBefore}`;
                        if (!processedNotifications.current.has(notificationId)) {
                            processedNotifications.current.add(notificationId);
                            saveProcessed();
                            let bodyText = getBodyText(minutesBefore);
                            try {
                                new Notification(`📝 Rappel Tâche : ${chore.title}`, {
                                    body: `${bodyText} - ${chore.title}`,
                                    icon: "/icon-192x192.png",
                                    silent: false,
                                    tag: notificationId
                                });
                            } catch (e) { console.error("Notification error", e); }
                        }
                    }
                });
            });

            // 3. BUDGET CHARGES
            if (household?.budgetConfig) {
                const charges = [...(household.budgetConfig.fixedCharges || []), ...(household.budgetConfig.reserves || [])];
                charges.forEach(charge => {
                    if (!charge.reminders || charge.reminders.length === 0) return;
                    if (charge.type === 'personal' && charge.paidBy !== user.uid) return;

                    const dueDay = charge.dueDay || 1;
                    const tz = household.timezone || 'Europe/Paris';
                    const currentMonthStr = formatInTimeZone(now, tz, 'yyyy-MM');
                    // dueDay needs padding
                    const dayStr = dueDay.toString().padStart(2, '0');
                    const dueDate = fromZonedTime(`${currentMonthStr}-${dayStr} 09:00:00`, tz);

                    const monthKey = currentMonthStr; // Use zoned month key
                    const isDone = household.budgetConfig?.budgetCompletions?.[`${charge.label}-${monthKey}-${user.uid}`];
                    if (isDone) return;

                    charge.reminders.forEach(minutesBefore => {
                        const notifyTime = addMinutes(dueDate, -minutesBefore);
                        const missedWindowStart = addMinutes(now, -120);
                        const effectiveLastChecked = lastChecked.current < missedWindowStart ? missedWindowStart : lastChecked.current;

                        if (notifyTime > effectiveLastChecked && notifyTime <= now) {
                            const notificationId = `budget-${charge.label}-${dueDate.getTime()}-${minutesBefore}`;
                            if (!processedNotifications.current.has(notificationId)) {
                                processedNotifications.current.add(notificationId);
                                saveProcessed();
                                let bodyText = getBodyText(minutesBefore);
                                try {
                                    new Notification(`💰 Charge à Payer : ${charge.label}`, {
                                        body: `${bodyText} - ${charge.label} (${charge.amount}€)`,
                                        icon: "/icon-192x192.png",
                                        silent: false,
                                        tag: notificationId
                                    });
                                } catch (e) { console.error("Notification error", e); }
                            }
                        }
                    });
                });
            }

            // 4. MEDICATIONS (SANTÉ)
            const activeMeds = medications.filter(m => m.active && m.times);
            activeMeds.forEach(med => {
                // Check if due today
                let isDue = false;
                const startDate = parseISO(med.startDate);
                if (now < startDate) return;

                if (med.frequency === 'daily') isDue = true;
                else if (med.frequency === 'weekly') isDue = getDay(now) === getDay(startDate);
                else if (med.frequency === 'custom' && med.customDays) {
                    const diff = differenceInDays(now, startDate);
                    isDue = diff % med.customDays === 0;
                } else if (med.frequency === 'yearly') {
                    // Simple check for day/month match
                    isDue = now.getDate() === startDate.getDate() && now.getMonth() === startDate.getMonth();
                }

                if (!isDue) return;

                const profile = profiles.find(p => p.id === med.profileId);

                // A. Normal Time Reminder
                // A. Normal Time Reminder
                const tz = household?.timezone || 'Europe/Paris';
                const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');

                med.times?.forEach(timeStr => {
                    const notifyTime = fromZonedTime(`${todayStr} ${timeStr}:00`, tz);

                    const missedWindowStart = addMinutes(now, -60); // 1 hour window
                    const effectiveLastChecked = lastChecked.current < missedWindowStart ? missedWindowStart : lastChecked.current;

                    if (notifyTime > effectiveLastChecked && notifyTime <= now) {
                        const notificationId = `med-${med.id}-${timeStr}-${todayStr.replace(/-/g, '')}`; // consistent ID
                        if (!processedNotifications.current.has(notificationId)) {
                            processedNotifications.current.add(notificationId);
                            saveProcessed();

                            const medSubject = profile?.name ||
                                household?.memberProfiles?.find(m => m.uid === profile?.userId)?.displayName ||
                                'Foyer';

                            try {
                                new Notification(`💊 Rappel Médicament : ${medSubject}`, {
                                    body: `Il est l'heure de prendre : ${med.name} (${med.dosage})`,
                                    icon: "/icon-192x192.png",
                                    silent: false,
                                    tag: notificationId
                                });
                            } catch (e) { console.error("Notification error", e); }
                        }
                    }
                });

                // B. 18H Catch-up Alert (Household Check)
                // If it's 18:00 (or recently passed), and the med was due earlier but NOT taken
                const eighteen = fromZonedTime(`${todayStr} 18:00:00`, tz);

                // Only trigger if we are in the window [18:00, 18:30] roughly
                // re-use lastChecked logic
                const effectiveLastCheckedFor18h = lastChecked.current < addMinutes(now, -60) ? addMinutes(now, -60) : lastChecked.current;

                if (eighteen > effectiveLastCheckedFor18h && eighteen <= now) {
                    // Check completion
                    // We need to check ALL times for this med today. If ANY is missed, we alert.
                    // Actually, usually 18h alert is for "Have you done your treatments?" general check.
                    // Let's check specific med.
                    const times = med.times || [];
                    const isFullyDone = times.every(t => {
                        const completionId = `${med.id}-${todayStr}-${t.replace(':', '')}`;
                        return medCompletions[completionId] || false;
                    });

                    if (!isFullyDone) {
                        const notifId = `med-18h-${med.id}-${todayStr.replace(/-/g, '')}`;
                        if (!processedNotifications.current.has(notifId)) {
                            processedNotifications.current.add(notifId);
                            saveProcessed();

                            // Improved name resolution
                            const subjectName = profile?.name ||
                                household?.memberProfiles?.find(m => m.uid === profile?.userId)?.displayName ||
                                'Un membre du foyer';

                            try {
                                new Notification(`⚠️ Oubli Médicament : ${subjectName}`, {
                                    body: `${subjectName} semble avoir oublié son médicament : ${med.name}.`,
                                    icon: "/icon-192x192.png",
                                    silent: false,
                                    tag: notifId
                                });
                            } catch (e) { console.error("Notification 18h error", e); }
                        }
                    }
                }
            });
        };

        const getBodyText = (minutesBefore: number) => {
            if (minutesBefore === 0) return "Maintenant";
            if (minutesBefore === 60) return "Dans 1 heure";
            if (minutesBefore === 1440) return "Demain";
            if (minutesBefore > 60) {
                const hours = Math.floor(minutesBefore / 60);
                const mins = minutesBefore % 60;
                return `Dans ${hours}h${mins > 0 ? mins : ''}`;
            }
            return `Dans ${minutesBefore} minutes`;
        };

        const interval = setInterval(() => {
            checkReminders();
            lastChecked.current = new Date();
        }, 10000); // Check every 10s for better responsiveness

        // Run immediately on mount
        checkReminders();
        lastChecked.current = new Date();

        return () => clearInterval(interval);
    }, [events, chores, household, user, medications, profiles]);

    return null;
}
