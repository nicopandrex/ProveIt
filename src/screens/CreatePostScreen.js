import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProofPost } from '../services/postService';
import { auth } from '../../firebaseConfig';

export default function CreatePostScreen({ route, navigation }) {
  const { goal, image } = route.params;
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    setLoading(true);
    try {
      await createProofPost(
        goal.id,
        image.uri,
        caption.trim(),
        auth.currentUser.uid,
        auth.currentUser.displayName || 'User'
      );

      // Pop to top of Capture stack to reset it, then navigate to Feed Me tab
      navigation.popToTop();
      navigation.getParent()?.navigate('Feed', {
        screen: 'FeedMain',
        params: { initialTab: 'me' }
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Proof</Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => Keyboard.dismiss()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalFrequency}>
                {goal.frequency === 'daily' ? 'Daily' : 'Weekly'}
              </Text>
            </View>

            <View style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.proofImage} />
            </View>

            <View style={styles.captionContainer}>
              <Text style={styles.captionLabel}>Add a caption (optional)</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="What did you accomplish?"
                placeholderTextColor="#666"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={200}
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>

            <TouchableOpacity
              style={[styles.postButton, loading && styles.postButtonDisabled]}
              onPress={handlePost}
              disabled={loading}
            >
              <Text style={styles.postButtonText}>
                {loading ? 'Posting...' : 'POST IT!'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
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
  doneButton: {
    padding: 4,
  },
  doneButtonText: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  goalInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  goalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalFrequency: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  proofImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  captionContainer: {
    marginBottom: 30,
  },
  captionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
  },
  postButton: {
    backgroundColor: '#4ecdc4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
