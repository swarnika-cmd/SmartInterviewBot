require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// ==========================================
// PROVIDER HANDLERS
// ==========================================

async function callOpenAI(apiKey, systemPrompt, userMessage) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ]
        })
    });

    const data = await response.json();
    if (!response.ok) throw data;

    return data.choices[0].message.content;
}

async function callGemini(apiKey, systemPrompt, userMessage) {
    // Try Flash model first as it's most likely to be available/free
    const MODEL = 'gemini-1.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: userMessage }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
        })
    });

    const data = await response.json();
    if (!response.ok) throw data;

    return data.candidates[0].content.parts[0].text;
}


// ==========================================
// API ENDPOINT
// ==========================================

app.post('/api/generate', async (req, res) => {
    try {
        const { role, resume, systemPrompt } = req.body;
        const userMessage = `Target Role: ${role}\n\nCandidate's Resume:\n---\n${resume}\n---\n\nGenerate interview questions based on this.`;

        // CHECK FOR KEYS
        if (process.env.OPENAI_API_KEY) {
            console.log('Using Provider: OpenAI');
            const text = await callOpenAI(process.env.OPENAI_API_KEY, systemPrompt, userMessage);
            return res.json({ text });
        }

        if (process.env.GEMINI_API_KEY) {
            console.log('Using Provider: Gemini');
            const text = await callGemini(process.env.GEMINI_API_KEY, systemPrompt, userMessage);
            return res.json({ text });
        }

        throw new Error('No API Keys configured. Please add OPENAI_API_KEY or GEMINI_API_KEY to .env file.');

    } catch (error) {
        console.error('Generation Error:', JSON.stringify(error, null, 2));
        const errorMessage = error.error?.message || error.message || JSON.stringify(error);
        res.status(500).json({ error: errorMessage });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('--- Configured Providers ---');
    console.log('OpenAI:', process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not set');
    console.log('Gemini:', process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not set');
});
