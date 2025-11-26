import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers } from '../services/userService';
import { sendFriendRequest, getFriendRequestStatus } from '../services/friendService';
import { getUserById } from '../services/userService';
import { auth } from '../../firebaseConfig';
import Avatar from '../components/Avatar';

export default function SearchUsersScreen({ navigation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState({});
  const [sendingRequests, setSendingRequests] = useState({});

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      Alert.alert('Invalid Search', 'Please enter at least 2 characters');
      return;
    }

    setSearching(true);
    try {
      const users = await searchUsers(searchTerm, auth.currentUser.uid);
      setResults(users);

      // Get friend request statuses for all results
      const statuses = {};
      for (const user of users) {
        const status = await getFriendRequestStatus(auth.currentUser.uid, user.id);
        statuses[user.id] = status;
      }
      setRequestStatuses(statuses);
    } catch (error) {
      Alert.alert('Search Failed', error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (user) => {
    try {
      const currentUser = auth.currentUser;
      
      // Set loading state
      setSendingRequests(prev => ({
        ...prev,
        [user.id]: true
      }));
      
      // Show immediate feedback
      setRequestStatuses(prev => ({
        ...prev,
        [user.id]: 'sent'
      }));

      // Optimize: Use cached user data instead of fetching
      const currentUserDoc = await getUserById(currentUser.uid);
      
      // Send request in background
      await sendFriendRequest(
        currentUser.uid,
        user.id,
        currentUserDoc?.username || currentUser.uid,
        currentUser.displayName || 'User'
      );

      // Show success toast instead of alert for better UX
      console.log(`Friend request sent to ${user.displayName}`);
    } catch (error) {
      // Revert status on error
      setRequestStatuses(prev => ({
        ...prev,
        [user.id]: 'none'
      }));
      Alert.alert('Error', error.message);
    } finally {
      // Clear loading state
      setSendingRequests(prev => ({
        ...prev,
        [user.id]: false
      }));
    }
  };

  const renderUser = ({ item }) => {
    const status = requestStatuses[item.id] || 'none';
    const isLoading = sendingRequests[item.id] || false;
    
    return (
      <View style={styles.userItem}>
        <Avatar userId={item.id} displayName={item.displayName} photoPath={item.photoPath} size={50} style={styles.avatar} />
        
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{item.displayName}</Text>
          {item.username && (
            <Text style={styles.username}>@{item.usernameDisplay || item.username}</Text>
          )}
        </View>

        <View style={styles.actionContainer}>
          {status === 'friends' && (
            <View style={styles.friendsBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4ecdc4" />
              <Text style={styles.friendsText}>Friends</Text>
            </View>
          )}
          
          {status === 'sent' && (
            <View style={styles.sentBadge}>
              <Text style={styles.sentText}>Request Sent</Text>
            </View>
          )}
          
          {status === 'received' && (
            <View style={styles.receivedBadge}>
              <Text style={styles.receivedText}>Pending</Text>
            </View>
          )}
          
          {status === 'none' && (
            <TouchableOpacity 
              style={[styles.addButton, isLoading && styles.addButtonDisabled]}
              onPress={() => handleSendRequest(item)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="person-add" size={20} color="#000" />
              )}
              <Text style={styles.addButtonText}>
                {isLoading ? 'Sending...' : 'Add Friend'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name"
            placeholderTextColor="#666"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {searching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ecdc4" />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : searchTerm.length > 0 && !searching ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="#666" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people" size={48} color="#666" />
          <Text style={styles.emptyText}>Search for friends</Text>
          <Text style={styles.emptySubtext}>
            Enter a username or display name to get started
          </Text>
        </View>
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
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    flex: 1,
  },
  userItem: {
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
  userInfo: {
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
  actionContainer: {
    marginLeft: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  addButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  friendsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendsText: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600',
  },
  sentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  sentText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  receivedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4ecdc4',
    borderRadius: 6,
  },
  receivedText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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

