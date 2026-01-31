const fs = require('fs');
const path = require('path');

try {
    // 1. Read .env.local
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const config = {};
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
            config[key.trim()] = values.join('=').trim();
        }
    });

    // 2. Define the template
    const swContent = `importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Config from .env.local (Auto-generated)
const firebaseConfig = {
  apiKey: "${config['NEXT_PUBLIC_FIREBASE_API_KEY']}",
  authDomain: "${config['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN']}",
  projectId: "${config['NEXT_PUBLIC_FIREBASE_PROJECT_ID']}",
  storageBucket: "${config['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET']}",
  messagingSenderId: "${config['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']}",
  appId: "${config['NEXT_PUBLIC_FIREBASE_APP_ID']}"
};

try {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
    console.error("Firebase Messaging SW Error:", error);
}
`;

    // 3. Write to public/firebase-messaging-sw.js
    const swPath = path.join(__dirname, 'public', 'firebase-messaging-sw.js');
    fs.writeFileSync(swPath, swContent);

    console.log('Successfully generated public/firebase-messaging-sw.js with config');

} catch (err) {
    console.error('Error generating SW:', err);
    process.exit(1);
}
