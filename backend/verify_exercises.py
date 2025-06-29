#!/usr/bin/env python3
"""
Verify that all required template exercises exist in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Exercise

def verify_template_exercises():
    """Check if all template exercises exist in the database"""
    
    template_requirements = {
        "Push Day": ["Bench Press", "Incline Bench Press", "Dips", "Overhead Press", "Lateral Raise", "Tricep Extension"],
        "Pull Day": ["Pull-Up", "Deadlift", "Bent Over Row", "Lat Pulldown", "Barbell Curl", "Hammer Curl"], 
        "Leg Day": ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Leg Extension", "Calf Raise"],
        "Full Body": ["Bench Press", "Bent Over Row", "Squat", "Overhead Press", "Barbell Curl", "Plank"]
    }
    
    print("🔍 Verifying Exercise Database for Template Compatibility")
    print("=" * 60)
    
    with app.app_context():
        # Get all exercises currently in database
        all_exercises = Exercise.query.all()
        exercise_names = {ex.name for ex in all_exercises}
        
        print(f"📊 Total exercises in database: {len(all_exercises)}")
        print()
        
        all_templates_ready = True
        missing_total = 0
        
        for template_name, required_exercises in template_requirements.items():
            print(f"📋 {template_name} Template:")
            available = []
            missing = []
            
            for exercise_name in required_exercises:
                if exercise_name in exercise_names:
                    available.append(exercise_name)
                    print(f"  ✅ {exercise_name}")
                else:
                    missing.append(exercise_name)
                    print(f"  ❌ {exercise_name} - MISSING")
            
            if missing:
                all_templates_ready = False
                missing_total += len(missing)
                print(f"  ⚠️  Template Status: INCOMPLETE ({len(available)}/{len(required_exercises)} exercises)")
            else:
                print(f"  🎯 Template Status: READY ({len(available)}/{len(required_exercises)} exercises)")
            
            print()
        
        print("=" * 60)
        if all_templates_ready:
            print("🎉 SUCCESS: All templates are ready! Exercise database is complete.")
        else:
            print(f"❌ MISSING: {missing_total} exercises need to be added to complete templates.")
            print()
            print("🔧 To fix missing exercises, you can:")
            print("1. Run the exercise seeding endpoint: POST /api/admin/seed-exercises")
            print("2. Add missing exercises manually via the admin interface")
            print("3. Check the exercise database setup in create_db.py")
        
        print("=" * 60)
        return all_templates_ready, missing_total

if __name__ == "__main__":
    ready, missing = verify_template_exercises()
    sys.exit(0 if ready else 1)