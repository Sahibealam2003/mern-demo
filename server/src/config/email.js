import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

let transporter = null;

/**
 * Configure email transporter
 */
export const configureEmail = () => {
  try {
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT || 587;
    const user = process.env.EMAIL_USER;
    const password = process.env.EMAIL_PASSWORD;

    if (!host || !user || !password) {
      logger.warn('Email credentials not provided - email notifications will be disabled');
      return false;
    }

    transporter = nodemailer.createTransporter({
      host,
      port,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user,
        pass: password,
      },
    });

    // Verify connection
    transporter.verify((error) => {
      if (error) {
        logger.error('Email configuration error:', error);
        transporter = null;
      } else {
        logger.info('Email service configured successfully');
      }
    });

    return true;
  } catch (error) {
    logger.error('Failed to configure email:', error);
    return false;
  }
};

/**
 * Send email
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    logger.warn('Email transporter not configured');
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text: text || '',
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}`, { messageId: info.messageId });
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (email, token, name) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Todo App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html,
    text: `Hi ${name},\n\nPlease verify your email by clicking this link: ${verificationUrl}\n\nThis link will expire in 24 hours.`,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, token, name) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Todo App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
    text: `Hi ${name},\n\nYou requested to reset your password. Click this link: ${resetUrl}\n\nThis link will expire in 1 hour.`,
  });
};

/**
 * Send workspace invitation email
 */
export const sendInvitationEmail = async (email, workspaceName, inviterName, token) => {
  const invitationUrl = `${process.env.FRONTEND_URL}/invitations/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Workspace Invitation</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join the workspace <strong>"${workspaceName}"</strong>.</p>
          <p>Click the button below to accept the invitation:</p>
          <a href="${invitationUrl}" class="button">Accept Invitation</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #7c3aed;">${invitationUrl}</p>
          <p>This invitation will expire in 7 days.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Todo App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Invitation to join "${workspaceName}"`,
    html,
    text: `${inviterName} has invited you to join "${workspaceName}".\n\nAccept invitation: ${invitationUrl}`,
  });
};

/**
 * Send task assignment notification email
 */
export const sendTaskAssignmentEmail = async (email, taskTitle, assignerName, workspaceName) => {
  const appUrl = process.env.FRONTEND_URL;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Assigned</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p><strong>${assignerName}</strong> has assigned you a new task in <strong>"${workspaceName}"</strong>:</p>
          <p style="background: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
            <strong>${taskTitle}</strong>
          </p>
          <a href="${appUrl}" class="button">View Task</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Todo App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `New task assigned: ${taskTitle}`,
    html,
    text: `${assignerName} has assigned you a new task in "${workspaceName}": ${taskTitle}`,
  });
};

/**
 * Check if email is configured
 */
export const isEmailConfigured = () => transporter !== null;

export default {
  configureEmail,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendTaskAssignmentEmail,
  isEmailConfigured,
};