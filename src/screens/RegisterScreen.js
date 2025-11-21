import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { validateUsername, checkUsernameAvailability, createUsernameDocument } from '../services/userService';

export default function RegisterScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, error: null });
  const [emailStatus, setEmailStatus] = useState({ checking: false, available: null, error: null });

  // Check username availability in real-time
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.trim().length < 3) {
        setUsernameStatus({ checking: false, available: null, error: null });
        return;
      }

      // Validate format first
      const validation = validateUsername(username);
      if (!validation.valid) {
        setUsernameStatus({ checking: false, available: false, error: validation.error });
        return;
      }

      setUsernameStatus({ checking: true, available: null, error: null });

      try {
        const available = await checkUsernameAvailability(username);
        setUsernameStatus({ 
          checking: false, 
          available, 
          error: available ? null : 'Username is already taken'
        });
      } catch (error) {
        console.error('Username check error:', error);
        setUsernameStatus({ 
          checking: false, 
          available: false, 
          error: 'Unable to check username availability. Please try again.' 
        });
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  // Check email availability in real-time
  useEffect(() => {
    const checkEmail = async () => {
      if (!email || !email.includes('@')) {
        setEmailStatus({ checking: false, available: null, error: null });
        return;
      }

      setEmailStatus({ checking: true, available: null, error: null });

      try {
        // Use Firebase Auth to check if email is already in use
        const signInMethods = await fetchSignInMethodsForEmail(auth, email.toLowerCase().trim());
        const isEmailTaken = signInMethods.length > 0;
        
        console.log('Email check result:', { email, isEmailTaken, signInMethods });
        
        setEmailStatus({ 
          checking: false, 
          available: !isEmailTaken, 
          error: isEmailTaken ? 'Email already in use' : null
        });
      } catch (error) {
        console.error('Email check error:', error);
        console.error('Error details:', { code: error.code, message: error.message });
        setEmailStatus({ 
          checking: false, 
          available: false, 
          error: `Unable to check email availability: ${error.message}` 
        });
      }
    };

    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleRegister = async () => {
    if (!displayName || !username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Validate username
    const validation = validateUsername(username);
    if (!validation.valid) {
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    if (!usernameStatus.available) {
      Alert.alert('Username Unavailable', 'Please choose a different username');
      return;
    }

    if (emailStatus.available === false) {
      Alert.alert(
        'Email Already in Use', 
        'This email is already registered. Would you like to sign in instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, { displayName });
      
      const normalizedUsername = username.toLowerCase().trim();
      
      // Create username document
      await createUsernameDocument(username, user.uid);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        username: normalizedUsername,
        usernameDisplay: username.trim(),
        email,
        photoURL: null,
        friends: [],
        stats: {
          tomatoCount: 0,
          postsCompleted: 0,
        },
        createdAt: new Date(),
        usernameChangedAt: null,
      });
      
      // Navigation will be handled by AppNavigator
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific username conflicts
      if (error.message.includes('username') || error.code === 'permission-denied') {
        Alert.alert('Username Taken', 'This username is already taken. Please choose a different one.');
      } else {
        Alert.alert('Registration Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Join ProveIt</Text>
        <Text style={styles.subtitle}>Start proving your goals</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
          />
          
          <View style={styles.usernameContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameStatus.checking && (
              <ActivityIndicator 
                size="small" 
                color="#4ecdc4" 
                style={styles.usernameIndicator}
              />
            )}
            {!usernameStatus.checking && usernameStatus.available === true && (
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color="#4ecdc4" 
                style={styles.usernameIndicator}
              />
            )}
            {!usernameStatus.checking && usernameStatus.available === false && (
              <Ionicons 
                name="close-circle" 
                size={24} 
                color="#ff6b6b" 
                style={styles.usernameIndicator}
              />
            )}
          </View>
          {usernameStatus.error && (
            <Text style={styles.errorText}>{usernameStatus.error}</Text>
          )}
          
          <View style={styles.emailContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailStatus.checking && (
              <ActivityIndicator 
                size="small" 
                color="#4ecdc4" 
                style={styles.emailIndicator}
              />
            )}
            {!emailStatus.checking && emailStatus.available === true && (
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color="#4ecdc4" 
                style={styles.emailIndicator}
              />
            )}
            {!emailStatus.checking && emailStatus.available === false && (
              <Ionicons 
                name="close-circle" 
                size={24} 
                color="#ff6b6b" 
                style={styles.emailIndicator}
              />
            )}
          </View>
          {emailStatus.error && (
            <Text style={styles.errorText}>{emailStatus.error}</Text>
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  usernameContainer: {
    position: 'relative',
  },
  usernameIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  emailContainer: {
    position: 'relative',
  },
  emailIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#999',
    fontSize: 14,
  },
});
