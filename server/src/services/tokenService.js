import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import { generateToken } from '../utils/helpers.js';
import logger from '../utils/logger.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_fallback';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_fallback';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7', 10);

/**
 * Generate a signed JWT access token
 * @param {Object} user - User document
 * @returns {String} Signed JWT
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate a refresh token, persist it to the database, and return the raw token string
 * @param {String} userId - User ID
 * @param {Object} meta - Optional metadata (ip, userAgent)
 * @returns {Promise<String>} Raw refresh token string
 */
export const generateRefreshToken = async (userId, meta = {}) => {
  try {
    const token = generateToken(64);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await RefreshToken.create({
      user: userId,
      token,
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return token;
  } catch (error) {
    logger.error('Generate refresh token error:', error);
    throw error;
  }
};

/**
 * Verify an access token and return the decoded payload
 * @param {String} token - JWT string
 * @returns {Object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify a refresh token against the database record
 * @param {String} token - Raw refresh token string
 * @returns {Promise<Object>} Decoded payload { userId }
 */
export const verifyRefreshToken = async (token) => {
  try {
    const record = await RefreshToken.findOne({ token }).lean();

    if (!record) {
      throw new Error('Refresh token not found');
    }

    if (record.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ token });
      throw new Error('Refresh token has expired');
    }

    return { userId: record.user };
  } catch (error) {
    logger.error('Verify refresh token error:', error);
    throw error;
  }
};

/**
 * Revoke a specific refresh token
 * @param {String} token - Raw refresh token string
 * @returns {Promise<Boolean>}
 */
export const revokeRefreshToken = async (token) => {
  try {
    await RefreshToken.deleteOne({ token });
    return true;
  } catch (error) {
    logger.error('Revoke refresh token error:', error);
    return false;
  }
};

/**
 * Revoke all refresh tokens for a user (e.g. logout everywhere)
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Number of tokens revoked
 */
export const revokeAllUserTokens = async (userId) => {
  try {
    const result = await RefreshToken.deleteMany({ user: userId });
    return result.deletedCount;
  } catch (error) {
    logger.error('Revoke all user tokens error:', error);
    throw error;
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
