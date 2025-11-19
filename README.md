🧠 Smart Interview Prep Bot
An AI-powered web application that generates personalized interview questions based on your resume and target job role using Google's Gemini API.

🔗 Live Demo
Try it here! 

📋 Table of Contents

About
Features
Technologies Used
Project Structure
Getting Started
How to Use
Configuration
Deployment
Screenshots
Known Issues
Future Enhancements
Contributing
License
Contact


📖 About
Smart Interview Prep Bot helps job seekers prepare for interviews by generating customized questions that directly reference their experience and skills. Unlike generic interview prep tools, this bot analyzes your actual resume content and creates questions tailored to your specific background and the role you're targeting.
Why This Project?

🎯 Personalized Preparation: Questions are based on YOUR resume, not generic templates
⚡ Fast Generation: Get 6+ questions in seconds
🤖 AI-Powered: Leverages Google's Gemini 2.5 Flash model
📱 Responsive Design: Works seamlessly on desktop, tablet, and mobile
🆓 Free to Use: No signup required (just add your API key)


✨ Features

Resume Analysis: AI reads and understands your resume content
Role-Specific Questions: Questions tailored to your target job title
Instant Generation: Get results in 3-5 seconds
Clean UI: Modern, intuitive interface built with Tailwind CSS
Error Handling: User-friendly error messages and validation
Loading States: Visual feedback during generation
Responsive Design: Optimized for all screen sizes
No Backend Required: Pure frontend application


🛠️ Technologies Used
TechnologyPurposeVersionHTML5Structure and markup-CSS3Custom styling-Tailwind CSSUtility-first styling framework3.x (CDN)JavaScript (ES6+)Application logic and API integration-Google Gemini APIAI-powered question generation2.5 FlashLucide IconsModern icon libraryLatestFetch APIHTTP requests to Gemini APINative

📁 Project Structure
smartInterviewBot/
│
├── index.html          # Main HTML structure
├── script.js           # JavaScript logic and API calls
├── styles.css          # Custom CSS styles
├── README.md           # Project documentation (this file)
File Descriptions

index.html: Contains the page structure, input forms, and output containers
script.js: Handles user interactions, API calls to Gemini, and DOM manipulation
styles.css: Custom styles including animations, responsive adjustments, and theme colors


🚀 Getting Started
Prerequisites
Before you begin, ensure you have:

A modern web browser (Chrome, Firefox, Safari, or Edge)
A Google Gemini API key (Get one here)
Basic text editor (VS Code, Sublime Text, etc.)
Git installed (optional, for version control)

Installation

Clone the repository

bashgit clone https://github.com/yourusername/smart-interview-prep.git
cd smart-interview-prep
Or download as ZIP and extract.

Get your Gemini API Key

Visit Google AI Studio
Sign in with your Google account
Click "Create API Key"
Copy the generated key


Configure the API Key
Open script.js and find this line (around line 3):

javascript   const API_KEY = ""; // Replace with your API key
Replace the empty string with your actual API key:
javascript   const API_KEY = "AIzaSyD...your-key-here...xyz123";

Open in Browser

Double-click index.html, OR
Use Live Server extension in VS Code, OR
Run a local server:



bash   # Python 3
   python -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000

   # Node.js (with http-server)
   npx http-server
Then open http://localhost:8000 in your browser.

📱 How to Use
Step-by-Step Guide

Enter Target Job Role

Type the job title you're applying for
Example: "Senior Frontend Developer" or "Data Scientist"


Paste Your Resume

Copy your resume content (plain text)
Paste it into the large text area
Include: work experience, projects, skills, education


Generate Questions

Click the "Generate Interview Questions" button
Wait 3-5 seconds while AI analyzes your information


Review Your Questions

Questions appear in styled cards
Each question references specific items from your resume
Use these to practice your interview responses



Example Input
Job Role:
Senior Frontend Engineer
Resume:
John Doe
Email: john@example.com

EXPERIENCE
- Built React applications serving 10,000+ users
- Implemented Redux for state management
- Optimized performance, reducing load time by 40%

PROJECTS
- E-commerce Platform: Built with React, Node.js, MongoDB
- Dashboard Analytics: Data visualization with D3.js

SKILLS
JavaScript, React, TypeScript, Node.js, Git, Agile
Example Output
1. Can you walk me through how you optimized your React application to achieve a 40% reduction in load time?

2. Tell me about your experience implementing Redux for state management in applications serving 10,000+ users.

3. Describe the architecture of your E-commerce Platform. What made you choose React, Node.js, and MongoDB?

4. How did you approach data visualization in your Dashboard Analytics project using D3.js?

5. What TypeScript patterns do you find most useful when building large-scale React applications?

6. Can you share an example of a complex state management challenge you faced and how you solved it?

⚙️ Configuration
API Settings
In script.js, you can customize these settings:
javascript// API Configuration
const API_KEY = "";  // Your Gemini API key
const MODEL = "gemini-2.5-flash-preview-09-2025";  // AI model version
const MIN_QUESTIONS = 6;  // Minimum questions to generate
Customizing the AI Behavior
Edit the systemPrompt in script.js (around line 60):
javascriptconst systemPrompt = `You are an expert hiring manager...

Rules:
1. Focus on linking questions to specific projects
2. Generate a minimum of ${MIN_QUESTIONS} questions
3. Structure output as a numbered list
4. Include both technical and behavioral questions  // Add this
5. Ask about specific technologies mentioned  // Add this
`;
Styling Customization
In styles.css, you can modify:

Colors: Change the color scheme
Fonts: Update font families
Spacing: Adjust padding and margins
Animations: Modify the spinner or transitions


🌐 Deployment
Deploy to Vercel (Recommended)

Push to GitHub

bashgit init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/smart-interview-prep.git
git push -u origin main

Connect to Vercel

Go to vercel.com
Sign up/login with GitHub
Click "New Project"
Import your repository
Click "Deploy"


Add Environment Variable (Security)

In Vercel Dashboard → Settings → Environment Variables
Add: GEMINI_API_KEY = your-api-key
Update code to use process.env.GEMINI_API_KEY



Your site will be live at: https://smart-interview-prep.vercel.app
Other Deployment Options

Netlify: Similar to Vercel, drag & drop or GitHub integration
GitHub Pages: Free hosting for static sites
Render: Good for full-stack apps (if you add a backend)



⚠️ Known Issues
Security Concerns

API Key Exposure: The API key is visible in browser source code

Impact: Anyone can view and potentially misuse your key
Solution: Implement a backend serverless function (see below)


No Rate Limiting: Users can spam the generate button

Impact: Could exhaust your API quota
Solution: Add cooldown timer between requests



Limitations

Internet Required: No offline functionality
API Dependency: Relies on Google's service availability
English Only: Currently only supports English language
No History: Generated questions aren't saved
Single Format: No options for question types or difficulty levels

Browser Compatibility

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
❌ Internet Explorer (not supported)


🔮 Future Enhancements
Planned Features

 Backend Integration: Secure API key with serverless functions
 Local Storage: Save generated questions for later review
 Export Options: Download as PDF or copy to clipboard
 Question Categories: Separate technical, behavioral, and situational questions
 Difficulty Levels: Choose junior, mid-level, or senior question complexity
 Company Research: Include company-specific questions
 Answer Practice: Record and analyze practice answers
 Multiple Languages: Support for non-English resumes
 Dark Mode: Toggle between light and dark themes
 User Accounts: Save history across devices

Improvement Ideas

Add question templates for different industries
Implement AI feedback on practice answers
Create a mock interview simulator
Add sharing functionality for questions
Build a question bank with community contributions


🤝 Contributing
Contributions are welcome! Here's how you can help:
How to Contribute

Fork the repository
Create a feature branch

bash   git checkout -b feature/AmazingFeature

Commit your changes

bash   git commit -m "Add some AmazingFeature"

Push to the branch

bash   git push origin feature/AmazingFeature

Open a Pull Request

Contribution Guidelines

Write clear, commented code
Test your changes thoroughly
Update README if adding new features
Follow existing code style
Be respectful and constructive

Bug Reports
Found a bug? Please open an issue with:

Clear description of the problem
Steps to reproduce
Expected vs actual behavior
Browser and OS information
Screenshots if applicable


📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

🙏 Acknowledgments

Google Gemini API - AI model powering the question generation
Tailwind CSS - Utility-first CSS framework
Lucide Icons - Beautiful icon library
Vercel - Hosting and deployment platform
Inspired by the need for better interview preparation tools


