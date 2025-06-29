import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Platform, TouchableOpacity, Dimensions, Animated, LayoutAnimation, UIManager } from 'react-native';
import { Text, Card, Title, Paragraph, Button, FAB, ActivityIndicator, IconButton, Searchbar, Chip, Avatar, Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const WorkoutScreen = ({ navigation }) => {
  const { api } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWorkouts, setFilteredWorkouts] = useState([]);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // date, name, exercises
  const [filterBy, setFilterBy] = useState('all'); // all, thisWeek, thisMonth
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // Load initial data and animations
  useEffect(() => {
    loadWorkouts();
    
    // Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Filter and sort workouts when search, sort, or filter changes
  useEffect(() => {
    let filtered = [...workouts];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(workout => 
        workout.workout_name.toLowerCase().includes(query) ||
        new Date(workout.workout_date).toLocaleDateString().includes(query) ||
        workout.exercises?.some(ex => ex.name?.toLowerCase().includes(query))
      );
    }
    
    // Apply date filter
    if (filterBy !== 'all') {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      filtered = filtered.filter(workout => {
        const workoutDate = new Date(workout.workout_date);
        if (filterBy === 'thisWeek') {
          return workoutDate >= oneWeekAgo;
        } else if (filterBy === 'thisMonth') {
          return workoutDate >= oneMonthAgo;
        }
        return true;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.workout_name.localeCompare(b.workout_name);
        case 'exercises':
          return (b.exercises?.length || 0) - (a.exercises?.length || 0);
        case 'date':
        default:
          return new Date(b.workout_date) - new Date(a.workout_date);
      }
    });
    
    setFilteredWorkouts(filtered);
  }, [searchQuery, workouts, sortBy, filterBy]);
  
  const loadWorkouts = async () => {
    try {
      setError(null);
      
      const response = await api.get('/workouts', {
        params: { page: 1, per_page: 50 }
      });
      
      setWorkouts(response.data.workouts);
      setFilteredWorkouts(response.data.workouts);
      
    } catch (err) {
      console.error('Error loading workouts:', err);
      setError('Failed to load workouts. Pull down to refresh.');
    } finally {
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };
  
  const handleDeleteWorkout = (workoutId) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/workouts/${workoutId}`);
              // Remove workout from state
              const updatedWorkouts = workouts.filter(w => w.workout_id !== workoutId);
              setWorkouts(updatedWorkouts);
              setFilteredWorkouts(updatedWorkouts);
            } catch (err) {
              console.error('Error deleting workout:', err);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Helper functions for stats
  const getWorkoutStats = () => {
    const totalWorkouts = workouts.length;
    const thisWeekWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.workout_date);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return workoutDate >= oneWeekAgo;
    }).length;
    
    const totalExercises = workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0);
    const avgExercises = totalWorkouts > 0 ? Math.round(totalExercises / totalWorkouts) : 0;
    
    return { totalWorkouts, thisWeekWorkouts, avgExercises };
  };

  const getMuscleGroupColor = (group) => {
    const colors = {
      'chest': '#ff6b6b',
      'back': '#4ecdc4', 
      'legs': '#45b7d1',
      'shoulders': '#f39c12',
      'arms': '#9b59b6',
      'core': '#e74c3c',
      'cardio': '#2ecc71'
    };
    return colors[group?.toLowerCase()] || '#6c757d';
  };

  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };
  
  const renderWorkoutCard = (workout) => {
    const exerciseCount = workout.exercises?.length || 0;
    
    // Group exercises by muscle group
    const muscleGroups = {};
    workout.exercises?.forEach(exercise => {
      const group = exercise.muscle_group || 'Other';
      if (!muscleGroups[group]) {
        muscleGroups[group] = 0;
      }
      muscleGroups[group]++;
    });
    
    return (
      <TouchableOpacity 
        key={workout.workout_id} 
        style={styles.modernWorkoutCard}
        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.workout_id })}
      >
        <LinearGradient
          colors={['#1a1a1a', '#2d2d2d']}
          style={styles.cardGradient}
        >
          <View style={styles.workoutCardHeader}>
            <View style={styles.workoutMainInfo}>
              <Text style={styles.workoutName}>{workout.workout_name}</Text>
              <Text style={styles.workoutDate}>{timeAgo(workout.workout_date)}</Text>
            </View>
            <View style={styles.workoutBadge}>
              <Text style={styles.workoutBadgeText}>{exerciseCount}</Text>
              <Text style={styles.workoutBadgeLabel}>exercises</Text>
            </View>
          </View>
          
          <View style={styles.workoutStatsRow}>
            <View style={styles.statItem}>
              <Icon name="fitness" size={16} color="#666" />
              <Text style={styles.statText}>{exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''}</Text>
            </View>
            {workout.duration && (
              <View style={styles.statItem}>
                <Icon name="clock-outline" size={16} color="#666" />
                <Text style={styles.statText}>{workout.duration} min</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Icon name="calendar" size={16} color="#666" />
              <Text style={styles.statText}>{new Date(workout.workout_date).toLocaleDateString()}</Text>
            </View>
          </View>
          
          {Object.keys(muscleGroups).length > 0 && (
            <View style={styles.muscleGroupsRow}>
              {Object.entries(muscleGroups).slice(0, 4).map(([group, count], index) => (
                <View key={index} style={styles.muscleGroupChip}>
                  <Avatar.Icon
                    size={24}
                    icon="dumbbell"
                    backgroundColor={`${getMuscleGroupColor(group)}20`}
                    color={getMuscleGroupColor(group)}
                  />
                  <Text style={[styles.muscleGroupText, { color: getMuscleGroupColor(group) }]}>
                    {group} ({count})
                  </Text>
                </View>
              ))}
              {Object.keys(muscleGroups).length > 4 && (
                <Text style={styles.moreText}>+{Object.keys(muscleGroups).length - 4} more</Text>
              )}
            </View>
          )}
          
          <View style={styles.workoutActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('CreateWorkout', { workoutId: workout.workout_id });
              }}
            >
              <Icon name="pencil" size={16} color="#0099cc" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteWorkout(workout.workout_id);
              }}
            >
              <Icon name="delete" size={16} color="#e74c3c" />
              <Text style={[styles.actionButtonText, { color: '#e74c3c' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };
  

  const stats = getWorkoutStats();
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Stats Header */}
      <Animated.View style={{ transform: [{ scale: fadeAnim }] }}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient colors={['#0099cc', '#4ECDC4']} style={styles.statGradient}>
              <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Total Workouts</Text>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['#0099cc', '#4ECDC4']} style={styles.statGradient}>
              <Text style={styles.statValue}>{stats.thisWeekWorkouts}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['#0099cc', '#4ECDC4']} style={styles.statGradient}>
              <Text style={styles.statValue}>{stats.avgExercises}</Text>
              <Text style={styles.statLabel}>Avg Exercises</Text>
            </LinearGradient>
          </View>
        </View>
      </Animated.View>

      {/* Search and Filter Bar */}
      <Animated.View style={[styles.searchFilterContainer, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <Searchbar
          placeholder="Search workouts..."
          placeholderTextColor="#999"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
        <View style={styles.filterControls}>
          <Menu
            visible={showSortMenu}
            onDismiss={() => setShowSortMenu(false)}
            anchor={
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setShowSortMenu(true)}
              >
                <Icon name="sort" size={16} color="#0099cc" />
                <Text style={styles.filterButtonText}>Sort</Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={() => { setSortBy('date'); setShowSortMenu(false); }} title="By Date" />
            <Menu.Item onPress={() => { setSortBy('name'); setShowSortMenu(false); }} title="By Name" />
            <Menu.Item onPress={() => { setSortBy('exercises'); setShowSortMenu(false); }} title="By Exercises" />
          </Menu>

          <Menu
            visible={showFilterMenu}
            onDismiss={() => setShowFilterMenu(false)}
            anchor={
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setShowFilterMenu(true)}
              >
                <Icon name="filter" size={16} color="#0099cc" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={() => { setFilterBy('all'); setShowFilterMenu(false); }} title="All Time" />
            <Menu.Item onPress={() => { setFilterBy('thisWeek'); setShowFilterMenu(false); }} title="This Week" />
            <Menu.Item onPress={() => { setFilterBy('thisMonth'); setShowFilterMenu(false); }} title="This Month" />
          </Menu>
        </View>
      </Animated.View>
      
      <Animated.ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && { 
            height: '70vh', 
            overflow: 'scroll',
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch',
            maxHeight: '70vh'
          }
        ]}
        contentContainerStyle={[
          styles.scrollContainer,
          Platform.OS === 'web' && styles.webScrollContent
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Error Message */}
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}
        
        {/* Results Count */}
        {(searchQuery || filterBy !== 'all') && (
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {filteredWorkouts.length} workout{filteredWorkouts.length !== 1 ? 's' : ''} found
            </Text>
            {(searchQuery || filterBy !== 'all') && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setFilterBy('all');
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Workouts List */}
        <View style={styles.workoutsContainer}>
          {filteredWorkouts.length === 0 ? (
            <EmptyWorkoutState 
              hasSearch={!!searchQuery}
              onCreateWorkout={() => navigation.navigate('CreateWorkout')}
            />
          ) : (
            filteredWorkouts.map(renderWorkoutCard)
          )}
        </View>
      </Animated.ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateWorkout')}
      />
    </SafeAreaView>
  );
};

// Enhanced Empty State Component with Multiple Pathways
const EmptyWorkoutState = ({ hasSearch, onCreateWorkout }) => {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle bounce animation for icon
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    bounceLoop.start();

    return () => bounceLoop.stop();
  }, []);

  const handleActionPress = (action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action();
  };

  if (hasSearch) {
    return (
      <Animated.View style={[styles.emptyState, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <Avatar.Icon 
          size={80} 
          icon="magnify" 
          style={[styles.emptyStateIcon, { backgroundColor: '#FF6B6B' }]}
        />
        <Text style={styles.emptyStateTitle}>No Workouts Found</Text>
        <Text style={styles.emptyStateDescription}>
          No workouts match your search criteria. Try adjusting your filters or search terms.
        </Text>
        <View style={styles.emptyStateActions}>
          <Button 
            mode="outlined" 
            onPress={() => handleActionPress(onCreateWorkout)}
            style={styles.emptyStateSecondaryButton}
            icon="plus"
          >
            Create New Workout
          </Button>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.emptyState, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      {/* Animated Icon with Gradient Background */}
      <Animated.View style={[styles.emptyStateIconContainer, { transform: [{ scale: bounceAnim }] }]}>
        <LinearGradient
          colors={['#4ECDC4', '#0099cc']}
          style={styles.emptyStateIconGradient}
        >
          <Icon name="dumbbell" size={48} color="white" />
        </LinearGradient>
      </Animated.View>

      {/* Motivational Content */}
      <Text style={styles.emptyStateTitle}>Ready to Evolve? 💪</Text>
      <Text style={styles.emptyStateDescription}>
        Your fitness journey starts here! Create your first workout and track your amazing progress over time.
      </Text>

      {/* Multiple Action Pathways */}
      <View style={styles.emptyStateActions}>
        {/* Primary Action */}
        <TouchableOpacity 
          style={styles.emptyStatePrimaryCard}
          onPress={() => handleActionPress(onCreateWorkout)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0099cc', '#4ECDC4']}
            style={styles.primaryActionGradient}
          >
            <Icon name="plus-circle" size={32} color="white" />
            <Text style={styles.primaryActionTitle}>Create Workout</Text>
            <Text style={styles.primaryActionSubtitle}>Start from scratch</Text>
          </LinearGradient>
        </TouchableOpacity>

      </View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' && { height: '100vh' })
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },

  // Stats Header
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  statGradient: {
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },

  // Search and Filter
  searchFilterContainer: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#2a2a2a',
    elevation: 0,
    color: '#fff',
  },
  searchInput: {
    fontSize: 14,
    color: '#fff',
  },
  filterControls: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#0099cc',
    fontWeight: '500',
  },

  // Scrolling
  scrollView: {
    flex: 1,
    height: '100%'
  },
  scrollContainer: { 
    flexGrow: 1, 
    paddingBottom: 100,
    ...(Platform.OS === 'web' && { minHeight: '100vh' })
  },
  webScrollContent: {
    minHeight: '100%',
    flexGrow: 1,
    paddingBottom: 100,
  },

  // Results Info
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a4c5a',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#4ECDC4',
    textDecorationLine: 'underline',
  },

  // Error
  errorCard: {
    margin: 16,
    backgroundColor: '#331a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  errorText: {
    color: '#ff6b6b',
  },

  // Workouts Container
  workoutsContainer: {
    padding: 16,
    paddingTop: 8,
  },

  // Modern Workout Cards
  modernWorkoutCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutMainInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 12,
    color: '#999',
  },
  workoutBadge: {
    backgroundColor: '#0099cc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 60,
  },
  workoutBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  workoutBadgeLabel: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
  },
  workoutStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  muscleGroupsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  muscleGroupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  muscleGroupText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  workoutActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    gap: 4,
  },
  deleteButton: {
    backgroundColor: '#331a1a',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#0099cc',
    fontWeight: '500',
  },

  // Enhanced Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: 400,
  },
  emptyStateIconContainer: {
    marginBottom: 24,
  },
  emptyStateIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyStateIcon: {
    backgroundColor: '#f0f9ff',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  emptyStateActions: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyStatePrimaryCard: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0099cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryActionGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  emptyStateSecondaryButton: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 24,
  },

  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0099cc',
  },
});

export default WorkoutScreen;
