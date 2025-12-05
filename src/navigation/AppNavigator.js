import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { checkOnboardingStatus } from '../services/onboardingService';
import { doc, onSnapshot } from 'firebase/firestore';

import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed, user:', user ? user.uid : 'null');
      setUser(user);
      
      if (user) {
        // Check if user has completed onboarding
        const completed = await checkOnboardingStatus(user.uid);
        console.log('Onboarding status for', user.uid, ':', completed);
        setOnboardingComplete(completed);
      } else {
        setOnboardingComplete(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Listen to real-time updates on user document for onboarding status
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('User document snapshot for', user.uid, ':', data.onboardingCompleted);
        setOnboardingComplete(data.onboardingCompleted || false);
      }
    }, (error) => {
      console.error('Error listening to user document:', error);
    });

    return unsubscribe;
  }, [user]);

  if (loading) {
    console.log('AppNavigator: Still loading...');
    return null; // You can add a loading screen here
  }

  console.log('AppNavigator rendering - User:', user ? user.uid : 'null', 'Onboarding complete:', onboardingComplete);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          onboardingComplete ? (
            <Stack.Screen name="MainTabs" component={MainTabs} />
          ) : (
            <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
          )
        ) : (
          <>
            <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
            <Stack.Screen name="AuthStack" component={AuthStack} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
