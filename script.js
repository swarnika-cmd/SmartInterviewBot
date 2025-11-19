// ========================================
// CONFIGURATION
// ========================================
let API_KEY = localStorage.getItem('gemini_api_key') || ""; // Load from localStorage
const MODEL = "gemini-2.5-flash-preview-09-2025";

function getApiUrl() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
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

    // Check API key - reload it from localStorage in case it was just saved
    const storedKey = localStorage.getItem('gemini_api_key');
    if (!storedKey || storedKey.trim() === "") {
        showError('⚠️ API Key is not configured. Click the ⚙️ gear icon at the top to configure it.');
        updateBotMessage('Please configure your Gemini API key first!');
        showApiKeyModal(); // Automatically show the modal
        return false;
    }

    // Update API_KEY from storage
    API_KEY = storedKey;

    return true;
}

/**
 * Fetch with retry logic for rate limiting
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }

            if (response.status === 429 && i < maxRetries - 1) {
                // Rate limit - retry with exponential backoff
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                updateStatus(`Rate limited. Retrying in ${Math.ceil(delay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            throw new Error(`API Error: ${response.statusText} (${response.status})`);
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }

            // Transient error - retry
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
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
    updateStatus('⏳ Generating questions...');
    updateBotMessage('I\'m analyzing your resume and generating personalized interview questions. This may take a moment...');
    resultsContainer.innerHTML = `<p class="placeholder-text">🤖 Processing your information... <span class="loading"></span></p>`;

    try {
        // Prepare the system prompt
        const systemPrompt = `You are an expert hiring manager for leading technology companies. Your task is to generate challenging, relevant interview questions tailored to the candidate's specific experience and the target job role.

Guidelines:
1. Link questions directly to projects, experiences, or skills mentioned in the resume
2. Ask about specific challenges overcome and lessons learned
3. Include both behavioral and technical questions (if applicable)
4. Generate exactly 6-8 questions
5. Format as a numbered list (1., 2., etc.) with no additional text`;

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

        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        };

        // Make API call with retry logic
        const response = await fetchWithRetry(getApiUrl(), options);
        const result = await response.json();

        // Extract generated content
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
        showError(`❌ Error: ${error.message}`);
        updateBotMessage('Oops! Something went wrong. Please check your API key and try again.');
        updateStatus('❌ Error occurred');
        resultsContainer.innerHTML = '<p class="placeholder-text">Failed to generate questions. Please try again.</p>';
    } finally {
        // Re-enable button
        generateButton.disabled = false;
    }
}

// ========================================
// API KEY MANAGEMENT
// ========================================

/**
 * Show API key configuration modal
 */
function showApiKeyModal() {
    const modal = document.createElement('div');
    modal.id = 'api-key-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: #3d5a73;
        border: 4px solid #2c3e50;
        padding: 30px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = '⚙️ Configure Gemini API Key';
    title.style.cssText = `
        color: #ecf0f1;
        margin-bottom: 15px;
        font-size: 18px;
        border-bottom: 2px solid #2c3e50;
        padding-bottom: 10px;
    `;

    const description = document.createElement('p');
    description.innerHTML = 'Get your free API key from <strong><a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: #3498db;">Google AI Studio</a></strong>';
    description.style.cssText = `
        color: #bdc3c7;
        margin-bottom: 20px;
        font-size: 13px;
        line-height: 1.6;
    `;

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'Paste your Gemini API key here';
    input.value = API_KEY;
    input.style.cssText = `
        width: 100%;
        padding: 10px;
        border: 2px solid #2c3e50;
        background: #ecf0f1;
        color: #2c3e50;
        font-family: 'Courier Prime', monospace;
        font-size: 12px;
        border-radius: 3px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
    `;

    input.addEventListener('focus', function() {
        this.style.borderColor = '#3498db';
        this.style.boxShadow = '0 0 8px rgba(52, 152, 219, 0.5)';
    });

    input.addEventListener('blur', function() {
        this.style.borderColor = '#2c3e50';
        this.style.boxShadow = 'none';
    });

    const togglePassword = document.createElement('label');
    togglePassword.style.cssText = `
        display: flex;
        align-items: center;
        color: #bdc3c7;
        font-size: 12px;
        margin-bottom: 20px;
        cursor: pointer;
    `;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
    checkbox.addEventListener('change', function() {
        input.type = this.checked ? 'text' : 'password';
    });
    togglePassword.appendChild(checkbox);
    togglePassword.appendChild(document.createTextNode('Show API Key'));

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save API Key';
    saveBtn.style.cssText = `
        flex: 1;
        padding: 12px;
        background: #27ae60;
        color: #ecf0f1;
        border: 2px solid #1a7e3a;
        border-radius: 3px;
        font-family: 'Courier Prime', monospace;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    saveBtn.addEventListener('mouseover', function() {
        this.style.background = '#2ecc71';
    });
    saveBtn.addEventListener('mouseout', function() {
        this.style.background = '#27ae60';
    });
    saveBtn.addEventListener('click', function() {
        const newKey = input.value.trim();
        if (!newKey) {
            alert('Please enter an API key');
            return;
        }
        // Update the global API_KEY variable
        API_KEY = newKey;
        localStorage.setItem('gemini_api_key', newKey);
        console.log('API Key saved:', newKey.substring(0, 10) + '...'); // Debug log
        document.body.removeChild(modal);
        updateBotMessage('✓ API Key saved! You can now generate interview questions.');
        updateStatus('✓ API Key configured');
        hideError();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕ Cancel';
    cancelBtn.style.cssText = `
        flex: 1;
        padding: 12px;
        background: #e74c3c;
        color: #ecf0f1;
        border: 2px solid #c0392b;
        border-radius: 3px;
        font-family: 'Courier Prime', monospace;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    cancelBtn.addEventListener('mouseover', function() {
        this.style.background = '#ec7063';
    });
    cancelBtn.addEventListener('mouseout', function() {
        this.style.background = '#e74c3c';
    });
    cancelBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
    });

    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);

    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(input);
    modalContent.appendChild(togglePassword);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    input.focus();
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

// Clear error when user starts typing
roleInput.addEventListener('input', hideError);
resumeInput.addEventListener('input', hideError);

// Initialize Lucide icons if available
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Check if API key is configured on load
    console.log('API_KEY on load:', API_KEY); // Debug
    if (!API_KEY || API_KEY.trim() === "") {
        updateStatus('⚠️ API Key not configured');
        updateBotMessage('Welcome! Please configure your Gemini API key by clicking the ⚙️ button at the top right to get started.');
        // Auto-show API key modal on first load if no key is set
        setTimeout(() => {
            showApiKeyModal();
        }, 500);
    } else {
        updateStatus('✓ Ready for input');
        updateBotMessage('Hello! I\'m your Interview Prep Bot. Ready to help you prepare for interviews!');
    }
});
