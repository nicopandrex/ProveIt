// Lightweight in-memory pub/sub for avatar updates
const listeners = new Map(); // userId => Set<callback>

export const subscribeToAvatarUpdates = (userId, cb) => {
  if (!userId) return () => {};
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(cb);

  return () => {
    const s = listeners.get(userId);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) listeners.delete(userId);
  };
};

export const emitAvatarUpdated = (userId) => {
  if (!userId) return;
  const set = listeners.get(userId);
  if (!set) return;
  for (const cb of Array.from(set)) {
    try {
      cb();
    } catch (e) {
      console.warn('avatarEvents callback error', e);
    }
  }
};

export default {
  subscribeToAvatarUpdates,
  emitAvatarUpdated,
};
