Here is the raw markdown content for the `README.md`. You can copy everything inside the code block and paste it directly into your file.

````markdown
# 🇯🇵 Japanese Immersion Tutor

A context-aware language learning tool powered by **Google Gemini**, **React**, **Python (Flask)**, and **PostgreSQL**.

This app allows you to have natural conversations in Japanese while it tracks your vocabulary and grammar exposure. It auto-generates flashcards and explanations based on the context of your conversation.

## 🌟 Features

- **Natural Conversation:** Chat with an AI personality tailored to your JLPT level.
- **Context-Aware Dictionary:** Click any word to see its meaning *in that specific sentence*.
- **Auto-Vocabulary Harvesting:** Automatically saves nouns, verbs, and adjectives from the conversation.
- **Audio (TTS):** Click the speaker icon to hear Japanese pronunciation.
- **Speech-to-Text:** Practice speaking with microphone input.
- **Persistent Memory:** Remembers your progress using a local PostgreSQL database.

## 🛠️ Prerequisites

Ensure you have the following installed:
- **Python** (3.10+)
- **Node.js** (v18+)
- **PostgreSQL**

## 📦 Setup

### 1. Database Configuration
You need a Postgres database running locally.
```bash
# Log into Postgres
sudo -u postgres psql

# Run these SQL commands:
CREATE USER languagetool WITH SUPERUSER PASSWORD 'password';
CREATE DATABASE japaneselanguagetool OWNER languagetool;
\q
````

### 2\. Environment Variables

You need a Google Gemini API Key. You can set either `GEMINI_API_KEY` or `AI_API_KEY`.

```bash
export GEMINI_API_KEY="your_api_key_here"
# OR
export AI_API_KEY="your_api_key_here"
```

### 3\. First Run

Make the launch script executable:

```bash
chmod +x launch.sh
```

## 🚀 Running the App

Simply run the launch script. It will handle virtual environments, dependencies, and server processes for you.

```bash
./launch.sh
```

Open your browser to: [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)

## 📂 Architecture

  - **`frontend/`**: React + Vite + TailwindCSS. Handles UI, Audio, and WebSocket/HTTP logic.
  - **`backend/`**: Flask server. Handles Gemini API calls, prompt engineering, and Database persistence.
  - **`launch.sh`**: Orchestrator script for development.

## 🔧 Troubleshooting

  - **Microphone not working?** Ensure your browser has permission to access the microphone for `localhost`.
  - **Database Error?** Check `backend/server.py` to ensure the `DB_DSN` string matches your Postgres credentials.
  - **API Error?** Ensure your API key is exported in your terminal session before running the script.

<!-- end list -->

```
```
