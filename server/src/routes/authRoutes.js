import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshAccessToken,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
  updateProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } from '../middleware/validationMiddleware.js';
import { uploadUserAvatar } from '../services/uploadService.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshAccessToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);

// Protected routes
router.use(protect);
router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.post('/resend-verification', resendVerificationEmail);
router.post('/change-password', validate(changePasswordSchema), changePassword);

// Upload avatar
router.post('/avatar', async (req, res) => {
  try {
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = await uploadUserAvatar(req.files.avatar, req.user.id);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: result.url },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { user },
    });
  } catch (error) {
    logger.error('Avatar upload route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
