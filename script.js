// ========================================
// SESSION MANAGEMENT (Pinecone Integration)
// ========================================

/**
 * Get or create session ID for Pinecone persistence
 */
function getSessionId() {
    let sessionId = sessionStorage.getItem('smartbot_sessionId');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('smartbot_sessionId', sessionId);
    }
    return sessionId;
}

/**
 * Save session ID from API response
 */
function saveSessionId(sessionId) {
    if (sessionId) {
        sessionStorage.setItem('smartbot_sessionId', sessionId);
    }
}

// ========================================
// DOM ELEMENTS
// ========================================
const roleInput = document.getElementById('role-input');
const resumeInput = document.getElementById('resume-input');
const generateButton = document.getElementById('generate-button');
const clearButton = document.getElementById('clear-button');
const errorMessage = document.getElementById('error-message');
const resultsContainer = document.getElementById('results-container');
const botMessage = document.getElementById('bot-message');
const statusText = document.getElementById('status-text');

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Display message in the bot's speech bubble
 */
function updateBotMessage(message) {
    botMessage.textContent = message;
}

/**
 * Update status indicator
 */
function updateStatus(status) {
    statusText.textContent = status;
}

/**
 * Display error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
}

/**
 * Clear input fields
 */
function clearInputs() {
    roleInput.value = '';
    resumeInput.value = '';
    resultsContainer.innerHTML = '<p class="placeholder-text">Questions will appear here...</p>';
    hideError();
    updateBotMessage('Hello! I\'m your Interview Prep Bot. I can help you prepare for your dream job. Just fill in your details and I\'ll generate tailored questions!');
    updateStatus('Ready for input');
}

/**
 * Validate inputs
 */
function validateInputs() {
    const roleText = roleInput.value.trim();
    const resumeText = resumeInput.value.trim();

    if (!roleText) {
        showError('⚠️ Please enter your Target Job Title');
        return false;
    }

    if (roleText.length < 3) {
        showError('⚠️ Job title must be at least 3 characters');
        return false;
    }

    if (!resumeText) {
        showError('⚠️ Please paste your Resume content');
        return false;
    }

    if (resumeText.length < 50) {
        showError('⚠️ Resume is too short. Please add more details.');
        return false;
    }

    return true;
}

/**
 * Parse questions from text
 */
function parseQuestions(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
}

/**
 * Format questions as HTML
 */
function formatQuestionsAsHTML(questions, role) {
    if (!questions || questions.length === 0) {
        return '<p class="placeholder-text">No questions generated. Please try again.</p>';
    }

    const header = `<div style="background: #2c3e50; padding: 15px; margin-bottom: 15px; border-left: 4px solid #27ae60; border-radius: 3px; color: #ecf0f1;">
        <strong style="color: #27ae60;">✓ Interview Questions Generated!</strong>
        <p style="margin-top: 5px; font-size: 12px;">You're interviewing for: <strong style="color: #3498db;">${role}</strong></p>
    </div>`;

    const questionsList = questions
        .map((question, index) => `
            <div class="question-item">
                <strong>Q${index + 1}:</strong> ${question}
            </div>
        `)
        .join('');

    return header + questionsList;
}

// ========================================
// MAIN GENERATION FUNCTION
// ========================================
async function generateQuestions() {
    // Validate inputs
    if (!validateInputs()) {
        return;
    }

    hideError();
    const roleText = roleInput.value.trim();
    const resumeText = resumeInput.value.trim();

    // Disable button and show loading state
    generateButton.disabled = true;
    generateButton.textContent = '⏳ Generating...';
    updateStatus('⏳ Starting RAG pipeline with Pinecone & Groq...');
    updateBotMessage('I\'m analyzing your resume using advanced RAG with Pinecone for persistent storage and Groq for unlimited generation. Your embeddings will be saved for future queries. Please wait...');
    resultsContainer.innerHTML = `<p class="placeholder-text">🤖 Processing with Pinecone + Groq <span class="loading"></span></p>`;

    try {
        const systemPrompt = `You are an expert hiring manager for leading technology companies. Your task is to generate challenging, relevant interview questions tailored to the candidate's specific experience and the target job role.

Guidelines:
1. Link questions directly to projects, experiences, or skills mentioned in the resume
2. Ask about specific challenges overcome and lessons learned
3. Include both behavioral and technical questions (if applicable)
4. Generate exactly 6-8 questions
5. Format as a numbered list (1., 2., etc.) with no additional text
6. Make questions specific to the candidate's actual experience
7. ONLY use information present in the provided resume context - do not invent skills or experiences`;

        // Send payload to backend for RAG processing
        const payload = {
            role: roleText,
            resume: resumeText,
            systemPrompt: systemPrompt,
            sessionId: getSessionId()
        };

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error(`Failed to parse server response: ${parseError.message}`);
        }

        if (!response.ok) {
            // Handle error messages from backend
            const errorDetails = result.error || result;
            const errorMessage = typeof errorDetails === 'string' 
                ? errorDetails 
                : (errorDetails.message || JSON.stringify(errorDetails));

            throw new Error(errorMessage);
        }

        // Save session ID for persistence
        if (result.sessionId) {
            saveSessionId(result.sessionId);
            console.log('✅ Session saved:', result.sessionId);
        }

        // Backend returns { text: "..." } for any provider
        const generatedText = result.text;

        if (!generatedText) {
            throw new Error('No content generated from API');
        }

        // Parse and display questions
        const questions = parseQuestions(generatedText);

        if (questions.length > 0) {
            resultsContainer.innerHTML = formatQuestionsAsHTML(questions, roleText);
            updateBotMessage(`🎯 RAG Analysis Complete! I've retrieved the most relevant sections from your resume and generated ${questions.length} targeted questions for your ${roleText} interview. Your embeddings are now stored in Pinecone for future queries!`);
            updateStatus('✓ RAG pipeline completed successfully (Pinecone + Groq)');
        } else {
            throw new Error('Could not parse questions from API response');
        }

    } catch (error) {
        console.error('Generation failed:', error);

        let errorMsg = error.message || String(error);
        
        // Provide helpful guidance based on error type
        if (errorMsg.includes('Configuration Error') || errorMsg.includes('not configured')) {
            errorMsg += '\n\n📝 Fix: Check your .env file has GROQ_API_KEY and PINECONE_API_KEY set correctly.';
        } else if (errorMsg.includes('Groq')) {
            errorMsg += '\n\n📝 Fix: Check your Groq API key at https://console.groq.com/';
        } else if (errorMsg.includes('Pinecone')) {
            errorMsg += '\n\n📝 Fix: Check your Pinecone API key at https://www.pinecone.io/';
        } else if (errorMsg.includes('JSON')) {
            errorMsg += '\n\n📝 Fix: This usually means the API is returning an error page. Check API keys and quotas.';
        } else if (errorMsg.includes('parsing')) {
            errorMsg += '\n\n📝 Fix: The server response was invalid. Check server logs for details.';
        }

        showError(`❌ Error: ${errorMsg}`);
        updateBotMessage('Oops! Something went wrong during RAG processing with Pinecone/Groq. Please check your API configuration and try again.');
        updateStatus('❌ RAG pipeline failed');
        resultsContainer.innerHTML = '<p class="placeholder-text">Failed to generate questions. Please try again.</p>';
    } finally {
        // Re-enable button
        generateButton.disabled = false;
        generateButton.innerHTML = '<span class="btn-icon">▶</span> Generate';
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

// Enable generation when Enter is pressed in role input
roleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !generateButton.disabled) {
        generateQuestions();
    }
});

// Button Event Listeners
generateButton.addEventListener('click', generateQuestions);
clearButton.addEventListener('click', clearInputs);

// Clear error when user starts typing
roleInput.addEventListener('input', hideError);
resumeInput.addEventListener('input', hideError);

// Initialize Lucide icons if available
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initial State
    updateStatus('✓ Ready for input');
    updateBotMessage('Hello! I\'m your Interview Prep Bot. Ready to help you prepare for interviews!');
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateY(-20px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);