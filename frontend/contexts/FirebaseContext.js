import React, { createContext, useState, useEffect, useContext } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  update,
  onDisconnect,
  push,
  query,
  orderByKey,
  limitToLast,
  serverTimestamp,
  set
} from 'firebase/database';
import { useAuth } from './AuthContext';
import { firebaseConfig } from '../firebaseConfig';

export const FirebaseContext = createContext(null);

export function FirebaseProvider({ children }) {
  const { user } = useAuth();
  const [database, setDatabase] = useState(null);

  // Initialize Firebase app & database once
  useEffect(() => {
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
    }
    const db = getDatabase();
    setDatabase(db);
  }, []);

  // Track user online/offline
  useEffect(() => {
    if (!database || !user) return;
    const statusRef = ref(database, `users/${user.id}`);

    // mark online
    update(statusRef, {
      online_status: 'online',
      last_active: new Date().toISOString(),
    });

    // mark offline on disconnect
    onDisconnect(statusRef).update({
      online_status: 'offline',
      last_active: new Date().toISOString(),
    });

    // cleanup: mark offline if component unmounts
    return () => {
      update(statusRef, {
        online_status: 'offline',
        last_active: new Date().toISOString(),
      });
    };
  }, [database, user]);

  // Helper methods
  const getUserRankings = (userId) => ref(database, `rankings/${userId}`);
  const getSharedWorkouts = () => ref(database, 'shared_workouts');
  const getSharedWorkout = (id) => ref(database, `shared_workouts/${id}`);
  const joinSharedWorkout = (workoutId, userId) => {
    const p = ref(database, `shared_workouts/${workoutId}/participants/${userId}`);
    return update(p, {
      joined_at: new Date().toISOString(),
      exercises_completed: 0,
    });
  };
  const updateExercisesCompleted = (workoutId, userId, count) => {
    const p = ref(database, `shared_workouts/${workoutId}/participants/${userId}`);
    return update(p, { exercises_completed: count });
  };
  const getActivityFeed = () =>
    query(ref(database, 'activity_feed'), orderByKey(), limitToLast(20));
  const addActivity = (userId, type, details) => {
    const a = push(ref(database, 'activity_feed'));
    return set(a, {
      user_id: userId,
      activity_type: type,
      details,
      timestamp: serverTimestamp(),
    });
  };

  return (
    <FirebaseContext.Provider
      value={{
        database,
        getUserRankings,
        getSharedWorkouts,
        getSharedWorkout,
        joinSharedWorkout,
        updateExercisesCompleted,
        getActivityFeed,
        addActivity,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error('useFirebase must be used within FirebaseProvider');
  return ctx;
};
export default FirebaseContext;