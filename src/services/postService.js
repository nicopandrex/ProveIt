import { 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc,
  setDoc,
  increment, 
  query, 
  where,
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { uploadImageToS3, getPresignedImageUrl } from './s3Service';
import { updateGoalCompletion as updateGoalCompletionWithStreak } from './goalCompletionService';
import { db } from '../../firebaseConfig';

// Firebase Firestore functions
export const createPost = async (postData) => {
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      timestamp: new Date(),
      reactions: {
        cheer: 0,
        nudge: 0,
        tomato: 0,
      },
    });
    return docRef.id;
  } catch (error) {
    throw new Error('Failed to create post: ' + error.message);
  }
};

export const getPosts = (callback) => {
  const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(posts);
  });
};

/**
 * Get posts from friends only
 */
export const getFriendsPosts = async (userId, callback) => {
  try {
    // Get user's friends list
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      callback([]);
      return () => {};
    }

    const userData = userDoc.data();
    const friendIds = userData.friends || [];

    if (friendIds.length === 0) {
      callback([]);
      return () => {};
    }

    // Firestore 'in' queries are limited to 10 items, so we need to handle this
    // For now, we'll take up to 10 friends. In production, you'd batch this.
    const limitedFriendIds = friendIds.slice(0, 10);

    const q = query(
      collection(db, 'posts'),
      where('userId', 'in', limitedFriendIds),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(posts);
    });
  } catch (error) {
    console.error('Error getting friends posts:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get posts from current user only
 */
export const getMyPosts = (userId, callback) => {
  // Try the proper query first
  const q = query(
    collection(db, 'posts'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(posts);
  }, (error) => {
    console.error('Error in getMyPosts:', error);
    
    // If the query fails due to index not being ready, try without orderBy
    if (error.code === 'failed-precondition') {
      console.log('Index not ready, trying without orderBy...');
      const fallbackQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );
      
      const fallbackUnsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Sort client-side
        const sortedPosts = posts.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(0);
          const bTime = b.timestamp?.toDate?.() || new Date(0);
          return bTime - aTime; // Descending order
        });
        
        callback(sortedPosts);
      }, (fallbackError) => {
        console.error('Fallback query also failed:', fallbackError);
        callback([]);
      });
      
      // Return the fallback unsubscribe function
      return fallbackUnsubscribe;
    }
    
    // For other errors, return empty array
    callback([]);
  });
};

export const addReaction = async (postId, reactionType, userId) => {
  try {
    // Add to interactions subcollection
    await addDoc(collection(db, 'posts', postId, 'interactions'), {
      type: reactionType,
      from: userId,
      timestamp: new Date(),
    });

    // Update reaction count
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      [`reactions.${reactionType}`]: increment(1),
    });
    
    // Track users who reacted using setDoc with merge
    await setDoc(postRef, {
      reactedUsers: {
        [reactionType]: {
          [userId]: true,
        },
      },
    }, { merge: true });

    // If tomato reaction, increment post author's tomato count
    if (reactionType === 'tomato') {
      try {
        // Get the post to find the author
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postAuthorId = postSnap.data().userId;
          const authorRef = doc(db, 'users', postAuthorId);
          await setDoc(authorRef, {
            stats: {
              tomatoCount: increment(1),
            },
          }, { merge: true });
        }
      } catch (userError) {
        console.error('Failed to update user tomato count:', userError);
        // Continue even if user update fails
      }
    }
  } catch (error) {
    console.error('Add reaction error details:', error);
    throw new Error('Failed to add reaction: ' + error.message);
  }
};

export const removeReaction = async (postId, reactionType, userId) => {
  try {
    // Update reaction count
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      [`reactions.${reactionType}`]: increment(-1),
    });
    
    // Remove user from reacted users using setDoc with merge
    await setDoc(postRef, {
      reactedUsers: {
        [reactionType]: {
          [userId]: false,
        },
      },
    }, { merge: true });

    // If tomato reaction, decrement post author's tomato count
    if (reactionType === 'tomato') {
      try {
        // Get the post to find the author
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postAuthorId = postSnap.data().userId;
          const authorRef = doc(db, 'users', postAuthorId);
          await setDoc(authorRef, {
            stats: {
              tomatoCount: increment(-1),
            },
          }, { merge: true });
        }
      } catch (userError) {
        console.error('Failed to update user tomato count:', userError);
        // Continue even if user update fails
      }
    }
  } catch (error) {
    console.error('Remove reaction error details:', error);
    throw new Error('Failed to remove reaction: ' + error.message);
  }
};

export const uploadImage = async (imageUri, postId) => {
  try {
    console.log('Starting S3 image upload for post:', postId);
    console.log('Image URI:', imageUri);
    
    // Check authentication status
    const { auth } = await import('../../firebaseConfig');
    console.log('Current user:', auth.currentUser);
    console.log('User authenticated:', !!auth.currentUser);
    
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to upload images');
    }
    
    // Upload to S3
    const imageUrl = await uploadImageToS3(imageUri, postId);
    console.log('S3 upload successful:', imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error('S3 image upload error:', error);
    throw new Error('Failed to upload image: ' + error.message);
  }
};

// addReaction is already exported from mongoService above

// getPosts is already exported from mongoService above

/**
 * Get a secure pre-signed URL for an image
 * @param {string} postId - Post ID
 * @param {string} fileName - File name (optional)
 * @returns {Promise<string>} - Pre-signed URL
 */
export const getSecureImageUrl = async (postId, fileName = 'proof.jpg') => {
  try {
    return await getPresignedImageUrl(postId, fileName);
  } catch (error) {
    console.error('Get secure image URL error:', error);
    throw new Error('Failed to get secure image URL: ' + error.message);
  }
};

export const createProofPost = async (goalId, imageUri, caption, userId, userDisplayName) => {
  try {
    // Create post first
    const postData = {
      userId,
      userDisplayName,
      goalId,
      type: 'proof_post',
      caption,
      completed: true,
    };

    const postId = await createPost(postData);

    // Upload image to S3 - REQUIRED, no fallback
    const imageUrl = await uploadImage(imageUri, postId);
    
    // Update post with image URL in Firebase
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      imageUrl,
    });

    // Update goal completion with streak tracking
    await updateGoalCompletionWithStreak(goalId, userId);

    return postId;
  } catch (error) {
    throw new Error('Failed to create proof post: ' + error.message);
  }
};

export const updateGoalCompletion = async (goalId, userId) => {
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const today = new Date().toDateString();
    
    await updateDoc(goalRef, {
      completedDates: increment(1),
      lastCompleted: new Date(),
    });

    // Update user stats
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'stats.postsCompleted': increment(1),
    });
  } catch (error) {
    throw new Error('Failed to update goal completion: ' + error.message);
  }
};

export const checkMissedGoals = async () => {
  try {
    // This function would need to be implemented in mongoService
    // For now, we'll keep it as a placeholder
    console.log('checkMissedGoals - MongoDB implementation needed');
  } catch (error) {
    console.error('Failed to check missed goals:', error);
  }
};
