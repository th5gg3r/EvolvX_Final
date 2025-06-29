import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, Animated, LayoutAnimation, UIManager } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Avatar, TextInput, Switch, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { calculateUserStats, calculateRankingPoints, getUserRank, getRankGradient, getNextRank, RANKS } from '../../utils/rankingSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ProfileScreen = ({ navigation }) => {
  const { user, api, token, logout } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    gender: '',
    height: '',
    weight: ''
  });
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    friendRequests: true,
    rankChanges: true
  });
  const [error, setError] = useState(null);
  
  // Ranking system state
  const [workouts, setWorkouts] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userStats, setUserStats] = useState(null);

  // Helper functions for database ranking integration
  const getNextRankThreshold = (currentRank) => {
    const thresholds = {
      'Bronze Fighter': 100,
      'Silver Warrior': 300, 
      'Gold Gladiator': 600,
      'Platinum Spartan': 1000,
      'Diamond Titan': 9999
    };
    return thresholds[currentRank] || 100;
  };

  const calculateProgressToNext = (currentPoints, currentRank) => {
    const nextThreshold = getNextRankThreshold(currentRank);
    const prevThreshold = {
      'Bronze Fighter': 0,
      'Silver Warrior': 100,
      'Gold Gladiator': 300, 
      'Platinum Spartan': 600,
      'Diamond Titan': 1000
    }[currentRank] || 0;
    
    if (currentRank === 'Diamond Titan') return 1.0;
    
    const progress = (currentPoints - prevThreshold) / (nextThreshold - prevThreshold);
    return Math.max(0, Math.min(1, progress));
  };
  
  // Load profile data and animations
  useEffect(() => {
    loadProfile();
    
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
  }, []);
  
  const loadProfile = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Load profile data
      const profileResponse = await api.get('/auth/profile');
      const profileData = profileResponse.data;
      
      setProfileData(profileData);
      setFormData({
        username: profileData.username || '',
        gender: profileData.gender || '',
        height: profileData.height ? profileData.height.toString() : '',
        weight: profileData.weight ? profileData.weight.toString() : ''
      });
      
      // Load workouts and ranking data from database
      try {
        const workoutsResponse = await api.get('/workouts', {
          params: { page: 1, per_page: 100 }
        });
        const workoutData = workoutsResponse.data.workouts || [];
        setWorkouts(workoutData);
        
        // Get ranking from database (same source as HomeScreen and LeaderboardScreen)
        const leaderboardResponse = await api.get('/rankings/leaderboard');
        const leaderboardData = leaderboardResponse.data.leaderboard || [];
        const currentUserEntry = leaderboardData.find(entry => entry.user_id === user.id);
        
        if (currentUserEntry) {
          // Use database values
          const dbPoints = currentUserEntry.total_points || 0;
          const dbRankTier = currentUserEntry.rank_tier || 'Bronze Fighter';
          
          // Create rank object compatible with existing UI
          const rank = {
            name: dbRankTier,
            currentPoints: dbPoints,
            pointsToNext: Math.max(0, getNextRankThreshold(dbRankTier) - dbPoints),
            progressToNext: calculateProgressToNext(dbPoints, dbRankTier)
          };
          
          setUserRank(rank);
          
          // Calculate basic stats for UI display
          const stats = calculateUserStats(workoutData, user);
          setUserStats(stats);
        } else {
          // Fallback if no database entry found
          const stats = calculateUserStats(workoutData, user);
          const points = calculateRankingPoints(stats);
          const rank = getUserRank(points);
          setUserStats(stats);
          setUserRank(rank);
        }
        
      } catch (workoutErr) {
        console.log('Workouts not available for ranking:', workoutErr);
        // Set default rank for new users
        const defaultStats = calculateUserStats([], user);
        const defaultPoints = calculateRankingPoints(defaultStats);
        const defaultRank = getUserRank(defaultPoints);
        
        setUserStats(defaultStats);
        setUserRank(defaultRank);
      }
      
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Pull down to refresh.');
      
      // Set default rank even on error
      const defaultStats = calculateUserStats([], user);
      const defaultPoints = calculateRankingPoints(defaultStats);
      const defaultRank = getUserRank(defaultPoints);
      
      setUserStats(defaultStats);
      setUserRank(defaultRank);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };
  
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      const updatedData = {
        username: formData.username,
        gender: formData.gender,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };
      
      await api.put('/auth/profile', updatedData);
      setEditMode(false);
      await loadProfile();
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to logout. Please try again.');
    }
  };
  
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  };
  
  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };
  
  const handleActionPress = (action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.spring();
    action();
  };

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modern Header */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <Avatar.Text 
                size={80} 
                label={getInitials(user?.username || profileData?.username)} 
                backgroundColor="rgba(255,255,255,0.2)"
                color="#fff"
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>
                  {profileData?.username || user?.username || 'Loading...'}
                </Text>
                <Text style={styles.headerEmail}>
                  {profileData?.email || user?.email || 'Loading...'}
                </Text>
                {userRank && (
                  <View style={styles.rankBadge}>
                    <Icon name={userRank.icon} size={16} color={userRank.color} />
                    <Text style={[styles.rankText, { color: userRank.color }]}>
                      {userRank.name} • {userRank.title}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Ranking Card */}
        {userRank && (
          <Animated.View style={[styles.rankingContainer, { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }]}>
            <TouchableOpacity 
              style={styles.rankingCard}
              onPress={() => handleActionPress(() => console.log('View ranking details'))}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={getRankGradient(userRank)}
                style={styles.rankingGradient}
              >
                <View style={styles.rankingHeader}>
                  <View style={styles.rankingInfo}>
                    <View style={[styles.spartanShield, { borderColor: userRank.color || '#CD7F32', shadowColor: userRank.color || '#CD7F32' }]}>
                      <LinearGradient
                        colors={[userRank.color || '#CD7F32', `${userRank.color || '#CD7F32'}BB`]}
                        style={styles.spartanShieldGradient}
                      >
                        <View style={styles.spartanShieldInner}>
                          <Text style={styles.spartanRankSymbol}>I</Text>
                        </View>
                        <View style={[styles.spartanAccent1, { borderColor: '#000' }]} />
                        <View style={[styles.spartanAccent2, { borderColor: '#000' }]} />
                      </LinearGradient>
                    </View>
                    <View style={styles.rankingDetails}>
                      <Text style={styles.rankingTitle}>{userRank.name} Rank</Text>
                      <Text style={styles.rankingSubtitle}>{userRank.description}</Text>
                    </View>
                  </View>
                  <View style={styles.rankingPoints}>
                    <Text style={styles.pointsValue}>{userRank.currentPoints}</Text>
                    <Text style={styles.pointsLabel}>Points</Text>
                  </View>
                </View>
                
                {userRank.pointsToNext > 0 && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressText}>
                        {userRank.pointsToNext} points to {getNextRank(userRank.currentPoints)?.name || 'Max Rank'}
                      </Text>
                      <Text style={styles.progressPercentage}>
                        {Math.round(userRank.progressToNext)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${userRank.progressToNext}%` }
                        ]} 
                      />
                    </View>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}


        {/* Error Message */}
        {error && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Card style={styles.errorCard}>
              <Card.Content>
                <Text style={styles.errorText}>{error}</Text>
              </Card.Content>
            </Card>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View style={[styles.actionsContainer, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => handleActionPress(() => setEditMode(!editMode))}
            activeOpacity={0.8}
          >
            <Icon name="pencil" size={32} color="#0099cc" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => handleActionPress(handleLogout)}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={32} color="#e74c3c" />
            <Text style={styles.actionText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Profile Details */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Profile Details</Title>
              <Button 
                mode="text" 
                onPress={() => setEditMode(!editMode)}
              >
                {editMode ? 'Cancel' : 'Edit'}
              </Button>
            </View>
            
            {editMode ? (
              // Edit Mode
              <View style={styles.editForm}>
                <TextInput
                  label="Username"
                  value={formData.username}
                  onChangeText={(text) => setFormData({...formData, username: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="Gender"
                  value={formData.gender}
                  onChangeText={(text) => setFormData({...formData, gender: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <View style={styles.row}>
                  <TextInput
                    label="Height (cm)"
                    value={formData.height}
                    onChangeText={(text) => setFormData({...formData, height: text})}
                    mode="outlined"
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                  
                  <TextInput
                    label="Weight (kg)"
                    value={formData.weight}
                    onChangeText={(text) => setFormData({...formData, weight: text})}
                    mode="outlined"
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                </View>
                
                <Button 
                  mode="contained" 
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  loading={loading}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </View>
            ) : (
              // View Mode
              <View style={styles.profileDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>
                    {calculateAge(profileData?.date_of_birth) || 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.gender || 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Height</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.height ? `${profileData.height} cm` : 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.weight ? `${profileData.weight} kg` : 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Member Since</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.created_at 
                      ? new Date(profileData.created_at).toLocaleDateString() 
                      : 'Unknown'}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Notification Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Notification Settings</Title>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Workout Reminders</Text>
                <Text style={styles.settingDescription}>
                  Receive reminders for scheduled workouts
                </Text>
              </View>
              <Switch
                value={notifications.workoutReminders}
                onValueChange={(value) => 
                  setNotifications({...notifications, workoutReminders: value})
                }
                color="#0099cc"
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Friend Requests</Text>
                <Text style={styles.settingDescription}>
                  Notifications for new friend requests
                </Text>
              </View>
              <Switch
                value={notifications.friendRequests}
                onValueChange={(value) => 
                  setNotifications({...notifications, friendRequests: value})
                }
                color="#0099cc"
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Rank Changes</Text>
                <Text style={styles.settingDescription}>
                  Get notified when your rank changes
                </Text>
              </View>
              <Switch
                value={notifications.rankChanges}
                onValueChange={(value) => 
                  setNotifications({...notifications, rankChanges: value})
                }
                color="#0099cc"
              />
            </View>
          </Card.Content>
        </Card>
        
        {/* Account Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Account</Title>
            
            <Button 
              mode="outlined" 
              style={styles.accountButton}
              icon="lock-reset"
              textColor="#fff"
              onPress={() => {/* Change password */}}
            >
              Change Password
            </Button>
            
            <Button 
              mode="outlined" 
              style={styles.accountButton}
              icon="export"
              textColor="#fff"
              onPress={() => {/* Export data */}}
            >
              Export Workout Data
            </Button>
            
            <Button 
              mode="outlined" 
              style={[styles.accountButton, styles.logoutButton]}
              icon="logout"
              textColor="#fff"
              onPress={handleLogout}
            >
              Logout
            </Button>
          </Card.Content>
        </Card>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>EvolvX v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 EvolvX Team</Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' && { height: '100vh' })
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
    paddingBottom: 100,
    ...(Platform.OS === 'web' && { minHeight: '100vh' })
  },
  webScrollContent: {
    minHeight: '100%',
    flexGrow: 1,
    paddingBottom: 100,
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
  headerInfo: {
    marginLeft: 20,
    flex: 1,
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerEmail: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
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
  errorCard: {
    margin: 16,
    backgroundColor: '#331a1a',
    borderWidth: 1,
    borderColor: '#444',
  },
  errorText: {
    color: '#ff6b6b',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  avatarButton: {
    marginTop: 8,
    backgroundColor: '#0099cc',
  },
  card: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    color: '#fff',
  },
  profileDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#999',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  editForm: {
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#0099cc',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingDescription: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  divider: {
    backgroundColor: '#333',
  },
  accountButton: {
    marginBottom: 12,
    borderColor: '#0099cc',
    backgroundColor: '#0099cc',
  },
  logoutButton: {
    borderColor: '#0099cc',
    backgroundColor: '#0099cc',
  },
  appInfo: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  appVersion: {
    fontSize: 14,
    color: '#999',
  },
  appCopyright: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Ranking styles
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#fff',
  },
  rankingContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  rankingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  rankingGradient: {
    padding: 20,
  },
  rankingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankingDetails: {
    marginLeft: 16,
    flex: 1,
  },
  rankingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  rankingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  rankingPoints: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  progressSection: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  
  // Spartan Shield Styles (matching HomeScreen)
  spartanShield: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#CD7F32',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#CD7F32',
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
});

export default ProfileScreen;
