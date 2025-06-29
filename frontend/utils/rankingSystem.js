// utils/rankingSystem.js
// EvolvX Ranking System - Inspired by Liftoff gamification

export const RANKS = {
  BRONZE: {
    name: 'Bronze',
    level: 1,
    color: '#CD7F32',
    gradient: ['#CD7F32', '#B8860B'],
    icon: 'medal',
    minPoints: 0,
    maxPoints: 99,
    title: 'Fitness Newcomer',
    description: 'Starting your fitness journey'
  },
  SILVER: {
    name: 'Silver',
    level: 2,
    color: '#C0C0C0',
    gradient: ['#C0C0C0', '#A8A8A8'],
    icon: 'medal-outline',
    minPoints: 100,
    maxPoints: 299,
    title: 'Dedicated Lifter',
    description: 'Building consistent habits'
  },
  GOLD: {
    name: 'Gold',
    level: 3,
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    icon: 'trophy',
    minPoints: 300,
    maxPoints: 599,
    title: 'Fitness Expert',
    description: 'Mastering your workouts'
  },
  PLATINUM: {
    name: 'Platinum',
    level: 4,
    color: '#E5E4E2',
    gradient: ['#E5E4E2', '#B8B8B8'],
    icon: 'trophy-outline',
    minPoints: 600,
    maxPoints: 999,
    title: 'Elite Athlete',
    description: 'Peak performance achieved'
  },
  DIAMOND: {
    name: 'Diamond',
    level: 5,
    color: '#B9F2FF',
    gradient: ['#B9F2FF', '#87CEEB'],
    icon: 'diamond-stone',
    minPoints: 1000,
    maxPoints: Infinity,
    title: 'Legendary Champion',
    description: 'Transcended mortal limits'
  }
};

// Calculate ranking points based on various metrics
export const calculateRankingPoints = (userStats) => {
  const {
    totalWorkouts = 0,
    currentStreak = 0,
    longestStreak = 0,
    totalExercises = 0,
    workoutDays = 0, // Days since first workout
    personalRecords = 0,
    consistencyScore = 0, // 0-100 based on workout frequency
  } = userStats;

  let points = 0;

  // Base points for total workouts (2 points per workout)
  points += totalWorkouts * 2;

  // Bonus points for current streak (3 points per day)
  points += currentStreak * 3;

  // Bonus points for longest streak achieved (1 point per day)
  points += longestStreak * 1;

  // Points for exercise variety (1 point per 5 unique exercises)
  points += Math.floor(totalExercises / 5);

  // Consistency bonus (up to 100 bonus points)
  points += consistencyScore;

  // Personal record bonus (10 points per PR)
  points += personalRecords * 10;

  // Longevity bonus (1 point per week of activity)
  points += Math.floor(workoutDays / 7);

  return Math.max(0, Math.floor(points));
};

// Get user's current rank based on points
export const getUserRank = (points) => {
  const ranks = Object.values(RANKS);
  
  for (let i = ranks.length - 1; i >= 0; i--) {
    const rank = ranks[i];
    if (points >= rank.minPoints) {
      return {
        ...rank,
        currentPoints: points,
        progressToNext: getProgressToNextRank(points),
        pointsToNext: getPointsToNextRank(points)
      };
    }
  }
  
  return {
    ...RANKS.BRONZE,
    currentPoints: points,
    progressToNext: getProgressToNextRank(points),
    pointsToNext: getPointsToNextRank(points)
  };
};

// Calculate progress percentage to next rank
export const getProgressToNextRank = (points) => {
  const ranks = Object.values(RANKS);
  
  for (let i = 0; i < ranks.length; i++) {
    const rank = ranks[i];
    if (points >= rank.minPoints && points <= rank.maxPoints) {
      if (rank.maxPoints === Infinity) {
        return 100; // Max rank achieved
      }
      
      const progress = ((points - rank.minPoints) / (rank.maxPoints - rank.minPoints)) * 100;
      return Math.min(100, Math.max(0, progress));
    }
  }
  
  return 0;
};

// Calculate points needed for next rank
export const getPointsToNextRank = (points) => {
  const ranks = Object.values(RANKS);
  
  for (let i = 0; i < ranks.length; i++) {
    const rank = ranks[i];
    if (points >= rank.minPoints && points <= rank.maxPoints) {
      if (rank.maxPoints === Infinity) {
        return 0; // Max rank achieved
      }
      
      return rank.maxPoints + 1 - points;
    }
  }
  
  return RANKS.BRONZE.maxPoints + 1 - points;
};

// Get next rank info
export const getNextRank = (currentPoints) => {
  const ranks = Object.values(RANKS);
  
  for (let i = 0; i < ranks.length - 1; i++) {
    const rank = ranks[i];
    if (currentPoints >= rank.minPoints && currentPoints <= rank.maxPoints) {
      return ranks[i + 1];
    }
  }
  
  return null; // Already at max rank
};

// Calculate user stats from workout data
export const calculateUserStats = (workouts = [], user = {}) => {
  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalExercises: 0,
      workoutDays: 0,
      personalRecords: 0,
      consistencyScore: 0
    };
  }

  const sortedWorkouts = workouts.sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date));
  const totalWorkouts = workouts.length;
  
  // Calculate unique exercises
  const uniqueExercises = new Set();
  workouts.forEach(workout => {
    if (workout.exercises) {
      workout.exercises.forEach(exercise => {
        uniqueExercises.add(exercise.name?.toLowerCase() || 'unknown');
      });
    }
  });

  // Calculate workout days since first workout
  const firstWorkoutDate = new Date(sortedWorkouts[0].workout_date);
  const lastWorkoutDate = new Date(sortedWorkouts[sortedWorkouts.length - 1].workout_date);
  const workoutDays = Math.ceil((lastWorkoutDate - firstWorkoutDate) / (1000 * 60 * 60 * 24)) + 1;

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(workouts);

  // Calculate consistency score (workouts per week)
  const weeksActive = Math.max(1, workoutDays / 7);
  const workoutsPerWeek = totalWorkouts / weeksActive;
  const consistencyScore = Math.min(100, Math.floor(workoutsPerWeek * 20)); // 5 workouts/week = 100 points

  // Mock personal records (would be calculated from actual PR data)
  const personalRecords = Math.floor(totalWorkouts / 5); // Estimate 1 PR per 5 workouts

  return {
    totalWorkouts,
    currentStreak,
    longestStreak,
    totalExercises: uniqueExercises.size,
    workoutDays,
    personalRecords,
    consistencyScore
  };
};

// Calculate current and longest streaks
const calculateStreaks = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedWorkouts = workouts.sort((a, b) => new Date(b.workout_date) - new Date(a.workout_date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique workout dates
  const workoutDates = [...new Set(sortedWorkouts.map(w => {
    const date = new Date(w.workout_date);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }))].sort((a, b) => b - a);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < workoutDates.length; i++) {
    const workoutDate = new Date(workoutDates[i]);
    const daysDiff = Math.floor((checkDate - workoutDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0 || daysDiff === 1) {
      currentStreak++;
      checkDate = new Date(workoutDate);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < workoutDates.length; i++) {
    const prevDate = new Date(workoutDates[i - 1]);
    const currDate = new Date(workoutDates[i]);
    const daysDiff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
};

// Get rank color for styling
export const getRankColor = (rank) => {
  return RANKS[rank.name.toUpperCase()]?.color || RANKS.BRONZE.color;
};

// Get rank gradient for styling
export const getRankGradient = (rank) => {
  return RANKS[rank.name.toUpperCase()]?.gradient || RANKS.BRONZE.gradient;
};

// Export default rank calculation function
export default {
  calculateRankingPoints,
  calculateUserStats,
  getUserRank,
  getProgressToNextRank,
  getPointsToNextRank,
  getNextRank,
  getRankColor,
  getRankGradient,
  RANKS
};