import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getUserById } from './userService';

/**
 * Send a friend request (optimized)
 */
export const sendFriendRequest = async (fromUserId, toUserId, fromUsername, fromDisplayName) => {
  try {
    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Use batch operations for better performance
    const batch = writeBatch(db);
    
    // Create friend request document
    const requestRef = doc(collection(db, 'friendRequests'));
    batch.set(requestRef, {
      from: fromUserId,
      to: toUserId,
      fromUsername,
      fromDisplayName,
      status: 'pending',
      createdAt: new Date(),
    });

    // Commit the batch
    await batch.commit();

    return requestRef.id;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

/**
 * Accept a friend request (optimized with batch)
 */
export const acceptFriendRequest = async (requestId, userId) => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestSnap.data();

    if (requestData.to !== userId) {
      throw new Error('Unauthorized to accept this request');
    }

    if (requestData.status !== 'pending') {
      throw new Error('Request is no longer pending');
    }

    // Use batch for atomic operations
    const batch = writeBatch(db);
    
    // Update request status
    batch.update(requestRef, {
      status: 'accepted',
    });

    // Add to both users' friends arrays
    const fromUserRef = doc(db, 'users', requestData.from);
    const toUserRef = doc(db, 'users', requestData.to);

    batch.update(fromUserRef, {
      friends: arrayUnion(requestData.to),
    });

    batch.update(toUserRef, {
      friends: arrayUnion(requestData.from),
    });

    // Commit all operations atomically
    await batch.commit();

    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

/**
 * Decline a friend request
 */
export const declineFriendRequest = async (requestId, userId) => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestSnap.data();

    if (requestData.to !== userId) {
      throw new Error('Unauthorized to decline this request');
    }

    // Update request status
    await updateDoc(requestRef, {
      status: 'declined',
    });

    return true;
  } catch (error) {
    console.error('Error declining friend request:', error);
    throw error;
  }
};

/**
 * Cancel a sent friend request
 */
export const cancelFriendRequest = async (requestId, userId) => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestSnap.data();

    if (requestData.from !== userId) {
      throw new Error('Unauthorized to cancel this request');
    }

    // Delete the request
    await deleteDoc(requestRef);

    return true;
  } catch (error) {
    console.error('Error canceling friend request:', error);
    throw error;
  }
};

/**
 * Get pending friend requests for a user (requests they received)
 */
export const getFriendRequests = (userId, callback) => {
  const q = query(
    collection(db, 'friendRequests'),
    where('to', '==', userId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(requests);
  });
};

/**
 * Get sent friend requests (requests user sent)
 */
export const getSentRequests = (userId, callback) => {
  const q = query(
    collection(db, 'friendRequests'),
    where('from', '==', userId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(requests);
  });
};

/**
 * Remove a friend
 */
export const removeFriend = async (userId, friendId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const friendRef = doc(db, 'users', friendId);

    // Remove from both friends arrays
    await updateDoc(userRef, {
      friends: arrayRemove(friendId),
    });

    await updateDoc(friendRef, {
      friends: arrayRemove(userId),
    });

    return true;
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

/**
 * Get list of friends with their user data
 */
export const getFriends = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    const friendIds = userData.friends || [];

    if (friendIds.length === 0) {
      return [];
    }

    // Get all friend user documents
    const friendPromises = friendIds.map(friendId => getUserById(friendId));
    const friends = await Promise.all(friendPromises);

    return friends.filter(friend => friend !== null);
  } catch (error) {
    console.error('Error getting friends:', error);
    throw error;
  }
};

/**
 * Check if two users are friends
 */
export const areFriends = async (userId1, userId2) => {
  try {
    const user1Doc = await getDoc(doc(db, 'users', userId1));
    
    if (!user1Doc.exists()) {
      return false;
    }

    const userData = user1Doc.data();
    const friends = userData.friends || [];

    return friends.includes(userId2);
  } catch (error) {
    console.error('Error checking friendship:', error);
    return false;
  }
};

/**
 * Get friend request status between two users
 */
export const getFriendRequestStatus = async (fromUserId, toUserId) => {
  try {
    // Check if already friends
    const friends = await areFriends(fromUserId, toUserId);
    if (friends) {
      return 'friends';
    }

    // Check for pending request from current user to target user
    const sentRequests = query(
      collection(db, 'friendRequests'),
      where('from', '==', fromUserId),
      where('to', '==', toUserId),
      where('status', '==', 'pending')
    );
    
    const sentSnap = await getDocs(sentRequests);
    if (!sentSnap.empty) {
      return 'sent';
    }

    // Check for pending request from target user to current user
    const receivedRequests = query(
      collection(db, 'friendRequests'),
      where('from', '==', toUserId),
      where('to', '==', fromUserId),
      where('status', '==', 'pending')
    );
    
    const receivedSnap = await getDocs(receivedRequests);
    if (!receivedSnap.empty) {
      return 'received';
    }

    return 'none';
  } catch (error) {
    console.error('Error getting friend request status:', error);
    return 'none';
  }
};

