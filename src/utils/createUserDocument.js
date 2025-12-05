import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Create or update a user document in Firestore
 * Call this when a user logs in to ensure their document exists
 */
export const ensureUserDocument = async (user) => {
  if (!user) return;
  
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    // Only create if doesn't exist
    if (!userSnap.exists()) {
      console.log('Creating user document for:', user.uid);
      await setDoc(userRef, {
        displayName: user.displayName || 'User',
        email: user.email,
        photoURL: user.photoURL || null,
        friends: [],
        stats: {
          tomatoCount: 0,
          postsCompleted: 0,
        },
        createdAt: new Date(),
      });
      console.log('User document created successfully');
    } else {
      console.log('User document already exists');
      // Ensure friends array exists on existing users
      const userData = userSnap.data();
      const updates = {};
      
      if (!userData.friends) {
        updates.friends = [];
      }
      
      // Add username fields if they don't exist (for existing users)
      if (!userData.username) {
        updates.username = null;
        updates.usernameDisplay = null;
        updates.usernameChangedAt = null;
      }
      
      // Add onboardingCompleted field for existing users (assume completed if account exists)
      if (userData.onboardingCompleted === undefined) {
        updates.onboardingCompleted = true;
        console.log('Setting onboardingCompleted to true for existing user');
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
        console.log('Updated user document with missing fields');
      }
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
    throw error;
  }
};

