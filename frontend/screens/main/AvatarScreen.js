import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, Animated, LayoutAnimation, UIManager, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, Card, Title, Paragraph, Button, Avatar, ProgressBar, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { calculateUserStats, calculateRankingPoints, getUserRank, getRankGradient, getNextRank, RANKS, getRankColor } from '../../utils/rankingSystem';

const { width } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AvatarScreen = ({ navigation }) => {
  const { user, api, token } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const battleStatsAnim = useRef(new Animated.Value(0)).current;
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  const getRankSymbol = (rankName) => {
    // Map database rank names to symbols
    const symbols = {
      'Bronze Fighter': 'I',
      'Silver Warrior': 'II', 
      'Gold Gladiator': 'III',
      'Platinum Spartan': 'IV',
      'Diamond Titan': 'V',
      // Also support short rank names from ranking system
      'Bronze': 'I',
      'Silver': 'II',
      'Gold': 'III', 
      'Platinum': 'IV',
      'Diamond': 'V'
    };
    return symbols[rankName] || 'I';
  };

  // Get rank icon from ranking system  
  const getRankIcon = (rankName) => {
    // Map database rank names to ranking system names
    const rankMapping = {
      'Bronze Fighter': 'BRONZE',
      'Silver Warrior': 'SILVER',
      'Gold Gladiator': 'GOLD',
      'Platinum Spartan': 'PLATINUM', 
      'Diamond Titan': 'DIAMOND',
      // Also support short names
      'Bronze': 'BRONZE',
      'Silver': 'SILVER',
      'Gold': 'GOLD',
      'Platinum': 'PLATINUM',
      'Diamond': 'DIAMOND'
    };
    
    const mappedRank = rankMapping[rankName] || 'BRONZE';
    return RANKS[mappedRank]?.icon || 'medal';
  };

  // Get rank color from ranking system
  const getRankColorFromSystem = (rankName) => {
    // Map database rank names to ranking system names
    const rankMapping = {
      'Bronze Fighter': 'BRONZE',
      'Silver Warrior': 'SILVER',
      'Gold Gladiator': 'GOLD',
      'Platinum Spartan': 'PLATINUM', 
      'Diamond Titan': 'DIAMOND',
      // Also support short names
      'Bronze': 'BRONZE',
      'Silver': 'SILVER',
      'Gold': 'GOLD',
      'Platinum': 'PLATINUM',
      'Diamond': 'DIAMOND'
    };
    
    const mappedRank = rankMapping[rankName] || 'BRONZE';
    return RANKS[mappedRank]?.color || '#CD7F32';
  };
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Character data state
  const [workouts, setWorkouts] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [battleStats, setBattleStats] = useState({
    totalTraining: 0,
    strongestMuscle: 'Getting Started',
    goalsAchieved: 0,
    progressRate: 0,
    achievements: []
  });
  
  // Load character data and animations on first mount
  useEffect(() => {
    // Smooth entrance animation
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Delayed battle stats animation
      Animated.timing(battleStatsAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Refresh data when screen comes into focus (after creating workouts, etc.)
  useFocusEffect(
    React.useCallback(() => {
      loadCharacterData();
    }, [])
  );
  
  const loadCharacterData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Load workouts for character calculations
      try {
        const workoutsResponse = await api.get('/workouts', {
          params: { page: 1, per_page: 100 }
        });
        const workoutData = workoutsResponse.data.workouts || [];
        setWorkouts(workoutData);
        
        // Get ranking from database (same source as other screens)
        const leaderboardResponse = await api.get('/rankings/leaderboard');
        const leaderboardData = leaderboardResponse.data.leaderboard || [];
        const currentUserEntry = leaderboardData.find(entry => entry.user_id === user.id);
        
        let finalRank = null;
        
        if (currentUserEntry) {
          // Use database values (same as HomeScreen and other screens)
          const dbPoints = currentUserEntry.mmr_score || currentUserEntry.total_points || 0;
          const dbRankTier = currentUserEntry.rank_tier || 'Bronze Fighter';
          
          console.log('AvatarScreen - Database MMR values:', { 
            dbPoints, 
            dbRankTier, 
            entry: currentUserEntry,
            mmr_score: currentUserEntry.mmr_score 
          });
          
          // Create rank object compatible with existing UI
          finalRank = {
            name: dbRankTier,
            currentPoints: dbPoints,
            pointsToNext: Math.max(0, getNextRankThreshold(dbRankTier) - dbPoints),
            progressToNext: calculateProgressToNext(dbPoints, dbRankTier),
            color: getRankColorFromSystem(dbRankTier),
            symbol: getRankSymbol(dbRankTier),
            icon: getRankIcon(dbRankTier)
          };
          
          setUserRank(finalRank);
          console.log('AvatarScreen - Final rank object:', finalRank);
        } else {
          console.log('AvatarScreen - No database entry, using fallback calculation');
          // Fallback if no database entry found
          const stats = calculateUserStats(workoutData, user);
          const points = calculateRankingPoints(stats);
          finalRank = getUserRank(points);
          setUserRank(finalRank);
        }
        
        // Calculate basic stats for UI display
        const stats = calculateUserStats(workoutData, user);
        setUserStats(stats);
        
        // Calculate battle stats
        const battleStatsData = calculateBattleStats(workoutData, user, finalRank);
        setBattleStats(battleStatsData);
        
        // Force component update
        setLastUpdate(Date.now());
        
      } catch (workoutErr) {
        console.log('Workouts not available for character:', workoutErr);
        // Set default values for new characters
        const defaultStats = calculateUserStats([], user);
        const defaultPoints = calculateRankingPoints(defaultStats);
        const defaultRank = getUserRank(defaultPoints);
        
        setUserStats(defaultStats);
        setUserRank(defaultRank);
        
        const defaultBattleStats = calculateBattleStats([], user, defaultRank);
        setBattleStats(defaultBattleStats);
      }
      
    } catch (err) {
      console.error('Error loading character data:', err);
      setError('Failed to load character. Pull down to refresh.');
      
      // Set default values even on error
      const defaultStats = calculateUserStats([], user);
      const defaultPoints = calculateRankingPoints(defaultStats);
      const defaultRank = getUserRank(defaultPoints);
      
      setUserStats(defaultStats);
      setUserRank(defaultRank);
      
      const defaultBattleStats = calculateBattleStats([], user, defaultRank);
      setBattleStats(defaultBattleStats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadCharacterData();
  };

  // Calculate meaningful fitness stats from workout data
  const calculateBattleStats = (workoutData, userData, rankData) => {
    if (!workoutData || workoutData.length === 0) {
      return {
        totalTraining: 0,
        strongestMuscle: 'Getting Started',
        goalsAchieved: 0,
        progressRate: 0,
        achievements: ['Beginner']
      };
    }

    const totalWorkouts = workoutData.length;
    
    // Calculate muscle group strength (based on frequency and intensity)
    const muscleGroupStats = {};
    const categoryCount = {};
    let totalSets = 0;
    let totalReps = 0;

    workoutData.forEach(workout => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach(exercise => {
          const category = exercise.category || exercise.muscle_group || 'General';
          categoryCount[category] = (categoryCount[category] || 0) + 1;
          
          // Count sets and reps for strength calculation
          // Handle different data formats (sets could be array or number)
          if (exercise.sets) {
            if (Array.isArray(exercise.sets)) {
              exercise.sets.forEach(set => {
                totalSets++;
                totalReps += set.reps || 0;
                
                // Add to muscle group strength score
                if (!muscleGroupStats[category]) {
                  muscleGroupStats[category] = { sets: 0, weight: 0, frequency: 0 };
                }
                muscleGroupStats[category].sets++;
                muscleGroupStats[category].weight += set.weight || 0;
                muscleGroupStats[category].frequency++;
              });
            } else {
              // If sets is just a number, use it directly
              const setsCount = typeof exercise.sets === 'number' ? exercise.sets : parseInt(exercise.sets) || 1;
              totalSets += setsCount;
              totalReps += (exercise.reps || 10) * setsCount;
              
              if (!muscleGroupStats[category]) {
                muscleGroupStats[category] = { sets: 0, weight: 0, frequency: 0 };
              }
              muscleGroupStats[category].sets += setsCount;
              muscleGroupStats[category].weight += (exercise.weight || 0) * setsCount;
              muscleGroupStats[category].frequency += setsCount;
            }
          }
        });
      }
    });

    // Find strongest muscle group (highest combined score)
    let strongestMuscle = 'Getting Started';
    let highestScore = 0;
    
    Object.keys(muscleGroupStats).forEach(muscle => {
      const stats = muscleGroupStats[muscle];
      // Score = frequency × sets × average weight
      const avgWeight = stats.weight / stats.sets || 1;
      const score = stats.frequency * stats.sets * Math.log(avgWeight + 1);
      
      if (score > highestScore) {
        highestScore = score;
        strongestMuscle = muscle;
      }
    });

    // Calculate goals achieved (milestones)
    let goalsAchieved = 0;
    if (totalWorkouts >= 5) goalsAchieved++;    // First week
    if (totalWorkouts >= 15) goalsAchieved++;   // First month
    if (totalWorkouts >= 50) goalsAchieved++;   // Consistency 
    if (totalSets >= 100) goalsAchieved++;      // Volume milestone
    if (Object.keys(muscleGroupStats).length >= 4) goalsAchieved++; // Full body

    // Calculate progress rate (improvement over time)
    let progressRate = 0;
    if (totalWorkouts >= 3) {
      // Calculate trend in recent workouts vs older ones
      const recentWorkouts = workoutData.slice(-Math.floor(totalWorkouts / 3));
      const olderWorkouts = workoutData.slice(0, Math.floor(totalWorkouts / 3));
      
      const recentAvgSets = recentWorkouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0) / recentWorkouts.length;
      const olderAvgSets = olderWorkouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0) / olderWorkouts.length;
      
      progressRate = Math.min(100, Math.max(0, Math.round(((recentAvgSets / olderAvgSets) - 1) * 100 + 75)));
    } else {
      progressRate = Math.min(100, totalWorkouts * 25); // Early progress boost
    }

    // Calculate achievements
    const achievements = [];
    if (totalWorkouts >= 1) achievements.push('First Workout');
    if (totalWorkouts >= 10) achievements.push('Consistent');
    if (totalWorkouts >= 25) achievements.push('Dedicated');
    if (totalWorkouts >= 50) achievements.push('Elite');
    if (totalSets >= 100) achievements.push('Volume King');
    if (Object.keys(muscleGroupStats).length >= 5) achievements.push('Full Body');

    return {
      totalTraining: totalWorkouts,
      strongestMuscle: strongestMuscle === 'Getting Started' ? 'Getting Started' : strongestMuscle,
      goalsAchieved,
      progressRate,
      achievements: achievements.length > 0 ? achievements : ['Beginner']
    };
  };

  const handleRankPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    LayoutAnimation.spring();
    // Could navigate to detailed rank progression screen
  };

  const handleBattleStatPress = (statName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Could show detailed stat breakdown
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  const getWeaponIcon = (weapon) => {
    const icons = {
      'Chest': 'arm-flex',
      'Back': 'human-handsdown', 
      'Legs': 'run-fast',
      'Shoulders': 'human-male',
      'Arms': 'arm-flex-outline',
      'Core': 'meditation',
      'Ready for Battle': 'sword'
    };
    return icons[weapon] || 'dumbbell';
  };
  
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0099cc" />
          <Text style={styles.loadingText}>Loading your character...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  
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
            height: '100vh', 
            overflow: 'scroll',
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch',
            maxHeight: '100vh',
            overflowX: 'hidden'
          }
        ]}
        contentContainerStyle={[
          styles.scrollContainer,
          Platform.OS === 'web' && { 
            minHeight: '100vh',
            flexGrow: 1,
            paddingBottom: 120
          }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {/* Character Header */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
            style={styles.characterHeader}
          >
            <View style={styles.avatarContainer}>
              <Avatar.Text 
                size={120} 
                label={getInitials(user?.username)} 
                backgroundColor="rgba(255,255,255,0.2)"
                color="#fff"
                style={styles.characterAvatar}
              />
              <View style={styles.characterInfo}>
                <Text style={styles.characterName}>
                  {user?.username || 'Warrior'}
                </Text>
                {userRank && (
                  <Chip 
                    icon={userRank.icon} 
                    style={[styles.rankChip, { backgroundColor: userRank.color }]}
                    textStyle={{ color: '#fff', fontWeight: 'bold' }}
                  >
                    {userRank.name} Rank
                  </Chip>
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Interactive Rank Display */}
        {userRank && (
          <Animated.View 
            key={`rank-${userRank.currentPoints}-${lastUpdate}`}
            style={[styles.rankContainer, { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}
          >
            <TouchableOpacity 
              style={styles.rankCard}
              onPress={handleRankPress}
              activeOpacity={0.8}
            >
              <View style={styles.rankGradient}>
                <View style={styles.rankHeader}>
                  <View style={styles.rankIconContainer}>
                    {/* Large Interactive Spartan Shield - Dynamic based on actual rank */}
                    <View style={[styles.largeSpartanShield, { borderColor: userRank.color, shadowColor: userRank.color }]}>
                      <LinearGradient
                        colors={[userRank.color, `${userRank.color}BB`]}
                        style={styles.largeSpartanShieldGradient}
                      >
                        <View style={styles.largeSpartanShieldInner}>
                          <Text style={styles.largeSpartanRankSymbol}>{userRank.symbol}</Text>
                        </View>
                        <View style={[styles.largeSpartanAccent1, { borderColor: '#000' }]} />
                        <View style={[styles.largeSpartanAccent2, { borderColor: '#000' }]} />
                      </LinearGradient>
                    </View>
                  </View>
                  
                  <View style={styles.rankDetails}>
                    <Text style={[styles.rankTitle, { color: userRank.color }]}>{userRank.name.toUpperCase()}</Text>
                  </View>
                  
                  <View style={styles.rankPointsContainer}>
                    <Text style={styles.pointsValueLarge}>
                      {userRank?.currentPoints || 0}
                    </Text>
                    <Text style={styles.pointsLabelLarge}>Battle Points</Text>
                  </View>
                </View>
                
                {userRank && userRank.pointsToNext > 0 && (
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
                      <Animated.View 
                        style={[
                          styles.progressFill, 
                          { width: `${userRank?.progressToNext || 0}%` }
                        ]} 
                      />
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Battle Stats Dashboard */}
        <Animated.View style={[styles.battleStatsContainer, { opacity: battleStatsAnim }]}>
          <Card style={styles.battleStatsCard}>
            <Card.Content>
              <View style={styles.battleStatsHeader}>
                <Title style={styles.battleStatsTitle}>📊 FITNESS STATS 📊</Title>
              </View>
              
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={() => handleBattleStatPress('totalTraining')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8B2635', '#A13333']}
                    style={styles.statGradient}
                  >
                    <Icon name="counter" size={32} color="#fff" />
                    <Text style={styles.statValue}>{battleStats.totalTraining}</Text>
                    <Text style={styles.statLabel}>Total Training</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={() => handleBattleStatPress('strongestMuscle')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#2E8B8B', '#3D5A5A']}
                    style={styles.statGradient}
                  >
                    <Icon name="arm-flex" size={32} color="#fff" />
                    <Text style={styles.statValueSmall}>{battleStats.strongestMuscle}</Text>
                    <Text style={styles.statLabel}>Strongest Muscle</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={() => handleBattleStatPress('goalsAchieved')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#5D8A66', '#4A6B4A']}
                    style={styles.statGradient}
                  >
                    <Icon name="target" size={32} color="#fff" />
                    <Text style={styles.statValue}>{battleStats.goalsAchieved}</Text>
                    <Text style={styles.statLabel}>Goals Achieved</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={() => handleBattleStatPress('progressRate')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#B8860B', '#8B4513']}
                    style={styles.statGradient}
                  >
                    <Icon name="trending-up" size={32} color="#fff" />
                    <Text style={styles.statValue}>{battleStats.progressRate}%</Text>
                    <Text style={styles.statLabel}>Progress Rate</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </Card.Content>
          </Card>
        </Animated.View>

        {/* Achievements Section */}
        <Animated.View style={[styles.achievementsContainer, { opacity: battleStatsAnim }]}>
          <Card style={styles.achievementsCard}>
            <Card.Content>
              <View style={styles.achievementsHeader}>
                <Icon name="medal" size={24} color="#FFD700" />
                <Title style={styles.achievementsTitle}>Achievements</Title>
              </View>
              
              <View style={styles.achievementsList}>
                {battleStats.achievements.map((achievement, index) => (
                  <Chip 
                    key={index}
                    icon="trophy-award"
                    style={styles.achievementChip}
                    textStyle={styles.achievementText}
                  >
                    {achievement}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateWorkout')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1B4D72', '#2E6B8E']}
              style={styles.actionGradient}
            >
              <Icon name="sword" size={24} color="#fff" />
              <Text style={styles.actionText}>Start Evolving</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8B2635', '#A13333']}
              style={styles.actionGradient}
            >
              <Icon name="crown" size={24} color="#fff" />
              <Text style={styles.actionText}>View Rankings</Text>
            </LinearGradient>
          </TouchableOpacity>
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
      // Hide scrollbar in Chrome/Safari/Webkit browsers - simplified
      overflow: 'scroll',
      overflowY: 'scroll',
      WebkitOverflowScrolling: 'touch',
    }),
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 80,
    ...(Platform.OS === 'web' && { minHeight: '100vh' })
  },
  webScrollContent: {
    minHeight: '100%',
    flexGrow: 1,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },

  // Character Header
  characterHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  characterAvatar: {
    marginBottom: 20,
    shadowColor: '#0099cc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  characterInfo: {
    alignItems: 'center',
  },
  characterName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  characterTitle: {
    fontSize: 16,
    color: '#4ECDC4',
    marginBottom: 12,
    fontWeight: '600',
  },
  rankChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Interactive Rank Display
  rankContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  rankCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  rankGradient: {
    padding: 24,
    backgroundColor: '#000000',
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rankIconContainer: {
    marginRight: 20,
  },
  rankDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  rankTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  rankDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  rankPoints: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  rankPointsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pointsValueLarge: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsLabelLarge: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Large Spartan Shield (Interactive)
  largeSpartanShield: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
  },
  largeSpartanShieldGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 36,
  },
  largeSpartanShieldInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.6)',
  },
  largeSpartanRankSymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    color: '#000',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  largeSpartanAccent1: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    height: 2,
    borderTopWidth: 2,
    opacity: 0.8,
  },
  largeSpartanAccent2: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    height: 2,
    borderBottomWidth: 2,
    opacity: 0.8,
  },

  // Progress Section
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 6,
  },

  // Battle Stats Dashboard
  battleStatsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  battleStatsCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  battleStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  battleStatsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0099cc',
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Skill Mastery
  skillMasterySection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  skillMasteryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
  },
  skillMasteryBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,215,0,0.3)',
  },
  skillMasteryText: {
    fontSize: 12,
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },

  // Achievements
  achievementsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  achievementsCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementChip: {
    backgroundColor: '#FFD700',
    marginBottom: 8,
  },
  achievementText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionGradient: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },

  bottomSpacing: {
    height: 40,
  },
});

export default AvatarScreen;
