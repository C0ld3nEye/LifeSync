const fs = require('fs');
const path = require('path');
const https = require('https');

// Try to load token from .env.local
let token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;

if (!token) {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=(.+)/);
            if (match) token = match[1].trim();
        }
    } catch (e) {
        // ignore
    }
}

if (!token) {
    console.error("❌ Erreur : Aucun token trouvé.");
    console.error("Assurez-vous d'avoir créé le fichier .env.local avec la ligne :");
    console.error("NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=votre_token");
    process.exit(1);
}

console.log("🤖 Bot Telegram de démarrage lancé !");
console.log("-----------------------------------");
console.log("Envoyez /start à votre bot sur Telegram.");
console.log("Il vous répondra avec votre Chat ID.");
console.log("Appuyez sur Ctrl+C pour arrêter ce script quand vous avez fini.");

let offset = 0;

function poll() {
    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset + 1}&timeout=30`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.ok) {
                    const updates = response.result;
                    if (updates.length > 0) {
                        updates.forEach(processUpdate);
                        offset = updates[updates.length - 1].update_id;
                    }
                } else {
                    // console.error("Erreur API Telegram:", response.description);
                }
            } catch (e) {
                console.error("Erreur parsing:", e);
            }
            // Repoll immediately
            poll();
        });
    }).on('error', (e) => {
        console.error("Erreur réseau:", e.message);
        setTimeout(poll, 5000);
    });
}

function processUpdate(update) {
    if (!update.message) return;

    const chatId = update.message.chat.id;
    const user = update.message.from.first_name;
    const text = update.message.text;

    console.log(`📩 Message reçu de ${user} (${chatId}): ${text}`);

    if (text === '/start') {
        const reply = `👋 Salut ${user} !\n\nVoici ton Chat ID pour LifeSync :\n\`${chatId}\`\n\n(Copie ce numéro et colle-le dans les paramètres de l'appli)`;
        sendMessage(chatId, reply);
    } else {
        sendMessage(chatId, `Ton ID est : \`${chatId}\``);
    }
}

function sendMessage(chatId, text) {
    const data = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        // ignore response
    });

    req.on('error', (e) => {
        console.error("Erreur d'envoi:", e);
    });

    req.write(data);
    req.end();
}

poll();
