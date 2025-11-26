import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { addReaction, removeReaction } from '../services/postService';
import { getCachedSecureImageUrl } from '../services/imageCacheService';
import { formatPostTimestamp } from '../utils/timestampUtils';
import { auth, db } from '../../firebaseConfig';
import TomatoAnimation from './TomatoAnimation';

export default function PostCard({ post }) {
  const [reactions, setReactions] = useState({
    cheer: post.reactions?.cheer || 0,
    nudge: post.reactions?.nudge || 0,
    tomato: post.reactions?.tomato || 0,
  });
  
  const [hasReactedCheer, setHasReactedCheer] = useState(
    post.reactedUsers?.cheer?.[auth.currentUser?.uid] || false
  );
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [animationPositions, setAnimationPositions] = useState(null);
  
  const cardRef = useRef(null);
  const tomatoButtonRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  const [secureImageUrl, setSecureImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [goalTitle, setGoalTitle] = useState(null);
  const [goalTitleLoading, setGoalTitleLoading] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const MAX_RETRIES = 3;

  // Fetch goal title if this is a proof post
  useEffect(() => {
    const fetchGoalTitle = async () => {
      if (post.goalId && post.userId) {
        setGoalTitleLoading(true);
        try {
          const goalRef = doc(db, 'users', post.userId, 'goals', post.goalId);
          const goalSnap = await getDoc(goalRef);
          if (goalSnap.exists()) {
            setGoalTitle(goalSnap.data().title);
          }
        } catch (error) {
          console.error('Failed to fetch goal title:', error);
        } finally {
          setGoalTitleLoading(false);
        }
      } else if (post.type !== 'proof_post') {
        // Non-proof posts don't need goal title
        setGoalTitleLoading(false);
      }
    };

    fetchGoalTitle();
  }, [post.goalId, post.userId, post.type]);

  // Fetch secure image URL with ultra-fast caching and retry
  useEffect(() => {
    const fetchSecureImageUrl = async () => {
      if (post.type === 'proof_post' && post.imageUrl && post.id) {
        setImageLoading(true);
        try {
          const secureUrl = await getCachedSecureImageUrl(post.id);
          setSecureImageUrl(secureUrl);
          setImageError(false);
        } catch (error) {
          console.error('Failed to get secure image URL:', error);
          setSecureImageUrl(post.imageUrl);
          setImageError(true);
        } finally {
          setImageLoading(false);
        }
      } else if (post.type !== 'proof_post') {
        // Non-proof posts don't need images
        setImageLoading(false);
      }
    };

    fetchSecureImageUrl();
  }, [post.id, post.type, post.imageUrl, retryCount]);

  // Check if content is ready to display (for proof posts)
  useEffect(() => {
    if (post.type === 'proof_post') {
      // For proof posts, wait for both goal title and image
      const titleReady = !goalTitleLoading && (goalTitle || !post.goalId);
      const imageReady = !imageLoading && (secureImageUrl || !post.imageUrl);
      setContentReady(titleReady && imageReady);
    } else {
      // Other post types are always ready
      setContentReady(true);
    }
  }, [post.type, goalTitleLoading, goalTitle, post.goalId, imageLoading, secureImageUrl, post.imageUrl]);

  const handleReaction = async (reactionType) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to react');
      return;
    }

    // Handle cheer toggle
    if (reactionType === 'cheer') {
      if (hasReactedCheer) {
        try {
          await removeReaction(post.id, reactionType, auth.currentUser.uid);
          setReactions(prev => ({
            ...prev,
            [reactionType]: Math.max(0, prev[reactionType] - 1),
          }));
          setHasReactedCheer(false);
        } catch (error) {
          Alert.alert('Error', 'Failed to remove reaction');
        }
        return;
      }
    }

    // Check cooldown for tomato reactions
    if (reactionType === 'tomato' && isCooldown) {
      return;
    }

    // Handle tomato animation
    if (reactionType === 'tomato') {
      // Get button and card positions
      tomatoButtonRef.current?.measureInWindow((bx, by, bw, bh) => {
        cardRef.current?.measureInWindow((cx, cy, cw, ch) => {
          const screenHeight = Dimensions.get('window').height;
          const screenWidth = Dimensions.get('window').width;
          
          console.log('Card position:', { cx, cy, cw, ch });
          
          // Calculate positions
          const startPos = {
            x: screenWidth - 80, // Bottom right of screen
            y: screenHeight - 120, // Bottom right of screen
          };
          const endPos = {
            x: cx + cw / 2 - 30, // Center of card horizontally (using actual card position)
            y: cy + ch / 2 - 30, // Center of card vertically (using actual card position)
          };

          setAnimationPositions({ start: startPos, end: endPos });
          setIsAnimating(true);
          setIsCooldown(true);

          // Trigger shake effect after 800ms (when tomato hits)
          setTimeout(() => {
            Animated.sequence([
              Animated.timing(shakeAnim, {
                toValue: 8,
                duration: 50,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnim, {
                toValue: -8,
                duration: 50,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnim, {
                toValue: 8,
                duration: 50,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnim, {
                toValue: -8,
                duration: 50,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true,
              }),
            ]).start();
          }, 800);

          // Cooldown timer (3 seconds)
          setTimeout(() => {
            setIsCooldown(false);
          }, 3000);
        });
      });
    }

    try {
      await addReaction(post.id, reactionType, auth.currentUser.uid);

      // Update local state
      setReactions(prev => ({
        ...prev,
        [reactionType]: prev[reactionType] + 1,
      }));
      
      if (reactionType === 'cheer') {
        setHasReactedCheer(true);
      }
    } catch (error) {
      console.error('Add reaction error:', error);
      Alert.alert('Error', 'Failed to add reaction');
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setAnimationPositions(null);
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
        // Show loading until both title and image are ready
        if (!contentReady) {
          return (
            <View style={styles.postContent}>
              <View style={[styles.postImage, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#4ecdc4" />
              </View>
            </View>
          );
        }
        
        return (
          <View style={styles.postContent}>
            {post.goalId && goalTitle && (
              <View style={styles.goalCompletionBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#4ecdc4" />
                <Text style={styles.goalCompletionText}>
                  just completed: {goalTitle}
                </Text>
              </View>
            )}
            {post.imageUrl && secureImageUrl && (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: secureImageUrl }} 
                  style={styles.postImage}
                  onError={() => {
                    if (retryCount < MAX_RETRIES && !imageError) {
                      console.log(`Image load failed, retry ${retryCount + 1}/${MAX_RETRIES}`);
                      setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                      }, 1000 * (retryCount + 1));
                    } else {
                      console.error('Failed to load secure image after retries, using fallback');
                      setSecureImageUrl(post.imageUrl);
                      setImageError(true);
                    }
                  }}
                />
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
    <View style={styles.outerContainer}>
      {/* Tomato Animation Overlay - Above everything */}
      {isAnimating && animationPositions && (
        <TomatoAnimation
          startPosition={animationPositions.start}
          endPosition={animationPositions.end}
          onComplete={handleAnimationComplete}
        />
      )}
      
      <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]} ref={cardRef}>

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
            ref={reaction === 'tomato' ? tomatoButtonRef : null}
            style={[
              styles.reactionButton,
              reaction === 'tomato' && isCooldown && styles.reactionButtonDisabled,
            ]}
            onPress={() => handleReaction(reaction)}
            disabled={reaction === 'tomato' && isCooldown}
          >
            {reaction === 'cheer' ? (
              <Text style={styles.emojiIcon}>{hasReactedCheer ? '❤️' : '🤍'}</Text>
            ) : (
              <Ionicons
                name={
                  reaction === 'nudge' ? 'notifications' : 'nutrition'
                }
                size={20}
                color={
                  reaction === 'nudge' ? '#4ecdc4' : '#ffa726'
                }
                style={reaction === 'tomato' && isCooldown && styles.disabledIcon}
              />
            )}
            <Text style={[
              styles.reactionCount,
              reaction === 'tomato' && isCooldown && styles.disabledText,
            ]}>
              {reactions[reaction]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
  },
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
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
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
  emojiIcon: {
    fontSize: 20,
  },
  reactionButtonDisabled: {
    opacity: 0.5,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});
