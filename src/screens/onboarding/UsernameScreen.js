import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  validateUsernameFormat,
  checkUsernameAvailability,
} from '../../utils/onboardingValidation';
import { saveOnboardingProgress } from '../../services/onboardingService';

export default function UsernameScreen({ navigation, route }) {
  const [username, setUsername] = useState(route.params?.username || '');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);

  useEffect(() => {
    if (username) {
      saveOnboardingProgress('Username', {
        ...route.params,
        username,
      });
    }
  }, [username]);

  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      return;
    }

    const formatValidation = validateUsernameFormat(username);
    if (!formatValidation.valid) {
      setIsAvailable(null);
      return;
    }

    // Debounce username availability check
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const available = await checkUsernameAvailability(username);
        setIsAvailable(available);
        if (!available) {
          setError('Username is already taken');
        } else {
          setError('');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setError('Could not check username availability');
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleContinue = () => {
    const validation = validateUsernameFormat(username);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    if (!isAvailable) {
      setError('Please choose an available username');
      return;
    }

    navigation.navigate('Email', {
      ...route.params,
      username: username.trim(),
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Pick a username</Text>
        <Text style={styles.subtitle}>This will be your @handle</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={(text) => {
              setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
              setError('');
              setIsAvailable(null);
            }}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={handleContinue}
          />
          {checking && <ActivityIndicator size="small" color="#4ecdc4" />}
          {!checking && isAvailable === true && (
            <Ionicons name="checkmark-circle" size={24} color="#4ecdc4" />
          )}
          {!checking && isAvailable === false && (
            <Ionicons name="close-circle" size={24} color="#ff6b6b" />
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {isAvailable === true && (
          <Text style={styles.success}>Username is available!</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!username || !isAvailable) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!username || !isAvailable}
        >
          <Text style={styles.continueButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  atSymbol: {
    color: '#4ecdc4',
    fontSize: 18,
    marginRight: 4,
  },
  input: {
    flex: 1,
    padding: 16,
    color: '#fff',
    fontSize: 18,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 8,
  },
  success: {
    color: '#4ecdc4',
    fontSize: 14,
    marginTop: 8,
  },
  actions: {
    padding: 20,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
