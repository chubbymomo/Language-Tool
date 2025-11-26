# J-Tutor: Japanese Language Learning App

An interactive Japanese language tutor powered by Google's Gemini AI. Features real-time conversation practice, vocabulary tracking, furigana support, and speech recognition.

## Features

- **AI-Powered Conversations** - Practice Japanese with contextual responses tailored to your JLPT level
- **Interactive Sentences** - Click any word to see readings, meanings, and grammar explanations
- **Vocabulary Tracking** - Build your personal knowledge base with automatic or manual word saving
- **Furigana Support** - Toggle reading aids (always visible, hover, or hidden)
- **Speech Input** - Practice speaking with browser-based speech recognition
- **Text-to-Speech** - Hear correct pronunciation of Japanese sentences
- **Persistent Sessions** - Your conversations and vocabulary sync to a PostgreSQL database

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Flask, Python 3.10+ |
| AI | Google Gemini API |
| Database | PostgreSQL |

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))

## Quick Start

### Option 1: Docker (Recommended)

The easiest way to run everything:

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd japanese-tutor

# 2. Create environment file
cp .env.example .env

# 3. Add your Gemini API key to .env
nano .env

# 4. Start all services
docker compose up -d

# 5. Open http://localhost in your browser
```

**Docker Commands:**

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Reset database (delete volume)
docker compose down -v
```

---

### Option 2: Manual Setup

### 1. Clone and Navigate

```bash
git clone <your-repo-url>
cd japanese-tutor
```

### 2. Set Up PostgreSQL

```bash
# Create database and user
psql -U postgres
```

```sql
CREATE DATABASE japaneselanguagetool;
CREATE USER languagetool WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE japaneselanguagetool TO languagetool;
\c japaneselanguagetool
GRANT ALL ON SCHEMA public TO languagetool;
\q
```

### 3. Configure Environment

```bash
# Copy the example env file
cp backend/.env.example backend/.env

# Edit with your actual values
nano backend/.env
```

Your `.env` should look like:

```env
GEMINI_API_KEY=your_actual_api_key_here
DB_DSN=dbname='japaneselanguagetool' user='languagetool' host='localhost' password='password'
```

### 4. Run the App

**Option A: Use the startup script (recommended)**

```bash
# Set your API key in the environment
export GEMINI_API_KEY='your_key_here'

# Make script executable and run
chmod +x start.sh
./start.sh
```

**Option B: Run manually**

Terminal 1 (Backend):
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm install
npm run dev
```

### 5. Open the App

Navigate to [http://localhost:5173](http://localhost:5173)

## Project Structure

```
japanese-tutor/
├── backend/
│   ├── app.py              # Flask server & API routes
│   ├── ai.py               # Gemini API integration
│   ├── database.py         # PostgreSQL connection pool
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ChatArea.jsx
│   │   │   ├── KnowledgePanel.jsx
│   │   │   ├── SettingsPanel.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── WordInspector.jsx
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── usePersistence.js
│   │   │   ├── useSpeech.js
│   │   │   └── useTTS.js
│   │   ├── services/
│   │   │   └── api.js      # Backend API calls
│   │   ├── constants.js    # App configuration
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # React entry point
│   ├── vite.config.js      # Vite config with API proxy
│   └── package.json
├── start.sh                # One-command startup script
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (database status) |
| POST | `/api/chat` | Send message, get AI response |
| GET | `/api/vocab` | Retrieve all saved vocabulary |
| POST | `/api/vocab` | Save/update a vocabulary item |

### Chat Request Example

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "こんにちは",
    "levelContext": "The user is a beginner (JLPT N5 level).",
    "vocabContext": "猫, 犬, 食べる"
  }'
```

## Configuration Options

### JLPT Levels

- **N5** - Beginner: Basic polite forms, simple particles
- **N4** - Upper Beginner: Te-form, potential verbs
- **N3** - Intermediate: Passive/causative, casual speech

### Display Settings

- **Furigana Mode**: `always` | `hover` | `hidden`
- **English Translation**: `visible` | `hover` | `hidden`
- **Auto-Add Vocabulary**: Automatically save new words from AI responses

## Troubleshooting

### "Database not available"

1. Check PostgreSQL is running: `pg_isready`
2. Verify your `DB_DSN` in `.env`
3. Ensure the user has proper permissions

### "No API Key found"

1. Check `.env` file exists in `backend/`
2. Verify `GEMINI_API_KEY` is set correctly
3. Or export it: `export GEMINI_API_KEY='your_key'`

### Speech recognition not working

- Chrome/Edge required (uses Web Speech API)
- Microphone permissions must be granted
- HTTPS required in production

### Frontend can't reach backend

1. Check backend is running on port 5000
2. Verify Vite proxy in `vite.config.js`
3. Check for CORS errors in browser console

## Development

### Adding New Components

```bash
# Components go in frontend/src/components/
touch frontend/src/components/NewComponent.jsx
```

### Database Migrations

Currently using auto-initialization. For production, consider adding Alembic:

```bash
pip install alembic
alembic init migrations
```

### Building for Production

```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

## Docker Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   Frontend   │───▶│   Backend    │───▶│  Postgres │  │
│  │   (nginx)    │    │   (Flask)    │    │    (db)   │  │
│  │   port 80    │    │  port 5000   │    │ port 5432 │  │
│  └──────────────┘    └──────────────┘    └───────────┘  │
│         │                   │                   │        │
└─────────┼───────────────────┼───────────────────┼────────┘
          │                   │                   │
      localhost:80      localhost:5000      localhost:5432
```

| Container | Image | Purpose |
|-----------|-------|---------|
| jtutor-frontend | nginx:alpine | Serves React build, proxies /api |
| jtutor-backend | python:3.11-slim | Flask API server |
| jtutor-db | postgres:16-alpine | Persistent data storage |

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ☕ and 日本語 practice in mind.
