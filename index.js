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
                try { resolve({ status: res.statusCode, data: JSON.parse(chunk) }); }
                catch { reject(new Error('Status ' + res.statusCode + ': ' + chunk)); }
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
            return res.status(400).json({ reply: 'Hmm, sepertinya pesanmu kosong.' });
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            return res.json({ reply: 'API key belum diatur.' });
        }
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        const result = await httpsPost(url, {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: message }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 300, topP: 0.9 }
        });
        if (result.status !== 200) {
            console.error('Gemini error:', JSON.stringify(result));
            return res.json({ reply: 'Gemini error: ' + JSON.stringify(result.data).slice(0, 200) });
        }
        const reply = result.data.candidates && result.data.candidates[0] && result.data.candidates[0].content && result.data.candidates[0].content.parts && result.data.candidates[0].content.parts[0].text;
        if (!reply) {
            console.error('Empty reply:', JSON.stringify(result.data));
            return res.json({ reply: 'Gemini tidak mengembalikan jawaban.' });
        }
        res.json({ reply: reply.trim() });
    } catch (err) {
        console.error('ERROR:', err.message);
        res.json({ reply: 'Error: ' + err.message });
    }
});

// TEST ENDPOINT — buat debug
app.get('/test', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            return res.json({ error: 'API KEY tidak valid', key_preview: apiKey ? apiKey.slice(0, 8) + '...' : 'KOSONG' });
        }
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        const result = await httpsPost(url, {
            contents: [{ parts: [{ text: 'Halo' }] }],
            generationConfig: { maxOutputTokens: 50 }
        });
        res.json({ api_key_ok: true, gemini_status: result.status, gemini_response: result.data });
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Veloura Backend' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Veloura backend berjalan di port ' + PORT));
