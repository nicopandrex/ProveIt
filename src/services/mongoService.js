import { MongoClient, ObjectId } from 'mongodb';
import { MONGODB_URI, MONGODB_DATABASE } from '@env';

// MongoDB Configuration
const mongoConfig = {
  connectionString: MONGODB_URI || 'mongodb://localhost:27017/proveit',
  databaseName: MONGODB_DATABASE || 'proveit',
  collections: {
    posts: 'posts',
    goals: 'goals',
    users: 'users',
    interactions: 'interactions'
  }
};

let client = null;
let db = null;

/**
 * Connect to MongoDB
 * @returns {Promise<Object>} - Database connection
 */
const connectToMongo = async () => {
  if (client && db) {
    return db;
  }

  try {
    client = new MongoClient(mongoConfig.connectionString);
    await client.connect();
    db = client.db(mongoConfig.databaseName);
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB: ' + error.message);
  }
};

/**
 * Close MongoDB connection
 */
export const closeMongoConnection = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
};

// ==================== POSTS ====================

/**
 * Create a new post
 * @param {Object} postData - Post data
 * @returns {Promise<string>} - Post ID
 */
export const createPost = async (postData) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(mongoConfig.collections.posts);
    
    const post = {
      ...postData,
      timestamp: new Date(),
      reactions: {
        cheer: 0,
        nudge: 0,
        tomato: 0,
      },
    };
    
    const result = await collection.insertOne(post);
    console.log('Post created with ID:', result.insertedId);
    return result.insertedId.toString();
  } catch (error) {
    console.error('Create post error:', error);
    throw new Error('Failed to create post: ' + error.message);
  }
};

/**
 * Get all posts with real-time updates
 * @param {Function} callback - Callback function for updates
 * @returns {Function} - Unsubscribe function
 */
export const getPosts = (callback) => {
  let isSubscribed = true;
  
  const fetchPosts = async () => {
    try {
      const database = await connectToMongo();
      const collection = database.collection(mongoConfig.collections.posts);
      
      const posts = await collection
        .find({})
        .sort({ timestamp: -1 })
        .toArray();
      
      if (isSubscribed) {
        callback(posts);
      }
    } catch (error) {
      console.error('Get posts error:', error);
      if (isSubscribed) {
        callback([]);
      }
    }
  };
  
  // Initial fetch
  fetchPosts();
  
  // Poll for updates every 5 seconds
  const interval = setInterval(fetchPosts, 5000);
  
  // Return unsubscribe function
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
};

/**
 * Update post with image URL
 * @param {string} postId - Post ID
 * @param {string} imageUrl - Image URL
 * @returns {Promise<void>}
 */
export const updatePostImage = async (postId, imageUrl) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(mongoConfig.collections.posts);
    
    await collection.updateOne(
      { _id: new ObjectId(postId) },
      { $set: { imageUrl } }
    );
    
    console.log('Post image updated');
  } catch (error) {
    console.error('Update post image error:', error);
    throw new Error('Failed to update post image: ' + error.message);
  }
};

/**
 * Add reaction to a post
 * @param {string} postId - Post ID
 * @param {string} reactionType - Type of reaction
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const addReaction = async (postId, reactionType, userId) => {
  try {
    const database = await connectToMongo();
    const postsCollection = database.collection(mongoConfig.collections.posts);
    const interactionsCollection = database.collection(mongoConfig.collections.interactions);
    
    // Add to interactions collection
    await interactionsCollection.insertOne({
      postId: new ObjectId(postId),
      type: reactionType,
      from: userId,
      timestamp: new Date()
    });
    
    // Update post reaction count
    await postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { [`reactions.${reactionType}`]: 1 } }
    );
    
    console.log('Reaction added successfully');
  } catch (error) {
    console.error('Add reaction error:', error);
    throw new Error('Failed to add reaction: ' + error.message);
  }
};

// ==================== GOALS ====================

/**
 * Create a new goal
 * @param {string} userId - User ID
 * @param {Object} goalData - Goal data
 * @returns {Promise<string>} - Goal ID
 */
export const createGoal = async (userId, goalData) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(mongoConfig.collections.goals);
    
    const goal = {
      ...goalData,
      userId,
      completedDates: [],
      currentStreak: 0,
      longestStreak: 0,
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(goal);
    console.log('Goal created with ID:', result.insertedId);
    return result.insertedId.toString();
  } catch (error) {
    console.error('Create goal error:', error);
    throw new Error('Failed to create goal: ' + error.message);
  }
};

/**
 * Get user goals
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function for updates
 * @returns {Function} - Unsubscribe function
 */
export const getUserGoals = (userId, callback) => {
  let isSubscribed = true;
  
  const fetchGoals = async () => {
    try {
      const database = await connectToMongo();
      const collection = database.collection(mongoConfig.collections.goals);
      
      const goals = await collection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      if (isSubscribed) {
        callback(goals);
      }
    } catch (error) {
      console.error('Get user goals error:', error);
      if (isSubscribed) {
        callback([]);
      }
    }
  };
  
  // Initial fetch
  fetchGoals();
  
  // Poll for updates every 5 seconds
  const interval = setInterval(fetchGoals, 5000);
  
  // Return unsubscribe function
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
};

/**
 * Delete a goal
 * @param {string} goalId - Goal ID
 * @returns {Promise<void>}
 */
export const deleteGoal = async (goalId) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(mongoConfig.collections.goals);
    
    await collection.deleteOne({ _id: new ObjectId(goalId) });
    console.log('Goal deleted successfully');
  } catch (error) {
    console.error('Delete goal error:', error);
    throw new Error('Failed to delete goal: ' + error.message);
  }
};

/**
 * Update goal completion
 * @param {string} goalId - Goal ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const updateGoalCompletion = async (goalId, userId) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(mongoConfig.collections.goals);
    
    const today = new Date().toISOString().split('T')[0];
    
    await collection.updateOne(
      { _id: new ObjectId(goalId), userId },
      { 
        $addToSet: { completedDates: today },
        $inc: { currentStreak: 1 },
        $max: { longestStreak: { $add: ["$currentStreak", 1] } }
      }
    );
    
    console.log('Goal completion updated');
  } catch (error) {
    console.error('Update goal completion error:', error);
    throw new Error('Failed to update goal completion: ' + error.message);
  }
};

// ==================== USERS ====================

/**
 * Create or update user
 * @param {string} userId - User ID
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
export const createOrUpdateUser = async (userId, userData) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(mongoConfig.collections.users);
    
    await collection.updateOne(
      { _id: userId },
      { 
        $set: { 
          ...userData,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    
    console.log('User created/updated successfully');
  } catch (error) {
    console.error('Create/update user error:', error);
    throw new Error('Failed to create/update user: ' + error.message);
  }
};

/**
 * Get user data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export const getUser = async (userId) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(mongoConfig.collections.users);
    
    const user = await collection.findOne({ _id: userId });
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    throw new Error('Failed to get user: ' + error.message);
  }
};

export default {
  connectToMongo,
  closeMongoConnection,
  createPost,
  getPosts,
  updatePostImage,
  addReaction,
  createGoal,
  getUserGoals,
  deleteGoal,
  updateGoalCompletion,
  createOrUpdateUser,
  getUser
};
