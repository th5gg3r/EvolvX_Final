// screens/auth/SignupScreen.js

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Surface,
  HelperText,
  Checkbox,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupScreen({ navigation }) {
  const { register, loading, error } = useAuth();

  const [username, setUsername]         = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [dateOfBirth, setDateOfBirth]   = useState(new Date());
  const [dobOpen, setDobOpen]           = useState(false);
  const [gender, setGender]             = useState('');
  const [height, setHeight]             = useState('');
  const [weight, setWeight]             = useState('');
  const [termsAccepted, setTerms]       = useState(false);

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!username) newErrors.username = 'Username is required';
    else if (username.length < 3) newErrors.username = 'Must be at least 3 characters';

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = 'Email is required';
    else if (!emailRe.test(email)) newErrors.email = 'Enter a valid email';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'At least 6 characters';

    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    // DOB age check
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    if (dateOfBirth < minDate) newErrors.dateOfBirth = 'Age cannot exceed 100 years';
    else if (dateOfBirth > maxDate) newErrors.dateOfBirth = 'You must be at least 13 years old';

    if (!gender) newErrors.gender = 'Please select your gender';

    if (height && (isNaN(height) || height <= 0)) newErrors.height = 'Enter a valid height';
    if (weight && (isNaN(weight) || weight <= 0)) newErrors.weight = 'Enter a valid weight';

    if (!termsAccepted) newErrors.terms = 'You must accept the terms and conditions';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    const isoDate = dateOfBirth.toISOString().split('T')[0];
    const result = await register(
      username,
      email,
      password,
      isoDate,
      gender,
      height ? parseFloat(height) : null,
      weight ? parseFloat(weight) : null
    );
    if (result.success) {
      navigation.replace('Home');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Surface style={styles.surface}>
            <View style={styles.logoBox}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Create Account</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                error={!!errors.username}
                style={styles.input}
              />
              {errors.username && (
                <HelperText type="error">{errors.username}</HelperText>
              )}

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                mode="outlined"
                error={!!errors.email}
                style={styles.input}
              />
              {errors.email && (
                <HelperText type="error">{errors.email}</HelperText>
              )}

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                mode="outlined"
                error={!!errors.password}
                style={styles.input}
              />
              {errors.password && (
                <HelperText type="error">{errors.password}</HelperText>
              )}

              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirm}
                secureTextEntry
                mode="outlined"
                error={!!errors.confirmPassword}
                style={styles.input}
              />
              {errors.confirmPassword && (
                <HelperText type="error">{errors.confirmPassword}</HelperText>
              )}

              <Text style={styles.section}>Personal Information</Text>

              <Button
                mode="outlined"
                onPress={() => setDobOpen(true)}
                style={styles.dateButton}
              >
                Date of Birth: {dateOfBirth.toLocaleDateString()}
              </Button>
              {errors.dateOfBirth && (
                <HelperText type="error">{errors.dateOfBirth}</HelperText>
              )}
              <DatePickerModal
                locale="en"
                mode="single"
                visible={dobOpen}
                onDismiss={() => setDobOpen(false)}
                date={dateOfBirth}
                onConfirm={({ date }) => {
                  setDateOfBirth(date);
                  setDobOpen(false);
                }}
                saveLabel="OK"
              />

              <Text style={{ marginTop: 16, marginBottom: 4 }}>Gender</Text>
              <Surface style={[styles.input, { padding: 0 }]}>
                <Picker
                  selectedValue={gender}
                  onValueChange={setGender}
                  style={{ height: 50, width: '100%' }}
                >
                  <Picker.Item label="Select gender..." value="" />
                  <Picker.Item label="Male" value="Male" />
                  <Picker.Item label="Female" value="Female" />
                </Picker>
              </Surface>
              {errors.gender && (
                <HelperText type="error">{errors.gender}</HelperText>
              )}

              <TextInput
                label="Height (cm, optional)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                mode="outlined"
                error={!!errors.height}
                style={styles.input}
              />
              {errors.height && (
                <HelperText type="error">{errors.height}</HelperText>
              )}

              <TextInput
                label="Weight (kg, optional)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                mode="outlined"
                error={!!errors.weight}
                style={styles.input}
              />
              {errors.weight && (
                <HelperText type="error">{errors.weight}</HelperText>
              )}

              <View style={styles.terms}>
                <Checkbox
                  status={termsAccepted ? 'checked' : 'unchecked'}
                  onPress={() => setTerms(!termsAccepted)}
                  color="#0099cc"
                />
                <Text style={styles.termsText}>
                  I accept the Terms & Conditions
                </Text>
              </View>
              {errors.terms && (
                <HelperText type="error">{errors.terms}</HelperText>
              )}

              {error && (
                <HelperText type="error">{error}</HelperText>
              )}

              <Button
                mode="contained"
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                Sign Up
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.replace('Login')}
                style={styles.link}
              >
                Already have an account? Login
              </Button>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  surface: { margin: 16, borderRadius: 10, elevation: 4, padding: 20 },
  logoBox: { alignItems: 'center', marginVertical: 20 },
  logo: { width: 80, height: 80 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0099cc' },
  form: { marginTop: 10 },
  input: { marginBottom: 8 },
  section: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  dateButton: { marginBottom: 16 },
  terms: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  termsText: { marginLeft: 8, flex: 1 },
  button: { marginTop: 16, paddingVertical: 6, backgroundColor: '#0099cc' },
  link: { marginTop: 16 },
});



