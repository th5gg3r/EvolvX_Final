-- Template Exercise Seeding Script
-- Generated for EvolvX Backend
-- Ensures all workout template exercises exist

CREATE TABLE IF NOT EXISTS exercises (
    exercise_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    description TEXT,
    is_compound BOOLEAN DEFAULT 0
);

INSERT OR IGNORE INTO exercises (name, muscle_group, description, is_compound)
VALUES ('', '', '', 0);

-- Insert template exercises
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Bench Press', 'Chest', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Incline Bench Press', 'Chest', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Dips', 'Chest', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Overhead Press', 'Shoulders', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Lateral Raise', 'Shoulders', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Tricep Extension', 'Arms', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Pull-Up', 'Back', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Deadlift', 'Back', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Bent Over Row', 'Back', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Lat Pulldown', 'Back', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Barbell Curl', 'Arms', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Hammer Curl', 'Arms', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Squat', 'Legs', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Romanian Deadlift', 'Legs', 1);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Leg Press', 'Legs', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Leg Curl', 'Legs', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Leg Extension', 'Legs', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Calf Raise', 'Legs', 0);
INSERT OR IGNORE INTO exercises (name, muscle_group, is_compound)
VALUES ('Plank', 'Core', 1);

-- Verify template exercises were created
SELECT COUNT(*) as total_exercises FROM exercises;

SELECT COUNT(*) as template_exercises FROM exercises WHERE name IN ('Bench Press', 'Incline Bench Press', 'Dips', 'Overhead Press', 'Lateral Raise', 'Tricep Extension', 'Pull-Up', 'Deadlift', 'Bent Over Row', 'Lat Pulldown', 'Barbell Curl', 'Hammer Curl', 'Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Plank');

-- List all template exercises
SELECT name, muscle_group, is_compound FROM exercises WHERE name IN ('Bench Press', 'Incline Bench Press', 'Dips', 'Overhead Press', 'Lateral Raise', 'Tricep Extension', 'Pull-Up', 'Deadlift', 'Bent Over Row', 'Lat Pulldown', 'Barbell Curl', 'Hammer Curl', 'Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Plank') ORDER BY muscle_group, name;
