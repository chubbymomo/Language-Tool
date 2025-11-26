🇯🇵 Japanese Immersion TutorA context-aware language learning tool powered by Google Gemini, React, Python (Flask), and PostgreSQL.This app allows you to have natural conversations in Japanese while it tracks your vocabulary and grammar exposure. It auto-generates flashcards and explanations based on the context of your conversation.🌟 FeaturesNatural Conversation: Chat with an AI personality tailored to your JLPT level.Context-Aware Dictionary: Click any word to see its meaning in that specific sentence.Auto-Vocabulary Harvesting: Automatically saves nouns, verbs, and adjectives from the conversation.Audio (TTS): Click the speaker icon to hear Japanese pronunciation.Speech-to-Text: Practice speaking with microphone input.Persistent Memory: Remembers your progress using a local PostgreSQL database.🛠️ PrerequisitesEnsure you have the following installed:Python (3.10+)Node.js (v18+)PostgreSQL📦 Setup1. Database ConfigurationYou need a Postgres database running locally.# Log into Postgres
sudo -u postgres psql

# Run these SQL commands:
CREATE USER languagetool WITH SUPERUSER PASSWORD 'password';
CREATE DATABASE japaneselanguagetool OWNER languagetool;
\q
2. Environment VariablesYou need a Google Gemini API Key. You can set either GEMINI_API_KEY or AI_API_KEY.export GEMINI_API_KEY="your_api_key_here"
# OR
export AI_API_KEY="your_api_key_here"
3. First RunMake the launch script executable:chmod +x launch.sh
🚀 Running the AppSimply run the launch script. It will handle virtual environments, dependencies, and server processes for you../launch.sh
Open your browser to: http://localhost:5173📂 Architecturefrontend/: React + Vite + TailwindCSS. Handles UI, Audio, and WebSocket/HTTP logic.backend/: Flask server. Handles Gemini API calls, prompt engineering, and Database persistence.launch.sh: Orchestrator script for development.🔧 TroubleshootingMicrophone not working? Ensure your browser has permission to access the microphone for localhost.Database Error? Check backend/server.py to ensure the DB_DSN string matches your Postgres credentials.API Error? Ensure your API key is exported in your terminal session before running the script.
