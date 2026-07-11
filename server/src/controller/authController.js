const authService = require("../services/authService");
const logger = require("../utils/logger");

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const result = await authService.registerUser({
      name,
      email,
      password,
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip,
    });

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, result.refreshToken);

    logger.info(`User registered successfully: ${email}`);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
        // Note: Refresh token is sent via cookie, not in body
      },
    });
  } catch (error) {
    logger.warn(`Registration failed: ${error.message}`, {
      email: req.body.email,
      ip: req.ip,
    });

    // Handle duplicate email error
    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "USER_EXISTS",
      });
    }

    // Handle validation errors
    if (error.message.includes("Password")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "WEAK_PASSWORD",
      });
    }

    next(error);
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginUser({
      email,
      password,
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip,
    });

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, result.refreshToken);

    logger.info(`User logged in: ${email}`);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    logger.warn(`Login failed: ${error.message}`, {
      email: req.body.email,
      ip: req.ip,
    });

    if (
      error.message.includes("Invalid") ||
      error.message.includes("deactivated")
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
        code: "AUTH_FAILED",
      });
    }

    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    await authService.logoutUser(refreshToken);

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    logger.info(`User logged out, token revoked`);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    // Even if there's an error, clear the cookie
    clearRefreshTokenCookie(res);
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
        code: "NO_REFRESH_TOKEN",
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    // Set new refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    logger.warn(`Token refresh failed: ${error.message}`);

    // Clear invalid cookie
    clearRefreshTokenCookie(res);

    if (error.message.includes("revoked") || error.message.includes("expired")) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "SESSION_EXPIRED",
      });
    }

    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    // req.user is set by authenticate middleware
    const user = await authService.getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error(`Get current user failed: ${error.message}`);
    next(error);
  }
};

// Helper: Set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  };

  res.cookie("refreshToken", token, cookieOptions);
};

// Helper: Clear refresh token cookie
const clearRefreshTokenCookie = (res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  });
};

module.exports = exports;