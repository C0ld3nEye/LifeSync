"use server";

import { generateChallengeForUser } from "@/lib/server/challenges";
import { revalidatePath } from "next/cache";

export async function generateDailyChallengeAction(householdId: string, targetUid: string) {
    if (!householdId || !targetUid) {
        throw new Error("Missing arguments");
    }

    try {
        const challenge = await generateChallengeForUser({
            targetUid,
            householdId
        });

        // Revalidate to update UI immediately
        revalidatePath(`/`);
        revalidatePath(`/health`);

        return { success: true, challenge };
    } catch (error: any) {
        console.error("Server Action Error:", error);
        return { success: false, error: error.message };
    }
}

export async function useJokerAction(householdId: string, targetUid: string) {
    if (!householdId || !targetUid) throw new Error("Missing args");

    // Import executeJoker dynamically to avoid circular deps if any (though there shouldn't be here)
    // or just standard import above
    const { executeJoker } = await import("@/lib/server/challenges");

    try {
        const challenge = await executeJoker(householdId, targetUid);
        revalidatePath(`/`);
        revalidatePath(`/health`);
        return { success: true, challenge };
    } catch (error: any) {
        console.error("Joker Error:", error);
        return { success: false, error: error.message };
    }
}
