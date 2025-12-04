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
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { createPost } from '../services/postService';
import { isPastDueTime } from '../services/goalCompletionService';

export default function CreateGoalScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('daily');
  
  // Initialize with 6:00 PM
  const initialDate = new Date();
  initialDate.setHours(18, 0, 0, 0);
  
  const [dueTimeDate, setDueTimeDate] = useState(initialDate);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const onTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setDueTimeDate(selectedDate);
    }
  };

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
        dueTime: formatTime(dueTimeDate),
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
          <TouchableOpacity
            style={styles.timePickerButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={24} color="#4ecdc4" />
            <Text style={styles.timePickerText}>{formatTime(dueTimeDate)}</Text>
            <Ionicons name="chevron-down" size={24} color="#999" />
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={dueTimeDate}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              textColor="#fff"
              style={styles.timePicker}
            />
          )}

          {Platform.OS === 'ios' && showTimePicker && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
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
  timePickerButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  timePicker: {
    backgroundColor: '#1a1a1a',
    marginTop: 8,
  },
  doneButton: {
    backgroundColor: '#4ecdc4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
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
