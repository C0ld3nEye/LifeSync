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

            // Check reminders
            if (event.reminders && Array.isArray(event.reminders)) {
                for (const reminderMin of event.reminders) {
                    if (diffMinutes === reminderMin) {
                        // IT'S TIME!
                        console.log(`🔔 Notification pour "${event.title}" (dans ${reminderMin} min)`);

                        // Get Household Recipients
                        const householdDoc = await db.collection('households').doc(householdId).get();
                        if (!householdDoc.exists) continue;

                        const hData = householdDoc.data();
                        const prefs = hData.memberPreferences || {};

                        // Determine who to notify
                        let targets = [];
                        if (event.assignees.includes('family')) {
                            targets = Object.keys(prefs); // Everyone
                        } else {
                            targets = event.assignees;
                        }

                        // Send
                        targets.forEach(uid => {
                            const userPref = prefs[uid];
                            if (userPref && userPref.telegramChatId) {
                                const timeMsg = reminderMin === 0 ? "C'est maintenant !" : `dans ${reminderMin} minutes.`;
                                const addressMsg = event.address ? `\n📍 [Voir le plan](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)})` : "";
                                sendTelegram(userPref.telegramChatId, `📅 *Agenda*\n*${event.title}*\n${timeMsg}${addressMsg}`);
                            }
                        });
                    }
                }
            }
        });

    } catch (e) {
        console.error("Erreur checkReminders:", e);
    }
}

// --- DAILY CHALLENGES AUTOMATION ---
async function generateGeminiChallenge(targetMember, familyContext, recentChallenges, isCollective) {
    if (!GEMINI_API_KEY) {
        console.error("❌ API KEY manquante pour Gemini");
        return null;
    }

    const prompt = `Agis comme un Coach de Bien-être et de Vie Familiale très créatif et un peu taquin.
    CIBLE: ${targetMember.role}${targetMember.age ? ` (${targetMember.age} ans)` : ''}.
    SA PERFORMANCE RÉCENTE: ${targetMember.successes} défis réussis d'affilée.
    MEMBRES DU FOYER (CONTEXTE): ${familyContext.map(m => m.role).join(', ')}.
    
    OBJECTIF: Proposer LE défi santé/bien-être personnel pour CETTE PERSONNE aujourd'hui.
    ${isCollective ? "REMARQUE: C'est un jour PARTICULIER (Collectif/Social). Le défi doit impliquer d'autres membres ou être fait en commun (ex: 'Coop', 'Prank', 'Competitive')." : "Jour normal (Focus personnel)."}
    
    VARIÉTÉ (SES DÉFIS RÉCENTS): ${recentChallenges.join(', ') || "Aucun"}.

    NOUVELLES RÈGLES D'OR (IMPORTANT):
    1. **CONCRET ET PHYSIQUE** : Moins de "penser à..." ou "méditer sur...", plus de "faire", "bouger", "toucher". (ex: "Faire 10 pompes", "Boire 1L d'eau avant midi", "Ranger tel espace", "Danser sur une musique").
    2. **DIFFICULTÉ ADAPTATIVE** : 
       - Si Streak faible (< 3) : Défi FACILE.
       - Si Streak moyen (3-10) : Défi MODÉRÉ.
       - Si Streak élevé (> 10) : Défi DIFFICILE ou EXPERT.
       - **EXCEPTION PRIORITAIRE** : Si 'isLastInRanking' est VRAI (défini ci-dessous), la difficulté DOIT être **EXPERT**, peu importe le Streak.

    3. **TYPES DE DÉFIS** :
       - "solo" | "coop" | "competitive" | "prank"

    4. **DÉFIS SPÉCIAUX (CATCH-UP)** : 
       - ${targetMember.isLastInRanking ? "ALERTE: Cette personne est DERNIÈRE du classement. Tu DOIS générer un défi de difficulté 'expert' qui rapporte des points (30-50 pts)." : "Pas de points bonus pour cette personne."}
       - **RÈGLE ABSOLUE** : Les points (pointsReward > 0) ne sont attribués **QU'AUX** défis de difficulté **'expert'**. Aucun autre.
    
    CONSIGNES GÉNÉRALES:
    - Langue: Français.
    - Ton: Motivant, Energetique, parfois Drôle.
    - Ne PAS suggérer de recette spécifique (géré ailleurs).
    - **INTERDICTION** de mentionner l'âge, le rôle ("Profil", "Membre") ou des données techniques dans le texte.
    - S'adresser directement à l'utilisateur (**"Tu"**). Ne jamais dire "Profil de X ans".
    
    FORMAT JSON ATTENDU:
    {
        "title": "Nom court et punchy",
        "description": "Action précise et CONCRÈTE à faire.",
        "target": "Bénéfice escompté",
        "category": "hydration" | "activity" | "mental" | "nutrition" | "social",
        "difficulty": "easy" | "medium" | "hard" | "expert",
        "type": "solo" | "coop" | "competitive" | "prank",
        "pointsReward": 0,
        "isSpecial": false
    }
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        console.error(`Gemini Error ${res.statusCode}: ${data}`);
                        resolve(null);
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const text = json.candidates[0].content.parts[0].text;
                        // Extract JSON if wrapped in markdown
                        const start = text.indexOf('{');
                        const end = text.lastIndexOf('}');
                        if (start !== -1 && end !== -1) {
                            resolve(JSON.parse(text.substring(start, end + 1)));
                        } else {
                            resolve(JSON.parse(text));
                        }
                    } catch (e) {
                        console.error("Gemini Parse Error:", e);
                        resolve(null);
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    } catch (e) {
        console.error("Generate Exec Error:", e);
        return null;
    }
}

async function checkDailyChallenges() {
    const now = new Date();
    const householdsSnap = await db.collection('households').get();

    for (const hDoc of householdsSnap.docs) {
        const householdId = hDoc.id;
        const hData = hDoc.data();
        const tz = hData.timezone || 'Europe/Paris';

        const localTimeStr = formatInTimeZone(now, tz, 'HH:mm');
        const [localHour, localMinute] = localTimeStr.split(':').map(Number);
        const localDateStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');
        const dayOfWeek = new Date(localDateStr).getDay();
        // Sync with App: Tue (2), Sat (6) -> 2 days/week ONLY
        const isCollective = [2, 6].includes(dayOfWeek);

        // 1. GENERATION (Anytime after 06:00 if missing)
        if (localHour >= 6) {
            // Check if we need to generate
            const memberIds = hData.members || [];
            let sharedCollectiveChallenge = null;

            // PRE-CHECK: If Collective Day, try to find an ALREADY generated challenge for anyone in this household today
            // This ensures sync even if script restarts or runs partially
            if (isCollective) {
                const anyChallengeSnap = await db.collection('households').doc(householdId).collection('dailyChallenges')
                    .where('generatedAt', '>=', `${localDateStr}T00:00:00`)
                    .where('generatedAt', '<=', `${localDateStr}T23:59:59`)
                    .limit(1) // Just need one to copy
                    .get();

                if (!anyChallengeSnap.empty) {
                    const existingData = anyChallengeSnap.docs[0].data();
                    // Sanitize to be sure
                    sharedCollectiveChallenge = {
                        title: existingData.title,
                        description: existingData.description || "",
                        target: existingData.target || "",
                        category: existingData.category || "social",
                        difficulty: existingData.difficulty || "medium", // Default
                        type: existingData.type || "coop",
                        pointsReward: 0, // FORCE 0
                        isSpecial: false
                    };
                    console.log(`♻️ Défi collectif existant trouvé ! On va le propager.`);
                }
            }

            for (const uid of memberIds) {
                const challengeId = `${localDateStr}_${uid}`;
                const challengeRef = db.collection('households').doc(householdId).collection('dailyChallenges').doc(challengeId);
                const challengeSnap = await challengeRef.get();

                if (!challengeSnap.exists) {
                    console.log(`⚙️ Rattrapage génération défi pour ${uid} (${tz})...`);

                    const userDoc = await db.collection('users').doc(uid).get();
                    const userData = userDoc.exists ? userDoc.data() : {};

                    let userAge = userData.age || 30;
                    if (userData.birthDate) {
                        const diff = Date.now() - new Date(userData.birthDate).getTime();
                        userAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
                    }

                    let aiChallenge = null;

                    // A) USE SHARED CHALLENGE IF EXISTS (Collective Days)
                    if (isCollective && sharedCollectiveChallenge) {
                        console.log(`🔄 Réutilisation du défi collectif pour ${uid}`);
                        aiChallenge = { ...sharedCollectiveChallenge }; // Copy
                    }
                    // B) GENERATE NEW CHALLENGE
                    else {
                        const recentSnap = await db.collection('households').doc(householdId).collection('dailyChallenges')
                            .where('uid', '==', uid)
                            .orderBy('generatedAt', 'desc')
                            .limit(5)
                            .get();
                        const recentTitles = recentSnap.docs.map(d => d.data().title);

                        // RANKING CHECK (For Hardcore/Catch-up Challenges)
                        const scores = hData.monthlyScores || {};
                        let isLastInRanking = false;

                        if (memberIds.length > 1 && !isCollective) { // No Catch-up on Collective Days? Or yes? Keep it off for collective to avoid desync.
                            const ranking = memberIds.map(id => ({ id, score: scores[id] || 0 }))
                                .sort((a, b) => a.score - b.score);

                            // ADDED RULE: Only activate Catch-up mode sometimes (e.g. 15% chance)
                            if (ranking.length > 0 && ranking[0].id === uid) {
                                if (Math.random() < 0.15) {
                                    isLastInRanking = true;
                                }
                            }
                        }

                        aiChallenge = await generateGeminiChallenge(
                            { role: "Membre", successes: 0, age: userAge, isLastInRanking },
                            memberIds.map(id => ({ role: "Membre" })),
                            recentTitles,
                            isCollective
                        );

                        // IF COLLECTIVE, SAVE AS SHARED + FORCE 0 POINTS
                        if (aiChallenge && isCollective) {
                            aiChallenge.pointsReward = 0; // Force 0 pts for collective
                            aiChallenge.isSpecial = false; // No hardcore on collective
                            sharedCollectiveChallenge = aiChallenge;
                        }
                    }

                    if (aiChallenge) {
                        await challengeRef.set({
                            uid,
                            ...aiChallenge,
                            completed: false,
                            generatedAt: new Date().toISOString(),
                            notificationSent: false // Init flag
                        });
                        console.log(`✅ Défi généré pour ${uid}`);
                    }
                }
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

