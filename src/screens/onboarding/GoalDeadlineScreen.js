import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createAccountAndGoal } from '../../services/onboardingAccountService';
import { CommonActions } from '@react-navigation/native';

export default function GoalDeadlineScreen({ navigation, route }) {
  const initialDate = new Date();
  initialDate.setHours(18, 0, 0, 0);
  const { goalTitle } = route.params || {};

  const [goalDeadlineTime, setGoalDeadlineTime] = useState(
    route.params?.goalDeadlineTime || initialDate
  );
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
      setGoalDeadlineTime(selectedDate);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await createAccountAndGoal({
        ...route.params,
        goalDeadlineTime,
      });

      // Navigate to success screen
      navigation.navigate('Success', {
        ...route.params,
        goalDeadlineTime,
      });
    } catch (error) {
      console.error('Error creating account and goal:', error);
      Alert.alert('Error', 'Failed to create account and goal. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.title}>
          What time do you want to {goalTitle ? goalTitle.toLowerCase() : 'complete this goal'} by?
        </Text>
        <Text style={styles.subtitle}>This is your daily check-in deadline</Text>

        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => setShowTimePicker(true)}
          disabled={loading}
        >
          <Ionicons name="time-outline" size={24} color="#4ecdc4" />
          <Text style={styles.timePickerText}>{formatTime(goalDeadlineTime)}</Text>
          <Ionicons name="chevron-down" size={24} color="#999" />
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={goalDeadlineTime}
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

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.finishButton, loading && styles.finishButtonDisabled]}
          onPress={handleFinish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.finishButtonText}>Finish setup</Text>
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
    fontSize: 18,
    flex: 1,
    marginLeft: 12,
  },
  timePicker: {
    backgroundColor: '#1a1a1a',
    marginTop: 8,
  },
  doneButton: {
    backgroundColor: '#fff',
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
  actions: {
    padding: 20,
    paddingBottom: 40,
  },
  finishButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
