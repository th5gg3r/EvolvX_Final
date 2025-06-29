// screens/main/FriendProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  Avatar,
  Divider,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function FriendProfileScreen({ navigation, route }) {
  const { user, token, api } = useAuth();
  const { friendId, friendData } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState(friendData || null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    weeklyAverage: 0,
    currentStreak: 0,
    favoriteExercise: 'Push-ups'
  });

  useEffect(() => {
    loadFriendProfile();
  }, []);

  const loadFriendProfile = async () => {
    try {
      setLoading(true);
      
      // Mock friend data if not provided
      if (!friend) {
        setFriend({
          user_id: friendId || 1,
          username: 'FitnessGuru42',
          email: 'fitness@example.com',
          online_status: 'online',
          workout_count: 45,
          join_date: '2024-01-15',
          bio: 'Passionate about fitness and helping others reach their goals! 💪',
          achievements: ['100 Workouts', 'Consistency King', 'Early Bird'],
        });
      }

      // Mock recent workouts
      setRecentWorkouts([
        {
          id: 1,
          name: 'Morning Cardio',
          date: '2024-06-23',
          duration: 30,
          exercises_count: 5,
        },
        {
          id: 2,
          name: 'Strength Training',
          date: '2024-06-22',
          duration: 45,
          exercises_count: 8,
        },
        {
          id: 3,
          name: 'Yoga Flow',
          date: '2024-06-21',
          duration: 60,
          exercises_count: 12,
        },
      ]);

      // Mock stats
      setStats({
        totalWorkouts: 45,
        weeklyAverage: 4.2,
        currentStreak: 7,
        favoriteExercise: 'Push-ups'
      });

    } catch (error) {
      console.error('Error loading friend profile:', error);
      Alert.alert('Error', 'Failed to load friend profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = () => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend?.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Friend removed successfully');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleSendMessage = () => {
    Alert.alert('Message', 'Messaging feature coming soon!');
  };

  const handleInviteToWorkout = () => {
    Alert.alert('Invite Sent', `Workout invitation sent to ${friend?.username}!`);
  };

  const getInitials = (username = '?') => username.charAt(0).toUpperCase();

  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!friend) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Friend not found</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Profile Header */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={80}
                label={getInitials(friend.username)}
                backgroundColor="#0099cc"
                color="white"
              />
              <View style={styles.profileInfo}>
                <Title style={styles.username}>{friend.username}</Title>
                <View style={styles.statusContainer}>
                  {friend.online_status === 'online' && (
                    <View style={styles.onlineIndicator} />
                  )}
                  <Text style={styles.statusText}>
                    {friend.online_status === 'online' ? 'Online' : 'Offline'}
                  </Text>
                </View>
                <Text style={styles.joinDate}>
                  Member since {new Date(friend.join_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            {friend.bio && (
              <Text style={styles.bio}>{friend.bio}</Text>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="dumbbell"
                style={styles.primaryButton}
                onPress={handleInviteToWorkout}
              >
                Invite to Workout
              </Button>
              <Button
                mode="outlined"
                icon="message-outline"
                style={styles.secondaryButton}
                onPress={handleSendMessage}
              >
                Message
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Stats */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Fitness Stats</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
                <Text style={styles.statLabel}>Total Workouts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.weeklyAverage}</Text>
                <Text style={styles.statLabel}>Weekly Average</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.favoriteExercise}</Text>
                <Text style={styles.statLabel}>Favorite Exercise</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Achievements */}
        {friend.achievements && friend.achievements.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Achievements</Title>
              <View style={styles.achievementsContainer}>
                {friend.achievements.map((achievement, index) => (
                  <Chip
                    key={index}
                    icon="trophy"
                    style={styles.achievementChip}
                    textStyle={styles.achievementText}
                  >
                    {achievement}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Recent Workouts */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Recent Workouts</Title>
            {recentWorkouts.length === 0 ? (
              <Paragraph>No recent workouts to show.</Paragraph>
            ) : (
              recentWorkouts.map((workout, index) => (
                <View key={workout.id}>
                  <View style={styles.workoutItem}>
                    <View style={styles.workoutInfo}>
                      <Text style={styles.workoutName}>{workout.name}</Text>
                      <Text style={styles.workoutDetails}>
                        {workout.duration} min • {workout.exercises_count} exercises
                      </Text>
                    </View>
                    <Text style={styles.workoutDate}>
                      {timeAgo(workout.date)}
                    </Text>
                  </View>
                  {index < recentWorkouts.length - 1 && (
                    <Divider style={styles.divider} />
                  )}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Danger Zone */}
        <Card style={styles.dangerCard}>
          <Card.Content>
            <Title style={styles.dangerTitle}>Manage Friendship</Title>
            <Button
              mode="outlined"
              icon="account-remove"
              style={styles.dangerButton}
              textColor="#d32f2f"
              onPress={handleRemoveFriend}
            >
              Remove Friend
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    paddingBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  bio: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0099cc',
  },
  secondaryButton: {
    flex: 1,
  },
  
  card: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0099cc',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementChip: {
    backgroundColor: '#e3f2fd',
  },
  achievementText: {
    color: '#0099cc',
  },
  
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
  },
  workoutDate: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    marginVertical: 4,
  },
  
  dangerCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#fff5f5',
  },
  dangerTitle: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 12,
  },
  dangerButton: {
    borderColor: '#d32f2f',
  },
});