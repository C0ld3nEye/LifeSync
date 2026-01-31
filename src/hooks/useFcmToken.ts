import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '../lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';

const VAPID_KEY = 'BK6HJcPhp9kjJYruKnH1wT7iWc7sqB2ygtPYTKu8P_WLPj3WD9f6rVbG7rGZ41EBVQgoxBlmZpnd5xdCsGGdtKQ';

export const useFcmToken = () => {
    const { user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null);

    useEffect(() => {
        const retrieveToken = async () => {
            try {
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator && user) {
                    const messaging = getMessaging(app);

                    // Request permission
                    const permission = await Notification.requestPermission();
                    setNotificationPermissionStatus(permission);

                    if (permission === 'granted') {
                        const currentToken = await getToken(messaging, {
                            vapidKey: VAPID_KEY,
                        });

                        if (currentToken) {
                            setToken(currentToken);

                            // Sauvegarder automatiquement le token dans Firestore pour cet utilisateur
                            // On utilise le token comme ID de document pour éviter les doublons par appareil
                            const tokenRef = doc(db, 'users', user.uid, 'fcmTokens', currentToken);
                            await setDoc(tokenRef, {
                                token: currentToken,
                                deviceType: navigator.userAgent,
                                lastUpdated: serverTimestamp(),
                            }, { merge: true });

                            console.log('FCM Token sauvegardé pour l\'utilisateur:', user.uid);
                        }
                    }

                    // Listener for foreground messages
                    const unsubscribe = onMessage(messaging, (payload) => {
                        console.log('Foreground message received:', payload);
                        if (payload.notification) {
                            new Notification(payload.notification.title || 'Notification', {
                                body: payload.notification.body,
                                icon: payload.notification.icon || '/icon-192x192.png',
                            });
                        }
                    });

                    return () => unsubscribe();
                }
            } catch (error) {
                console.error('An error occurred while retrieving token:', error);
            }
        };

        retrieveToken();
    }, [user]); // Re-run when user changes to ensure token is linked to the right account

    return { token, notificationPermissionStatus };
};
