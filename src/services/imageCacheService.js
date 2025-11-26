import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPresignedImageUrl } from './s3Service';
import { getPresignedUrlForKey } from './s3Service';

// Global cache for secure image URLs
const imageCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get secure image URL with aggressive caching
 * @param {string} postId - Post ID
 * @param {string} fileName - File name (optional)
 * @returns {Promise<string>} - Secure image URL
 */
export const getCachedSecureImageUrl = async (postId, fileName = 'proof.jpg') => {
  const cacheKey = `${postId}_${fileName}`;
  
  // Check memory cache first (instant)
  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.url;
    }
    // Remove expired cache
    imageCache.delete(cacheKey);
  }
  
  // Check AsyncStorage cache (very fast)
  try {
    const stored = await AsyncStorage.getItem(`secure_url_${cacheKey}`);
    const storedTime = await AsyncStorage.getItem(`secure_url_time_${cacheKey}`);
    
    if (stored && storedTime && (Date.now() - parseInt(storedTime)) < CACHE_DURATION) {
      // Update memory cache
      imageCache.set(cacheKey, {
        url: stored,
        timestamp: parseInt(storedTime)
      });
      return stored;
    }
  } catch (error) {
    console.warn('AsyncStorage cache read failed:', error);
  }
  
  // Fetch new secure URL
  try {
    const secureUrl = await getPresignedImageUrl(postId, fileName);
    
    // Update both caches
    const timestamp = Date.now();
    imageCache.set(cacheKey, {
      url: secureUrl,
      timestamp
    });
    
    // Store in AsyncStorage (don't await for speed)
    AsyncStorage.multiSet([
      [`secure_url_${cacheKey}`, secureUrl],
      [`secure_url_time_${cacheKey}`, timestamp.toString()]
    ]).catch(error => console.warn('AsyncStorage cache write failed:', error));
    
    return secureUrl;
  } catch (error) {
    console.error('Failed to get secure image URL:', error);
    throw error;
  }
};

/**
 * Get secure image URL for an arbitrary S3 key with caching
 * @param {string} key - Full S3 key (e.g., 'users/{userId}/profile.jpg')
 * @returns {Promise<string>} - Secure image URL
 */
export const getCachedSecureUrlForKey = async (key) => {
  const cacheKey = `key_${key}`;

  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.url;
    }
    imageCache.delete(cacheKey);
  }

  try {
    const stored = await AsyncStorage.getItem(`secure_url_${cacheKey}`);
    const storedTime = await AsyncStorage.getItem(`secure_url_time_${cacheKey}`);

    if (stored && storedTime && (Date.now() - parseInt(storedTime)) < CACHE_DURATION) {
      imageCache.set(cacheKey, {
        url: stored,
        timestamp: parseInt(storedTime)
      });
      return stored;
    }
  } catch (error) {
    console.warn('AsyncStorage cache read failed:', error);
  }

  try {
    const secureUrl = await getPresignedUrlForKey(key);
    const timestamp = Date.now();
    imageCache.set(cacheKey, { url: secureUrl, timestamp });
    AsyncStorage.multiSet([
      [`secure_url_${cacheKey}`, secureUrl],
      [`secure_url_time_${cacheKey}`, timestamp.toString()]
    ]).catch(error => console.warn('AsyncStorage cache write failed:', error));

    return secureUrl;
  } catch (error) {
    console.error('Failed to get secure image URL for key:', error);
    throw error;
  }
};

/**
 * Preload secure URLs for multiple posts (for feed performance)
 * @param {Array} posts - Array of post objects
 */
export const preloadSecureUrls = async (posts) => {
  const proofPosts = posts.filter(post => post.type === 'proof_post' && post.imageUrl);
  
  // Preload in parallel (but limit concurrency)
  const batchSize = 5;
  for (let i = 0; i < proofPosts.length; i += batchSize) {
    const batch = proofPosts.slice(i, i + batchSize);
    const promises = batch.map(post => 
      getCachedSecureImageUrl(post.id).catch(error => {
        console.warn(`Failed to preload URL for post ${post.id}:`, error);
        return null;
      })
    );
    
    await Promise.all(promises);
  }
};

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp >= CACHE_DURATION) {
      imageCache.delete(key);
    }
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = async () => {
  imageCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const secureUrlKeys = keys.filter(key => key.startsWith('secure_url_'));
    if (secureUrlKeys.length > 0) {
      await AsyncStorage.multiRemove(secureUrlKeys);
    }
  } catch (error) {
    console.warn('Failed to clear AsyncStorage cache:', error);
  }
};

/**
 * Clear a single cached key (by S3 key or post/file combo)
 * @param {string} key - The cache key used in getCachedSecureUrlForKey or getCachedSecureImageUrl
 */
export const clearCacheForKey = async (key) => {
  // Accept either raw S3 key (e.g., 'users/uid/profile.jpg') or already-prefixed key ('key_users/...')
  const cacheKey = key.startsWith('key_') ? key : `key_${key}`;
  imageCache.delete(cacheKey);
  try {
    await AsyncStorage.multiRemove([`secure_url_${cacheKey}`, `secure_url_time_${cacheKey}`]);
  } catch (error) {
    console.warn('Failed to clear cache for key:', error);
  }
};

/**
 * Clear cache (alias for clearAllCache for settings screen)
 */
export const clearCache = clearAllCache;

export default {
  getCachedSecureImageUrl,
  preloadSecureUrls,
  clearExpiredCache,
  clearAllCache,
  clearCache
};
