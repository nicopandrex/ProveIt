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
import { validateFirstName } from '../../utils/onboardingValidation';
import { saveOnboardingProgress } from '../../services/onboardingService';

export default function FirstNameScreen({ navigation, route }) {
  const [firstName, setFirstName] = useState(route.params?.firstName || '');
  const [error, setError] = useState('');

  useEffect(() => {
    // Save progress whenever firstName changes
    if (firstName) {
      saveOnboardingProgress('FirstName', {
        ...route.params,
        firstName,
      });
    }
  }, [firstName]);

  const handleContinue = () => {
    const validation = validateFirstName(firstName);
    
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    navigation.navigate('Username', {
      ...route.params,
      firstName: firstName.trim(),
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
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>This name will be shown to your friends</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your first name"
          placeholderTextColor="#666"
          value={firstName}
          onChangeText={(text) => {
            setFirstName(text);
            setError('');
          }}
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={handleContinue}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.continueButton, !firstName && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!firstName}
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
