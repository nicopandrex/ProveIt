import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ImageCropper from '../../components/ImageCropper';
import { saveOnboardingProgress } from '../../services/onboardingService';

export default function ProfilePictureScreen({ navigation, route }) {
  const [avatarUri, setAvatarUri] = useState(route.params?.avatarUri || null);
  const [pickerImageUri, setPickerImageUri] = useState(null);
  const [cropperVisible, setCropperVisible] = useState(false);

  useEffect(() => {
    saveOnboardingProgress('ProfilePicture', {
      ...route.params,
      avatarUri,
    });
  }, [avatarUri]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setPickerImageUri(result.assets[0].uri);
      setCropperVisible(true);
    }
  };

  const handleCropped = (croppedUri) => {
    setAvatarUri(croppedUri);
    setCropperVisible(false);
    setPickerImageUri(null);
  };

  const handleContinue = () => {
    navigation.navigate('Password', {
      ...route.params,
      avatarUri,
    });
  };

  const handleSkip = () => {
    navigation.navigate('Password', {
      ...route.params,
      avatarUri: null,
    });
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
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Add a profile picture</Text>
        <Text style={styles.subtitle}>You can always change this later</Text>

        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera" size={48} color="#666" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.changeButton} onPress={handlePickImage}>
          <Text style={styles.changeButtonText}>
            {avatarUri ? 'Change Photo' : 'Choose Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      <ImageCropper
        visible={cropperVisible}
        imageUri={pickerImageUri}
        onCrop={handleCropped}
        onCancel={() => {
          setCropperVisible(false);
          setPickerImageUri(null);
        }}
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
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 48,
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  changeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  changeButtonText: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    padding: 20,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});
