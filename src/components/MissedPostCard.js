import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addReaction, removeReaction } from '../services/postService';
import { formatPostTimestamp } from '../utils/timestampUtils';
import { auth } from '../../firebaseConfig';
import TomatoAnimation from './TomatoAnimation';
import Avatar from './Avatar';

export default function MissedPostCard({ post, onAnimationStart }) {
  const [reactions, setReactions] = useState({
    tomato: post.reactions?.tomato || 0,
  });
  
  const [hasReacted, setHasReacted] = useState(
    post.reactedUsers?.tomato?.[auth.currentUser?.uid] || false
  );
  
  const isProcessingRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPositions, setAnimationPositions] = useState(null);
  const [showSplat, setShowSplat] = useState(false);
  const splatOpacity = useRef(new Animated.Value(0)).current;
  const splatScale = useRef(new Animated.Value(0)).current;
  
  const cardRef = useRef(null);
  const tomatoButtonRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleReaction = async (reactionType) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to react');
      return;
    }

    // Check if already processing - use ref for synchronous check
    if (isProcessingRef.current) {
      return;
    }

    // If already reacted, remove the reaction
    if (hasReacted) {
      isProcessingRef.current = true;
      try {
        await removeReaction(post.id, reactionType, auth.currentUser.uid);
        
        // Update local state
        setReactions(prev => ({
          ...prev,
          [reactionType]: Math.max(0, prev[reactionType] - 1),
        }));
        setHasReacted(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to remove reaction');
      } finally {
        isProcessingRef.current = false;
      }
      return;
    }

    // Set hasReacted and processing flag immediately to prevent spam
    setHasReacted(true);
    isProcessingRef.current = true;

    // Handle tomato animation
    // Get button and card positions
    tomatoButtonRef.current?.measureInWindow((bx, by, bw, bh) => {
      cardRef.current?.measureInWindow((cx, cy, cw, ch) => {
        const screenHeight = Dimensions.get('window').height;
        const screenWidth = Dimensions.get('window').width;
        
        console.log('MissedPostCard position:', { cx, cy, cw, ch });
        
        // Calculate positions
        const startPos = {
          x: screenWidth + 50, // Off the right side of screen
          y: cy + ch / 2 - 30, // Same vertical level as the target card
        };
        const endPos = {
          x: cx + cw / 2 - 30, // Center of this specific missed card
          y: cy + ch / 2 - 30, // Center of this specific missed card
        };

        setAnimationPositions({ start: startPos, end: endPos });
        setIsAnimating(true);

        // Notify parent to show animation
        // Defer to next tick to avoid setState during render
        if (onAnimationStart) {
          console.log('Calling onAnimationStart with positions:', { start: startPos, end: endPos });
          setTimeout(() => {
            onAnimationStart({ start: startPos, end: endPos }, handleAnimationComplete);
          }, 0);
        } else {
          console.warn('onAnimationStart callback not provided!');
        }

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
      });
    });

    try {
      await addReaction(post.id, reactionType, auth.currentUser.uid);

      // Update local state
      setReactions(prev => ({
        ...prev,
        [reactionType]: prev[reactionType] + 1,
      }));
      
      // Reset processing flag after animation completes (allow unreacting later)
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500); // Wait for animation to finish
    } catch (error) {
      console.error('Add reaction error:', error);
      Alert.alert('Error', 'Failed to add reaction');
      // Reset hasReacted and processing flag on error
      setHasReacted(false);
      isProcessingRef.current = false;
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setAnimationPositions(null);
    
    // Show splat effect
    setShowSplat(true);
    Animated.parallel([
      Animated.timing(splatOpacity, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(splatScale, {
        toValue: 1.2,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(splatOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSplat(false);
          splatScale.setValue(0);
        });
      }, 600);
    });
  };

  return (
    <View style={styles.outerContainer}>
      {/* Splat Effect - Rendered inside card so it scrolls with card */}
      {showSplat && (
        <Animated.View
          style={[
            styles.splatOverlay,
            {
              opacity: splatOpacity,
              transform: [{ scale: splatScale }],
            },
          ]}
        >
          <Text style={styles.splatEmoji}>💥</Text>
        </Animated.View>
      )}
      
      <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]} ref={cardRef}>
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
              <Avatar userId={post.userId} displayName={post.userDisplayName} size={40} style={styles.avatar} />
            <View>
              <Text style={styles.userName}>{post.userDisplayName || 'User'}</Text>
              <Text style={styles.timestamp}>
                {formatPostTimestamp(post.timestamp)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.postContent}>
          <View style={styles.goalMissedBanner}>
            <Ionicons name="close-circle" size={20} color="#ff6b6b" />
            <Text style={styles.goalMissedText}>
              {post.message?.replace('Missed goal: ', 'missed: ') || post.message}
            </Text>
          </View>
        </View>

        <View style={styles.reactions}>
          <TouchableOpacity
            ref={tomatoButtonRef}
            style={styles.reactionButton}
            onPress={() => handleReaction('tomato')}
          >
            <Text style={styles.emojiIcon}>🍅</Text>
            <Text style={styles.reactionCount}>
              {reactions.tomato}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
  },
  splatOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  splatEmoji: {
    fontSize: 100,
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
  goalMissedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
  },
  goalMissedText: {
    color: '#ff6b6b',
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
});
