import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SuccessScreen({ navigation, route }) {
  const { firstName } = route.params || {};
  const [loading, setLoading] = React.useState(false);

  const handleContinue = () => {
    setLoading(true);
    // AppNavigator is now listening to real-time changes on the user document
    // When onboardingCompleted was set to true during account creation,
    // AppNavigator will automatically switch to MainTabs
    // We just need to wait a moment for the state to propagate
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={120} color="#4ecdc4" />

        <Text style={styles.title}>You're all set, {firstName}!</Text>

        <Text style={styles.message}>Your journey starts now.</Text>

        <Text style={styles.message}>
          Stay consistent, build your streak, and ProveIt every day.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.continueButton, loading && styles.continueButtonDisabled]} 
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.continueButtonText}>Go to my feed</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 32,
    marginBottom: 24,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 12,
  },
  actions: {
    padding: 20,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
