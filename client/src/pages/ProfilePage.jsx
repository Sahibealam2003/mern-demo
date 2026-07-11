import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  selectUser, selectAuthLoading,
  updateUserProfile, uploadUserAvatar,
} from '../store/slices/authSlice.js';
import authService from '../services/authService.js';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  bio: z.string().max(200).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isLoading = useSelector(selectAuthLoading);
  const fileRef = useRef(null);
  const [pwLoading, setPwLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', bio: user?.bio || '' },
  });

  const { register: regPw, handleSubmit: handlePwSubmit, reset: resetPw, formState: { errors: pwErrors } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data) => {
    try {
      await dispatch(updateUserProfile(data)).unwrap();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err || 'Update failed');
    }
  };

  const onPasswordSubmit = async ({ currentPassword, newPassword }) => {
    try {
      setPwLoading(true);
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Password changed');
      resetPw();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await dispatch(uploadUserAvatar(formData)).unwrap();
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err || 'Upload failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="page-header">Profile Settings</h1>

      {/* Avatar */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Avatar</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar w-20 h-20 border-4 border-white shadow-md" />
            ) : (
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                <span className="text-3xl font-bold text-primary-700">{user?.name?.charAt(0)}</span>
              </div>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button onClick={() => fileRef.current?.click()} className="btn-secondary">
              Upload new photo
            </button>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5 MB</p>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Personal Information</h2>
        <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email address</label>
            <input value={user?.email || ''} disabled className="input opacity-60 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed.
              {!user?.isEmailVerified && (
                <button type="button" onClick={async () => {
                  try { await authService.resendVerification(); toast.success('Verification email sent'); }
                  catch { toast.error('Failed to send'); }
                }} className="ml-2 text-primary-600 hover:underline">
                  Resend verification
                </button>
              )}
            </p>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea {...register('bio')} className="input resize-none h-24" placeholder="Tell us a bit about yourself…" />
            {errors.bio && <p className="error-text">{errors.bio.message}</p>}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isLoading || !isDirty} className="btn-primary">
              {isLoading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Change Password</h2>
        <form onSubmit={handlePwSubmit(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input {...regPw('currentPassword')} type="password" className={`input ${pwErrors.currentPassword ? 'input-error' : ''}`} />
            {pwErrors.currentPassword && <p className="error-text">{pwErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="label">New password</label>
            <input {...regPw('newPassword')} type="password" className={`input ${pwErrors.newPassword ? 'input-error' : ''}`} />
            {pwErrors.newPassword && <p className="error-text">{pwErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input {...regPw('confirmPassword')} type="password" className={`input ${pwErrors.confirmPassword ? 'input-error' : ''}`} />
            {pwErrors.confirmPassword && <p className="error-text">{pwErrors.confirmPassword.message}</p>}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={pwLoading} className="btn-primary">
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <h2 className="section-title mb-3">Account Details</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-200 capitalize">{user?.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email verified</dt>
            <dd className={user?.isEmailVerified ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              {user?.isEmailVerified ? 'Yes' : 'No'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
