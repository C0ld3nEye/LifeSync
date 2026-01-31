const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { formatInTimeZone } = require('date-fns-tz');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error("No service account found");
    process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function debugChallenges() {
    const now = new Date();
    // Default to Paris if not found, but we check per household later
    const checkDateStr = formatInTimeZone(now, 'Europe/Paris', 'yyyy-MM-dd');

    console.log(`Checking challenges for date: ${checkDateStr}`);

    const householdsSnap = await db.collection('households').get();

    for (const hDoc of householdsSnap.docs) {
        const hData = hDoc.data();
        const tz = hData.timezone || 'Europe/Paris';
        const localDateStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');

        console.log(`\nHousehold: ${hData.name} (${hDoc.id})`);
        console.log(`Timezone: ${tz}, Local Date: ${localDateStr}`);

        const memberIds = hData.members || [];
        for (const uid of memberIds) {
            const challengeId = `${localDateStr}_${uid}`;
            const challengeRef = db.collection('households').doc(hDoc.id).collection('dailyChallenges').doc(challengeId);
            const challengeSnap = await challengeRef.get();

            if (challengeSnap.exists) {
                const data = challengeSnap.data();
                console.log(`  ✅ Challenge FOUND for user ${uid}`);
                console.log(`     Title: ${data.title}`);
                console.log(`     Generated At: ${data.generatedAt}`);
            } else {
                console.log(`  ❌ Challenge MISSING for user ${uid} (ID: ${challengeId})`);
            }
        }
    }
    process.exit(0);
}

debugChallenges();
