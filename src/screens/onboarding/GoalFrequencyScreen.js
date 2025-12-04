import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveOnboardingProgress } from '../../services/onboardingService';

export default function GoalFrequencyScreen({ navigation, route }) {
  const [frequency, setFrequency] = useState(route.params?.goalFrequency || 'daily');
  const { goalTitle } = route.params || {};

  useEffect(() => {
    saveOnboardingProgress('GoalFrequency', {
      ...route.params,
      goalFrequency: frequency,
    });
  }, [frequency]);

  const handleContinue = () => {
    navigation.navigate('GoalDeadline', {
      ...route.params,
      goalFrequency: frequency,
    });
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.title}>
          How often do you want to {goalTitle ? goalTitle.toLowerCase() : 'do this'}?
        </Text>

        <TouchableOpacity
          style={[
            styles.frequencyButton,
            frequency === 'daily' && styles.frequencyButtonActive,
          ]}
          onPress={() => setFrequency('daily')}
        >
          <Ionicons
            name="calendar"
            size={24}
            color={frequency === 'daily' ? '#000' : '#4ecdc4'}
          />
          <Text
            style={[
              styles.frequencyButtonText,
              frequency === 'daily' && styles.frequencyButtonTextActive,
            ]}
          >
            DAILY
          </Text>
          <Text
            style={[
              styles.frequencyDescription,
              frequency === 'daily' && styles.frequencyDescriptionActive,
            ]}
          >
            Complete this goal every day
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.frequencyButton,
            frequency === 'weekly' && styles.frequencyButtonActive,
          ]}
          onPress={() => setFrequency('weekly')}
        >
          <Ionicons
            name="calendar-outline"
            size={24}
            color={frequency === 'weekly' ? '#000' : '#4ecdc4'}
          />
          <Text
            style={[
              styles.frequencyButtonText,
              frequency === 'weekly' && styles.frequencyButtonTextActive,
            ]}
          >
            WEEKLY
          </Text>
          <Text
            style={[
              styles.frequencyDescription,
              frequency === 'weekly' && styles.frequencyDescriptionActive,
            ]}
          >
            Complete this goal once a week
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Next</Text>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  frequencyButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  frequencyButtonActive: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  frequencyButtonText: {
    color: '#999',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  frequencyButtonTextActive: {
    color: '#000',
  },
  frequencyDescription: {
    color: '#666',
    fontSize: 14,
  },
  frequencyDescriptionActive: {
    color: '#000',
    opacity: 0.7,
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
  continueButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
