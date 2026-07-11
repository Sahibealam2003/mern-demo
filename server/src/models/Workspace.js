import mongoose from 'mongoose';

const workspaceMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['Owner', 'Admin', 'Member', 'Viewer'],
    default: 'Member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [2, 'Workspace name must be at least 2 characters'],
      maxlength: [100, 'Workspace name must not exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [workspaceMemberSchema],
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
      defaultMemberRole: {
        type: String,
        enum: ['Member', 'Viewer'],
        default: 'Member',
      },
      todoAssignment: {
        type: Boolean,
        default: true,
      },
      commentPermissions: {
        type: String,
        enum: ['all', 'members', 'assigned'],
        default: 'members',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
workspaceSchema.index({ slug: 1 }, { unique: true });
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ createdAt: -1 });

// Virtual for member count
workspaceSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

// Pre-save middleware to generate slug
workspaceSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) {
    return next();
  }

  try {
    // Generate slug from name
    let slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure uniqueness
    let uniqueSlug = slug;
    let counter = 1;
    
    while (await this.constructor.findOne({ slug: uniqueSlug, _id: { $ne: this._id } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    this.slug = uniqueSlug;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if user is a member
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some((member) => member.user.toString() === userId.toString());
};

// Method to get user role in workspace
workspaceSchema.methods.getUserRole = function (userId) {
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Method to check if user has specific role
workspaceSchema.methods.hasRole = function (userId, roles) {
  const userRole = this.getUserRole(userId);
  if (!userRole) return false;
  
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return rolesArray.includes(userRole);
};

// Method to check if user is owner
workspaceSchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString();
};

// Method to check if user can manage members
workspaceSchema.methods.canManageMembers = function (userId) {
  return this.hasRole(userId, ['Owner', 'Admin']);
};

// Method to check if user can invite
workspaceSchema.methods.canInvite = function (userId) {
  if (this.settings.allowMemberInvites) {
    return this.isMember(userId);
  }
  return this.canManageMembers(userId);
};

// Method to check if user can create todos
workspaceSchema.methods.canCreateTodos = function (userId) {
  const role = this.getUserRole(userId);
  return role && role !== 'Viewer';
};

// Method to check if user can edit todos
workspaceSchema.methods.canEditTodos = function (userId, todoCreatorId) {
  const role = this.getUserRole(userId);
  if (!role || role === 'Viewer') return false;
  if (role === 'Owner' || role === 'Admin') return true;
  return todoCreatorId && todoCreatorId.toString() === userId.toString();
};

// Method to add member
workspaceSchema.methods.addMember = function (userId, role = 'Member', invitedBy = null) {
  if (this.isMember(userId)) {
    throw new Error('User is already a member');
  }

  this.members.push({
    user: userId,
    role,
    joinedAt: Date.now(),
    invitedBy,
  });
};

// Method to remove member
workspaceSchema.methods.removeMember = function (userId) {
  if (this.isOwner(userId)) {
    throw new Error('Cannot remove workspace owner');
  }

  const index = this.members.findIndex((m) => m.user.toString() === userId.toString());
  if (index === -1) {
    throw new Error('User is not a member');
  }

  this.members.splice(index, 1);
};

// Method to update member role
workspaceSchema.methods.updateMemberRole = function (userId, newRole) {
  if (this.isOwner(userId)) {
    throw new Error('Cannot change owner role');
  }

  const member = this.members.find((m) => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a member');
  }

  member.role = newRole;
};

// Method to transfer ownership
workspaceSchema.methods.transferOwnership = function (newOwnerId) {
  const newOwnerMember = this.members.find((m) => m.user.toString() === newOwnerId.toString());
  
  if (!newOwnerMember) {
    throw new Error('New owner must be a member of the workspace');
  }

  // Change current owner to admin
  const currentOwner = this.members.find((m) => m.user.toString() === this.owner.toString());
  if (currentOwner) {
    currentOwner.role = 'Admin';
  }

  // Set new owner
  this.owner = newOwnerId;
  newOwnerMember.role = 'Owner';
};

// Static method to find user workspaces
workspaceSchema.statics.findUserWorkspaces = function (userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId },
    ],
  })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });
};

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;