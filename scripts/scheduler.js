const admin = require('firebase-admin');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { formatInTimeZone } = require('date-fns-tz');


// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '..', 'service-account.json');
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY; // Needed for server-side generation

// --- HELPER TO SEND MSG ---
function sendTelegram(chatId, text) {
    if (!TOKEN || !chatId) return;
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' });
    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    };
    const req = https.request(options, r => { });
    req.on('error', e => console.error("Telegram send error:", e));
    req.write(body);
    req.end();
}

// --- INIT FIREBASE ---
// Note: User needs to provide a Service Account Key if they want full backend access consistently.
// If they don't have one, this script will fail.
// We'll check if the file exists.
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error("❌ ERREUR : Clé de service Firebase introuvable.");
    console.error(`Veuillez placer votre fichier 'service-account.json' à la racine du projet.`);
    console.error("Ou définissez FIREBASE_SERVICE_ACCOUNT_PATH dans .env.local");
    console.error("Vous pouvez générer cette clé dans la console Firebase > Paramètres du projet > Comptes de service.");
    process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("⏰ Service de notifications LifeSync démarré...");
console.log("Vérification toutes les minutes.");

async function checkReminders() {
    const now = new Date();
    // Round down to minute to avoid double trigger if execution < 1s (unlikely but safe)
    now.setSeconds(0, 0);

    // We look for events starting soon.
    // Ideally we would query all events, but Firestore structure is nested: households/{hid}/events/{eid}
    // We need to query collectionGroup 'events'.

    try {
        const eventsSnapshot = await db.collectionGroup('events').get();
        // This is not efficient for scaling but okay for 1 user.
        // A better query would be:
        // .where('start', '>=', now.toISOString()) 
        // But 'start' is a string in this model. format ISO.

        eventsSnapshot.forEach(async doc => {
            const event = doc.data();
            const householdId = doc.ref.parent.parent.id; // households/{hid}/events/{eid}

            // Parse Date
            if (!event.start) return;
            const startDate = new Date(event.start);
            const diffMs = startDate.getTime() - now.getTime();
            const diffMinutes = Math.round(diffMs / 60000);

            if (diffMinutes < 0) return; // Past event

            // 1. STANDARD REMINDERS
            if (event.reminders && Array.isArray(event.reminders)) {
                for (const reminderMin of event.reminders) {
                    if (diffMinutes === reminderMin) {
                        console.log(`🔔 Notification pour "${event.title}" (dans ${reminderMin} min)`);
                        await notifyEvent(householdId, event, `dans ${reminderMin} minutes`, false);
                    }
                }
            }

            // 2. TRAVEL DEPARTURE NOTIFICATION
            if (event.departureTime) {
                const departDate = new Date(event.departureTime);
                const diffDepartMs = departDate.getTime() - now.getTime();
                const diffDepartMin = Math.round(diffDepartMs / 60000);

                // Notify exactly at departure time (or 1 min before to be safe)
                if (diffDepartMin === 0 || diffDepartMin === 5) { // Notify at T-5min and T-0
                    // Prevent double notify with flag? 
                    // Since script runs every minute, T-0 happens once. T-5 happens once.
                    // We accept 2 notifications for travel: "Prepare to leave" and "Leave now".

                    const travelTime = event.travelTime || 0;
                    if (diffDepartMin === 0) {
                        const msg = `🚗 *DÉPART MAINTENANT*\nTrajet estimé : ${travelTime} min.\nC'est l'heure de partir pour être à l'heure !`;
                        await notifyEvent(householdId, event, msg, true);
                    } else if (diffDepartMin === 5) {
                        const msg = `👟 *Préparez-vous*\nDépart conseillé dans 5 minutes (Trajet: ${travelTime} min).`;
                        await notifyEvent(householdId, event, msg, true);
                    }
                }
            }
        });

    } catch (e) {
        console.error("Erreur checkReminders:", e);
    }
}

async function notifyEvent(householdId, event, timeMsgOrCustomBody, isCustomBody) {
    const householdDoc = await db.collection('households').doc(householdId).get();
    if (!householdDoc.exists) return;

    const hData = householdDoc.data();
    const prefs = hData.memberPreferences || {};

    let targets = [];
    if (event.assignees.includes('family')) {
        targets = Object.keys(prefs);
    } else {
        targets = event.assignees;
    }

    targets.forEach(uid => {
        const userPref = prefs[uid];
        // Check if travel notifications are disabled for this user? 
        // We added 'travelNotificationsEnabled' in user prefs but didn't UI it. Assume enabled for now or check prop.
        // if (isCustomBody && userPref.travelNotificationsEnabled === false) return; 

        if (userPref && userPref.telegramChatId) {
            const addressMsg = (event.location?.label || event.address) ? `\n📍 [Voir le plan](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location?.label || event.address)})` : "";

            let finalMsg = "";
            if (isCustomBody) {
                finalMsg = `📅 *Agenda - ${event.title}*\n${timeMsgOrCustomBody}${addressMsg}`;
            } else {
                finalMsg = `📅 *Agenda*\n*${event.title}*\n${timeMsgOrCustomBody}.${addressMsg}`;
            }

            sendTelegram(userPref.telegramChatId, finalMsg);
        }
    });
}



// --- DAILY CHALLENGES AUTOMATION ---
// --- DAILY CHALLENGES AUTOMATION ---
// Logic moved to src/app/api/cron/daily-challenge/route.ts
// This function just triggers the API if needed, or we just rely on a single trigger call per household/user.
// Actually, calling the API orchestrates everything. We just need to call it.

async function checkDailyChallenges() {
    const now = new Date();
    const householdsSnap = await db.collection('households').get();

    for (const hDoc of householdsSnap.docs) {
        const householdId = hDoc.id;
        const hData = hDoc.data();
        const tz = hData.timezone || 'Europe/Paris';

        const localTimeStr = formatInTimeZone(now, tz, 'HH:mm');
        const [localHour, localMinute] = localTimeStr.split(':').map(Number);

        // 1. GENERATION TRIGGER (06:00)
        // We trigger the API for this household.
        if (localHour === 6 && localMinute === 0) {
            console.log(`⚡ Déclenchement génération défis pour ${householdId}...`);
            // Call Local API
            // Assuming the script runs on the same machine or can access the app URL.
            // If running in docker/pm2 on same server, http://localhost:3000 should work.
            try {
                const apiRes = await fetch('http://localhost:3000/api/cron/daily-challenge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ householdId })
                });
                const apiJson = await apiRes.json();
                console.log("API Result:", JSON.stringify(apiJson));
            } catch (e) {
                console.error("Failed to call Challenge API:", e);
            }
        }

        // 2. DAILY NOTIF (08:00 - 09:00 Window)
        // We use a larger window (8h-9h) and a flag to ensure delivery + verify non-repetition
        if (localHour === 8) {
            const prefs = hData.memberPreferences || {};
            const memberIds = hData.members || [];

            for (const uid of memberIds) {
                // Fetch today's challenge
                const challengeId = `${localDateStr}_${uid}`;
                const challengeRef = db.collection('households').doc(householdId).collection('dailyChallenges').doc(challengeId);
                const challengeSnap = await challengeRef.get();

                if (challengeSnap.exists) {
                    const challenge = challengeSnap.data();

                    // Only send if NOT sent yet
                    if (!challenge.notificationSent) {
                        const pref = prefs[uid];

                        if (pref && pref.telegramChatId) {
                            let header = `🎯 *Nouveau Défi LifeSync !*`;
                            let footer = "";

                            if (challenge.isSpecial) {
                                header = `🔥 *ALERTE DÉFI HARDCORE* 🔥 (+${challenge.pointsReward || 50} pts)`;
                                footer = `\n\n💪 *Courage !* Tu es dernier du classement, réussis ce défi pour gagner des points bonus et rattraper les autres !`;
                            }
                            if (challenge.type === 'prank') header = `😈 *DÉFI MYSTÈRE (PRANK)* 😈`;
                            if (challenge.type === 'coop') header = `🤝 *DÉFI COLLECTIF (COOP)* 🤝`;
                            if (challenge.type === 'competitive') header = `⚔️ *DÉFI VERSUS* ⚔️`;

                            await sendTelegram(pref.telegramChatId, `${header}\n\n*${challenge.title}*\n_${challenge.description}_${footer}`);
                            console.log(`🔔 Notification enviée à ${uid}`);

                            // Mark as sent to avoid spam
                            await challengeRef.update({ notificationSent: true });
                        }
                    }
                }
            }
        }

        // 3. REMINDER (18:00) - CHALLENGES
        if (localHour === 18 && localMinute === 0) {
            console.log(`⚠️ 18:00 (${tz}) - Rappel défis...`);
            const prefs = hData.memberPreferences || {};
            const memberIds = hData.members || [];

            for (const uid of memberIds) {
                const challengeId = `${localDateStr}_${uid}`;
                const challengeRef = db.collection('households').doc(householdId).collection('dailyChallenges').doc(challengeId);
                const challengeSnap = await challengeRef.get();

                if (challengeSnap.exists) {
                    const challenge = challengeSnap.data();
                    if (!challenge.completed) {
                        const userPref = prefs[uid];
                        if (userPref && userPref.telegramChatId) {
                            sendTelegram(userPref.telegramChatId, `⏳ *Dernier rappel*\nTu n'as pas encore validé : *${challenge.title}*`);
                        }
                    }
                }
            }
        }
    }
}

async function checkMedicationTimeReminders() {
    const now = new Date();
    const householdsSnap = await db.collection('households').get();

    for (const hDoc of householdsSnap.docs) {
        const householdId = hDoc.id;
        const hData = hDoc.data();
        const tz = hData.timezone || 'Europe/Paris';
        const localTimeStr = formatInTimeZone(now, tz, 'HH:mm');
        const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');

        const memberPrefs = hData.memberPreferences || {};

        try {
            const medsSnap = await hDoc.ref.collection('medications').where('active', '==', true).get();

            // OPTIMIZATION: Fetch completions for today to avoid notifying if already taken
            const completionsSnap = await hDoc.ref.collection('medicationCompletions').where('date', '==', todayStr).get();
            const completions = completionsSnap.docs.map(d => d.data());

            for (const medDoc of medsSnap.docs) {
                const med = medDoc.data();
                if (!med.times || !Array.isArray(med.times)) continue;

                // Check if medication is due today
                const startDateStr = med.startDate;
                if (todayStr < startDateStr) continue;

                let isDueToday = false;
                if (med.frequency === 'daily') isDueToday = true;
                else if (med.frequency === 'weekly') {
                    const startD = new Date(startDateStr);
                    const checkD = new Date(todayStr);
                    isDueToday = startD.getDay() === checkD.getDay();
                } else if (med.frequency === 'custom' && med.customDays) {
                    const startD = new Date(startDateStr);
                    const checkD = new Date(todayStr);
                    const diffDays = Math.floor((checkD - startD) / 86400000);
                    isDueToday = (diffDays % med.customDays === 0);
                } else if (med.frequency === 'yearly') {
                    isDueToday = todayStr.substring(5) === startDateStr.substring(5);
                }

                if (!isDueToday) continue;

                // Check each scheduled time
                for (const timeStr of med.times) {
                    if (timeStr === localTimeStr) {
                        // CRITICAL CHECK: Has this specific dose already been taken?
                        // We check if a completion exists for this med + date + time
                        // Some legacy completions might not have time, but new ones should.
                        // If user validated "early" (e.g. 09:55 for 10:00), it should exist in completions.
                        const completionIdSearch = `${medDoc.id}-${todayStr}-${timeStr.replace(':', '')}`;

                        const isAlreadyTaken = completions.some(c => {
                            // Construction comparable to how we build IDs or how we check in healthReminders
                            const cTime = (c.time || '').replace(':', '');
                            const cId = `${c.medId}-${c.date}-${cTime}`;
                            return cId === completionIdSearch;
                        });

                        if (isAlreadyTaken) {
                            console.log(`✅ Traitement déjà validé pour ${med.name} à ${timeStr}. Pas de notification.`);
                            continue;
                        }

                        console.log(`🔔 Rappel immédiat médicament : ${med.name} à ${timeStr} (${tz})`);

                        const profileSnap = await hDoc.ref.collection('healthProfiles').doc(med.profileId).get();
                        const profile = profileSnap.exists ? profileSnap.data() : null;

                        let subjectName = profile?.name;
                        if (!subjectName && profile?.userId) {
                            const memberProfile = (hData.memberProfiles || []).find(m => m.uid === profile.userId);
                            subjectName = memberProfile?.displayName;
                        }
                        if (!subjectName) subjectName = "Un membre du foyer";

                        const targetUid = profile?.userId || med.createdBy;
                        if (targetUid && memberPrefs[targetUid]?.telegramChatId) {
                            sendTelegram(memberPrefs[targetUid].telegramChatId, `💊 *Rappel Santé*\nIl est l'heure de prendre votre traitement : *${med.name}* pour ${subjectName}.`);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`Error in checkMedicationTimeReminders for ${householdId}:`, e);
        }
    }
}

async function checkHealthReminders() {
    const now = new Date();
    const householdsSnap = await db.collection('households').get();

    for (const hDoc of householdsSnap.docs) {
        const householdId = hDoc.id;
        const hData = hDoc.data();
        const tz = hData.timezone || 'Europe/Paris';

        const localTimeStr = formatInTimeZone(now, tz, 'HH:mm');
        const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');

        // Trigger at 18:00 AND 21:00 LOCAL
        if (localTimeStr !== '18:00' && localTimeStr !== '21:00') continue;

        console.log(`🏥 ${localTimeStr} (${tz}) - Vérification des traitements de santé...`);

        const memberPrefs = hData.memberPreferences || {};

        try {
            const medsSnap = await hDoc.ref.collection('medications').where('active', '==', true).get();
            const completionsSnap = await hDoc.ref.collection('medicationCompletions').where('date', '==', todayStr).get();
            const completions = completionsSnap.docs.map(d => d.data());

            for (const medDoc of medsSnap.docs) {
                const med = medDoc.data();
                med.id = medDoc.id;

                const startDateStr = med.startDate;
                if (todayStr < startDateStr) continue;

                let isDue = false;
                if (med.frequency === 'daily') isDue = true;
                else if (med.frequency === 'weekly') {
                    const startD = new Date(startDateStr);
                    const checkD = new Date(todayStr);
                    isDue = startD.getDay() === checkD.getDay();
                } else if (med.frequency === 'custom' && med.customDays) {
                    const startD = new Date(startDateStr);
                    const checkD = new Date(todayStr);
                    const diffDays = Math.floor((checkD - startD) / 86400000);
                    isDue = (diffDays % med.customDays === 0);
                } else if (med.frequency === 'yearly') {
                    isDue = todayStr.substring(5) === startDateStr.substring(5);
                }

                if (!isDue) continue;

                // Check all scheduled times for this med
                const times = med.times || ['08:00'];
                let hasMissedAny = false;

                for (const t of times) {
                    const completionId = `${med.id}-${todayStr}-${t.replace(':', '')}`;
                    const isDone = completions.some(c => `${c.medId}-${c.date}-${(c.time || '').replace(':', '')}` === completionId);

                    // Only consider missed if the scheduled time is in the past
                    if (!isDone && t <= localTimeStr) {
                        hasMissedAny = true;
                        break;
                    }
                }

                if (hasMissedAny) {
                    const profileSnap = await hDoc.ref.collection('healthProfiles').doc(med.profileId).get();
                    const profile = profileSnap.exists ? profileSnap.data() : null;

                    let subjectName = profile?.name;
                    if (!subjectName && profile?.userId) {
                        const memberProfile = (hData.memberProfiles || []).find(m => m.uid === profile.userId);
                        subjectName = memberProfile?.displayName;
                    }
                    if (!subjectName) subjectName = "Un membre du foyer";

                    const concernedUid = profile?.userId || med.createdBy;

                    // 1. Notify the concerned person
                    if (concernedUid && memberPrefs[concernedUid]?.telegramChatId) {
                        console.log(`✉️ Envoi rappel rattrapage à ${concernedUid} pour ${med.name}`);
                        sendTelegram(memberPrefs[concernedUid].telegramChatId, `💊 *Rappel Santé (${localTimeStr})*\nIl semblerait que vous ayez oublié : *${med.name}* pour ${subjectName}.\nN'oubliez pas de le valider dans l'application !`);
                    }

                    // 2. Notify others (Caregiver Alert) - only at 21:00 for serious follow-up
                    if (!med.isPrivate && localTimeStr === '21:00') {
                        Object.entries(memberPrefs).forEach(([uid, pref]) => {
                            if (uid !== concernedUid && pref && pref.telegramChatId) {
                                console.log(`✉️ Envoi alerte foyer à ${uid} pour ${med.name} (${subjectName})`);
                                sendTelegram(pref.telegramChatId, `⚠️ *Alerte Foyer*\n*${subjectName}* n'a toujours pas validé son traitement : *${med.name}* ce soir.`);
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error(`Error processing health for household ${householdId}:`, e);
        }
    }
}

// --- SYSTEM MONITORING ---
async function updateHeartbeat() {
    try {
        await db.collection('system').doc('scheduler').set({
            status: 'online',
            lastHeartbeat: new Date().toISOString(),
            version: '0.9.0'
        }, { merge: true });
    } catch (e) {
        console.error("Heartbeat fail:", e);
    }
}

async function logSystemError(context, error) {
    console.error(`ERROR [${context}]:`, error);
    try {
        await db.collection('system').doc('scheduler').collection('logs').add({
            context,
            message: error.message || String(error),
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Optional: Send Emergency Telegram if critical (add logic later)
    } catch (e) {
        console.error("Failed to log error to Firestore:", e);
    }
}

// Run every minute
setInterval(async () => {
    try {
        await updateHeartbeat();
        await checkReminders().catch(e => logSystemError('checkReminders', e));
        await checkDailyChallenges().catch(e => logSystemError('checkDailyChallenges', e));
        await checkMedicationTimeReminders().catch(e => logSystemError('checkMedicationTimeReminders', e));
        await checkHealthReminders().catch(e => logSystemError('checkHealthReminders', e));
    } catch (fatal) {
        console.error("FATAL SCHEDULER ERROR:", fatal);
        logSystemError('FATAL_LOOP', fatal);
    }
}, 60 * 1000);

// Run immediately on start
console.log("🚀 Lancement initial des tâches...");
updateHeartbeat();
checkReminders();

