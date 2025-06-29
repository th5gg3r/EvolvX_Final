import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Chip, FAB, ActivityIndicator, Avatar, Title, Paragraph, ProgressBar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ref, set, update, onValue, serverTimestamp } from 'firebase/database';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';

const { width } = Dimensions.get('window');

export default function SharedWorkoutScreen({ route, navigation }) {
  const { workoutId } = route.params;
  const { user, token, api } = useAuth();
  const { database } = useFirebase();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workout, setWorkout] = useState(null);
  const [participants, setParticipants] = useState({});
  const [exercises, setExercises] = useState([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [error, setError] = useState(null);

  // Load workout data and setup real-time listeners
  useEffect(() => {
    if (workoutId && database && user) {
      loadWorkoutData();
      setupRealtimeListeners();
    }
  }, [workoutId, database, user]);

  const loadWorkoutData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch workout details from API
      const { data } = await api.get(`/workouts/${workoutId}`);
      setWorkout(data);
      setExercises(data.exercises || []);
      
    } catch (err) {
      console.error('Error loading workout:', err);
      setError('Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    if (!database) return;

    const workoutRef = ref(database, `shared_workouts/${workoutId}`);
    const participantsRef = ref(database, `shared_workouts/${workoutId}/participants`);

    // Listen for participant updates
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      setParticipants(data || {});
    });

    return () => unsubscribe();
  };

  const joinWorkout = async () => {
    if (!database || !user) return;

    try {
      const participantRef = ref(database, `shared_workouts/${workoutId}/participants/${user.id}`);
      await set(participantRef, {
        id: user.id,
        name: user.name || user.username,
        avatar: user.avatar || null,
        joinedAt: serverTimestamp(),
        currentExercise: 0,
        status: 'joined'
      });

      // Update local state
      setParticipants(prev => ({
        ...prev,
        [user.id]: {
          id: user.id,
          name: user.name || user.username,
          avatar: user.avatar || null,
          currentExercise: 0,
          status: 'joined'
        }
      }));

    } catch (err) {
      console.error('Error joining workout:', err);
      Alert.alert('Error', 'Failed to join workout');
    }
  };

  const startWorkout = () => {
    setIsActive(true);
    setStartTime(new Date());
    updateParticipantStatus('active');
  };

  const completeExercise = () => {
    const nextIndex = currentExerciseIndex + 1;
    setCurrentExerciseIndex(nextIndex);
    
    updateParticipantProgress(nextIndex);

    if (nextIndex >= exercises.length) {
      completeWorkout();
    }
  };

  const updateParticipantStatus = async (status) => {
    if (!database || !user) return;

    try {
      const participantRef = ref(database, `shared_workouts/${workoutId}/participants/${user.id}`);
      await update(participantRef, {
        status,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const updateParticipantProgress = async (exerciseIndex) => {
    if (!database || !user) return;

    try {
      const participantRef = ref(database, `shared_workouts/${workoutId}/participants/${user.id}`);
      await update(participantRef, {
        currentExercise: exerciseIndex,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const completeWorkout = () => {
    setIsActive(false);
    updateParticipantStatus('completed');
    Alert.alert('Congratulations!', 'You completed the shared workout!');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkoutData().finally(() => setRefreshing(false));
  };

  const renderParticipants = () => {
    const participantList = Object.values(participants);
    
    if (participantList.length === 0) {
      return (
        <Card style={styles.participantsCard}>
          <Card.Content>
            <Title>Participants</Title>
            <Text style={styles.emptyText}>No participants yet</Text>
            <Button 
              mode="contained" 
              onPress={joinWorkout}
              style={styles.joinButton}
              icon="account-plus"
            >
              Join Workout
            </Button>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.participantsCard}>
        <Card.Content>
          <Title>Participants ({participantList.length})</Title>
          <View style={styles.participantsList}>
            {participantList.map(participant => (
              <View key={participant.id} style={styles.participantItem}>
                <Avatar.Text 
                  size={40} 
                  label={participant.name?.charAt(0) || 'U'} 
                  style={styles.participantAvatar}
                />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Chip 
                    mode="outlined" 
                    style={[styles.statusChip, { backgroundColor: getStatusColor(participant.status) }]}
                  >
                    {participant.status}
                  </Chip>
                  <Text style={styles.progressText}>
                    Exercise {participant.currentExercise + 1} of {exercises.length}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'joined': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const renderCurrentExercise = () => {
    if (!exercises.length || currentExerciseIndex >= exercises.length) return null;
    
    const exercise = exercises[currentExerciseIndex];
    const progress = (currentExerciseIndex + 1) / exercises.length;

    return (
      <Card style={styles.exerciseCard}>
        <LinearGradient
          colors={['#0099cc', '#004d66']}
          style={styles.exerciseHeader}
        >
          <Card.Content>
            <Text style={styles.exerciseNumber}>
              Exercise {currentExerciseIndex + 1} of {exercises.length}
            </Text>
            <Title style={styles.exerciseTitle}>{exercise.name}</Title>
            <ProgressBar progress={progress} style={styles.progressBar} />
          </Card.Content>
        </LinearGradient>
        
        <Card.Content style={styles.exerciseContent}>
          <View style={styles.exerciseDetails}>
            <View style={styles.exerciseSpec}>
              <Icon name="repeat" size={20} color="#0099cc" />
              <Text style={styles.specText}>{exercise.sets} sets</Text>
            </View>
            <View style={styles.exerciseSpec}>
              <Icon name="counter" size={20} color="#0099cc" />
              <Text style={styles.specText}>{exercise.reps} reps</Text>
            </View>
            {exercise.weight && (
              <View style={styles.exerciseSpec}>
                <Icon name="weight-kilogram" size={20} color="#0099cc" />
                <Text style={styles.specText}>{exercise.weight} kg</Text>
              </View>
            )}
          </View>
          
          {exercise.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{exercise.notes}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0099cc" />
          <Text style={styles.loadingText}>Loading shared workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadWorkoutData}>
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Workout Header */}
        <LinearGradient
          colors={['#0099cc', '#004d66']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Title style={styles.workoutTitle}>{workout?.name || 'Shared Workout'}</Title>
            <Text style={styles.workoutDescription}>
              {workout?.description || 'Collaborate with friends in real-time!'}
            </Text>
            {isActive && startTime && (
              <Chip icon="timer" style={styles.timerChip}>
                Active since {startTime.toLocaleTimeString()}
              </Chip>
            )}
          </View>
        </LinearGradient>

        {/* Participants Section */}
        {renderParticipants()}

        {/* Current Exercise */}
        {isActive && renderCurrentExercise()}

        {/* Workout Actions */}
        <View style={styles.actionsContainer}>
          {!isActive ? (
            <Button 
              mode="contained" 
              onPress={startWorkout}
              style={styles.startButton}
              icon="play"
              disabled={!participants[user?.id]}
            >
              Start Workout
            </Button>
          ) : (
            <Button 
              mode="contained" 
              onPress={completeExercise}
              style={styles.completeButton}
              icon="check"
            >
              Complete Exercise
            </Button>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="share"
        onPress={() => {
          // Share workout logic
          Alert.alert('Share', 'Share this workout with friends!');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  workoutTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  workoutDescription: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 8,
  },
  timerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 12,
  },
  participantsCard: {
    margin: 16,
    elevation: 4,
  },
  participantsList: {
    marginTop: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantAvatar: {
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  joinButton: {
    marginTop: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 12,
  },
  exerciseCard: {
    margin: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  exerciseHeader: {
    paddingVertical: 20,
  },
  exerciseNumber: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  exerciseTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  exerciseContent: {
    paddingTop: 20,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  exerciseSpec: {
    alignItems: 'center',
  },
  specText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  notesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
  },
  actionsContainer: {
    margin: 16,
  },
  startButton: {
    paddingVertical: 8,
  },
  completeButton: {
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
  },
  bottomSpacing: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#0099cc',
  },
});
