import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { checkOnboardingStatus } from '../services/onboardingService';
import { doc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showingCongratsScreen, setShowingCongratsScreen] = useState(false);

  useEffect(() => {
    const checkCongratsFlag = async () => {
      const flag = await AsyncStorage.getItem('showingCongratsScreen');
      if (flag === 'true') {
        setShowingCongratsScreen(true);
      }
    };
    checkCongratsFlag();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed, user:', user ? user.uid : 'null');
      setUser(user);
      
      if (user) {
        // Check if we're showing the congrats screen
        const congratsFlag = await AsyncStorage.getItem('showingCongratsScreen');
        console.log('Congrats flag:', congratsFlag);
        
        if (congratsFlag === 'true') {
          // Don't check onboarding status, stay in OnboardingStack
          setShowingCongratsScreen(true);
          setOnboardingComplete(false);
        } else {
          // Check if user has completed onboarding
          const completed = await checkOnboardingStatus(user.uid);
          console.log('Onboarding status for', user.uid, ':', completed);
          setOnboardingComplete(completed);
        }
      } else {
        setOnboardingComplete(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Separate effect to poll for flag changes only when showing congrats screen
  useEffect(() => {
    if (!showingCongratsScreen) return;

    console.log('Starting poll for congrats flag changes');
    const interval = setInterval(async () => {
      const flag = await AsyncStorage.getItem('showingCongratsScreen');
      if (flag !== 'true') {
        console.log('Congrats flag cleared, checking onboarding status');
        setShowingCongratsScreen(false);
        if (user) {
          const completed = await checkOnboardingStatus(user.uid);
          setOnboardingComplete(completed);
        }
      }
    }, 500);

    return () => {
      console.log('Clearing congrats flag poll interval');
      clearInterval(interval);
    };
  }, [showingCongratsScreen, user]);

  // Listen to real-time updates on user document for onboarding status
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('User document snapshot for', user.uid, ':', data.onboardingCompleted);
        // Only update if not showing congrats screen
        if (!showingCongratsScreen) {
          setOnboardingComplete(data.onboardingCompleted || false);
        }
      }
    }, (error) => {
      console.error('Error listening to user document:', error);
    });

    return unsubscribe;
  }, [user, showingCongratsScreen]);

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
