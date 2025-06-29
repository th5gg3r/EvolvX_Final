// screens/main/SocialScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  ActivityIndicator,
  Avatar,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* One-liner for Bearer header */
const authHdr = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default function SocialScreen({ navigation }) {
  const { user, token, api, logout } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [loading, setLoading]            = useState(true);
  const [refreshing, setRefreshing]      = useState(false);
  const [sharedWorkouts, setSharedWorkouts] = useState([]);
  const [friends, setFriends]            = useState([]);
  const [activityFeed, setActivityFeed]  = useState([]);
  const [error, setError]                = useState(null);

  /* ---------- data fetch ---------- */
  const loadData = useCallback(async () => {
    try {
      setError(null);

      /* 1) shared workouts */
      try {
        const { data: sw } = await api.get(
          '/social/shared-workouts',
          authHdr(token)
        );
        setSharedWorkouts(Array.isArray(sw) ? sw : []);
      } catch (swErr) {
        console.log('Shared workouts endpoint not available:', swErr.response?.status);
        setSharedWorkouts([]); // Set empty array as fallback
      }

      /* 2) friends list */
      let friends = [];
      try {
        const { data: fr } = await api.get(
          '/social/friends',
          { ...authHdr(token), params: { status: 'accepted' } }
        );
        friends = Array.isArray(fr) ? fr : [];
        setFriends(friends);
      } catch (frErr) {
        console.log('Friends endpoint not available:', frErr.response?.status);
        setFriends([]); // Set empty array as fallback
      }

      /* 3) quick mock for recent activity */
      setActivityFeed(
        friends.slice(0, 5).map((f) => ({
          id: `act-${f.user_id}`,
          user_id: f.user_id,
          username: f.username,
          activity_type: Math.random() > 0.5 ? 'workout_completed' : 'rank_up',
          details: Math.random() > 0.5 ? 'Leg Day' : 'Reached Gold',
          timestamp: new Date(
            Date.now() - Math.floor(Math.random() * 86_400_000)
          ).toISOString(),
        }))
      );
    } catch (err) {
      console.error('Error loading social data:', err);
      setError('Some social features may not be available.');
      if (err.response?.status === 401) {
        await logout();
        navigation.replace('Login');
      }
    } finally {
      setRefreshing(false);
    }
  }, [api, token, logout, navigation]);

  /* ---------- initial + token-change fetch ---------- */
  useEffect(() => {
    if (token) {
      loadData();
    }
    
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

    // Gentle pulse animation for onboarding elements
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    return () => pulseLoop.stop();
  }, [token, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleJoinWorkout = async (id) => {
    try {
      await api.post(`/social/shared-workouts/${id}/join`, null, authHdr(token));
      loadData();
    } catch (err) {
      console.error('Error joining workout:', err);
      Alert.alert('Error', 'Failed to join workout.');
      if (err.response && (err.response.status === 401 || err.response.status === 422)) {
        await logout();
        navigation.replace('Login');
      }
    }
  };

  const handleCreateSharedWorkout = async () => {
    try {
      await api.post(
        '/social/shared-workouts',
        { workout_name: 'New Shared Workout' },
        authHdr(token)
      );
      loadData();
    } catch (err) {
      console.error('Error creating shared workout:', err);
      Alert.alert('Error', 'Failed to create shared workout.');
      if (err.response && err.response.status === 401) {
        await logout();
        navigation.replace('Login');
      }
    }
  };

  /* ---------- helpers ---------- */
  const getInitials = (u = '?') => u.charAt(0).toUpperCase();
  const timeAgo = (ts) => {
    const now = new Date(),
      t = new Date(ts),
      d = Math.floor((now - t) / 86_400_000),
      h = Math.floor((now - t) / 3_600_000),
      m = Math.floor((now - t) / 60_000);
    return d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'Just now';
  };


  /* ---------- main UI ---------- */
  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          },
          Platform.OS === 'web' && { 
            height: '80vh', 
            overflow: 'scroll',
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch',
            maxHeight: '80vh'
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

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* --- shared workouts --------------------------------------- */}
        <Card style={styles.card}>
          <Card.Content>
            <SectionHeader 
              title="Active Shared Workouts" 
              onViewAll={() => Alert.alert('View All', 'All shared workouts view coming soon!')}
            />
            {sharedWorkouts.length === 0 ? (
              <EmptyState
                icon="account-group-outline"
                title="No Active Workouts"
                description="Start working out with friends by creating or joining a shared workout session."
                actionText="Create Workout"
                onAction={handleCreateSharedWorkout}
              />
            ) : (
              sharedWorkouts.slice(0, 3).map((sw) => (
                <Card key={sw.shared_workout_id} style={styles.workoutCard}>
                  <Card.Content>
                    <Title>{sw.workout_name}</Title>
                    <Paragraph>with {sw.creator_name}</Paragraph>
                    <Button
                      mode="contained"
                      style={styles.joinButton}
                      onPress={() =>
                        sw.is_participating
                          ? navigation.navigate('SharedWorkout', {
                              workoutId: sw.shared_workout_id,
                            })
                          : handleJoinWorkout(sw.shared_workout_id)
                      }
                    >
                      {sw.is_participating ? 'Continue' : 'Join'}
                    </Button>
                  </Card.Content>
                </Card>
              ))
            )}
            <Button
              mode="contained"
              icon="plus"
              style={styles.createButton}
              onPress={handleCreateSharedWorkout}
            >
              Create Shared Workout
            </Button>
          </Card.Content>
        </Card>

        {/* --- friends ---------------------------------------------- */}
        <Card style={styles.card}>
          <Card.Content>
            <SectionHeader 
              title="Your Friends" 
              onViewAll={() => Alert.alert('View All', 'All friends view coming soon!')}
            />
            {friends.length === 0 ? (
              <EmptyState
                icon="account-plus-outline"
                title="No Friends Yet"
                description="Connect with other fitness enthusiasts to share workouts, compete, and stay motivated together."
                actionText="Add Friends"
                onAction={() => {
                  Alert.alert('Add Friends', 'Friend search feature coming soon!');
                }}
              />
            ) : (
              friends.slice(0, 5).map((f) => (
                <TouchableOpacity
                  key={f.user_id}
                  style={styles.friendItem}
                  onPress={() => navigation.navigate('FriendProfile', {
                    friendId: f.user_id,
                    friendData: f
                  })}
                >
                  <View style={styles.friendInfo}>
                    <Avatar.Text
                      size={40}
                      label={getInitials(f.username)}
                      backgroundColor="#e0e0e0"
                    />
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{f.username}</Text>
                      <View style={styles.friendStatus}>
                        {f.online_status === 'online' && (
                          <View style={styles.onlineIndicator} />
                        )}
                        <Text style={styles.workoutCount}>
                          {f.workout_count} workouts
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <Button
              mode="outlined"
              icon="account-plus"
              style={styles.addFriendButton}
              onPress={() => {
                /* add-friend flow */
              }}
            >
              Add Friend
            </Button>
          </Card.Content>
        </Card>

        {/* --- activity feed ---------------------------------------- */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Recent Activity</Title>
            {activityFeed.length === 0 ? (
              <EmptyState
                icon="timeline-outline"
                title="No Recent Activity"
                description="Activity from your friends will appear here. Add friends to see their workout progress and achievements."
                actionText="Find Friends"
                onAction={() => {
                  Alert.alert('Find Friends', 'Friend discovery feature coming soon!');
                }}
              />
            ) : (
              activityFeed.map((a, idx) => (
                <View key={a.id}>
                  <View style={styles.activityItem}>
                    <Avatar.Text
                      size={40}
                      label={getInitials(a.username)}
                      backgroundColor="#e0e0e0"
                    />
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityText}>
                        <Text style={styles.activityName}>{a.username}</Text>{' '}
                        {a.activity_type === 'workout_completed'
                          ? 'completed workout'
                          : 'reached new rank'}{' '}
                        <Text style={styles.activityHighlight}>{a.details}</Text>
                      </Text>
                      <Text style={styles.activityTime}>
                        {timeAgo(a.timestamp)}
                      </Text>
                    </View>
                  </View>
                  {idx < activityFeed.length - 1 && (
                    <Divider style={styles.divider} />
                  )}
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </Animated.ScrollView>

      <FAB
        style={styles.fab}
        icon="account-group-outline"
        onPress={handleCreateSharedWorkout}
      />
    </SafeAreaView>
  );
}

/* ---------- tiny reusable header ---------- */
const SectionHeader = ({ title, onViewAll }) => (
  <View style={styles.sectionHeader}>
    <Title style={styles.sectionTitle}>{title}</Title>
    <Button mode="text" onPress={onViewAll || (() => {})}>
      View all
    </Button>
  </View>
);

/* ---------- empty state component ---------- */
const EmptyState = ({ icon, title, description, actionText, onAction }) => (
  <View style={styles.emptyState}>
    <Avatar.Icon 
      size={80} 
      icon={icon} 
      style={styles.emptyStateIcon}
    />
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateDescription}>{description}</Text>
    {actionText && onAction && (
      <Button 
        mode="contained" 
        onPress={onAction}
        style={styles.emptyStateButton}
      >
        {actionText}
      </Button>
    )}
  </View>
);

/* ---------- styles (unchanged visuals) ---------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' && { height: '100vh' })
  },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#fff' },

  errorCard: { margin: 16, backgroundColor: '#331a1a', borderWidth: 1, borderColor: '#444' },
  errorText: { color: '#ff6b6b' },

  card: { margin: 16, marginBottom: 8, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, color: '#fff' },

  workoutCard: { marginBottom: 12, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  joinButton: { marginTop: 8, backgroundColor: '#0099cc' },
  createButton: { marginTop: 16, backgroundColor: '#0099cc' },

  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  friendInfo: { flexDirection: 'row', alignItems: 'center' },
  friendDetails: { marginLeft: 12 },
  friendName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  friendStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  workoutCount: { fontSize: 12, color: '#999' },
  addFriendButton: { marginTop: 8 },

  activityItem: { flexDirection: 'row', marginBottom: 12, marginTop: 12 },
  activityDetails: { marginLeft: 12, flex: 1 },
  activityText: { fontSize: 14, lineHeight: 20, color: '#fff' },
  activityName: { fontWeight: 'bold' },
  activityHighlight: { fontWeight: 'bold', color: '#0099cc' },
  activityTime: { fontSize: 12, color: '#999', marginTop: 4 },
  divider: { marginVertical: 4, backgroundColor: '#333' },

  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#0099cc' },

  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateIcon: {
    backgroundColor: '#1a4c5a',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyStateButton: {
    backgroundColor: '#0099cc',
    paddingHorizontal: 24,
  },
});

// Enhanced Social Onboarding Component
const SocialOnboarding = ({ user, onSkip, onComplete, pulseAnim, navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onboardingSteps = [
    {
      title: "Welcome to EvolvX! 🎉",
      description: `Hey ${user?.username || 'there'}! Ready to supercharge your workouts with friends?`,
      icon: "account-group",
      color: "#4ECDC4",
      actions: [
        { text: "Let's Go!", primary: true, action: () => nextStep() },
        { text: "Skip Tour", primary: false, action: onSkip }
      ]
    },
    {
      title: "Connect with Friends 👥",
      description: "Find and add workout buddies to stay motivated together. Share progress, compete, and celebrate achievements!",
      icon: "account-plus",
      color: "#9B59B6",
      actions: [
        { text: "Add Friends", primary: true, action: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          console.log('Navigate to add friends');
          nextStep();
        }},
        { text: "Next", primary: false, action: () => nextStep() }
      ]
    },
    {
      title: "Share Workouts Live 🏋️‍♂️",
      description: "Create shared workout sessions and exercise together in real-time, even when you're apart!",
      icon: "dumbbell",
      color: "#E74C3C",
      actions: [
        { text: "Create Workout", primary: true, action: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('CreateWorkout');
          onComplete();
        }},
        { text: "Next", primary: false, action: () => nextStep() }
      ]
    },
    {
      title: "Track & Compete 📊",
      description: "Follow your friends' progress, see who's crushing their goals, and climb the leaderboards together!",
      icon: "trophy",
      color: "#F39C12",
      actions: [
        { text: "View Leaderboard", primary: true, action: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('Leaderboard');
          onComplete();
        }},
        { text: "Finish Tour", primary: false, action: onComplete }
      ]
    }
  ];

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleActionPress = (action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action();
  };

  const step = onboardingSteps[currentStep];

  return (
    <Animated.View style={[styles.onboardingContainer, {
      transform: [{ scale: scaleAnim }, { translateY: slideAnim }]
    }]}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {onboardingSteps.map((_, index) => (
          <View 
            key={index}
            style={[
              styles.progressDot,
              { backgroundColor: index <= currentStep ? step.color : '#E0E0E0' }
            ]}
          />
        ))}
      </View>

      {/* Step Content */}
      <View style={styles.stepContent}>
        {/* Animated Icon */}
        <Animated.View style={[styles.stepIconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={[step.color, `${step.color}AA`]}
            style={styles.stepIconGradient}
          >
            <Icon name={step.icon} size={48} color="white" />
          </LinearGradient>
        </Animated.View>

        {/* Content */}
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDescription}>{step.description}</Text>

        {/* Actions */}
        <View style={styles.stepActions}>
          {step.actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                action.primary ? [styles.primaryAction, { backgroundColor: step.color }] : styles.secondaryAction
              ]}
              onPress={() => handleActionPress(action.action)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.actionText,
                action.primary ? styles.primaryActionText : styles.secondaryActionText
              ]}>
                {action.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Skip Button */}
      <TouchableOpacity 
        style={styles.skipButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSkip();
        }}
      >
        <Text style={styles.skipText}>Skip Tour</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Add onboarding styles to main styles object
styles.onboardingContainer = {
  backgroundColor: 'white',
  margin: 16,
  borderRadius: 20,
  padding: 24,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 20,
  elevation: 10,
  marginBottom: 24,
};

styles.progressContainer = {
  flexDirection: 'row',
  justifyContent: 'center',
  marginBottom: 24,
  gap: 8,
};

styles.progressDot = {
  width: 8,
  height: 8,
  borderRadius: 4,
};

styles.stepContent = {
  alignItems: 'center',
};

styles.stepIconContainer = {
  marginBottom: 20,
};

styles.stepIconGradient = {
  width: 100,
  height: 100,
  borderRadius: 50,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 6,
};

styles.stepTitle = {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
  marginBottom: 12,
};

styles.stepDescription = {
  fontSize: 16,
  color: '#666',
  textAlign: 'center',
  lineHeight: 24,
  marginBottom: 32,
  maxWidth: 280,
};

styles.stepActions = {
  width: '100%',
  gap: 12,
};

styles.actionButton = {
  paddingVertical: 14,
  paddingHorizontal: 24,
  borderRadius: 12,
  alignItems: 'center',
};

styles.primaryAction = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
};

styles.secondaryAction = {
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: '#E0E0E0',
};

styles.actionText = {
  fontSize: 16,
  fontWeight: 'bold',
};

styles.primaryActionText = {
  color: 'white',
};

styles.secondaryActionText = {
  color: '#666',
};

styles.skipButton = {
  position: 'absolute',
  top: 16,
  right: 16,
  padding: 8,
};

styles.skipText = {
  color: '#999',
  fontSize: 14,
};

