# EvolvX App Setup Guide

## Overview
EvolvX is a fitness‑tracking application composed of:
1. **React Native Frontend** – mobile app.
2. **Flask Backend** – REST API backed by PostgreSQL.
3. **Firebase** – real‑time database / push‑notification services.

This guide explains how to set up the project that ships in the `evolvx.zip` archive.

---

## Prerequisites
| Tool | Version | Notes |
|------|---------|-------|
| Node.js & npm / yarn | 14 + | mobile build tooling |
| Python | 3.8 + | Flask API |
| PostgreSQL | latest | create `evolvx_db` |
| Firebase account | — | Realtime DB, Cloud Messaging |
| Android Studio / Xcode | latest | run app on emulator / simulator |
| React Native CLI or Expo CLI | latest | choose managed or bare workflow |

---

## Project Structure
evolvx/
├── backend/              # Flask API server
│   ├── app.py           # Main application file
│   ├── create_db.py     # Database initialization
│   └── requirements.txt # Python dependencies
├── frontend/            # React Native Expo app
│   ├── screens/         # App screens
│   ├── contexts/        # React contexts
│   ├── assets/          # Images and static files
│   └── App.js          # Main app component
├── architecture/        # System design documents
├── implementation plan/ # Development roadmap
├── setup guide/        # Setup instructions
└── validation report/  # Testing documentation

---

## Backend Setup

### 1 · Create PostgreSQL database
```bash
createdb evolvx_db
# or via psql
# psql -U postgres -c "CREATE DATABASE evolvx_db;"
```

### 2 · Configure & start Flask API
```bash
# unzip then enter backend folder
cd evolvx/backend

python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows PowerShell
# .\venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Create `.env` in `evolvx/backend`:
```env
DATABASE_URL=postgresql://<user>:<password>@localhost/evolvx_db
SECRET_KEY=change_me
JWT_SECRET_KEY=change_me_too
FIREBASE_CREDENTIALS_PATH=backend/firebase-credentials.json
```

Initialise tables (Alembic is already configured):
```bash
flask db upgrade
```

Run the server:
```bash
flask run            # defaults to http://127.0.0.1:5000
```

---

## Firebase Setup
1. Create a project in the Firebase console.  
2. Generate a service‑account JSON; save it as `backend/firebase-credentials.json`.  
3. Enable **Realtime Database** (test‑mode is fine for local dev).  
4. Copy the client keys for the mobile app (see below).

---

## Frontend Setup

```bash
cd evolvx/frontend
npm install          # or yarn install
```

Update `frontend/firebaseConfig.js` or `contexts/FirebaseContext.js` with your keys:
```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  databaseURL: "https://<project>.firebaseio.com",
  projectId: "<project>",
  storageBucket: "<project>.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

Start the app:

```bash
# Expo (recommended):
npx expo start
# then press 'a' (Android) or 'i' (iOS)

# Bare React Native CLI:
npx react-native run-android   # or run-ios
```

---

## Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/register` | create user |
| `POST` | `/api/auth/login` | obtain JWT |
| `POST` | `/api/workouts` | log a workout |
| `GET` | `/api/workouts` | list workouts |
| `GET` | `/api/leaderboard` | XP rankings (stub) |

---

## Deployment Notes
*Backend* can be deployed to **Heroku**, **Render**, **AWS EB**, etc.  
*Mobile* builds: `eas build -p android|ios` (Expo) or Gradle/Xcode Release.

---

## Troubleshooting
* **Cannot connect to DB** → verify `DATABASE_URL`, confirm Postgres is running.  
* **JWT errors** → check `JWT_SECRET_KEY` matches between login & subsequent requests.  
* **Firebase permission denied** → loosen Realtime DB rules during development.

---

## Maintainers
Siu Chun e1408787@u.nus.edu
Chee Hong e1408746@u.nus.edu

