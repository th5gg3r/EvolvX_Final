// screens/main/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Text, Card, Title, Paragraph, Button, ProgressBar, Chip, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user, token, api, logout } = useAuth();

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts]     = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error,    setError]        = useState(null);

  /* first load */
  useEffect(() => {
    if (token && user?.id) loadData();
  }, [token, user?.id]);   

  const onRefresh = () => { setRefreshing(true); loadData(); };


  const loadData = useCallback(async () => {
    try {
      setError(null); setLoading(true);

      /* recent workouts */
      try {
        const { data: wData } = await api.get('/workouts', { params: { page:1, per_page:5 } });
        const recent = wData.workouts || [];
        setWorkouts(recent);
      } catch (workoutErr) {
        console.log('Workouts endpoint not available:', workoutErr.response?.status);
        setWorkouts([]); // Set empty array as fallback
      }

      /* leaderboard */
      try {
        const { data: lData } = await api.get('/rankings/leaderboard');
        let leaderboardData = Array.isArray(lData.leaderboard) ? lData.leaderboard : [];
        
        // Debug: Log what we're getting from the API
        console.log('HomePage - Leaderboard API Response:', lData);
        console.log('HomePage - First leaderboard entry:', leaderboardData?.[0]);
        
        setLeaderboard(leaderboardData);
      } catch (leaderboardErr) {
        console.log('Leaderboard endpoint not available:', leaderboardErr.response?.status);
        setLeaderboard([]); // Set empty array as fallback
      }
    } catch (err) {
      console.error('HomeScreen load error:', err);
      setError('Failed to load data. Pull down to refresh.');
      if (err.response?.status === 401) {
        await logout();
        navigation.replace('Login');
      }
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [api, token, user?.id, logout, navigation]); 

  /* ───────── helpers ───────── */

  const rankColor = (t) => {
    const colors = {
      'Gold Gladiator': '#FFD700',
      'Silver Warrior': '#C0C0C0', 
      'Bronze Fighter': '#CD7F32',
      'Platinum Spartan': '#E5E4E2',
      'Diamond Titan': '#B9F2FF',
      // Fallback for old/different rank names
      'Gold': '#FFD700',
      'Silver': '#C0C0C0',
      'Bronze': '#CD7F32',
      'Platinum': '#E5E4E2',
      'Diamond': '#B9F2FF'
    };
    return colors[t] || '#CD7F32'; // Default to bronze if not found
  };

  if (loading && !refreshing) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0099cc" />
      <Text style={styles.loadingText}>Loading your fitness data…</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && { 
            overflow: 'scroll',           // Explicit scroll behavior
            overflowY: 'scroll',         // Force vertical scrolling
            WebkitOverflowScrolling: 'touch',
            height: '100vh',             // CRITICAL: Match container height
            maxHeight: '100vh',          // Constrain to viewport
            minHeight: '100vh',          // Ensure minimum viewport height
            scrollbarWidth: 'none',      // Hide scrollbar in Firefox
            msOverflowStyle: 'none',     // Hide scrollbar in IE/Edge
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
      >
        {/* welcome */}
        <View style={styles.welcomeSection}>
          <View style={styles.logoSection}>
            <Image 
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoSubtitle}>
              {user?.username ? `Welcome back, ${user.username}!` : 'Welcome!'}
            </Text>
            <Text style={styles.motivationText}>Ready to evolve today? 💪</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <SpartanRankStat rank="Bronze Fighter" level={1} color="#CD7F32"/>
            </View>
            <View style={styles.statCard}>
              <Stat icon="dumbbell" label="Total Workouts" value={workouts.length} color="#4ecdc4"/>
            </View>
          </View>
        </View>

        {/* quick actions */}
        <View style={styles.actionsContainer}>
          <ActionCard
            icon="plus-circle"
            title="Start Workout"
            subtitle="Create a new session"
            color="#0099cc"
            onPress={() => navigation.navigate('CreateWorkout')}
          />
          <ActionCard
            icon="view-list"
            title="All Workouts"
            subtitle="Browse your history"
            color="#4ecdc4"
            onPress={() => navigation.navigate('Workouts')}
          />
          <ActionCard
            icon="account-group"
            title="Social"
            subtitle="Connect with friends"
            color="#9b59b6"
            onPress={() => navigation.navigate('Social')}
          />
          <ActionCard
            icon="trophy"
            title="Leaderboard"
            subtitle="See top performers"
            color="#f39c12"
            onPress={() => navigation.navigate('Leaderboard')}
          />
          <ActionCard
            icon="account-circle"
            title="My Profile"
            subtitle="View your stats"
            color="#e74c3c"
            onPress={() => navigation.navigate('Profile')}
          />
          <ActionCard
            icon="sword"
            title="Avatar"
            subtitle="Evolution Status"
            color="#ff6b35"
            onPress={() => navigation.navigate('Avatar')}
          />
        </View>

        {/* error */}
        {error&&(<Card style={styles.errorCard}><Card.Content><Text style={styles.errorText}>{error}</Text></Card.Content></Card>)}

        {/* leaderboard */}
        <Card style={styles.modernCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Leaderboard</Title>
              <View style={styles.cardIconContainer}>
                <LinearGradient
                  colors={['#0099cc', '#4ECDC4']}
                  style={styles.cardIconGradient}
                >
                  <Icon name="trophy" size={24} color="#fff" />
                </LinearGradient>
              </View>
            </View>
            {leaderboard.length === 0 ? (
              <EmptyState
                icon="trophy-outline"
                title="Loading Rankings..."
                description="Check out how you rank against other users!"
                actionText="View Full Leaderboard"
                onAction={() => navigation.navigate('Leaderboard')}
              />
            ) : (
              leaderboard.slice(0, 5).map((entry, index) => (
                <TouchableOpacity 
                  key={entry.user_id} 
                  style={[
                    styles.leaderboardItem,
                    entry.user_id === user.id && styles.currentUserItem
                  ]}
                  onPress={() => navigation.navigate('Leaderboard')}
                >
                  <View style={styles.leaderboardRank}>
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.leaderboardUser}>
                    <Text style={styles.usernameText}>
                      {entry.username} {entry.user_id === user.id && '(You)'}
                    </Text>
                    <Text style={styles.mmrText}>{Math.round(entry.total_points || 0)} MMR</Text>
                  </View>
                  <View style={[styles.rankChip, {backgroundColor: rankColor(entry.rank_tier)}]}>
                    <Text style={styles.rankChipText}>{entry.rank_tier}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            {leaderboard.length > 0 && (
              <Button 
                mode="contained" 
                style={styles.viewAllButton} 
                onPress={() => navigation.navigate('Leaderboard')}
                contentStyle={styles.viewAllButtonContent}
              >
                View Full Leaderboard
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* recent workouts */}
        <Card style={styles.modernCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Recent Workouts</Title>
              <View style={styles.cardIconContainer}>
                <LinearGradient
                  colors={['#0099cc', '#4ECDC4']}
                  style={styles.cardIconGradient}
                >
                  <Icon name="history" size={24} color="#fff" />
                </LinearGradient>
              </View>
            </View>
            {workouts.length === 0 ? (
              <EmptyState
                icon="dumbbell"
                title="No Workouts Yet"
                description="Start your fitness journey today! Track your exercises and see amazing progress over time."
                actionText="Create First Workout"
                onAction={() => navigation.navigate('CreateWorkout')}
              />
            ) : (
              workouts.slice(0,3).map((w,i)=>(
                <View key={i} style={styles.workoutCard}>
                  <View style={styles.workoutMain}>
                    <View style={styles.workoutHeader}>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutName}>{w.workout_name}</Text>
                        <Text style={styles.workoutDate}>
                          {new Date(w.workout_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.workoutBadge}>
                        <Text style={styles.workoutBadgeText}>{w.exercises?.length || 0}</Text>
                        <Text style={styles.workoutBadgeLabel}>exercises</Text>
                      </View>
                    </View>
                    {w.duration && (
                      <View style={styles.workoutStats}>
                        <View style={styles.statItem}>
                          <Icon name="clock-outline" size={16} color="#666" />
                          <Text style={styles.statText}>{w.duration} min</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.shareButton}
                    onPress={() => navigation.navigate('SharedWorkout', { workoutId: w.workout_id })}
                  >
                    <Icon name="share-variant" size={20} color="#0099cc" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            {workouts.length > 0 && (
              <Button 
                mode="contained" 
                style={styles.viewAllButton} 
                onPress={() => navigation.navigate('Workouts')}
                contentStyle={styles.viewAllButtonContent}
              >
                View All Workouts
              </Button>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

    </SafeAreaView>
  );
}

/* dark theme stat card with gradient */
const Stat = ({ icon, value, label, color = "#4ECDC4" }) => (
  <View style={styles.statContent}>
    <View style={styles.statIconContainer}>
      <LinearGradient
        colors={['#0099cc', '#4ECDC4']}
        style={styles.statIconGradient}
      >
        <Icon name={icon} size={24} color="#fff" />
      </LinearGradient>
    </View>
    <Text style={[styles.statValue, { color: '#4ECDC4' }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* Liftoff-style rank display with original rank colors */
const SpartanRankStat = ({ rank, level, color }) => (
  <View style={styles.statContent}>
    {/* Metallic Shield with rank color */}
    <View style={[styles.spartanShield, { borderColor: color, shadowColor: color }]}>
      <LinearGradient
        colors={[color, `${color}BB`]}
        style={styles.spartanShieldGradient}
      >
        {/* Inner shield with rank symbol */}
        <View style={styles.spartanShieldInner}>
          <Text style={styles.spartanRankSymbol}>
            {level === 1 ? 'I' : level === 2 ? 'II' : level === 3 ? 'III' : level === 4 ? 'IV' : 'V'}
          </Text>
        </View>
        {/* Shield decorative lines */}
        <View style={[styles.spartanAccent1, { borderColor: '#000' }]} />
        <View style={[styles.spartanAccent2, { borderColor: '#000' }]} />
      </LinearGradient>
    </View>
    
    {/* Rank text with original rank theme */}
    <Text style={[styles.spartanRankText, { color }]}>{rank.toUpperCase()}</Text>
    <Text style={styles.spartanRankLabel}>WARRIOR</Text>
  </View>
);

/* action card component */
const ActionCard = ({ icon, title, subtitle, color, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={[styles.actionIconContainer, { backgroundColor: `${color}20` }]}>
      <Icon name={icon} size={32} color={color} />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
    <Text style={styles.actionSubtitle}>{subtitle}</Text>
  </TouchableOpacity>
);

/* empty state component with blue gradient */
const EmptyState = ({ icon, title, description, actionText, onAction }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyStateIconContainer}>
      <LinearGradient
        colors={['#0099cc', '#4ECDC4']}
        style={styles.emptyStateIconGradient}
      >
        <Icon name={icon} size={40} color="#fff" />
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

/* modern styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Back to black
    ...(Platform.OS === 'web' && { 
      height: '100vh',
    })
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
    paddingBottom: 80, // Extra space to scroll past last element
    ...(Platform.OS === 'web' && { minHeight: '100vh' })
  },
  webScrollContent: {
    minHeight: '100%',
    flexGrow: 1,
    paddingBottom: 80, // Extra space to scroll past last element
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  // Welcome Section
  welcomeSection: {
    padding: 24,
    marginBottom: 8,
    backgroundColor: '#000000',
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeGreeting: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  motivationText: {
    fontSize: 16,
    color: '#0099cc',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoImage: {
    width: 234,
    height: 234,
    marginBottom: 16,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  statContent: {
    alignItems: 'center',
    width: '100%',
  },
  statIconContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      maxWidth: '100%',
      overflow: 'hidden'
    })
  },
  actionCard: {
    width: '30%',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

  // Cards - Dark Theme
  modernCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardIconContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cardIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Leaderboard
  leaderboardItem: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserItem: {
    backgroundColor: '#1a4c5a',
    borderColor: '#0099cc',
  },
  leaderboardRank: {
    width: 30,
    marginRight: 12,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  leaderboardUser: {
    flex: 1,
    marginRight: 12,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mmrText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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

  // Workouts
  workoutCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  workoutMain: {
    flex: 1,
    padding: 16,
  },
  shareButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 153, 204, 0.1)',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
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
  workoutStats: {
    flexDirection: 'row',
    gap: 16,
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
  viewAllButton: {
    marginTop: 16,
    backgroundColor: '#0099cc',
    borderRadius: 8,
  },
  viewAllButtonContent: {
    paddingVertical: 4,
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateIcon: {
    backgroundColor: '#f0f9ff',
    marginBottom: 16,
  },
  emptyStateIconContainer: {
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  emptyStateIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptyStateButton: {
    backgroundColor: '#0099cc',
    borderRadius: 8,
    paddingHorizontal: 24,
  },

  // Error & FAB
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
    borderRadius: 12,
  },
  errorText: {
    color: '#c62828',
  },

  // Dark Theme Stat Cards
  darkStatCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  darkStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  darkStatLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Spartan Rank Styles (Dark Theme)
  spartanShield: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  spartanShieldGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  spartanShieldInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  spartanRankSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    color: '#000',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  spartanAccent1: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    height: 1,
    borderTopWidth: 1,
    opacity: 0.7,
  },
  spartanAccent2: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    height: 1,
    borderBottomWidth: 1,
    opacity: 0.7,
  },
  spartanRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  spartanRankLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 2,
  },
});
