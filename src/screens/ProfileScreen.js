import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import Avatar from '../components/Avatar';
import ImageCropper from '../components/ImageCropper';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { uploadProfileImageToS3 } from '../services/s3Service';
import { updateProfilePhoto } from '../services/userService';
import { clearCacheForKey } from '../services/imageCacheService';
import { createPost } from '../services/postService';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [cropperVisible, setCropperVisible] = useState(false);
  const [pickedUri, setPickedUri] = useState(null);

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

  const handleChangePhoto = async () => {
    if (!auth.currentUser) return Alert.alert('Not signed in');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert('Permission required', 'We need access to your photos to change your profile picture.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      // Handle both Expo SDK shapes: legacy { cancelled, uri, width, height } and new { assets: [{ uri, width, height }] }
      let picked;
      if (result.cancelled === false && result.assets == null && result.uri) {
        picked = result;
      } else if (result.assets && result.assets.length > 0) {
        picked = result.assets[0];
      } else {
        // user cancelled or unknown shape
        return;
      }

      const { uri } = picked;
      if (!uri || typeof uri !== 'string') {
        throw new Error('No valid image URI returned from picker');
      }

      // Open cropper modal so the user can position/zoom inside a circular frame
      setPickedUri(uri);
      setCropperVisible(true);
    } catch (error) {
      console.error('Profile photo update error:', error);
      Alert.alert('Error', 'Failed to update profile photo.');
    } finally {
      // uploading will be cleared after the crop/upload flow completes
    }
  };

  const handleCropCancel = () => {
    setCropperVisible(false);
    setPickedUri(null);
  };

  const handleCropped = async (croppedUri) => {
    setCropperVisible(false);
    setPickedUri(null);
    if (!croppedUri) return;

    setUploading(true);
    try {
      const uid = auth.currentUser.uid;
      // Upload to S3 under users/{uid}/profile.jpg
      await uploadProfileImageToS3(croppedUri, uid, 'profile.jpg');

      const s3Key = `users/${uid}/profile.jpg`;

      // Update Firestore user doc with photoPath
      await updateProfilePhoto(uid, s3Key);

      // Clear cached presigned URL for this user's profile key
      await clearCacheForKey(s3Key);

      Alert.alert('Profile Updated', 'Your profile picture has been updated.');
    } catch (err) {
      console.error('Upload/crop error:', err);
      Alert.alert('Error', 'Failed to upload new profile photo.');
    } finally {
      setUploading(false);
    }
  };

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

  const handleCreateMissedPost = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Get user's first goal
      const goalsSnapshot = await getDocs(
        collection(db, 'users', auth.currentUser.uid, 'goals')
      );
      
      if (goalsSnapshot.empty) {
        Alert.alert('No Goals', 'Create a goal first to test missed posts');
        return;
      }
      
      const firstGoal = goalsSnapshot.docs[0];
      const goalData = firstGoal.data();
      
      // Create missed goal post
      await createPost({
        userId: auth.currentUser.uid,
        userDisplayName: user?.displayName || 'User',
        goalId: firstGoal.id,
        type: 'missed_goal',
        message: `Missed goal: ${goalData.title}`,
      });
      
      Alert.alert('Success', 'Missed goal post created for demo!');
    } catch (error) {
      console.error('Error creating missed post:', error);
      Alert.alert('Error', 'Failed to create missed post');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <ImageCropper visible={cropperVisible} imageUri={pickedUri} onCancel={handleCropCancel} onCrop={handleCropped} />
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <TouchableOpacity onPress={handleChangePhoto} disabled={uploading} accessibilityLabel="Change profile photo">
            <Avatar userId={auth.currentUser?.uid} displayName={user?.displayName} photoPath={user?.photoPath} size={80} style={styles.avatar} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={uploading}
            accessibilityLabel="Change profile photo"
            style={styles.cameraOverlay}
          >
            <Ionicons name="camera" size={14} color="#222" />
          </TouchableOpacity>
        </View>
        {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}
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
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statNumber}>{userStats?.postsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Goals Completed</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={styles.statNumber}>{friendCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statNumber}>{userStats?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🍅</Text>
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
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Settings</Text>
          <Ionicons name="chevron-forward" size={24} color="#666" style={styles.chevron} />
        </TouchableOpacity>
        
        {/* Debug button - remove before production */}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#2a2a1a' }]}
          onPress={handleCreateMissedPost}
        >
          <Ionicons name="bug-outline" size={24} color="#ffa726" />
          <Text style={[styles.actionText, { color: '#ffa726' }]}>Create Missed Post (Debug)</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#000',
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
  avatarWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cameraOverlay: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
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
  statEmoji: {
    fontSize: 32,
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
