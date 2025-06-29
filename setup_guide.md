# EvolvX App Setup Guide

## Overview

This guide provides instructions for setting up and running the EvolvX fitness application. The app consists of:

1. **React Native Frontend**: Mobile app for user interaction
2. **Flask Backend**: API server with PostgreSQL database
3. **Firebase Integration**: For real-time features

## Prerequisites

- Node.js (v14+) and npm/yarn
- Python 3.8+
- PostgreSQL database
- Firebase account
- Android Studio (for Android development) or Xcode (for iOS development)
- React Native development environment

## Backend Setup

### 1. Set up PostgreSQL

```bash
# Create database
createdb evolvx_db

# Or using psql
psql -U postgres
CREATE DATABASE evolvx_db;
\q
```

### 2. Set up Flask Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file with the following:
# DATABASE_URL=postgresql://username:password@localhost/evolvx_db
# SECRET_KEY=your_secret_key
# JWT_SECRET_KEY=your_jwt_secret

# Initialize database
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Run the server
flask run
```

### 3. Set up Firebase

1. Create a Firebase project at https://console.firebase.google.com/
2. Set up Realtime Database
3. Add your Firebase configuration to the backend and frontend

## Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install

# For iOS (macOS only)
cd ios
pod install
cd ..

# Run the app
# For Android
npx react-native run-android
# For iOS
npx react-native run-ios
```

## Configuration Files

### Backend Configuration

Create a `.env` file in the backend directory with:

```
DATABASE_URL=postgresql://username:password@localhost/evolvx_db
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
FIREBASE_CREDENTIALS_PATH=path/to/firebase-credentials.json
```

### Frontend Configuration

Update the Firebase configuration in `frontend/contexts/FirebaseContext.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

## API Endpoints

The backend provides the following API endpoints:

- Authentication: `/api/auth/*`
- Workouts: `/api/workouts/*`
- Rankings: `/api/rankings/*`
- Social: `/api/social/*`
- Avatar: `/api/avatar/*`

Detailed API documentation is available in the `backend/API_DOCS.md` file.

## Deployment

### Backend Deployment

The Flask backend can be deployed to any platform that supports Python applications, such as:

- Heroku
- AWS Elastic Beanstalk
- Google Cloud Run
- DigitalOcean App Platform

### Frontend Deployment

The React Native app can be built for production using:

```bash
# For Android
cd android
./gradlew assembleRelease

# For iOS
cd ios
xcodebuild -workspace YourApp.xcworkspace -scheme YourApp -configuration Release
```

## Troubleshooting

- **Database Connection Issues**: Verify PostgreSQL credentials and ensure the database is running
- **Firebase Connection Issues**: Check Firebase credentials and security rules
- **React Native Build Errors**: Ensure all dependencies are installed and compatible

## Support

For additional support, please refer to the documentation in the `docs` directory or contact the development team.
