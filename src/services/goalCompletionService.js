import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Check if a goal has been completed today
 * @param {string} goalId - Goal ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if already completed today
 */
export const isGoalCompletedToday = async (goalId, userId) => {
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const goalSnap = await getDoc(goalRef);
    
    if (!goalSnap.exists()) {
      return false;
    }
    
    const goalData = goalSnap.data();
    const today = new Date().toDateString();
    const lastCompleted = goalData.lastCompleted?.toDate?.()?.toDateString();
    
    return lastCompleted === today;
  } catch (error) {
    console.error('Error checking goal completion:', error);
    throw error;
  }
};

/**
 * Update goal completion with date tracking and streak logic
 * @param {string} goalId - Goal ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const updateGoalCompletion = async (goalId, userId) => {
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const goalSnap = await getDoc(goalRef);
    
    if (!goalSnap.exists()) {
      throw new Error('Goal not found');
    }
    
    const goalData = goalSnap.data();
    const today = new Date();
    const todayDateString = today.toDateString();
    
    // Check if already completed today
    const lastCompleted = goalData.lastCompleted?.toDate?.();
    const lastCompletedDateString = lastCompleted?.toDateString();
    
    if (lastCompletedDateString === todayDateString) {
      throw new Error('Goal already completed today');
    }
    
    // Check if past due time - if so, streak is broken
    const isPastDue = isPastDueTime(goalData.dueTime);
    
    // Calculate streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateString = yesterday.toDateString();
    
    let newStreak = 1;
    
    if (isPastDue) {
      // Posted late - streak breaks, start at 1
      newStreak = 1;
    } else if (lastCompletedDateString === yesterdayDateString) {
      // Continuing streak - completed on time
      newStreak = (goalData.currentStreak || 0) + 1;
    }
    
    const newLongestStreak = Math.max(newStreak, goalData.longestStreak || 0);
    
    // Update goal
    await updateDoc(goalRef, {
      completedDates: arrayUnion(todayDateString),
      lastCompleted: today,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      totalCompletions: increment(1),
      missedToday: false, // Clear any missed flag
    });
    
    // Check if all goals are complete for today and update user streak
    await checkAndUpdateUserStreak(userId);
    
    // Update user stats
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'stats.postsCompleted': increment(1),
    });
    
    console.log(`Goal ${goalId} completed. Streak: ${newStreak}${isPastDue ? ' (posted late)' : ''}`);
  } catch (error) {
    console.error('Error updating goal completion:', error);
    throw error;
  }
};

/**
 * Check if all user goals are completed today and update overall streak
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const checkAndUpdateUserStreak = async (userId) => {
  try {
    // Get all user goals
    const goalsQuery = query(
      collection(db, 'users', userId, 'goals')
    );
    
    const goalsSnap = await getDocs(goalsQuery);
    const today = new Date().toDateString();
    
    let allCompleted = true;
    let totalGoals = 0;
    
    goalsSnap.forEach((doc) => {
      const goalData = doc.data();
      const lastCompleted = goalData.lastCompleted?.toDate?.()?.toDateString();
      
      totalGoals++;
      if (lastCompleted !== today) {
        allCompleted = false;
      }
    });
    
    // If no goals, don't update streak
    if (totalGoals === 0) {
      return;
    }
    
    // Update user streak if all goals completed
    if (allCompleted) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      
      const lastStreakDate = userData.lastStreakDate?.toDate?.()?.toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateString = yesterday.toDateString();
      
      let newStreak = 1;
      if (lastStreakDate === yesterdayDateString) {
        // Continuing overall streak
        newStreak = (userData.currentStreak || 0) + 1;
      } else if (lastStreakDate === today) {
        // Already counted today
        return;
      }
      
      const newLongestStreak = Math.max(newStreak, userData.longestStreak || 0);
      
      await updateDoc(userRef, {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakDate: new Date(),
      });
      
      console.log(`User ${userId} overall streak updated: ${newStreak}`);
    }
  } catch (error) {
    console.error('Error checking user streak:', error);
    // Don't throw error, this is a non-critical operation
  }
};

/**
 * Get goals that can be posted to (not completed today)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of goals that can be completed
 */
export const getAvailableGoals = async (userId) => {
  try {
    const goalsQuery = query(
      collection(db, 'users', userId, 'goals')
    );
    
    const goalsSnap = await getDocs(goalsQuery);
    const today = new Date().toDateString();
    const availableGoals = [];
    
    goalsSnap.forEach((doc) => {
      const goalData = doc.data();
      const lastCompleted = goalData.lastCompleted?.toDate?.()?.toDateString();
      
      // Only include goals not completed today
      if (lastCompleted !== today) {
        availableGoals.push({
          id: doc.id,
          ...goalData,
        });
      }
    });
    
    return availableGoals;
  } catch (error) {
    console.error('Error getting available goals:', error);
    throw error;
  }
};

/**
 * Check if it's past the due time for a goal
 * @param {string} dueTime - Due time string (e.g., "6:00 PM")
 * @returns {boolean} - True if past due time
 */
export const isPastDueTime = (dueTime) => {
  try {
    const now = new Date();
    const [time, period] = dueTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let dueHours = hours;
    if (period === 'PM' && hours !== 12) {
      dueHours += 12;
    } else if (period === 'AM' && hours === 12) {
      dueHours = 0;
    }
    
    const dueDate = new Date();
    dueDate.setHours(dueHours, minutes, 0, 0);
    
    return now > dueDate;
  } catch (error) {
    console.error('Error parsing due time:', error);
    return false;
  }
};

/**
 * Check for missed goals (past due time, not completed)
 * Creates "missed goal" posts and resets streaks
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const checkForMissedGoals = async (userId) => {
  try {
    // Get user info first
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userDisplayName = userSnap.data()?.displayName || 'User';
    
    const goalsQuery = query(
      collection(db, 'users', userId, 'goals')
    );
    
    const goalsSnap = await getDocs(goalsQuery);
    const today = new Date().toDateString();
    
    for (const goalDoc of goalsSnap.docs) {
      const goalData = goalDoc.data();
      const goalId = goalDoc.id;
      
      // Check if already marked as missed today
      if (goalData.missedToday) {
        continue;
      }
      
      // Check if completed today
      const lastCompleted = goalData.lastCompleted?.toDate?.()?.toDateString();
      if (lastCompleted === today) {
        continue;
      }
      
      // Skip goals created today - they get their first chance today
      const createdToday = goalData.createdAt?.toDate?.()?.toDateString() === today;
      if (createdToday) {
        continue;
      }
      
      // Check if past due time
      const pastDue = isPastDueTime(goalData.dueTime);
      if (!pastDue) {
        continue;
      }
      
      // Goal is missed - create post and reset streak
      console.log(`Goal ${goalId} missed - past due time ${goalData.dueTime}`);
      
      // Create missed goal post
      try {
        const { createPost } = await import('./postService');
        await createPost({
          userId,
          userDisplayName,
          goalId,
          type: 'missed_goal',
          message: `😢 Missed goal: ${goalData.title}`,
        });
      } catch (postError) {
        console.error('Error creating missed post:', postError);
      }
      
      // Update goal - reset streak and mark as missed
      const goalRef = doc(db, 'users', userId, 'goals', goalId);
      await updateDoc(goalRef, {
        currentStreak: 0,
        missedToday: true,
      });
      
      // Update user overall streak to 0
      await updateDoc(userRef, {
        currentStreak: 0,
      });
    }
  } catch (error) {
    console.error('Error checking for missed goals:', error);
    // Don't throw - this is a background check
  }
};

export default {
  isGoalCompletedToday,
  updateGoalCompletion,
  checkAndUpdateUserStreak,
  getAvailableGoals,
  isPastDueTime,
  checkForMissedGoals,
};

