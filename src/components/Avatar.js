import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { getCachedSecureUrlForKey } from '../services/imageCacheService';
import { getUserCached } from '../services/userCacheService';
import { subscribeToAvatarUpdates } from '../services/avatarEvents';

export default function Avatar({ userId, displayName, photoPath, size = 80, style }) {
  const [uri, setUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remoteName, setRemoteName] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // If photoPath prop provided, prefer it and avoid Firestore listener
    if (photoPath) {
      getCachedSecureUrlForKey(photoPath)
        .then(url => { if (mounted) setUri(url || null); })
        .catch(() => { if (mounted) setUri(null); })
        .finally(() => { if (mounted) setLoading(false); });

      // Use provided displayName if available; skip listener
      if (displayName) {
        setRemoteName(displayName);
        setLoading(false);
        return () => { mounted = false; };
      }
    }

    // If displayName prop provided (but no photoPath), try a one-time cached fetch for photoPath
    if (displayName && !photoPath) {
      setRemoteName(displayName);

      if (userId) {
        (async () => {
          try {
            const data = await getUserCached(userId);
            if (!mounted) return;
            if (data && data.photoPath) {
              try {
                const url = await getCachedSecureUrlForKey(data.photoPath);
                if (mounted) setUri(url || null);
              } catch (e) {
                if (mounted) setUri(null);
              }
            } else {
              if (mounted) setUri(null);
            }
          } catch (err) {
            if (mounted) setUri(null);
          } finally {
            if (mounted) setLoading(false);
          }
        })();
      } else {
        setLoading(false);
      }

      return () => { mounted = false; };
    }

    // If neither photoPath nor displayName provided, fall back to cached get
    if (!userId) {
      setLoading(false);
      return () => { mounted = false; };
    }
    // Subscribe to avatar update events so that if another part of the app
    // clears caches / updates the profile photo we re-fetch the URL.
    const unsubscribe = subscribeToAvatarUpdates(userId, () => {
      // bump a tick to force this effect to re-run and fetch fresh data
      setRefreshTick(t => t + 1);
    });

    (async () => {
      try {
        const data = await getUserCached(userId);
        if (!mounted) return;
        setRemoteName(data?.displayName || null);

        if (data?.photoPath) {
          const url = await getCachedSecureUrlForKey(data.photoPath);
          if (mounted) setUri(url || null);
        } else {
          if (mounted) setUri(null);
        }
      } catch (err) {
        if (mounted) setUri(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };

  }, [userId, photoPath, displayName, refreshTick]);

  const nameForInitials = displayName || remoteName || 'U';
  const initials = nameForInitials.split(' ').map(n => n.charAt(0)).join('').slice(0,2).toUpperCase();

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {loading && (
        <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill} />
      )}

      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: Math.round(size / 2.4) }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333'
  },
  image: {
    resizeMode: 'cover'
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#444'
  },
  initials: {
    color: '#fff',
    fontWeight: '700'
  }
});
