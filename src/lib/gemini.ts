const GEMINI_MODEL = "gemini-3-flash-preview"; //

import { AgendaEvent } from "@/hooks/useAgenda";

export interface GenerationContext {
    day: string;
    type: string;
    attendees: { uid: string; displayName: string; dislikes?: string[]; allergies?: string[] }[]; // User profiles with dislikes/allergies
    commonDislikes: string[];
    kitchenTools: string[];
    isExpress: boolean;
    isBasic?: boolean;
    recentMeals: string[]; // For variety
    recentProteins: string[];
    lastWeekMeals: string[]; // Variety across weeks
    agendaEvents: AgendaEvent[];
    customRequest?: string;
    cookForLeftover?: boolean;
    inventory?: { name: string; quantity: number; unit: string; expiryDate: string | null }[];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function extractJson(text: string) {
    try {
        let cleaned = text;
        // Remove markdown code blocks if present
        if (cleaned.includes('```json')) {
            cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
        } else if (cleaned.includes('```')) {
            cleaned = cleaned.replace(/```/g, '');
        }

        // Find first { and last } to handle potential intro text/footer
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            return JSON.parse(cleaned.substring(start, end + 1));
        }
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", text);
        // Fallback: return empty object appropriate to context if possible, or rethrow
        throw e;
    }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 5): Promise<Response> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING: The API key is not configured.");

    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.status === 429 || res.status === 503 || res.status === 500) {
                const retryAfterHeader = res.headers.get('Retry-After');
                let waitTime = 2000 * Math.pow(2, i); // Exponential backoff default

                if (retryAfterHeader) {
                    const seconds = parseInt(retryAfterHeader, 10);
                    if (!isNaN(seconds)) {
                        waitTime = seconds * 1000 + 1000; // Wait requested time + 1s buffer
                    }
                }

                console.warn(`Gemini Busy (${res.status}). Retrying in ${waitTime / 1000}s... (Attempt ${i + 1}/${retries})`);
                await delay(waitTime);
                continue;
            }
            return res;
        } catch (err) {
            console.warn(`Network Error (Attempt ${i + 1}/${retries}). Retrying...`, err);
            if (i === retries - 1) throw err;
            await delay(2000);
        }
    }
    throw new Error(`Gemini API Unreachable after ${retries} retries.`);
}

export async function generateRecipe(ctx: GenerationContext) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    // --- SEASONALITY LOGIC ---
    const getSeasonPrompt = (dateStr?: string) => {
        const date = dateStr ? new Date(dateStr) : new Date();
        const month = date.getMonth(); // 0 = Janvier
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const currentMonth = monthNames[month];

        // Simple Season Mapping
        if (month >= 2 && month <= 4) return `SAISON: ${currentMonth} (PRINTEMPS). Privilégie: Asperges, Petits pois, Radis, Fèves, Épinards, Fraises.`;
        if (month >= 5 && month <= 8) return `SAISON: ${currentMonth} (ÉTÉ). Privilégie: Tomates, Courgettes, Aubergines, Poivrons, Concombre, Melon.`;
        if (month >= 9 && month <= 10) return `SAISON: ${currentMonth} (AUTOMNE). Privilégie: Champignons, Courges (Potimarron), Poireaux, Choux, Raisin.`;
        return `SAISON: ${currentMonth} (HIVER). Privilégie: Choux (fleur, bruxelles), Courges (Butternut), Poireaux, Endives, Légumes racines (Carottes, Panais). ÉVITE: Tomates, Courgettes (hors saison).`;
    };

    const mealContext = ctx.type === 'Midi' ? "Lunchbox/Travail/Réchauffable." : "Repas du soir (Maison).";
    const expressText = ctx.isExpress ? "MODE EXPRESS: ULTRA RAPIDE. Temps TOTAL MAX 15 min. Privilégie l'assemblage, le cru ou la cuisson minute. Pas de four long, pas de mijotage. Recette 'sur le pouce' mais saine." : "";
    const basicText = ctx.isBasic ? "MODE BASIQUE: Cuisine très simple, ingrédients standards (pas de trucs exotiques ou chers), peu de vaisselle. Recette familiale classique." : "";

    const customPrompt = ctx.customRequest ? `DEMANDE SPÉCIFIQUE DU CLIENT: "${ctx.customRequest}" (IMPORTANT: Priorité absolue à cette demande).` : "";


    const attendeeNames = ctx.attendees?.map(a => a.displayName).join(", ");
    const individualDislikes = ctx.attendees
        .filter(a => a.dislikes && a.dislikes.length > 0)
        .map(a => `${a.displayName} déteste: ${a.dislikes?.join(', ')}`)
        .join("; ");

    const individualAllergies = ctx.attendees
        .filter(a => a.allergies && a.allergies.length > 0)
        .map(a => `${a.displayName} est ALLERGIQUE à: ${a.allergies?.join(', ')}`)
        .join("; ");

    const nbPersonnes = ctx.attendees?.length || 1;

    const prompt = `Agis comme un Chef Nutritionniste créatif. Recette de ${ctx.type} pour: ${attendeeNames || "la famille"}.
    NOMBRE DE PERSONNES : ${nbPersonnes}
    CONTEXTE: ${mealContext} ${expressText} ${basicText}
    ${customPrompt}
    MATÉRIEL DISPONIBLE: ${ctx.kitchenTools.join(', ') || "Standard"}.
    IMPORTANT: Si le "Air Fryer" est listé, utilise-le PRIORITAIREMENT (cuisson saine, croustillante et rapide). C'est un outil favori du foyer. Sinon, utilise les autres outils spécifiés (Cookeo, Four, etc.).

    ${getSeasonPrompt()}

    INVENTAIRE / STOCK DISPONIBLE (PRIORITÉ):
    ${ctx.inventory?.map(i => `- ${i.name}: ${i.quantity} ${i.unit}${i.expiryDate ? ` (Péremption: ${i.expiryDate})` : ''}`).join('\n') || "Aucun (propose ce que tu veux)"}
    IMPORTANT: Priorise l'utilisation des ingrédients de l'inventaire pour éviter le gaspillage, surtout ceux dont la date de péremption est proche. Si tu utilises un ingrédient du stock, indique-le dans le 'rationale'.
    
    VARIÉTÉ (CRITIQUE):
    - PLATS EXACTS DE LA SEMAINE DERNIÈRE (INTERDIT DE REFAIRE À L'IDENTIQUE): ${ctx.lastWeekMeals.join(', ')}
    - HISTORIQUE RÉCENT (3 DERNIERS JOURS): ${ctx.recentMeals.join(', ')}
    - PROTÉINES RÉCENTES (Pour alternance sur 3 jours): ${ctx.recentProteins.join(', ')}.
    - ALTERNER: Boeuf, Porc, Poisson Blanc, Saumon, Crevettes, Oeufs, Tofu, Légumineuses, Dinde/Poulet.
    
    RÈGLE "PLAISIR" & ÉQUILIBRE:
    - En général : Vise l'équilibre et le sain.
    - EXCEPTION (1-2 fois/semaine) : Tu as le droit de proposer un repas "Plaisir / Comfort Food" (Burger maison, Pizza, Tacos, Plat riche) si cela semble approprié (ex: Vendredi soir, Samedi soir, ou grosse journée). Ne sois pas obsédé par le "healthy" à 100%.

    ZÉRO TOLÉRANCE - SÉCURITÉ ALIMENTAIRE & INTERDITS:
    - ALLERGIES (STRICTEMENT INTERDIT - RISQUE MÉDICAL): ${individualAllergies || "Aucune"}.
    - INTERDITS COMMUNS & DÉTESTÉS: ${ctx.commonDislikes.join(', ') || "Aucun"}, ${individualDislikes || "Aucun"}.
    - RÈGLE: Aucun de ces ingrédients ne doit apparaître, même sous forme de traces, de composants ou de VARIÉTÉS (ex: si 'céleri' est interdit, alors 'céleri-rave' et 'céleri-branche' sont INTERDITS aussi).
    
    FORMAT JSON: { 
        "recipeName": "...",
        "protein": "...", 
        "ingredients": [{"item": "...", "q": 1, "u": "..."}], 
        "prepTime": "...", 
        "cookTime": "...", 
        "cookingMethod": "...", 
        "nutriFocus": "...", 
        "description": "...",
        "instructions": ["Étape 1...", "Étape 2..."],
        "rationale": "Explique pourquoi ce repas est parfait (ex: 'Sans oignons comme demandé par Luc' ou 'Protéiné pour ta séance')."
    }
    IMPORTANT SUR LES QUANTITÉS ('q') :
    - Les quantités doivent être LE TOTAL pour les ${nbPersonnes} personnes.
    - REPROPERCIONS RÉALISTES (Benchmarks pour 1 pers) : Riz/Pâtes (80g sec / 200g cuit), Viande (120-150g), Légumes (200g). NE T'ENFLAMME PAS sur les doses.
    - SI L'UTILISATEUR DEMANDE DE 'CUISINER POUR DEMAIN' (RESTES) : Tu DOIS DOUBLER ces quantités.
    - NE METS PAS la quantité pour 1 personne. LE SYSTÈME NE FERA PAS DE MULTIPLICATION.
    - C'est TOI qui calcules le total.
    - Exemple: Si vous êtes 4 et qu'il faut 100g de riz/pers, écris "q: 400". Si plus de restes sont demandés, écris "q: 800".
    - Utilise des noms d'ingrédients simples et standards (ex: 'Oignon' au lieu de 'Gros oignon jaune émincé') pour faciliter le regroupement automatique des courses.
    - SIMPLICITÉ AVANT TOUT: Sauf demande contraire explicite ("Gourmet", "Festif"), propose des recettes ACCESSIBLES avec des ingrédients qu'on trouve au supermarché du coin. Évite les listes d'ingrédients à rallonge (max 7-8 ingrédients principaux). On veut manger *bon* mais *simple*.
    `;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error Recipe:", errText);
        throw new Error("Gemini API Error Recipe: " + errText);
    }
    const json = await res.json();
    return extractJson(json.candidates[0].content.parts[0].text);
}

export interface ChallengeContext {
    targetMember: { uid: string; role: string; age?: number; successes: number; isLastInRanking?: boolean };
    familyContext: { role: string; age?: number }[]; // To know who is in the house
    recentChallenges: string[];
    isCollective: boolean; // If true, the same prompt might be sent for others but with individual twist
}

export async function generateDailyChallenge(ctx: ChallengeContext) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const prompt = `Agis comme un Coach de Bien-être et de Vie Familiale très créatif et un peu taquin.
    CIBLE: ${ctx.targetMember.role}${ctx.targetMember.age ? ` (${ctx.targetMember.age} ans)` : ''}.
    SA PERFORMANCE RÉCENTE: ${ctx.targetMember.successes} défis réussis d'affilée.
    MEMBRES DU FOYER (CONTEXTE): ${ctx.familyContext.map(m => m.role).join(', ')}.
    
    OBJECTIF: Proposer LE défi santé/bien-être personnel pour CETTE PERSONNE aujourd'hui.
    ${ctx.isCollective ? "REMARQUE: C'est un jour PARTICULIER (Collectif/Social). Le défi doit impliquer d'autres membres ou être fait en commun." : "Jour normal (Focus personnel)."}
    
    VARIÉTÉ (SES DÉFIS RÉCENTS): ${ctx.recentChallenges.join(', ') || "Aucun"}.
    
    NOUVELLES RÈGLES D'OR (IMPORTANT):
    1. **CONCRET ET PHYSIQUE** : Moins de "penser à..." ou "méditer sur...", plus de "faire", "bouger", "toucher".
    2. **DIFFICULTÉ ADAPTATIVE** : 
       - Si Streak faible (< 3) : Défi FACILE.
       - Si Streak moyen (3-10) : Défi MODÉRÉ.
       - Si Streak élevé (> 10) : Défi DIFFICILE ou EXPERT.
       - **EXCEPTION PRIORITAIRE** : Si 'isLastInRanking' est VRAI (détecté ci-dessous), la difficulté DOIT être **EXPERT**, même si le streak est à 0.

    3. **TYPES DE DÉFIS** :
       - "solo" | "coop" | "competitive" | "prank"

    4. **DÉFIS SPÉCIAUX (CATCH-UP)** : 
       - ${ctx.targetMember.isLastInRanking ? "ALERTE: Cette personne est DERNIÈRE du classement. Tu DOIS générer un défi de difficulté 'expert' qui rapporte des points (30-50 pts)." : "Pas de points bonus pour cette personne."}
       - **RÈGLE ABSOLUE** : Les points (pointsReward > 0) ne sont attribués **QU'AUX** défis de difficulté **'expert'**. Aucun autre.
    
    CONSIGNES GÉNÉRALES:
    - Langue: Français.
    - Ton: Motivant, Energetique, parfois Drôle.
    - Ne PAS suggérer de recette spécifique (géré ailleurs).
    - **INTERDICTION** de mentionner l'âge, le rôle ("Profil", "Membre") ou des données techniques dans le texte.
    - S'adresser directement à l'utilisateur (**"Tu"**). Ne jamais dire "Profil de X ans".
    
    FORMAT JSON ATTENDU:
    {
        "title": "Nom court et punchy",
        "description": "Action précise et CONCRÈTE à faire.",
        "target": "Bénéfice escompté",
        "category": "hydration" | "activity" | "mental" | "nutrition" | "social",
        "difficulty": "easy" | "medium" | "hard" | "expert",
        "type": "solo" | "coop" | "competitive" | "prank",
        "pointsReward": 0,
        "isSpecial": false
    }
    `;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error Challenge:", errText);
        throw new Error("Gemini API Error Challenge: " + errText);
    }
    const json = await res.json();
    return JSON.parse(json.candidates[0].content.parts[0].text);
}

export interface WeekContext {
    startDate: string; // YYYY-MM-DD
    agendaEvents: AgendaEvent[]; // All events for the week
    existingMenu: any; // Use partial type to avoid circular deps if needed, effectively WeekMenu
    lastWeekMeals: string[];
    commonDislikes: string[];
    individualRestrictions: string[]; // Allergies and specific dislikes
    inventory?: { name: string; quantity: number; unit: string; expiryDate: string | null }[];
    kitchenTools: string[];
    attendees: { uid: string; displayName: string }[];
}

export async function generateWeekPlan(ctx: WeekContext, onProgress?: (partial: any) => void) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    // Helper to sanitize recipes
    const sanitizeRecipes = (recipes: any) => {
        const sanitized: any = {};
        if (!recipes || typeof recipes !== 'object') return {};

        Object.entries(recipes).forEach(([key, recipe]: [string, any]) => {
            if (!recipe || typeof recipe !== 'object') return;
            // Basic validation
            sanitized[key] = {
                ...recipe,
                ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
                instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
                recipeName: recipe.recipeName || "Plat Surprise",
                protein: recipe.protein || "Divers"
            };
        });
        return sanitized;
    };

    console.log("Starting Global Single-Call Generation...");

    // --- SEASONALITY LOGIC (Duplicated for simplicity in this function) ---
    const getSeasonPrompt = (dateStr: string) => {
        const date = new Date(dateStr);
        const month = date.getMonth(); // 0 = Janvier
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const currentMonth = monthNames[month];

        if (month >= 2 && month <= 4) return `SAISON: ${currentMonth} (PRINTEMPS). Privilégie: Asperges, Petits pois, Radis, Fèves, Épinards.`;
        if (month >= 5 && month <= 8) return `SAISON: ${currentMonth} (ÉTÉ). Privilégie: Tomates, Courgettes, Aubergines, Poivrons, Concombre.`;
        if (month >= 9 && month <= 10) return `SAISON: ${currentMonth} (AUTOMNE). Privilégie: Champignons, Courges, Poireaux, Choux.`;
        return `SAISON: ${currentMonth} (HIVER). Privilégie: Choux, Courges, Poireaux, Endives, Racines. ÉVITE: Tomates/Courgettes hors saison.`;
    };

    // 1. Build Global Context
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

    // Events Summary
    const eventSummary = ctx.agendaEvents.map(e =>
        `- ${new Date(e.start).toLocaleDateString('fr-FR', { weekday: 'long' })} ${e.start.split('T')[1].slice(0, 5)}: ${e.title} (${e.type})`
    ).join('\n');

    // Existing Menu Context
    let menuContext = "";
    days.forEach(day => {
        const dayData = ctx.existingMenu[day] || {};
        const getSlotInfo = (type: string, slot: any) => {
            if (slot?.isIgnored) return "SAUTÉ";
            if (slot?.mode === 'leftover') return "RESTES DÉJÀ PRÉVUS (NE RIEN GÉNÉRER)";
            if (slot?.recipe) return `DÉJÀ FAIT: ${slot.recipe.recipeName}`;
            const reqs = [];
            if (slot?.isExpress) reqs.push("EXPRESS");
            if (slot?.isBasic) reqs.push("BASIQUE");
            if (slot?.cookForLeftover) reqs.push("RESTES (DOUBLER QUANTITÉS POUR DEMAIN MIDI)");
            if (slot?.customRequest) reqs.push(`DEMANDE: "${slot.customRequest}"`);
            return reqs.length ? `À GÉNÉRER (${reqs.join(', ')})` : "À GÉNÉRER";
        };
        menuContext += `- ${day}: Midi=[${getSlotInfo("Midi", dayData.Midi)}], Soir=[${getSlotInfo("Soir", dayData.Soir)}]\n`;
    });

    // 2. Prompt Construction
    const nbPersonnes = ctx.attendees?.length || 1;
    const prompt = `Agis comme un Chef Nutritionniste d'élite. Tu dois générer le planning de repas COMPLET pour toute la semaine EN UNE SEULE FOIS.

    NOMBRE DE PERSONNES : ${nbPersonnes}
    DATE DE DÉBUT (PLANNING) : ${ctx.startDate}.
    
    ${getSeasonPrompt(ctx.startDate)}
    
    RÈGLE D'OR : GESTION HYPER-STRICTE DU STOCK VS ACHATS.
    1. INVENTAIRE (FINI) : Ce sont des restes à écouler. Si tu utilises un ingrédient du stock, tu dois le DÉCOMPTER.
       - Exemple : Stock = "8 Escalopes".
       - Recette Lundi : tu décides de faire des escalopes pour tout le monde. Tu en utilises 4. Reste = 4.
       - Recette Jeudi : tu en utilises 4. Reste = 0.
       - Recette Dimanche : TU NE PEUX PLUS UTILISER D'ESCALOPES. C'est INTERDIT car le stock est vide.
    
    2. COURSES (INFINI) : Si un ingrédient N'EST PAS dans le stock, on l'achète.
       - Tu peux proposer du Kyosho, du Tofu ou n'importe quoi d'autre.
       - NE TE LIMITE PAS AU STOCK. 

    INVENTAIRE DISPONIBLE (QUANTITÉS STRICTES À DÉCOMPTER):
    ${ctx.inventory?.map(i => `- ${i.name}: ${i.quantity} ${i.unit}${i.expiryDate ? ` (Péremption: ${i.expiryDate})` : ''}`).join('\n') || "Aucun"}

    AGENDA DE LA SEMAINE:
    ${eventSummary || "Rien de spécial."}

    PLANNING ACTUEL (Ce qu'il faut remplir):
    ${menuContext}

    CONTRAINTES GLOBALES:
    - Midi = Rapide/Lunchbox. Soir = Léger/Familial.
    - Jamais la même protéine principale (Boeuf, Porc, Poulet, Poisson, Oeuf, Végé) sur une période de 3 jours.
    - Jamais le même accompagnement lourd (Pâtes, Riz, Patates) sur une période de 3 jours.
    - PLATS EXACTS SEMAINE DERNIÈRE (INTERDIT): ${ctx.lastWeekMeals.join(', ')}.

    RÈGLE "PLAISIR" & ÉQUILIBRE:
    - En général : Vise l'équilibre et le sain (Légumes de saison, Protéines, pas trop de gras).
    - EXCEPTION (1 à 2 repas MAX dans la semaine) : Tu DOIS proposer 1 ou 2 repas "Plaisir / Comfort Food" (ex: Burger maison, Pizza, Tacos, Lasagnes riches, Tartiflette...).
    - MOMENTS IDÉAUX : Le Vendredi Soir ou le Samedi Soir sont parfaits pour ces repas "Plaisir".

    ZÉRO TOLÉRANCE - SÉCURITÉ ALIMENTAIRE:
    - ALLERGIES & RESTRICTIONS: ${ctx.individualRestrictions.join(', ') || "Aucune"}.
    - INTERDITS COMMUNS: ${ctx.commonDislikes.join(', ') || "Aucun"}.
    - CONSIGNE: Il est STRICTEMENT INTERDIT d'utiliser ces ingrédients. Interprète les interdits de manière LARGE (ex: si 'céleri' est banni, cela inclut le céleri-branche, le céleri-rave, et le sel de céleri). Vérifie aussi les ingrédients "cachés".
    - Matériel: ${ctx.kitchenTools.join(', ')}.
    - IMPORTANT MATÉRIEL: Priorité au AIR FRYER s'il est disponible. Pour le reste, adapte-toi aux outils (Four, Cookeo, etc.).
    - RÈGLE DES RESTES: Quand un slot dit "RESTES (DOUBLER QUANTITÉS POUR DEMAIN MIDI)", tu dois générer un repas dont les portions suffisent pour le repas en cours ET pour le déjeuner du lendemain. Ces restes seront mangés UNIQUEMENT le lendemain midi.
    - MODE EXPRESS: Si un slot demande "EXPRESS", le temps TOTAL (préparation + cuisson) ne doit pas dépasser 15 minutes. Privilégie l'assemblage simple, le cru, ou le wok minute.

    FORMAT DE SORTIE ATTENDU (JSON UNIQUE):
    Une Map où les clés sont "Jour-Moment".

    STRUCTURE D'UNE RECETTE:
    {
        "recipeName": "...",
        "protein": "...", 
        "ingredients": [{"item": "Nom", "q": 1, "u": "unité"}], 
        "prepTime": "...", "cookTime": "...", "cookingMethod": "...", 
        "nutriFocus": "...", "description": "...", 
        "instructions": ["..."],
        "rationale": "SI Utilise stock: 'J'utilise les 4 dernières escalopes'. SINON: 'J'achète du poisson'."
    }

    IMPORTANT SUR LES QUANTITÉS ('q') :
    - Les quantités doivent être LE TOTAL pour les ${nbPersonnes} personnes.
    - BENCHMARKS RAISONNABLES (par pers) : Riz/Pâtes (80g sec), Viande (150g), Légumes (200g).
    - NE METS PAS la quantité pour 1 personne. LE SYSTÈME NE FERA PAS DE MULTIPLICATION.
    - C'est TOI qui calcules le total.
    - Exemple: Si vous êtes 4 et qu'il faut 100g de riz/pers, écris "q: 400". Si "RESTES" est demandé, écris "q: 800".
    - RATIONALE: Si tu génères des restes, écris-le explicitement (ex: "Je double les doses pour ton déjeuner de demain midi").

    RÉPONSE JSON UNIQUEMENT:
    { "Lundi-Midi": { ... }, ... }
    `;

    // 3. Single API Call
    try {
        const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
        });

        if (res.ok) {
            const json = await res.json();
            const rawResults = extractJson(json.candidates[0].content.parts[0].text);
            const sanitizedWeek = sanitizeRecipes(rawResults);

            console.log("Global Generation Success:", Object.keys(sanitizedWeek));

            // Full update at once
            if (onProgress) {
                onProgress(sanitizedWeek);
            }
            return sanitizedWeek;
        } else {
            const errText = await res.text();
            throw new Error(`Gemini Error: ${errText}`);
        }
    } catch (error) {
        console.error("Global Generation Failed", error);
        throw error;
    }
}

export async function sortShoppingList(items: string[]) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey || items.length === 0) return {};

    const prompt = `Agis comme un assistant de courses professionnel et rigoureux.
    Tu vas recevoir une liste d'ingrédients brute provenant de plusieurs recettes.
    TA MISSION : Produire une liste de courses UNIQUE, OPTIMISÉE et SANS DOUBLONS.

    RÈGLES DE TRAITEMENT (ORDRE DE PRIORITÉ) :
    1. UNICITÉ ABSOLUE (CRITIQUE) :
       - Un aliment ne doit apparaître qu'UNE SEULE FOIS dans toute la liste finale.
       - Si tu trouves "Jambon" et "Tranches de jambon", c'est le MÊME article. Fusionne-les.
       - Si tu trouves "Ail" et "Gousses d'ail", c'est le MÊME article. Fusionne-les.
       - INTERDICTION : Ne jamais mettre le même aliment (même sous un nom proche) dans deux catégories différentes.

    2. FUSION ET SOMMATION :
       - Additionne les quantités de manière mathématique (ex: 150g + 500g = 650g).
       - Convertis les unités pour la lisibilité (ex: 1200g => 1.2 kg).
       - Si les unités sont incompatibles (ex: 2 unités + 100g), écris "Nom : 2 unités et 100g".

    3. NETTOYAGE :
       - Supprime les instructions de cuisine du NOM (ex: "émincé", "haché", "frais", "bio", "en dés"). Garde le nom brut de l'aliment.

    4. CLASSIFICATION STRICTE (Utilise UNIQUEMENT ces noms exactement) :
       - "Fruits & Légumes"
       - "Boucherie & Poisson" (Inclus : Charcuterie, Jambon, Viande, Poisson)
       - "Frais & Crèmerie" (Inclus : Fromage, Lait, Beurre, Yaourt, Œufs)
       - "Épicerie Salée" (Inclus : Pâtes, Riz, Conserves, Épices, Huile)
       - "Épicerie Sucrée" (Inclus : Farine, Sucre, Chocolat, Biscuits)
       - "Boissons"
       - "Surgelés"
       - "Hygiène & Maison"
       - "Divers"

    LISTE BRUTE À TRAITER :
    ${items.join('\n')}
    
    IMPORTANT :
    - Retourne un objet JSON dont les clés sont les noms des catégories citées ci-dessus.
    - Les valeurs sont des tableaux de chaînes "Nom : Quantité Unité" (ex: "Jambon : 4 tranches").
    - SI UN ALIMENT PEUT ALLER DANS DEUX RAYONS, CHOISIS LE PLUS LOGIQUE ET N'EN UTILISE QU'UN SEUL.
    - Ne crée pas de nouvelles catégories.

    FORMAT JSON :
    {
        "Fruits & Légumes": ["Pommes : 2 kg", ...],
        "Boucherie & Poisson": ["Jambon : 6 tranches", ...],
        ...
    }
    `;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error Sort Details:", errText);
        throw new Error("Gemini API Error Sort: " + errText);
    }
    const json = await res.json();
    return extractJson(json.candidates[0].content.parts[0].text);
}

export async function suggestChorePoints(title: string) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const prompt = `Estime le nombre de points pour cette tâche ménagère (1 à 50) basé sur l'effort, le temps et la pénibilité.
    TÂCHE: "${title}"
    
    RÈGLES D'ESTIMATION:
    - Facile/Rapide (ex: Ranger 1 truc): 5-10 pts
    - Standard (ex: Vaisselle, Poubelles): 15-20 pts
    - Long/Pénible (ex: Passer l'aspirateur partout, Nettoyer le frigo): 30-40 pts
    - Très dur/Saisonnier (ex: Nettoyer toutes les vitres, Tondre la pelouse): 50 pts
    
    FORMAT JSON:
    { "points": number }
    `;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error Points Details:", errText);
        throw new Error("Gemini API Error Points: " + errText);
    }
    const json = await res.json();
    return extractJson(json.candidates[0].content.parts[0].text) as { points: number };
}

export async function generateCustomWidgetContent(userPrompt: string) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const prompt = `Tu es un assistant domestique intelligent et inspirant. 
    Basé sur la demande suivante, génère un contenu court, utile et motivant pour l'écran d'accueil d'une application de gestion de foyer.
    
    DEMANDE DE L'UTILISATEUR: "${userPrompt}"
    
    RÈGLES:
    - Réponds en français.
    - Sois concis (max 3-4 lignes).
    - Ajoute un emoji pertinent au début.
    - Évite le blabla inutile ("Voici votre conseil..."). Va droit au but.
    - Si la demande est trop vague, propose un conseil général lié à la maison ou à l'organisation.
    
    FORMAT JSON:
    { "content": "Le texte généré ici..." }
    `;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error Custom Widget Details:", errText);
        throw new Error("Gemini API Error Custom Widget: " + errText);
    }
    const json = await res.json();
    const data = extractJson(json.candidates[0].content.parts[0].text);
    return data.content as string;
}

export async function askAIAssistant(question: string, householdData: any) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const prompt = `Tu es un assistant personnel pour un foyer. Ton but est d'aider les membres du foyer (réponse en Français).
Données du foyer: ${JSON.stringify(householdData)}
Question de l'utilisateur: "${question}"

Ta réponse doit être au format JSON avec deux champs:
1. "short": Une réponse très brève, courte et percutante (max 100 caractères).
2. "long": Une réponse détaillée, complète et utile.

Sois amical, efficace et tiens compte des données du foyer si elles sont pertinentes.`;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error Assistant Details:", errText);
        throw new Error("Gemini API Error Assistant: " + errText);
    }
    const json = await res.json();
    const cleanJson = json.candidates[0].content.parts[0].text;
    return extractJson(cleanJson) as { short: string; long: string };
}

export async function fetchProductPrice(productRef: string) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const prompt = `Trouve le prix actuel le plus bas pour ce produit : "${productRef}".
    Recherche sur internet (Google Shopping, Amazon, Fnac, Darty, etc.) pour trouver le prix actuel en France / Europe.
    
    Retourne uniquement un JSON avec :
    - "name": le nom complet et précis du produit trouvé.
    - "price": le prix en nombre (ex: 450.99).
    - "currency": "EUR".
    - "merchant": le nom du vendeur (ex: "Amazon").
    - "url": le lien direct vers l'offre si possible.
    
    IMPORTANT: Si tu ne trouves pas d'info, renvoie { "error": "not found" }.`;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{
                google_search: {}
            }],
            generationConfig: {
                // responseMimeType is incompatible with tools
            }
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini Price Error Response:", errText);
        throw new Error("Gemini API Error Price Search");
    }

    const json = await res.json();
    const result = extractJson(json.candidates[0].content.parts[0].text);
    if (result.error) throw new Error(result.error);
    return result as { name: string; price: number; currency: string; merchant: string; url: string };
}
export async function generateDailyJoke(householdData: any) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const prompt = `Tu es un assistant de maison plein d'humour. Génère UNE SEULE petite phrase marrante, piquante ou une blague courte (max 2 lignes) liée à la vie domestique, aux corvées, ou au fait de vivre ensemble.
    Membres du foyer: ${householdData?.memberProfiles?.map((p: any) => p.displayName).join(", ") || "la famille"}.
    
    RÈGLES:
    - Réponds en français.
    - Sois court et percutant.
    - Humour bienveillant.
    - Évite les blagues "carambar" trop classiques, essaie d'être un peu cynique ou drôle sur le ménage/budget/repas.
    
    FORMAT JSON:
    { "joke": "Ta phrase ici..." }
    `;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    if (!res.ok) {
        throw new Error("Gemini API Error Joke");
    }
    const json = await res.json();
    const data = extractJson(json.candidates[0].content.parts[0].text);
    return data.joke as string;
}
export async function generateHeroAIContent(weatherData: any, householdData: any) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "le matin" : hour < 14 ? "le midi" : hour < 18 ? "l'après-midi" : "le soir";

    const prompt = `Tu es une IA de maison drôle et serviable. Basé sur les données suivantes, génère deux éléments :
    1. Un résumé très court et "stylé" de la météo d'aujourd'hui (max 15 mots).
    2. Une petite phrase drôle, piquante ou chaleureuse sur le foyer (max 15 mots) basée sur les membres ou l'ambiance, en tenant compte du moment de la journée (${timeOfDay}).

    DONNÉES MÉTÉO : ${JSON.stringify(weatherData)}
    DONNÉES FOYER : membres: ${householdData?.memberProfiles?.map((p: any) => p.displayName).join(", ")}, ambiance actuelle: ${householdData?.energyLevel || 'normale'}
    MOMENT DE LA JOURNÉE : ${timeOfDay} (${hour}h)

    FORMAT JSON :
    {
        "weatherSummary": "Phrase courte sur la météo...",
        "funnyRemark": "Phrase drôle sur la famille..."
    }
    `;

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error Hero Details:", errText);
        throw new Error("Gemini API Error Hero: " + errText);
    }
    const json = await res.json();
    return extractJson(json.candidates[0].content.parts[0].text) as { weatherSummary: string; funnyRemark: string };
}
