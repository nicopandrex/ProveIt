import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getFriends, 
  removeFriend, 
  getFriendRequests, 
  getSentRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest
} from '../services/friendService';
import { auth } from '../../firebaseConfig';
import Avatar from '../components/Avatar';

export default function FriendsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    // Listen to received requests
    const unsubscribeReceived = getFriendRequests(auth.currentUser.uid, (requests) => {
      setReceivedRequests(requests);
    });

    // Listen to sent requests
    const unsubscribeSent = getSentRequests(auth.currentUser.uid, (requests) => {
      setSentRequests(requests);
    });

    return () => {
      unsubscribeReceived();
      unsubscribeSent();
    };
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const friendsList = await getFriends(auth.currentUser.uid);
      setFriends(friendsList);
    } catch (error) {
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(auth.currentUser.uid, friend.id);
              await loadFriends();
              Alert.alert('Success', 'Friend removed');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = async (request) => {
    try {
      await acceptFriendRequest(request.id, auth.currentUser.uid);
      await loadFriends();
      Alert.alert('Success', `You are now friends with ${request.fromDisplayName}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeclineRequest = async (request) => {
    try {
      await declineFriendRequest(request.id, auth.currentUser.uid);
      Alert.alert('Request Declined');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCancelRequest = async (request) => {
    try {
      await cancelFriendRequest(request.id, auth.currentUser.uid);
      Alert.alert('Request Canceled');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderFriend = ({ item }) => (
    <View style={styles.itemContainer}>
      <Avatar userId={item.id} displayName={item.displayName} photoPath={item.photoPath} size={50} style={styles.avatar} />
      
      <View style={styles.itemInfo}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        {item.username && (
          <Text style={styles.username}>@{item.usernameDisplay || item.username}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFriend(item)}
      >
        <Ionicons name="person-remove" size={20} color="#ff6b6b" />
      </TouchableOpacity>
    </View>
  );

  const renderReceivedRequest = ({ item }) => (
    <View style={styles.itemContainer}>
      <Avatar userId={item.fromId || item.fromUserId || item.from} displayName={item.fromDisplayName} photoPath={item.photoPath || item.fromPhotoPath} size={50} style={styles.avatar} />
      
      <View style={styles.itemInfo}>
        <Text style={styles.displayName}>{item.fromDisplayName}</Text>
        {item.fromUsername && (
          <Text style={styles.username}>@{item.fromUsername}</Text>
        )}
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item)}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(item)}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequest = ({ item }) => (
    <View style={styles.itemContainer}>
      <Avatar userId={item.toId || item.toUserId || item.to || item.id} displayName={item.displayName || 'User'} photoPath={item.photoPath || item.toPhotoPath} size={50} style={styles.avatar} />
      
      <View style={styles.itemInfo}>
        <Text style={styles.displayName}>Request sent</Text>
        <Text style={styles.username}>Pending acceptance</Text>
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => handleCancelRequest(item)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => {
    if (activeTab === 'friends') {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Add friends to see them here</Text>
        </View>
      );
    } else if (activeTab === 'received') {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="mail-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No pending requests</Text>
          <Text style={styles.emptySubtext}>Friend requests will appear here</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="send-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No sent requests</Text>
          <Text style={styles.emptySubtext}>Requests you send will appear here</Text>
        </View>
      );
    }
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'friends':
        return friends;
      case 'received':
        return receivedRequests;
      case 'sent':
        return sentRequests;
      default:
        return [];
    }
  };

  const getTabRenderer = () => {
    switch (activeTab) {
      case 'friends':
        return renderFriend;
      case 'received':
        return renderReceivedRequest;
      case 'sent':
        return renderSentRequest;
      default:
        return renderFriend;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity
          style={styles.addButton}
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
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Requests ({receivedRequests.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({sentRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && activeTab === 'friends' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ecdc4" />
        </View>
      ) : (
        <FlatList
          data={getTabData()}
          renderItem={getTabRenderer()}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={getTabData().length === 0 ? styles.emptyListContainer : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4ecdc4',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  displayName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    color: '#999',
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ecdc4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});




