import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Validate username format
 * Requirements: 3-20 characters, alphanumeric plus underscore/dash
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  // Allow alphanumeric, underscore, and dash
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and dashes' };
  }
  
  return { valid: true, error: null };
};

/**
 * Check if username is available
 */
export const checkUsernameAvailability = async (username) => {
  try {
    const normalizedUsername = username.toLowerCase().trim();
    const usernameDoc = await getDoc(doc(db, 'usernames', normalizedUsername));
    return !usernameDoc.exists();
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw new Error('Failed to check username availability');
  }
};

/**
 * Create username document (called during registration)
 */
export const createUsernameDocument = async (username, userId) => {
  try {
    const normalizedUsername = username.toLowerCase().trim();
    await setDoc(doc(db, 'usernames', normalizedUsername), {
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating username document:', error);
    throw new Error('Failed to create username');
  }
};

/**
 * Update username (enforces 30-day cooldown)
 */
export const updateUsername = async (userId, newUsername) => {
  try {
    const validation = validateUsername(newUsername);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check if available
    const available = await checkUsernameAvailability(newUsername);
    if (!available) {
      throw new Error('Username is already taken');
    }

    // Get current user data
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    
    // Check 30-day cooldown
    if (userData.usernameChangedAt) {
      const lastChange = userData.usernameChangedAt.toDate();
      const daysSinceChange = (new Date() - lastChange) / (1000 * 60 * 60 * 24);
      
      if (daysSinceChange < 30) {
        const daysRemaining = Math.ceil(30 - daysSinceChange);
        throw new Error(`You can change your username again in ${daysRemaining} days`);
      }
    }

    const normalizedUsername = newUsername.toLowerCase().trim();
    const oldUsername = userData.username;

    // Create new username document
    await createUsernameDocument(newUsername, userId);

    // Update user document
    await updateDoc(userRef, {
      username: normalizedUsername,
      usernameDisplay: newUsername.trim(),
      usernameChangedAt: new Date(),
    });

    // Delete old username document if it exists
    if (oldUsername) {
      try {
        await setDoc(doc(db, 'usernames', oldUsername), {}, { merge: false });
      } catch (error) {
        console.warn('Could not delete old username document:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating username:', error);
    throw error;
  }
};

/**
 * Get user by username
 */
export const getUserByUsername = async (username) => {
  try {
    const normalizedUsername = username.toLowerCase().trim();
    const usernameDoc = await getDoc(doc(db, 'usernames', normalizedUsername));
    
    if (!usernameDoc.exists()) {
      return null;
    }
    
    const userId = usernameDoc.data().userId;
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw new Error('Failed to find user');
  }
};

/**
 * Search users by username or display name
 */
export const searchUsers = async (searchTerm, currentUserId) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const term = searchTerm.trim();
    const normalizedTerm = term.toLowerCase();
    
    // Search by username (exact match and prefix)
    const usernameQuery = query(
      collection(db, 'users'),
      where('username', '>=', normalizedTerm),
      where('username', '<=', normalizedTerm + '\uf8ff')
    );
    
    const usernameResults = await getDocs(usernameQuery);
    const users = new Map();
    
    usernameResults.forEach(doc => {
      if (doc.id !== currentUserId) {
        users.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    // Also search by display name
    const displayNameQuery = query(
      collection(db, 'users'),
      where('displayName', '>=', term),
      where('displayName', '<=', term + '\uf8ff')
    );
    
    const displayNameResults = await getDocs(displayNameQuery);
    
    displayNameResults.forEach(doc => {
      if (doc.id !== currentUserId && !users.has(doc.id)) {
        users.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    return Array.from(users.values()).slice(0, 20); // Limit to 20 results
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};

/**
 * Get user profile by ID
 */
export const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new Error('Failed to get user');
  }
};

