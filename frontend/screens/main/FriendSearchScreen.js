// screens/main/FriendSearchScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  Searchbar,
  Avatar,
  Chip,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function FriendSearchScreen({ navigation }) {
  const { user, token, api } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [error, setError] = useState(null);

  useEffect(() => {
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

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call when backend is ready
      const response = await api.get('/social/search-users', {
        params: { query: query.trim() },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSearchResults(response.data.users || []);
    } catch (err) {
      console.log('Search users endpoint not available:', err.response?.status);
      
      // Mock data for testing UI
      const mockUsers = [
        {
          user_id: 1,
          username: `${query}_user1`,
          workout_count: 25,
          rank_tier: 'Gold Gladiator',
          is_friend: false,
          request_sent: false,
        },
        {
          user_id: 2,
          username: `${query}_fitness_pro`,
          workout_count: 150,
          rank_tier: 'Platinum Spartan',
          is_friend: false,
          request_sent: false,
        },
        {
          user_id: 3,
          username: `${query}_beginner`,
          workout_count: 5,
          rank_tier: 'Bronze Fighter',
          is_friend: true,
          request_sent: false,
        },
      ].filter(u => u.username.toLowerCase().includes(query.toLowerCase()));
      
      setSearchResults(mockUsers);
      setError('Using mock data - backend not connected');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId, username) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // TODO: Replace with actual API call when backend is ready
      await api.post('/social/friend-requests', {
        receiver_id: userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSentRequests(prev => new Set([...prev, userId]));
      Alert.alert('Success', `Friend request sent to ${username}!`);
    } catch (err) {
      console.log('Send friend request endpoint not available:', err.response?.status);
      
      // Mock success for testing
      setSentRequests(prev => new Set([...prev, userId]));
      Alert.alert('Success (Mock)', `Friend request sent to ${username}!`);
    }
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  const getRankColor = (tier) => {
    switch (tier) {
      case 'Platinum Spartan':
        return '#E5E4E2';
      case 'Gold Gladiator':
        return '#FFD700';
      case 'Silver Warrior':
        return '#C0C0C0';
      case 'Bronze Fighter':
        return '#CD7F32';
      case 'Diamond Titan':
        return '#B9F2FF';
      default:
        return '#0099cc';
    }
  };

  const renderUserCard = (userResult) => {
    const isRequestSent = sentRequests.has(userResult.user_id) || userResult.request_sent;
    const isFriend = userResult.is_friend;
    const isCurrentUser = userResult.user_id === user.id;

    return (
      <Card key={userResult.user_id} style={styles.userCard}>
        <Card.Content style={styles.userCardContent}>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={50}
              label={getInitials(userResult.username)}
              backgroundColor={getRankColor(userResult.rank_tier)}
              color="#000"
            />
            <View style={styles.userDetails}>
              <Text style={styles.username}>{userResult.username}</Text>
              <View style={styles.userStats}>
                <Chip
                  style={[styles.rankChip, { backgroundColor: getRankColor(userResult.rank_tier) }]}
                  textStyle={styles.rankChipText}
                >
                  {userResult.rank_tier}
                </Chip>
                <Text style={styles.workoutCount}>
                  {userResult.workout_count} workouts
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.actionContainer}>
            {isCurrentUser ? (
              <Chip style={styles.youChip}>You</Chip>
            ) : isFriend ? (
              <Chip style={styles.friendChip} icon="check">Friends</Chip>
            ) : isRequestSent ? (
              <Chip style={styles.sentChip} icon="clock-outline">Sent</Chip>
            ) : (
              <Button
                mode="contained"
                style={styles.addButton}
                onPress={() => sendFriendRequest(userResult.user_id, userResult.username)}
                icon="account-plus"
              >
                Add
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ scale: fadeAnim }] }]}>
        <LinearGradient
          colors={['#0099cc', '#4ECDC4']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor="white"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
            />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Find Friends</Text>
              <Text style={styles.headerSubtitle}>Discover workout partners</Text>
            </View>
            <IconButton
              icon="account-multiple-plus"
              size={24}
              iconColor="white"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('FriendRequests');
              }}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.content, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        {/* Search Bar */}
        <Searchbar
          placeholder="Search by username..."
          onChangeText={(query) => {
            setSearchQuery(query);
            searchUsers(query);
          }}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          onSubmitEditing={() => searchUsers(searchQuery)}
        />

        {/* Error Message */}
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Search Results */}
        <ScrollView
          style={[
            styles.scrollView,
            Platform.OS === 'web' && {
              overflow: 'scroll',
              overflowY: 'scroll',
              WebkitOverflowScrolling: 'touch',
              height: '100vh',
              maxHeight: '100vh',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }
          ]}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0099cc" />
              <Text style={styles.loadingText}>Searching users...</Text>
            </View>
          ) : searchQuery.trim() === '' ? (
            <EmptyState
              icon="account-search"
              title="Search for Friends"
              description="Enter a username to find other fitness enthusiasts and start building your workout community!"
            />
          ) : searchResults.length === 0 ? (
            <EmptyState
              icon="account-question"
              title="No Users Found"
              description={`No users found matching "${searchQuery}". Try a different search term.`}
            />
          ) : (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsHeader}>
                Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
              </Text>
              {searchResults.map(renderUserCard)}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

/* Empty State Component */
const EmptyState = ({ icon, title, description }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyStateIconContainer}>
      <LinearGradient
        colors={['#0099cc', '#4ECDC4']}
        style={styles.emptyStateIconGradient}
      >
        <Icon name={icon} size={48} color="#fff" />
      </LinearGradient>
    </View>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateDescription}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' && { height: '100vh' })
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    elevation: 2,
  },
  searchInput: {
    color: '#fff',
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#331a1a',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  userCard: {
    marginBottom: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankChip: {
    height: 24,
  },
  rankChipText: {
    fontSize: 12,
    color: '#000',
    fontWeight: 'bold',
  },
  workoutCount: {
    fontSize: 12,
    color: '#999',
  },
  actionContainer: {
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: '#0099cc',
    borderRadius: 8,
  },
  youChip: {
    backgroundColor: '#0099cc',
  },
  friendChip: {
    backgroundColor: '#4CAF50',
  },
  sentChip: {
    backgroundColor: '#ff9800',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateIconContainer: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 24,
  },
  emptyStateIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
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
    maxWidth: 300,
  },
});