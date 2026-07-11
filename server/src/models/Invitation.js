import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Member', 'Viewer'],
      default: 'Member',
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
invitationSchema.index({ workspace: 1, email: 1 });
invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ status: 1, expiresAt: 1 });

// TTL index to auto-delete expired invitations after 30 days
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Pre-save middleware to generate token
invitationSchema.pre('save', function (next) {
  if (!this.isModified('token') && this.token) {
    return next();
  }

  this.token = crypto.randomBytes(32).toString('hex');
  next();
});

// Pre-save middleware to set expiration (7 days from now)
invitationSchema.pre('save', function (next) {
  if (!this.isModified('expiresAt') && this.expiresAt) {
    return next();
  }

  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  next();
});

// Method to check if invitation is expired
invitationSchema.methods.isExpired = function () {
  return this.expiresAt < new Date() || this.status === 'expired';
};

// Method to check if invitation is pending
invitationSchema.methods.isPending = function () {
  return this.status === 'pending' && !this.isExpired();
};

// Method to accept invitation
invitationSchema.methods.accept = function () {
  if (!this.isPending()) {
    throw new Error('Invitation is not valid');
  }

  this.status = 'accepted';
  this.acceptedAt = new Date();
};

// Method to reject invitation
invitationSchema.methods.reject = function () {
  if (!this.isPending()) {
    throw new Error('Invitation is not valid');
  }

  this.status = 'rejected';
  this.rejectedAt = new Date();
};

// Static method to find by token
invitationSchema.statics.findByToken = function (token) {
  return this.findOne({ token })
    .populate('workspace', 'name description slug')
    .populate('invitedBy', 'name email avatar');
};

// Static method to find workspace invitations
invitationSchema.statics.findWorkspaceInvitations = function (workspaceId, options = {}) {
  const query = { workspace: workspaceId };

  if (options.status) {
    query.status = options.status;
  } else {
    query.status = 'pending';
  }

  return this.find(query)
    .populate('invitedBy', 'name email avatar')
    .sort({ createdAt: -1 });
};

// Static method to find user invitations by email
invitationSchema.statics.findUserInvitations = function (email) {
  return this.find({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('workspace', 'name description slug')
    .populate('invitedBy', 'name email avatar')
    .sort({ createdAt: -1 });
};

// Static method to check if invitation exists
invitationSchema.statics.invitationExists = function (workspaceId, email) {
  return this.findOne({
    workspace: workspaceId,
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
};

// Static method to expire old invitations
invitationSchema.statics.expireOldInvitations = function () {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() },
    },
    {
      status: 'expired',
    }
  );
};

const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;