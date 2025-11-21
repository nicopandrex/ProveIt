import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { createPost } from '../services/postService';
import { isPastDueTime } from '../services/goalCompletionService';

export default function CreateGoalScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [dueTime, setDueTime] = useState('6:00 PM');
  const [loading, setLoading] = useState(false);

  const handleCreateGoal = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to create a goal');
      return;
    }

    setLoading(true);
    try {
      // Create goal - user can always complete it the day it's created
      const goalRef = doc(collection(db, 'users', auth.currentUser.uid, 'goals'));
      await setDoc(goalRef, {
        title: title.trim(),
        frequency,
        dueTime,
        completedDates: [],
        currentStreak: 0,
        longestStreak: 0,
        isPrivate: false,
        createdAt: new Date(),
      });

      // Create auto-post for goal creation
      await createPost({
        userId: auth.currentUser.uid,
        userDisplayName: auth.currentUser.displayName || 'User',
        goalId: goalRef.id,
        type: 'goal_created',
        message: `🎯 ${auth.currentUser.displayName || 'User'} just committed to: ${title.trim()}`,
      });

      Alert.alert('Success', 'Goal created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create goal');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Create Goal</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Goal Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Work out for 30 minutes"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.frequencyContainer}>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                frequency === 'daily' && styles.frequencyButtonActive,
              ]}
              onPress={() => setFrequency('daily')}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  frequency === 'daily' && styles.frequencyButtonTextActive,
                ]}
              >
                DAILY
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                frequency === 'weekly' && styles.frequencyButtonActive,
              ]}
              onPress={() => setFrequency('weekly')}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  frequency === 'weekly' && styles.frequencyButtonTextActive,
                ]}
              >
                WEEKLY
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Due Time</Text>
          <TextInput
            style={styles.input}
            placeholder="6:00 PM"
            value={dueTime}
            onChangeText={setDueTime}
            keyboardType="default"
          />
          <Text style={styles.helpText}>
            Enter time in 12-hour format (e.g., 6:00 PM)
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateGoal}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'PLAN IT'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  frequencyContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  frequencyButtonActive: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  frequencyButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  frequencyButtonTextActive: {
    color: '#000',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#4ecdc4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
