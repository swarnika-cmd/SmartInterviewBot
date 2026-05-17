require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const PINECONE_API_VERSION = '2025-10';
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'smartinterviewbot-embeddings';
const PINECONE_EMBED_MODEL = process.env.PINECONE_EMBED_MODEL || 'llama-text-embed-v2';
const PINECONE_DIMENSION = Number(process.env.PINECONE_DIMENSION || 384);
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

let pineconeIndexHost = null;
let pineconeReadyPromise = null;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(path.join(__dirname, '.')));

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured. Please add it to your .env file.`);
    }
    return value;
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const bodyText = await response.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    if (!response.ok) {
        const message = body.message || body.error || bodyText || `${response.status} ${response.statusText}`;
        throw new Error(message);
    }

    return body;
}

function pineconeHeaders(extra = {}) {
    return {
        'Api-Key': requiredEnv('PINECONE_API_KEY'),
        'Content-Type': 'application/json',
        'X-Pinecone-Api-Version': PINECONE_API_VERSION,
        ...extra
    };
}

async function ensurePineconeIndex() {
    if (pineconeIndexHost) {
        return pineconeIndexHost;
    }

    const indexes = await requestJson('https://api.pinecone.io/indexes', {
        headers: pineconeHeaders()
    });

    const indexExists = indexes.indexes?.some(index => index.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
        console.log(`Creating Pinecone index: ${PINECONE_INDEX_NAME}`);
        await requestJson('https://api.pinecone.io/indexes', {
            method: 'POST',
            headers: pineconeHeaders(),
            body: JSON.stringify({
                name: PINECONE_INDEX_NAME,
                dimension: PINECONE_DIMENSION,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            })
        });
    }

    for (let attempt = 0; attempt < 20; attempt++) {
        const index = await requestJson(`https://api.pinecone.io/indexes/${PINECONE_INDEX_NAME}`, {
            headers: pineconeHeaders()
        });

        if (index.dimension !== PINECONE_DIMENSION) {
            throw new Error(
                `Pinecone index "${PINECONE_INDEX_NAME}" has dimension ${index.dimension}, ` +
                `but this app is configured for ${PINECONE_DIMENSION}.`
            );
        }

        if (index.status?.ready) {
            pineconeIndexHost = index.host;
            console.log(`✅ Pinecone ready - Index: ${PINECONE_INDEX_NAME}`);
            return pineconeIndexHost;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    throw new Error(`Pinecone index "${PINECONE_INDEX_NAME}" did not become ready in time.`);
}

function initPinecone() {
    if (!pineconeReadyPromise) {
        pineconeReadyPromise = ensurePineconeIndex();
    }
    return pineconeReadyPromise;
}

function normalizeText(text) {
    return text.replace(/\r\n/g, '\n').trim();
}

function hashText(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

function chunkResume(resumeText) {
    const normalized = normalizeText(resumeText);
    const sections = normalized.split(/\n(?=[A-Z][A-Z\s/&-]{2,}\n)/);

    return sections
        .map(section => section.trim())
        .filter(section => section.length > 30)
        .map((text, index) => ({
            id: index,
            text,
            length: text.length
        }));
}

async function embedTexts(texts, inputType) {
    const response = await requestJson('https://api.pinecone.io/embed', {
        method: 'POST',
        headers: pineconeHeaders(),
        body: JSON.stringify({
            model: PINECONE_EMBED_MODEL,
            parameters: {
                input_type: inputType,
                truncate: 'END',
                dimension: PINECONE_DIMENSION
            },
            inputs: texts.map(text => ({ text }))
        })
    });

    return response.data.map(item => item.values);
}

async function deleteNamespace(namespace) {
    const host = await initPinecone();
    await requestJson(`https://${host}/vectors/delete`, {
        method: 'POST',
        headers: pineconeHeaders(),
        body: JSON.stringify({
            deleteAll: true,
            namespace
        })
    });
}

async function fetchVector(namespace, id) {
    const host = await initPinecone();
    return requestJson(`https://${host}/vectors/fetch?namespace=${encodeURIComponent(namespace)}&ids=${encodeURIComponent(id)}`, {
        headers: pineconeHeaders()
    });
}

async function upsertVectors(namespace, vectors) {
    const host = await initPinecone();
    return requestJson(`https://${host}/vectors/upsert`, {
        method: 'POST',
        headers: pineconeHeaders(),
        body: JSON.stringify({
            namespace,
            vectors
        })
    });
}

async function queryVectors(namespace, vector, topK) {
    const host = await initPinecone();
    return requestJson(`https://${host}/query`, {
        method: 'POST',
        headers: pineconeHeaders(),
        body: JSON.stringify({
            namespace,
            vector,
            topK,
            includeMetadata: true
        })
    });
}

async function ensureResumeIndexed(resume, sessionId) {
    const normalizedResume = normalizeText(resume);
    const resumeHash = hashText(normalizedResume);
    const namespace = sessionId;
    const chunks = chunkResume(normalizedResume);

    if (chunks.length === 0) {
        throw new Error('Could not extract meaningful resume sections. Please provide a fuller resume.');
    }

    const manifestId = '__resume_manifest__';
    const manifest = await fetchVector(namespace, manifestId);
    const existingManifest = manifest.vectors?.[manifestId];

    if (existingManifest?.metadata?.resumeHash === resumeHash) {
        console.log(`♻️ Reusing ${existingManifest.metadata.chunkCount} stored chunks from Pinecone`);
        return { namespace, resumeHash, chunkCount: existingManifest.metadata.chunkCount, reused: true };
    }

    if (existingManifest) {
        console.log('🧹 Resume changed; clearing stale Pinecone vectors for this session');
        await deleteNamespace(namespace);
    }

    const embeddings = await embedTexts(chunks.map(chunk => chunk.text), 'passage');
    const vectors = chunks.map((chunk, index) => ({
        id: `chunk_${resumeHash}_${index}`,
        values: embeddings[index],
        metadata: {
            text: chunk.text,
            chunkIndex: index,
            chunkLength: chunk.length,
            resumeHash
        }
    }));

    vectors.push({
        id: manifestId,
        values: new Array(PINECONE_DIMENSION).fill(0),
        metadata: {
            resumeHash,
            chunkCount: chunks.length,
            updatedAt: new Date().toISOString()
        }
    });

    await upsertVectors(namespace, vectors);
    console.log(`✅ Indexed ${chunks.length} resume chunks in Pinecone`);

    return { namespace, resumeHash, chunkCount: chunks.length, reused: false };
}

async function retrieveTopChunks(jobRole, namespace, topK = 3) {
    const [queryEmbedding] = await embedTexts([jobRole], 'query');
    const result = await queryVectors(namespace, queryEmbedding, topK + 1);
    const matches = result.matches || [];

    console.log(`Retrieved chunks with scores: ${matches.map(match => match.score?.toFixed(3)).join(', ')}`);

    return matches
        .filter(match => match.metadata?.text)
        .slice(0, topK)
        .map(match => match.metadata.text);
}

async function generateQuestionsWithGroq(jobRole, topChunks, systemPrompt) {
    const context = topChunks.join('\n\n---\n\n');
    const ragPrompt = `${systemPrompt}

RELEVANT RESUME SECTIONS:
${context}

Target Role: ${jobRole}

Generate interview questions based ONLY on the resume sections above. Do not invent skills or experiences not present in the provided context.`;

    const response = await requestJson('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${requiredEnv('GROQ_API_KEY')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: ragPrompt }],
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    return response.choices?.[0]?.message?.content;
}

app.post('/api/generate', async (req, res) => {
    try {
        const { role, resume, systemPrompt } = req.body;
        const sessionId = req.body.sessionId || `session_${Date.now()}`;

        if (!role || !resume || !systemPrompt) {
            throw new Error('role, resume, and systemPrompt are required.');
        }

        requiredEnv('GROQ_API_KEY');
        requiredEnv('PINECONE_API_KEY');

        console.log('\n🚀 Starting Pinecone-backed RAG pipeline...');

        await initPinecone();
        const indexState = await ensureResumeIndexed(resume, sessionId);
        console.log(`${indexState.reused ? '♻️ Reused' : '📦 Indexed'} resume chunks: ${indexState.chunkCount}`);

        const topChunks = await retrieveTopChunks(role, indexState.namespace, 3);
        if (topChunks.length === 0) {
            throw new Error('No relevant resume chunks were retrieved from Pinecone.');
        }

        const text = await generateQuestionsWithGroq(role, topChunks, systemPrompt);
        if (!text) {
            throw new Error('Groq returned an empty response.');
        }

        res.json({
            text,
            sessionId,
            retrieval: {
                reusedIndex: indexState.reused,
                chunkCount: indexState.chunkCount
            }
        });
    } catch (error) {
        console.error('❌ Generation Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, async () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 SmartInterviewBot Server Running');
    console.log(`📍 http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('\n📦 Configured Services:');
    console.log(`  Groq API:     ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Not set'}`);
    console.log(`  Pinecone:     ${process.env.PINECONE_API_KEY ? '✅ Configured' : '❌ Not set'}`);
    console.log(`  Embeddings:   ${PINECONE_EMBED_MODEL} (${PINECONE_DIMENSION}d)`);
    console.log(`  Groq model:   ${GROQ_MODEL}`);
    console.log('='.repeat(50) + '\n');

    try {
        if (process.env.PINECONE_API_KEY) {
            await initPinecone();
        }
    } catch (error) {
        console.error(`❌ Pinecone startup check failed: ${error.message}`);
    }
});
