#!/usr/bin/env python3
"""
Seed the database with all required template exercises
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Template exercises required by frontend
TEMPLATE_EXERCISES = [
    # Push Day Template
    {"name": "Bench Press", "muscle_group": "Chest", "is_compound": True},
    {"name": "Incline Bench Press", "muscle_group": "Chest", "is_compound": True},
    {"name": "Dips", "muscle_group": "Chest", "is_compound": True},
    {"name": "Overhead Press", "muscle_group": "Shoulders", "is_compound": True},
    {"name": "Lateral Raise", "muscle_group": "Shoulders", "is_compound": False},
    {"name": "Tricep Extension", "muscle_group": "Arms", "is_compound": False},
    
    # Pull Day Template
    {"name": "Pull-Up", "muscle_group": "Back", "is_compound": True},
    {"name": "Deadlift", "muscle_group": "Back", "is_compound": True},
    {"name": "Bent Over Row", "muscle_group": "Back", "is_compound": True},
    {"name": "Lat Pulldown", "muscle_group": "Back", "is_compound": False},
    {"name": "Barbell Curl", "muscle_group": "Arms", "is_compound": False},
    {"name": "Hammer Curl", "muscle_group": "Arms", "is_compound": False},
    
    # Leg Day Template
    {"name": "Squat", "muscle_group": "Legs", "is_compound": True},
    {"name": "Romanian Deadlift", "muscle_group": "Legs", "is_compound": True},
    {"name": "Leg Press", "muscle_group": "Legs", "is_compound": False},
    {"name": "Leg Curl", "muscle_group": "Legs", "is_compound": False},
    {"name": "Leg Extension", "muscle_group": "Legs", "is_compound": False},
    {"name": "Calf Raise", "muscle_group": "Legs", "is_compound": False},
    
    # Full Body Template (some overlap with above)
    {"name": "Plank", "muscle_group": "Core", "is_compound": True},
]

def create_exercise_if_not_exists(name, muscle_group, is_compound=False, description=""):
    """Create an exercise if it doesn't already exist"""
    print(f"CREATE TABLE IF NOT EXISTS exercises (")
    print(f"    exercise_id INTEGER PRIMARY KEY,")
    print(f"    name TEXT NOT NULL,")
    print(f"    muscle_group TEXT NOT NULL,")
    print(f"    description TEXT,")
    print(f"    is_compound BOOLEAN DEFAULT 0")
    print(f");")
    print()
    
    # Insert exercise if not exists
    print(f"INSERT OR IGNORE INTO exercises (name, muscle_group, description, is_compound)")
    print(f"VALUES ('{name}', '{muscle_group}', '{description}', {1 if is_compound else 0});")
    print()

def generate_sql_script():
    """Generate SQL script to insert all template exercises"""
    print("-- Template Exercise Seeding Script")
    print("-- Generated for EvolvX Backend")
    print("-- Ensures all workout template exercises exist")
    print()
    
    # Create table structure
    create_exercise_if_not_exists("", "", False)
    
    print("-- Insert template exercises")
    for exercise in TEMPLATE_EXERCISES:
        name = exercise["name"].replace("'", "''")  # Escape single quotes
        muscle_group = exercise["muscle_group"]
        is_compound = exercise["is_compound"]
        
        print(f"INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)")
        print(f"VALUES ('{name}', '{muscle_group}', {1 if is_compound else 0});")
    
    print()
    print("-- Verify template exercises were created")
    print("SELECT COUNT(*) as total_exercises FROM exercises;")
    print()
    
    template_names = [ex["name"] for ex in TEMPLATE_EXERCISES]
    names_list = "', '".join(template_names)
    print(f"SELECT COUNT(*) as template_exercises FROM exercises WHERE name IN ('{names_list}');")
    print()
    print("-- List all template exercises")
    print(f"SELECT name, muscle_group, is_compound FROM exercises WHERE name IN ('{names_list}') ORDER BY muscle_group, name;")

if __name__ == "__main__":
    generate_sql_script()