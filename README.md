# ProveIt - Goal-Based Accountability Social Media App

A React Native app inspired by BeReal, but for productivity goals. Users create goals, prove they've completed them with photos, and get social accountability through reactions.

## Features

- **Goal Creation**: Set daily or weekly goals with due times
- **Proof Posting**: Take photos to prove goal completion
- **Friends System**: 
  - Unique usernames for easy discovery
  - Send and accept friend requests
  - Friends-only post visibility for privacy
- **Social Feed**: 
  - **Friends Tab**: See posts from friends only
  - **Me Tab**: View your own posts
- **Reactions System**: 
  - 🎉 **Cheer** - Celebrate goal completions
  - 🔔 **Nudge** - Remind friends about at-risk streaks
  - 🍅 **Tomato** - React to missed goals
- **Automatic Events**: System posts when goals are missed or at risk
- **Streak Tracking**: Track consecutive goal completions
- **User Profiles**: View personal stats, friends, and username

## Tech Stack

- **React Native** with Expo
- **Firebase** (Authentication, Firestore, Storage)
- **React Navigation** for navigation
- **Expo Image Picker** for photo capture

## Setup Instructions

### 1. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable the following services:
   - Authentication (Email/Password)
   - Firestore Database
   - Cloud Storage
3. Copy your Firebase config and replace the placeholder values in `firebaseConfig.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the App

```bash
# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```



