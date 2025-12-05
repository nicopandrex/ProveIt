import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { isPastDueTime, checkForMissedGoals } from '../services/goalCompletionService';

export default function GoalsScreen({ navigation }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Check for missed goals when screen loads
    checkForMissedGoals(auth.currentUser.uid).catch(error => {
      console.warn('Failed to check missed goals:', error);
    });

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'goals')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGoals(goalsData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleDeleteGoal = async (goalId) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'goals', goalId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const renderGoal = ({ item }) => {
    const today = new Date().toDateString();
    const lastCompleted = item.lastCompleted?.toDate?.()?.toDateString();
    const isCompletedToday = lastCompleted === today;
    const pastDue = isPastDueTime(item.dueTime);
    
    // Check if goal was created today
    const createdToday = item.createdAt?.toDate?.()?.toDateString() === today;
    
    // Goal is "late" if past due time AND not completed today AND not created today
    const isLate = pastDue && !isCompletedToday && !createdToday;
    
    return (
      <View style={[
        styles.goalCard, 
        isCompletedToday && styles.goalCardCompleted,
        isLate && styles.goalCardOverdue
      ]}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <Text style={styles.goalTitle}>{item.title}</Text>
            {isCompletedToday && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4ecdc4" />
                <Text style={styles.completedBadgeText}>Done</Text>
              </View>
            )}
            {isLate && (
              <View style={styles.overdueBadge}>
                <Ionicons name="time" size={16} color="#ff6b6b" />
                <Text style={styles.overdueBadgeText}>Late</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteGoal(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.goalDetails}>
          <Text style={styles.goalFrequency}>
            {item.frequency === 'daily' ? 'Daily' : 'Weekly'}
          </Text>
          <Text style={[styles.goalTime, isLate && styles.goalTimeOverdue]}>
            Due: {item.dueTime} {isLate && '(Missed)'}
          </Text>
        </View>
        
        <View style={styles.goalStats}>
          <Text style={styles.streakText}>
            🔥 Streak: {item.currentStreak || 0} days
          </Text>
          <Text style={styles.completedText}>
            ✅ Total: {item.totalCompletions || item.completedDates?.length || 0}
          </Text>
        </View>
        
        {!isCompletedToday && (
          <TouchableOpacity
            style={[styles.postProofButton, isLate && styles.postProofButtonLate]}
            onPress={() => navigation.navigate('Capture', { 
              screen: 'CaptureMain',
              params: { goal: item }
            })}
          >
            <Text style={styles.postProofButtonText}>
              {isLate ? 'Post Late (Streak Broken)' : 'Post Proof'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Goals</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateGoal')}
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first goal to start proving yourself
          </Text>
          <TouchableOpacity
            style={styles.createFirstGoalButton}
            onPress={() => navigation.navigate('CreateGoal')}
          >
            <Text style={styles.createFirstGoalText}>Create Goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={goals}
          renderItem={renderGoal}
          keyExtractor={(item) => item.id}
          style={styles.goalsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsList: {
    flex: 1,
    padding: 16,
  },
  goalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalCardCompleted: {
    backgroundColor: '#1a2a1a',
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  goalCardOverdue: {
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a3a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  completedBadgeText: {
    color: '#4ecdc4',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  overdueBadgeText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#4ecdc4',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
  },
  goalDetails: {
    marginBottom: 12,
  },
  goalFrequency: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  goalTime: {
    color: '#999',
    fontSize: 14,
  },
  goalTimeOverdue: {
    color: '#ff6b6b',
    fontWeight: '600',
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streakText: {
    color: '#ffa726',
    fontSize: 14,
    fontWeight: '500',
  },
  completedText: {
    color: '#999',
    fontSize: 14,
  },
  postProofButton: {
    backgroundColor: '#4ecdc4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  postProofButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  postProofButtonLate: {
    backgroundColor: '#ff6b6b',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  createFirstGoalButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstGoalText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
