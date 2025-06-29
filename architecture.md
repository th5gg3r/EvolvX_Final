# EvolvX Full-Stack Architecture

## System Overview
EvolvX is a comprehensive fitness application that helps users track workouts, receive personalized coaching, and engage in a gamified fitness community. The architecture follows a client-server model with real-time capabilities.

## Architecture Diagram
```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                 │     │                   │     │                 │
│  React Native   │◄────┤  Flask Backend    │◄────┤  PostgreSQL     │
│  Mobile App     │     │  REST API         │     │  Database       │
│                 │     │                   │     │                 │
└────────┬────────┘     └─────────┬─────────┘     └─────────────────┘
         │                        │
         │                        │
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌───────────────────┐
│                 │     │                   │
│  Firebase       │◄────┤  Firebase Admin   │
│  Realtime DB    │     │  SDK              │
│                 │     │                   │
└─────────────────┘     └───────────────────┘
```

## Component Details

### 1. Frontend (React Native)

#### Core Components:
- **Authentication Module**: Login, registration, and user profile management
- **Workout Tracker**: Exercise logging with sets, reps, and weights
- **Progress Dashboard**: Visualizations of workout history and achievements
- **Leaderboard Interface**: Rankings and comparisons with friends/age groups
- **Social Module**: Friend connections and shared workout sessions
- **Avatar Customization**: User avatar creation and personalization

#### State Management:
- Redux for global state management
- Context API for theme and authentication state
- AsyncStorage for local data persistence

#### API Integration:
- Axios for REST API calls to Flask backend
- Firebase SDK for real-time features

### 2. Backend (Flask)

#### API Endpoints:

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

**Workout Management:**
- `GET /api/workouts` - Get user's workouts
- `POST /api/workouts` - Create new workout
- `GET /api/workouts/{id}` - Get specific workout
- `PUT /api/workouts/{id}` - Update workout
- `DELETE /api/workouts/{id}` - Delete workout
- `GET /api/exercises` - Get exercise library

**Ranking System:**
- `GET /api/rankings/user/{id}` - Get user's rankings
- `GET /api/rankings/leaderboard` - Get global leaderboard
- `GET /api/rankings/leaderboard/friends` - Get friends leaderboard
- `GET /api/rankings/leaderboard/age/{min}/{max}` - Get age-filtered leaderboard

**Coaching System:**
- `GET /api/coaching/recommendations` - Get personalized recommendations
- `GET /api/coaching/progress` - Get progress analysis

**Social Features:**
- `GET /api/social/friends` - Get user's friends
- `POST /api/social/friends/request` - Send friend request
- `PUT /api/social/friends/request/{id}` - Accept/reject friend request
- `GET /api/social/shared-workouts` - Get active shared workouts
- `POST /api/social/shared-workouts` - Create shared workout
- `POST /api/social/shared-workouts/{id}/join` - Join shared workout

**Avatar System:**
- `GET /api/avatar/{user_id}` - Get user's avatar
- `PUT /api/avatar/{user_id}` - Update user's avatar

#### Middleware:
- JWT Authentication
- CORS handling
- Request validation
- Error handling

### 3. Database (PostgreSQL)

#### Core Tables:
- **users**: User accounts and profile information
- **workouts**: Workout sessions
- **exercises**: Exercise library
- **workout_exercises**: Junction table for workouts and exercises
- **user_rankings**: User rankings for different muscle groups
- **shared_workouts**: Shared workout sessions
- **shared_workout_participants**: Junction table for shared workouts and participants
- **user_avatars**: User avatar configurations
- **friends**: User friendship relationships

#### Relationships:
- One-to-many between users and workouts
- Many-to-many between workouts and exercises
- One-to-many between users and rankings
- Many-to-many between users and shared workouts

### 4. Real-time Features (Firebase)

#### Realtime Database Structure:
```
evolvx-app/
├── users/
│   ├── {user_id}/
│   │   ├── online_status
│   │   ├── last_active
│   │   └── current_workout
├── rankings/
│   ├── {user_id}/
│   │   ├── updated_at
│   │   └── muscle_groups/
│   │       ├── chest
│   │       ├── back
│   │       └── ...
├── shared_workouts/
│   ├── {workout_id}/
│   │   ├── creator_id
│   │   ├── workout_name
│   │   ├── start_time
│   │   ├── is_active
│   │   └── participants/
│   │       ├── {user_id}/
│   │       │   ├── joined_at
│   │       │   └── exercises_completed
└── activity_feed/
    ├── {timestamp}/
    │   ├── user_id
    │   ├── activity_type
    │   └── details
```

#### Real-time Features:
- User online status
- Live leaderboard updates
- Shared workout sessions
- Activity feed notifications

### 5. Integration Points

#### Frontend to Backend:
- REST API calls for CRUD operations
- JWT authentication for secure communication

#### Backend to Database:
- SQLAlchemy ORM for database operations
- Connection pooling for efficient resource usage

#### Backend to Firebase:
- Firebase Admin SDK for server-side operations
- Real-time updates and notifications

#### Frontend to Firebase:
- Direct connection for real-time features
- Offline capabilities with synchronization

## Security Considerations

### Authentication:
- JWT-based authentication
- Password hashing with bcrypt
- Token refresh mechanism

### Data Protection:
- HTTPS for all API communications
- Input validation and sanitization
- Prepared statements for database queries

### Firebase Security:
- Rule-based access control
- Authentication integration
- Data validation rules

## Deployment Considerations

### Frontend:
- React Native build for Android and iOS
- Code signing and app store deployment

### Backend:
- Containerization with Docker
- Deployment to cloud platforms (AWS, GCP, etc.)
- Environment-specific configurations

### Database:
- Managed PostgreSQL service
- Regular backups
- Migration strategy

### Monitoring:
- Application performance monitoring
- Error tracking and reporting
- Usage analytics
