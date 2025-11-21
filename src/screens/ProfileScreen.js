import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to user document changes
    const unsubscribe = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setUser(userData);
          setUserStats(userData.stats || {});
          setFriendCount((userData.friends || []).length);
        }
      }
    );

    return unsubscribe;
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0) || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
        {user?.username ? (
          <Text style={styles.username}>@{user.usernameDisplay || user.username}</Text>
        ) : (
          <View style={styles.noUsernameContainer}>
            <Text style={styles.noUsernameText}>No username set</Text>
            <TouchableOpacity 
              style={styles.setUsernameButton}
              onPress={() => navigation.navigate('EditUsername')}
            >
              <Text style={styles.setUsernameButtonText}>Set Username</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Stats</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#4ecdc4" />
            <Text style={styles.statNumber}>{userStats?.postsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Goals Completed</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color="#4ecdc4" />
            <Text style={styles.statNumber}>{friendCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#ffa726" />
            <Text style={styles.statNumber}>{userStats?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="nutrition" size={32} color="#ff6b6b" />
            <Text style={styles.statNumber}>{userStats?.tomatoCount || 0}</Text>
            <Text style={styles.statLabel}>Tomatoes Received</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Friends')}
        >
          <Ionicons name="people-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Friends</Text>
          <Ionicons name="chevron-forward" size={24} color="#666" style={styles.chevron} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditUsername')}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>
            {user?.username ? 'Edit Username' : 'Set Username'}
          </Text>
          <Ionicons name="chevron-forward" size={24} color="#666" style={styles.chevron} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Settings</Text>
          <Ionicons name="chevron-forward" size={24} color="#666" style={styles.chevron} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
          <Text style={[styles.actionText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#4ecdc4',
    marginBottom: 4,
  },
  noUsernameContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  noUsernameText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  setUsernameButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setUsernameButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 16,
    color: '#999',
  },
  statsContainer: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
  signOutButton: {
    backgroundColor: '#2a1a1a',
  },
  signOutText: {
    color: '#ff6b6b',
  },
});
