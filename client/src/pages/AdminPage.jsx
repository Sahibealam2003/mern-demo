import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../services/adminService.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function AdminPage() {
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminService.getUsers({ search, limit: 50 }),
    enabled: tab === 'users',
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminService.getAnalytics,
    enabled: tab === 'analytics',
  });

  const { data: workspacesData } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: () => adminService.getWorkspaces({ limit: 50 }),
    enabled: tab === 'workspaces',
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, blocked }) => adminService.toggleBlockUser(id, { blocked }),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries(['admin-users']); },
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries(['admin-users']); },
    onError: () => toast.error('Failed'),
  });

  const users = usersData?.data?.users || [];
  const analytics = analyticsData?.data;
  const workspaces = workspacesData?.data?.workspaces || [];
  const tabs = ['users', 'workspaces', 'analytics'];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="page-header mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          <input type="text" placeholder="Search users…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-sm mb-4" />
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                <tr>
                  {['User', 'Role', 'Verified', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {usersLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading…</td></tr>
                ) : users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-700">{u.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', u.role === 'admin' ? 'badge-red' : 'badge-gray')}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.isEmailVerified ? 'text-green-600' : 'text-gray-400'}>
                        {u.isEmailVerified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', u.isBlocked ? 'badge-red' : 'badge-green')}>
                        {u.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => blockMutation.mutate({ id: u._id, blocked: !u.isBlocked })}
                          className={clsx('btn btn-sm', u.isBlocked ? 'btn-secondary' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100')}>
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u._id); }}
                          className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workspaces tab */}
      {tab === 'workspaces' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                {['Workspace', 'Owner', 'Members', 'Created'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {workspaces.map((ws) => (
                <tr key={ws._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{ws.name}</td>
                  <td className="px-4 py-3 text-gray-500">{ws.owner?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{ws.members?.length}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(ws.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: analytics.users?.total, color: 'bg-blue-50 text-blue-700' },
            { label: 'Active Users', value: analytics.users?.active, color: 'bg-green-50 text-green-700' },
            { label: 'Blocked Users', value: analytics.users?.blocked, color: 'bg-red-50 text-red-700' },
            { label: 'Workspaces', value: analytics.workspaces?.total, color: 'bg-purple-50 text-purple-700' },
            { label: 'Total Todos', value: analytics.todos?.total, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Completion Rate', value: `${analytics.todos?.completionRate}%`, color: 'bg-teal-50 text-teal-700' },
          ].map((s) => (
            <div key={s.label} className={`card p-5 ${s.color}`}>
              <p className="text-3xl font-bold">{s.value ?? '—'}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
