import AWS from 'aws-sdk';

import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME } from '@env';

// AWS S3 Configuration
const s3Config = {
  accessKeyId: AWS_ACCESS_KEY_ID || 'YOUR_AWS_ACCESS_KEY_ID',
  secretAccessKey: AWS_SECRET_ACCESS_KEY || 'YOUR_AWS_SECRET_ACCESS_KEY',
  region: AWS_REGION || 'us-east-2',
  bucketName: S3_BUCKET_NAME || 'proveittest-images'
};

// Initialize S3
const s3 = new AWS.S3({
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey,
  region: s3Config.region
});

/**
 * Upload an image to S3
 * @param {string} imageUri - Local image URI
 * @param {string} postId - Post ID for organizing files
 * @param {string} fileName - File name (optional, defaults to 'proof.jpg')
 * @returns {Promise<string>} - S3 URL of uploaded image
 */
export const uploadImageToS3 = async (imageUri, postId, fileName = 'proof.jpg') => {
  try {
    console.log('Starting S3 upload for post:', postId);
    console.log('Image URI:', imageUri);
    
    // For React Native, use a simpler approach with fetch and direct upload
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get the response as array buffer directly
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log('Image buffer size:', buffer.length, 'bytes');
    
    // S3 upload parameters
    const uploadParams = {
      Bucket: s3Config.bucketName,
      Key: `posts/${postId}/${fileName}`,
      Body: buffer,
      ContentType: 'image/jpeg'
      // Removed ACL: 'public-read' for security
    };
    
    console.log('Uploading to S3...');
    const result = await s3.upload(uploadParams).promise();
    console.log('S3 upload successful:', result.Location);
    
    return result.Location; // Return the public URL
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload image to S3: ' + error.message);
  }
};

/**
 * Delete an image from S3
 * @param {string} postId - Post ID
 * @param {string} fileName - File name
 * @returns {Promise<void>}
 */
export const deleteImageFromS3 = async (postId, fileName = 'proof.jpg') => {
  try {
    const deleteParams = {
      Bucket: s3Config.bucketName,
      Key: `posts/${postId}/${fileName}`
    };
    
    await s3.deleteObject(deleteParams).promise();
    console.log('S3 image deleted successfully');
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete image from S3: ' + error.message);
  }
};

/**
 * Upload user profile image to S3
 * @param {string} imageUri - Local image URI
 * @param {string} userId - User ID
 * @param {string} fileName - File name (optional)
 * @returns {Promise<string>} - S3 URL of uploaded image
 */
export const uploadProfileImageToS3 = async (imageUri, userId, fileName = 'profile.jpg') => {
  try {
    console.log('Starting S3 profile upload for user:', userId);
    
    // Fetch the image
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get the response as array buffer directly
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // S3 upload parameters
    const uploadParams = {
      Bucket: s3Config.bucketName,
      Key: `users/${userId}/${fileName}`,
      Body: buffer,
      ContentType: 'image/jpeg'
      // Removed ACL for security
    };
    
    console.log('Uploading profile image to S3...');
    const result = await s3.upload(uploadParams).promise();
    console.log('S3 profile upload successful:', result.Location);
    
    return result.Location;
  } catch (error) {
    console.error('S3 profile upload error:', error);
    throw new Error('Failed to upload profile image to S3: ' + error.message);
  }
};

/**
 * Generate a pre-signed URL for secure access to an image
 * @param {string} postId - Post ID
 * @param {string} fileName - File name
 * @param {number} expiresIn - URL expiration time in seconds (default: 2 hours for better caching)
 * @returns {Promise<string>} - Pre-signed URL
 */
export const getPresignedImageUrl = async (postId, fileName = 'proof.jpg', expiresIn = 7200) => {
  try {
    const params = {
      Bucket: s3Config.bucketName,
      Key: `posts/${postId}/${fileName}`,
      Expires: expiresIn
    };
    
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('Generate presigned URL error:', error);
    throw new Error('Failed to generate presigned URL: ' + error.message);
  }
};

export default {
  uploadImageToS3,
  deleteImageFromS3,
  uploadProfileImageToS3,
  getPresignedImageUrl
};
