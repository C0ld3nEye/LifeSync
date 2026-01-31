
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase'; // Adjust path if needed
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const subscription = await request.json();

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
        }

        // Check if subscription already exists to avoid duplicates
        const subscriptionsRef = collection(db, 'push_subscriptions');
        const q = query(subscriptionsRef, where('endpoint', '==', subscription.endpoint));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return NextResponse.json({ message: 'Subscription already exists' }, { status: 200 });
        }

        // Save to Firestore
        await addDoc(subscriptionsRef, subscription);

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Error saving subscription:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
