import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, loading, error } = useAuth();

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    // 1) client-side validation
    const okEmail    = validateEmail();
    const okPassword = validatePassword();
    if (!okEmail || !okPassword) return;

    console.log('🔑 Attempting login for:', email);
    try {
      const result = await login(email.trim(), password);
      console.log('🔑 login() returned:', result);

      if (result.success) {
        console.log('🚀 Login success – navigating to Home');
        navigation.replace('Home');   // <-- make sure “Home” matches your Stack.Screen name
      } else {
        console.warn('❌ login() failed with error:', result.error);
        // you already render `error` from context under the form
      }
    } catch (e) {
      console.error('🔥 handleLogin threw:', e);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Surface style={styles.surface}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>EvolvX</Text>
              <Text style={styles.subtitle}>Track. Compete. Evolve.</Text>
            </View>
            
            <View style={styles.formContainer}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                onBlur={validateEmail}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                error={!!emailError}
              />
              {emailError ? <HelperText type="error">{emailError}</HelperText> : null}
              
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                onBlur={validatePassword}
                mode="outlined"
                style={styles.input}
                secureTextEntry
                error={!!passwordError}
              />
              {passwordError ? <HelperText type="error">{passwordError}</HelperText> : null}
              
              {error ? <HelperText type="error">{error}</HelperText> : null}
              
              <Button 
                mode="contained" 
                onPress={handleLogin} 
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                Login
              </Button>
              
              <Button 
                mode="text" 
                onPress={() => navigation.navigate('Signup')}
                style={styles.linkButton}
              >
                Don't have an account? Sign up
              </Button>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  surface: {
    margin: 16,
    borderRadius: 10,
    elevation: 4,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#0099cc', // Blue from the EvolvX logo
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    marginTop: 10,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
    backgroundColor: '#0099cc', // Blue from the EvolvX logo
  },
  linkButton: {
    marginTop: 16,
  },
});

export default LoginScreen;


