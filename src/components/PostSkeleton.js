import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function PostSkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.avatar, { opacity }]} />
        <View style={styles.headerText}>
          <Animated.View style={[styles.name, { opacity }]} />
          <Animated.View style={[styles.time, { opacity }]} />
        </View>
      </View>

      {/* Content */}
      <Animated.View style={[styles.banner, { opacity }]} />
      <Animated.View style={[styles.image, { opacity }]} />

      {/* Reactions */}
      <View style={styles.reactions}>
        <Animated.View style={[styles.reactionButton, { opacity }]} />
        <Animated.View style={[styles.reactionButton, { opacity }]} />
        <Animated.View style={[styles.reactionButton, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    height: 14,
    width: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginBottom: 6,
  },
  time: {
    height: 12,
    width: 80,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  banner: {
    height: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 12,
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionButton: {
    height: 20,
    width: 50,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginRight: 16,
  },
});
