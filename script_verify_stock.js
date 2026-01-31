
const fs = require('fs');
const path = require('path');

// Mock fetch to simulate Gemini API response if we wanted to avoid real calls, 
// BUT here we want to test the REAL logic with the real prompt to see if Gemini respects it.
// However, running TS files directly is hard without setup. 
// I will replicate the prompt logic here to test the PROMPT ITSELF against Gemini if I can, 
// or I will just write a script the user can run.

// ACTUALLY, the user wants ME to try it. I should run it.
// I will load the environment variables from .env.local manually.

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("No API Key found in .env.local");
    process.exit(1);
}

const GEMINI_MODEL = "gemini-2.5-flash";

async function runTest() {
    console.log("Testing Meal Generation with Strict Stock...");

    // MOCK ATTENDEES (4 people)
    const nbPersonnes = 4;

    // MOCK CONTEXT
    const inventory = [{ name: "Escalope de Dinde", quantity: 8, unit: "tranches", expiryDate: "2024-01-15" }];
    const inventoryText = inventory.map(i => `- ${i.name}: ${i.quantity} ${i.unit}`).join('\n');

    const prompt = `Agis comme un Chef Nutritionniste d'élite. Tu dois générer le planning de repas COMPLET pour toute la semaine EN UNE SEULE FOIS.

    NOMBRE DE PERSONNES : ${nbPersonnes}
    
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
    ${inventoryText}

    AGENDA DE LA SEMAINE:
    Rien de spécial.

    PLANNING ACTUEL (Ce qu'il faut remplir):
    - Lundi: Midi=[À GÉNÉRER], Soir=[À GÉNÉRER]
    - Mardi: Midi=[À GÉNÉRER], Soir=[À GÉNÉRER]
    - Mercredi: Midi=[À GÉNÉRER], Soir=[À GÉNÉRER]
    - Jeudi: Midi=[À GÉNÉRER], Soir=[À GÉNÉRER]
    - Vendredi: Midi=[À GÉNÉRER], Soir=[À GÉNÉRER]
    - Samedi: Midi=[À GÉNÉRER], Soir=[À GÉNÉRER]
    - Dimanche: Midi=[À GÉNÉRER], Soir=[À GÉNÉRER]

    CONTRAINTES GLOBALES:
    - Midi = Rapide/Lunchbox. Soir = Léger/Familial.
    - Jamais 2 fois la même protéine principale.
    - Jamais 2 fois le même accompagnement lourd.
    - Allergies: Aucune.
    - Interdits Communs: Scorsonères.
    - Matériel: Four, Plaques.

    FORMAT DE SORTIE ATTENDU (JSON UNIQUE):
    Une Map où les clés sont "Jour-Moment".

    STRUCTURE D'UNE RECETTE:
    {
        "recipeName": "...",
        "protein": "...", 
        "ingredients": [{"item": "Nom", "q": 1, "u": "unité"}],
        "rationale": "SI Utilise stock: 'J'utilise les 4 dernières escalopes'. SINON: 'J'achète du poisson'."
    }

    IMPORTANT SUR LES QUANTITÉS ('q') :
    - Les quantités doivent être LE TOTAL pour les ${nbPersonnes} personnes.
    - NE METS PAS la quantité pour 1 personne. LE SYSTÈME NE FERA PAS DE MULTIPLICATION.
    - C'est TOI qui calcules le total.
    - Exemple: Si vous êtes 4 et qu'il faut 150g de riz/pers, écris "q: 600".

    RÉPONSE JSON UNIQUEMENT:
    { "Lundi-Midi": { ... }, ... }
    `;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
        });

        if (!res.ok) {
            console.error("API Error", await res.text());
            return;
        }

        const json = await res.json();
        const content = JSON.parse(json.candidates[0].content.parts[0].text);

        console.log("\n--- RESULTATS GÉNÉRÉS ---");
        let escalopesUtilisees = 0;

        Object.keys(content).sort().forEach(key => {
            const r = content[key];
            console.log(`\n[${key}] ${r.recipeName} (${r.protein})`);
            console.log(`Rationale: ${r.rationale}`);
            r.ingredients.forEach(i => {
                if (i.item.toLowerCase().includes('escalope')) {
                    console.log(`>>> UTILISE STOCK: ${i.q} ${i.u} ${i.item}`);
                    escalopesUtilisees += i.q;
                }
            });
        });

        console.log(`\nTOTAL ESCALOPES UTILISÉES: ${escalopesUtilisees} / 8`);
        if (escalopesUtilisees > 8) {
            console.error("❌ ECHEC: Le stock a été dépassé !");
        } else {
            console.log("✅ SUCCÈS: Le stock est respecté.");
        }

    } catch (e) {
        console.error("Script Error", e);
    }
}

runTest();
