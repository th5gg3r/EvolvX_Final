#!/bin/bash
cd ../backend
export FIREBASE_DATABASE_URL="https://evolvx-ea485-default-rtdb.asia-southeast1.firebasedatabase.app/"
echo "Starting backend with Firebase URL: $FIREBASE_DATABASE_URL"

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Try python3 first, then python
if command -v python3 &> /dev/null; then
    echo "Using python3..."
    python3 app.py
elif command -v python &> /dev/null; then
    echo "Using python..."
    python app.py
else
    echo "❌ Python not found! Please install Python."
    exit 1
fi