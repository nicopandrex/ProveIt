# Migration Guide: Firebase to MongoDB + AWS S3

This guide will help you migrate your ProveIt app from Firebase to MongoDB + AWS S3 while keeping Firebase for authentication.

## ✅ Code Changes Completed

I've already updated your codebase with the following changes:

### 1. **Firebase Configuration Updated**
- `firebaseConfig.js` now only includes authentication
- Removed Firestore and Storage imports

### 2. **Service Files Updated**
- `src/services/postService.js` - Now uses MongoDB and S3
- `src/services/mongoService.js` - MongoDB operations (already existed)
- `src/services/s3Service.js` - AWS S3 operations (already existed)

### 3. **Screen Components Updated**
- `src/screens/GoalsScreen.js` - Uses MongoDB for goals
- `src/screens/CreateGoalScreen.js` - Uses MongoDB for goal creation
- `src/screens/CreatePostScreen.js` - Uses S3 for image uploads
- `src/screens/FeedScreen.js` - Uses MongoDB for posts
- `src/components/PostCard.js` - Uses MongoDB for reactions

## 🔧 What You Need to Do

### 1. **Set Up MongoDB**

#### Option A: MongoDB Atlas (Recommended for production)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Create a database named `proveit`

#### Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Database will be created automatically

### 2. **Set Up AWS S3**

1. **Create AWS Account**
   - Go to [AWS Console](https://console.aws.amazon.com)
   - Create an account if you don't have one

2. **Create S3 Bucket**
   - Go to S3 service
   - Click "Create bucket"
   - Choose a unique bucket name (e.g., `proveit-images-2024`)
   - Select your preferred region
   - **Important**: Enable public read access for uploaded images

3. **Create IAM User (Step-by-Step)**
   
   **Step 1:** Go to IAM service in AWS Console
   
   **Step 2:** Click "Users" in left sidebar → "Create user"
   
   **Step 3:** User details:
   - Username: `proveit-s3-user`
   - Check "Provide user access to the AWS Management Console" (optional)
   - Check "Programmatic access"
   
   **Step 4:** Permissions:
   - Click "Attach policies directly"
   - Search for "S3" 
   - Check "AmazonS3FullAccess"
   - Click "Next"
   
   **Step 5:** Review and create
   - Click "Create user"
   - **IMPORTANT:** Download the CSV file with credentials
   - Save Access Key ID and Secret Access Key

### **Alternative: Use Root User (Quick but Less Secure)**
1. Go to AWS Console → Your account name (top right)
2. Click "Security credentials"
3. Scroll to "Access keys" section
4. Click "Create access key"
5. Choose "Application running outside AWS"
6. **Save the credentials securely**

### 3. **Environment Variables**

Create a `.env` file in your project root:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/proveit
MONGODB_DATABASE=proveit

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Firebase (keep your existing values)
FIREBASE_API_KEY=AIzaSyAJBiSkn5R0iCpZ4FOkv7CBl7H6WIxfWM8
FIREBASE_AUTH_DOMAIN=test-d72d4.firebaseapp.com
FIREBASE_PROJECT_ID=test-d72d4
```

### 4. **Install Dependencies**

The required dependencies are already in your `package.json`:
- `mongodb` - For database operations
- `aws-sdk` - For S3 operations
- `firebase` - For authentication only

Run:
```bash
npm install
```

### 5. **Update Firebase Project Settings**

In your Firebase Console:
1. Go to Project Settings
2. You can disable Firestore and Storage if you want
3. Keep Authentication enabled
4. Update your app to only use authentication

## 🗄️ Database Schema

Your MongoDB collections will have this structure:

### Users Collection
```javascript
{
  _id: "firebase_user_id",
  displayName: "User Name",
  email: "user@example.com",
  photoURL: "https://...",
  stats: {
    tomatoCount: 0,
    postsCompleted: 0,
    longestStreak: 0
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Goals Collection
```javascript
{
  _id: ObjectId,
  userId: "firebase_user_id",
  title: "Goal Title",
  frequency: "daily" | "weekly",
  dueTime: "6:00 PM",
  completedDates: ["2024-01-01", "2024-01-02"],
  currentStreak: 5,
  longestStreak: 10,
  isPrivate: false,
  createdAt: Date
}
```

### Posts Collection
```javascript
{
  _id: ObjectId,
  userId: "firebase_user_id",
  userDisplayName: "User Name",
  goalId: ObjectId,
  type: "goal_created" | "proof_post" | "missed_goal" | "streak_warning",
  message: "Post message",
  imageUrl: "https://s3.amazonaws.com/...",
  caption: "Optional caption",
  timestamp: Date,
  reactions: {
    cheer: 5,
    nudge: 2,
    tomato: 1
  }
}
```

### Interactions Collection
```javascript
{
  _id: ObjectId,
  postId: ObjectId,
  type: "cheer" | "nudge" | "tomato",
  from: "firebase_user_id",
  timestamp: Date
}
```

## 🔒 **Ultra-Fast Secure Image Handling**

Your app now uses **optimized pre-signed URLs** with aggressive caching for social media speed:

- **Upload**: Images are uploaded privately to S3 (no public access)
- **Display**: Pre-signed URLs with multi-layer caching
- **Security**: Images are only accessible through your app
- **Performance**: **INSTANT** loading for cached images, 2-hour URL expiration

### 🚀 **Speed Optimizations:**

1. **Memory Cache**: Instant access for recently viewed images
2. **AsyncStorage Cache**: Persistent cache across app sessions
3. **Preloading**: Feed images are preloaded in background
4. **Batch Processing**: Multiple URLs fetched in parallel
5. **Smart Fallbacks**: Graceful degradation if secure URLs fail

### How it works:
1. User uploads photo → Stored privately in S3
2. PostCard loads → **INSTANT** if cached, otherwise fetches secure URL
3. Feed loads → **Preloads** all images in background
4. Images display → **Zero loading time** for cached images
5. URL expires → Automatic security after 2 hours

## 🚀 Testing the Migration

1. **Start your app:**
   ```bash
   npm start
   ```

2. **Test key features:**
   - User registration/login (Firebase Auth)
   - Create a goal (MongoDB)
   - Take a photo and post proof (S3 + MongoDB)
   - View feed (MongoDB) - **Images should load securely**
   - Add reactions (MongoDB)

## 🔍 Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Check your connection string
   - Ensure MongoDB is running
   - Verify network access (for Atlas)

2. **S3 Upload Error**
   - Check AWS credentials
   - Verify bucket name and region
   - Ensure bucket has public read access

3. **Firebase Auth Error**
   - Verify Firebase config
   - Check authentication rules

4. **Image Loading Issues**
   - Check S3 bucket permissions
   - Verify AWS credentials have S3 access
   - Ensure pre-signed URLs are generating correctly

## 📝 Next Steps

After successful migration:

1. **Monitor Performance**
   - Check MongoDB Atlas metrics
   - Monitor S3 usage and costs

2. **Optimize**
   - Add database indexes for better performance
   - Implement connection pooling
   - Add error handling and retry logic

3. **Security**
   - Review S3 bucket permissions
   - Implement proper CORS settings
   - Add input validation

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify all environment variables are set
3. Test each service individually
4. Check AWS and MongoDB logs

The app should function exactly the same as before, but now using MongoDB for data storage and AWS S3 for file storage, while keeping Firebase for authentication.
