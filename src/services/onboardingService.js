import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const ONBOARDING_PROGRESS_KEY = 'onboarding_progress';

/**
 * Check if user has completed onboarding
 */
export async function checkOnboardingStatus(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    return userSnap.data().onboardingCompleted || false;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as complete for a user
 */
export async function markOnboardingComplete(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      onboardingCompleted: true,
    });
    
    // Clear saved progress
    await clearOnboardingProgress();
    
    return true;
  } catch (error) {
    console.error('Error marking onboarding complete:', error);
    throw error;
  }
}

/**
 * Save partial onboarding progress to AsyncStorage
 */
export async function saveOnboardingProgress(step, data) {
  try {
    const progress = {
      step,
      data,
      timestamp: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving onboarding progress:', error);
  }
}

/**
 * Load saved onboarding progress from AsyncStorage
 */
export async function loadOnboardingProgress() {
  try {
    const progressJson = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);
    
    if (!progressJson) {
      return null;
    }
    
    return JSON.parse(progressJson);
  } catch (error) {
    console.error('Error loading onboarding progress:', error);
    return null;
  }
}

/**
 * Clear saved onboarding progress
 */
export async function clearOnboardingProgress() {
  try {
    await AsyncStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  } catch (error) {
    console.error('Error clearing onboarding progress:', error);
  }
}
