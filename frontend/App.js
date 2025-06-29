// App.js

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './contexts/AuthContext';
import { FirebaseProvider } from './contexts/FirebaseContext';

import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';

// Auth screens:
import LoginScreen    from './screens/auth/LoginScreen';
import SignupScreen   from './screens/auth/SignupScreen';

// Main screens:
import HomeScreen            from './screens/main/HomeScreen';
import CreateWorkoutScreen   from './screens/main/CreateWorkoutScreen';
import WorkoutScreen         from './screens/main/WorkoutScreen';
import WorkoutDetailScreen   from './screens/main/WorkoutDetailScreen';
import SocialScreen          from './screens/main/SocialScreen';
import FriendProfileScreen   from './screens/main/FriendProfileScreen';
import ProfileScreen         from './screens/main/ProfileScreen';
import LeaderboardScreen     from './screens/main/LeaderboardScreen';
import AvatarScreen          from './screens/main/AvatarScreen';
import SharedWorkoutScreen   from './screens/main/SharedWorkoutScreen';

// 1) Pick the appropriate navigator depending on platform:
const StackNavigator =
  Platform.OS === 'web'
    ? createStackNavigator()
    : createNativeStackNavigator();

// 2) Configure “linking” so web URLs stay in sync with your navigation state:
const linking = {
  prefixes: [
    'http://localhost:8081',  // Expo Web default
    'http://localhost:19006', // Expo’s other common local URL
    'exp://',                 // If you ever run through the Expo app client
  ],
  config: {
    screens: {
      Login:           'login',
      Signup:          'signup',
      Home:            'home',
      CreateWorkout:   'create-workout',
      Workout:         'workouts',
      WorkoutDetail:   'workout/:workoutId',
      Social:          'social',
      FriendProfile:   'friend/:friendId',
      Profile:         'profile',
      Leaderboard:     'leaderboard',
      Avatar:          'avatar',
      SharedWorkout:   'shared-workout/:workoutId',
    }
  }
};

export default function App() {
  return (
    <PaperProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <FirebaseProvider>
            <StatusBar style="auto" />

            {/* ────────────────────────────────────────────────────────────
               Pass `linking={linking}` into NavigationContainer so that
               the browser’s URL updates as you navigate (and vice‐versa).

               Also, on web we set headerShown: true for every screen so
               you can click the back arrow in the header. On native, we
               hide headers (headerShown: false) for a full‐screen look.
            ──────────────────────────────────────────────────────────── */}
            <NavigationContainer linking={linking} theme={DefaultTheme} fallback={<></>}>
              <StackNavigator.Navigator initialRouteName="Login">
                {/* ─────────────────── Authentication Screens ─────────────────── */}
                <StackNavigator.Screen
                  name="Login"
                  component={LoginScreen}
                  options={{
                    // Hide the header on both native & web for the login screen
                    headerShown: false
                  }}
                />
                <StackNavigator.Screen
                  name="Signup"
                  component={SignupScreen}
                  options={{
                    headerShown: false
                  }}
                />

                {/* ─────────────────── Main Application Screens ─────────────────── */}

                {/* Home */}
                <StackNavigator.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{
                    headerShown: Platform.OS === 'web',
                    headerTitle: 'EvolvX Home',
                  }}
                />

                {/* Workouts */}
                <StackNavigator.Screen
                  name="Workouts"
                  component={WorkoutScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'All Workouts',
                  }}
                />

                {/* Social */}
                <StackNavigator.Screen
                  name="Social"
                  component={SocialScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'Social',
                  }}
                />

                {/* CreateWorkout */}
                <StackNavigator.Screen
                  name="CreateWorkout"
                  component={CreateWorkoutScreen}
                  options={{
                    // On web, show header so you can go “back” from CreateWorkout → Home.
                    headerShown: true,
                    headerTitle: 'Create Workout',
                  }}
                />

                {/* WorkoutDetail (details for a single workout) */}
                <StackNavigator.Screen
                  name="WorkoutDetail"
                  component={WorkoutDetailScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'Workout Detail',
                  }}
                />

                {/* Friend Profile */}
                <StackNavigator.Screen
                  name="FriendProfile"
                  component={FriendProfileScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'Friend Profile',
                  }}
                />

                {/* Profile */}
                <StackNavigator.Screen
                  name="Profile"
                  component={ProfileScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'My Profile',
                  }}
                />

                {/* Leaderboard */}
                <StackNavigator.Screen
                  name="Leaderboard"
                  component={LeaderboardScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'Leaderboard',
                  }}
                />

                {/* Avatar */}
                <StackNavigator.Screen
                  name="Avatar"
                  component={AvatarScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'Choose Avatar',
                  }}
                />

                {/* Shared Workout */}
                <StackNavigator.Screen
                  name="SharedWorkout"
                  component={SharedWorkoutScreen}
                  options={{
                    headerShown: true,
                    headerTitle: 'Shared Workout',
                  }}
                />
              </StackNavigator.Navigator>
            </NavigationContainer>

          </FirebaseProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

