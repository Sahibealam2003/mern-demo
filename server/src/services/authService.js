const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const RefreshToken = require("../model/refreshTokenSchema");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("./tokenService");
const logger = require("../utils/logger");

// Bcrypt salt rounds
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt with salt rounds of 12
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} plainPassword - Plain text password to compare
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Validate password strength
 * Requirements: >8 chars, contains letter, number, special character
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, message: string }
 */
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }
  return { valid: true, message: "Password is valid" };
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and tokens
 */
const registerUser = async (userData) => {
  const { name, email, password } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
  });

  // Generate tokens
  const tokenPayload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: user._id });

  // Store refresh token
  await storeRefreshToken(user._id, refreshToken, userData.userAgent, userData.ipAddress);

  logger.info(`New user registered: ${user.email}`);

  // Return user without password and tokens
  const userResponse = user.toObject();
  delete userResponse.password;

  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

/**
 * Authenticate a user and generate tokens
 * @param {Object} credentials - User login credentials
 * @returns {Promise<Object>} Authenticated user and tokens
 */
const loginUser = async (credentials) => {
  const { email, password } = credentials;

  // Find user with password field (excluded by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  
  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.active) {
    throw new Error("Account is deactivated. Contact administrator.");
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Failed login attempt for email: ${email}`);
    throw new Error("Invalid email or password");
  }

  // Check if password was recently changed (re-issue tokens if needed)
  const tokenPayload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: user._id });

  // Store refresh token with rotation (invalidate old tokens)
  await revokeAllUserTokens(user._id);
  await storeRefreshToken(user._id, refreshToken, credentials.userAgent, credentials.ipAddress);

  logger.info(`User logged in: ${user.email}`);

  // Return user without password
  const userResponse = user.toObject();
  delete userResponse.password;

  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

/**
 * Logout user by revoking refresh token
 * @param {string} refreshToken - Refresh token to revoke
 * @returns {Promise<boolean>}
 */
const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    return true;
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return true;
  }

  // Revoke the specific token
  const result = await RefreshToken.findOneAndUpdate(
    { token: refreshToken, isRevoked: false },
    { isRevoked: true },
    { new: true }
  );

  if (result) {
    logger.info(`User logged out, token revoked for user ID: ${decoded.id}`);
  }

  return true;
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Current refresh token
 * @returns {Promise<Object>} New access token and optionally new refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    throw new Error("Invalid or expired refresh token");
  }

  // Check if token exists and is not revoked
  const storedToken = await RefreshToken.findOne({
    token: refreshToken,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!storedToken) {
    throw new Error("Refresh token has been revoked or expired");
  }

  // Get user
  const user = await User.findById(decoded.id);
  if (!user || !user.active) {
    throw new Error("User not found or inactive");
  }

  // Generate new access token (rotate refresh token for security)
  const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken({ id: user._id });

  // Rotate: revoke old token, store new one
  await RefreshToken.findByIdAndUpdate(storedToken._id, { isRevoked: true });
  await storeRefreshToken(user._id, newRefreshToken, storedToken.userAgent, storedToken.ipAddress);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Get current authenticated user profile
 * @param {string} userId - User ID from token
 * @returns {Promise<Object>} User profile without sensitive data
 */
const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.active) {
    throw new Error("Account is deactivated");
  }

  return user.toObject();
};

/**
 * Store refresh token in database
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 * @param {string} userAgent - Browser/user agent string
 * @param {string} ipAddress - Client IP address
 */
const storeRefreshToken = async (userId, token, userAgent = "Unknown", ipAddress = "Unknown") => {
  // Calculate expiry (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId,
    token,
    expiresAt,
    userAgent,
    ipAddress,
  });
};

/**
 * Revoke all refresh tokens for a user (used on password change or logout all)
 * @param {string} userId - User ID
 */
const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true }
  );
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword,
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  revokeAllUserTokens,
};