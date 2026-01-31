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
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkConfig() {
    console.log("Checking Firestore configuration...");
    
    // Get all households
    const householdsSnap = await db.collection('households').get();
    
    for (const hDoc of householdsSnap.docs) {
        const hData = hDoc.data();
        console.log(`\n--- Household: ${hData.name} (${hDoc.id}) ---`);
        console.log(`Timezone: ${hData.timezone || 'Europe/Paris'}`);
        
        const memberPrefs = hData.memberPreferences || {};
        console.log("Member Preferences:");
        for (const [uid, pref] of Object.entries(memberPrefs)) {
            console.log(`  - User ${uid}: Telegram ID = ${pref.telegramChatId || 'MISSING'}, Active Badge = ${pref.activeBadge || 'None'}`);
        }
        
        // Check medications
        const medsSnap = await hDoc.ref.collection('medications').where('active', '==', true).get();
        console.log(`Active Medications: ${medsSnap.size}`);
        medsSnap.forEach(mDoc => {
            const med = mDoc.data();
            console.log(`  - ${med.name} (ID: ${mDoc.id}): Times = ${med.times?.join(', ') || 'None'}, Freq = ${med.frequency}`);
        });
    }
    
    process.exit(0);
}

checkConfig().catch(err => {
    console.error(err);
    process.exit(1);
});
