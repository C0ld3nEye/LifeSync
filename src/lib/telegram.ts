
// Telegram Bot Token provided by user
const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "VOTRE_TOKEN_ICI";

export async function sendTelegramMessage(chatId: string, text: string) {
    if (!chatId) return;

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram Error:', data);
            throw new Error(data.description || 'Unknown Telegram Error');
        }
        return true;
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
        return false;
    }
}
