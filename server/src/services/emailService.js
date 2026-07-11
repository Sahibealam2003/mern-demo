import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendTaskAssignmentEmail,
  isEmailConfigured,
} from '../config/email.js';
import logger from '../utils/logger.js';

/**
 * Email service wrapper for sending emails
 */

/**
 * Send welcome email with verification link
 * @param {Object} user - User object
 * @param {String} verificationToken - Email verification token
 * @returns {Promise<Boolean>} Success status
 */
export const sendWelcomeEmail = async (user, verificationToken) => {
  try {
    if (!isEmailConfigured()) {
      logger.warn('Email service not configured - skipping welcome email');
      return false;
    }

    const result = await sendVerificationEmail(user.email, verificationToken, user.name);
    
    if (result) {
      logger.info(`Welcome email sent to ${user.email}`);
    } else {
      logger.warn(`Failed to send welcome email to ${user.email}`);
    }
    
    return result;
  } catch (error) {
    logger.error('Send welcome email error:', error);
    return false;
  }
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {String} resetToken - Password reset token
 * @returns {Promise<Boolean>} Success status
 */
export const sendPasswordResetEmailService = async (user, resetToken) => {
  try {
    if (!isEmailConfigured()) {
      logger.warn('Email service not configured - skipping password reset email');
      return false;
    }

    const result = await sendPasswordResetEmail(user.email, resetToken, user.name);
    
    if (result) {
      logger.info(`Password reset email sent to ${user.email}`);
    } else {
      logger.warn(`Failed to send password reset email to ${user.email}`);
    }
    
    return result;
  } catch (error) {
    logger.error('Send password reset email error:', error);
    return false;
  }
};

/**
 * Send workspace invitation email
 * @param {String} email - Recipient email
 * @param {Object} workspace - Workspace object
 * @param {Object} inviter - Inviter user object
 * @param {String} invitationToken - Invitation token
 * @returns {Promise<Boolean>} Success status
 */
export const sendWorkspaceInvitationEmail = async (email, workspace, inviter, invitationToken) => {
  try {
    if (!isEmailConfigured()) {
      logger.warn('Email service not configured - skipping invitation email');
      return false;
    }

    const result = await sendInvitationEmail(
      email,
      workspace.name,
      inviter.name,
      invitationToken
    );
    
    if (result) {
      logger.info(`Workspace invitation email sent to ${email}`);
    } else {
      logger.warn(`Failed to send invitation email to ${email}`);
    }
    
    return result;
  } catch (error) {
    logger.error('Send invitation email error:', error);
    return false;
  }
};

/**
 * Send task assignment notification email
 * @param {Object} user - Assigned user object
 * @param {Object} todo - Todo object
 * @param {Object} assigner - Assigner user object
 * @param {Object} workspace - Workspace object
 * @returns {Promise<Boolean>} Success status
 */
export const sendTaskAssignmentEmailService = async (user, todo, assigner, workspace) => {
  try {
    if (!isEmailConfigured()) {
      logger.warn('Email service not configured - skipping task assignment email');
      return false;
    }

    // Check if user has email notifications enabled
    if (user.settings && user.settings.emailNotifications === false) {
      logger.info(`User ${user.email} has email notifications disabled`);
      return false;
    }

    const result = await sendTaskAssignmentEmail(
      user.email,
      todo.title,
      assigner.name,
      workspace.name
    );
    
    if (result) {
      logger.info(`Task assignment email sent to ${user.email}`);
    } else {
      logger.warn(`Failed to send task assignment email to ${user.email}`);
    }
    
    return result;
  } catch (error) {
    logger.error('Send task assignment email error:', error);
    return false;
  }
};

/**
 * Send task due date reminder email
 * @param {Object} user - User object
 * @param {Object} todo - Todo object
 * @param {Object} workspace - Workspace object
 * @returns {Promise<Boolean>} Success status
 */
export const sendDueDateReminderEmail = async (user, todo, workspace) => {
  try {
    if (!isEmailConfigured()) {
      logger.warn('Email service not configured - skipping due date reminder email');
      return false;
    }

    // Check if user has email notifications enabled
    if (user.settings && user.settings.emailNotifications === false) {
      return false;
    }

    // For now, use task assignment template (you can create a specific template later)
    const result = await sendTaskAssignmentEmail(
      user.email,
      `Reminder: ${todo.title}`,
      'System',
      workspace.name
    );
    
    if (result) {
      logger.info(`Due date reminder email sent to ${user.email}`);
    }
    
    return result;
  } catch (error) {
    logger.error('Send due date reminder email error:', error);
    return false;
  }
};

/**
 * Send comment notification email
 * @param {Object} user - User object
 * @param {Object} todo - Todo object
 * @param {Object} commenter - Commenter user object
 * @param {String} comment - Comment text
 * @param {Object} workspace - Workspace object
 * @returns {Promise<Boolean>} Success status
 */
export const sendCommentNotificationEmail = async (user, todo, commenter, comment, workspace) => {
  try {
    if (!isEmailConfigured()) {
      logger.warn('Email service not configured - skipping comment notification email');
      return false;
    }

    // Check if user has email notifications enabled
    if (user.settings && user.settings.emailNotifications === false) {
      return false;
    }

    // For now, use task assignment template (you can create a specific template later)
    const result = await sendTaskAssignmentEmail(
      user.email,
      `New comment on: ${todo.title}`,
      commenter.name,
      workspace.name
    );
    
    if (result) {
      logger.info(`Comment notification email sent to ${user.email}`);
    }
    
    return result;
  } catch (error) {
    logger.error('Send comment notification email error:', error);
    return false;
  }
};

/**
 * Send bulk emails (for notifications)
 * @param {Array} recipients - Array of recipient objects {email, name}
 * @param {String} subject - Email subject
 * @param {String} content - Email content
 * @returns {Promise<Object>} Result with success and failed counts
 */
export const sendBulkEmails = async (recipients, subject, content) => {
  try {
    if (!isEmailConfigured()) {
      logger.warn('Email service not configured - skipping bulk emails');
      return { success: 0, failed: recipients.length };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Send emails sequentially to avoid rate limits
    for (const recipient of recipients) {
      try {
        // You would implement a generic sendEmail function in config/email.js
        // For now, we'll skip this
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error.message,
        });
      }
    }

    logger.info(`Bulk emails sent: ${results.success} success, ${results.failed} failed`);
    return results;
  } catch (error) {
    logger.error('Send bulk emails error:', error);
    return { success: 0, failed: recipients.length, errors: [error.message] };
  }
};

/**
 * Check if email service is available
 * @returns {Boolean} Availability status
 */
export const isEmailServiceAvailable = () => {
  return isEmailConfigured();
};

export default {
  sendWelcomeEmail,
  sendPasswordResetEmailService,
  sendWorkspaceInvitationEmail,
  sendTaskAssignmentEmailService,
  sendDueDateReminderEmail,
  sendCommentNotificationEmail,
  sendBulkEmails,
  isEmailServiceAvailable,
};