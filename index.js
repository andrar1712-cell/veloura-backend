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

function httpsPost(url, body, auth) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const data = JSON.stringify(body);
        const options = {
            hostname: u.hostname,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + auth
            }
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
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            return res.json({ reply: 'API key belum diatur.' });
        }
        const result = await httpsPost(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: message }
                ],
                temperature: 0.8,
                max_tokens: 300
            },
            apiKey
        );
        if (result.status !== 200) {
            console.error('Groq error:', JSON.stringify(result));
            return res.json({ reply: 'Groq error: ' + JSON.stringify(result.data).slice(0, 200) });
        }
        const reply = result.data.choices && result.data.choices[0] && result.data.choices[0].message && result.data.choices[0].message.content;
        if (!reply) {
            return res.json({ reply: 'Groq tidak mengembalikan jawaban.' });
        }
        res.json({ reply: reply.trim() });
    } catch (err) {
        console.error('ERROR:', err.message);
        res.json({ reply: 'Error: ' + err.message });
    }
});

app.get('/test', async (req, res) => {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            return res.json({ error: 'API KEY tidak valid', preview: apiKey ? apiKey.slice(0, 8) + '...' : 'KOSONG' });
        }
        const result = await httpsPost(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Halo' }],
                max_tokens: 20
            },
            apiKey
        );
        res.json({ api_key_ok: true, status: result.status, response: result.data });
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Veloura Backend (Groq)' });
});

const PORT = process.env.PORT || 3000;
// Hapus atau comment kode app.listen(...) jika ada, lalu ganti/tambahkan baris berikut:
module.exports = app;
