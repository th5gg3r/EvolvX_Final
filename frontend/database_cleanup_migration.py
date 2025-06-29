#!/usr/bin/env python3
"""
Database Cleanup Migration Script
================================

This script performs cleanup and optimization of the EvolvX database
after the recent backend modifications and improvements.

Tasks performed:
1. Exercise database consistency check and cleanup
2. Ranking data recalculation with new thresholds
3. Orphaned data cleanup
4. Database integrity verification
5. Performance optimizations

Usage: python3 database_cleanup_migration.py
"""

import sys
import os
import sqlite3
import datetime
from pathlib import Path

# Add the backend directory to the path to import app modules
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

def get_database_path():
    """Get the path to the SQLite database"""
    db_paths = [
        backend_path / "instance" / "evolvx.db",
        backend_path / "evolvx.db"
    ]
    
    for path in db_paths:
        if path.exists():
            return str(path)
    
    raise FileNotFoundError("Could not find evolvx.db database file")

def backup_database(db_path):
    """Create a backup of the database before migration"""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.backup_{timestamp}"
    
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"✅ Database backed up to: {backup_path}")
    return backup_path

def check_exercise_data_consistency(cursor):
    """Check and fix exercise data consistency"""
    print("🔍 Checking exercise data consistency...")
    
    # Count exercises
    cursor.execute("SELECT COUNT(*) FROM exercises")
    exercise_count = cursor.fetchone()[0]
    print(f"   Current exercise count: {exercise_count}")
    
    # Check for duplicate exercises
    cursor.execute("""
        SELECT name, COUNT(*) as count 
        FROM exercises 
        GROUP BY LOWER(name) 
        HAVING count > 1
    """)
    duplicates = cursor.fetchall()
    
    if duplicates:
        print(f"   ⚠️  Found {len(duplicates)} duplicate exercise names:")
        for name, count in duplicates:
            print(f"      - {name} ({count} instances)")
        
        # Remove duplicates, keeping the first one
        for name, _ in duplicates:
            cursor.execute("""
                DELETE FROM exercises 
                WHERE exercise_id NOT IN (
                    SELECT MIN(exercise_id) 
                    FROM exercises 
                    WHERE LOWER(name) = LOWER(?)
                )
                AND LOWER(name) = LOWER(?)
            """, (name, name))
        print("   ✅ Duplicate exercises removed")
    else:
        print("   ✅ No duplicate exercises found")

def recalculate_ranking_data(cursor):
    """Recalculate ranking data with new thresholds"""
    print("🏆 Recalculating ranking data with new thresholds...")
    
    def get_rank_tier_from_points(total_points):
        """New 5-tier ranking system"""
        if total_points >= 500:
            return 'Diamond'
        elif total_points >= 300:
            return 'Platinum'
        elif total_points >= 150:
            return 'Gold'
        elif total_points >= 50:
            return 'Silver'
        else:
            return 'Bronze'
    
    # Update user rankings with new tier calculations
    cursor.execute("SELECT user_id, mmr_score FROM user_rankings")
    rankings = cursor.fetchall()
    
    updated_count = 0
    for user_id, mmr_score in rankings:
        new_tier = get_rank_tier_from_points(mmr_score or 0)
        cursor.execute("""
            UPDATE user_rankings 
            SET rank_tier = ? 
            WHERE user_id = ? AND rank_tier != ?
        """, (new_tier, user_id, new_tier))
        if cursor.rowcount > 0:
            updated_count += 1
    
    print(f"   ✅ Updated {updated_count} user ranking tiers")

def cleanup_orphaned_data(cursor):
    """Remove orphaned data and fix referential integrity"""
    print("🧹 Cleaning up orphaned data...")
    
    # Clean up workout exercises without valid workouts
    cursor.execute("""
        DELETE FROM workout_exercises 
        WHERE workout_id NOT IN (SELECT workout_id FROM workouts)
    """)
    orphaned_workout_exercises = cursor.rowcount
    
    # Clean up shared workout participants without valid shared workouts
    cursor.execute("""
        DELETE FROM shared_workout_participants 
        WHERE shared_workout_id NOT IN (SELECT shared_workout_id FROM shared_workouts)
    """)
    orphaned_participants = cursor.rowcount
    
    # Clean up user rankings for non-existent users
    cursor.execute("""
        DELETE FROM user_rankings 
        WHERE user_id NOT IN (SELECT user_id FROM users)
    """)
    orphaned_rankings = cursor.rowcount
    
    print(f"   ✅ Removed {orphaned_workout_exercises} orphaned workout exercises")
    print(f"   ✅ Removed {orphaned_participants} orphaned shared workout participants")
    print(f"   ✅ Removed {orphaned_rankings} orphaned user rankings")

def verify_database_integrity(cursor):
    """Verify database integrity and constraints"""
    print("🔍 Verifying database integrity...")
    
    # Check foreign key constraints
    cursor.execute("PRAGMA foreign_key_check")
    fk_violations = cursor.fetchall()
    
    if fk_violations:
        print(f"   ⚠️  Found {len(fk_violations)} foreign key violations:")
        for violation in fk_violations:
            print(f"      - {violation}")
    else:
        print("   ✅ All foreign key constraints are valid")
    
    # Check for NULL values in required fields
    checks = [
        ("users", "email", "User emails"),
        ("users", "username", "User usernames"),
        ("workouts", "user_id", "Workout user IDs"),
        ("exercises", "name", "Exercise names")
    ]
    
    issues_found = False
    for table, column, description in checks:
        cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} IS NULL")
        null_count = cursor.fetchone()[0]
        if null_count > 0:
            print(f"   ⚠️  Found {null_count} NULL values in {description}")
            issues_found = True
    
    if not issues_found:
        print("   ✅ No NULL values found in required fields")

def optimize_database(cursor, conn):
    """Optimize database performance"""
    print("⚡ Optimizing database performance...")
    
    # Analyze tables for query optimization
    cursor.execute("ANALYZE")
    
    # Commit before VACUUM (required for SQLite)
    conn.commit()
    
    # Vacuum database to reclaim space (must be outside transaction)
    cursor.execute("VACUUM")
    
    print("   ✅ Database analyzed and vacuumed")

def run_migration():
    """Run the complete database cleanup migration"""
    print("🚀 Starting Database Cleanup Migration")
    print("=" * 50)
    
    try:
        # Get database path
        db_path = get_database_path()
        print(f"📁 Database location: {db_path}")
        
        # Create backup
        backup_path = backup_database(db_path)
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Run cleanup tasks
        check_exercise_data_consistency(cursor)
        recalculate_ranking_data(cursor)
        cleanup_orphaned_data(cursor)
        verify_database_integrity(cursor)
        
        # Commit changes before optimization
        conn.commit()
        
        optimize_database(cursor, conn)
        
        print("\n" + "=" * 50)
        print("✅ Database cleanup migration completed successfully!")
        print(f"📄 Backup saved at: {backup_path}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_migration()