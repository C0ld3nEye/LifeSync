importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Config from .env.local (Auto-generated)
const firebaseConfig = {
  apiKey: "AIzaSyAreq-lgIJC20D2sjtlv2VIAKtr5fy7Urs",
  authDomain: "meal-planer-d8184.firebaseapp.com",
  projectId: "meal-planer-d8184",
  storageBucket: "meal-planer-d8184.firebasestorage.app",
  messagingSenderId: "6386360698",
  appId: "1:6386360698:web:fd13652700a9595c8d76c3"
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
