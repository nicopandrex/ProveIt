import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function TomatoAnimation({ startPosition, endPosition, onComplete }) {
  const translateX = useRef(new Animated.Value(startPosition.x)).current;
  const translateY = useRef(new Animated.Value(startPosition.y)).current;
  const tomatoScale = useRef(new Animated.Value(1)).current;
  const tomatoOpacity = useRef(new Animated.Value(1)).current;
  const tomatoRotation = useRef(new Animated.Value(0)).current;
  
  const splatScale = useRef(new Animated.Value(0)).current;
  const splatOpacity = useRef(new Animated.Value(0)).current;

  console.log('TomatoAnimation mounted', { startPosition, endPosition });

  useEffect(() => {
    // Calculate trajectory
    const deltaX = endPosition.x - startPosition.x;
    const deltaY = endPosition.y - startPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Math.min(Math.max(distance * 1.5, 600), 1000); // 600-1000ms based on distance

    // Create arc effect by going up first, then down
    const midY = startPosition.y - 80; // Arc height

    // Tomato flying animation with arc trajectory
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: endPosition.x,
        duration,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: midY,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: endPosition.y,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(tomatoRotation, {
        toValue: 720,
        duration,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(tomatoScale, {
          toValue: 1.2,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(tomatoScale, {
          toValue: 0.8,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Hide tomato and show splat
      Animated.parallel([
        Animated.timing(tomatoOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
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
        // Fade out splat
        setTimeout(() => {
          Animated.timing(splatOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            if (onComplete) {
              onComplete();
            }
          });
        }, 600);
      });
    });
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Flying Tomato */}
      <Animated.View
        style={[
          styles.tomato,
          {
            transform: [
              { translateX },
              { translateY },
              { scale: tomatoScale },
              { rotate: tomatoRotation.interpolate({
                inputRange: [0, 720],
                outputRange: ['0deg', '720deg'],
              })},
            ],
            opacity: tomatoOpacity,
          },
        ]}
      >
        <Text style={styles.tomatoEmoji}>🍅</Text>
      </Animated.View>

      {/* Splat Effect */}
      <Animated.View
        style={[
          styles.splat,
          {
            transform: [
              { translateX: endPosition.x },
              { translateY: endPosition.y },
              { scale: splatScale },
            ],
            opacity: splatOpacity,
          },
        ]}
      >
        <Text style={styles.splatEmoji}>💥</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999, // For Android
    pointerEvents: 'none',
  },
  tomato: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  tomatoEmoji: {
    fontSize: 50,
  },
  splat: {
    position: 'absolute',
    width: 120,
    height: 120,
    marginLeft: -60, // Center the splat
    marginTop: -60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  splatEmoji: {
    fontSize: 100,
  },
});