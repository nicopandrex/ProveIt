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

## App Structure

```
src/
├── components/          # Reusable UI components
│   └── PostCard.js     # Individual post display
├── navigation/         # Navigation configuration
│   ├── AppNavigator.js # Main app navigator
│   ├── AuthStack.js    # Authentication screens
│   └── MainTabs.js     # Bottom tab navigation
├── screens/            # App screens
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── FeedScreen.js
│   ├── GoalsScreen.js
│   ├── CaptureScreen.js
│   ├── ProfileScreen.js
│   ├── CreateGoalScreen.js
│   └── CreatePostScreen.js
├── services/           # Firebase operations
│   └── postService.js  # Post and reaction handling
└── utils/              # Utility functions
```

## Friending System

### Username System

Every user has a unique username that:
- Must be 3-20 characters long
- Can only contain letters, numbers, underscores, and dashes
- Is case-insensitive for uniqueness (stored as lowercase)
- Displays with original casing preference
- Can be changed once every 30 days

### How to Add Friends

1. **Search for Users**
   - Navigate to Profile → Friends → Add (person-add icon)
   - Search by username or display name
   - Send friend requests to users you find

2. **Friend Request Flow**
   - Sender: Search for user → Tap "Add Friend" → Request sent
   - Recipient: Receive request → Accept or Decline
   - Both users added to each other's friends list upon acceptance

3. **Managing Friends**
   - View all friends in Friends screen
   - See pending requests (received and sent)
   - Remove friends with confirmation dialog
   - Cancel sent requests before acceptance

### Privacy & Visibility

**Friends-Only by Default**
- All posts are visible only to friends
- Users can only see posts from users they're friends with
- Own posts are always visible to self

**Feed Tabs**
- **Friends**: Shows posts from accepted friends only
- **Me**: Shows only your own posts

If you have no friends yet, the Friends feed will show a helpful empty state with a button to find friends.

### Security Rules

Firestore security rules enforce:
- Users can only read posts from friends or themselves
- Friend requests are only visible to sender and recipient
- Username documents are read-only (prevents squatting)
- Users can only modify their own data

## Firestore Data Structure

### Users Collection
```
/users/{uid}
├── displayName: string
├── username: string (lowercase, unique)
├── usernameDisplay: string (original casing)
├── email: string
├── photoURL: string | null
├── friends: array of userIds
├── stats: {
│   ├── tomatoCount: number
│   ├── postsCompleted: number
│   └── longestStreak: number
│   }
├── createdAt: timestamp
└── usernameChangedAt: timestamp | null
```

### Usernames Collection
```
/usernames/{username}
├── userId: string (for quick username → userId lookup)
└── createdAt: timestamp
```

### Friend Requests Collection
```
/friendRequests/{requestId}
├── from: userId (who sent the request)
├── to: userId (who receives the request)
├── fromUsername: string
├── fromDisplayName: string
├── status: "pending" | "accepted" | "declined"
└── createdAt: timestamp
```

### Goals Collection
```
/users/{uid}/goals/{goalId}
├── title: string
├── frequency: "daily" | "weekly"
├── dueTime: string
├── completedDates: array
├── currentStreak: number
├── longestStreak: number
└── isPrivate: boolean
```

### Posts Collection
```
/posts/{postId}
├── userId: string
├── userDisplayName: string
├── goalId: string
├── type: "goal_created" | "proof_post" | "missed_goal" | "streak_warning"
├── message: string
├── imageUrl: string (for proof posts)
├── caption: string (for proof posts)
├── timestamp: timestamp
└── reactions: {
    ├── cheer: number
    ├── nudge: number
    └── tomato: number
    }
```

### Interactions Subcollection
```
/posts/{postId}/interactions/{interactionId}
├── type: "cheer" | "nudge" | "tomato"
├── from: string (userId)
└── timestamp: timestamp
```

## Key Features Implementation

### 1. Goal Creation Flow
- User creates a goal with title, frequency, and due time
- System automatically creates a "goal_created" post
- Goal is stored in user's personal goals collection

### 2. Proof Posting Flow
- User selects a goal and takes/selects a photo
- System uploads image to Firebase Storage
- Creates a "proof_post" with image and optional caption
- Updates goal completion stats

### 3. Reaction System
- **Cheer**: Available on goal_created and proof_post
- **Nudge**: Available on streak_warning posts
- **Tomato**: Available on missed_goal posts
- Reactions are stored in subcollections and update counters

### 4. Automatic Events
- **Missed Goals**: System checks for overdue goals and creates missed_goal posts
- **Streak Warnings**: System warns when streaks are at risk
- **Streak Tracking**: Updates user streaks based on completion patterns

## Development Notes

- The app uses a dark theme inspired by BeReal
- All screens are designed for mobile-first
- Real-time updates using Firestore listeners
- Image handling with Expo Image Picker
- Navigation uses React Navigation v6

## Next Steps

- Implement push notifications for missed goals
- Add friend system for social features
- Implement streak warning logic
- Add more reaction animations
- Create achievement system
- Add goal categories and tags

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
