#!/bin/bash

# --- Configuration ---
# Ensure script fails if any command errors out
set -e

# Check for API Keys (Support both GEMINI_API_KEY and AI_API_KEY)
if [ -n "$GEMINI_API_KEY" ]; then
    echo "✅ Found GEMINI_API_KEY"
elif [ -n "$AI_API_KEY" ]; then
    echo "✅ Found AI_API_KEY"
else
    echo "❌ Error: No API Key found."
    echo "👉 Please set either GEMINI_API_KEY or AI_API_KEY:"
    echo "   export GEMINI_API_KEY='your_key'"
    echo "   Then run this script again."
    exit 1
fi

echo "🚀 Initializing Japanese Tutor..."

# --- Backend Setup ---
echo "🐍 Setting up Python Backend..."
cd backend

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install requirements (quietly)
echo "   Checking dependencies..."
pip install -r requirements.txt > /dev/null

# Start Backend in background
echo "   Starting Server..."
python server.py &
BACKEND_PID=$!

# Wait a moment for backend to spin up
sleep 2

# Go back to root
cd ..

# --- Cleanup Trap ---
# This ensures that when you Ctrl+C the script, the Python server dies too
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    # Kill the backend process if it exists
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
    fi
    exit
}
trap cleanup EXIT INT TERM

# --- Frontend Setup ---
echo "⚛️  Starting React Frontend..."
cd frontend

# Check if node_modules exists to speed up launch
if [ ! -d "node_modules" ]; then
    echo "   Installing Node dependencies (this runs once)..."
    npm install
fi

# Start Vite Dev Server
npm run dev
