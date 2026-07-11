import { uploadAvatar, uploadAttachment, deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { FILE_UPLOAD } from '../utils/constants.js';
import logger from '../utils/logger.js';
import fs from 'fs';

/**
 * Upload service for handling file uploads via Cloudinary
 */

/**
 * Validate file type and size
 * @param {Object} file - File object
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @param {Number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result
 */
export const validateFile = (file, allowedTypes = FILE_UPLOAD.ALLOWED_ALL_TYPES, maxSize = FILE_UPLOAD.MAX_SIZE) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type' };
  }

  return { valid: true };
};

/**
 * Upload user avatar
 * @param {Object} file - File object from express-fileupload
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Upload result with URL and public ID
 */
export const uploadUserAvatar = async (file, userId) => {
  try {
    if (!isCloudinaryConfigured()) {
      throw new Error('File upload service is not configured');
    }

    // Validate file
    const validation = validateFile(file, FILE_UPLOAD.ALLOWED_IMAGE_TYPES, 5 * 1024 * 1024); // 5MB for avatars
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Upload to Cloudinary
    const result = await uploadAvatar(file);

    // Clean up temp file if it exists
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }

    logger.info(`Avatar uploaded for user ${userId}`);
    return result;
  } catch (error) {
    logger.error('Upload avatar error:', error);
    
    // Clean up temp file on error
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
    
    throw error;
  }
};

/**
 * Upload todo attachment
 * @param {Object} file - File object from express-fileupload
 * @param {String} todoId - Todo ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Upload result with URL, filename, size, etc.
 */
export const uploadTodoAttachment = async (file, todoId, userId) => {
  try {
    if (!isCloudinaryConfigured()) {
      throw new Error('File upload service is not configured');
    }

    // Validate file
    const validation = validateFile(file, FILE_UPLOAD.ALLOWED_ALL_TYPES, FILE_UPLOAD.MAX_SIZE);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Upload to Cloudinary
    const result = await uploadAttachment(file);

    // Clean up temp file
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }

    logger.info(`Attachment uploaded for todo ${todoId} by user ${userId}`);
    
    return {
      url: result.url,
      publicId: result.publicId,
      filename: result.filename,
      mimeType: result.mimeType,
      size: result.size,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };
  } catch (error) {
    logger.error('Upload attachment error:', error);
    
    // Clean up temp file on error
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
    
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteFile = async (publicId) => {
  try {
    if (!isCloudinaryConfigured()) {
      logger.warn('File upload service is not configured');
      return false;
    }

    const result = await deleteFromCloudinary(publicId);
    logger.info(`File deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Delete file error:', error);
    return false;
  }
};

/**
 * Delete user avatar
 * @param {String} avatarUrl - Avatar URL to extract public ID from
 * @returns {Promise<Boolean>} Success status
 */
export const deleteUserAvatar = async (avatarUrl) => {
  try {
    if (!avatarUrl) {
      return false;
    }

    // Extract public ID from URL
    const publicId = extractPublicIdFromUrl(avatarUrl);
    if (!publicId) {
      logger.warn('Could not extract public ID from avatar URL');
      return false;
    }

    return await deleteFile(publicId);
  } catch (error) {
    logger.error('Delete avatar error:', error);
    return false;
  }
};

/**
 * Delete todo attachment
 * @param {String} attachmentUrl - Attachment URL
 * @returns {Promise<Boolean>} Success status
 */
export const deleteTodoAttachment = async (attachmentUrl) => {
  try {
    if (!attachmentUrl) {
      return false;
    }

    const publicId = extractPublicIdFromUrl(attachmentUrl);
    if (!publicId) {
      logger.warn('Could not extract public ID from attachment URL');
      return false;
    }

    return await deleteFile(publicId);
  } catch (error) {
    logger.error('Delete attachment error:', error);
    return false;
  }
};

/**
 * Extract Cloudinary public ID from URL
 * @param {String} url - Cloudinary URL
 * @returns {String|null} Public ID or null
 */
const extractPublicIdFromUrl = (url) => {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return matches ? matches[1] : null;
  } catch (error) {
    logger.error('Extract public ID error:', error);
    return null;
  }
};

/**
 * Get file info from URL
 * @param {String} url - File URL
 * @returns {Object} File info
 */
export const getFileInfo = (url) => {
  try {
    const filename = url.split('/').pop();
    const extension = filename.split('.').pop();
    
    return {
      filename,
      extension,
      publicId: extractPublicIdFromUrl(url),
    };
  } catch (error) {
    logger.error('Get file info error:', error);
    return null;
  }
};

/**
 * Format file size to human-readable format
 * @param {Number} bytes - File size in bytes
 * @returns {String} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default {
  validateFile,
  uploadUserAvatar,
  uploadTodoAttachment,
  deleteFile,
  deleteUserAvatar,
  deleteTodoAttachment,
  getFileInfo,
  formatFileSize,
};