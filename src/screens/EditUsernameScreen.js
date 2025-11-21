import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { validateUsername, checkUsernameAvailability, createUsernameDocument, updateUsername } from '../services/userService';

export default function EditUsernameScreen({ navigation }) {
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, error: null });
  const [loading, setLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const username = userData.username;
        
        if (!username) {
          setIsFirstTime(true);
        } else {
          setCurrentUsername(username);
          setNewUsername(username);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Check username availability in real-time
  useEffect(() => {
    const checkUsername = async () => {
      if (!newUsername || newUsername.trim().length < 3) {
        setUsernameStatus({ checking: false, available: null, error: null });
        return;
      }

      // Don't check if it's the same as current username
      if (newUsername.toLowerCase() === currentUsername.toLowerCase()) {
        setUsernameStatus({ checking: false, available: true, error: null });
        return;
      }

      // Validate format first
      const validation = validateUsername(newUsername);
      if (!validation.valid) {
        setUsernameStatus({ checking: false, available: false, error: validation.error });
        return;
      }

      setUsernameStatus({ checking: true, available: null, error: null });

      try {
        const available = await checkUsernameAvailability(newUsername);
        setUsernameStatus({ 
          checking: false, 
          available, 
          error: available ? null : 'Username is already taken'
        });
      } catch (error) {
        setUsernameStatus({ checking: false, available: false, error: 'Error checking username' });
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [newUsername, currentUsername]);

  const handleSave = async () => {
    if (!newUsername || newUsername.trim().length === 0) {
      Alert.alert('Invalid Username', 'Please enter a username');
      return;
    }

    // Validate username
    const validation = validateUsername(newUsername);
    if (!validation.valid) {
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    if (!usernameStatus.available) {
      Alert.alert('Username Unavailable', 'Please choose a different username');
      return;
    }

    setLoading(true);
    try {
      if (isFirstTime) {
        // First time setting username
        const normalizedUsername = newUsername.toLowerCase().trim();
        
        // Create username document
        await createUsernameDocument(newUsername, auth.currentUser.uid);
        
        // Update user document
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          username: normalizedUsername,
          usernameDisplay: newUsername.trim(),
          usernameChangedAt: new Date(),
        });

        Alert.alert('Success', 'Username set successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Changing existing username
        await updateUsername(auth.currentUser.uid, newUsername);
        
        Alert.alert('Success', 'Username updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
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
        <Text style={styles.headerTitle}>
          {isFirstTime ? 'Set Username' : 'Edit Username'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {isFirstTime ? 'Choose Your Username' : 'Change Username'}
        </Text>
        
        <Text style={styles.subtitle}>
          {isFirstTime 
            ? 'Pick a unique username that friends can use to find you'
            : 'You can change your username once every 30 days'
          }
        </Text>

        <View style={styles.form}>
          <View style={styles.usernameContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {usernameStatus.checking && (
              <ActivityIndicator 
                size="small" 
                color="#4ecdc4" 
                style={styles.usernameIndicator}
              />
            )}
            {!usernameStatus.checking && usernameStatus.available === true && (
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color="#4ecdc4" 
                style={styles.usernameIndicator}
              />
            )}
            {!usernameStatus.checking && usernameStatus.available === false && (
              <Ionicons 
                name="close-circle" 
                size={24} 
                color="#ff6b6b" 
                style={styles.usernameIndicator}
              />
            )}
          </View>
          
          {usernameStatus.error && (
            <Text style={styles.errorText}>{usernameStatus.error}</Text>
          )}

          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Username Requirements:</Text>
            <Text style={styles.requirement}>• 3-20 characters long</Text>
            <Text style={styles.requirement}>• Letters, numbers, underscores, and dashes only</Text>
            <Text style={styles.requirement}>• Must be unique</Text>
            {!isFirstTime && (
              <Text style={styles.requirement}>• Can be changed once every 30 days</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!usernameStatus.available || loading) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!usernameStatus.available || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isFirstTime ? 'Set Username' : 'Save Changes'}
            </Text>
          )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  usernameContainer: {
    position: 'relative',
    marginBottom: 8,
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
  usernameIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  requirements: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
  },
  requirementsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  saveButton: {
    backgroundColor: '#4ecdc4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#333',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});



