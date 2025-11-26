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
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPositions, setAnimationPositions] = useState(null);
  
  const cardRef = useRef(null);
  const tomatoButtonRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleReaction = async (reactionType) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to react');
      return;
    }

    // If already reacted, remove the reaction
    if (hasReacted) {
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
      }
      return;
    }

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
        if (onAnimationStart) {
          console.log('Calling onAnimationStart with positions:', { start: startPos, end: endPos });
          onAnimationStart({ start: startPos, end: endPos }, handleAnimationComplete);
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
      setHasReacted(true);
    } catch (error) {
      console.error('Add reaction error:', error);
      Alert.alert('Error', 'Failed to add reaction');
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setAnimationPositions(null);
  };

  return (
    <View style={styles.outerContainer}>
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
          <Text style={[styles.postText, styles.missedText]}>{post.message}</Text>
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
