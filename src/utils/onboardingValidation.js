import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Validate first name
 */
export function validateFirstName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Please enter your first name' };
  }
  
  if (name.trim().length < 1) {
    return { valid: false, error: 'Name is too short' };
  }
  
  return { valid: true };
}

/**
 * Validate username format
 */
export function validateUsernameFormat(username) {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Please enter a username' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  // Allow alphanumeric and underscore only
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { valid: true };
}

/**
 * Check if username is unique in Firestore
 */
export async function checkUsernameAvailability(username) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.trim().toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw error;
  }
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Please enter your email' };
  }
  
  // Simple email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  return { valid: true };
}

/**
 * Validate password
 */
export function validatePassword(password, confirmPassword) {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Please enter a password' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  
  return { valid: true };
}

/**
 * Validate goal title
 */
export function validateGoalTitle(title) {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Please enter a goal' };
  }
  
  if (title.trim().length < 3) {
    return { valid: false, error: 'Goal must be at least 3 characters' };
  }
  
  return { valid: true };
}
