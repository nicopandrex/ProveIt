import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { addReaction } from '../services/postService';
import { getCachedSecureImageUrl } from '../services/imageCacheService';
import { formatPostTimestamp } from '../utils/timestampUtils';
import { auth, db } from '../../firebaseConfig';

export default function PostCard({ post }) {
  const [reactions, setReactions] = useState({
    cheer: post.reactions?.cheer || 0,
    nudge: post.reactions?.nudge || 0,
    tomato: post.reactions?.tomato || 0,
  });
  
  const [secureImageUrl, setSecureImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [goalTitle, setGoalTitle] = useState(null);

  // Fetch goal title if this is a proof post
  useEffect(() => {
    const fetchGoalTitle = async () => {
      if (post.goalId && post.userId) {
        try {
          const goalRef = doc(db, 'users', post.userId, 'goals', post.goalId);
          const goalSnap = await getDoc(goalRef);
          if (goalSnap.exists()) {
            setGoalTitle(goalSnap.data().title);
          }
        } catch (error) {
          console.error('Failed to fetch goal title:', error);
        }
      }
    };

    fetchGoalTitle();
  }, [post.goalId, post.userId]);

  // Fetch secure image URL with ultra-fast caching
  useEffect(() => {
    const fetchSecureImageUrl = async () => {
      if (post.type === 'proof_post' && post.imageUrl && post.id) {
        try {
          // Use the optimized caching service
          const secureUrl = await getCachedSecureImageUrl(post.id);
          setSecureImageUrl(secureUrl);
        } catch (error) {
          console.error('Failed to get secure image URL:', error);
          // Fallback to original URL if secure URL fails
          setSecureImageUrl(post.imageUrl);
        }
      }
    };

    fetchSecureImageUrl();
  }, [post.id, post.type, post.imageUrl]);

  const handleReaction = async (reactionType) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to react');
      return;
    }

    try {
      await addReaction(post.id, reactionType, auth.currentUser.uid);

      // Update local state
      setReactions(prev => ({
        ...prev,
        [reactionType]: prev[reactionType] + 1,
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to add reaction');
    }
  };

  const renderPostContent = () => {
    switch (post.type) {
      case 'goal_created':
        return (
          <View style={styles.postContent}>
            <Text style={styles.postText}>{post.message}</Text>
          </View>
        );
      
      case 'proof_post':
        return (
          <View style={styles.postContent}>
            {goalTitle && (
              <View style={styles.goalCompletionBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#4ecdc4" />
                <Text style={styles.goalCompletionText}>
                  just completed: {goalTitle}
                </Text>
              </View>
            )}
            {post.imageUrl && (
              <View style={styles.imageContainer}>
                {imageLoading ? (
                  <View style={[styles.postImage, styles.loadingContainer]}>
                    <Text style={styles.loadingText}>Loading image...</Text>
                  </View>
                ) : secureImageUrl ? (
                  <Image 
                    source={{ uri: secureImageUrl }} 
                    style={styles.postImage}
                    onError={() => {
                      console.error('Failed to load secure image, falling back to original');
                      setSecureImageUrl(post.imageUrl);
                    }}
                  />
                ) : (
                  <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                )}
              </View>
            )}
            {post.caption && (
              <Text style={styles.caption}>{post.caption}</Text>
            )}
          </View>
        );
      
      case 'missed_goal':
        return (
          <View style={styles.postContent}>
            <Text style={[styles.postText, styles.missedText]}>{post.message}</Text>
          </View>
        );
      
      case 'streak_warning':
        return (
          <View style={styles.postContent}>
            <Text style={[styles.postText, styles.warningText]}>{post.message}</Text>
          </View>
        );
      
      default:
        return (
          <View style={styles.postContent}>
            <Text style={styles.postText}>{post.message || 'Unknown post type'}</Text>
          </View>
        );
    }
  };

  const getAvailableReactions = () => {
    switch (post.type) {
      case 'goal_created':
      case 'proof_post':
        return ['cheer'];
      case 'missed_goal':
        return ['tomato'];
      case 'streak_warning':
        return ['nudge'];
      default:
        return [];
    }
  };

  const availableReactions = getAvailableReactions();

  return (
    <View style={styles.container}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.userDisplayName?.charAt(0) || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{post.userDisplayName || 'User'}</Text>
            <Text style={styles.timestamp}>
              {formatPostTimestamp(post.timestamp)}
            </Text>
          </View>
        </View>
      </View>

      {renderPostContent()}

      <View style={styles.reactions}>
        {availableReactions.map((reaction) => (
          <TouchableOpacity
            key={reaction}
            style={styles.reactionButton}
            onPress={() => handleReaction(reaction)}
          >
            <Ionicons
              name={
                reaction === 'cheer' ? 'heart' :
                reaction === 'nudge' ? 'notifications' :
                'nutrition'
              }
              size={20}
              color={
                reaction === 'cheer' ? '#ff6b6b' :
                reaction === 'nudge' ? '#4ecdc4' :
                '#ffa726'
              }
            />
            <Text style={styles.reactionCount}>
              {reactions[reaction]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    marginBottom: 12,
  },
  goalCompletionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  goalCompletionText: {
    color: '#4ecdc4',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  postText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  missedText: {
    color: '#ff6b6b',
  },
  warningText: {
    color: '#ffa726',
  },
  imageContainer: {
    marginBottom: 8,
    width: '100%',
    aspectRatio: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  loadingContainer: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
  caption: {
    color: '#ccc',
    fontSize: 14,
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 4,
  },
  reactionCount: {
    color: '#999',
    fontSize: 14,
    marginLeft: 4,
  },
});
