const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

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

async function checkConfig() {
    const householdsSnap = await db.collection('households').get();

    for (const hDoc of householdsSnap.docs) {
        const hData = hDoc.data();
        console.log(`\n========================================`);
        console.log(`HOUSEHOLD: ${hData.name}`);
        console.log(`ID: ${hDoc.id}`);
        console.log(`Timezone: ${hData.timezone || 'NOT SET (default Europe/Paris)'}`);

        console.log(`\nMember Preferences:`);
        const memberPrefs = hData.memberPreferences || {};
        for (const [uid, pref] of Object.entries(memberPrefs)) {
            console.log(`  - UID: ${uid}`);
            console.log(`    Telegram ID: ${pref.telegramChatId || 'MISSING'}`);
            console.log(`    Active Badge: ${pref.activeBadge || 'None'}`);
        }

        console.log(`\nMedications:`);
        const medsSnap = await hDoc.ref.collection('medications').get();
        if (medsSnap.empty) {
            console.log(`  No medications found.`);
        } else {
            medsSnap.forEach(mDoc => {
                const med = mDoc.data();
                console.log(`  - [${med.active ? 'ACTIVE' : 'INACTIVE'}] ${med.name}`);
                console.log(`    Times: ${med.times?.join(', ') || 'N/A'}`);
                console.log(`    Frequency: ${med.frequency}`);
                console.log(`    Is Private: ${med.isPrivate}`);
            });
        }
    }
    process.exit(0);
}

checkConfig().catch(err => {
    console.error(err);
    process.exit(1);
});
