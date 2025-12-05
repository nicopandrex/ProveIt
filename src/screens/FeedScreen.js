import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFriendsPosts, getMyPosts } from '../services/postService';
import { checkForMissedGoals } from '../services/goalCompletionService';
import { auth } from '../../firebaseConfig';
import PostCard from '../components/PostCard';
import MissedPostCard from '../components/MissedPostCard';
import TomatoAnimation from '../components/TomatoAnimation';
import PostSkeleton from '../components/PostSkeleton';

export default function FeedScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('friends');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animationQueue, setAnimationQueue] = useState([]);
  const flatListRef = useRef(null);

  // Check for initialTab param and switch to it
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
      // Scroll to top after a brief delay to ensure posts are loaded
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
      // Clear the param after using it
      navigation.setParams({ initialTab: undefined });
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    // Don't load posts if user is not authenticated
    if (!auth.currentUser) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Check for missed goals when feed loads
    checkForMissedGoals(auth.currentUser.uid).catch(error => {
      console.warn('Failed to check missed goals:', error);
    });
    
    let unsubscribe;

    const loadPosts = async () => {
      setLoading(true);
      
      if (activeTab === 'friends') {
        unsubscribe = await getFriendsPosts(auth.currentUser.uid, (postsData) => {
          // Sort posts in reverse chronological order (most recent first)
          const sortedPosts = postsData.sort((a, b) => {
            // Handle Firestore Timestamp objects properly
            const getTime = (post) => {
              if (post.timestamp?.toDate) return post.timestamp.toDate().getTime();
              if (post.timestamp?.seconds) return post.timestamp.seconds * 1000;
              if (post.timestamp instanceof Date) return post.timestamp.getTime();
              return 0;
            };
            return getTime(b) - getTime(a);
          });
          setPosts(sortedPosts);
          setLoading(false);
        });
      } else {
        unsubscribe = getMyPosts(auth.currentUser.uid, (postsData) => {
          // Sort posts in reverse chronological order (most recent first)
          const sortedPosts = postsData.sort((a, b) => {
            // Handle Firestore Timestamp objects properly
            const getTime = (post) => {
              if (post.timestamp?.toDate) return post.timestamp.toDate().getTime();
              if (post.timestamp?.seconds) return post.timestamp.seconds * 1000;
              if (post.timestamp instanceof Date) return post.timestamp.getTime();
              return 0;
            };
            return getTime(b) - getTime(a);
          });
          setPosts(sortedPosts);
          setLoading(false);
        });
      }
    };

    loadPosts();

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Re-check for missed goals when refreshing
    if (auth.currentUser) {
      try {
        await checkForMissedGoals(auth.currentUser.uid);
      } catch (error) {
        console.warn('Failed to check missed goals on refresh:', error);
      }
    }
    
    // Give a moment for the real-time listener to update
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  const renderPost = ({ item }) => {
    if (item.type === 'missed_goal') {
      return (
        <MissedPostCard
          post={item}
          onAnimationStart={(positions, onComplete) => {
            console.log('FeedScreen received animation start:', positions);
            const animationId = Date.now() + Math.random();
            setAnimationQueue(prev => [...prev, { id: animationId, positions, onComplete }]);
          }}
        />
      );
    }
    return (
      <PostCard 
        post={item} 
        onAnimationStart={(positions, onComplete) => {
          const animationId = Date.now() + Math.random();
          setAnimationQueue(prev => [...prev, { id: animationId, positions, onComplete }]);
        }}
      />
    );
  };

  const handleAnimationComplete = (animationId) => {
    setAnimationQueue(prev => {
      const animation = prev.find(a => a.id === animationId);
      if (animation?.onComplete) {
        animation.onComplete();
      }
      return prev.filter(a => a.id !== animationId);
    });
  };

  const renderEmptyState = () => {
    if (activeTab === 'friends') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No posts from friends yet</Text>
          <Text style={styles.emptyText}>
            Add friends to see their proof posts!
          </Text>
          <TouchableOpacity
            style={styles.addFriendsButton}
            onPress={() => navigation.navigate('SearchUsers')}
          >
            <Text style={styles.addFriendsButtonText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            Complete a goal to create your first post!
          </Text>
        </View>
      );
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>ProveIt</Text>
            <TouchableOpacity 
              style={styles.addFriendsIcon}
              onPress={() => navigation.navigate('SearchUsers')}
            >
              <Ionicons name="person-add" size={24} color="#4ecdc4" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
              onPress={() => setActiveTab('friends')}
            >
              <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
                Friends
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'me' && styles.activeTab]}
              onPress={() => setActiveTab('me')}
            >
              <Text style={[styles.tabText, activeTab === 'me' && styles.activeTabText]}>
                Me
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          ref={flatListRef}
          data={loading ? [1, 2, 3] : posts}
          renderItem={loading ? () => <PostSkeleton /> : renderPost}
          keyExtractor={(item) => loading ? `skeleton-${item}` : item.id}
          style={styles.feed}
          ListEmptyComponent={!loading && renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
      
      {/* Global Animation Overlay - Only for flying tomato */}
      {animationQueue.map((animation) => (
        <TomatoAnimation
          key={animation.id}
          startPosition={animation.positions.start}
          endPosition={animation.positions.end}
          onComplete={() => handleAnimationComplete(animation.id)}
          renderSplatInCard={true}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addFriendsIcon: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  activeTab: {
    backgroundColor: '#4ecdc4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#000',
  },
  feed: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFriendsButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFriendsButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
