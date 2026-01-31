
import { NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

webpush.setVapidDetails(
    'mailto:example@yourdomain.org',
    'BKV16my15suoQKYXl8CqECwQw4ZcD2SKMC7svgc1XUKUVLzMw_2NlBzscL8_IYdMqVgSlZSPk09gCVmW_hjNjLg',
    '38kdvI-i6T3Jwf2uI9dNcSBa12m4s7_u1lVJqVyxbow'
);

export async function POST(request: Request) {
    try {
        const { message, title, url } = await request.json();

        const payload = JSON.stringify({
            title: title || 'LifeSync Notification',
            body: message || 'You have a new update!',
            url: url || '/'
        });

        const subscriptionsRef = collection(db, 'push_subscriptions');
        const snapshot = await getDocs(subscriptionsRef);

        const notificationPromises = snapshot.docs.map(doc => {
            const subscription = doc.data();
            return webpush.sendNotification(
                subscription as webpush.PushSubscription, 
                payload,
                {
                    headers: {
                        'Urgency': 'high',
                        'Topic': 'lifesync-notifications' // Optional: grouping
                    }
                }
            )
                .catch(err => {
                    console.error('Error sending notification to', subscription.endpoint, err);
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription is gone, should delete from DB (omitted for brevity)
                        console.log('Subscription invalid, should delete');
                    }
                });
        });

        await Promise.all(notificationPromises);

        return NextResponse.json({ success: true, count: snapshot.docs.length });
    } catch (error) {
        console.error('Error sending notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
