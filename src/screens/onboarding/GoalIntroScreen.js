import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAccountOnly } from '../../services/onboardingAccountService';
import { CommonActions } from '@react-navigation/native';

export default function GoalIntroScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const { firstName } = route.params || {};

  const handleSkip = async () => {
    setLoading(true);
    try {
      await createAccountOnly(route.params);
      
      // Navigate to main app
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        })
      );
    } catch (error) {
      console.error('Error creating account:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('FirstGoalTitle', route.params);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.greeting}>
          Nice to meet you, {firstName || 'friend'}.
        </Text>

        <Text style={styles.message}>
          ProveIt helps you stay accountable and crush your goals.
        </Text>

        <Text style={styles.message}>
          Let's get you started with your first goal.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          disabled={loading}
          style={styles.skipButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <Text style={styles.skipText}>Skip for now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  message: {
    fontSize: 18,
    color: '#ccc',
    lineHeight: 28,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    color: '#999',
    fontSize: 16,
  },
});
