import { NextRequest, NextResponse } from "next/server";
import { generateChallengeForUser } from "@/lib/server/challenges";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";

export const dynamic = 'force-dynamic'; // Prevent caching

export async function POST(req: NextRequest) {
    try {
        // Basic Security Check (Localhost or Secret Header)
        // For now, we assume implicit trust if called locally or we rely on obscured path/env.
        // In prod, check for 'Authorization': `Bearer ${process.env.CRON_SECRET}`

        const body = await req.json().catch(() => ({}));
        const { householdId: specificHouseholdId, targetUid: specificTargetUid } = body;

        const today = format(new Date(), 'yyyy-MM-dd');
        const results: any[] = [];

        // 1. Determine Scope
        let householdsToProcess: { id: string }[] = [];

        if (specificHouseholdId) {
            householdsToProcess = [{ id: specificHouseholdId }];
        } else {
            const snap = await getDocs(collection(db, "households"));
            householdsToProcess = snap.docs.map(d => ({ id: d.id }));
        }

        // 2. Iterate Households
        for (const h of householdsToProcess) {
            const hRef = doc(db, "households", h.id);
            const hSnap = await getDoc(hRef);
            if (!hSnap.exists()) continue;

            const hData = hSnap.data();
            const members = hData.members || [];

            // Filter target users if specificTargetUid is set
            const usersToProcess = specificTargetUid
                ? members.filter((uid: string) => uid === specificTargetUid)
                : members;

            // 3. Process Users
            for (const uid of usersToProcess) {
                // Check if challenge already exists
                const challengeId = `${today}_${uid}`;
                const challengeRef = doc(db, "households", h.id, "dailyChallenges", challengeId);
                const challengeSnap = await getDoc(challengeRef);

                if (!challengeSnap.exists()) {
                    console.log(`Generating challenge for ${uid} in ${h.id}`);
                    try {
                        const challenge = await generateChallengeForUser({
                            targetUid: uid,
                            householdId: h.id
                        });
                        results.push({ uid, status: 'generated', challenge });
                    } catch (e: any) {
                        console.error(`Error generating for ${uid}:`, e);
                        results.push({ uid, status: 'error', error: e.message });
                    }
                } else {
                    results.push({ uid, status: 'skipped', reason: 'exists' });
                }
            }
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });
    } catch (error: any) {
        console.error("API Cron Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
