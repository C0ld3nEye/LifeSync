const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const config = {};

    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
            const value = values.join('=').trim(); // Re-join in case value contains =
            config[key] = value;
        }
    });

    const firebaseConfig = {
        apiKey: config['NEXT_PUBLIC_FIREBASE_API_KEY'],
        authDomain: config['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
        projectId: config['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
        storageBucket: config['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
        messagingSenderId: config['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
        appId: config['NEXT_PUBLIC_FIREBASE_APP_ID']
    };

    console.log(JSON.stringify(firebaseConfig, null, 2));

} catch (err) {
    console.error('Error reading .env.local:', err);
    process.exit(1);
}
