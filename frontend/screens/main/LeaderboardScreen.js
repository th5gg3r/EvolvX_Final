import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, Animated, LayoutAnimation, UIManager } from 'react-native';
import { Text, Card, Title, Paragraph, Chip, Searchbar, SegmentedButtons, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import { getRankColor, RANKS } from '../../utils/rankingSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LeaderboardScreen = ({ navigation }) => {
  const { user, api } = useAuth();
  const { getUserRankings } = useFirebase();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLeaderboard, setFilteredLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  
  // Filter options
  const [userFilter, setUserFilter] = useState('all'); // 'all' or 'friends'
  const [ageRange, setAgeRange] = useState(null); // { min: 18, max: 30 } or null for all
  
  // Load initial data and animations
  useEffect(() => {
    loadLeaderboard();
    
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [userFilter, ageRange]);
  
  // Filter leaderboard when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLeaderboard(leaderboard);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = leaderboard.filter(entry => 
        entry.username.toLowerCase().includes(query)
      );
      setFilteredLeaderboard(filtered);
    }
  }, [searchQuery, leaderboard]);
  
  const loadLeaderboard = async () => {
    try {
      setError(null);
      setLoading(true);
      
      let endpoint = '/rankings/leaderboard';
      let params = {};
      
      // Add age range if specified
      if (ageRange) {
        params.min_age = ageRange.min;
        params.max_age = ageRange.max;
      }
      
      // Use friends endpoint if selected
      if (userFilter === 'friends') {
        endpoint = '/rankings/leaderboard/friends';
      }
      
      const response = await api.get(endpoint, { params });
      
      // Debug: Log what we're getting from the API
      console.log('Leaderboard API Response:', response.data);
      console.log('First leaderboard entry:', response.data.leaderboard?.[0]);
      
      let leaderboardData = response.data.leaderboard || [];
      
      // Use database values directly - backend now provides correct MMR scores
      setLeaderboard(leaderboardData);
      setFilteredLeaderboard(leaderboardData);
      
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };
  
  
  const getLeaderboardRankColor = (tier) => {
    // Use the ranking system utility for consistent colors
    const rank = Object.values(RANKS).find(r => r.name === tier);
    return rank ? rank.color : '#CD7F32'; // Default to bronze
  };
  
  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };
  
  const renderLeaderboardEntry = (entry, index) => {
    const isCurrentUser = entry.user_id === user.id;
    const rankColor = getLeaderboardRankColor(entry.rank_tier);
    
    return (
      <Card 
        key={entry.user_id} 
        style={[
          styles.entryCard,
          isCurrentUser && styles.currentUserCard
        ]}
      >
        <Card.Content style={styles.entryContent}>
          <View style={styles.rankContainer}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
          
          <Avatar.Text 
            size={40} 
            label={getInitials(entry.username)} 
            backgroundColor={isCurrentUser ? '#0099cc' : '#e0e0e0'}
          />
          
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {entry.username} {isCurrentUser && '(You)'}
            </Text>
          </View>
          
          <View style={styles.rankInfo}>
            <Text style={styles.mmrScore}>{Math.round(entry.mmr_score || entry.total_points || 0)}</Text>
            <View style={[styles.rankChip, { backgroundColor: rankColor }]}>
              <Text style={styles.rankChipText}>{entry.rank_tier}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  
  const renderAgeFilters = () => {
    const ageRanges = [
      { label: 'All Ages', value: null },
      { label: '18-30', value: { min: 18, max: 30 } },
      { label: '31-45', value: { min: 31, max: 45 } },
      { label: '46+', value: { min: 46, max: null } }
    ];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ageFiltersContainer}
      >
        {ageRanges.map((range, index) => (
          <Chip
            key={index}
            selected={JSON.stringify(ageRange) === JSON.stringify(range.value)}
            onPress={() => setAgeRange(range.value)}
            style={[
              styles.filterChip,
              JSON.stringify(ageRange) === JSON.stringify(range.value) && styles.selectedFilterChip
            ]}
            textStyle={[
              styles.filterChipText,
              JSON.stringify(ageRange) === JSON.stringify(range.value) && styles.selectedFilterChipText
            ]}
          >
            {range.label}
          </Chip>
        ))}
      </ScrollView>
    );
  };
  
  const handleFilterPress = (action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.spring();
    action();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={['#f39c12', '#e67e22']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Icon name="trophy" size={48} color="white" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Leaderboard</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
      
      <Animated.View style={[styles.contentContainer, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <Searchbar
          placeholder="Search users"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.filtersContainer}>
          <SegmentedButtons
            value={userFilter}
            onValueChange={(value) => handleFilterPress(() => setUserFilter(value))}
            buttons={[
              { value: 'all', label: 'All Users' },
              { value: 'friends', label: 'Friends' }
            ]}
            style={styles.segmentedButtons}
            theme={{
              colors: {
                onSurface: '#fff',
                onSurfaceVariant: '#ccc',
                secondaryContainer: '#0099cc',
                onSecondaryContainer: '#fff'
              }
            }}
          />
          
          {renderAgeFilters()}
        </View>
        
        <Animated.ScrollView
          style={[
            styles.scrollView,
            Platform.OS === 'web' && { 
              overflow: 'scroll',           // Explicit scroll behavior
              overflowY: 'scroll',         // Force vertical scrolling
              WebkitOverflowScrolling: 'touch',
              height: '100vh',             // CRITICAL: Match container height
              maxHeight: '100vh',          // Constrain to viewport
              scrollbarWidth: 'none',      // Hide scrollbar in Firefox
              msOverflowStyle: 'none',     // Hide scrollbar in IE/Edge
            }
          ]}
          contentContainerStyle={[
            styles.scrollContainer,
            Platform.OS === 'web' && styles.webScrollContent
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
        {/* Error Message */}
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}
        
        {/* Leaderboard List */}
        <View style={styles.leaderboardContainer}>
          {filteredLeaderboard.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title style={styles.emptyTitle}>No Results Found</Title>
                {searchQuery ? (
                  <Paragraph style={styles.emptyDescription}>No users match your search. Try a different query.</Paragraph>
                ) : (
                  <Paragraph style={styles.emptyDescription}>No users found with the current filters.</Paragraph>
                )}
              </Card.Content>
            </Card>
          ) : (
            filteredLeaderboard.map(renderLeaderboardEntry)
          )}
        </View>
        </Animated.ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' && { height: '100vh' })
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,                     // Fill available space
    backgroundColor: '#000000',   // Consistent dark theme
    scrollbarWidth: 'none',      // Hide scrollbar in Firefox
    msOverflowStyle: 'none',     // Hide scrollbar in IE/Edge
    ...(Platform.OS === 'web' && {
      // Hide scrollbar in Chrome/Safari/Webkit browsers
      WebkitScrollbar: { display: 'none' },
      '&::-webkit-scrollbar': { display: 'none' },
    }),
  },
  scrollContainer: { 
    flexGrow: 1, 
    paddingBottom: 80,
  },
  webScrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  ageFiltersContainer: {
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
  },
  selectedFilterChip: {
    backgroundColor: '#0099cc',
  },
  filterChipText: {
    color: '#fff',
    fontWeight: '500',
  },
  selectedFilterChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#331a1a',
    borderWidth: 1,
    borderColor: '#444',
  },
  errorText: {
    color: '#ff6b6b',
  },
  leaderboardContainer: {
    padding: 16,
    paddingTop: 8,
  },
  entryCard: {
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  currentUserCard: {
    backgroundColor: '#1a4c5a',
    borderWidth: 1,
    borderColor: '#0099cc',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 30,
    marginRight: 8,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ageText: {
    fontSize: 12,
    color: '#999',
  },
  rankInfo: {
    alignItems: 'center',
  },
  mmrScore: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
    textAlign: 'center',
  },
  rankChip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  rankChipText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#fff',
  },
  emptyDescription: {
    color: '#ccc',
    textAlign: 'center',
  },
});

export default LeaderboardScreen;
