// =============================================
// Veloura Backend — index.js
// Deploy ke Railway / Render
// =============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// System prompt Veloura
const SYSTEM_PROMPT = `Kamu adalah Veloura, teman virtual yang hangat, lembut, elegan, dan penuh empati.
Gaya bicaramu seperti sahabat perempuan yang selalu ada.
Tidak menghakimi, tidak kaku, tidak terlalu panjang.
Fokus pada perasaan user dan membuat mereka merasa didengar.
Gunakan bahasa Indonesia yang natural dan santai.
Jika user menyebutkan hal yang berbahaya (melukai diri, dll), dengan lembut sarankan untuk mencari bantuan profesional.`;

// Endpoint chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ reply: 'Hmm, sepertinya pesanmu kosong. Coba tulis sesuatu ya.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY tidak ditemukan di .env');
            return res.json({ reply: 'Veloura sedang tidak bisa merespon saat ini. Coba lagi nanti ya.' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [{
                    parts: [{ text: message }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 300,
                    topP: 0.9,
                }
            })
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status, await response.text());
            return res.json({ reply: 'Veloura sedang tidak bisa merespon...' });
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            console.error('Gemini tidak mengembalikan jawaban:', JSON.stringify(data));
            return res.json({ reply: 'Veloura sedang tidak bisa merespon...' });
        }

        res.json({ reply: reply.trim() });

    } catch (err) {
        console.error('Server error:', err);
        res.json({ reply: 'Veloura sedang tidak bisa merespon...' });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Veloura Backend' });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Veloura backend berjalan di port ${PORT}`);
});