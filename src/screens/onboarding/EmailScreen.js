import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { validateEmail } from '../../utils/onboardingValidation';
import { saveOnboardingProgress } from '../../services/onboardingService';

export default function EmailScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (email) {
      saveOnboardingProgress('Email', {
        ...route.params,
        email,
      });
    }
  }, [email]);

  const handleContinue = () => {
    const validation = validateEmail(email);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    navigation.navigate('ProfilePicture', {
      ...route.params,
      email: email.trim(),
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
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>
          We'll use this to help you recover your account
        </Text>

        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor="#666"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError('');
          }}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={handleContinue}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.continueButton, !email && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!email}
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
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  error: {
    color: '#ff6b6b',
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
