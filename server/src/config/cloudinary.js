import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

let isConfigured = false;

/**
 * Configure Cloudinary
 */
export const configureCloudinary = () => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn('Cloudinary credentials not provided - file upload will be disabled');
      return false;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    isConfigured = true;
    logger.info('Cloudinary configured successfully');
    return true;
  } catch (error) {
    logger.error('Failed to configure Cloudinary:', error);
    return false;
  }
};

/**
 * Upload image to Cloudinary
 */
export const uploadToCloudinary = async (file, folder = 'todo-app') => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath || file.path, {
      folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file');
  }
};

/**
 * Delete image from Cloudinary
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!isConfigured) {
    return false;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Upload avatar (optimized for profile pictures)
 */
export const uploadAvatar = async (file) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath || file.path, {
      folder: 'todo-app/avatars',
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
      resource_type: 'image',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    logger.error('Avatar upload error:', error);
    throw new Error('Failed to upload avatar');
  }
};

/**
 * Upload attachment (documents, images, etc.)
 */
export const uploadAttachment = async (file) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath || file.path, {
      folder: 'todo-app/attachments',
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      filename: file.name,
      mimeType: file.mimetype,
      size: file.size,
      format: result.format,
    };
  } catch (error) {
    logger.error('Attachment upload error:', error);
    throw new Error('Failed to upload attachment');
  }
};

/**
 * Check if Cloudinary is configured
 */
export const isCloudinaryConfigured = () => isConfigured;

export default {
  configureCloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadAvatar,
  uploadAttachment,
  isCloudinaryConfigured,
};