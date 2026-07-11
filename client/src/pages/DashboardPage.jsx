import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice.js';
import dashboardService from '../services/dashboardService.js';
import { format, isToday, isTomorrow } from 'date-fns';
import clsx from 'clsx';

const PRIORITY_COLOR = { HIGH: 'text-red-500', MEDIUM: 'text-yellow-500', LOW: 'text-green-500' };

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`card p-5 flex items-center gap-4 ${color}`}>
      <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold">{value ?? '—'}</p>
        <p className="text-sm font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function formatDueLabel(date) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

export default function DashboardPage() {
  const user = useSelector(selectUser);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getSummary,
    refetchInterval: 60_000,
  });

  const { data: productivityData } = useQuery({
    queryKey: ['dashboard-productivity'],
    queryFn: () => dashboardService.getProductivity({ days: 7 }),
  });

  const stats = data?.data?.stats;
  const dueSoon = data?.data?.dueSoon || [];
  const recentActivity = data?.data?.recentActivity || [];
  const workspaces = data?.data?.workspaces || [];
  const priority = data?.data?.priorityBreakdown;

  if (isLoading) {
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="page-header">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening across your workspaces</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Todos" value={stats?.totalTodos} color="bg-blue-50 text-blue-700"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
        <StatCard label="Completed" value={stats?.completedTodos} color="bg-green-50 text-green-700"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Overdue" value={stats?.overdueTodos} color="bg-red-50 text-red-700"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Assigned to Me" value={stats?.assignedToMe} color="bg-purple-50 text-purple-700"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
      </div>

      {/* Completion + Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="section-title mb-4">Completion Rate</h2>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl font-black text-gray-900 dark:text-gray-100">{stats?.completionRate ?? 0}%</span>
            <span className="text-sm text-gray-500 mb-1">across all workspaces</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div className="bg-gradient-to-r from-primary-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats?.completionRate ?? 0}%` }} />
          </div>
        </div>

        {priority && (
          <div className="card p-5">
            <h2 className="section-title mb-4">Pending by Priority</h2>
            <div className="space-y-3">
              {[['HIGH', priority.HIGH, 'bg-red-500'], ['MEDIUM', priority.MEDIUM, 'bg-yellow-500'], ['LOW', priority.LOW, 'bg-green-500']].map(([label, count, color]) => {
                const total = (priority.HIGH + priority.MEDIUM + priority.LOW) || 1;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Due soon + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="section-title mb-3">Due Soon</h2>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing due in the next 3 days 🎉</p>
          ) : (
            <div className="space-y-3">
              {dueSoon.map((todo) => (
                <div key={todo._id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLOR[todo.priority]?.replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{todo.title}</p>
                    <p className="text-xs text-gray-400">{todo.workspace?.name}</p>
                  </div>
                  <span className="text-xs text-orange-600 font-medium flex-shrink-0">
                    {formatDueLabel(todo.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-3">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 6).map((a) => (
                <div key={a._id} className="flex gap-3 items-start">
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-700">{a.user?.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{a.user?.name}</span>{' '}
                      <span className="text-gray-500">{a.description}</span>
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(a.createdAt), 'h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workspaces quick access */}
      {workspaces.length > 0 && (
        <div>
          <h2 className="section-title mb-3">Your Workspaces</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {workspaces.map((ws) => (
              <Link key={ws._id} to={`/workspaces/${ws._id}`}
                className="card p-4 flex flex-col items-center gap-2 hover:shadow-card-hover transition-shadow text-center">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: ws.color || '#6366f1' }}>
                  {ws.name.charAt(0)}
                </span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2">{ws.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
