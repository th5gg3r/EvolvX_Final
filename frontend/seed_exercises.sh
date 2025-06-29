#!/bin/bash

echo "🌱 Starting Exercise Database Seeding..."

cd ../backend

# Set Firebase URL
export FIREBASE_DATABASE_URL="https://evolvx-ea485-default-rtdb.asia-southeast1.firebasedatabase.app/"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Run the seeding script
echo "Running exercise seeding..."
python3 seed_now.py

echo "Exercise seeding completed!"