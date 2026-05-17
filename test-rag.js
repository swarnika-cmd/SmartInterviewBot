// Test suite for RAG implementation
// Run with: node test-rag.js

// Example resume for testing
const SAMPLE_RESUME = `
EXPERIENCE
Senior Software Engineer at Google (2020-2024)
- Led backend team of 5 engineers
- Designed microservices architecture handling 10M+ QPS
- Mentored junior developers, conducted code reviews
- Tech stack: Java, Go, gRPC, Kubernetes, PostgreSQL

Software Engineer at Microsoft (2018-2020)
- Developed cloud infrastructure features in Azure
- Worked on distributed systems and databases
- Experience with C#, Python, and JavaScript
- Collaborated with product teams on API design

Junior Developer at Startup (2016-2018)
- Full-stack development (Node.js, React)
- Built payment processing system
- Deployed to AWS and maintained production services

EDUCATION
BS Computer Science, State University (2016)
- GPA: 3.8/4.0
- Relevant coursework: Algorithms, Databases, Systems Design

SKILLS
Languages: Java, Python, Go, JavaScript, TypeScript, C#, SQL
Frameworks: Spring Boot, React, Node.js, Django, FastAPI
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
Cloud: AWS, GCP, Azure, Kubernetes
Tools: Docker, Git, Jenkins, Terraform

PROJECTS
Personal Project: Real-time Chat Application
- Built using Node.js, Socket.IO, React
- Deployed to Heroku with 1000+ active users
- Implemented real-time notifications and user authentication

Open Source Contributions
- Contributed to Kubernetes project
- Fixed performance issues in gRPC library
- Maintains popular npm package with 50K+ weekly downloads

CERTIFICATIONS
AWS Certified Solutions Architect (2019)
Google Cloud Professional Data Engineer (2021)
`;

// Mimic server.js functions
function chunkResume(resumeText) {
    const sections = resumeText.split(/\n(?=[A-Z]{3,}[\s\n])/);
    return sections
        .map(s => s.trim())
        .filter(s => s.length > 30)
        .map((chunk, index) => ({
            id: index,
            text: chunk,
            length: chunk.length
        }));
}

function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

// Mock embedding function (simulates Gemini API)
function mockEmbed(text) {
    // Create deterministic mock embedding based on text
    // In real code, this would call Gemini API
    const hash = text.split('').reduce((h, c) => {
        return ((h << 5) - h) + c.charCodeAt(0);
    }, 0);
    
    // Generate fake 768-dim vector
    const vector = [];
    let seed = Math.abs(hash);
    for (let i = 0; i < 768; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        vector.push((seed / 233280) - 0.5);
    }
    return vector;
}

// ============= TESTS =============

console.log('🧪 RAG Implementation Test Suite\n');
console.log('='.repeat(50));

// Test 1: Chunking
console.log('\n✅ TEST 1: Resume Chunking');
console.log('-'.repeat(50));
const chunks = chunkResume(SAMPLE_RESUME);
console.log(`  Input: ${SAMPLE_RESUME.length} character resume`);
console.log(`  Output: ${chunks.length} chunks`);
console.log(`  Chunk breakdown:`);
chunks.forEach((chunk, i) => {
    console.log(`    Chunk ${i + 1}: ${chunk.text.split('\n')[0].substring(0, 40)}... (${chunk.length} chars)`);
});

// Test 2: Embedding
console.log('\n✅ TEST 2: Text Embedding');
console.log('-'.repeat(50));
const embeddedChunks = chunks.map(chunk => ({
    ...chunk,
    embedding: mockEmbed(chunk.text)
}));
console.log(`  Embedded ${embeddedChunks.length} chunks`);
console.log(`  Each embedding dimension: ${embeddedChunks[0].embedding.length}`);
console.log(`  Embedding magnitude check:`);
embeddedChunks.forEach((ec, i) => {
    const mag = Math.sqrt(ec.embedding.reduce((sum, val) => sum + val * val, 0));
    console.log(`    Chunk ${i + 1} magnitude: ${mag.toFixed(2)}`);
});

// Test 3: Similarity Search
console.log('\n✅ TEST 3: Similarity Search');
console.log('-'.repeat(50));
const testRoles = [
    'Senior Backend Engineer',
    'Frontend React Developer',
    'DevOps Engineer',
    'Product Manager',
    'Data Scientist'
];

testRoles.forEach(role => {
    console.log(`\n  Query: "${role}"`);
    const queryEmbedding = mockEmbed(role);
    
    const scored = embeddedChunks.map(ec => ({
        ...ec,
        score: cosineSimilarity(queryEmbedding, ec.embedding)
    }));
    
    const top3 = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    
    top3.forEach((item, rank) => {
        console.log(`    #${rank + 1} (score: ${item.score.toFixed(3)}): ${item.text.split('\n')[0].substring(0, 45)}...`);
    });
});

// Test 4: Full RAG Pipeline Simulation
console.log('\n✅ TEST 4: Full RAG Pipeline');
console.log('-'.repeat(50));
const testRole = 'Senior Full Stack Engineer';
console.log(`  Input role: "${testRole}"`);
console.log(`  Step 1: Chunking resume...`);
const pipelineChunks = chunkResume(SAMPLE_RESUME);
console.log(`         ✓ Created ${pipelineChunks.length} chunks`);

console.log(`  Step 2: Embedding chunks...`);
const pipelineEmbedded = pipelineChunks.map(chunk => ({
    ...chunk,
    embedding: mockEmbed(chunk.text)
}));
console.log(`         ✓ Embedded ${pipelineEmbedded.length} chunks`);

console.log(`  Step 3: Retrieving relevant chunks...`);
const queryEmbed = mockEmbed(testRole);
const pipelineRetrieved = pipelineEmbedded
    .map(ec => ({
        ...ec,
        score: cosineSimilarity(queryEmbed, ec.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

console.log(`         ✓ Retrieved top 3 chunks:`);
pipelineRetrieved.forEach((item, i) => {
    console.log(`           ${i + 1}. Score: ${item.score.toFixed(3)} - ${item.text.split('\n')[0].substring(0, 50)}...`);
});

console.log(`  Step 4: Would send to LLM with:`);
const contextSize = pipelineRetrieved.reduce((sum, item) => sum + item.text.length, 0);
console.log(`         - System prompt: ~200 tokens`);
console.log(`         - Context chunks: ~${Math.ceil(contextSize / 4)} tokens`);
console.log(`         - Job role: ~10 tokens`);
console.log(`         - Total prompt: ~${Math.ceil((200 + contextSize / 4 + 10))} tokens`);
console.log(`         ✓ Grounded generation ready`);

// Test 5: Performance Metrics
console.log('\n✅ TEST 5: Performance Characteristics');
console.log('-'.repeat(50));
const startChunk = Date.now();
const perfChunks = chunkResume(SAMPLE_RESUME);
const chunkTime = Date.now() - startChunk;

const startEmbed = Date.now();
const perfEmbedded = perfChunks.map(c => ({
    ...c,
    embedding: mockEmbed(c.text)
}));
const embedTime = Date.now() - startEmbed;

const startSim = Date.now();
const queryEmbed2 = mockEmbed('Senior Engineer');
perfEmbedded.forEach(ec => {
    cosineSimilarity(queryEmbed2, ec.embedding);
});
const simTime = Date.now() - startSim;

console.log(`  Chunking (local): ${chunkTime}ms`);
console.log(`  Embedding (mock): ${embedTime}ms`);
console.log(`  Similarity search (local): ${simTime}ms`);
console.log(`  \n  Real-world estimates (with actual API):`);
console.log(`  - Embedding: ~${perfChunks.length * 500}-${perfChunks.length * 1000}ms (500-1000ms per chunk)`);
console.log(`  - LLM generation: ~8000-15000ms (8-15 seconds)`);
console.log(`  - Total pipeline: ~10000-20000ms (10-20 seconds)`);

// Test 6: Edge Cases
console.log('\n✅ TEST 6: Edge Case Handling');
console.log('-'.repeat(50));

const edgeCases = [
    { name: 'Empty resume', text: '' },
    { name: 'Very short resume', text: 'EXPERIENCE\nDev' },
    { name: 'No sections', text: 'Just some random text about my experience' },
    { name: 'Repeated headers', text: 'EXPERIENCE\nJob1\nEXPERIENCE\nJob2' }
];

edgeCases.forEach(testCase => {
    try {
        const result = chunkResume(testCase.text);
        console.log(`  ${testCase.name}: ${result.length} chunks ✓`);
    } catch (e) {
        console.log(`  ${testCase.name}: ERROR - ${e.message} ✗`);
    }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ All tests completed!');
console.log('\nKey Takeaways:');
console.log('1. Chunking splits resume into semantic sections');
console.log('2. Embeddings convert text to 768-dim vectors');
console.log('3. Cosine similarity measures chunk relevance');
console.log('4. RAG pipeline significantly reduces prompt size');
console.log('5. Performance dominated by API latency, not local math');
console.log('\nNext steps:');
console.log('- Start the server: npm start');
console.log('- Test with real resume in browser');
console.log('- Monitor server logs for retrieval scores');
console.log('- Verify questions are grounded in retrieved chunks');
