# 🤖 AI Job Application Assistant

An intelligent Chrome extension that automates job application form filling using a multi-agent AI system. Features cover letter generation, resume tailoring, job matching analysis, and intelligent learning from your feedback.

## ✨ Features

### 🎯 Core Functionality
- **Multi-Agent AI System**: Uses OpenAI GPT, Google Gemini, and Anthropic Claude in a voting system to generate the best responses
- **Intelligent Auto-Fill**: Automatically detects and fills job application forms across multiple platforms
- **Platform Support**: Works with Workday, Greenhouse, Lever, and generic application forms
- **Learning System**: Improves responses based on your feedback (check ✓ or regenerate 🔄)

### 📝 Advanced Features
- **Cover Letter Generator**: Creates tailored, professional cover letters for each job
- **Resume Tailor**: Generates ATS-compliant resumes optimized for specific job descriptions
- **Job Match Analysis**: Analyzes how well your profile matches a job (skills, experience, education)
- **Application History**: Tracks all your applications for easy reference

### 🎨 User Experience
- **Review Before Submit**: Preview and approve AI-generated responses before filling
- **Multiple Response Options**: View all three AI-generated versions and choose
- **Visual Feedback**: Clear indicators for filled fields and pending reviews
- **Floating Assistant**: Unobtrusive floating button that appears on job application pages

## 🚀 Installation

### Prerequisites
- Google Chrome or Chromium-based browser (Edge, Brave, etc.)
- API keys for at least one AI provider:
  - [OpenAI API Key](https://platform.openai.com/api-keys) (GPT-3.5-turbo)
  - [Google Gemini API Key](https://makersuite.google.com/app/apikey) (Gemini Pro - Free tier available)
  - [Anthropic API Key](https://console.anthropic.com/) (Claude Haiku)

### Step 1: Add Icons (Required)

The extension needs icons to work properly. Follow the instructions in `icons/README_ICONS.md` to create or download icons.

Quick method:
```bash
# If you have ImageMagick installed
cd icons
convert -size 128x128 -background "#667eea" -fill white -gravity center \
  -font "Arial" -pointsize 80 label:"🤖" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

Or use an online icon generator and save as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` directory.

### Step 2: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `claudestuff` folder (this directory)
5. The extension should now appear in your extensions list

### Step 3: Configure the Extension

1. Click the extension icon in your browser toolbar
2. Click "⚙️ Settings"
3. **Profile Tab**:
   - Paste your resume text or upload a resume file
   - (Optional) Add your LinkedIn profile data
   - Click "💾 Save Profile"

4. **API Keys Tab**:
   - Add at least one API key (all three recommended for best results)
   - Click "💾 Save API Keys"

5. **Preferences Tab**:
   - Configure your preferences
   - Click "💾 Save Preferences"

## 📖 Usage

### Basic Workflow

1. **Navigate to a job application page**
   - The extension automatically detects job application forms
   - A floating robot button (🤖) appears in the bottom-right corner

2. **Click the floating button**
   - Opens the assistant panel with available actions

3. **Analyze the job match** (Optional but recommended)
   - Click "📊 Analyze Job Match"
   - View your match score and recommendations
   - Decide if the job is worth applying to

4. **Auto-fill the application**
   - Click "✨ Auto Fill Application"
   - The extension fills simple fields immediately (name, email, etc.)
   - For complex questions, AI generates responses for your review

5. **Review AI-generated responses**
   - Each response appears in a card with:
     - The question/field label
     - The winning AI-generated response
     - Action buttons: ✓ Use This | 🔄 Regenerate | 👁 Show All Versions
   - **✓ Use This**: Accepts the response and fills the form field
   - **🔄 Regenerate**: Requests a new response (helps the AI learn)
   - **👁 Show All Versions**: View responses from all three AI agents

6. **Generate cover letter** (if needed)
   - Click "📝 Generate Cover Letter"
   - Review the generated cover letter
   - Copy to clipboard or fill directly in the form

7. **Tailor your resume** (optional)
   - Click "📄 Tailor Resume"
   - View ATS-compliant resume optimized for this job
   - See your ATS score and optimization tips
   - Download or copy the tailored resume

### Supported Platforms

The extension automatically detects and adapts to:
- **Workday** (myworkdayjobs.com)
- **Greenhouse** (greenhouse.io)
- **Lever** (lever.co)
- **Generic forms** (fallback for other platforms)

## 🧠 How the Multi-Agent System Works

### Response Generation Process

1. **Three AI agents generate responses independently**:
   - OpenAI GPT-3.5-turbo
   - Google Gemini Pro
   - Anthropic Claude Haiku

2. **Each agent analyzes**:
   - The job description
   - Your resume and LinkedIn profile
   - The specific question being asked
   - Past successful responses (from learning data)

3. **Voting phase**:
   - Each agent reviews the other two responses
   - Agents vote on which response best answers the question
   - Agents cannot vote for their own response
   - Majority vote wins

4. **Result**:
   - The winning response is presented to you
   - You can still view all three versions
   - Your feedback (check/regenerate) improves future responses

### Learning System

The extension learns from your feedback:
- **Positive feedback** (✓): Saves successful response patterns
- **Negative feedback** (🔄): Identifies patterns to avoid
- **Pattern detection**: After 3+ similar negative feedbacks, creates a pattern rule
- **Continuous improvement**: Future responses incorporate learned patterns

## 🔧 Configuration

### Resume Format

For best results, format your resume with clear sections:
```
[Your Name]
[Email] | [Phone] | [LinkedIn]

PROFESSIONAL SUMMARY
[2-3 sentences about your experience]

SKILLS
[Skill 1] • [Skill 2] • [Skill 3] ...

PROFESSIONAL EXPERIENCE

[Job Title]
[Company] | [Start Date] - [End Date]
• [Achievement 1]
• [Achievement 2]

EDUCATION

[Degree]
[University] | [Year]
```

### LinkedIn Data

You can provide LinkedIn data in JSON format:
```json
{
  "name": "Your Name",
  "headline": "Software Engineer",
  "summary": "...",
  "experience": [...],
  "education": [...],
  "skills": [...]
}
```

### API Keys Best Practices

- **Cost**: All three models have free tiers or very low costs
  - GPT-3.5-turbo: ~$0.002 per application
  - Gemini Pro: Free tier available
  - Claude Haiku: ~$0.001 per application

- **Rate Limits**: The extension handles rate limits automatically
- **Security**: Keys are stored locally in your browser, never sent to third parties

## 🎯 Tips for Best Results

### 1. Provide Complete Information
- Include all your work experience in your resume
- Add specific achievements with numbers
- List all relevant skills

### 2. Review and Refine
- Always review AI-generated responses
- Use the regenerate button if response doesn't feel right
- The system learns from your feedback

### 3. Customize When Needed
- After filling, review all fields
- Manually adjust any responses that need personal touch
- The AI provides a strong starting point

### 4. Use Job Match Analysis
- Check match score before applying
- Focus on jobs with 60%+ match
- Use insights to improve your profile

### 5. Keep Learning Data Clean
- Regularly review your application history
- Clear outdated learning data occasionally
- Provide consistent feedback (check vs regenerate)

## 📊 Privacy & Data

### What's Stored Locally
- Your resume and LinkedIn profile
- AI API keys (encrypted by browser)
- Application history
- Learning data (your feedback)

### What's Sent to AI Providers
- Job descriptions (for analysis)
- Your resume/profile (for generating responses)
- Questions being answered

### What's NOT Stored or Sent
- Passwords or authentication tokens
- Personal browsing history
- Data from other websites

### Data Control
- All data stored locally in your browser
- Export your data anytime from settings
- Clear all data with one click
- Uninstalling removes all data

## 🛠️ Development

### Project Structure
```
claudestuff/
├── manifest.json              # Extension manifest
├── background.js              # Background service worker
├── content/                   # Content scripts
│   ├── content.js            # Main orchestrator
│   ├── form-detector.js      # Form detection
│   ├── form-filler.js        # Form filling logic
│   └── ui-injector.js        # UI components
├── lib/                       # Core libraries
│   ├── ai-agents.js          # Multi-agent system
│   ├── storage.js            # Storage management
│   ├── learning.js           # Learning system
│   └── resume-parser.js      # Resume parsing
├── platforms/                 # Platform-specific handlers
│   ├── workday.js
│   ├── greenhouse.js
│   ├── lever.js
│   └── generic.js
├── features/                  # Feature modules
│   ├── cover-letter.js       # Cover letter generation
│   ├── job-matcher.js        # Job matching
│   └── resume-tailor.js      # Resume tailoring
├── popup/                     # Extension popup
├── options/                   # Settings page
├── styles/                    # Stylesheets
└── icons/                     # Extension icons
```

### Technology Stack
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Storage**: Chrome Storage API
- **AI**: OpenAI, Google Gemini, Anthropic Claude APIs
- **Manifest**: Version 3

### Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🐛 Troubleshooting

### Extension doesn't detect form
- Refresh the page after installing
- Check if the page URL contains job-related keywords
- Try clicking the floating button manually

### API errors
- Verify your API keys are correct
- Check you have credits/quota remaining
- Ensure you're using the correct key format

### Fields not filling
- Check browser console for errors (F12)
- Verify the platform is supported
- Try clicking fields manually first

### Poor response quality
- Ensure your resume has detailed information
- Add more context to your LinkedIn profile
- Use the regenerate button and provide feedback
- Check that job description loaded correctly

## 📝 TODO / Future Enhancements

- [ ] Add support for more job platforms (Indeed, LinkedIn Easy Apply)
- [ ] Import LinkedIn data directly via API
- [ ] Export applications to CSV/Excel
- [ ] Browser extension for Firefox and Safari
- [ ] Advanced analytics dashboard
- [ ] Custom response templates
- [ ] Multi-language support
- [ ] Integration with job boards

## 📄 License

MIT License - feel free to use and modify for personal or commercial use.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Google for Gemini AI
- Anthropic for Claude AI
- All open-source contributors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-job-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-job-assistant/discussions)
- **Email**: your-email@example.com

---

Made with ❤️ for job seekers everywhere. Good luck with your applications! 🚀
