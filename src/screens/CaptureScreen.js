import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { checkForMissedGoals } from '../services/goalCompletionService';
import { auth, db } from '../../firebaseConfig';
import CameraView from '../components/CameraView';

export default function CaptureScreen({ navigation }) {
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [image, setImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

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
      const today = new Date().toDateString();
      
      const goalsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(goal => {
          // Only show goals NOT completed today
          const lastCompleted = goal.lastCompleted?.toDate?.()?.toDateString();
          return lastCompleted !== today;
        });
      
      setGoals(goalsData);
    });

    return unsubscribe;
  }, []);

  // Reset state when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setImage(null);
      setSelectedGoal(null);
      setShowCamera(false);
    });

    return unsubscribe;
  }, [navigation]);

  const takePhoto = () => {
    if (!selectedGoal) {
      return; // Button is disabled, but extra safety check
    }
    setShowCamera(true);
  };

  const handlePhotoTaken = (photo) => {
    setShowCamera(false);
    // Immediately navigate to CreatePost screen with the photo
    navigation.navigate('CreatePost', {
      goal: selectedGoal,
      image: photo,
    });
  };

  const renderGoal = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.goalItem,
        selectedGoal?.id === item.id && styles.selectedGoal,
      ]}
      onPress={() => setSelectedGoal(item)}
    >
      <Text style={styles.goalTitle}>{item.title}</Text>
      <Text style={styles.goalFrequency}>
        {item.frequency === 'daily' ? 'Daily' : 'Weekly'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <CameraView
          onPhotoTaken={handlePhotoTaken}
          onClose={() => setShowCamera(false)}
        />
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prove It</Text>
        <Text style={styles.headerSubtitle}>Select a goal and add proof</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select a Goal</Text>
        
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#4ecdc4" />
            <Text style={styles.emptyText}>All goals completed! 🎉</Text>
            <Text style={styles.emptySubtext}>
              Great work! Check back tomorrow or create new goals.
            </Text>
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

        <View style={styles.proveButtonContainer}>
          <TouchableOpacity
            style={[
              styles.proveButton,
              !selectedGoal && styles.proveButtonDisabled,
            ]}
            onPress={takePhoto}
            disabled={!selectedGoal}
          >
            <Ionicons 
              name="camera" 
              size={32} 
              color={selectedGoal ? "#000" : "#666"} 
            />
            <Text style={[
              styles.proveButtonText,
              !selectedGoal && styles.proveButtonTextDisabled,
              { marginLeft: 12 },
            ]}>
              PROVE IT
            </Text>
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 20,
  },
  goalsList: {
    maxHeight: 200,
  },
  goalItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedGoal: {
    borderColor: '#4ecdc4',
  },
  goalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  goalFrequency: {
    color: '#999',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  proveButtonContainer: {
    marginTop: 30,
  },
  proveButton: {
    backgroundColor: '#4ecdc4',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  proveButtonDisabled: {
    backgroundColor: '#333',
  },
  proveButtonText: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  proveButtonTextDisabled: {
    color: '#666',
  },
});
