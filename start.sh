#!/bin/bash

# --- Configuration ---
set -e

# Check for API Keys
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
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install requirements
echo "   Checking dependencies..."
pip install -r requirements.txt -q

# Start Backend in background
echo "   Starting Flask Server on port 5000..."
python app.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "   Waiting for backend..."
for i in {1..10}; do
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "   ✅ Backend ready!"
        break
    fi
    sleep 1
done

cd ..

# --- Cleanup Trap ---
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
    fi
    exit
}
trap cleanup EXIT INT TERM

# --- Frontend Setup ---
echo "⚛️  Starting React Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "   Installing Node dependencies..."
    npm install
fi

npm run dev
