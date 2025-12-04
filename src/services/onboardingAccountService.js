import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { uploadProfileImageToS3 } from './s3Service';
import { createPost } from './postService';
import { markOnboardingComplete } from './onboardingService';

/**
 * Format time for goal deadline
 */
function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Create account without goal (skip path)
 */
export async function createAccountOnly(onboardingData) {
  const { firstName, username, email, password, avatarUri } = onboardingData;
  
  try {
    // Create Firebase auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name
    await updateProfile(user, {
      displayName: firstName,
    });
    
    // Upload avatar to S3 if provided
    let photoPath = null;
    if (avatarUri) {
      try {
        console.log('Uploading avatar for user:', user.uid);
        console.log('Avatar URI:', avatarUri);
        // uploadProfileImageToS3 returns the S3 key path
        photoPath = await uploadProfileImageToS3(user.uid, avatarUri, 'profile.jpg');
        console.log('Avatar uploaded successfully, photoPath:', photoPath);
      } catch (error) {
        console.error('Failed to upload avatar, continuing without:', error);
        // Don't fail the entire account creation if avatar upload fails
      }
    }
    
    // Create user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      username: username.toLowerCase(),
      displayName: firstName,
      photoPath: photoPath,
      onboardingCompleted: true,
      createdAt: new Date(),
      friends: [],
    });
    
    // Mark onboarding as complete and clear temporary progress
    await markOnboardingComplete(user.uid);
    
    return { success: true, userId: user.uid };
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

/**
 * Create account with first goal (complete path)
 */
export async function createAccountAndGoal(onboardingData) {
  const {
    firstName,
    username,
    email,
    password,
    avatarUri,
    goalTitle,
    goalFrequency,
    goalDeadlineTime,
  } = onboardingData;
  
  try {
    // First create the account
    const accountResult = await createAccountOnly({
      firstName,
      username,
      email,
      password,
      avatarUri,
    });
    
    const userId = accountResult.userId;
    
    // Create first goal
    const goalRef = doc(collection(db, 'users', userId, 'goals'));
    await setDoc(goalRef, {
      title: goalTitle.trim(),
      frequency: goalFrequency,
      dueTime: formatTime(goalDeadlineTime),
      completedDates: [],
      currentStreak: 0,
      longestStreak: 0,
      isPrivate: false,
      createdAt: new Date(),
    });
    
    // Create goal commitment post
    await createPost({
      userId: userId,
      userDisplayName: firstName,
      goalId: goalRef.id,
      type: 'goal_created',
      message: `🎯 ${firstName} just committed to: ${goalTitle.trim()}`,
    });
    
    return { success: true, userId, goalId: goalRef.id };
  } catch (error) {
    console.error('Error creating account and goal:', error);
    throw error;
  }
}
