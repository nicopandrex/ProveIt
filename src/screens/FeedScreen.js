import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { getFriendsPosts, getMyPosts } from '../services/postService';
import { preloadSecureUrls } from '../services/imageCacheService';
import { checkForMissedGoals } from '../services/goalCompletionService';
import { auth } from '../../firebaseConfig';
import PostCard from '../components/PostCard';

export default function FeedScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('friends');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check for missed goals when feed loads
    if (auth.currentUser) {
      checkForMissedGoals(auth.currentUser.uid).catch(error => {
        console.warn('Failed to check missed goals:', error);
      });
    }
    
    let unsubscribe;

    const loadPosts = async () => {
      setLoading(true);
      
      if (activeTab === 'friends') {
        unsubscribe = await getFriendsPosts(auth.currentUser.uid, async (postsData) => {
          setPosts(postsData);
          setLoading(false);
          
          // Preload secure URLs for faster image loading
          if (postsData.length > 0) {
            preloadSecureUrls(postsData).catch(error => {
              console.warn('Failed to preload some images:', error);
            });
          }
        });
      } else {
        unsubscribe = getMyPosts(auth.currentUser.uid, async (postsData) => {
          setPosts(postsData);
          setLoading(false);
          
          // Preload secure URLs for faster image loading
          if (postsData.length > 0) {
            preloadSecureUrls(postsData).catch(error => {
              console.warn('Failed to preload some images:', error);
            });
          }
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

  const onRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
    setRefreshing(false);
  };

  const renderPost = ({ item }) => <PostCard post={item} />;

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ProveIt</Text>
        
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
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
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
