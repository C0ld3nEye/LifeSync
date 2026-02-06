import { db } from "@/lib/firebase"; // Assumes admin or standard client - but this is server code. 
// However, standard firebase client SDK works in Next.js server components/actions usually. 
// If using admin SDK, we need "firebase-admin". 
// Given the project uses "src/lib/gemini.ts" which uses standard SDK, we will stick to standard SDK for compatibility with Server Actions unless admin is required.
// Actually, for API routes and Server Actions, standard SDK is fine for Firestore operations if authenticated or using service account in specific way. 
// But wait, "src/lib/firebase.ts" exports "db". 
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { format, startOfWeek, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

const GEMINI_MODEL = "gemini-3-flash-preview";

// Helper for JSON extraction
function extractJson(text: string) {
    try {
        let cleaned = text;
        if (cleaned.includes('```json')) {
            cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
        } else if (cleaned.includes('```')) {
            cleaned = cleaned.replace(/```/g, '');
        }
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            return JSON.parse(cleaned.substring(start, end + 1));
        }
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", text);
        throw e;
    }
}

// Helper for Fetch with Retry
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.status === 429 || res.status >= 500) {
                await new Promise(r => setTimeout(r, 2000 * Math.pow(2, i)));
                continue;
            }
            return res;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw new Error("Gemini API Unreachable");
}

export interface ChallengeGenerationRequest {
    targetUid: string;
    householdId: string;
    forceType?: 'solo' | 'coop' | 'competitive' | 'prank';
}

export interface DailyChallenge {
    id?: string;
    uid: string;
    title: string;
    description: string;
    target: string;
    category: 'hydration' | 'activity' | 'mental' | 'nutrition' | 'social' | 'household' | 'fun';
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    type: 'solo' | 'coop' | 'competitive' | 'prank';
    pointsReward?: number;
    isSpecial?: boolean;
    completed: boolean;
    generatedAt: string;
    notificationSent?: boolean;
}

export async function generateChallengeForUser(req: ChallengeGenerationRequest): Promise<DailyChallenge | null> {
    const { targetUid, householdId } = req;
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const today = format(new Date(), 'yyyy-MM-dd');
    const dayOfWeek = new Date().getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi

    // RÈGLE 1: Jours Collectifs (Lundi=1, Vendredi=5) -> COOP OBLIGATOIRE
    // (Note: La logique de "copie" du défi maître doit être gérée en amont si on veut que ce soit strictement identique pour tous, 
    // mais ici on génère pour un user. Si on veut du synchronisé parfait, l'appelant doit gérer le "Master Challenge". 
    // POUR L'INSTANT : On force le type 'coop' pour tout le monde ces jours là.)
    const isCollectiveDay = (dayOfWeek === 1 || dayOfWeek === 5);
    const imposedType = isCollectiveDay ? 'coop' : undefined;

    // Récupération Données Foyer & User
    // 1. Profil Utilisateur
    const userRef = doc(db, "users", targetUid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    // Calcul Age
    let userAge = userData.age || 30;
    if (userData.birthDate) {
        userAge = Math.floor((Date.now() - new Date(userData.birthDate).getTime()) / 31557600000);
    }

    // 2. Stats Challenges (Streak)
    const statsRef = doc(db, "households", householdId, "memberMetadata", targetUid, "challengeStats", "main");
    const statsSnap = await getDoc(statsRef);
    const stats = statsSnap.exists() ? statsSnap.data() : { currentStreak: 0 };
    const currentStreak = stats.currentStreak || 0;

    // 3. Classement & Catch-up
    const householdRef = doc(db, "households", householdId);
    const householdSnap = await getDoc(householdRef);
    const householdData = householdSnap.exists() ? householdSnap.data() : {};

    const memberIds = householdData.members || [];
    const monthlyScores = householdData.monthlyScores || {};

    let isLastInRanking = false;
    if (memberIds.length > 1) {
        const sorted = memberIds.map((id: string) => ({ id, score: monthlyScores[id] || 0 })).sort((a: any, b: any) => a.score - b.score);
        if (sorted[0].id === targetUid) {
            // RÈGLE 2: 8% Chance Catch-up
            if (Math.random() < 0.08) {
                isLastInRanking = true;
            }
        }
    }

    // 4. Historique Récent (Anti-répétition)
    const historyRef = collection(db, "households", householdId, "dailyChallenges");
    const historyQuery = query(
        historyRef,
        where("uid", "==", targetUid),
        orderBy("generatedAt", "desc"),
        limit(10)
    );
    const historySnap = await getDocs(historyQuery);
    const recentHistory = historySnap.docs.map(d => {
        const data = d.data();
        return `[Type:${data.type}] [Diff:${data.difficulty}] ${data.title}`;
    });

    // 5. Contexte Foyer (pour le prompt)
    const familyContext = (householdData.memberProfiles || []).map((m: any) => m.role || "Membre").join(", ");

    // --- PROMPT CONSTRUCTION ---
    const prompt = `Agis comme un Coach de Vie Familiale créatif et motivant.
    CIBLE: Membre du foyer (${userAge} ans).
    STREAK ACTUEL: ${currentStreak} jours.
    CONTEXTE FOYER: ${familyContext}.

    OBJECTIF: Générer un défi quotidien unique.
    
    CONTRAINTES DE DATE:
    - Jour de la semaine (0-6): ${dayOfWeek}
    ${isCollectiveDay ? "- C'EST UN JOUR COLLECTIF (Lundi/Vendredi). TU DOIS GÉNÉRER UN DÉFI DE TYPE 'coop' (Coopératif). Le but est de faire participer quelqu'un d'autre ou de faire ensemble." : "- Jour standard. Tu es libre du type."}
    ${imposedType ? `- TYPE IMPOSÉ PAR LE SYSTÈME: '${imposedType}'.` : ""}

    HISTORIQUE RÉCENT (À NE PAS RÉPÉTER):
    ${recentHistory.join('\n')}

    RÈGLES D'OR:
    1. **ANTI-RÉPÉTITION** : Interdiction de refaire un titre de la liste ci-dessus. Varie les plaisirs (ne fais pas 3 jours de sport d'affilée).
    2. **CONCRET** : Pas de "méditer" ou "penser". Des actions réelles : "Faire 10 burpees", "Envoyer un SMS sympa", "Ranger le tiroir à bazar".
    3. **DIFFICULTÉ** :
       - Streak < 3: FACILE.
       - Streak 3-10: MOYEN.
       - Streak > 10: DIFFICILE.
       - **EXCEPTION** : Si "IsLastInRanking" est TRUE, tu DOIS faire un défi EXPERT.
    4. **CATCH-UP (RATTRAPAGE)** :
       - ${isLastInRanking ? "ALERTE: Cet utilisateur est DERNIER du classement. Génère un défi 'expert' avec une grosse récompense (30-50 pts) pour l'aider à remonter ! (isSpecial = true)" : "Pas de points bonus aujourd'hui."}

    FORMAT JSON UNIQUE:
    {
        "title": "Titre court",
        "description": "Description de l'action",
        "target": "Bénéfice (ex: Forme, Ordre, Fun)",
        "category": "hydration" | "activity" | "mental" | "nutrition" | "social" | "household" | "fun",
        "difficulty": "easy" | "medium" | "hard" | "expert",
        "type": "solo" | "coop" | "competitive" | "prank",
        "pointsReward": 0, // > 0 UNIQUEMENT si expert ET isSpecial = true
        "isSpecial": false // true UNIQUEMENT si Catch-up activé
    }
    `;

    // --- API CALL ---
    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!res.ok) {
        throw new Error(`Gemini Error: ${res.statusText}`);
    }

    const json = await res.json();
    const result = extractJson(json.candidates[0].content.parts[0].text);

    // Post-Processing & Validation
    if (isCollectiveDay && result.type !== 'coop') {
        result.type = 'coop'; // Force override if AI hallucinated
    }
    if (isLastInRanking) {
        result.difficulty = 'expert';
        result.isSpecial = true;
        if (!result.pointsReward || result.pointsReward < 20) result.pointsReward = 40;
    } else {
        result.pointsReward = 0;
        result.isSpecial = false;
    }

    const challengeData: DailyChallenge = {
        uid: targetUid,
        ...result,
        completed: false,
        generatedAt: new Date().toISOString()
    };

    // Save to Firestore handled by caller to keep this function pure-ish regarding generation? 
    // No, "generateChallengeForUser" implies the full service logic. Let's save it here.

    const challengeId = `${today}_${targetUid}`;
    await setDoc(doc(db, "households", householdId, "dailyChallenges", challengeId), challengeData);

    return challengeData;
}

export async function executeJoker(householdId: string, targetUid: string) {
    // 1. Check Quota (1 per week, resets on Monday)
    const statsRef = doc(db, "households", householdId, "memberMetadata", targetUid, "challengeStats", "main");
    const statsSnap = await getDoc(statsRef);
    const stats = statsSnap.exists() ? statsSnap.data() : {};

    // Week starts on Monday (weekStartsOn: 1)
    const lastJoker = stats.lastJokerUsedAt ? new Date(stats.lastJokerUsedAt) : null;
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    // If last joker was used AFTER the start of this week -> Quota exceeded
    if (lastJoker && isAfter(lastJoker, currentWeekStart)) {
        throw new Error("JOKER_ALREADY_USED_THIS_WEEK");
    }

    // 2. Generate New Challenge
    // We force a new generation. The generateChallengeForUser function overwrites the daily doc.
    const newChallenge = await generateChallengeForUser({
        targetUid,
        householdId,
        // We could pass a flag "isJoker" to prompt to say "Make it different"? 
        // For now, standard random generation is enough variety usually.
    });

    // 3. Update Quota
    await setDoc(statsRef, {
        lastJokerUsedAt: new Date().toISOString()
    }, { merge: true });

    return newChallenge;
}
