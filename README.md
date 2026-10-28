# Nova — AI Chat Assistant 🌟

A multi-turn chatbot powered by **Google Gemini 2.0 Flash** with proper context window management, a defined personality, and a beautiful dark-themed UI.

![Nova Chat Interface](https://img.shields.io/badge/Model-Gemini_2.0_Flash-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Runtime-Node.js-green?style=for-the-badge)

## ✨ Features

- **Multi-turn conversations** — Nova remembers the full conversation and can reference things said many messages ago
- **Context window management** — Hybrid strategy: summarizes older messages into a running summary and truncates at a hard cap, so conversations can run indefinitely without hitting token limits
- **Defined personality** — Nova has a warm, witty personality via a detailed system prompt (not generic assistant behavior)
- **Error handling** — Rate limits, API key issues, timeouts, and safety filter blocks all surface clear user-facing messages
- **Beautiful dark UI** — Glassmorphism, gradient accents, animated welcome orb, markdown rendering, toast notifications
- **Conversation management** — Sidebar with conversation list, new chat, delete chat
- **Responsive design** — Works on desktop and mobile

## 🚀 Quick Start

### 1. Get a Gemini API Key (Free)

Go to [Google AI Studio](https://aistudio.google.com/apikey) and create a free API key.

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and paste your API key
GEMINI_API_KEY=your_actual_key_here
```

### 3. Install & Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development Mode (auto-reload)

```bash
npm run dev
```

## 🧠 Context Window Strategy

Nova uses a **hybrid summarization + truncation** approach:

| Threshold | Action |
|---|---|
| ≤ 16 messages | Full history sent to the model |
| > 16 messages | Older half is summarized into a concise summary by Gemini, prepended as context |
| > 20 messages | Hard truncation to last 20 messages as a safety net |

This means you can have arbitrarily long conversations without hitting context limits. Key facts and decisions are preserved in the running summary.

## 📁 Project Structure

```
aichatbot/
├── server.js          # Express backend + Gemini API + context management
├── public/
│   ├── index.html     # Chat UI structure
│   ├── style.css      # Dark theme design system
│   └── app.js         # Frontend chat logic
├── .env               # API key (git-ignored)
├── .env.example       # Template for environment variables
├── .gitignore         # Excludes .env and node_modules
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## 🔑 API Key Security

- API key is loaded from `.env` via `dotenv`
- `.env` is in `.gitignore` — **never committed to git**
- Server refuses to start if the key is missing or still the placeholder value

## 🛠 Tech Stack

- **Backend:** Node.js + Express
- **AI Model:** Google Gemini 2.0 Flash (via `@google/generative-ai` SDK)
- **Frontend:** Vanilla HTML/CSS/JS (no framework needed)
- **Design:** Custom dark theme with glassmorphism, CSS animations, gradient accents

## 📝 License

ISC
