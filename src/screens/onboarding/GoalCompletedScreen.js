import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GoalCompletedScreen({ navigation }) {
  const handleGetStarted = async () => {
    // Clear the flag to allow navigation to MainTabs
    await AsyncStorage.removeItem('showingCongratsScreen');
    
    // Force a re-render by navigating to a dummy route and back
    // This will trigger AppNavigator to re-evaluate and show MainTabs
    setTimeout(() => {
      // The AppNavigator will automatically navigate to MainTabs
      // once it detects onboarding is complete and flag is cleared
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Congrats on setting up your first goal!</Text>
        <Text style={styles.subtitle}>Let's get started!</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleGetStarted}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: '#999',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});
