require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const app = express();

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `Kamu adalah Veloura, teman virtual yang hangat, lembut, elegan, dan penuh empati.
Gaya bicaramu seperti sahabat perempuan yang selalu ada.
Tidak menghakimi, tidak kaku, tidak terlalu panjang.
Fokus pada perasaan user dan membuat mereka merasa didengar.
Gunakan bahasa Indonesia yang natural dan santai.
Jika user menyebutkan hal yang berbahaya, dengan lembut sarankan untuk mencari bantuan profesional.`;

function httpsPost(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const data = JSON.stringify(body);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let chunk = '';
            res.on('data', c => chunk += c);
            res.on('end', () => {
                try { resolve(JSON.parse(chunk)); }
                catch { reject(new Error('Invalid JSON: ' + chunk)); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ reply: 'Hmm, sepertinya pesanmu kosong. Coba tulis sesuatu ya.' });
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            console.error('API KEY tidak valid:', apiKey);
            return res.json({ reply: 'Veloura sedang tidak bisa merespon saat ini. Coba lagi nanti ya.' });
        }
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        const result = await httpsPost(url, {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: message }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 300, topP: 0.9 }
        });
        const reply = result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text;
        if (!reply) {
            console.error('Gemini error:', JSON.stringify(result));
            return res.json({ reply: 'Veloura sedang tidak bisa merespon...' });
        }
        res.json({ reply: reply.trim() });
    } catch (err) {
        console.error('ERROR:', err.message);
        res.json({ reply: 'Veloura sedang tidak bisa merespon...' });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Veloura Backend' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Veloura backend berjalan di port ' + PORT));
