// screens/main/CreateWorkoutScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  LayoutAnimation, 
  UIManager,   
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  IconButton,
  Divider,
  Chip,
  Surface,
  ProgressBar,
  Portal,
  Modal,
  Searchbar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Animation configuration
const ANIMATION_CONFIG = LayoutAnimation.create(
  200,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity
);


/* ──────────────────────────────────────────────────────────
   Exercise catalogue with categories
   ────────────────────────────────────────────────────────── */
const EXERCISE_CATEGORIES = {
  'Chest': {
    icon: 'arm-flex',
    color: '#0099cc',
    gradient: ['#0099cc', '#4ECDC4'],
    exercises: [
      { name: 'Bench Press', icon: 'weight-lifter', description: 'Compound chest exercise' },
      { name: 'Incline Bench Press', icon: 'trending-up', description: 'Upper chest focus' },
      { name: 'Decline Bench Press', icon: 'trending-down', description: 'Lower chest focus' },
      { name: 'Dumbbell Fly', icon: 'arrow-expand-horizontal', description: 'Chest isolation' },
      { name: 'Push-Up', icon: 'arrow-collapse-down', description: 'Bodyweight exercise' },
      { name: 'Cable Fly', icon: 'vector-combine', description: 'Cable isolation' },
      { name: 'Dips', icon: 'arrow-down-bold', description: 'Compound movement' },
      { name: 'Chest Press Machine', icon: 'dumbbell', description: 'Machine exercise' },
      { name: 'Cable Crossover', icon: 'arrow-expand-all', description: 'Cable exercise' },
      { name: 'Pec Deck', icon: 'butterfly', description: 'Machine isolation' },
    ]
  },
  'Back': {
    icon: 'human-handsdown',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A3AA'],
    exercises: [
      { name: 'Pull-Up', icon: 'arrow-up-bold', description: 'Compound back exercise' },
      { name: 'Deadlift', icon: 'weight-pound', description: 'Full body compound' },
      { name: 'Lat Pulldown', icon: 'arrow-down-thick', description: 'Lat focused' },
      { name: 'Bent Over Row', icon: 'rowing', description: 'Middle back exercise' },
      { name: 'T-Bar Row', icon: 'format-align-center', description: 'Back thickness' },
      { name: 'Cable Row', icon: 'arrow-left-thick', description: 'Seated cable row' },
      { name: 'Face Pulls', icon: 'account-arrow-right', description: 'Rear delts' },
      { name: 'Shrugs', icon: 'shoulder-purse', description: 'Trap exercise' },
      { name: 'Chin-Up', icon: 'arrow-up', description: 'Underhand pull-up' },
      { name: 'Single Arm Row', icon: 'arm-flex-outline', description: 'Unilateral row' },
    ]
  },
  'Legs': {
    icon: 'run-fast',
    color: '#45B7D1',
    gradient: ['#45B7D1', '#3498DB'],
    exercises: [
      { name: 'Squat', icon: 'arrow-down-bold-circle', description: 'King of leg exercises' },
      { name: 'Leg Press', icon: 'slope-downhill', description: 'Machine exercise' },
      { name: 'Lunge', icon: 'walk', description: 'Unilateral exercise' },
      { name: 'Leg Curl', icon: 'sync', description: 'Hamstring isolation' },
      { name: 'Leg Extension', icon: 'angle-right', description: 'Quad isolation' },
      { name: 'Calf Raise', icon: 'stairs-up', description: 'Calf isolation' },
      { name: 'Romanian Deadlift', icon: 'human-handsdown', description: 'Hamstring focus' },
      { name: 'Bulgarian Split Squat', icon: 'human', description: 'Single leg exercise' },
      { name: 'Goblet Squat', icon: 'cup', description: 'Front-loaded squat' },
      { name: 'Hack Squat', icon: 'slope-uphill', description: 'Machine squat' },
    ]
  },
  'Shoulders': {
    icon: 'arm-flex-outline',
    color: '#F39C12',
    gradient: ['#F39C12', '#E67E22'],
    exercises: [
      { name: 'Overhead Press', icon: 'arrow-up-bold-circle', description: 'Compound shoulder' },
      { name: 'Lateral Raise', icon: 'arrow-expand-horizontal', description: 'Side delts' },
      { name: 'Front Raise', icon: 'arrow-up', description: 'Front delts' },
      { name: 'Rear Delt Fly', icon: 'arrow-expand', description: 'Rear delts' },
      { name: 'Arnold Press', icon: 'rotate-3d-variant', description: 'Full shoulder' },
      { name: 'Upright Row', icon: 'arrow-up-thick', description: 'Traps and delts' },
      { name: 'Cable Lateral Raise', icon: 'cable-data', description: 'Cable variation' },
      { name: 'Face Pulls', icon: 'arrow-split-horizontal', description: 'Rear delts' },
      { name: 'Shrugs', icon: 'arrow-up-box', description: 'Trap exercise' },
      { name: 'Machine Press', icon: 'cog', description: 'Machine variation' },
    ]
  },
  'Arms': {
    icon: 'arm-flex',
    color: '#9B59B6',
    gradient: ['#9B59B6', '#8E44AD'],
    exercises: [
      { name: 'Barbell Curl', icon: 'weight', description: 'Bicep mass builder' },
      { name: 'Hammer Curl', icon: 'hammer', description: 'Brachialis focus' },
      { name: 'Preacher Curl', icon: 'seat', description: 'Isolated bicep' },
      { name: 'Cable Curl', icon: 'cable-data', description: 'Constant tension' },
      { name: 'Concentration Curl', icon: 'target', description: 'Peak contraction' },
      { name: 'Tricep Dip', icon: 'arrow-down-bold-outline', description: 'Compound tricep' },
      { name: 'Tricep Extension', icon: 'arrow-up-bold-outline', description: 'Overhead tricep' },
      { name: 'Tricep Pushdown', icon: 'arrow-down', description: 'Cable tricep' },
      { name: 'Close-Grip Bench', icon: 'arrow-collapse-horizontal', description: 'Tricep compound' },
      { name: 'Skull Crusher', icon: 'skull-outline', description: 'Lying tricep extension' },
    ]
  },
  'Core': {
    icon: 'circle-slice-6',
    color: '#E74C3C',
    gradient: ['#E74C3C', '#C0392B'],
    exercises: [
      { name: 'Plank', icon: 'minus', description: 'Isometric core' },
      { name: 'Crunches', icon: 'arrow-up-thin', description: 'Upper abs' },
      { name: 'Russian Twist', icon: 'rotate-left', description: 'Obliques' },
      { name: 'Leg Raise', icon: 'arrow-up', description: 'Lower abs' },
      { name: 'Ab Wheel', icon: 'circle-outline', description: 'Full core' },
      { name: 'Mountain Climbers', icon: 'run', description: 'Dynamic core' },
      { name: 'Side Plank', icon: 'arrow-left-right', description: 'Obliques' },
      { name: 'Dead Bug', icon: 'bug', description: 'Core stability' },
      { name: 'Cable Crunch', icon: 'arrow-down-thin', description: 'Weighted abs' },
      { name: 'Bicycle Crunch', icon: 'bike', description: 'Rotational abs' },
    ]
  },
};

export default function CreateWorkoutScreen({ navigation }) {
  const { user, api } = useAuth();
  const scrollViewRef = useRef(null);

  /* ───────── state ───────── */
  const [workoutName, setWorkoutName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [unit, setUnit] = useState('lbs');
  const [selectedCategory, setSelectedCategory] = useState('Chest');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErr] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isSharedWorkout, setIsSharedWorkout] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [expandedExercise, setExpandedExercise] = useState(null);

  //new
  const [buttonScale] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  // Workout templates
  const workoutTemplates = [
    { 
      id: 'push', 
      name: 'Push Day', 
      icon: 'arm-flex',  // Bicep flex icon
      categories: ['Chest', 'Shoulders'],
      color: '#FF6B6B'
    },
    { 
      id: 'pull', 
      name: 'Pull Day', 
      icon: 'arrow-down-bold',  // Pull down motion
      categories: ['Back', 'Arms'],
      color: '#4ECDC4'
    },
    { 
      id: 'legs', 
      name: 'Leg Day', 
      icon: 'human-handsdown',  // Standing figure
      categories: ['Legs'],
      color: '#45B7D1'
    },
    { 
      id: 'full', 
      name: 'Full Body', 
      icon: 'weight-lifter',  // Person lifting weights
      categories: ['Chest', 'Back', 'Legs'],
      color: '#F39C12'
    },
    { 
      id: 'custom', 
      name: 'Custom', 
      icon: 'pencil-ruler',  // Design/custom icon
      categories: [],
      color: '#0099cc'
    },
  ];

  // Animation on mount and load friends
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Load friends list
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const { data } = await api.get('/social/friends', {
        params: { status: 'accepted' }
      });
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Friends endpoint not available:', err.response?.status);
      setFriends([]);
    }
  };

  // Progress calculation
  const calculateProgress = () => {
    let progress = 0;
    if (workoutName) progress += 0.25;
    if (selectedTemplate) progress += 0.25;
    if (exercises.length > 0) progress += 0.25;
    if (exercises.some(e => e.sets.some(s => s.weight && s.reps))) progress += 0.25;
    return progress;
  };

  /* ───────── handlers ───────── */
  const handleTemplateSelect = (template) => {
    console.log('Template selected:', template);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);

    setSelectedTemplate(template.id);
    console.log('Selected template ID:', template.id);

    if (template.id !== 'custom') {
      // Pre-populate with template-specific exercises
      let templateExercises = [];
      
      switch (template.id) {
        case 'push':
          // Push Day: Chest, Shoulders, Triceps
          templateExercises = [
            // Chest exercises
            {
              id: Date.now() + Math.random(),
              name: 'Bench Press',
              icon: 'weight-lifter',
              category: 'Chest',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 1,
              name: 'Incline Bench Press',
              icon: 'trending-up',
              category: 'Chest',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 2,
              name: 'Dips',
              icon: 'arrow-down-bold',
              category: 'Chest',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Shoulder exercises
            {
              id: Date.now() + Math.random() + 3,
              name: 'Overhead Press',
              icon: 'arrow-up-bold-circle',
              category: 'Shoulders',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 4,
              name: 'Lateral Raise',
              icon: 'arrow-expand-horizontal',
              category: 'Shoulders',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Tricep exercises
            {
              id: Date.now() + Math.random() + 5,
              name: 'Tricep Extension',
              icon: 'arrow-up-bold-outline',
              category: 'Arms',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            }
          ];
          break;
          
        case 'pull':
          // Pull Day: Back, Biceps
          templateExercises = [
            // Back exercises
            {
              id: Date.now() + Math.random(),
              name: 'Pull-Up',
              icon: 'arrow-up-bold',
              category: 'Back',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 1,
              name: 'Deadlift',
              icon: 'weight-pound',
              category: 'Back',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 2,
              name: 'Bent Over Row',
              icon: 'rowing',
              category: 'Back',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 3,
              name: 'Lat Pulldown',
              icon: 'arrow-down-thick',
              category: 'Back',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Bicep exercises
            {
              id: Date.now() + Math.random() + 4,
              name: 'Barbell Curl',
              icon: 'weight',
              category: 'Arms',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 5,
              name: 'Hammer Curl',
              icon: 'hammer',
              category: 'Arms',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            }
          ];
          break;
          
        case 'legs':
          // Leg Day: Comprehensive leg workout
          templateExercises = [
            {
              id: Date.now() + Math.random(),
              name: 'Squat',
              icon: 'arrow-down-bold-circle',
              category: 'Legs',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 1,
              name: 'Romanian Deadlift',
              icon: 'human-handsdown',
              category: 'Legs',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 2,
              name: 'Leg Press',
              icon: 'slope-downhill',
              category: 'Legs',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 3,
              name: 'Leg Curl',
              icon: 'sync',
              category: 'Legs',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 4,
              name: 'Leg Extension',
              icon: 'angle-right',
              category: 'Legs',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            {
              id: Date.now() + Math.random() + 5,
              name: 'Calf Raise',
              icon: 'stairs-up',
              category: 'Legs',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            }
          ];
          break;
          
        case 'full':
          // Full Body: One exercise from each major muscle group
          templateExercises = [
            // Chest
            {
              id: Date.now() + Math.random(),
              name: 'Bench Press',
              icon: 'weight-lifter',
              category: 'Chest',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Back
            {
              id: Date.now() + Math.random() + 1,
              name: 'Bent Over Row',
              icon: 'rowing',
              category: 'Back',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Legs
            {
              id: Date.now() + Math.random() + 2,
              name: 'Squat',
              icon: 'arrow-down-bold-circle',
              category: 'Legs',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Shoulders
            {
              id: Date.now() + Math.random() + 3,
              name: 'Overhead Press',
              icon: 'arrow-up-bold-circle',
              category: 'Shoulders',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Arms
            {
              id: Date.now() + Math.random() + 4,
              name: 'Barbell Curl',
              icon: 'weight',
              category: 'Arms',
              sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
              ]
            },
            // Core
            {
              id: Date.now() + Math.random() + 5,
              name: 'Plank',
              icon: 'minus',
              category: 'Core',
              sets: [
                { weight: '', reps: '60', completed: false },
                { weight: '', reps: '60', completed: false },
                { weight: '', reps: '60', completed: false }
              ]
            }
          ];
          break;
          
        default:
          templateExercises = [];
      }
      
      setExercises(templateExercises);
    } else {
      setExercises([]);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const addExercise = (exercise, category) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);

    const newExercise = {
      id: Date.now().toString(),
      name: exercise.name,
      icon: exercise.icon,
      category: category,
      sets: [{ weight: '', reps: '', completed: false }]
    };
    setExercises([...exercises, newExercise]);
    setShowExerciseModal(false);
    setSearchQuery('');
  };

  const toggleExerciseExpansion = (exerciseId) => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId);
  };

  const removeExercise = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExercises(exercises.filter(e => e.id !== id));
  };

  const addSet = (exerciseId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? { ...e, sets: [...e.sets, { weight: '', reps: '', completed: false }] }
        : e
    ));
  };

  const removeSet = (exerciseId, setIndex) => {
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
        : e
    ));
  };

  const updateSet = (exerciseId, setIndex, field, value) => {
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? {
            ...e,
            sets: e.sets.map((s, i) => 
              i === setIndex ? { ...s, [field]: value } : s
            )
          }
        : e
    ));
  };

  const toggleSetCompletion = (exerciseId, setIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? {
            ...e,
            sets: e.sets.map((s, i) => 
              i === setIndex ? { ...s, completed: !s.completed } : s
            )
          }
        : e
    ));
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      setErr('Please enter a workout name');
      return;
    }
    if (!exercises.length) {
      setErr('Add at least one exercise');
      return;
    }
    
    setErr(null);
    setSaving(true);
    
    try {
      if (isSharedWorkout) {
        // Create shared workout
        await createSharedWorkout();
      } else {
        // Create regular workout
        await createRegularWorkout();
      }
      navigation.goBack();
    } catch (e) {
      console.error('Save workout error:', e);
      setErr(e.response?.data?.error || e.message || 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const createRegularWorkout = async () => {
    // First, get all exercises from the API to map names to IDs
    const { data: allExercises } = await api.get('/exercises');
    
    // Create a map of exercise names to IDs
    const exerciseMap = {};
    allExercises.forEach(ex => {
      exerciseMap[ex.name] = ex.exercise_id;
    });
    
    // Transform exercises to match API format
    const apiExercises = exercises.map(exercise => {
      const exerciseId = exerciseMap[exercise.name];
      if (!exerciseId) {
        throw new Error(`Exercise "${exercise.name}" not found in database`);
      }
      
      // Get the first set with valid data (API expects single set/rep/weight per exercise)
      const validSet = exercise.sets.find(s => s.weight && s.reps) || exercise.sets[0];
      
      return {
        exercise_id: exerciseId,
        sets: exercise.sets.length,
        reps: parseInt(validSet.reps, 10) || 10,
        weight: parseFloat(validSet.weight) || 0
      };
    });
    
    const workoutData = {
      user_id: user.user_id || user.id,
      workout_name: workoutName,
      workout_date: selectedDate.toISOString(),
      notes: notes,
      exercises: apiExercises
    };
    
    await api.post('/workouts', workoutData);
  };

  const createSharedWorkout = async () => {
    // Create shared workout with friends
    const sharedWorkoutData = {
      workout_name: workoutName,
      creator_id: user.user_id || user.id,
      invited_friends: selectedFriends.map(f => f.user_id),
      workout_date: selectedDate.toISOString(),
      notes: notes,
      exercises: exercises.map(ex => ({
        name: ex.name,
        category: ex.category,
        sets: ex.sets.length,
        // Use first valid set for shared workout template
        reps: ex.sets.find(s => s.reps)?.reps || '10',
        weight: ex.sets.find(s => s.weight)?.weight || ''
      }))
    };
    
    const { data } = await api.post('/social/shared-workouts', sharedWorkoutData);
    
    // Navigate to the shared workout screen
    navigation.navigate('SharedWorkout', { workoutId: data.shared_workout_id });
  };

  const toggleFriendSelection = (friend) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFriends(prev => {
      const isSelected = prev.find(f => f.user_id === friend.user_id);
      if (isSelected) {
        return prev.filter(f => f.user_id !== friend.user_id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  // Exercise search filter
  const getFilteredExercises = () => {
    if (!searchQuery) return EXERCISE_CATEGORIES[selectedCategory]?.exercises || [];
    
    const filtered = [];
    Object.entries(EXERCISE_CATEGORIES).forEach(([category, data]) => {
      const categoryFiltered = data.exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (categoryFiltered.length > 0) {
        filtered.push({ category, exercises: categoryFiltered });
      }
    });
    return filtered;
  };

  /* ───────── render components ───────── */
  const renderExerciseBlock = (exercise, index) => (
    
    <Card key={exercise.id} style={styles.exerciseCard}>
      <Card.Content>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseInfo}>
            <Icon name={exercise.icon} size={28} color="#0099cc" />
            <View style={styles.exerciseDetails}>
              <Title style={styles.exerciseName}>{exercise.name}</Title>
              <Text style={styles.exerciseCategory}>{exercise.category}</Text>
            </View>
          </View>
          <IconButton
            icon="delete"
            size={24}
            iconColor="#ff6b6b"
            onPress={() => removeExercise(exercise.id)}
          />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.setsContainer}>
          <View style={styles.setsHeaderRow}>
            <Text style={[styles.setHeaderText, { width: 50, textAlign: 'center' }]}>Set</Text>
            <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>Weight ({unit})</Text>
            <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>Reps</Text>
            <View style={{ width: 60, alignItems: 'center' }}>
              <Text style={styles.setHeaderText}>Done</Text>
            </View>
          </View>

          {exercise.sets.map((set, setIndex) => (
            <View key={setIndex} style={styles.setRow}>
              <View style={styles.setNumberContainer}>
                <Text style={styles.setNumber}>{setIndex + 1}</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={set.weight}
                  onChangeText={(v) => updateSet(exercise.id, setIndex, 'weight', v)}
                  style={styles.setInput}
                  contentStyle={styles.setInputContent}
                  outlineStyle={styles.setInputOutline}
                  dense
                  placeholder="0"
                  placeholderTextColor="#666"
                  textColor="#fff"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={set.reps}
                  onChangeText={(v) => updateSet(exercise.id, setIndex, 'reps', v)}
                  style={styles.setInput}
                  contentStyle={styles.setInputContent}
                  outlineStyle={styles.setInputOutline}
                  dense
                  placeholder="0"
                  placeholderTextColor="#666"
                  textColor="#fff"
                />
              </View>
              
              <View style={styles.setActionsContainer}>
                <TouchableOpacity
                  style={[styles.checkButton, set.completed && styles.checkedButton]}
                  onPress={() => toggleSetCompletion(exercise.id, setIndex)}
                >
                  <Icon 
                    name={set.completed ? "check" : "checkbox-blank-outline"} 
                    size={20} 
                    color={set.completed ? "#fff" : "#666"} 
                  />
                </TouchableOpacity>
                {exercise.sets.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeSetButton}
                    onPress={() => removeSet(exercise.id, setIndex)}
                  >
                    <Icon name="minus-circle" size={18} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <Button
            mode="text"
            icon="plus"
            onPress={() => addSet(exercise.id)}
            style={styles.addSetButton}
            labelStyle={styles.addSetButtonLabel}
          >
            Add Set
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderExerciseModal = () => (
    <Portal>
      <Modal
        visible={showExerciseModal}
        onDismiss={() => {
          setShowExerciseModal(false);
          setSearchQuery('');
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          <Title style={styles.modalTitle}>Add Exercise</Title>
          
          <Searchbar
            placeholder="Search exercises..."
            placeholderTextColor="#999"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.modalSearchBar}
            inputStyle={styles.modalSearchInput}
            iconColor="#0099cc"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
            {Object.keys(EXERCISE_CATEGORIES).map((category) => (
              <Chip
                key={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && { backgroundColor: EXERCISE_CATEGORIES[category].color }
                ]}
                textStyle={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.selectedCategoryText
                ]}
              >
                {category}
              </Chip>
            ))}
          </ScrollView>

          <ScrollView 
            style={[
              styles.exerciseList,
              Platform.OS === 'web' && { 
                height: '50vh', 
                overflow: 'scroll',
                overflowY: 'scroll',
                maxHeight: '50vh'
              }
            ]}
            contentContainerStyle={[
              styles.exerciseListContent,
              Platform.OS === 'web' && { minHeight: '100%', paddingBottom: 20 }
            ]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            {searchQuery ? (
              // Show search results
              getFilteredExercises().map(({ category, exercises }) => (
                <View key={category}>
                  <Text style={styles.searchCategoryTitle}>{category}</Text>
                  {exercises.map((exercise) => (
                    <TouchableOpacity
                      key={exercise.name}
                      style={styles.modernExerciseItem}
                      onPress={() => addExercise(exercise, category)}
                    >
                      <View style={[styles.exerciseIconContainer, { backgroundColor: `${EXERCISE_CATEGORIES[category].color}20` }]}>
                        <Icon name={exercise.icon} size={24} color={EXERCISE_CATEGORIES[category].color} />
                      </View>
                      <View style={styles.exerciseItemInfo}>
                        <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                        <Text style={styles.exerciseItemDescription}>{exercise.description}</Text>
                      </View>
                      <View style={styles.addButton}>
                        <Icon name="plus" size={20} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            ) : (
              // Show selected category
              (EXERCISE_CATEGORIES[selectedCategory]?.exercises || []).map((exercise) => (
                <TouchableOpacity
                  key={exercise.name}
                  style={styles.modernExerciseItem}
                  onPress={() => addExercise(exercise, selectedCategory)}
                >
                  <View style={[styles.exerciseIconContainer, { backgroundColor: `${EXERCISE_CATEGORIES[selectedCategory].color}20` }]}>
                    <Icon name={exercise.icon} size={24} color={EXERCISE_CATEGORIES[selectedCategory].color} />
                  </View>
                  <View style={styles.exerciseItemInfo}>
                    <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                    <Text style={styles.exerciseItemDescription}>{exercise.description}</Text>
                  </View>
                  <View style={styles.addButton}>
                    <Icon name="plus" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <Button
            mode="contained"
            onPress={() => {
              setShowExerciseModal(false);
              setSearchQuery('');
            }}
            style={styles.modalCloseButton}
          >
            Close
          </Button>
        </Surface>
      </Modal>
    </Portal>
  );

  const renderFriendsModal = () => (
    <Portal>
      <Modal
        visible={showFriendsModal}
        onDismiss={() => setShowFriendsModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          <Title style={styles.modalTitle}>Invite Friends</Title>
          
          {friends.length === 0 ? (
            <View style={styles.emptyFriendsContainer}>
              <Icon name="account-group-outline" size={64} color="#999" />
              <Text style={styles.emptyFriendsText}>No friends to invite</Text>
              <Text style={styles.emptyFriendsSubtext}>
                Add friends first to create shared workouts together!
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.friendsList}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.user_id}
                  style={[
                    styles.friendItem,
                    selectedFriends.find(f => f.user_id === friend.user_id) && styles.selectedFriendItem
                  ]}
                  onPress={() => toggleFriendSelection(friend)}
                >
                  <Avatar.Text 
                    size={40} 
                    label={getInitials(friend.username)} 
                    backgroundColor="#e0e0e0"
                  />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.username}</Text>
                    <Text style={styles.friendWorkouts}>{friend.workout_count || 0} workouts</Text>
                  </View>
                  <View style={styles.friendSelectIcon}>
                    <Icon 
                      name={selectedFriends.find(f => f.user_id === friend.user_id) ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={selectedFriends.find(f => f.user_id === friend.user_id) ? "#0099cc" : "#999"} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowFriendsModal(false)}
              style={styles.modalCancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => setShowFriendsModal(false)}
              style={styles.modalCloseButton}
              disabled={friends.length === 0}
            >
              Done ({selectedFriends.length} selected)
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );

  /* ───────── main render ───────── */
  return (
    <SafeAreaView style={styles.container}>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "web" ? undefined : "height"}
        style={[
          styles.keyboardAvoid,
          Platform.OS === 'web' && { 
            flex: 1, 
            height: 'calc(100vh - 120px)',
            overflow: 'hidden' // Prevent double scrollbars
          }
        ]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={[
            styles.scrollView,
            Platform.OS === 'web' && { 
              height: '80vh', 
              overflow: 'scroll',
              overflowY: 'scroll', // Force vertical scrolling
              WebkitOverflowScrolling: 'touch', // Better iOS web scrolling
              maxHeight: '80vh' // Ensure height constraint
            }
          ]}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'web' && styles.webScrollContent
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
          {/* Workout Details */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Title style={styles.stepTitle}>Workout Details</Title>
                <Chip icon="numeric-1-circle" style={styles.stepChip}>Step 1 of 3</Chip>
              </View>

              <TextInput
                label="Workout Name"
                mode="outlined"
                value={workoutName}
                onChangeText={setWorkoutName}
                style={styles.input}
                placeholder="e.g., Monday Upper Body"
                left={<TextInput.Icon icon="pencil" />}
              />

              <View style={styles.dateSection}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar" size={24} color="#0099cc" />
                  <Text style={styles.dateText}>{selectedDate.toLocaleDateString()}</Text>
                  <Icon name="chevron-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                Platform.OS === 'web' ? (
                  // Web native date picker
                  <View style={styles.webDatePickerContainer}>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate)) {
                          setSelectedDate(newDate);
                          setShowDatePicker(false); // Auto-close after selection
                        }
                      }}
                      style={{
                        padding: '12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        width: '100%',
                        marginTop: '8px'
                      }}
                    />
                    <Button 
                      mode="text" 
                      onPress={() => setShowDatePicker(false)}
                      style={{ marginTop: 8 }}
                    >
                      Close
                    </Button>
                  </View>
                ) : (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                  />
                )
              )}

              <View style={styles.unitSection}>
                <Text style={styles.label}>Weight Unit</Text>
                <View style={styles.unitButtons}>
                  <Button
                    mode={unit === 'lbs' ? 'contained' : 'outlined'}
                    onPress={() => setUnit('lbs')}
                    style={[styles.unitButton, unit === 'lbs' && styles.selectedUnit]}
                  >
                    LBS
                  </Button>
                  <Button
                    mode={unit === 'kg' ? 'contained' : 'outlined'}
                    onPress={() => setUnit('kg')}
                    style={[styles.unitButton, unit === 'kg' && styles.selectedUnit]}
                  >
                    KG
                  </Button>
                </View>
              </View>

              <TextInput
                label="Notes (optional)"
                mode="outlined"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
                placeholder="How did you feel? Any PR's?"
                placeholderTextColor="#999"
                textColor="#fff"
                outlineColor="#333"
                activeOutlineColor="#0099cc"
                contentStyle={styles.notesInputContent}
                left={<TextInput.Icon icon="note-text" iconColor="#0099cc" />}
              />
            </Card.Content>
          </Card>

          {/* Shared Workout Toggle */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Title style={styles.stepTitle}>Workout Type</Title>
                <Chip icon="account-group" style={styles.stepChip}>Social</Chip>
              </View>

              <View style={styles.workoutTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.workoutTypeCard,
                    !isSharedWorkout && styles.selectedWorkoutType
                  ]}
                  onPress={() => {
                    setIsSharedWorkout(false);
                    setSelectedFriends([]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Icon name="account" size={32} color={!isSharedWorkout ? "#fff" : "#0099cc"} />
                  <Text style={[
                    styles.workoutTypeText,
                    !isSharedWorkout && styles.selectedWorkoutTypeText
                  ]}>
                    Solo Workout
                  </Text>
                  <Text style={[
                    styles.workoutTypeSubtext,
                    !isSharedWorkout && styles.selectedWorkoutTypeSubtext
                  ]}>
                    Train by yourself
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.workoutTypeCard,
                    isSharedWorkout && styles.selectedWorkoutType
                  ]}
                  onPress={() => {
                    setIsSharedWorkout(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Icon name="account-group" size={32} color={isSharedWorkout ? "#fff" : "#0099cc"} />
                  <Text style={[
                    styles.workoutTypeText,
                    isSharedWorkout && styles.selectedWorkoutTypeText
                  ]}>
                    With Friends
                  </Text>
                  <Text style={[
                    styles.workoutTypeSubtext,
                    isSharedWorkout && styles.selectedWorkoutTypeSubtext
                  ]}>
                    Train together live
                  </Text>
                </TouchableOpacity>
              </View>

              {isSharedWorkout && (
                <View style={styles.friendsSection}>
                  <View style={styles.friendsSectionHeader}>
                    <Text style={styles.friendsSectionTitle}>Invite Friends</Text>
                    <Button
                      mode="outlined"
                      icon="account-plus"
                      onPress={() => setShowFriendsModal(true)}
                      style={styles.inviteFriendsButton}
                      compact
                    >
                      {selectedFriends.length > 0 ? `${selectedFriends.length} selected` : 'Select friends'}
                    </Button>
                  </View>
                  
                  {selectedFriends.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.selectedFriendsContainer}
                    >
                      {selectedFriends.map((friend) => (
                        <View key={friend.user_id} style={styles.selectedFriendChip}>
                          <Avatar.Text 
                            size={24} 
                            label={getInitials(friend.username)} 
                            backgroundColor="#0099cc"
                            style={styles.selectedFriendAvatar}
                          />
                          <Text style={styles.selectedFriendName}>{friend.username}</Text>
                          <TouchableOpacity 
                            onPress={() => toggleFriendSelection(friend)}
                            style={styles.removeFriendButton}
                          >
                            <Icon name="close" size={16} color="#999" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Template Selection */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Title style={styles.stepTitle}>Choose Template</Title>
                <Chip icon="numeric-3-circle" style={styles.stepChip}>Step 3 of 4</Chip>
              </View>

              <View style={styles.templatesGrid}>
                {workoutTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateCard,
                      selectedTemplate === template.id && styles.selectedTemplate
                    ]}
                    onPress={() => handleTemplateSelect(template)}
                  >
                    <Icon 
                      name={template.icon} 
                      size={48} 
                      color={selectedTemplate === template.id ? '#fff' : '#0099cc'} 
                    />
                    <Text style={[
                      styles.templateText,
                      selectedTemplate === template.id && styles.selectedTemplateText
                    ]}>
                      {template.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card.Content>
          </Card>

          {/* Exercises Section */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Title style={styles.stepTitle}>Exercises</Title>
                <Chip icon="numeric-4-circle" style={styles.stepChip}>Step 4 of 4</Chip>
              </View>

              {exercises.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="dumbbell" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No exercises added yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {selectedTemplate && selectedTemplate !== 'custom'
                      ? 'Template exercises will appear here'
                      : 'Tap the button below to add exercises'}
                  </Text>
                </View>
              ) : (
                <View style={styles.exerciseSummary}>
                  <Text style={styles.summaryText}>
                    {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} • {' '}
                    {exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} total sets
                  </Text>
                </View>
              )}

              <Button
                mode="contained"
                icon="plus"
                onPress={() => setShowExerciseModal(true)}
                style={styles.addExerciseButton}
              >
                Add Exercise
              </Button>
            </Card.Content>
          </Card>

          {/* Exercise blocks */}
          {exercises.map((exercise, index) => renderExerciseBlock(exercise, index))}

          {/* Error message */}
          {errMsg && (
            <Card style={styles.errorCard}>
              <Card.Content>
                <Text style={styles.errorText}>{errMsg}</Text>
              </Card.Content>
            </Card>
          )}

          {/* Save button */}
          {exercises.length > 0 && (
            <View style={styles.saveSection}>
              <Button
                mode="contained"
                loading={saving}
                disabled={saving || (isSharedWorkout && selectedFriends.length === 0)}
                onPress={saveWorkout}
                style={styles.saveButton}
                labelStyle={styles.saveButtonLabel}
                icon={isSharedWorkout ? "account-group" : "content-save"}
              >
                {isSharedWorkout ? 'Create Shared Workout' : 'Save Workout'}
              </Button>
              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </View>
          )}

          <View style={{ height: 100 }} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderExerciseModal()}
      {renderFriendsModal()}
    </SafeAreaView>
  );
}

/* ──────────────────────────────────────────────────────────
   styles
   ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    height: '100vh',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingVertical: 8,
    paddingRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#fff',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
    height: '100%'
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1, 
    minHeight: '100vh',
    flexGrow: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepChip: {
    backgroundColor: '#1a4c5a',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#000000',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
  },
  dateSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  dateText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
    color: '#fff',
  },
  unitSection: {
    marginBottom: 16,
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
  },
  selectedUnit: {
    backgroundColor: '#0099cc',
  },
  notesInput: {
    marginBottom: 8,
    backgroundColor: '#000000',
  },
  notesInputContent: {
    backgroundColor: '#000000',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 100,
  },
  templateCard: {
    width: (width - 48 - 16) / 2.5,
    aspectRatio: 1,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
  },
  selectedTemplate: {
    backgroundColor: '#0099cc',
  },
  templateText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
  },
  selectedTemplateText: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  exerciseSummary: {
    backgroundColor: '#1a4c5a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#fff',
    color: '#0099cc',
    fontWeight: '600',
  },
  addExerciseButton: {
    backgroundColor: '#0099cc',
  },
  exerciseCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseDetails: {
    marginLeft: 12,
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#999',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#333',
  },
  setsContainer: {
    marginTop: 8,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  setHeaderText: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  setNumberContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0099cc',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  setInput: {
    backgroundColor: '#000000',
    height: 40,
  },
  setInputContent: {
    backgroundColor: '#000000',
  },
  setInputOutline: {
    borderColor: '#333',
  },
  setActionsContainer: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  checkedButton: {
    backgroundColor: '#0099cc',
    borderColor: '#0099cc',
  },
  removeSetButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addSetButtonLabel: {
    color: '#0099cc',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '600',
  },
  webScrollContent: {
    minHeight: '100%',
    flexGrow: 1,
    paddingBottom: 100, // Extra space at bottom for scrolling
  },
  collapsedSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  collapsedSummaryText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  webDatePickerContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },

  // Modern exercise modal styles
  exerciseListContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modernExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#0099cc',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Styles - Dark Theme
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryTabs: {
    marginVertical: 16,
    maxHeight: 50,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 40,
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  exerciseList: {
    maxHeight: 400,
    marginVertical: 16,
  },
  exerciseListContent: {
    paddingBottom: 10,
  },
  searchCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0099cc',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  modernExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseItemDescription: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
  modalCloseButton: {
    backgroundColor: '#0099cc',
    marginTop: 16,
    borderRadius: 8,
  },
  modalSearchBar: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 8,
    elevation: 0,
  },
  modalSearchInput: {
    color: '#fff',
    fontSize: 14,
  },

  // Shared Workout Styles
  workoutTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  workoutTypeCard: {
    flex: 1,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  selectedWorkoutType: {
    backgroundColor: '#0099cc',
    borderColor: '#0099cc',
  },
  workoutTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedWorkoutTypeText: {
    color: '#fff',
  },
  workoutTypeSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedWorkoutTypeSubtext: {
    color: 'rgba(255,255,255,0.9)',
  },
  friendsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  friendsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  inviteFriendsButton: {
    borderColor: '#0099cc',
  },
  selectedFriendsContainer: {
    marginTop: 8,
  },
  selectedFriendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 8,
  },
  selectedFriendAvatar: {
    width: 24,
    height: 24,
  },
  selectedFriendName: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  removeFriendButton: {
    padding: 2,
  },

  // Friends Modal Styles
  emptyFriendsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFriendsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyFriendsSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  friendsList: {
    maxHeight: 400,
    marginVertical: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedFriendItem: {
    backgroundColor: '#1a4c5a',
    borderColor: '#0099cc',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  friendWorkouts: {
    fontSize: 12,
    color: '#999',
  },
  friendSelectIcon: {
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
  },

  // Save Section Styles
  saveSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#0099cc',
    borderRadius: 8,
  },
  saveButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderColor: '#333',
  },
})