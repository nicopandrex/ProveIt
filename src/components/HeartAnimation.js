import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';

export default function HeartAnimation({ onComplete }) {
  // Create 5 hearts with randomized properties
  const hearts = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
      // Randomize horizontal drift and delay
      drift: (Math.random() - 0.5) * 120, // -60 to 60
      delay: Math.random() * 150, // 0 to 150ms stagger
      size: 50 + Math.random() * 50, // 50 to 100
    }))
  ).current;

  useEffect(() => {
    // Animate all hearts
    const animations = hearts.map((heart) => {
      return Animated.parallel([
        // Float upward
        Animated.timing(heart.translateY, {
          toValue: -200,
          duration: 1200,
          delay: heart.delay,
          useNativeDriver: true,
        }),
        // Drift horizontally
        Animated.timing(heart.translateX, {
          toValue: heart.drift,
          duration: 1200,
          delay: heart.delay,
          useNativeDriver: true,
        }),
        // Scale: grow quickly then shrink
        Animated.sequence([
          Animated.timing(heart.scale, {
            toValue: 1,
            duration: 200,
            delay: heart.delay,
            useNativeDriver: true,
          }),
          Animated.timing(heart.scale, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        // Fade out near the end
        Animated.sequence([
          Animated.timing(heart.opacity, {
            toValue: 1,
            duration: 800,
            delay: heart.delay,
            useNativeDriver: true,
          }),
          Animated.timing(heart.opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete && onComplete();
    });
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {hearts.map((heart) => (
        <Animated.View
          key={heart.id}
          style={[
            styles.heart,
            {
              transform: [
                { translateY: heart.translateY },
                { translateX: heart.translateX },
                { scale: heart.scale },
              ],
              opacity: heart.opacity,
            },
          ]}
        >
          <Text style={{ fontSize: heart.size }}>❤️</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  heart: {
    position: 'absolute',
  },
});
