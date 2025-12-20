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
    updateStatus('⏳ Generating questions...');
    updateBotMessage('I\'m analyzing your resume and generating personalized interview questions. This may take a moment...');
    resultsContainer.innerHTML = `<p class="placeholder-text">🤖 Processing your information... <span class="loading"></span></p>`;

    try {
        const systemPrompt = `You are an expert hiring manager for leading technology companies. Your task is to generate challenging, relevant interview questions tailored to the candidate's specific experience and the target job role.

Guidelines:
1. Link questions directly to projects, experiences, or skills mentioned in the resume
2. Ask about specific challenges overcome and lessons learned
3. Include both behavioral and technical questions (if applicable)
4. Generate exactly 6-8 questions
5. Format as a numbered list (1., 2., etc.) with no additional text
6. Make questions specific to the candidate's actual experience`;

        const userQuery = `Target Role: ${roleText}

Candidate's Resume:
---
${resumeText}
---

Generate interview questions for this candidate based on their resume and target role.`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        };

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle different error formats (Gemini acts differently than standard APIs)
            const errorDetails = result.error || result;
            const errorMessage = errorDetails.message ||
                (typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails));

            throw new Error(errorMessage);
        }

        // Extract generated content from standard Gemini response structure
        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No content generated from API');
        }

        // Parse and display questions
        const questions = parseQuestions(generatedText);

        if (questions.length > 0) {
            resultsContainer.innerHTML = formatQuestionsAsHTML(questions, roleText);
            updateBotMessage(`Great! I've generated ${questions.length} tailored questions for your ${roleText} interview. Review each question and prepare thoughtful answers!`);
            updateStatus('✓ Questions generated successfully');
        } else {
            throw new Error('Could not parse questions from API response');
        }

    } catch (error) {
        console.error('Generation failed:', error);

        let errorMsg = error.message;
        if (errorMsg.includes('Server API key not configured')) {
            errorMsg = 'Server Error: API Key missing. Contact Administrator.';
        }

        showError(`❌ Error: ${errorMsg}`);
        updateBotMessage('Oops! Something went wrong. Please check the connection and try again.');
        updateStatus('❌ Error occurred');
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