import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Simple in-memory cache with TTL and promise dedupe
const cache = new Map(); // userId -> { data, timestamp }
const pending = new Map(); // userId -> Promise
const TTL = 5 * 60 * 1000; // 5 minutes

export const getUserCached = async (userId) => {
  if (!userId) return null;

  const now = Date.now();

  const entry = cache.get(userId);
  if (entry && now - entry.timestamp < TTL) {
    return entry.data;
  }

  if (pending.has(userId)) {
    return pending.get(userId);
  }

  const promise = (async () => {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      cache.set(userId, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn('userCache getUserCached error:', error);
      return null;
    } finally {
      pending.delete(userId);
    }
  })();

  pending.set(userId, promise);
  return promise;
};

export const invalidateUserCache = (userId) => {
  if (!userId) return;
  cache.delete(userId);
  pending.delete(userId);
};

export default {
  getUserCached,
  invalidateUserCache,
};
