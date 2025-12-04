import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ProveIt</Text>
        <Text style={styles.tagline}>Achieve your goals with social accountability</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('AppOverview')}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  actions: {
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});
