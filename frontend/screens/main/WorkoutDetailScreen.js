import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, Avatar, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkoutDetailScreen({ route, navigation }) {
  const { workoutId } = route.params;
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkout();
  }, []);

  const loadWorkout = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workouts/${workoutId}`);
      setWorkout(response.data);
    } catch (err) {
      setError('Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  const getMuscleColor = (group) => {
    const colors = { chest: '#ff6b6b', back: '#4ecdc4', legs: '#45b7d1', shoulders: '#f39c12', arms: '#9b59b6', core: '#e74c3c' };
    return colors[group?.toLowerCase()] || '#6c757d';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>{error || 'Workout not found'}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, Platform.OS === 'web' && { height: '80vh', overflow: 'scroll', overflowY: 'scroll' }]}
        contentContainerStyle={[styles.scrollContainer, Platform.OS === 'web' && { minHeight: '100vh', paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      >
        {/* Header */}
        <LinearGradient colors={['#0099cc', '#0066aa']} style={styles.header}>
          <Text style={styles.workoutName}>{workout.workout_name}</Text>
          <Text style={styles.workoutDate}>{new Date(workout.workout_date).toLocaleDateString()}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{workout.exercises?.length || 0}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            {workout.duration && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{workout.duration}</Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Exercises */}
        <View style={styles.exercisesContainer}>
          {workout.exercises?.map((exercise, index) => (
            <Card key={index} style={styles.exerciseCard}>
              <Card.Content>
                <View style={styles.exerciseHeader}>
                  <Avatar.Icon
                    size={40}
                    icon="dumbbell"
                    backgroundColor={`${getMuscleColor(exercise.muscle_group)}20`}
                    color={getMuscleColor(exercise.muscle_group)}
                  />
                  <View style={styles.exerciseInfo}>
                    <Title style={styles.exerciseName}>{exercise.name}</Title>
                    <Chip style={[styles.muscleChip, { backgroundColor: `${getMuscleColor(exercise.muscle_group)}20` }]}>
                      <Text style={{ color: getMuscleColor(exercise.muscle_group) }}>{exercise.muscle_group}</Text>
                    </Chip>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.exerciseStats}>
                  <View style={styles.statItem}>
                    <Icon name="repeat" size={16} color="#666" />
                    <Text style={styles.statText}>{exercise.sets} sets</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon name="counter" size={16} color="#666" />
                    <Text style={styles.statText}>{exercise.reps} reps</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon name="weight" size={16} color="#666" />
                    <Text style={styles.statText}>{exercise.weight} lbs</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        {workout.notes && (
          <Card style={styles.notesCard}>
            <Card.Content>
              <Title>Notes</Title>
              <Text style={styles.notesText}>{workout.notes}</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <View style={styles.actionButtons}>
        <Button mode="outlined" onPress={() => navigation.navigate('CreateWorkout', { workoutId })}>Edit</Button>
        <Button mode="contained" onPress={() => navigation.goBack()}>Back</Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollView: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  errorText: { fontSize: 16, color: '#e74c3c', marginVertical: 16, textAlign: 'center' },
  header: { padding: 24, marginBottom: 16 },
  workoutName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  workoutDate: { fontSize: 14, color: '#fff', opacity: 0.8, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#fff', opacity: 0.8 },
  exercisesContainer: { padding: 16 },
  exerciseCard: { marginBottom: 12, borderRadius: 12 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  exerciseInfo: { marginLeft: 12, flex: 1 },
  exerciseName: { fontSize: 16, marginBottom: 8 },
  muscleChip: { alignSelf: 'flex-start' },
  divider: { marginVertical: 8 },
  exerciseStats: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#666' },
  notesCard: { margin: 16, borderRadius: 12 },
  notesText: { fontSize: 14, color: '#666', lineHeight: 20 },
  actionButtons: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff' },
});
