from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
import os
import datetime

import firebase_admin
from firebase_admin import credentials, db as firebase_db

firebase_enabled = True

app = Flask(__name__)

CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=1)

jwt = JWTManager(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///evolvx.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

import traceback

FIREBASE_CRED = os.path.join(os.getcwd(), 'firebase-credentials.json')
FIREBASE_DB_URL = os.getenv('FIREBASE_DATABASE_URL', 'https://evolvx-ea485-default-rtdb.asia-southeast1.firebasedatabase.app/')

if firebase_enabled and os.path.isfile(FIREBASE_CRED):
    try:
        cred = credentials.Certificate(FIREBASE_CRED)
        firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})
        print("Firebase initialized")
    except Exception as e:
        print("Firebase init failed:", e)

def error_response(message, status_code, error_code=None, error_type=None):
    response = {'error': message, 'status_code': status_code}
    if error_code:
        response['error_code'] = error_code
    if error_type:
        response['error_type'] = error_type
    return jsonify(response), status_code

def validation_error(field, message=None):
    msg = message or f'Invalid or missing field: {field}'
    return error_response(msg, 400, 'VALIDATION_ERROR', 'validation')

def not_found_error(resource='Resource'):
    return error_response(f'{resource} not found', 404, 'NOT_FOUND', 'client')

def unauthorized_error(message='Unauthorized access'):
    return error_response(message, 401, 'UNAUTHORIZED', 'auth')

def forbidden_error(message='Access forbidden'):
    return error_response(message, 403, 'FORBIDDEN', 'auth')

def server_error(message='Internal server error'):
    return error_response(message, 500, 'INTERNAL_ERROR', 'server')

def validate_fields(data, fields):
    for field in fields:
        if field not in data:
            return validation_error(field)
    return None

@app.errorhandler(404)
def handle_not_found(e):
    return error_response('Endpoint not found', 404, 'ENDPOINT_NOT_FOUND', 'client')

@app.errorhandler(405)
def handle_method_not_allowed(e):
    return error_response('Method not allowed', 405, 'METHOD_NOT_ALLOWED', 'client')

@app.errorhandler(500)
def handle_internal_error(e):
    return error_response('Internal server error', 500, 'INTERNAL_ERROR', 'server')

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20))
    height = db.Column(db.Float)
    weight = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    workouts = db.relationship('Workout', backref='user', lazy=True)
    rankings = db.relationship('UserRanking', backref='user', lazy=True)

class Workout(db.Model):
    __tablename__ = 'workouts'
    
    workout_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    workout_name = db.Column(db.String(100), nullable=False)
    workout_date = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer)  # in minutes
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    exercises = db.relationship('WorkoutExercise', backref='workout', lazy=True, cascade="all, delete-orphan")

class Exercise(db.Model):
    __tablename__ = 'exercises'
    
    exercise_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    muscle_group = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    is_compound = db.Column(db.Boolean, default=False)

class WorkoutExercise(db.Model):
    __tablename__ = 'workout_exercises'
    
    workout_exercise_id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.workout_id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.exercise_id'), nullable=False)
    sets = db.Column(db.Integer, nullable=False)
    reps = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    exercise = db.relationship('Exercise', backref='workout_exercises', lazy=True)

class UserRanking(db.Model):
    __tablename__ = 'user_rankings'
    
    ranking_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    muscle_group = db.Column(db.String(50), nullable=False)
    mmr_score = db.Column(db.Integer, nullable=False)
    rank_tier = db.Column(db.String(20), nullable=False)  # Bronze, Silver, Gold, etc.
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SharedWorkout(db.Model):
    __tablename__ = 'shared_workouts'
    
    shared_workout_id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    workout_name = db.Column(db.String(100), nullable=False)
    workout_date = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    participants = db.relationship('SharedWorkoutParticipant', backref='shared_workout', lazy=True, cascade="all, delete-orphan")
    creator = db.relationship('User', backref='created_workouts', lazy=True)

class SharedWorkoutParticipant(db.Model):
    __tablename__ = 'shared_workout_participants'
    
    participant_id = db.Column(db.Integer, primary_key=True)
    shared_workout_id = db.Column(db.Integer, db.ForeignKey('shared_workouts.shared_workout_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    user = db.relationship('User', backref='shared_workout_participations', lazy=True)


class Friend(db.Model):
    __tablename__ = 'friends'
    
    friendship_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    user = db.relationship('User', foreign_keys=[user_id], backref='friend_requests_sent', lazy=True)
    friend = db.relationship('User', foreign_keys=[friend_id], backref='friend_requests_received', lazy=True)


class Achievement(db.Model):
    __tablename__ = 'achievements'
    
    achievement_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))  # Material icon name
    category = db.Column(db.String(50), nullable=False)  # workout, social, milestone, volume
    unlock_criteria = db.Column(JSON)  # Flexible criteria storage
    points_reward = db.Column(db.Integer, default=0)  # Bonus points for unlocking
    rarity = db.Column(db.String(20), default='common')  # common, rare, epic, legendary
    is_hidden = db.Column(db.Boolean, default=False)  # Hidden until unlocked
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    user_achievements = db.relationship('UserAchievement', backref='achievement', lazy=True)

class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'
    
    user_achievement_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.achievement_id'), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    progress_data = db.Column(JSON)  # Store progress info when unlocked
    
    user = db.relationship('User', backref='achievements', lazy=True)

class Challenge(db.Model):
    __tablename__ = 'challenges'
    
    challenge_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    challenge_type = db.Column(db.String(50), nullable=False)  # weekly, monthly, daily, community, friend_battle
    category = db.Column(db.String(50))  # workout_count, volume, social
    icon = db.Column(db.String(50))
    
    # Challenge criteria and rewards
    target_value = db.Column(db.Integer, nullable=False)
    target_unit = db.Column(db.String(50))  # workouts, volume, days, etc.
    points_reward = db.Column(db.Integer, default=0)
    bonus_reward = db.Column(JSON)  # Additional rewards like achievements
    
    # Timing
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    
    # Challenge settings
    is_active = db.Column(db.Boolean, default=True)
    is_global = db.Column(db.Boolean, default=True)  # Global vs friend-only
    max_participants = db.Column(db.Integer)  # Limit participants
    difficulty = db.Column(db.String(20), default='medium')  # easy, medium, hard, extreme
    
    # Creator (for friend battles)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    invited_user_ids = db.Column(JSON)  # For friend battles
    
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    participants = db.relationship('UserChallenge', backref='challenge', lazy=True)
    creator = db.relationship('User', backref='created_challenges', lazy=True)

class UserChallenge(db.Model):
    __tablename__ = 'user_challenges'
    
    user_challenge_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenges.challenge_id'), nullable=False)
    
    # Progress tracking
    current_progress = db.Column(db.Integer, default=0)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime)
    final_rank = db.Column(db.Integer)  # Final ranking in challenge
    
    # Participation details
    joined_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    progress_history = db.Column(JSON, default=list)  # Track daily progress
    
    user = db.relationship('User', backref='challenge_participations', lazy=True)

class PersonalRecord(db.Model):
    __tablename__ = 'personal_records'
    
    pr_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.exercise_id'), nullable=False)
    record_type = db.Column(db.String(20), nullable=False)  # 'max_weight', 'max_reps', 'max_volume'
    record_value = db.Column(db.Float, nullable=False)
    sets = db.Column(db.Integer)  # Number of sets when record was achieved
    reps = db.Column(db.Integer)  # Number of reps when record was achieved
    weight = db.Column(db.Float)  # Weight when record was achieved
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.workout_id'))  # Workout where record was set
    achieved_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    previous_record = db.Column(db.Float)  # Previous record value for comparison
    
    user = db.relationship('User', backref='personal_records', lazy=True)
    exercise = db.relationship('Exercise', backref='personal_records', lazy=True)
    workout = db.relationship('Workout', backref='personal_records', lazy=True)

# MMR Calculation
def calculate_user_stats(user_id):
    workouts = Workout.query.filter_by(user_id=user_id).order_by(Workout.workout_date.asc()).all()
    
    if not workouts:
        return {'total_workouts': 0, 'total_exercises': 0, 'workout_days': 0, 
                'personal_records': 0, 'consistency_score': 0}
    
    total_workouts = len(workouts)
    
    exercises = set()
    for workout in workouts:
        for exercise in workout.exercises:
            exercises.add(exercise.exercise.name.lower())
    
    first_date = workouts[0].workout_date.date()
    last_date = workouts[-1].workout_date.date()
    workout_days = (last_date - first_date).days + 1
    
    weeks = max(1, workout_days / 7)
    consistency_score = min(100, int((total_workouts / weeks) * 20))
    
    personal_records = PersonalRecord.query.filter_by(user_id=user_id).count()
    
    return {
        'total_workouts': total_workouts,
        'total_exercises': len(exercises),
        'workout_days': workout_days,
        'personal_records': personal_records,
        'consistency_score': consistency_score
    }


def calculate_ranking_points(user_stats):
    points = (user_stats['total_workouts'] * 2 +
              user_stats['total_exercises'] // 5 +
              user_stats['consistency_score'] +
              user_stats['personal_records'] * 10 +
              user_stats['workout_days'] // 7)
    
    return max(0, int(points))

def get_rank_tier(points):
    if points >= 1000:
        return 'Diamond Titan'
    elif points >= 600:
        return 'Platinum Spartan'
    elif points >= 300:
        return 'Gold Gladiator'
    elif points >= 100:
        return 'Silver Warrior'
    else:
        return 'Bronze Fighter'

def update_user_mmr(user_id):
    try:
        print(f"🔄 Updating MMR for user {user_id}")
        
        # Calculate user stats
        user_stats = calculate_user_stats(user_id)
        
        # Calculate MMR points
        mmr_points = calculate_ranking_points(user_stats)
        
        # Get rank tier
        rank_tier = get_rank_tier(mmr_points)
        
        print(f"📊 User {user_id} stats: {user_stats}")
        print(f"🎯 Calculated MMR: {mmr_points}, Rank: {rank_tier}")
        
        # Update or create overall ranking entry
        overall_ranking = UserRanking.query.filter_by(
            user_id=user_id, 
            muscle_group='overall'
        ).first()
        
        if overall_ranking:
            # Update existing
            overall_ranking.mmr_score = mmr_points
            overall_ranking.rank_tier = rank_tier
            overall_ranking.updated_at = datetime.datetime.utcnow()
        else:
            # Create new
            overall_ranking = UserRanking(
                user_id=user_id,
                muscle_group='overall',
                mmr_score=mmr_points,
                rank_tier=rank_tier
            )
            db.session.add(overall_ranking)
        
        db.session.commit()
        print(f"✅ MMR updated successfully for user {user_id}: {mmr_points} MMR, {rank_tier}")
        
        return mmr_points, rank_tier
        
    except Exception as e:
        print(f"❌ Error updating MMR for user {user_id}: {e}")
        db.session.rollback()
        return None, None

# API Routes

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    error = validate_fields(data, ['username', 'email', 'password', 'date_of_birth'])
    if error:
        return error
    
    if User.query.filter_by(email=data['email']).first():
        return validation_error('email', 'Email already registered')
    
    if User.query.filter_by(username=data['username']).first():
        return validation_error('username', 'Username already taken')
    
    try:
        dob = datetime.datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        
        new_user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            date_of_birth=dob,
            gender=data.get('gender'),
            height=data.get('height'),
            weight=data.get('weight')
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        if firebase_enabled:
            ref = firebase_db.reference('users/' + str(new_user.user_id))
            ref.set({
                'username': new_user.username,
                'online_status': 'offline',
                'last_active': datetime.datetime.utcnow().isoformat()
            })
        
        access_token = create_access_token(identity=str(new_user.user_id))
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': new_user.user_id,
            'access_token': access_token
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return server_error(f'Registration failed: {str(e)}')

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    error = validate_fields(data, ['email', 'password'])
    if error:
        return error
    
    try:
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return unauthorized_error('Invalid email or password')
        
        access_token = create_access_token(identity=str(user.user_id))
        
        if firebase_enabled:
            try:
                ref = firebase_db.reference('users/' + str(user.user_id))
                ref.update({
                    'online_status': 'online',
                    'last_active': datetime.datetime.utcnow().isoformat()
                })
            except Exception as firebase_error:
                print(f"Firebase update failed: {firebase_error}")
        
        return jsonify({
            'message': 'Login successful',
            'user_id': user.user_id,
            'username': user.username,
            'access_token': access_token
        }), 200
    
    except Exception as e:
        return server_error(f'Login failed: {str(e)}')

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = int(get_jwt_identity())
    
    try:
        user = User.query.get(current_user_id)
        
        if not user:
            return not_found_error('User')
        
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'date_of_birth': user.date_of_birth.isoformat(),
            'gender': user.gender,
            'height': user.height,
            'weight': user.weight,
            'created_at': user.created_at.isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    try:
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update user fields
        updateable_fields = ['username', 'gender', 'height', 'weight']
        for field in updateable_fields:
            if field in data:
                setattr(user, field, data[field])
        
        # Special handling for password update
        if 'password' in data and data['password']:
            user.password_hash = generate_password_hash(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user_id': user.user_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Workout Routes
@app.route('/api/workouts', methods=['GET'])
@jwt_required()
def get_workouts():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Query workouts with pagination
        workouts_query = Workout.query.filter_by(user_id=current_user_id).order_by(Workout.workout_date.desc())
        workouts_paginated = workouts_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for workout in workouts_paginated.items:
            workout_data = {
                'workout_id': workout.workout_id,
                'workout_name': workout.workout_name,
                'workout_date': workout.workout_date.isoformat(),
                'duration': workout.duration,
                'notes': workout.notes,
                'created_at': workout.created_at.isoformat(),
                'exercises': []
            }
            
            for workout_exercise in workout.exercises:
                exercise = workout_exercise.exercise
                exercise_data = {
                    'exercise_id': exercise.exercise_id,
                    'name': exercise.name,
                    'muscle_group': exercise.muscle_group,
                    'sets': workout_exercise.sets,
                    'reps': workout_exercise.reps,
                    'weight': workout_exercise.weight
                }
                workout_data['exercises'].append(exercise_data)
            
            result.append(workout_data)
        
        return jsonify({
            'workouts': result,
            'total': workouts_paginated.total,
            'pages': workouts_paginated.pages,
            'current_page': page
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts', methods=['POST'])
@jwt_required()
def create_workout():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    error = validate_fields(data, ['workout_name', 'workout_date', 'exercises'])
    if error:
        return error
    
    try:
        workout_date = datetime.datetime.fromisoformat(data['workout_date'])
        
        new_workout = Workout(
            user_id=current_user_id,
            workout_name=data['workout_name'],
            workout_date=workout_date,
            duration=data.get('duration'),
            notes=data.get('notes')
        )
        
        db.session.add(new_workout)
        db.session.flush()  # Get workout_id without committing
        
        # Add exercises to workout
        for exercise_data in data['exercises']:
            # Validate required exercise fields
            if 'exercise_id' not in exercise_data or 'sets' not in exercise_data or 'reps' not in exercise_data:
                db.session.rollback()
                return jsonify({'error': 'Each exercise must have exercise_id, sets, and reps'}), 400
            
            # Check if exercise exists
            exercise = Exercise.query.get(exercise_data['exercise_id'])
            if not exercise:
                db.session.rollback()
                return jsonify({'error': f'Exercise with ID {exercise_data["exercise_id"]} not found'}), 404
            
            # Create workout exercise
            workout_exercise = WorkoutExercise(
                workout_id=new_workout.workout_id,
                exercise_id=exercise_data['exercise_id'],
                sets=exercise_data['sets'],
                reps=exercise_data['reps'],
                weight=exercise_data.get('weight')
            )
            
            db.session.add(workout_exercise)
        
        db.session.commit()
        
        # Update user MMR based on new workout
        update_user_mmr(current_user_id)
        
        # Update user rankings based on workout
        update_user_rankings(current_user_id)
        
        # Check for newly unlocked achievements
        newly_unlocked = check_and_unlock_achievements(current_user_id)
        
        # Update challenge progress
        newly_completed_challenges = update_challenge_progress(current_user_id)
        
        # Check for new personal records
        new_personal_records = check_and_update_personal_records(current_user_id, new_workout.workout_id)
        
        response_data = {
            'message': 'Workout created successfully',
            'workout_id': new_workout.workout_id
        }
        
        # Include newly unlocked achievements in response
        if newly_unlocked:
            response_data['achievements_unlocked'] = []
            for item in newly_unlocked:
                achievement = item['achievement']
                response_data['achievements_unlocked'].append({
                    'achievement_id': achievement.achievement_id,
                    'name': achievement.name,
                    'description': achievement.description,
                    'icon': achievement.icon,
                    'rarity': achievement.rarity,
                    'points_reward': achievement.points_reward
                })
        
        # Include newly completed challenges in response
        if newly_completed_challenges:
            response_data['challenges_completed'] = []
            for item in newly_completed_challenges:
                challenge = item['challenge']
                response_data['challenges_completed'].append({
                    'challenge_id': challenge.challenge_id,
                    'name': challenge.name,
                    'description': challenge.description,
                    'category': challenge.category,
                    'points_reward': challenge.points_reward,
                    'final_progress': item['final_progress'],
                    'target_value': challenge.target_value
                })
        
        # ──── Firebase Real-time Sync ────
        if firebase_enabled:
            # Sync achievement unlocks to Firebase
            if newly_unlocked:
                for item in newly_unlocked:
                    achievement = item['achievement']
                    broadcast_achievement_unlock(current_user_id, {
                        'achievement_id': achievement.achievement_id,
                        'name': achievement.name,
                        'description': achievement.description,
                        'icon': achievement.icon,
                        'rarity': achievement.rarity,
                        'points_reward': achievement.points_reward
                    })
            
            # Sync challenge completions to Firebase
            if newly_completed_challenges:
                for item in newly_completed_challenges:
                    challenge = item['challenge']
                    broadcast_challenge_completion(current_user_id, {
                        'challenge_id': challenge.challenge_id,
                        'name': challenge.name,
                        'category': challenge.category,
                        'difficulty': getattr(challenge, 'difficulty', 'medium'),
                        'points_reward': challenge.points_reward,
                        'final_progress': item['final_progress'],
                        'target_value': challenge.target_value
                    })
                    
                    # Update challenge leaderboard in Firebase
                    leaderboard = get_challenge_leaderboard(challenge.challenge_id)
                    sync_challenge_progress_to_firebase(challenge.challenge_id, leaderboard)
            
            # Removed streak functionality as requested
            
            # Sync updated user ranking to Firebase
            ranking_data = calculate_liftoff_ranking_points(current_user_id)
            ranking_data['rank_tier'] = get_rank_tier_from_points(ranking_data['total_points'])
            ranking_data['rank_color'] = get_rank_color(ranking_data['rank_tier'])
            sync_user_ranking_to_firebase(current_user_id, ranking_data)
        
        return jsonify(response_data), 201
    
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:workout_id>', methods=['GET'])
@jwt_required()
def get_workout(workout_id):
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get workout
        workout = Workout.query.get(workout_id)
        
        if not workout:
            return jsonify({'error': 'Workout not found'}), 404
        
        # Check if workout belongs to current user
        if workout.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to workout'}), 403
        
        # Prepare workout data
        workout_data = {
            'workout_id': workout.workout_id,
            'workout_name': workout.workout_name,
            'workout_date': workout.workout_date.isoformat(),
            'duration': workout.duration,
            'notes': workout.notes,
            'created_at': workout.created_at.isoformat(),
            'exercises': []
        }
        
        for workout_exercise in workout.exercises:
            exercise = workout_exercise.exercise
            exercise_data = {
                'exercise_id': exercise.exercise_id,
                'name': exercise.name,
                'muscle_group': exercise.muscle_group,
                'sets': workout_exercise.sets,
                'reps': workout_exercise.reps,
                'weight': workout_exercise.weight
            }
            workout_data['exercises'].append(exercise_data)
        
        return jsonify(workout_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:workout_id>', methods=['PUT'])
@jwt_required()
def update_workout(workout_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    try:
        # Get workout
        workout = Workout.query.get(workout_id)
        
        if not workout:
            return jsonify({'error': 'Workout not found'}), 404
        
        # Check if workout belongs to current user
        if workout.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to workout'}), 403
        
        # Update workout fields
        updateable_fields = ['workout_name', 'duration', 'notes']
        for field in updateable_fields:
            if field in data:
                setattr(workout, field, data[field])
        
        # Update workout date if provided
        if 'workout_date' in data:
            try:
                workout.workout_date = datetime.datetime.fromisoformat(data['workout_date'])
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        # Update exercises if provided
        if 'exercises' in data:
            # Remove existing exercises
            for exercise in workout.exercises:
                db.session.delete(exercise)
            
            # Add new exercises
            for exercise_data in data['exercises']:
                # Validate required exercise fields
                if 'exercise_id' not in exercise_data or 'sets' not in exercise_data or 'reps' not in exercise_data:
                    db.session.rollback()
                    return jsonify({'error': 'Each exercise must have exercise_id, sets, and reps'}), 400
                
                # Check if exercise exists
                exercise = Exercise.query.get(exercise_data['exercise_id'])
                if not exercise:
                    db.session.rollback()
                    return jsonify({'error': f'Exercise with ID {exercise_data["exercise_id"]} not found'}), 404
                
                # Create workout exercise
                workout_exercise = WorkoutExercise(
                    workout_id=workout.workout_id,
                    exercise_id=exercise_data['exercise_id'],
                    sets=exercise_data['sets'],
                    reps=exercise_data['reps'],
                    weight=exercise_data.get('weight')
                )
                
                db.session.add(workout_exercise)
        
        db.session.commit()
        
        # Update user rankings based on workout
        update_user_rankings(current_user_id)
        
        # Check for newly unlocked achievements
        newly_unlocked = check_and_unlock_achievements(current_user_id)
        
        # Update challenge progress
        newly_completed_challenges = update_challenge_progress(current_user_id)
        
        response_data = {
            'message': 'Workout updated successfully',
            'workout_id': workout.workout_id
        }
        
        # Include newly unlocked achievements in response
        if newly_unlocked:
            response_data['achievements_unlocked'] = []
            for item in newly_unlocked:
                achievement = item['achievement']
                response_data['achievements_unlocked'].append({
                    'achievement_id': achievement.achievement_id,
                    'name': achievement.name,
                    'description': achievement.description,
                    'icon': achievement.icon,
                    'rarity': achievement.rarity,
                    'points_reward': achievement.points_reward
                })
        
        # Include newly completed challenges in response
        if newly_completed_challenges:
            response_data['challenges_completed'] = []
            for item in newly_completed_challenges:
                challenge = item['challenge']
                response_data['challenges_completed'].append({
                    'challenge_id': challenge.challenge_id,
                    'name': challenge.name,
                    'description': challenge.description,
                    'category': challenge.category,
                    'points_reward': challenge.points_reward,
                    'final_progress': item['final_progress'],
                    'target_value': challenge.target_value
                })
        
        # ──── Firebase Real-time Sync ────
        if firebase_enabled:
            # Sync achievement unlocks to Firebase
            if newly_unlocked:
                for item in newly_unlocked:
                    achievement = item['achievement']
                    broadcast_achievement_unlock(current_user_id, {
                        'achievement_id': achievement.achievement_id,
                        'name': achievement.name,
                        'description': achievement.description,
                        'icon': achievement.icon,
                        'rarity': achievement.rarity,
                        'points_reward': achievement.points_reward
                    })
            
            # Sync challenge completions to Firebase
            if newly_completed_challenges:
                for item in newly_completed_challenges:
                    challenge = item['challenge']
                    broadcast_challenge_completion(current_user_id, {
                        'challenge_id': challenge.challenge_id,
                        'name': challenge.name,
                        'category': challenge.category,
                        'difficulty': getattr(challenge, 'difficulty', 'medium'),
                        'points_reward': challenge.points_reward,
                        'final_progress': item['final_progress'],
                        'target_value': challenge.target_value
                    })
                    
                    # Update challenge leaderboard in Firebase
                    leaderboard = get_challenge_leaderboard(challenge.challenge_id)
                    sync_challenge_progress_to_firebase(challenge.challenge_id, leaderboard)
            
            # Sync updated user ranking to Firebase
            ranking_data = calculate_liftoff_ranking_points(current_user_id)
            ranking_data['rank_tier'] = get_rank_tier_from_points(ranking_data['total_points'])
            ranking_data['rank_color'] = get_rank_color(ranking_data['rank_tier'])
            sync_user_ranking_to_firebase(current_user_id, ranking_data)
        
        return jsonify(response_data), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:workout_id>', methods=['DELETE'])
@jwt_required()
def delete_workout(workout_id):
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get workout
        workout = Workout.query.get(workout_id)
        
        if not workout:
            return jsonify({'error': 'Workout not found'}), 404
        
        # Check if workout belongs to current user
        if workout.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to workout'}), 403
        
        # Delete workout
        db.session.delete(workout)
        db.session.commit()
        
        # Update user rankings based on workout
        update_user_rankings(current_user_id)
        
        return jsonify({
            'message': 'Workout deleted successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Exercise Routes
@app.route('/api/exercises', methods=['GET'])
@jwt_required()
def get_exercises():
    try:
        # Get query parameters
        muscle_group = request.args.get('muscle_group')
        search = request.args.get('search')
        
        # Build query
        query = Exercise.query
        
        if muscle_group:
            query = query.filter_by(muscle_group=muscle_group)
        
        if search:
            query = query.filter(Exercise.name.ilike(f'%{search}%'))
        
        # Execute query
        exercises = query.order_by(Exercise.name).all()
        
        result = []
        for exercise in exercises:
            exercise_data = {
                'exercise_id': exercise.exercise_id,
                'name': exercise.name,
                'muscle_group': exercise.muscle_group,
                'description': exercise.description,
                'is_compound': exercise.is_compound
            }
            result.append(exercise_data)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Ranking Routes
@app.route('/api/rankings/recalculate', methods=['POST', 'OPTIONS'])
def recalculate_user_mmr():
    """Manually trigger MMR recalculation for current user"""
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    # Handle POST request
    from flask_jwt_extended import jwt_required, get_jwt_identity
    with app.app_context():
        try:
            # Get current user (without @jwt_required decorator to handle manually)
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Authorization token required'}), 401
            
            token = auth_header.split(' ')[1]
            from flask_jwt_extended import decode_token
            decoded_token = decode_token(token)
            current_user_id = int(decoded_token['sub'])
            
            # Trigger MMR calculation
            mmr_points, rank_tier = update_user_mmr(current_user_id)
            
            if mmr_points is not None:
                return jsonify({
                    'message': 'MMR recalculated successfully',
                    'mmr_score': mmr_points,
                    'rank_tier': rank_tier
                }), 200
            else:
                return jsonify({'error': 'Failed to calculate MMR'}), 500
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/rankings/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_rankings(user_id):
    current_user_id = int(get_jwt_identity())
    
    try:
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user rankings
        rankings = UserRanking.query.filter_by(user_id=user_id).all()
        
        result = []
        for ranking in rankings:
            ranking_data = {
                'muscle_group': ranking.muscle_group,
                'mmr_score': ranking.mmr_score,
                'rank_tier': ranking.rank_tier,
                'updated_at': ranking.updated_at.isoformat()
            }
            result.append(ranking_data)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/rankings/leaderboard/friends', methods=['GET'])
@jwt_required()
def get_friends_leaderboard():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        muscle_group = request.args.get('muscle_group', 'overall')
        
        # Get user's friends
        friends_query = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == current_user_id, Friend.status == 'accepted'),
                db.and_(Friend.friend_id == current_user_id, Friend.status == 'accepted')
            )
        )
        
        friend_ids = []
        for friendship in friends_query.all():
            if friendship.user_id == current_user_id:
                friend_ids.append(friendship.friend_id)
            else:
                friend_ids.append(friendship.user_id)
        
        # Add current user to the list
        friend_ids.append(current_user_id)
        
        # Build base query
        if muscle_group == 'overall':
            # For overall ranking, calculate the average MMR across all muscle groups
            subquery = db.session.query(
                UserRanking.user_id,
                db.func.avg(UserRanking.mmr_score).label('avg_mmr')
            ).filter(UserRanking.user_id.in_(friend_ids)).group_by(UserRanking.user_id).subquery()
            
            query = db.session.query(
                User,
                subquery.c.avg_mmr
            ).join(
                subquery,
                User.user_id == subquery.c.user_id
            )
        else:
            # For specific muscle group, get the ranking for that muscle group
            query = db.session.query(
                User,
                UserRanking.mmr_score,
                UserRanking.rank_tier
            ).join(
                UserRanking,
                db.and_(
                    User.user_id == UserRanking.user_id,
                    UserRanking.muscle_group == muscle_group
                )
            ).filter(User.user_id.in_(friend_ids))
        
        # Order by MMR score
        if muscle_group == 'overall':
            query = query.order_by(subquery.c.avg_mmr.desc())
        else:
            query = query.order_by(UserRanking.mmr_score.desc())
        
        # Execute query
        results = query.all()
        
        result = []
        for item in results:
            user = item[0]
            
            # Calculate age
            today = datetime.date.today()
            age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            
            user_data = {
                'user_id': user.user_id,
                'username': user.username,
                'age': age,
                'is_current_user': user.user_id == current_user_id
            }
            
            if muscle_group == 'overall':
                user_data['mmr_score'] = int(item[1])  # Convert Decimal to int
                
                # Determine rank tier based on MMR score using new 5-tier system
                user_data['rank_tier'] = get_rank_tier_from_points(user_data['mmr_score'])
                user_data['rank_color'] = get_rank_color(user_data['rank_tier'])
            else:
                user_data['mmr_score'] = item[1]
                user_data['rank_tier'] = item[2]
            
            result.append(user_data)
        
        # Sync friends leaderboard to Firebase for real-time updates
        if firebase_enabled:
            sync_leaderboard_to_firebase(
                leaderboard_type='friends',
                data=result,
                muscle_group=muscle_group
            )
        
        return jsonify({
            'leaderboard': result,
            'muscle_group': muscle_group
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Coaching Routes
@app.route('/api/coaching/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get user rankings
        rankings = UserRanking.query.filter_by(user_id=current_user_id).all()
        
        if not rankings:
            return jsonify({'message': 'No workout data available for recommendations'}), 200
        
        # Find the lowest ranked muscle groups
        rankings_by_score = sorted(rankings, key=lambda r: r.mmr_score)
        lowest_ranked = rankings_by_score[:2]  # Get the two lowest ranked muscle groups
        
        recommendations = []
        for ranking in lowest_ranked:
            # Get exercises for this muscle group
            exercises = Exercise.query.filter_by(muscle_group=ranking.muscle_group).limit(3).all()
            
            exercise_list = []
            for exercise in exercises:
                exercise_data = {
                    'exercise_id': exercise.exercise_id,
                    'name': exercise.name,
                    'description': exercise.description,
                    'is_compound': exercise.is_compound
                }
                exercise_list.append(exercise_data)
            
            recommendation = {
                'muscle_group': ranking.muscle_group,
                'rank_tier': ranking.rank_tier,
                'mmr_score': ranking.mmr_score,
                'message': f'Focus on improving your {ranking.muscle_group} strength to increase your rank.',
                'recommended_exercises': exercise_list
            }
            
            recommendations.append(recommendation)
        
        return jsonify({
            'recommendations': recommendations
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/coaching/progress', methods=['GET'])
@jwt_required()
def get_progress():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get time period from query parameters
        period = request.args.get('period', 'month')  # week, month, year
        
        # Calculate start date based on period
        today = datetime.datetime.now()
        if period == 'week':
            start_date = today - datetime.timedelta(days=7)
        elif period == 'month':
            start_date = today - datetime.timedelta(days=30)
        elif period == 'year':
            start_date = today - datetime.timedelta(days=365)
        else:
            return jsonify({'error': 'Invalid period. Use week, month, or year.'}), 400
        
        # Get workouts in the period
        workouts = Workout.query.filter(
            Workout.user_id == current_user_id,
            Workout.workout_date >= start_date
        ).order_by(Workout.workout_date).all()
        
        if not workouts:
            return jsonify({'message': 'No workout data available for the selected period'}), 200
        
        # Calculate progress metrics
        total_workouts = len(workouts)
        total_volume = 0
        muscle_group_volume = {}
        
        for workout in workouts:
            for workout_exercise in workout.exercises:
                exercise = workout_exercise.exercise
                volume = workout_exercise.sets * workout_exercise.reps * (workout_exercise.weight or 0)
                total_volume += volume
                
                if exercise.muscle_group not in muscle_group_volume:
                    muscle_group_volume[exercise.muscle_group] = 0
                
                muscle_group_volume[exercise.muscle_group] += volume
        
        # Get user rankings
        rankings = UserRanking.query.filter_by(user_id=current_user_id).all()
        ranking_data = {}
        
        for ranking in rankings:
            ranking_data[ranking.muscle_group] = {
                'rank_tier': ranking.rank_tier,
                'mmr_score': ranking.mmr_score
            }
        
        # Prepare progress data
        progress_data = {
            'period': period,
            'total_workouts': total_workouts,
            'total_volume': total_volume,
            'muscle_groups': []
        }
        
        for muscle_group, volume in muscle_group_volume.items():
            muscle_group_data = {
                'muscle_group': muscle_group,
                'volume': volume,
                'percentage': (volume / total_volume * 100) if total_volume > 0 else 0
            }
            
            if muscle_group in ranking_data:
                muscle_group_data['rank_tier'] = ranking_data[muscle_group]['rank_tier']
                muscle_group_data['mmr_score'] = ranking_data[muscle_group]['mmr_score']
            
            progress_data['muscle_groups'].append(muscle_group_data)
        
        # Sort muscle groups by volume
        progress_data['muscle_groups'] = sorted(
            progress_data['muscle_groups'],
            key=lambda x: x['volume'],
            reverse=True
        )
        
        return jsonify(progress_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Social Routes
@app.route('/api/social/friends', methods=['GET'])
@jwt_required()
def get_friends():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get status filter from query parameters
        status = request.args.get('status', 'accepted')  # accepted, pending, all
        
        # Build query based on status
        if status == 'all':
            query = Friend.query.filter(
                db.or_(
                    Friend.user_id == current_user_id,
                    Friend.friend_id == current_user_id
                )
            )
        elif status == 'pending':
            query = Friend.query.filter(
                db.or_(
                    db.and_(Friend.user_id == current_user_id, Friend.status == 'pending'),
                    db.and_(Friend.friend_id == current_user_id, Friend.status == 'pending')
                )
            )
        else:  # accepted
            query = Friend.query.filter(
                db.or_(
                    db.and_(Friend.user_id == current_user_id, Friend.status == 'accepted'),
                    db.and_(Friend.friend_id == current_user_id, Friend.status == 'accepted')
                )
            )
        
        # Execute query
        friendships = query.all()
        
        result = []
        for friendship in friendships:
            # Determine which user is the friend
            if friendship.user_id == current_user_id:
                friend = User.query.get(friendship.friend_id)
                is_outgoing = True
            else:
                friend = User.query.get(friendship.user_id)
                is_outgoing = False
            
            # Get friend's workout count
            workout_count = Workout.query.filter_by(user_id=friend.user_id).count()
            
            # Get friend's online status from Firebase
            online_status = 'unknown'
            last_active = None
            
            if firebase_enabled:
                try:
                    ref = firebase_db.reference('users/' + str(friend.user_id))
                    friend_data = ref.get()
                    if friend_data:
                        online_status = friend_data.get('online_status', 'offline')
                        last_active = friend_data.get('last_active')
                except Exception as e:
                    print(f"Firebase error: {e}")
            
            friend_data = {
                'friendship_id': friendship.friendship_id,
                'user_id': friend.user_id,
                'username': friend.username,
                'status': friendship.status,
                'is_outgoing': is_outgoing,
                'created_at': friendship.created_at.isoformat(),
                'workout_count': workout_count,
                'online_status': online_status,
                'last_active': last_active
            }
            
            result.append(friend_data)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friends/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate required fields
    if 'friend_id' not in data:
        return jsonify({'error': 'Friend ID is required'}), 400
    
    friend_id = data['friend_id']
    
    # Check if friend ID is valid
    if friend_id == current_user_id:
        return jsonify({'error': 'Cannot send friend request to yourself'}), 400
    
    try:
        # Check if friend exists
        friend = User.query.get(friend_id)
        if not friend:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if friendship already exists
        existing_friendship = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == current_user_id, Friend.friend_id == friend_id),
                db.and_(Friend.user_id == friend_id, Friend.friend_id == current_user_id)
            )
        ).first()
        
        if existing_friendship:
            return jsonify({'error': 'Friendship already exists or pending'}), 400
        
        # Create new friendship
        new_friendship = Friend(
            user_id=current_user_id,
            friend_id=friend_id,
            status='pending'
        )
        
        db.session.add(new_friendship)
        db.session.commit()
        
        return jsonify({
            'message': 'Friend request sent successfully',
            'friendship_id': new_friendship.friendship_id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friends/request/<int:friendship_id>', methods=['PUT'])
@jwt_required()
def respond_to_friend_request(friendship_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate required fields
    if 'action' not in data:
        return jsonify({'error': 'Action is required (accept or reject)'}), 400
    
    action = data['action']
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action. Use accept or reject.'}), 400
    
    try:
        # Get friendship
        friendship = Friend.query.get(friendship_id)
        
        if not friendship:
            return jsonify({'error': 'Friendship not found'}), 404
        
        # Check if current user is the recipient of the friend request
        if friendship.friend_id != current_user_id:
            return jsonify({'error': 'Unauthorized to respond to this friend request'}), 403
        
        # Check if friendship is pending
        if friendship.status != 'pending':
            return jsonify({'error': 'Friend request is not pending'}), 400
        
        # Update friendship status
        if action == 'accept':
            friendship.status = 'accepted'
            message = 'Friend request accepted'
        else:  # reject
            friendship.status = 'rejected'
            message = 'Friend request rejected'
        
        db.session.commit()
        
        return jsonify({
            'message': message,
            'friendship_id': friendship.friendship_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friend-requests/received', methods=['GET'])
@jwt_required()
def get_received_friend_requests():
    """Get friend requests received by current user"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get pending friend requests where current user is the recipient
        requests = Friend.query.filter(
            Friend.friend_id == current_user_id,
            Friend.status == 'pending'
        ).all()
        
        result = []
        for request in requests:
            sender = User.query.get(request.user_id)
            if sender:
                # Get sender's workout count and ranking
                workout_count = Workout.query.filter_by(user_id=sender.user_id).count()
                ranking_data = calculate_liftoff_ranking_points(sender.user_id)
                rank_tier = get_rank_tier_from_points(ranking_data['total_points'])
                
                request_data = {
                    'request_id': request.friendship_id,
                    'sender_id': sender.user_id,
                    'sender_username': sender.username,
                    'sender_rank': rank_tier,
                    'sender_workout_count': workout_count,
                    'created_at': request.created_at.isoformat(),
                    'status': request.status
                }
                result.append(request_data)
        
        return jsonify({'requests': result}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friend-requests/sent', methods=['GET'])
@jwt_required()
def get_sent_friend_requests():
    """Get friend requests sent by current user"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get pending friend requests sent by current user
        requests = Friend.query.filter(
            Friend.user_id == current_user_id,
            Friend.status == 'pending'
        ).all()
        
        result = []
        for request in requests:
            receiver = User.query.get(request.friend_id)
            if receiver:
                # Get receiver's workout count and ranking
                workout_count = Workout.query.filter_by(user_id=receiver.user_id).count()
                ranking_data = calculate_liftoff_ranking_points(receiver.user_id)
                rank_tier = get_rank_tier_from_points(ranking_data['total_points'])
                
                request_data = {
                    'request_id': request.friendship_id,
                    'receiver_id': receiver.user_id,
                    'receiver_username': receiver.username,
                    'receiver_rank': rank_tier,
                    'receiver_workout_count': workout_count,
                    'created_at': request.created_at.isoformat(),
                    'status': request.status
                }
                result.append(request_data)
        
        return jsonify({'requests': result}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friend-requests/<int:request_id>', methods=['DELETE'])
@jwt_required()
def cancel_friend_request(request_id):
    """Cancel a sent friend request"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get the friend request
        request = Friend.query.get(request_id)
        
        if not request:
            return jsonify({'error': 'Friend request not found'}), 404
        
        # Check if current user is the sender of the request
        if request.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized to cancel this friend request'}), 403
        
        # Check if request is still pending
        if request.status != 'pending':
            return jsonify({'error': 'Can only cancel pending friend requests'}), 400
        
        # Delete the friend request
        db.session.delete(request)
        db.session.commit()
        
        return jsonify({'message': 'Friend request cancelled successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friend-requests/<int:request_id>/accept', methods=['PUT'])
@jwt_required()
def accept_friend_request(request_id):
    """Accept a friend request - frontend specific endpoint"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get friendship
        friendship = Friend.query.get(request_id)
        
        if not friendship:
            return jsonify({'error': 'Friend request not found'}), 404
        
        # Check if current user is the recipient of the friend request
        if friendship.friend_id != current_user_id:
            return jsonify({'error': 'Unauthorized to accept this friend request'}), 403
        
        # Check if friendship is pending
        if friendship.status != 'pending':
            return jsonify({'error': 'Friend request is not pending'}), 400
        
        # Accept the friend request
        friendship.status = 'accepted'
        db.session.commit()
        
        return jsonify({
            'message': 'Friend request accepted',
            'friendship_id': friendship.friendship_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friend-requests/<int:request_id>/reject', methods=['PUT'])
@jwt_required()
def reject_friend_request(request_id):
    """Reject a friend request - frontend specific endpoint"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get friendship
        friendship = Friend.query.get(request_id)
        
        if not friendship:
            return jsonify({'error': 'Friend request not found'}), 404
        
        # Check if current user is the recipient of the friend request
        if friendship.friend_id != current_user_id:
            return jsonify({'error': 'Unauthorized to reject this friend request'}), 403
        
        # Check if friendship is pending
        if friendship.status != 'pending':
            return jsonify({'error': 'Friend request is not pending'}), 400
        
        # Reject the friend request
        friendship.status = 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': 'Friend request rejected'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/shared-workouts', methods=['GET'])
@jwt_required()
def get_shared_workouts():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get active shared workouts
        # This includes workouts created by friends and workouts the user is participating in
        
        # Get user's friends
        friends_query = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == current_user_id, Friend.status == 'accepted'),
                db.and_(Friend.friend_id == current_user_id, Friend.status == 'accepted')
            )
        )
        
        friend_ids = []
        for friendship in friends_query.all():
            if friendship.user_id == current_user_id:
                friend_ids.append(friendship.friend_id)
            else:
                friend_ids.append(friendship.user_id)
        
        # Get shared workouts created by friends or the user
        creator_workouts = SharedWorkout.query.filter(
            SharedWorkout.creator_id.in_(friend_ids + [current_user_id]),
            SharedWorkout.is_active == True
        ).all()
        
        # Get shared workouts the user is participating in
        participant_workouts_query = db.session.query(SharedWorkout).join(
            SharedWorkoutParticipant,
            db.and_(
                SharedWorkout.shared_workout_id == SharedWorkoutParticipant.shared_workout_id,
                SharedWorkoutParticipant.user_id == current_user_id
            )
        ).filter(SharedWorkout.is_active == True)
        
        participant_workouts = participant_workouts_query.all()
        
        # Combine and deduplicate workouts
        all_workouts = list(set(creator_workouts + participant_workouts))
        
        result = []
        for workout in all_workouts:
            # Skip test/invalid data that causes frontend issues
            if (workout.workout_name == 'New Shared Workout' or 
                not workout.workout_name or 
                not workout.creator_id):
                continue
            
            # Get creator
            creator = User.query.get(workout.creator_id)
            
            # Skip if creator doesn't exist (orphaned workout)
            if not creator:
                continue
            
            # Get participants
            participants = SharedWorkoutParticipant.query.filter_by(shared_workout_id=workout.shared_workout_id).all()
            participant_count = len(participants)
            
            # Check if current user is participating
            is_participating = any(p.user_id == current_user_id for p in participants)
            
            # Get real-time data from Firebase
            participant_data = []
            if firebase_enabled:
                try:
                    ref = firebase_db.reference('shared_workouts/' + str(workout.shared_workout_id))
                    firebase_workout = ref.get()
                    if firebase_workout and 'participants' in firebase_workout:
                        for user_id, data in firebase_workout['participants'].items():
                            user = User.query.get(int(user_id))
                            if user:
                                participant_data.append({
                                    'user_id': user.user_id,
                                    'username': user.username,
                                    'joined_at': data.get('joined_at'),
                                    'exercises_completed': data.get('exercises_completed', 0)
                                })
                except Exception as e:
                    print(f"Firebase error: {e}")
            
            workout_data = {
                'shared_workout_id': workout.shared_workout_id,
                'workout_name': workout.workout_name,
                'creator_id': workout.creator_id,
                'creator_name': creator.username if creator else 'Unknown',
                'workout_date': workout.workout_date.isoformat(),
                'is_active': workout.is_active,
                'created_at': workout.created_at.isoformat(),
                'participant_count': participant_count,
                'is_participating': is_participating,
                'is_creator': workout.creator_id == current_user_id,
                'participants': participant_data
            }
            
            result.append(workout_data)
        
        # Sort by creation date, newest first
        result = sorted(result, key=lambda x: x['created_at'], reverse=True)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def map_exercise_names_to_ids(exercises_data):
    """Convert frontend exercise format (names) to backend format (IDs)"""
    mapped_exercises = []
    missing_exercises = []
    
    for exercise in exercises_data:
        # Find exercise by name
        db_exercise = Exercise.query.filter_by(name=exercise['name']).first()
        
        if db_exercise:
            mapped_exercises.append({
                'exercise_id': db_exercise.exercise_id,
                'sets': int(exercise.get('sets', 1)),
                'reps': int(exercise.get('reps', 10)) if exercise.get('reps', '').isdigit() else 10,
                'weight': float(exercise.get('weight', 0)) if exercise.get('weight', '').replace('.', '').isdigit() else 0.0
            })
        else:
            missing_exercises.append(exercise['name'])
    
    return mapped_exercises, missing_exercises

@app.route('/api/social/shared-workouts', methods=['POST'])
@jwt_required()
def create_shared_workout():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['workout_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Parse workout date or use current time
        workout_date = datetime.datetime.utcnow()
        if 'workout_date' in data and data['workout_date']:
            try:
                workout_date = datetime.datetime.fromisoformat(data['workout_date'].replace('Z', '+00:00'))
            except ValueError:
                # If date parsing fails, use current time
                pass
        
        # Create new shared workout
        new_shared_workout = SharedWorkout(
            creator_id=current_user_id,
            workout_name=data['workout_name'],
            workout_date=workout_date,
            is_active=True
        )
        
        db.session.add(new_shared_workout)
        db.session.flush()  # Get shared_workout_id without committing
        
        # Handle exercises if provided
        mapped_exercises = []
        if 'exercises' in data and data['exercises']:
            mapped_exercises, missing_exercises = map_exercise_names_to_ids(data['exercises'])
            
            if missing_exercises:
                db.session.rollback()
                return jsonify({
                    'error': f'Unknown exercises: {", ".join(missing_exercises)}',
                    'missing_exercises': missing_exercises
                }), 400
            
            # Store exercise data for shared workout (will be stored in Firebase for real-time sharing)
        
        # Add creator as first participant
        participant = SharedWorkoutParticipant(
            shared_workout_id=new_shared_workout.shared_workout_id,
            user_id=current_user_id
        )
        db.session.add(participant)
        
        # Handle invited friends
        invited_participants = []
        if 'invited_friends' in data and data['invited_friends']:
            for friend_id in data['invited_friends']:
                # Verify friend exists and is actually a friend
                friend = User.query.get(friend_id)
                if friend:
                    friend_participant = SharedWorkoutParticipant(
                        shared_workout_id=new_shared_workout.shared_workout_id,
                        user_id=friend_id
                    )
                    db.session.add(friend_participant)
                    invited_participants.append(friend_id)
        
        db.session.commit()
        
        # Create entry in Firebase for real-time updates
        if firebase_enabled:
            ref = firebase_db.reference('shared_workouts/' + str(new_shared_workout.shared_workout_id))
            
            # Build Firebase participants data
            firebase_participants = {
                str(current_user_id): {
                    'joined_at': datetime.datetime.utcnow().isoformat(),
                    'exercises_completed': 0,
                    'is_creator': True
                }
            }
            
            # Add invited friends to Firebase
            for friend_id in invited_participants:
                firebase_participants[str(friend_id)] = {
                    'invited_at': datetime.datetime.utcnow().isoformat(),
                    'status': 'invited',
                    'exercises_completed': 0,
                    'is_creator': False
                }
            
            # Set Firebase data
            firebase_data = {
                'workout_name': new_shared_workout.workout_name,
                'creator_id': new_shared_workout.creator_id,
                'start_time': workout_date.isoformat(),
                'is_active': True,
                'participants': firebase_participants,
                'notes': data.get('notes', ''),
                'exercise_count': len(mapped_exercises)
            }
            
            # Add exercise data to Firebase for real-time sharing
            if mapped_exercises:
                firebase_exercises = {}
                for i, exercise in enumerate(mapped_exercises):
                    # Get exercise details from database
                    db_exercise = Exercise.query.get(exercise['exercise_id'])
                    firebase_exercises[str(i)] = {
                        'exercise_id': exercise['exercise_id'],
                        'name': db_exercise.name if db_exercise else 'Unknown',
                        'muscle_group': db_exercise.muscle_group if db_exercise else 'Unknown',
                        'sets': exercise['sets'],
                        'reps': exercise['reps'],
                        'weight': exercise['weight'],
                        'completed_by': {}  # Track which participants completed this exercise
                    }
                firebase_data['exercises'] = firebase_exercises
            
            ref.set(firebase_data)
        
        return jsonify({
            'message': 'Shared workout created successfully',
            'shared_workout_id': new_shared_workout.shared_workout_id,
            'status': 'created',
            'invited_friends': invited_participants,
            'exercise_count': len(mapped_exercises)
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating shared workout: {str(e)}'}), 500

@app.route('/api/social/shared-workouts/<int:shared_workout_id>/join', methods=['POST'])
@jwt_required()
def join_shared_workout(shared_workout_id):
    current_user_id = int(get_jwt_identity())
    
    try:
        # Check if shared workout exists and is active
        shared_workout = SharedWorkout.query.get(shared_workout_id)
        
        if not shared_workout:
            return jsonify({'error': 'Shared workout not found'}), 404
        
        if not shared_workout.is_active:
            return jsonify({'error': 'Shared workout is not active'}), 400
        
        # Check if user is already a participant
        existing_participant = SharedWorkoutParticipant.query.filter_by(
            shared_workout_id=shared_workout_id,
            user_id=current_user_id
        ).first()
        
        if existing_participant:
            return jsonify({'error': 'User is already a participant'}), 400
        
        # Add user as participant
        participant = SharedWorkoutParticipant(
            shared_workout_id=shared_workout_id,
            user_id=current_user_id
        )
        
        db.session.add(participant)
        db.session.commit()
        
        # Update Firebase for real-time updates
        if firebase_enabled:
            ref = firebase_db.reference('shared_workouts/' + str(shared_workout_id) + '/participants/' + str(current_user_id))
            ref.set({
                'joined_at': datetime.datetime.utcnow().isoformat(),
                'exercises_completed': 0
            })
        
        return jsonify({
            'message': 'Joined shared workout successfully',
            'shared_workout_id': shared_workout_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# User Search & Discovery Routes
@app.route('/api/social/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """Search for users by username or email"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 20)), 50)
        
        if not query or len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Search users by username or email (case-insensitive)
        users = User.query.filter(
            db.or_(
                User.username.ilike(f'%{query}%'),
                User.email.ilike(f'%{query}%')
            ),
            User.user_id != current_user_id  # Exclude current user
        ).limit(limit).all()
        
        # Get current user's friend relationships
        existing_friendships = db.session.query(Friend.friend_id, Friend.status).filter(
            Friend.user_id == current_user_id
        ).all()
        friend_status_map = {friend_id: status for friend_id, status in existing_friendships}
        
        # Also check reverse friendships (where current user is the friend)
        reverse_friendships = db.session.query(Friend.user_id, Friend.status).filter(
            Friend.friend_id == current_user_id
        ).all()
        for user_id, status in reverse_friendships:
            if user_id not in friend_status_map:
                friend_status_map[user_id] = status
        
        # Format results
        result = []
        for user in users:
            friend_status = friend_status_map.get(user.user_id, 'none')
            
            # Map friend_status to frontend expected format
            is_friend = friend_status == 'accepted'
            request_sent = friend_status == 'pending'
            
            user_data = {
                'user_id': user.user_id,
                'username': user.username,
                'is_friend': is_friend,
                'request_sent': request_sent
            }
            
            # Get user's workout count
            workout_count = Workout.query.filter_by(user_id=user.user_id).count()
            user_data['workout_count'] = workout_count
            
            # Get user's ranking info
            ranking_data = calculate_liftoff_ranking_points(user.user_id)
            user_data['rank_tier'] = get_rank_tier_from_points(ranking_data['total_points'])
            
            result.append(user_data)
        
        return jsonify({
            'users': result,
            'count': len(result),
            'query': query
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/users/discover', methods=['GET'])
@jwt_required()
def discover_users():
    """Discover new users to connect with"""
    current_user_id = int(get_jwt_identity())
    
    try:
        limit = min(int(request.args.get('limit', 10)), 20)
        
        # Get users who are not already friends
        existing_friend_ids = db.session.query(Friend.friend_id).filter(
            Friend.user_id == current_user_id,
            Friend.status == 'accepted'
        ).subquery()
        
        reverse_friend_ids = db.session.query(Friend.user_id).filter(
            Friend.friend_id == current_user_id,
            Friend.status == 'accepted'
        ).subquery()
        
        # Find users with similar workout activity (active users)
        suggested_users = User.query.filter(
            User.user_id != current_user_id,
            ~User.user_id.in_(existing_friend_ids),
            ~User.user_id.in_(reverse_friend_ids)
        ).join(Workout).group_by(User.user_id).order_by(
            db.func.count(Workout.workout_id).desc()
        ).limit(limit).all()
        
        result = []
        for user in suggested_users:
            # Get user stats
            workout_count = Workout.query.filter_by(user_id=user.user_id).count()
            
            # Get ranking info
            ranking_data = calculate_liftoff_ranking_points(user.user_id)
            rank_tier = get_rank_tier_from_points(ranking_data['total_points'])
            
            # Check if user has mutual friends
            mutual_friends_count = db.session.query(Friend).filter(
                Friend.user_id.in_(existing_friend_ids),
                Friend.friend_id == user.user_id,
                Friend.status == 'accepted'
            ).count()
            
            user_data = {
                'user_id': user.user_id,
                'username': user.username,
                'workout_count': workout_count,
                'rank_tier': rank_tier,
                'total_points': ranking_data['total_points'],
                'mutual_friends_count': mutual_friends_count,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
            
            result.append(user_data)
        
        return jsonify({
            'suggested_users': result,
            'count': len(result)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friends/remove', methods=['DELETE'])
@jwt_required()
def remove_friend():
    """Remove a friend relationship"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'friend_id' not in data:
        return jsonify({'error': 'friend_id is required'}), 400
    
    friend_id = data['friend_id']
    
    try:
        # Find friendship (either direction)
        friendship = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == current_user_id, Friend.friend_id == friend_id),
                db.and_(Friend.user_id == friend_id, Friend.friend_id == current_user_id)
            )
        ).first()
        
        if not friendship:
            return jsonify({'error': 'Friend relationship not found'}), 404
        
        # Remove the friendship
        db.session.delete(friendship)
        db.session.commit()
        
        return jsonify({'message': 'Friend removed successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/password/change', methods=['PUT'])
@jwt_required()
def change_password():
    """Change user password"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['current_password', 'new_password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Get current user
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify current password
        if not check_password_hash(user.password_hash, data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Validate new password
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        # Update password
        user.password_hash = generate_password_hash(data['new_password'])
        user.updated_at = datetime.datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/export', methods=['GET'])
@jwt_required()
def export_workout_data():
    """Export user's workout data"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        format_type = request.args.get('format', 'json').lower()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
        query = Workout.query.filter_by(user_id=current_user_id)
        
        if start_date:
            start_dt = datetime.datetime.fromisoformat(start_date)
            query = query.filter(Workout.workout_date >= start_dt)
        
        if end_date:
            end_dt = datetime.datetime.fromisoformat(end_date)
            query = query.filter(Workout.workout_date <= end_dt)
        
        workouts = query.order_by(Workout.workout_date.desc()).all()
        
        # Format workout data for export
        export_data = []
        for workout in workouts:
            workout_data = {
                'workout_id': workout.workout_id,
                'workout_name': workout.workout_name,
                'workout_date': workout.workout_date.isoformat(),
                'duration': workout.duration,
                'notes': workout.notes,
                'exercises': []
            }
            
            # Get exercises for this workout
            for exercise_workout in workout.exercises:
                exercise = Exercise.query.get(exercise_workout.exercise_id)
                exercise_data = {
                    'exercise_name': exercise.exercise_name if exercise else 'Unknown',
                    'muscle_group': exercise.muscle_group if exercise else 'Unknown',
                    'sets': exercise_workout.sets,
                    'reps': exercise_workout.reps,
                    'weight': exercise_workout.weight
                }
                workout_data['exercises'].append(exercise_data)
            
            export_data.append(workout_data)
        
        # Get user stats
        user = User.query.get(current_user_id)
        total_workouts = len(export_data)
        
        # Calculate total volume
        total_volume = 0
        for workout in export_data:
            for exercise in workout['exercises']:
                if exercise['weight'] and exercise['sets'] and exercise['reps']:
                    total_volume += exercise['weight'] * exercise['sets'] * exercise['reps']
        
        response_data = {
            'user_info': {
                'username': user.username,
                'export_date': datetime.datetime.utcnow().isoformat(),
                'total_workouts': total_workouts,
                'total_volume': total_volume
            },
            'workouts': export_data
        }
        
        if format_type == 'csv':
            # Note: In a real implementation, you'd convert to CSV format
            # For now, return JSON with a note
            response_data['note'] = 'CSV export not yet implemented, returning JSON format'
        
        return jsonify(response_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Personal Records Routes
@app.route('/api/personal-records', methods=['GET'])
@jwt_required()
def get_personal_records():
    """Get user's personal records"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        exercise_id = request.args.get('exercise_id')
        record_type = request.args.get('type')  # max_weight, max_reps, max_volume
        
        # Build query
        query = PersonalRecord.query.filter_by(user_id=current_user_id)
        
        if exercise_id:
            query = query.filter_by(exercise_id=exercise_id)
        
        if record_type:
            query = query.filter_by(record_type=record_type)
        
        # Get records
        records = query.order_by(PersonalRecord.achieved_at.desc()).all()
        
        result = []
        for record in records:
            exercise = Exercise.query.get(record.exercise_id)
            
            record_data = {
                'pr_id': record.pr_id,
                'exercise_id': record.exercise_id,
                'exercise_name': exercise.exercise_name if exercise else 'Unknown',
                'muscle_group': exercise.muscle_group if exercise else 'Unknown',
                'record_type': record.record_type,
                'record_value': record.record_value,
                'sets': record.sets,
                'reps': record.reps,
                'weight': record.weight,
                'workout_id': record.workout_id,
                'achieved_at': record.achieved_at.isoformat(),
                'previous_record': record.previous_record
            }
            
            result.append(record_data)
        
        return jsonify({
            'personal_records': result,
            'count': len(result)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/personal-records/summary', methods=['GET'])
@jwt_required()
def get_personal_records_summary():
    """Get summary of user's personal records by muscle group"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get latest PR for each exercise
        subquery = db.session.query(
            PersonalRecord.exercise_id,
            db.func.max(PersonalRecord.achieved_at).label('latest_date')
        ).filter_by(user_id=current_user_id).group_by(PersonalRecord.exercise_id).subquery()
        
        latest_prs = db.session.query(PersonalRecord).join(
            subquery,
            db.and_(
                PersonalRecord.exercise_id == subquery.c.exercise_id,
                PersonalRecord.achieved_at == subquery.c.latest_date
            )
        ).filter_by(user_id=current_user_id).all()
        
        # Group by muscle group
        muscle_group_prs = {}
        
        for pr in latest_prs:
            exercise = Exercise.query.get(pr.exercise_id)
            if not exercise:
                continue
                
            muscle_group = exercise.muscle_group
            if muscle_group not in muscle_group_prs:
                muscle_group_prs[muscle_group] = []
            
            pr_data = {
                'exercise_name': exercise.exercise_name,
                'record_type': pr.record_type,
                'record_value': pr.record_value,
                'sets': pr.sets,
                'reps': pr.reps,
                'weight': pr.weight,
                'achieved_at': pr.achieved_at.isoformat()
            }
            
            muscle_group_prs[muscle_group].append(pr_data)
        
        return jsonify({
            'personal_records_by_muscle_group': muscle_group_prs,
            'total_exercises_with_prs': len(latest_prs)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Enhanced Ranking Routes
@app.route('/api/rankings/user', methods=['GET'])
@jwt_required()
def get_user_detailed_ranking():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get overall ranking with detailed breakdown
        overall_ranking = calculate_liftoff_ranking_points(current_user_id)
        overall_rank_tier = get_rank_tier_from_points(overall_ranking['total_points'])
        
        # Get muscle group rankings
        muscle_group_rankings = []
        muscle_groups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms']  # Common muscle groups
        
        for muscle_group in muscle_groups:
            muscle_ranking = calculate_muscle_group_ranking(current_user_id, muscle_group)
            if muscle_ranking['workout_count'] > 0:  # Only include if user has workouts for this group
                muscle_group_rankings.append({
                    'muscle_group': muscle_group,
                    'rank_tier': muscle_ranking['rank_tier'],
                    'rank_color': get_rank_color(muscle_ranking['rank_tier']),
                    'total_points': muscle_ranking['total_points'],
                    'workout_count': muscle_ranking['workout_count'],
                    'total_volume': muscle_ranking['total_volume']
                })
        
        # Calculate progress to next rank
        current_points = overall_ranking['total_points']
        next_rank_threshold = 0
        
        if current_points < 50:
            next_rank_threshold = 50
            next_rank = 'Silver'
        elif current_points < 150:
            next_rank_threshold = 150
            next_rank = 'Gold'
        elif current_points < 300:
            next_rank_threshold = 300
            next_rank = 'Platinum'
        elif current_points < 500:
            next_rank_threshold = 500
            next_rank = 'Diamond'
        else:
            next_rank_threshold = current_points
            next_rank = 'Diamond'
        
        progress_to_next = current_points / next_rank_threshold if next_rank_threshold > 0 else 1.0
        
        
        return jsonify({
            'overall_ranking': {
                'rank_tier': overall_rank_tier,
                'rank_color': get_rank_color(overall_rank_tier),
                'total_points': overall_ranking['total_points'],
                'workout_points': overall_ranking['workout_points'],
                'consistency_points': overall_ranking['consistency_points'],
                'workout_count': overall_ranking['workout_count'],
                'progress_to_next': min(progress_to_next, 1.0),
                'next_rank': next_rank,
                'points_needed': max(next_rank_threshold - current_points, 0)
            },
            'muscle_group_rankings': muscle_group_rankings,
            'rank_tiers': {
                'Bronze': {'min_points': 0, 'color': get_rank_color('Bronze')},
                'Silver': {'min_points': 50, 'color': get_rank_color('Silver')},
                'Gold': {'min_points': 150, 'color': get_rank_color('Gold')},
                'Platinum': {'min_points': 300, 'color': get_rank_color('Platinum')},
                'Diamond': {'min_points': 500, 'color': get_rank_color('Diamond')}
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rankings/leaderboard', methods=['GET'])
@jwt_required()
def get_enhanced_leaderboard():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        muscle_group = request.args.get('muscle_group', 'overall')
        period = request.args.get('period', 'all_time')  # all_time, monthly, weekly
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Build base query for overall rankings
        if muscle_group == 'overall':
            query = db.session.query(
                User.user_id,
                User.username,
                User.date_of_birth,
                UserRanking.mmr_score,
                UserRanking.rank_tier
            ).join(
                UserRanking,
                db.and_(
                    User.user_id == UserRanking.user_id,
                    UserRanking.muscle_group == 'overall'
                )
            )
        else:
            # For specific muscle group
            query = db.session.query(
                User.user_id,
                User.username,
                User.date_of_birth,
                UserRanking.mmr_score,
                UserRanking.rank_tier
            ).join(
                UserRanking,
                db.and_(
                    User.user_id == UserRanking.user_id,
                    UserRanking.muscle_group == muscle_group
                )
            )
        
        # Order by MMR score descending
        query = query.order_by(UserRanking.mmr_score.desc())
        
        # Paginate results
        paginated_results = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Build leaderboard data
        leaderboard = []
        for i, (user_id, username, date_of_birth, mmr_score, rank_tier) in enumerate(paginated_results.items):
            # Calculate age
            today = datetime.date.today()
            age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
            
            # Get additional data for overall ranking
            if muscle_group == 'overall':
                user_ranking = calculate_liftoff_ranking_points(user_id)
            
            leaderboard_entry = {
                'rank': (page - 1) * per_page + i + 1,
                'user_id': user_id,
                'username': username,
                'age': age,
                'mmr_score': mmr_score,  # Frontend expects mmr_score
                'total_points': mmr_score,  # Keep for compatibility
                'rank_tier': rank_tier,
                'rank_color': get_rank_color(rank_tier),
                'is_current_user': user_id == current_user_id
            }
            
            leaderboard.append(leaderboard_entry)
        
        # Get current user's rank if not in current page
        current_user_rank = None
        current_user_entry = None
        
        if muscle_group == 'overall':
            user_ranking_record = UserRanking.query.filter_by(user_id=current_user_id, muscle_group='overall').first()
        else:
            user_ranking_record = UserRanking.query.filter_by(user_id=current_user_id, muscle_group=muscle_group).first()
        
        if user_ranking_record:
            # Count users with higher scores
            higher_count = UserRanking.query.filter(
                UserRanking.muscle_group == muscle_group,
                UserRanking.mmr_score > user_ranking_record.mmr_score
            ).count()
            
            current_user_rank = higher_count + 1
            
            # If current user not in current page, add their entry
            if not any(entry['is_current_user'] for entry in leaderboard):
                user = User.query.get(current_user_id)
                age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
                
                current_user_entry = {
                    'rank': current_user_rank,
                    'user_id': current_user_id,
                    'username': user.username,
                    'age': age,
                    'mmr_score': user_ranking_record.mmr_score,  # Frontend expects mmr_score
                    'total_points': user_ranking_record.mmr_score,  # Keep for compatibility
                    'rank_tier': user_ranking_record.rank_tier,
                    'rank_color': get_rank_color(user_ranking_record.rank_tier),
                    'is_current_user': True
                }
        
        # Sync leaderboard to Firebase for real-time updates
        if firebase_enabled:
            sync_leaderboard_to_firebase(
                leaderboard_type='muscle_group' if muscle_group != 'overall' else 'global',
                data=leaderboard,
                muscle_group=muscle_group if muscle_group != 'overall' else None,
                period=period
            )
        
        return jsonify({
            'leaderboard': leaderboard,
            'current_user_rank': current_user_rank,
            'current_user_entry': current_user_entry,
            'total_users': paginated_results.total,
            'total_pages': paginated_results.pages,
            'current_page': page,
            'muscle_group': muscle_group,
            'period': period
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rankings/progress', methods=['GET'])
@jwt_required()
def get_ranking_progress():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get historical ranking data (simplified - in real app, you'd store historical data)
        current_ranking = calculate_liftoff_ranking_points(current_user_id)
        current_tier = get_rank_tier_from_points(current_ranking['total_points'])
        
        # Calculate potential gains
        potential_gains = {
            'next_workout': 2,  # 2 points per workout
            'consistency_boost': min(calculate_consistency_score(current_user_id) + 10, 100)
        }
        
        # Calculate what tier they could reach with different activities
        potential_scenarios = []
        
        # Scenario 1: Complete one more workout
        workout_scenario_points = current_ranking['total_points'] + 2
        potential_scenarios.append({
            'activity': 'Complete 1 more workout',
            'points_gain': 2,
            'new_total': workout_scenario_points,
            'new_tier': get_rank_tier_from_points(workout_scenario_points),
            'tier_changed': get_rank_tier_from_points(workout_scenario_points) != current_tier
        })
        
        # Scenario 2: Complete 7 workouts
        week_workout_points = current_ranking['total_points'] + (7 * 2)  # 7 workouts
        potential_scenarios.append({
            'activity': 'Complete 7 workouts',
            'points_gain': (7 * 2),
            'new_total': week_workout_points,
            'new_tier': get_rank_tier_from_points(week_workout_points),
            'tier_changed': get_rank_tier_from_points(week_workout_points) != current_tier
        })
        
        return jsonify({
            'current_ranking': {
                'total_points': current_ranking['total_points'],
                'rank_tier': current_tier,
                'rank_color': get_rank_color(current_tier)
            },
            'breakdown': {
                'workout_points': current_ranking['workout_points'],
                'consistency_points': current_ranking['consistency_points']
            },
            'potential_scenarios': potential_scenarios,
            'next_milestones': {
                'Bronze': 0,
                'Silver': 50,
                'Gold': 150,
                'Platinum': 300,
                'Diamond': 500
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Achievement Routes
@app.route('/api/achievements', methods=['GET'])
@jwt_required()
def get_all_achievements():
    try:
        # Get query parameters
        category = request.args.get('category')  # Filter by category
        include_hidden = request.args.get('include_hidden', 'false').lower() == 'true'
        
        # Build query
        query = Achievement.query
        
        if category:
            query = query.filter_by(category=category)
        
        if not include_hidden:
            query = query.filter_by(is_hidden=False)
        
        # Execute query
        achievements = query.order_by(Achievement.category, Achievement.name).all()
        
        result = []
        for achievement in achievements:
            achievement_data = {
                'achievement_id': achievement.achievement_id,
                'name': achievement.name,
                'description': achievement.description,
                'icon': achievement.icon,
                'category': achievement.category,
                'rarity': achievement.rarity,
                'rarity_color': get_achievement_rarity_color(achievement.rarity),
                'points_reward': achievement.points_reward,
                'is_hidden': achievement.is_hidden,
                'unlock_criteria': achievement.unlock_criteria
            }
            result.append(achievement_data)
        
        return jsonify({
            'achievements': result,
            'categories': ['workout', 'social', 'milestone', 'volume'],
            'rarities': ['common', 'rare', 'epic', 'legendary']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/achievements/user', methods=['GET'])
@jwt_required()
def get_user_achievements():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        unlocked_only = request.args.get('unlocked_only', 'false').lower() == 'true'
        category = request.args.get('category')
        
        # Get all achievements
        query = Achievement.query
        if category:
            query = query.filter_by(category=category)
        
        achievements = query.order_by(Achievement.category, Achievement.name).all()
        
        # Get user's unlocked achievements
        user_achievements = {ua.achievement_id: ua for ua in 
                           UserAchievement.query.filter_by(user_id=current_user_id).all()}
        
        result = []
        unlocked_count = 0
        total_points_earned = 0
        
        for achievement in achievements:
            user_achievement = user_achievements.get(achievement.achievement_id)
            is_unlocked = user_achievement is not None
            
            if unlocked_only and not is_unlocked:
                continue
            
            # Calculate progress
            progress = 1.0 if is_unlocked else get_user_achievement_progress(current_user_id, achievement)
            
            achievement_data = {
                'achievement_id': achievement.achievement_id,
                'name': achievement.name,
                'description': achievement.description,
                'icon': achievement.icon,
                'category': achievement.category,
                'rarity': achievement.rarity,
                'rarity_color': get_achievement_rarity_color(achievement.rarity),
                'points_reward': achievement.points_reward,
                'is_hidden': achievement.is_hidden,
                'is_unlocked': is_unlocked,
                'progress': progress,
                'unlocked_at': user_achievement.unlocked_at.isoformat() if user_achievement else None,
                'progress_data': user_achievement.progress_data if user_achievement else None
            }
            
            # Don't show criteria for unlocked achievements (spoiler prevention)
            if not is_unlocked and not achievement.is_hidden:
                achievement_data['unlock_criteria'] = achievement.unlock_criteria
            
            result.append(achievement_data)
            
            if is_unlocked:
                unlocked_count += 1
                total_points_earned += achievement.points_reward
        
        # Get recent achievements (last 7 days)
        week_ago = datetime.datetime.now() - datetime.timedelta(days=7)
        recent_achievements = UserAchievement.query.filter(
            UserAchievement.user_id == current_user_id,
            UserAchievement.unlocked_at >= week_ago
        ).order_by(UserAchievement.unlocked_at.desc()).all()
        
        recent_achievement_data = []
        for ua in recent_achievements:
            achievement = Achievement.query.get(ua.achievement_id)
            if achievement:
                recent_achievement_data.append({
                    'achievement_id': achievement.achievement_id,
                    'name': achievement.name,
                    'description': achievement.description,
                    'icon': achievement.icon,
                    'rarity': achievement.rarity,
                    'rarity_color': get_achievement_rarity_color(achievement.rarity),
                    'points_reward': achievement.points_reward,
                    'unlocked_at': ua.unlocked_at.isoformat()
                })
        
        return jsonify({
            'achievements': result,
            'stats': {
                'unlocked_count': unlocked_count,
                'total_achievements': len(achievements),
                'completion_percentage': (unlocked_count / len(achievements) * 100) if achievements else 0,
                'total_points_earned': total_points_earned
            },
            'recent_achievements': recent_achievement_data
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/achievements/progress', methods=['GET'])
@jwt_required()
def get_achievement_progress():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get achievements close to completion (>50% progress)
        achievements = Achievement.query.filter_by(is_hidden=False).all()
        
        # Get user's unlocked achievements
        user_achievement_ids = [ua.achievement_id for ua in 
                              UserAchievement.query.filter_by(user_id=current_user_id).all()]
        
        close_to_completion = []
        
        for achievement in achievements:
            if achievement.achievement_id in user_achievement_ids:
                continue  # Already unlocked
            
            progress = get_user_achievement_progress(current_user_id, achievement)
            
            if progress > 0.5:  # More than 50% complete
                close_to_completion.append({
                    'achievement_id': achievement.achievement_id,
                    'name': achievement.name,
                    'description': achievement.description,
                    'icon': achievement.icon,
                    'category': achievement.category,
                    'rarity': achievement.rarity,
                    'rarity_color': get_achievement_rarity_color(achievement.rarity),
                    'points_reward': achievement.points_reward,
                    'progress': progress,
                    'unlock_criteria': achievement.unlock_criteria
                })
        
        # Sort by progress (closest to completion first)
        close_to_completion.sort(key=lambda x: x['progress'], reverse=True)
        
        return jsonify({
            'close_to_completion': close_to_completion[:10],  # Top 10 closest
            'total_in_progress': len(close_to_completion)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/achievements/unlock', methods=['POST'])
@jwt_required()
def manual_unlock_achievement():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate required fields
    if 'achievement_id' not in data:
        return jsonify({'error': 'Achievement ID is required'}), 400
    
    try:
        achievement_id = data['achievement_id']
        
        # Get achievement
        achievement = Achievement.query.get(achievement_id)
        if not achievement:
            return jsonify({'error': 'Achievement not found'}), 404
        
        # Check if already unlocked
        existing = UserAchievement.query.filter_by(
            user_id=current_user_id, 
            achievement_id=achievement_id
        ).first()
        
        if existing:
            return jsonify({'error': 'Achievement already unlocked'}), 400
        
        # Check if criteria is met
        if not check_achievement_criteria(current_user_id, achievement):
            return jsonify({'error': 'Achievement criteria not met'}), 400
        
        # Unlock achievement
        user_achievement = unlock_achievement(current_user_id, achievement_id)
        
        if not user_achievement:
            return jsonify({'error': 'Failed to unlock achievement'}), 500
        
        return jsonify({
            'message': 'Achievement unlocked successfully',
            'achievement': {
                'achievement_id': achievement.achievement_id,
                'name': achievement.name,
                'description': achievement.description,
                'icon': achievement.icon,
                'rarity': achievement.rarity,
                'points_reward': achievement.points_reward,
                'unlocked_at': user_achievement.unlocked_at.isoformat()
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/achievements/check', methods=['POST'])
@jwt_required()
def check_user_achievements():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Check and unlock any newly earned achievements
        newly_unlocked = check_and_unlock_achievements(current_user_id)
        
        result = []
        for item in newly_unlocked:
            achievement = item['achievement']
            user_achievement = item['user_achievement']
            
            result.append({
                'achievement_id': achievement.achievement_id,
                'name': achievement.name,
                'description': achievement.description,
                'icon': achievement.icon,
                'category': achievement.category,
                'rarity': achievement.rarity,
                'rarity_color': get_achievement_rarity_color(achievement.rarity),
                'points_reward': achievement.points_reward,
                'unlocked_at': user_achievement.unlocked_at.isoformat()
            })
        
        return jsonify({
            'newly_unlocked': result,
            'count': len(result)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Challenge Routes
@app.route('/api/challenges', methods=['GET'])
@jwt_required()
def get_available_challenges():
    try:
        # Get query parameters
        challenge_type = request.args.get('type')  # weekly, monthly, daily, community, friend_battle
        category = request.args.get('category')  # workout_count, volume, consistency
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        # Build query
        current_time = datetime.datetime.utcnow()
        query = Challenge.query
        
        if active_only:
            query = query.filter(
                Challenge.is_active == True,
                Challenge.start_date <= current_time,
                Challenge.end_date >= current_time
            )
        
        if challenge_type:
            query = query.filter_by(challenge_type=challenge_type)
            
        if category:
            query = query.filter_by(category=category)
        
        # Only show global challenges (not friend battles)
        if not challenge_type or challenge_type != 'friend_battle':
            query = query.filter_by(is_global=True)
        
        challenges = query.order_by(Challenge.created_at.desc()).all()
        
        result = []
        for challenge in challenges:
            # Get participant count
            participant_count = UserChallenge.query.filter_by(challenge_id=challenge.challenge_id).count()
            
            # Calculate time remaining
            time_remaining = (challenge.end_date - current_time).total_seconds()
            days_remaining = max(0, int(time_remaining / 86400))  # 86400 seconds in a day
            
            challenge_data = {
                'challenge_id': challenge.challenge_id,
                'name': challenge.name,
                'description': challenge.description,
                'challenge_type': challenge.challenge_type,
                'category': challenge.category,
                'icon': challenge.icon,
                'target_value': challenge.target_value,
                'target_unit': challenge.target_unit,
                'points_reward': challenge.points_reward,
                'difficulty': challenge.difficulty,
                'difficulty_color': get_challenge_difficulty_color(challenge.difficulty),
                'start_date': challenge.start_date.isoformat(),
                'end_date': challenge.end_date.isoformat(),
                'days_remaining': days_remaining,
                'participant_count': participant_count,
                'max_participants': challenge.max_participants,
                'is_full': challenge.max_participants and participant_count >= challenge.max_participants
            }
            
            result.append(challenge_data)
        
        return jsonify({
            'challenges': result,
            'challenge_types': ['weekly', 'monthly', 'daily', 'community'],
            'categories': ['workout_count', 'volume', 'consistency'],
            'difficulties': ['easy', 'medium', 'hard', 'extreme']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/challenges/user', methods=['GET'])
@jwt_required()
def get_user_challenges():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        status = request.args.get('status', 'all')  # active, completed, all
        
        # Build query
        current_time = datetime.datetime.utcnow()
        
        if status == 'active':
            user_challenges = db.session.query(UserChallenge, Challenge).join(Challenge).filter(
                UserChallenge.user_id == current_user_id,
                UserChallenge.completed == False,
                Challenge.is_active == True,
                Challenge.end_date >= current_time
            ).order_by(Challenge.end_date).all()
        elif status == 'completed':
            user_challenges = db.session.query(UserChallenge, Challenge).join(Challenge).filter(
                UserChallenge.user_id == current_user_id,
                UserChallenge.completed == True
            ).order_by(UserChallenge.completed_at.desc()).all()
        else:  # all
            user_challenges = db.session.query(UserChallenge, Challenge).join(Challenge).filter(
                UserChallenge.user_id == current_user_id
            ).order_by(Challenge.end_date.desc()).all()
        
        result = []
        for user_challenge, challenge in user_challenges:
            # Calculate progress percentage
            progress_percentage = (user_challenge.current_progress / challenge.target_value * 100) if challenge.target_value > 0 else 0
            
            # Calculate time remaining
            time_remaining = (challenge.end_date - current_time).total_seconds()
            days_remaining = max(0, int(time_remaining / 86400))
            
            # Get user's rank in challenge
            leaderboard = get_challenge_leaderboard(challenge.challenge_id)
            user_rank = next((entry['rank'] for entry in leaderboard if entry['user_id'] == current_user_id), None)
            
            challenge_data = {
                'challenge_id': challenge.challenge_id,
                'name': challenge.name,
                'description': challenge.description,
                'challenge_type': challenge.challenge_type,
                'category': challenge.category,
                'icon': challenge.icon,
                'target_value': challenge.target_value,
                'target_unit': challenge.target_unit,
                'points_reward': challenge.points_reward,
                'difficulty': challenge.difficulty,
                'difficulty_color': get_challenge_difficulty_color(challenge.difficulty),
                'start_date': challenge.start_date.isoformat(),
                'end_date': challenge.end_date.isoformat(),
                'days_remaining': days_remaining,
                'current_progress': user_challenge.current_progress,
                'progress_percentage': min(progress_percentage, 100),
                'completed': user_challenge.completed,
                'completed_at': user_challenge.completed_at.isoformat() if user_challenge.completed_at else None,
                'joined_at': user_challenge.joined_at.isoformat(),
                'user_rank': user_rank,
                'is_creator': challenge.creator_id == current_user_id if challenge.creator_id else False
            }
            
            result.append(challenge_data)
        
        # Get challenge stats
        total_challenges = len(result)
        active_challenges = len([c for c in result if not c['completed'] and c['days_remaining'] > 0])
        completed_challenges = len([c for c in result if c['completed']])
        
        return jsonify({
            'challenges': result,
            'stats': {
                'total_challenges': total_challenges,
                'active_challenges': active_challenges,
                'completed_challenges': completed_challenges
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/challenges/<int:challenge_id>/join', methods=['POST'])
@jwt_required()
def join_challenge_endpoint(challenge_id):
    current_user_id = int(get_jwt_identity())
    
    try:
        user_challenge, message = join_challenge(current_user_id, challenge_id)
        
        if not user_challenge:
            return jsonify({'error': message}), 400
        
        return jsonify({
            'message': message,
            'challenge_id': challenge_id,
            'current_progress': user_challenge.current_progress
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/challenges/<int:challenge_id>/leaderboard', methods=['GET'])
@jwt_required()
def get_challenge_leaderboard_endpoint(challenge_id):
    try:
        # Check if challenge exists
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        leaderboard = get_challenge_leaderboard(challenge_id)
        
        # Sync challenge leaderboard to Firebase for real-time updates
        if firebase_enabled:
            sync_challenge_progress_to_firebase(challenge_id, leaderboard)
        
        return jsonify({
            'challenge_id': challenge_id,
            'challenge_name': challenge.name,
            'target_value': challenge.target_value,
            'target_unit': challenge.target_unit,
            'leaderboard': leaderboard,
            'total_participants': len(leaderboard)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/challenges/friend-battle', methods=['POST'])
@jwt_required()
def create_friend_battle_endpoint():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'category', 'target_value', 'friend_ids']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        challenge, message = create_friend_battle(current_user_id, data['friend_ids'], data)
        
        if not challenge:
            return jsonify({'error': message}), 400
        
        return jsonify({
            'message': message,
            'challenge_id': challenge.challenge_id,
            'challenge': {
                'challenge_id': challenge.challenge_id,
                'name': challenge.name,
                'description': challenge.description,
                'category': challenge.category,
                'target_value': challenge.target_value,
                'target_unit': challenge.target_unit,
                'start_date': challenge.start_date.isoformat(),
                'end_date': challenge.end_date.isoformat(),
                'invited_users': challenge.invited_user_ids
            }
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/challenges/friend-battles', methods=['GET'])
@jwt_required()
def get_friend_battles():
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get friend battles where user is creator or invited
        current_time = datetime.datetime.utcnow()
        
        # Friend battles where user is creator
        created_battles = Challenge.query.filter(
            Challenge.creator_id == current_user_id,
            Challenge.challenge_type == 'friend_battle',
            Challenge.is_active == True
        ).all()
        
        # Friend battles where user is invited
        invited_battles = Challenge.query.filter(
            Challenge.challenge_type == 'friend_battle',
            Challenge.is_active == True,
            Challenge.invited_user_ids.contains([current_user_id])
        ).all()
        
        # Combine and deduplicate
        all_battles = list(set(created_battles + invited_battles))
        
        result = []
        for challenge in all_battles:
            # Check if user has joined
            user_participation = UserChallenge.query.filter_by(
                user_id=current_user_id,
                challenge_id=challenge.challenge_id
            ).first()
            
            # Get creator info
            creator = User.query.get(challenge.creator_id)
            
            # Get leaderboard
            leaderboard = get_challenge_leaderboard(challenge.challenge_id)
            
            # Calculate time remaining
            time_remaining = (challenge.end_date - current_time).total_seconds()
            days_remaining = max(0, int(time_remaining / 86400))
            
            battle_data = {
                'challenge_id': challenge.challenge_id,
                'name': challenge.name,
                'description': challenge.description,
                'category': challenge.category,
                'target_value': challenge.target_value,
                'target_unit': challenge.target_unit,
                'creator_id': challenge.creator_id,
                'creator_name': creator.username if creator else 'Unknown',
                'invited_users': challenge.invited_user_ids,
                'start_date': challenge.start_date.isoformat(),
                'end_date': challenge.end_date.isoformat(),
                'days_remaining': days_remaining,
                'is_creator': challenge.creator_id == current_user_id,
                'has_joined': user_participation is not None,
                'current_progress': user_participation.current_progress if user_participation else 0,
                'leaderboard': leaderboard,
                'participant_count': len(leaderboard)
            }
            
            result.append(battle_data)
        
        # Sort by creation date, newest first
        result = sorted(result, key=lambda x: x['start_date'], reverse=True)
        
        return jsonify({
            'friend_battles': result,
            'total_battles': len(result)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/challenges/progress/update', methods=['POST'])
@jwt_required()
def update_challenge_progress_endpoint():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    try:
        challenge_id = data.get('challenge_id') if data else None
        
        # Update challenge progress
        newly_completed = update_challenge_progress(current_user_id, challenge_id)
        
        result = []
        for item in newly_completed:
            challenge = item['challenge']
            
            result.append({
                'challenge_id': challenge.challenge_id,
                'name': challenge.name,
                'category': challenge.category,
                'points_reward': challenge.points_reward,
                'final_progress': item['final_progress'],
                'target_value': challenge.target_value
            })
        
        return jsonify({
            'newly_completed': result,
            'count': len(result)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Streak Routes

# Streak functionality removed as requested

# Firebase Real-time Activity Feed Routes
@app.route('/api/firebase/activity-feed', methods=['GET'])
@jwt_required()
def get_firebase_activity_feed():
    """Get real-time activity feed data for the current user"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # Get query parameters
        feed_type = request.args.get('type', 'all')  # all, achievements, challenges
        limit = min(int(request.args.get('limit', 20)), 50)  # Max 50 items
        
        activity_feed = []
        
        if firebase_enabled:
            try:
                if feed_type in ['all', 'achievements']:
                    # Get recent achievements
                    achievements_ref = firebase_db.reference(f'users/{current_user_id}/recent_achievements')
                    achievements_data = achievements_ref.order_by_child('unlocked_at').limit_to_last(limit).get()
                    
                    if achievements_data:
                        for key, achievement in achievements_data.items():
                            activity_feed.append({
                                'type': 'achievement',
                                'timestamp': achievement.get('unlocked_at'),
                                'data': achievement
                            })
                
                if feed_type in ['all', 'challenges']:
                    # Get completed challenges
                    challenges_ref = firebase_db.reference(f'users/{current_user_id}/completed_challenges')
                    challenges_data = challenges_ref.order_by_child('completed_at').limit_to_last(limit).get()
                    
                    if challenges_data:
                        for key, challenge in challenges_data.items():
                            activity_feed.append({
                                'type': 'challenge',
                                'timestamp': challenge.get('completed_at'),
                                'data': challenge
                            })
                
                
                # Sort by timestamp (most recent first)
                activity_feed.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                
                # Limit to requested number of items
                activity_feed = activity_feed[:limit]
                
            except Exception as firebase_error:
                print(f"Firebase activity feed error: {firebase_error}")
                # Return empty feed if Firebase fails
                activity_feed = []
        
        return jsonify({
            'activity_feed': activity_feed,
            'count': len(activity_feed),
            'feed_type': feed_type,
            'firebase_enabled': firebase_enabled
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/firebase/global-feed', methods=['GET'])
@jwt_required()
def get_global_activity_feed():
    """Get global activity feed for community features"""
    try:
        # Get query parameters
        feed_type = request.args.get('type', 'all')  # all, achievements, challenges
        limit = min(int(request.args.get('limit', 20)), 50)  # Max 50 items
        
        global_feed = []
        
        if firebase_enabled:
            try:
                if feed_type in ['all', 'achievements']:
                    # Get global recent achievements
                    achievements_ref = firebase_db.reference('global/recent_achievements')
                    achievements_data = achievements_ref.order_by_child('unlocked_at').limit_to_last(limit).get()
                    
                    if achievements_data:
                        for key, achievement in achievements_data.items():
                            # Get user info
                            user = User.query.get(achievement.get('user_id'))
                            achievement['username'] = user.username if user else 'Unknown User'
                            
                            global_feed.append({
                                'type': 'achievement',
                                'timestamp': achievement.get('unlocked_at'),
                                'data': achievement
                            })
                
                if feed_type in ['all', 'challenges']:
                    # Get global challenge completions
                    challenges_ref = firebase_db.reference('global/challenge_completions')
                    challenges_data = challenges_ref.order_by_child('completed_at').limit_to_last(limit).get()
                    
                    if challenges_data:
                        for key, challenge in challenges_data.items():
                            # Get user info
                            user = User.query.get(challenge.get('user_id'))
                            challenge['username'] = user.username if user else 'Unknown User'
                            
                            global_feed.append({
                                'type': 'challenge',
                                'timestamp': challenge.get('completed_at'),
                                'data': challenge
                            })
                
                
                # Sort by timestamp (most recent first)
                global_feed.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                
                # Limit to requested number of items
                global_feed = global_feed[:limit]
                
            except Exception as firebase_error:
                print(f"Firebase global feed error: {firebase_error}")
                global_feed = []
        
        return jsonify({
            'global_feed': global_feed,
            'count': len(global_feed),
            'feed_type': feed_type,
            'firebase_enabled': firebase_enabled
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/firebase/cleanup', methods=['POST'])
@jwt_required()
def firebase_cleanup_endpoint():
    """Manually trigger Firebase data cleanup (admin only)"""
    current_user_id = int(get_jwt_identity())
    
    try:
        # You might want to add admin role checking here
        # For now, any authenticated user can trigger cleanup
        
        if not firebase_enabled:
            return jsonify({'error': 'Firebase is not enabled'}), 400
        
        cleanup_result = cleanup_old_firebase_data()
        
        if cleanup_result:
            return jsonify({
                'message': 'Firebase cleanup completed successfully',
                'timestamp': datetime.datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({'error': 'Firebase cleanup failed'}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper Functions

# Streak Management Functions

# Achievement System Functions
def check_achievement_criteria(user_id, achievement):
    """Check if user meets criteria for a specific achievement"""
    try:
        criteria = achievement.unlock_criteria
        if not criteria:
            return False
        
        # Get user stats
        workout_count = Workout.query.filter_by(user_id=user_id).count()
        ranking_data = calculate_liftoff_ranking_points(user_id)
        
        # Get friend count
        friend_count = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == user_id, Friend.status == 'accepted'),
                db.and_(Friend.friend_id == user_id, Friend.status == 'accepted')
            )
        ).count()
        
        # Check different criteria types
        criteria_type = criteria.get('type')
        
        if criteria_type == 'workout_count':
            return workout_count >= criteria.get('target', 0)
        
        
        elif criteria_type == 'total_points':
            return ranking_data['total_points'] >= criteria.get('target', 0)
        
        elif criteria_type == 'rank_tier':
            current_tier = get_rank_tier_from_points(ranking_data['total_points'])
            tier_values = {'Bronze': 1, 'Silver': 2, 'Gold': 3, 'Platinum': 4, 'Diamond': 5}
            return tier_values.get(current_tier, 0) >= tier_values.get(criteria.get('target'), 0)
        
        elif criteria_type == 'friends_count':
            return friend_count >= criteria.get('target', 0)
        
        elif criteria_type == 'muscle_group_workout':
            muscle_group = criteria.get('muscle_group')
            muscle_workouts = db.session.query(Workout).join(
                WorkoutExercise, Workout.workout_id == WorkoutExercise.workout_id
            ).join(
                Exercise, WorkoutExercise.exercise_id == Exercise.exercise_id
            ).filter(
                Workout.user_id == user_id,
                Exercise.muscle_group == muscle_group
            ).count()
            return muscle_workouts >= criteria.get('target', 0)
        
        elif criteria_type == 'consecutive_days':
            # Check for X consecutive days with workouts
            target_days = criteria.get('target', 0)
            recent_workouts = Workout.query.filter_by(user_id=user_id).order_by(Workout.workout_date.desc()).all()
            
            if not recent_workouts:
                return False
            
            # Get unique workout dates
            workout_dates = sorted(list(set(w.workout_date.date() for w in recent_workouts)), reverse=True)
            
            consecutive_count = 1
            for i in range(1, len(workout_dates)):
                if (workout_dates[i-1] - workout_dates[i]).days == 1:
                    consecutive_count += 1
                    if consecutive_count >= target_days:
                        return True
                else:
                    break
            
            return consecutive_count >= target_days
        
        elif criteria_type == 'volume_milestone':
            # Total volume across all workouts
            total_volume = 0
            workouts = Workout.query.filter_by(user_id=user_id).all()
            for workout in workouts:
                for exercise in workout.exercises:
                    volume = exercise.sets * exercise.reps * (exercise.weight or 0)
                    total_volume += volume
            
            return total_volume >= criteria.get('target', 0)
        
        return False
        
    except Exception as e:
        print(f"Error checking achievement criteria: {e}")
        return False

def unlock_achievement(user_id, achievement_id, progress_data=None):
    """Unlock an achievement for a user"""
    try:
        # Check if already unlocked
        existing = UserAchievement.query.filter_by(
            user_id=user_id, 
            achievement_id=achievement_id
        ).first()
        
        if existing:
            return None  # Already unlocked
        
        # Get achievement details
        achievement = Achievement.query.get(achievement_id)
        if not achievement:
            return None
        
        # Create user achievement record
        user_achievement = UserAchievement(
            user_id=user_id,
            achievement_id=achievement_id,
            progress_data=progress_data or {}
        )
        
        db.session.add(user_achievement)
        db.session.commit()
        
        # Update Firebase for real-time notifications
        if firebase_enabled:
            try:
                ref = firebase_db.reference('achievements/' + str(user_id))
                ref.push({
                    'achievement_id': achievement_id,
                    'name': achievement.name,
                    'description': achievement.description,
                    'icon': achievement.icon,
                    'rarity': achievement.rarity,
                    'points_reward': achievement.points_reward,
                    'unlocked_at': datetime.datetime.utcnow().isoformat(),
                    'is_new': True
                })
            except Exception as e:
                print(f"Firebase achievement update error: {e}")
        
        return user_achievement
        
    except Exception as e:
        db.session.rollback()
        print(f"Error unlocking achievement: {e}")
        return None

def check_and_unlock_achievements(user_id):
    """Check all achievements and unlock any newly earned ones"""
    try:
        # Get all achievements
        achievements = Achievement.query.all()
        
        # Get user's current achievements
        user_achievement_ids = [ua.achievement_id for ua in 
                              UserAchievement.query.filter_by(user_id=user_id).all()]
        
        newly_unlocked = []
        
        for achievement in achievements:
            # Skip if already unlocked
            if achievement.achievement_id in user_achievement_ids:
                continue
            
            # Check if criteria is met
            if check_achievement_criteria(user_id, achievement):
                # Get current stats for progress data
                workout_count = Workout.query.filter_by(user_id=user_id).count()
                ranking_data = calculate_liftoff_ranking_points(user_id)
                
                progress_data = {
                    'workout_count': workout_count,
                    'total_points': ranking_data['total_points'],
                    'unlocked_at_stats': ranking_data
                }
                
                user_achievement = unlock_achievement(user_id, achievement.achievement_id, progress_data)
                if user_achievement:
                    newly_unlocked.append({
                        'achievement': achievement,
                        'user_achievement': user_achievement
                    })
        
        return newly_unlocked
        
    except Exception as e:
        print(f"Error checking achievements: {e}")
        return []

def get_achievement_rarity_color(rarity):
    """Get color code for achievement rarity"""
    colors = {
        'common': '#9E9E9E',      # Gray
        'rare': '#2196F3',        # Blue
        'epic': '#9C27B0',        # Purple
        'legendary': '#FF9800'     # Orange
    }
    return colors.get(rarity, '#9E9E9E')

def get_user_achievement_progress(user_id, achievement):
    """Calculate progress toward an achievement (0.0 to 1.0)"""
    try:
        # Check if already unlocked
        user_achievement = UserAchievement.query.filter_by(
            user_id=user_id, 
            achievement_id=achievement.achievement_id
        ).first()
        
        if user_achievement:
            return 1.0  # Already unlocked
        
        criteria = achievement.unlock_criteria
        if not criteria:
            return 0.0
        
        # Get current user stats
        workout_count = Workout.query.filter_by(user_id=user_id).count()
        ranking_data = calculate_liftoff_ranking_points(user_id)
        
        criteria_type = criteria.get('type')
        target = criteria.get('target', 1)
        
        if criteria_type == 'workout_count':
            return min(workout_count / target, 1.0)
        
        
        elif criteria_type == 'total_points':
            return min(ranking_data['total_points'] / target, 1.0)
        
        elif criteria_type == 'muscle_group_workout':
            muscle_group = criteria.get('muscle_group')
            muscle_workouts = db.session.query(Workout).join(
                WorkoutExercise, Workout.workout_id == WorkoutExercise.workout_id
            ).join(
                Exercise, WorkoutExercise.exercise_id == Exercise.exercise_id
            ).filter(
                Workout.user_id == user_id,
                Exercise.muscle_group == muscle_group
            ).count()
            return min(muscle_workouts / target, 1.0)
        
        return 0.0
        
    except Exception as e:
        print(f"Error calculating achievement progress: {e}")
        return 0.0

# Challenge System Functions
def calculate_challenge_progress(user_id, challenge):
    """Calculate user's progress for a specific challenge"""
    try:
        category = challenge.category
        start_date = challenge.start_date
        end_date = challenge.end_date
        
        if category == 'workout_count':
            # Count workouts during challenge period
            progress = Workout.query.filter(
                Workout.user_id == user_id,
                Workout.workout_date >= start_date,
                Workout.workout_date <= end_date
            ).count()
            
        elif category == 'volume':
            # Calculate total volume during challenge period
            workouts = Workout.query.filter(
                Workout.user_id == user_id,
                Workout.workout_date >= start_date,
                Workout.workout_date <= end_date
            ).all()
            
            progress = 0
            for workout in workouts:
                for exercise in workout.exercises:
                    volume = exercise.sets * exercise.reps * (exercise.weight or 0)
                    progress += volume
            
            
        elif category == 'consistency':
            # Count days with workouts during challenge period
            workouts = Workout.query.filter(
                Workout.user_id == user_id,
                Workout.workout_date >= start_date,
                Workout.workout_date <= end_date
            ).all()
            
            # Get unique workout dates
            workout_dates = set()
            for workout in workouts:
                workout_dates.add(workout.workout_date.date())
            
            progress = len(workout_dates)
            
        else:
            progress = 0
        
        return int(progress)
        
    except Exception as e:
        print(f"Error calculating challenge progress: {e}")
        return 0

def update_challenge_progress(user_id, challenge_id=None):
    """Update user's progress for challenges"""
    try:
        # Get active challenges user is participating in
        if challenge_id:
            user_challenges = UserChallenge.query.filter_by(
                user_id=user_id,
                challenge_id=challenge_id,
                completed=False
            ).all()
        else:
            # Get all active challenges user is participating in
            current_time = datetime.datetime.utcnow()
            user_challenges = db.session.query(UserChallenge).join(Challenge).filter(
                UserChallenge.user_id == user_id,
                UserChallenge.completed == False,
                Challenge.is_active == True,
                Challenge.start_date <= current_time,
                Challenge.end_date >= current_time
            ).all()
        
        newly_completed = []
        
        for user_challenge in user_challenges:
            challenge = user_challenge.challenge
            
            # Calculate current progress
            current_progress = calculate_challenge_progress(user_id, challenge)
            old_progress = user_challenge.current_progress
            
            # Update progress
            user_challenge.current_progress = current_progress
            
            # Add to progress history if progress changed
            if current_progress != old_progress:
                if not user_challenge.progress_history:
                    user_challenge.progress_history = []
                
                user_challenge.progress_history.append({
                    'date': datetime.datetime.utcnow().isoformat(),
                    'progress': current_progress,
                    'change': current_progress - old_progress
                })
            
            # Check if challenge is completed
            if current_progress >= challenge.target_value and not user_challenge.completed:
                user_challenge.completed = True
                user_challenge.completed_at = datetime.datetime.utcnow()
                
                newly_completed.append({
                    'challenge': challenge,
                    'user_challenge': user_challenge,
                    'final_progress': current_progress
                })
        
        db.session.commit()
        
        # Update Firebase for real-time challenge updates
        if firebase_enabled and newly_completed:
            try:
                for item in newly_completed:
                    challenge = item['challenge']
                    ref = firebase_db.reference('challenges/' + str(challenge.challenge_id) + '/participants/' + str(user_id))
                    ref.update({
                        'completed': True,
                        'completed_at': datetime.datetime.utcnow().isoformat(),
                        'final_progress': item['final_progress']
                    })
            except Exception as e:
                print(f"Firebase challenge update error: {e}")
        
        return newly_completed
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating challenge progress: {e}")
        return []

def join_challenge(user_id, challenge_id):
    """Join a challenge"""
    try:
        # Check if challenge exists and is active
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return None, "Challenge not found"
        
        current_time = datetime.datetime.utcnow()
        if not challenge.is_active or current_time > challenge.end_date:
            return None, "Challenge is not active"
        
        if current_time < challenge.start_date:
            return None, "Challenge has not started yet"
        
        # Check if already joined
        existing = UserChallenge.query.filter_by(
            user_id=user_id,
            challenge_id=challenge_id
        ).first()
        
        if existing:
            return None, "Already joined this challenge"
        
        # Check participant limit
        if challenge.max_participants:
            current_participants = UserChallenge.query.filter_by(challenge_id=challenge_id).count()
            if current_participants >= challenge.max_participants:
                return None, "Challenge is full"
        
        # For friend battles, check if user is invited
        if challenge.challenge_type == 'friend_battle':
            if challenge.creator_id != user_id:
                invited_users = challenge.invited_user_ids or []
                if user_id not in invited_users:
                    return None, "Not invited to this challenge"
        
        # Join challenge
        user_challenge = UserChallenge(
            user_id=user_id,
            challenge_id=challenge_id,
            current_progress=0
        )
        
        db.session.add(user_challenge)
        
        # Calculate initial progress
        initial_progress = calculate_challenge_progress(user_id, challenge)
        user_challenge.current_progress = initial_progress
        
        db.session.commit()
        
        # Update Firebase for real-time updates
        if firebase_enabled:
            try:
                ref = firebase_db.reference('challenges/' + str(challenge_id) + '/participants/' + str(user_id))
                ref.set({
                    'joined_at': datetime.datetime.utcnow().isoformat(),
                    'current_progress': initial_progress,
                    'completed': False
                })
            except Exception as e:
                print(f"Firebase challenge join error: {e}")
        
        return user_challenge, "Successfully joined challenge"
        
    except Exception as e:
        db.session.rollback()
        print(f"Error joining challenge: {e}")
        return None, f"Error joining challenge: {str(e)}"

def create_friend_battle(creator_id, friend_ids, challenge_data):
    """Create a friend battle challenge"""
    try:
        # Validate friends
        for friend_id in friend_ids:
            if friend_id == creator_id:
                continue
            
            # Check if they are friends
            friendship = Friend.query.filter(
                db.or_(
                    db.and_(Friend.user_id == creator_id, Friend.friend_id == friend_id, Friend.status == 'accepted'),
                    db.and_(Friend.user_id == friend_id, Friend.friend_id == creator_id, Friend.status == 'accepted')
                )
            ).first()
            
            if not friendship:
                return None, f"Not friends with user {friend_id}"
        
        # Create challenge
        start_date = datetime.datetime.utcnow()
        duration_days = challenge_data.get('duration_days', 7)  # Default 7 days
        end_date = start_date + datetime.timedelta(days=duration_days)
        
        challenge = Challenge(
            name=challenge_data['name'],
            description=challenge_data.get('description', ''),
            challenge_type='friend_battle',
            category=challenge_data['category'],
            icon=challenge_data.get('icon', 'emoji_events'),
            target_value=challenge_data['target_value'],
            target_unit=challenge_data.get('target_unit', 'workouts'),
            points_reward=challenge_data.get('points_reward', 50),
            start_date=start_date,
            end_date=end_date,
            is_active=True,
            is_global=False,
            creator_id=creator_id,
            invited_user_ids=friend_ids,
            difficulty=challenge_data.get('difficulty', 'medium')
        )
        
        db.session.add(challenge)
        db.session.flush()  # Get challenge_id
        
        # Auto-join creator
        creator_participation = UserChallenge(
            user_id=creator_id,
            challenge_id=challenge.challenge_id,
            current_progress=0
        )
        db.session.add(creator_participation)
        
        db.session.commit()
        
        # Update Firebase
        if firebase_enabled:
            try:
                ref = firebase_db.reference('challenges/' + str(challenge.challenge_id))
                ref.set({
                    'name': challenge.name,
                    'challenge_type': 'friend_battle',
                    'creator_id': creator_id,
                    'invited_users': friend_ids,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'target_value': challenge.target_value,
                    'participants': {
                        str(creator_id): {
                            'joined_at': datetime.datetime.utcnow().isoformat(),
                            'current_progress': 0,
                            'completed': False
                        }
                    }
                })
            except Exception as e:
                print(f"Firebase friend battle creation error: {e}")
        
        return challenge, "Friend battle created successfully"
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating friend battle: {e}")
        return None, f"Error creating friend battle: {str(e)}"

def get_challenge_leaderboard(challenge_id):
    """Get leaderboard for a specific challenge"""
    try:
        # Get all participants
        participants = db.session.query(UserChallenge, User).join(User).filter(
            UserChallenge.challenge_id == challenge_id
        ).order_by(UserChallenge.current_progress.desc()).all()
        
        leaderboard = []
        for i, (user_challenge, user) in enumerate(participants):
            leaderboard.append({
                'rank': i + 1,
                'user_id': user.user_id,
                'username': user.username,
                'current_progress': user_challenge.current_progress,
                'completed': user_challenge.completed,
                'completed_at': user_challenge.completed_at.isoformat() if user_challenge.completed_at else None,
                'joined_at': user_challenge.joined_at.isoformat()
            })
        
        return leaderboard
        
    except Exception as e:
        print(f"Error getting challenge leaderboard: {e}")
        return []

def get_challenge_difficulty_color(difficulty):
    """Get color code for challenge difficulty"""
    colors = {
        'easy': '#4CAF50',      # Green
        'medium': '#FF9800',    # Orange  
        'hard': '#F44336',      # Red
        'extreme': '#9C27B0'    # Purple
    }
    return colors.get(difficulty, '#FF9800')

# Enhanced Ranking System Functions
def calculate_consistency_score(user_id):
    """Calculate consistency score based on workout frequency and regularity"""
    try:
        # Get workouts from last 90 days
        ninety_days_ago = datetime.datetime.now() - datetime.timedelta(days=90)
        recent_workouts = Workout.query.filter(
            Workout.user_id == user_id,
            Workout.workout_date >= ninety_days_ago
        ).order_by(Workout.workout_date).all()
        
        if not recent_workouts:
            return 0
        
        # Get unique workout dates
        workout_dates = set()
        for workout in recent_workouts:
            workout_dates.add(workout.workout_date.date())
        
        workout_dates = sorted(list(workout_dates))
        
        if len(workout_dates) < 2:
            return len(workout_dates) * 10  # 10 points per workout day if less than 2
        
        # Calculate consistency based on regularity
        total_days = (workout_dates[-1] - workout_dates[0]).days + 1
        workout_frequency = len(workout_dates) / total_days if total_days > 0 else 0
        
        # Calculate gaps between workouts
        gaps = []
        for i in range(1, len(workout_dates)):
            gap = (workout_dates[i] - workout_dates[i-1]).days
            gaps.append(gap)
        
        # Consistency is better with smaller, more regular gaps
        avg_gap = sum(gaps) / len(gaps) if gaps else 0
        gap_variance = sum((gap - avg_gap) ** 2 for gap in gaps) / len(gaps) if gaps else 0
        
        # Base score from workout frequency (0-60 points)
        frequency_score = min(workout_frequency * 60, 60)
        
        # Regularity bonus (0-40 points) - less variance is better
        regularity_score = max(40 - gap_variance, 0) if gap_variance <= 40 else 0
        
        # Total consistency score (0-100 points)
        consistency_score = int(frequency_score + regularity_score)
        
        return min(consistency_score, 100)
        
    except Exception as e:
        print(f"Error calculating consistency score: {e}")
        return 0

def calculate_liftoff_ranking_points(user_id):
    """Calculate total ranking points using Liftoff-style algorithm"""
    try:
        # Base points from workouts (2 points each)
        workout_count = Workout.query.filter_by(user_id=user_id).count()
        workout_points = workout_count * 2
        
        # Consistency bonus (up to 100 points)
        consistency_points = calculate_consistency_score(user_id)
        
        # Total points
        total_points = workout_points + consistency_points
        
        return {
            'total_points': total_points,
            'workout_points': workout_points,
            'consistency_points': consistency_points,
            'workout_count': workout_count
        }
        
    except Exception as e:
        print(f"Error calculating ranking points: {e}")
        return {
            'total_points': 0,
            'workout_points': 0,
            'consistency_points': 0,
            'workout_count': 0
        }

def get_rank_tier_from_points(total_points):
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

def get_rank_color(rank_tier):
    colors = {
        'Bronze': '#CD7F32',
        'Silver': '#C0C0C0',
        'Gold': '#FFD700',
        'Platinum': '#E5E4E2',
        'Diamond': '#B9F2FF'
    }
    return colors.get(rank_tier, '#CD7F32')

def calculate_muscle_group_ranking(user_id, muscle_group):
    """Calculate ranking for a specific muscle group"""
    try:
        # Get workouts for this muscle group
        muscle_group_workouts = db.session.query(Workout).join(
            WorkoutExercise, Workout.workout_id == WorkoutExercise.workout_id
        ).join(
            Exercise, WorkoutExercise.exercise_id == Exercise.exercise_id
        ).filter(
            Workout.user_id == user_id,
            Exercise.muscle_group == muscle_group
        ).all()
        
        if not muscle_group_workouts:
            return {
                'total_points': 0,
                'rank_tier': 'Bronze',
                'workout_count': 0,
                'total_volume': 0
            }
        
        # Calculate muscle group specific stats
        total_volume = 0
        workout_count = len(set(w.workout_id for w in muscle_group_workouts))
        
        for workout in muscle_group_workouts:
            for exercise in workout.exercises:
                if exercise.exercise.muscle_group == muscle_group:
                    volume = exercise.sets * exercise.reps * (exercise.weight or 0)
                    total_volume += volume
        
        # Points calculation for muscle group
        workout_points = workout_count * 2
        volume_points = int(total_volume * 0.1)  # Volume bonus
        
        total_points = workout_points + volume_points
        rank_tier = get_rank_tier_from_points(total_points)
        
        return {
            'total_points': total_points,
            'rank_tier': rank_tier,
            'workout_count': workout_count,
            'total_volume': total_volume,
            'workout_points': workout_points,
            'volume_points': volume_points
        }
        
    except Exception as e:
        print(f"Error calculating muscle group ranking: {e}")
        return {
            'total_points': 0,
            'rank_tier': 'Bronze',
            'workout_count': 0,
            'total_volume': 0
        }

def update_user_rankings(user_id):
    """
    Update user rankings using enhanced 5-tier Liftoff-style algorithm
    """
    try:
        # Calculate overall ranking using new Liftoff-style points
        overall_ranking = calculate_liftoff_ranking_points(user_id)
        overall_rank_tier = get_rank_tier_from_points(overall_ranking['total_points'])
        
        # Update or create overall ranking
        overall_ranking_record = UserRanking.query.filter_by(user_id=user_id, muscle_group='overall').first()
        if overall_ranking_record:
            overall_ranking_record.mmr_score = overall_ranking['total_points']
            overall_ranking_record.rank_tier = overall_rank_tier
        else:
            overall_ranking_record = UserRanking(
                user_id=user_id,
                muscle_group='overall',
                mmr_score=overall_ranking['total_points'],
                rank_tier=overall_rank_tier
            )
            db.session.add(overall_ranking_record)
        
        # Get unique muscle groups from user's workouts
        muscle_groups = db.session.query(Exercise.muscle_group.distinct()).join(
            WorkoutExercise, Exercise.exercise_id == WorkoutExercise.exercise_id
        ).join(
            Workout, WorkoutExercise.workout_id == Workout.workout_id
        ).filter(Workout.user_id == user_id).all()
        
        # Update rankings for each muscle group
        for (muscle_group,) in muscle_groups:
            muscle_group_ranking = calculate_muscle_group_ranking(user_id, muscle_group)
            
            # Check if ranking exists
            ranking = UserRanking.query.filter_by(user_id=user_id, muscle_group=muscle_group).first()
            
            if ranking:
                # Update existing ranking
                ranking.mmr_score = muscle_group_ranking['total_points']
                ranking.rank_tier = muscle_group_ranking['rank_tier']
            else:
                # Create new ranking
                ranking = UserRanking(
                    user_id=user_id,
                    muscle_group=muscle_group,
                    mmr_score=muscle_group_ranking['total_points'],
                    rank_tier=muscle_group_ranking['rank_tier']
                )
                db.session.add(ranking)
        
        db.session.commit()
        
        # Update Firebase for real-time leaderboard
        if firebase_enabled:
            try:
                firebase_data = {
                    'updated_at': datetime.datetime.utcnow().isoformat(),
                    'overall_ranking': {
                        'total_points': overall_ranking['total_points'],
                        'rank_tier': overall_rank_tier,
                        'rank_color': get_rank_color(overall_rank_tier),
                        'workout_points': overall_ranking['workout_points'],
                        'consistency_points': overall_ranking['consistency_points']
                    }
                }
                
                ref = firebase_db.reference('rankings/' + str(user_id))
                ref.update(firebase_data)
            except Exception as e:
                print(f"Firebase ranking update error: {e}")
    
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user rankings: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# Personal Records Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def check_and_update_personal_records(user_id, workout_id):
    """
    Check if any exercises in the workout achieved new personal records
    """
    try:
        newly_achieved_prs = []
        
        # Get all exercises from the workout
        workout_exercises = WorkoutExercise.query.filter_by(workout_id=workout_id).all()
        
        for workout_exercise in workout_exercises:
            if not workout_exercise.weight or not workout_exercise.sets or not workout_exercise.reps:
                continue  # Skip exercises without complete data
            
            exercise_id = workout_exercise.exercise_id
            sets = workout_exercise.sets
            reps = workout_exercise.reps
            weight = workout_exercise.weight
            
            # Calculate different record types
            total_volume = sets * reps * weight  # Total volume for this exercise
            max_weight = weight  # Max weight per rep
            total_reps = sets * reps  # Total reps
            
            # Check for max weight PR
            max_weight_pr = check_single_pr(user_id, exercise_id, 'max_weight', max_weight)
            if max_weight_pr:
                pr = create_personal_record(
                    user_id, exercise_id, 'max_weight', max_weight,
                    sets, reps, weight, workout_id, max_weight_pr
                )
                if pr:
                    newly_achieved_prs.append(pr)
            
            # Check for max volume PR (for this exercise in a single workout)
            max_volume_pr = check_single_pr(user_id, exercise_id, 'max_volume', total_volume)
            if max_volume_pr:
                pr = create_personal_record(
                    user_id, exercise_id, 'max_volume', total_volume,
                    sets, reps, weight, workout_id, max_volume_pr
                )
                if pr:
                    newly_achieved_prs.append(pr)
            
            # Check for max reps PR (total reps in workout for this exercise)
            max_reps_pr = check_single_pr(user_id, exercise_id, 'max_reps', total_reps)
            if max_reps_pr:
                pr = create_personal_record(
                    user_id, exercise_id, 'max_reps', total_reps,
                    sets, reps, weight, workout_id, max_reps_pr
                )
                if pr:
                    newly_achieved_prs.append(pr)
        
        return newly_achieved_prs
        
    except Exception as e:
        print(f"Error checking personal records: {e}")
        return []

def check_single_pr(user_id, exercise_id, record_type, new_value):
    """
    Check if a new value is a personal record for a specific exercise and record type
    Returns the previous record value if it's a new PR, None otherwise
    """
    try:
        # Get the current best record for this exercise and type
        current_pr = PersonalRecord.query.filter_by(
            user_id=user_id,
            exercise_id=exercise_id,
            record_type=record_type
        ).order_by(PersonalRecord.record_value.desc()).first()
        
        if not current_pr:
            # No previous record, so this is the first PR
            return 0.0
        
        if new_value > current_pr.record_value:
            # New record achieved
            return current_pr.record_value
        
        return None  # Not a new record
        
    except Exception as e:
        print(f"Error checking single PR: {e}")
        return None

def create_personal_record(user_id, exercise_id, record_type, record_value, sets, reps, weight, workout_id, previous_record):
    """
    Create a new personal record entry
    """
    try:
        new_pr = PersonalRecord(
            user_id=user_id,
            exercise_id=exercise_id,
            record_type=record_type,
            record_value=record_value,
            sets=sets,
            reps=reps,
            weight=weight,
            workout_id=workout_id,
            previous_record=previous_record,
            achieved_at=datetime.datetime.utcnow()
        )
        
        db.session.add(new_pr)
        db.session.commit()
        
        return new_pr
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating personal record: {e}")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# Firebase Real-time Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def sync_user_data_to_firebase(user_id, data_type, data):
    """
    Sync user data to Firebase Realtime Database
    Args:
        user_id: User ID
        data_type: Type of data ('rankings', 'achievements', 'challenges')
        data: Data to sync
    """
    if not firebase_enabled:
        return False
    
    try:
        ref = firebase_db.reference(f'users/{user_id}/{data_type}')
        ref.set(data)
        return True
    except Exception as e:
        print(f"Firebase sync error for user {user_id} ({data_type}): {e}")
        return False

def sync_leaderboard_to_firebase(leaderboard_type, data, muscle_group=None, period=None):
    """
    Sync leaderboard data to Firebase for real-time updates
    Args:
        leaderboard_type: 'global', 'muscle_group', 'challenge'
        data: Leaderboard data
        muscle_group: Optional muscle group filter
        period: Optional time period filter
    """
    if not firebase_enabled:
        return False
    
    try:
        if leaderboard_type == 'muscle_group' and muscle_group:
            ref = firebase_db.reference(f'leaderboards/muscle/{muscle_group}')
            if period:
                ref = firebase_db.reference(f'leaderboards/muscle/{muscle_group}/{period}')
        elif leaderboard_type == 'challenge':
            ref = firebase_db.reference(f'leaderboards/challenges')
        else:
            ref = firebase_db.reference(f'leaderboards/global')
            if period:
                ref = firebase_db.reference(f'leaderboards/global/{period}')
        
        ref.set({
            'data': data,
            'last_updated': datetime.datetime.utcnow().isoformat(),
            'total_users': len(data) if isinstance(data, list) else 0
        })
        return True
    except Exception as e:
        print(f"Firebase leaderboard sync error ({leaderboard_type}): {e}")
        return False

def broadcast_achievement_unlock(user_id, achievement_data):
    """
    Broadcast achievement unlock to Firebase for real-time notifications
    Args:
        user_id: User who unlocked the achievement
        achievement_data: Achievement details
    """
    if not firebase_enabled:
        return False
    
    try:
        # Add to user's achievement feed
        user_ref = firebase_db.reference(f'users/{user_id}/recent_achievements')
        user_ref.push({
            'achievement_id': achievement_data['achievement_id'],
            'name': achievement_data['name'],
            'description': achievement_data['description'],
            'icon': achievement_data['icon'],
            'rarity': achievement_data['rarity'],
            'points_reward': achievement_data['points_reward'],
            'unlocked_at': datetime.datetime.utcnow().isoformat()
        })
        
        # Add to global achievement feed for community visibility
        global_ref = firebase_db.reference('global/recent_achievements')
        global_ref.push({
            'user_id': user_id,
            'achievement_id': achievement_data['achievement_id'],
            'name': achievement_data['name'],
            'rarity': achievement_data['rarity'],
            'unlocked_at': datetime.datetime.utcnow().isoformat()
        })
        
        return True
    except Exception as e:
        print(f"Firebase achievement broadcast error: {e}")
        return False


def sync_challenge_progress_to_firebase(challenge_id, leaderboard_data):
    """
    Sync challenge progress and leaderboard to Firebase
    Args:
        challenge_id: Challenge ID
        leaderboard_data: Current challenge leaderboard
    """
    if not firebase_enabled:
        return False
    
    try:
        ref = firebase_db.reference(f'challenges/{challenge_id}/leaderboard')
        ref.set({
            'leaderboard': leaderboard_data,
            'last_updated': datetime.datetime.utcnow().isoformat(),
            'participant_count': len(leaderboard_data) if isinstance(leaderboard_data, list) else 0
        })
        
        # Also update global challenges overview
        global_ref = firebase_db.reference('global/active_challenges')
        global_ref.child(str(challenge_id)).update({
            'participant_count': len(leaderboard_data) if isinstance(leaderboard_data, list) else 0,
            'last_activity': datetime.datetime.utcnow().isoformat()
        })
        
        return True
    except Exception as e:
        print(f"Firebase challenge sync error: {e}")
        return False

def broadcast_challenge_completion(user_id, challenge_data):
    """
    Broadcast challenge completion to Firebase
    Args:
        user_id: User who completed the challenge
        challenge_data: Challenge details
    """
    if not firebase_enabled:
        return False
    
    try:
        # Add to user's challenge feed
        user_ref = firebase_db.reference(f'users/{user_id}/completed_challenges')
        user_ref.push({
            'challenge_id': challenge_data['challenge_id'],
            'name': challenge_data['name'],
            'category': challenge_data['category'],
            'difficulty': challenge_data.get('difficulty', 'medium'),
            'points_reward': challenge_data['points_reward'],
            'final_progress': challenge_data['final_progress'],
            'target_value': challenge_data['target_value'],
            'completed_at': datetime.datetime.utcnow().isoformat()
        })
        
        # Add to global challenge completion feed
        global_ref = firebase_db.reference('global/challenge_completions')
        global_ref.push({
            'user_id': user_id,
            'challenge_id': challenge_data['challenge_id'],
            'challenge_name': challenge_data['name'],
            'difficulty': challenge_data.get('difficulty', 'medium'),
            'completed_at': datetime.datetime.utcnow().isoformat()
        })
        
        return True
    except Exception as e:
        print(f"Firebase challenge completion broadcast error: {e}")
        return False

def sync_user_ranking_to_firebase(user_id, ranking_data):
    """
    Sync individual user ranking data to Firebase
    Args:
        user_id: User ID
        ranking_data: Complete ranking information
    """
    if not firebase_enabled:
        return False
    
    try:
        ref = firebase_db.reference(f'users/{user_id}/ranking')
        ref.set({
            'total_points': ranking_data['total_points'],
            'rank_tier': ranking_data.get('rank_tier', 'Bronze'),
            'rank_color': ranking_data.get('rank_color', '#CD7F32'),
            'workout_points': ranking_data['workout_points'],
            'consistency_points': ranking_data['consistency_points'],
            'last_updated': datetime.datetime.utcnow().isoformat()
        })
        
        return True
    except Exception as e:
        print(f"Firebase user ranking sync error: {e}")
        return False

def cleanup_old_firebase_data():
    """
    Clean up old Firebase data to prevent unlimited growth
    Keeps last 30 days of activity feeds
    """
    if not firebase_enabled:
        return False
    
    try:
        cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        cutoff_timestamp = cutoff_date.isoformat()
        
        # Clean up global feeds (keep recent data only)
        global_feeds = ['recent_achievements', 'challenge_completions']
        
        for feed_name in global_feeds:
            ref = firebase_db.reference(f'global/{feed_name}')
            old_data = ref.order_by_child('achieved_at').end_at(cutoff_timestamp).get()
            
            if old_data:
                for key in old_data.keys():
                    ref.child(key).delete()
        
        print(f"Firebase cleanup completed for data older than {cutoff_date.date()}")
        return True
    except Exception as e:
        print(f"Firebase cleanup error: {e}")
        return False

# Initialize database
def initialize_database():
    db.create_all()
    
    # Check if exercises table is empty
    if Exercise.query.count() == 0:
        # Add some default exercises
        default_exercises = [
            # Chest exercises
            {'name': 'Bench Press', 'muscle_group': 'Chest', 'description': 'Lie on a flat bench and press weight upward.', 'is_compound': True},
            {'name': 'Incline Bench Press', 'muscle_group': 'Chest', 'description': 'Lie on an inclined bench and press weight upward.', 'is_compound': True},
            {'name': 'Decline Bench Press', 'muscle_group': 'Chest', 'description': 'Lie on a declined bench and press weight upward.', 'is_compound': True},
            {'name': 'Dumbbell Fly', 'muscle_group': 'Chest', 'description': 'Lie on a bench and move dumbbells in an arc.', 'is_compound': False},
            {'name': 'Push-Up', 'muscle_group': 'Chest', 'description': 'Push body up from the ground.', 'is_compound': True},
            
            # Back exercises
            {'name': 'Pull-Up', 'muscle_group': 'Back', 'description': 'Pull body up to a bar.', 'is_compound': True},
            {'name': 'Lat Pulldown', 'muscle_group': 'Back', 'description': 'Pull a bar down to chest level.', 'is_compound': True},
            {'name': 'Bent Over Row', 'muscle_group': 'Back', 'description': 'Bend over and pull weight to chest.', 'is_compound': True},
            {'name': 'Deadlift', 'muscle_group': 'Back', 'description': 'Lift weight from ground to hip level.', 'is_compound': True},
            {'name': 'T-Bar Row', 'muscle_group': 'Back', 'description': 'Row weight upward using a T-bar.', 'is_compound': True},
            
            # Legs exercises
            {'name': 'Squat', 'muscle_group': 'Legs', 'description': 'Bend knees and lower body, then stand up.', 'is_compound': True},
            {'name': 'Leg Press', 'muscle_group': 'Legs', 'description': 'Push weight away using legs.', 'is_compound': True},
            {'name': 'Leg Extension', 'muscle_group': 'Legs', 'description': 'Extend legs to lift weight.', 'is_compound': False},
            {'name': 'Leg Curl', 'muscle_group': 'Legs', 'description': 'Curl legs to lift weight.', 'is_compound': False},
            {'name': 'Calf Raise', 'muscle_group': 'Legs', 'description': 'Raise heels to lift weight.', 'is_compound': False},
            
            # Shoulders exercises
            {'name': 'Overhead Press', 'muscle_group': 'Shoulders', 'description': 'Press weight overhead.', 'is_compound': True},
            {'name': 'Lateral Raise', 'muscle_group': 'Shoulders', 'description': 'Raise arms to sides.', 'is_compound': False},
            {'name': 'Front Raise', 'muscle_group': 'Shoulders', 'description': 'Raise arms to front.', 'is_compound': False},
            {'name': 'Reverse Fly', 'muscle_group': 'Shoulders', 'description': 'Raise arms to back.', 'is_compound': False},
            {'name': 'Shrug', 'muscle_group': 'Shoulders', 'description': 'Lift shoulders upward.', 'is_compound': False},
            
            # Arms exercises
            {'name': 'Bicep Curl', 'muscle_group': 'Arms', 'description': 'Curl weight toward shoulder.', 'is_compound': False},
            {'name': 'Tricep Extension', 'muscle_group': 'Arms', 'description': 'Extend arms to straighten.', 'is_compound': False},
            {'name': 'Hammer Curl', 'muscle_group': 'Arms', 'description': 'Curl weight with neutral grip.', 'is_compound': False},
            {'name': 'Skull Crusher', 'muscle_group': 'Arms', 'description': 'Lower weight to forehead, then extend arms.', 'is_compound': False},
            {'name': 'Chin-Up', 'muscle_group': 'Arms', 'description': 'Pull body up to a bar with underhand grip.', 'is_compound': True}
        ]
        
        for exercise_data in default_exercises:
            exercise = Exercise(**exercise_data)
            db.session.add(exercise)
        
        db.session.commit()
        print("Added default exercises to database")
    
    # Check if achievements table is empty
    if Achievement.query.count() == 0:
        # Add default achievements
        default_achievements = [
            # Workout milestones
            {
                'name': 'First Steps',
                'description': 'Complete your first workout',
                'icon': 'fitness_center',
                'category': 'milestone',
                'unlock_criteria': {'type': 'workout_count', 'target': 1},
                'points_reward': 10,
                'rarity': 'common'
            },
            {
                'name': 'Getting Started',
                'description': 'Complete 5 workouts',
                'icon': 'trending_up',
                'category': 'milestone',
                'unlock_criteria': {'type': 'workout_count', 'target': 5},
                'points_reward': 25,
                'rarity': 'common'
            },
            {
                'name': 'Dedicated',
                'description': 'Complete 10 workouts',
                'icon': 'stars',
                'category': 'milestone',
                'unlock_criteria': {'type': 'workout_count', 'target': 10},
                'points_reward': 50,
                'rarity': 'rare'
            },
            {
                'name': 'Committed',
                'description': 'Complete 25 workouts',
                'icon': 'emoji_events',
                'category': 'milestone',
                'unlock_criteria': {'type': 'workout_count', 'target': 25},
                'points_reward': 100,
                'rarity': 'rare'
            },
            {
                'name': 'Fitness Enthusiast',
                'description': 'Complete 50 workouts',
                'icon': 'local_fire_department',
                'category': 'milestone',
                'unlock_criteria': {'type': 'workout_count', 'target': 50},
                'points_reward': 200,
                'rarity': 'epic'
            },
            {
                'name': 'Gym Legend',
                'description': 'Complete 100 workouts',
                'icon': 'military_tech',
                'category': 'milestone',
                'unlock_criteria': {'type': 'workout_count', 'target': 100},
                'points_reward': 500,
                'rarity': 'legendary'
            },
            
            
            # Ranking achievements
            {
                'name': 'Silver Medalist',
                'description': 'Reach Silver rank',
                'icon': 'workspace_premium',
                'category': 'milestone',
                'unlock_criteria': {'type': 'rank_tier', 'target': 'Silver'},
                'points_reward': 100,
                'rarity': 'rare'
            },
            {
                'name': 'Golden Champion',
                'description': 'Reach Gold rank',
                'icon': 'emoji_events',
                'category': 'milestone',
                'unlock_criteria': {'type': 'rank_tier', 'target': 'Gold'},
                'points_reward': 250,
                'rarity': 'epic'
            },
            {
                'name': 'Platinum Elite',
                'description': 'Reach Platinum rank',
                'icon': 'star',
                'category': 'milestone',
                'unlock_criteria': {'type': 'rank_tier', 'target': 'Platinum'},
                'points_reward': 500,
                'rarity': 'legendary'
            },
            {
                'name': 'Diamond Legend',
                'description': 'Reach Diamond rank',
                'icon': 'diamond',
                'category': 'milestone',
                'unlock_criteria': {'type': 'rank_tier', 'target': 'Diamond'},
                'points_reward': 1000,
                'rarity': 'legendary'
            },
            
            # Muscle group achievements
            {
                'name': 'Chest Crusher',
                'description': 'Complete 10 chest workouts',
                'icon': 'self_improvement',
                'category': 'muscle_group',
                'unlock_criteria': {'type': 'muscle_group_workout', 'muscle_group': 'Chest', 'target': 10},
                'points_reward': 75,
                'rarity': 'rare'
            },
            {
                'name': 'Back Builder',
                'description': 'Complete 10 back workouts',
                'icon': 'accessibility_new',
                'category': 'muscle_group',
                'unlock_criteria': {'type': 'muscle_group_workout', 'muscle_group': 'Back', 'target': 10},
                'points_reward': 75,
                'rarity': 'rare'
            },
            {
                'name': 'Leg Legend',
                'description': 'Complete 10 leg workouts',
                'icon': 'directions_run',
                'category': 'muscle_group',
                'unlock_criteria': {'type': 'muscle_group_workout', 'muscle_group': 'Legs', 'target': 10},
                'points_reward': 75,
                'rarity': 'rare'
            },
            {
                'name': 'Shoulder Shredder',
                'description': 'Complete 10 shoulder workouts',
                'icon': 'sports_gymnastics',
                'category': 'muscle_group',
                'unlock_criteria': {'type': 'muscle_group_workout', 'muscle_group': 'Shoulders', 'target': 10},
                'points_reward': 75,
                'rarity': 'rare'
            },
            {
                'name': 'Arm Architect',
                'description': 'Complete 10 arm workouts',
                'icon': 'sports_handball',
                'category': 'muscle_group',
                'unlock_criteria': {'type': 'muscle_group_workout', 'muscle_group': 'Arms', 'target': 10},
                'points_reward': 75,
                'rarity': 'rare'
            },
            
            # Social achievements
            {
                'name': 'Social Butterfly',
                'description': 'Add your first friend',
                'icon': 'group_add',
                'category': 'social',
                'unlock_criteria': {'type': 'friends_count', 'target': 1},
                'points_reward': 25,
                'rarity': 'common'
            },
            {
                'name': 'Squad Goals',
                'description': 'Add 5 friends',
                'icon': 'groups',
                'category': 'social',
                'unlock_criteria': {'type': 'friends_count', 'target': 5},
                'points_reward': 100,
                'rarity': 'rare'
            },
            
            # Volume achievements
            {
                'name': 'Heavy Lifter',
                'description': 'Lift 10,000 total volume',
                'icon': 'fitness_center',
                'category': 'volume',
                'unlock_criteria': {'type': 'volume_milestone', 'target': 10000},
                'points_reward': 150,
                'rarity': 'epic'
            },
            {
                'name': 'Volume King',
                'description': 'Lift 50,000 total volume',
                'icon': 'trending_up',
                'category': 'volume',
                'unlock_criteria': {'type': 'volume_milestone', 'target': 50000},
                'points_reward': 500,
                'rarity': 'legendary'
            }
        ]
        
        for achievement_data in default_achievements:
            achievement = Achievement(**achievement_data)
            db.session.add(achievement)
        
        db.session.commit()
        print("Added default achievements to database")
    
    # Check if challenges table is empty
    if Challenge.query.count() == 0:
        # Calculate dates for challenges
        now = datetime.datetime.utcnow()
        week_end = now + datetime.timedelta(days=7)
        month_end = now + datetime.timedelta(days=30)
        
        default_challenges = [
            # Weekly Challenges
            {
                'name': 'Weekly Warrior',
                'description': 'Complete 5 workouts this week',
                'challenge_type': 'weekly',
                'category': 'workout_count',
                'icon': '🏆',
                'target_value': 5,
                'target_unit': 'workouts',
                'points_reward': 50,
                'difficulty': 'medium',
                'start_date': now,
                'end_date': week_end,
                'is_active': True,
                'max_participants': None
            },
            {
                'name': 'Volume Crusher',
                'description': 'Lift 10,000 lbs total this week',
                'challenge_type': 'weekly',
                'category': 'volume',
                'icon': '💪',
                'target_value': 10000,
                'target_unit': 'lbs',
                'points_reward': 100,
                'difficulty': 'hard',
                'start_date': now,
                'end_date': week_end,
                'is_active': True,
                'max_participants': None
            },
            
            # Monthly Challenges
            {
                'name': 'Monthly Madness',
                'description': 'Complete 20 workouts this month',
                'challenge_type': 'monthly',
                'category': 'workout_count',
                'icon': '🎯',
                'target_value': 20,
                'target_unit': 'workouts',
                'points_reward': 200,
                'difficulty': 'extreme',
                'start_date': now,
                'end_date': month_end,
                'is_active': True,
                'max_participants': None
            },
            {
                'name': 'Consistency Champion',
                'description': 'Workout at least 4 times per week for a month',
                'challenge_type': 'monthly',
                'category': 'consistency',
                'icon': '⭐',
                'target_value': 4,
                'target_unit': 'workouts/week',
                'points_reward': 250,
                'difficulty': 'extreme',
                'start_date': now,
                'end_date': month_end,
                'is_active': True,
                'max_participants': None
            },
            {
                'name': 'Iron Month',
                'description': 'Lift 50,000 lbs total this month',
                'challenge_type': 'monthly',
                'category': 'volume',
                'icon': '🏋️',
                'target_value': 50000,
                'target_unit': 'lbs',
                'points_reward': 300,
                'difficulty': 'extreme',
                'start_date': now,
                'end_date': month_end,
                'is_active': True,
                'max_participants': None
            },
            
            # Daily Challenges
            {
                'name': 'Daily Grind',
                'description': 'Complete 1 workout today',
                'challenge_type': 'daily',
                'category': 'workout_count',
                'icon': '🌅',
                'target_value': 1,
                'target_unit': 'workout',
                'points_reward': 10,
                'difficulty': 'easy',
                'start_date': now,
                'end_date': now + datetime.timedelta(days=1),
                'is_active': True,
                'max_participants': None
            },
            
            # Community Challenges
            {
                'name': 'Community Challenge: Summer Shred',
                'description': 'Join the community in completing 1000 collective workouts',
                'challenge_type': 'community',
                'category': 'workout_count',
                'icon': '🌊',
                'target_value': 1000,
                'target_unit': 'workouts',
                'points_reward': 150,
                'difficulty': 'medium',
                'start_date': now,
                'end_date': month_end,
                'is_active': True,
                'max_participants': 500
            },
            {
                'name': 'Global Volume Challenge',
                'description': 'Help the community lift 1 million lbs together',
                'challenge_type': 'community',
                'category': 'volume',
                'icon': '🌍',
                'target_value': 1000000,
                'target_unit': 'lbs',
                'points_reward': 200,
                'difficulty': 'hard',
                'start_date': now,
                'end_date': month_end,
                'is_active': True,
                'max_participants': 1000
            }
        ]
        
        for challenge_data in default_challenges:
            challenge = Challenge(**challenge_data)
            db.session.add(challenge)
        
        db.session.commit()
        print("Added default challenges to database")

# ─────────────────────────────────────────────────────────────────────────────
# Exercise Database Seeding
# ─────────────────────────────────────────────────────────────────────────────

# All exercises required for comprehensive workout templates
TEMPLATE_EXERCISES = [
    # Push Day Template Exercises
    {"name": "Bench Press", "muscle_group": "Chest", "description": "Barbell bench press - compound upper body exercise", "is_compound": True},
    {"name": "Incline Bench Press", "muscle_group": "Chest", "description": "Inclined barbell bench press targeting upper chest", "is_compound": True}, 
    {"name": "Dips", "muscle_group": "Chest", "description": "Parallel bar dips for chest and triceps", "is_compound": True},
    {"name": "Overhead Press", "muscle_group": "Shoulders", "description": "Standing overhead press with barbell", "is_compound": True},
    {"name": "Lateral Raise", "muscle_group": "Shoulders", "description": "Dumbbell lateral raises for side delts", "is_compound": False},
    {"name": "Tricep Extension", "muscle_group": "Arms", "description": "Overhead tricep extension", "is_compound": False},
    
    # Pull Day Template Exercises
    {"name": "Pull-Up", "muscle_group": "Back", "description": "Bodyweight pull-ups", "is_compound": True},
    {"name": "Deadlift", "muscle_group": "Back", "description": "Conventional deadlift - full body compound movement", "is_compound": True},
    {"name": "Bent Over Row", "muscle_group": "Back", "description": "Barbell bent over row", "is_compound": True},
    {"name": "Lat Pulldown", "muscle_group": "Back", "description": "Cable lat pulldown machine", "is_compound": False},
    {"name": "Barbell Curl", "muscle_group": "Arms", "description": "Standing barbell bicep curl", "is_compound": False},
    {"name": "Hammer Curl", "muscle_group": "Arms", "description": "Dumbbell hammer curls", "is_compound": False},
    
    # Leg Day Template Exercises
    {"name": "Squat", "muscle_group": "Legs", "description": "Back squat with barbell", "is_compound": True},
    {"name": "Romanian Deadlift", "muscle_group": "Legs", "description": "Romanian deadlift targeting hamstrings", "is_compound": True},
    {"name": "Leg Press", "muscle_group": "Legs", "description": "Machine leg press", "is_compound": False},
    {"name": "Leg Curl", "muscle_group": "Legs", "description": "Hamstring curl machine", "is_compound": False},
    {"name": "Leg Extension", "muscle_group": "Legs", "description": "Quadriceps extension machine", "is_compound": False},
    {"name": "Calf Raise", "muscle_group": "Legs", "description": "Standing calf raises", "is_compound": False},
    
    # Full Body Template Exercises
    {"name": "Plank", "muscle_group": "Core", "description": "Plank hold for core stability", "is_compound": True},
    
    # Additional Popular Exercises
    {"name": "Push-Up", "muscle_group": "Chest", "description": "Bodyweight push-ups", "is_compound": True},
    {"name": "Dumbbell Press", "muscle_group": "Chest", "description": "Dumbbell bench press", "is_compound": True},
    {"name": "Cable Fly", "muscle_group": "Chest", "description": "Cable chest fly", "is_compound": False},
    {"name": "Face Pull", "muscle_group": "Shoulders", "description": "Cable face pulls for rear delts", "is_compound": False},
    {"name": "Chin-Up", "muscle_group": "Back", "description": "Chin-ups with underhand grip", "is_compound": True},
    {"name": "Cable Row", "muscle_group": "Back", "description": "Seated cable row", "is_compound": True},
    {"name": "Preacher Curl", "muscle_group": "Arms", "description": "Preacher bench barbell curl", "is_compound": False},
    {"name": "Close Grip Bench Press", "muscle_group": "Arms", "description": "Close grip bench press for triceps", "is_compound": True},
    {"name": "Front Squat", "muscle_group": "Legs", "description": "Front-loaded barbell squat", "is_compound": True},
    {"name": "Hip Thrust", "muscle_group": "Legs", "description": "Barbell hip thrust for glutes", "is_compound": False},
    {"name": "Walking Lunge", "muscle_group": "Legs", "description": "Walking lunges with or without weight", "is_compound": True},
    {"name": "Russian Twist", "muscle_group": "Core", "description": "Russian twist for obliques", "is_compound": False},
    {"name": "Mountain Climber", "muscle_group": "Core", "description": "Mountain climbers cardio core exercise", "is_compound": True}
]

@app.route('/api/admin/seed-template-exercises', methods=['GET', 'POST'])
def seed_template_exercises():
    """Seed database with all required template exercises for workout templates"""
    try:
        template_exercises = [
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
            
            # Full Body Template
            {"name": "Plank", "muscle_group": "Core", "is_compound": True},
        ]
        
        added_count = 0
        skipped_count = 0
        
        for exercise_data in template_exercises:
            # Check if exercise already exists
            existing = Exercise.query.filter_by(name=exercise_data["name"]).first()
            
            if not existing:
                new_exercise = Exercise(
                    name=exercise_data["name"],
                    muscle_group=exercise_data["muscle_group"],
                    is_compound=exercise_data["is_compound"],
                    description=f"Template exercise for {exercise_data['muscle_group']} workouts"
                )
                db.session.add(new_exercise)
                added_count += 1
            else:
                skipped_count += 1
        
        db.session.commit()
        
        # Verify template coverage
        template_names = [ex["name"] for ex in template_exercises]
        existing_template_exercises = Exercise.query.filter(Exercise.name.in_(template_names)).all()
        template_coverage = len(existing_template_exercises) / len(template_names) * 100
        
        return jsonify({
            'message': 'Template exercises seeded successfully',
            'added_exercises': added_count,
            'skipped_existing': skipped_count,
            'total_template_exercises': len(template_names),
            'coverage_percentage': round(template_coverage, 1),
            'all_templates_ready': template_coverage == 100.0
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error seeding template exercises: {str(e)}'}), 500

@app.route('/api/admin/seed-exercises', methods=['POST'])
def seed_exercises():
    """Seed the database with template exercises"""
    try:
        exercises_added = 0
        exercises_skipped = 0
        
        for exercise_data in TEMPLATE_EXERCISES:
            # Check if exercise already exists
            existing = Exercise.query.filter_by(name=exercise_data['name']).first()
            
            if existing:
                exercises_skipped += 1
                continue
            
            # Create new exercise
            exercise = Exercise(
                name=exercise_data['name'],
                muscle_group=exercise_data['muscle_group'],
                description=exercise_data['description'],
                is_compound=exercise_data['is_compound']
            )
            
            db.session.add(exercise)
            exercises_added += 1
        
        db.session.commit()
        
        # Verify template coverage
        template_requirements = {
            "Push Day": ["Bench Press", "Incline Bench Press", "Dips", "Overhead Press", "Lateral Raise", "Tricep Extension"],
            "Pull Day": ["Pull-Up", "Deadlift", "Bent Over Row", "Lat Pulldown", "Barbell Curl", "Hammer Curl"], 
            "Leg Day": ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Leg Extension", "Calf Raise"],
            "Full Body": ["Bench Press", "Bent Over Row", "Squat", "Overhead Press", "Barbell Curl", "Plank"]
        }
        
        template_coverage = {}
        for template_name, required_exercises in template_requirements.items():
            missing = []
            for exercise_name in required_exercises:
                if not Exercise.query.filter_by(name=exercise_name).first():
                    missing.append(exercise_name)
            template_coverage[template_name] = {
                "total_required": len(required_exercises),
                "missing": missing,
                "complete": len(missing) == 0
            }
        
        return jsonify({
            'message': 'Exercise seeding completed',
            'exercises_added': exercises_added,
            'exercises_skipped': exercises_skipped,
            'total_exercises': Exercise.query.count(),
            'template_coverage': template_coverage
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error seeding exercises: {str(e)}'}), 500

@app.route('/api/admin/verify-exercises', methods=['GET'])
def verify_template_exercises():
    """Verify all template exercises exist for workout templates"""
    try:
        template_requirements = {
            "Push Day": ["Bench Press", "Incline Bench Press", "Dips", "Overhead Press", "Lateral Raise", "Tricep Extension"],
            "Pull Day": ["Pull-Up", "Deadlift", "Bent Over Row", "Lat Pulldown", "Barbell Curl", "Hammer Curl"], 
            "Leg Day": ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Leg Extension", "Calf Raise"],
            "Full Body": ["Bench Press", "Bent Over Row", "Squat", "Overhead Press", "Barbell Curl", "Plank"]
        }
        
        results = {}
        all_templates_ready = True
        
        for template_name, required_exercises in template_requirements.items():
            available = []
            missing = []
            
            for exercise_name in required_exercises:
                exercise = Exercise.query.filter_by(name=exercise_name).first()
                if exercise:
                    available.append({
                        "name": exercise.name,
                        "muscle_group": exercise.muscle_group,
                        "is_compound": exercise.is_compound
                    })
                else:
                    missing.append(exercise_name)
                    all_templates_ready = False
            
            results[template_name] = {
                "required_count": len(required_exercises),
                "available_count": len(available),
                "missing_count": len(missing),
                "available_exercises": available,
                "missing_exercises": missing,
                "template_ready": len(missing) == 0
            }
        
        return jsonify({
            'all_templates_ready': all_templates_ready,
            'total_exercises_in_db': Exercise.query.count(),
            'template_analysis': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error verifying exercises: {str(e)}'}), 500

@app.route('/api/admin/cleanup-test-data', methods=['GET', 'POST'])
def cleanup_test_shared_workouts():
    """Clean up test/invalid shared workout data that causes frontend issues"""
    try:
        # Find and delete shared workouts with test names or missing data
        test_workouts = SharedWorkout.query.filter(
            db.or_(
                SharedWorkout.workout_name == 'New Shared Workout',
                SharedWorkout.workout_name == '',
                SharedWorkout.workout_name.is_(None),
                SharedWorkout.creator_id.is_(None)
            )
        ).all()
        
        deleted_count = 0
        for workout in test_workouts:
            # Delete related participants first
            SharedWorkoutParticipant.query.filter_by(
                shared_workout_id=workout.shared_workout_id
            ).delete()
            
            # Delete the workout
            db.session.delete(workout)
            deleted_count += 1
        
        # Also find orphaned shared workouts (creator doesn't exist)
        all_workouts = SharedWorkout.query.all()
        orphaned_count = 0
        for workout in all_workouts:
            creator = User.query.get(workout.creator_id)
            if not creator:
                # Delete related participants first
                SharedWorkoutParticipant.query.filter_by(
                    shared_workout_id=workout.shared_workout_id
                ).delete()
                
                # Delete the workout
                db.session.delete(workout)
                orphaned_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'Test data cleanup completed',
            'deleted_test_workouts': deleted_count,
            'deleted_orphaned_workouts': orphaned_count,
            'total_cleaned': deleted_count + orphaned_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error cleaning up test data: {str(e)}'}), 500

# Frontend-specific endpoint mappings for easier integration
# These redirect to the actual API endpoints with proper /api prefix

@app.route('/social/search-users', methods=['GET'])
@jwt_required()
def frontend_search_users():
    """Frontend-expected endpoint - redirects to actual API"""
    return search_users()

@app.route('/social/friend-requests', methods=['POST'])
@jwt_required() 
def frontend_send_friend_request():
    """Frontend-expected endpoint - redirects to actual API"""
    # Map frontend request format to backend format
    data = request.get_json()
    if 'receiver_id' in data:
        # Convert frontend format to backend format
        data['friend_id'] = data.pop('receiver_id')
    return send_friend_request()

@app.route('/social/friend-requests/received', methods=['GET'])
@jwt_required()
def frontend_get_received_requests():
    """Frontend-expected endpoint - redirects to actual API"""
    return get_received_friend_requests()

@app.route('/social/friend-requests/sent', methods=['GET'])
@jwt_required()
def frontend_get_sent_requests():
    """Frontend-expected endpoint - redirects to actual API"""
    return get_sent_friend_requests()

@app.route('/social/friend-requests/<int:request_id>/accept', methods=['PUT'])
@jwt_required()
def frontend_accept_request(request_id):
    """Frontend-expected endpoint - redirects to actual API"""
    return accept_friend_request(request_id)

@app.route('/social/friend-requests/<int:request_id>/reject', methods=['PUT'])
@jwt_required()
def frontend_reject_request(request_id):
    """Frontend-expected endpoint - redirects to actual API"""
    return reject_friend_request(request_id)

@app.route('/social/friend-requests/<int:request_id>', methods=['DELETE'])
@jwt_required()
def frontend_cancel_request(request_id):
    """Frontend-expected endpoint - redirects to actual API"""
    return cancel_friend_request(request_id)

@app.route('/api/test/jwt-debug', methods=['GET'])
def test_jwt_debug():
    """Debug JWT token parsing"""
    from flask_jwt_extended import decode_token
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No valid Authorization header'}), 400
    
    token = auth_header.split(' ')[1]
    
    try:
        # Try to decode the token manually
        decoded = decode_token(token)
        return jsonify({
            'message': 'Token decoded successfully',
            'decoded_token': decoded,
            'sub_type': str(type(decoded.get('sub'))),
            'sub_value': decoded.get('sub')
        }), 200
    except Exception as e:
        return jsonify({'error': f'Token decode error: {str(e)}'}), 400

@app.route('/api/test/shared-workout', methods=['POST'])
def test_shared_workout_no_auth():
    """Test shared workout creation without JWT (for debugging)"""
    data = request.get_json()
    
    # Simulate user ID 1 for testing
    current_user_id = 1
    
    # Use our enhanced shared workout logic
    try:
        # Parse workout date or use current time
        workout_date = datetime.datetime.utcnow()
        if 'workout_date' in data and data['workout_date']:
            try:
                workout_date = datetime.datetime.fromisoformat(data['workout_date'].replace('Z', '+00:00'))
            except ValueError:
                pass
        
        # Create new shared workout
        new_shared_workout = SharedWorkout(
            creator_id=current_user_id,
            workout_name=data['workout_name'],
            workout_date=workout_date,
            is_active=True
        )
        
        db.session.add(new_shared_workout)
        db.session.flush()
        
        # Handle exercises if provided
        mapped_exercises = []
        if 'exercises' in data and data['exercises']:
            mapped_exercises, missing_exercises = map_exercise_names_to_ids(data['exercises'])
            
            if missing_exercises:
                db.session.rollback()
                return jsonify({
                    'error': f'Unknown exercises: {", ".join(missing_exercises)}',
                    'missing_exercises': missing_exercises
                }), 400
        
        db.session.commit()
        
        return jsonify({
            'message': 'TEST: Shared workout created successfully',
            'shared_workout_id': new_shared_workout.shared_workout_id,
            'status': 'created',
            'exercise_count': len(mapped_exercises),
            'note': 'This is a test endpoint without JWT authentication'
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error: {str(e)}'}), 500

with app.app_context():
    initialize_database()

# Run the app
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
