import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkspace, selectCurrentWorkspace } from '../store/slices/workspaceSlice.js';
import { selectUser } from '../store/slices/authSlice.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workspaceService from '../services/workspaceService.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

const ROLE_COLORS = {
  OWNER: 'badge-blue',
  ADMIN: 'badge-yellow',
  MEMBER: 'badge-green',
  VIEWER: 'badge-gray',
};

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const workspace = useSelector(selectCurrentWorkspace);
  const currentUser = useSelector(selectUser);
  const [tab, setTab] = useState('overview');
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    dispatch(fetchWorkspace(id));
  }, [id, dispatch]);

  const { data: statsData } = useQuery({
    queryKey: ['workspace-stats', id],
    queryFn: () => workspaceService.getStats(id),
    enabled: !!id,
  });

  const { data: activityData } = useQuery({
    queryKey: ['workspace-activity', id],
    queryFn: () => workspaceService.getActivity(id, { limit: 20 }),
    enabled: !!id && tab === 'activity',
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => workspaceService.invite(id, data),
    onSuccess: () => {
      toast.success('Invitation sent');
      resetInvite();
      setShowInviteForm(false);
      qc.invalidateQueries(['workspace', id]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to invite'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => workspaceService.removeMember(id, memberId),
    onSuccess: () => {
      toast.success('Member removed');
      dispatch(fetchWorkspace(id));
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }) => workspaceService.updateMemberRole(id, memberId, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      dispatch(fetchWorkspace(id));
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const { register: registerInvite, handleSubmit: handleInviteSubmit, reset: resetInvite, formState: { errors: inviteErrors } } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'MEMBER' },
  });

  const myRole = workspace?.members?.find(m => m.user._id === currentUser?.id || m.user === currentUser?.id)?.role;
  const isOwnerOrAdmin = myRole === 'OWNER' || myRole === 'ADMIN';
  const stats = statsData?.data?.stats;

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <span className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
          style={{ backgroundColor: workspace.color || '#6366f1' }}>
          {workspace.name.charAt(0)}
        </span>
        <div className="flex-1">
          <h1 className="page-header">{workspace.name}</h1>
          {workspace.description && <p className="text-gray-500 text-sm mt-0.5">{workspace.description}</p>}
        </div>
        <Link to={`/workspaces/${id}/todos`} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Open Todos
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {['overview', 'members', 'activity'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Todos', value: stats.totalTodos, color: 'bg-blue-50 text-blue-700' },
            { label: 'Completed', value: stats.completedTodos, color: 'bg-green-50 text-green-700' },
            { label: 'Pending', value: stats.pendingTodos, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Overdue', value: stats.overdueTodos, color: 'bg-red-50 text-red-700' },
          ].map((s) => (
            <div key={s.label} className={`card p-5 ${s.color}`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </div>
          ))}
          <div className="card p-5 col-span-2 sm:col-span-4">
            <p className="text-sm font-medium text-gray-600 mb-2">Completion Rate</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${stats.completionRate}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{stats.completionRate}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div>
          {isOwnerOrAdmin && (
            <div className="mb-4 flex justify-end">
              <button onClick={() => setShowInviteForm(true)} className="btn-primary">
                Invite Member
              </button>
            </div>
          )}

          {showInviteForm && (
            <div className="card p-5 mb-4 animate-slide-up">
              <h3 className="section-title mb-3">Invite a member</h3>
              <form onSubmit={handleInviteSubmit((d) => inviteMutation.mutate(d))} className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-48">
                  <input {...registerInvite('email')} type="email" placeholder="colleague@example.com"
                    className={`input ${inviteErrors.email ? 'input-error' : ''}`} />
                  {inviteErrors.email && <p className="error-text">{inviteErrors.email.message}</p>}
                </div>
                <select {...registerInvite('role')} className="input w-36">
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button type="submit" disabled={inviteMutation.isPending} className="btn-primary">
                  {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
                </button>
                <button type="button" onClick={() => setShowInviteForm(false)} className="btn-secondary">Cancel</button>
              </form>
            </div>
          )}

          <div className="card divide-y divide-gray-100 dark:divide-gray-700">
            {workspace.members?.map((member) => {
              const userId = member.user._id || member.user;
              const isMe = userId === currentUser?.id;
              return (
                <div key={userId} className="flex items-center gap-3 p-4">
                  {member.user.avatar ? (
                    <img src={member.user.avatar} alt={member.user.name} className="avatar w-9 h-9" />
                  ) : (
                    <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-700">{member.user.name?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {member.user.name} {isMe && <span className="text-xs text-gray-400">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                  <span className={ROLE_COLORS[member.role]}>{member.role}</span>
                  {isOwnerOrAdmin && !isMe && member.role !== 'OWNER' && (
                    <div className="flex gap-2">
                      <select
                        defaultValue={member.role}
                        onChange={(e) => updateRoleMutation.mutate({ memberId: userId, role: e.target.value })}
                        className="input w-32 text-xs py-1"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button onClick={() => removeMemberMutation.mutate(userId)}
                        className="btn-ghost text-red-500 hover:bg-red-50 p-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (
        <div className="card divide-y divide-gray-100 dark:divide-gray-700">
          {activityData?.data?.activities?.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">No activity yet</p>
          ) : (
            activityData?.data?.activities?.map((a) => (
              <div key={a._id} className="flex gap-3 p-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-gray-600">{a.user?.name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">{a.user?.name}</span> {a.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(a.createdAt), 'MMM d, h:mm a')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
