// screens/main/FriendRequestsScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  Avatar,
  Chip,
  ActivityIndicator,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function FriendRequestsScreen({ navigation }) {
  const { user, token, api } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFriendRequests();
    
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

  const loadFriendRequests = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // TODO: Replace with actual API calls when backend is ready
      const [receivedResponse, sentResponse] = await Promise.all([
        api.get('/social/friend-requests/received', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get('/social/friend-requests/sent', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setReceivedRequests(receivedResponse.data.requests || []);
      setSentRequests(sentResponse.data.requests || []);
    } catch (err) {
      console.log('Friend requests endpoints not available:', err.response?.status);
      
      // Mock data for testing UI
      const mockReceived = [
        {
          request_id: 1,
          sender_id: 101,
          sender_username: 'fitness_buddy',
          sender_rank: 'Gold Gladiator',
          sender_workout_count: 45,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          status: 'pending'
        },
        {
          request_id: 2,
          sender_id: 102,
          sender_username: 'gym_warrior',
          sender_rank: 'Platinum Spartan',
          sender_workout_count: 120,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          status: 'pending'
        },
      ];

      const mockSent = [
        {
          request_id: 3,
          receiver_id: 103,
          receiver_username: 'strong_lifter',
          receiver_rank: 'Silver Warrior',
          receiver_workout_count: 30,
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          status: 'pending'
        },
      ];

      setReceivedRequests(mockReceived);
      setSentRequests(mockSent);
      setError('Using mock data - backend not connected');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, token]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFriendRequests();
  };

  const acceptFriendRequest = async (requestId, senderUsername) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // TODO: Replace with actual API call when backend is ready
      await api.put(`/social/friend-requests/${requestId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from received requests
      setReceivedRequests(prev => prev.filter(req => req.request_id !== requestId));
      Alert.alert('Success', `You are now friends with ${senderUsername}!`);
    } catch (err) {
      console.log('Accept friend request endpoint not available:', err.response?.status);
      
      // Mock success for testing
      setReceivedRequests(prev => prev.filter(req => req.request_id !== requestId));
      Alert.alert('Success (Mock)', `You are now friends with ${senderUsername}!`);
    }
  };

  const rejectFriendRequest = async (requestId, senderUsername) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // TODO: Replace with actual API call when backend is ready
      await api.put(`/social/friend-requests/${requestId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from received requests
      setReceivedRequests(prev => prev.filter(req => req.request_id !== requestId));
      Alert.alert('Declined', `Friend request from ${senderUsername} declined.`);
    } catch (err) {
      console.log('Reject friend request endpoint not available:', err.response?.status);
      
      // Mock success for testing
      setReceivedRequests(prev => prev.filter(req => req.request_id !== requestId));
      Alert.alert('Declined (Mock)', `Friend request from ${senderUsername} declined.`);
    }
  };

  const cancelFriendRequest = async (requestId, receiverUsername) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // TODO: Replace with actual API call when backend is ready
      await api.delete(`/social/friend-requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from sent requests
      setSentRequests(prev => prev.filter(req => req.request_id !== requestId));
      Alert.alert('Cancelled', `Friend request to ${receiverUsername} cancelled.`);
    } catch (err) {
      console.log('Cancel friend request endpoint not available:', err.response?.status);
      
      // Mock success for testing
      setSentRequests(prev => prev.filter(req => req.request_id !== requestId));
      Alert.alert('Cancelled (Mock)', `Friend request to ${receiverUsername} cancelled.`);
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

  const timeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const renderReceivedRequest = (request) => (
    <Card key={request.request_id} style={styles.requestCard}>
      <Card.Content style={styles.requestContent}>
        <View style={styles.requestInfo}>
          <Avatar.Text
            size={50}
            label={getInitials(request.sender_username)}
            backgroundColor={getRankColor(request.sender_rank)}
            color="#000"
          />
          <View style={styles.requestDetails}>
            <Text style={styles.requestUsername}>{request.sender_username}</Text>
            <View style={styles.requestStats}>
              <Chip
                style={[styles.rankChip, { backgroundColor: getRankColor(request.sender_rank) }]}
                textStyle={styles.rankChipText}
              >
                {request.sender_rank}
              </Chip>
              <Text style={styles.workoutCount}>
                {request.sender_workout_count} workouts
              </Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo(request.created_at)}</Text>
          </View>
        </View>
        
        <View style={styles.requestActions}>
          <Button
            mode="contained"
            style={styles.acceptButton}
            onPress={() => acceptFriendRequest(request.request_id, request.sender_username)}
            icon="check"
          >
            Accept
          </Button>
          <Button
            mode="outlined"
            style={styles.rejectButton}
            textColor="#ff6b6b"
            onPress={() => rejectFriendRequest(request.request_id, request.sender_username)}
            icon="close"
          >
            Decline
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderSentRequest = (request) => (
    <Card key={request.request_id} style={styles.requestCard}>
      <Card.Content style={styles.requestContent}>
        <View style={styles.requestInfo}>
          <Avatar.Text
            size={50}
            label={getInitials(request.receiver_username)}
            backgroundColor={getRankColor(request.receiver_rank)}
            color="#000"
          />
          <View style={styles.requestDetails}>
            <Text style={styles.requestUsername}>{request.receiver_username}</Text>
            <View style={styles.requestStats}>
              <Chip
                style={[styles.rankChip, { backgroundColor: getRankColor(request.receiver_rank) }]}
                textStyle={styles.rankChipText}
              >
                {request.receiver_rank}
              </Chip>
              <Text style={styles.workoutCount}>
                {request.receiver_workout_count} workouts
              </Text>
            </View>
            <Text style={styles.timeAgo}>Sent {timeAgo(request.created_at)}</Text>
          </View>
        </View>
        
        <View style={styles.requestActions}>
          <Chip style={styles.pendingChip} icon="clock-outline">
            Pending
          </Chip>
          <Button
            mode="outlined"
            style={styles.cancelButton}
            textColor="#ff6b6b"
            onPress={() => cancelFriendRequest(request.request_id, request.receiver_username)}
            icon="close"
          >
            Cancel
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests;

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
              <Text style={styles.headerTitle}>Friend Requests</Text>
              <Text style={styles.headerSubtitle}>
                {receivedRequests.length} received, {sentRequests.length} sent
              </Text>
            </View>
            <IconButton
              icon="refresh"
              size={24}
              iconColor="white"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRefresh();
              }}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.content, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        {/* Tab Selector */}
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab(value);
          }}
          buttons={[
            { 
              value: 'received', 
              label: `Received (${receivedRequests.length})`,
              icon: 'inbox-arrow-down'
            },
            { 
              value: 'sent', 
              label: `Sent (${sentRequests.length})`,
              icon: 'send'
            }
          ]}
          style={styles.segmentedButtons}
        />

        {/* Error Message */}
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Request List */}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0099cc" />
              <Text style={styles.loadingText}>Loading friend requests...</Text>
            </View>
          ) : currentRequests.length === 0 ? (
            <EmptyState
              icon={activeTab === 'received' ? 'inbox-outline' : 'send-outline'}
              title={activeTab === 'received' ? 'No Received Requests' : 'No Sent Requests'}
              description={
                activeTab === 'received' 
                  ? 'You have no pending friend requests. Share your username with friends!' 
                  : 'You haven\'t sent any friend requests yet. Search for friends to connect with!'
              }
              actionText={activeTab === 'sent' ? 'Find Friends' : undefined}
              onAction={activeTab === 'sent' ? () => navigation.navigate('FriendSearch') : undefined}
            />
          ) : (
            <View style={styles.requestsContainer}>
              <Text style={styles.requestsHeader}>
                {activeTab === 'received' ? 'Incoming Requests' : 'Outgoing Requests'}
              </Text>
              {currentRequests.map(activeTab === 'received' ? renderReceivedRequest : renderSentRequest)}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

/* Empty State Component */
const EmptyState = ({ icon, title, description, actionText, onAction }) => (
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
  segmentedButtons: {
    marginBottom: 16,
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
  requestsContainer: {
    flex: 1,
  },
  requestsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  requestCard: {
    marginBottom: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
  },
  requestContent: {
    flexDirection: 'column',
    gap: 16,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDetails: {
    marginLeft: 16,
    flex: 1,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  requestStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
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
  timeAgo: {
    fontSize: 12,
    color: '#666',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    flex: 1,
  },
  rejectButton: {
    borderColor: '#ff6b6b',
    borderRadius: 8,
    flex: 1,
  },
  cancelButton: {
    borderColor: '#ff6b6b',
    borderRadius: 8,
    flex: 1,
  },
  pendingChip: {
    backgroundColor: '#ff9800',
    flex: 1,
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
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#0099cc',
    borderRadius: 8,
    paddingHorizontal: 24,
  },
});