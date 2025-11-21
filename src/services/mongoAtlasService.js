import { MONGODB_URI, MONGODB_DATABASE } from '@env';

// MongoDB Atlas Data API Configuration
const atlasConfig = {
  // Extract cluster info from connection string
  clusterUrl: MONGODB_URI?.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/)?.[3] || 'proveittest.2l4lnly.mongodb.net',
  database: MONGODB_DATABASE || 'ProveItTest',
  // You'll need to get these from MongoDB Atlas
  apiKey: 'qgwhnqsl', // Get from Atlas -> Data API
  dataApiUrl: 'https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1' // Get from Atlas -> Data API
};

/**
 * Make a request to MongoDB Atlas Data API
 */
const makeAtlasRequest = async (endpoint, method = 'POST', body = {}) => {
  try {
    const response = await fetch(`${atlasConfig.dataApiUrl}/action/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'api-key': atlasConfig.apiKey,
      },
      body: JSON.stringify({
        dataSource: 'ProveItTest', // Your cluster name
        database: atlasConfig.database,
        collection: 'posts', // Will be overridden in each function
        ...body
      })
    });

    if (!response.ok) {
      throw new Error(`Atlas API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('MongoDB Atlas API error:', error);
    throw error;
  }
};

// ==================== POSTS ====================

/**
 * Create a new post
 */
export const createPost = async (postData) => {
  try {
    const result = await makeAtlasRequest('insertOne', 'POST', {
      collection: 'posts',
      document: {
        ...postData,
        timestamp: new Date(),
        reactions: {
          cheer: 0,
          nudge: 0,
          tomato: 0,
        },
      }
    });
    
    return result.insertedId;
  } catch (error) {
    console.error('Create post error:', error);
    throw new Error('Failed to create post: ' + error.message);
  }
};

/**
 * Get all posts with real-time updates (using polling)
 */
export const getPosts = (callback) => {
  let isSubscribed = true;
  
  const fetchPosts = async () => {
    try {
      const result = await makeAtlasRequest('find', 'POST', {
        collection: 'posts',
        sort: { timestamp: -1 }
      });
      
      if (isSubscribed) {
        callback(result.documents || []);
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
 */
export const updatePostImage = async (postId, imageUrl) => {
  try {
    await makeAtlasRequest('updateOne', 'POST', {
      collection: 'posts',
      filter: { _id: { $oid: postId } },
      update: { $set: { imageUrl } }
    });
    
    console.log('Post image updated');
  } catch (error) {
    console.error('Update post image error:', error);
    throw new Error('Failed to update post image: ' + error.message);
  }
};

/**
 * Add reaction to a post
 */
export const addReaction = async (postId, reactionType, userId) => {
  try {
    // Add to interactions collection
    await makeAtlasRequest('insertOne', 'POST', {
      collection: 'interactions',
      document: {
        postId: { $oid: postId },
        type: reactionType,
        from: userId,
        timestamp: new Date()
      }
    });
    
    // Update post reaction count
    await makeAtlasRequest('updateOne', 'POST', {
      collection: 'posts',
      filter: { _id: { $oid: postId } },
      update: { $inc: { [`reactions.${reactionType}`]: 1 } }
    });
    
    console.log('Reaction added successfully');
  } catch (error) {
    console.error('Add reaction error:', error);
    throw new Error('Failed to add reaction: ' + error.message);
  }
};

// ==================== GOALS ====================

/**
 * Create a new goal
 */
export const createGoal = async (userId, goalData) => {
  try {
    const result = await makeAtlasRequest('insertOne', 'POST', {
      collection: 'goals',
      document: {
        ...goalData,
        userId,
        completedDates: [],
        currentStreak: 0,
        longestStreak: 0,
        createdAt: new Date()
      }
    });
    
    return result.insertedId;
  } catch (error) {
    console.error('Create goal error:', error);
    throw new Error('Failed to create goal: ' + error.message);
  }
};

/**
 * Get user goals
 */
export const getUserGoals = (userId, callback) => {
  let isSubscribed = true;
  
  const fetchGoals = async () => {
    try {
      const result = await makeAtlasRequest('find', 'POST', {
        collection: 'goals',
        filter: { userId },
        sort: { createdAt: -1 }
      });
      
      if (isSubscribed) {
        callback(result.documents || []);
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
 */
export const deleteGoal = async (goalId) => {
  try {
    await makeAtlasRequest('deleteOne', 'POST', {
      collection: 'goals',
      filter: { _id: { $oid: goalId } }
    });
    
    console.log('Goal deleted successfully');
  } catch (error) {
    console.error('Delete goal error:', error);
    throw new Error('Failed to delete goal: ' + error.message);
  }
};

/**
 * Update goal completion
 */
export const updateGoalCompletion = async (goalId, userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await makeAtlasRequest('updateOne', 'POST', {
      collection: 'goals',
      filter: { _id: { $oid: goalId }, userId },
      update: { 
        $addToSet: { completedDates: today },
        $inc: { currentStreak: 1 },
        $max: { longestStreak: { $add: ["$currentStreak", 1] } }
      }
    });
    
    console.log('Goal completion updated');
  } catch (error) {
    console.error('Update goal completion error:', error);
    throw new Error('Failed to update goal completion: ' + error.message);
  }
};

export default {
  createPost,
  getPosts,
  updatePostImage,
  addReaction,
  createGoal,
  getUserGoals,
  deleteGoal,
  updateGoalCompletion
};
