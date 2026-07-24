import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import todoService from '../services/todoService.js';
import { useSelector } from 'react-redux';
import { selectCurrentWorkspace } from '../store/slices/workspaceSlice.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';

const createSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().optional(),
});

const PRIORITY_BADGE = { HIGH: 'badge-red', MEDIUM: 'badge-yellow', LOW: 'badge-green' };
const STATUS_BADGE = { TODO: 'badge-gray', IN_PROGRESS: 'badge-blue', REVIEW: 'badge-yellow', COMPLETED: 'badge-green' };

export default function TodosPage() {
  const { workspaceId } = useParams();
  const qc = useQueryClient();
  const workspace = useSelector(selectCurrentWorkspace);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [, setSelectedTodo] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const params = {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    limit: 50,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['todos', workspaceId, filters],
    queryFn: () => todoService.getAll(workspaceId, params),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (d) => todoService.create(workspaceId, d),
    onSuccess: () => { toast.success('Todo created'); reset(); setShowForm(false); qc.invalidateQueries(['todos', workspaceId]); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => todoService.update(workspaceId, id, { status }),
    onSuccess: () => qc.invalidateQueries(['todos', workspaceId]),
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => todoService.remove(workspaceId, id),
    onSuccess: () => { toast.success('Todo deleted'); qc.invalidateQueries(['todos', workspaceId]); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const pinMutation = useMutation({
    mutationFn: (id) => todoService.pin(workspaceId, id),
    onSuccess: () => qc.invalidateQueries(['todos', workspaceId]),
  });

  const todos = data?.data?.todos || [];

  const handleStatusCycle = (todo) => {
    const cycle = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'COMPLETED', COMPLETED: 'TODO' };
    updateStatusMutation.mutate({ id: todo._id, status: cycle[todo.status] });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-header">{workspace?.name || 'Todos'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{todos.length} task{todos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Todo
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 mb-5 flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search todos…" value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="input flex-1 min-w-40 py-1.5 text-sm"
        />
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="input w-36 py-1.5 text-sm">
          <option value="">All Status</option>
          <option value="TODO">Todo</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">Review</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="input w-36 py-1.5 text-sm">
          <option value="">All Priority</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 animate-slide-up">
            <h2 className="section-title mb-4">New Todo</h2>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input {...register('title')} className={`input ${errors.title ? 'input-error' : ''}`} placeholder="What needs to be done?" />
                {errors.title && <p className="error-text">{errors.title.message}</p>}
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} className="input resize-none h-24" placeholder="Optional details…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Priority</label>
                  <select {...register('priority')} className="input">
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input {...register('dueDate')} type="date" className="input" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Creating…' : 'Create Todo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Todo list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : todos.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 mb-3">No todos found</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create your first todo</button>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <div key={todo._id}
              onClick={() => setSelectedTodo(todo)}
              className={clsx('card p-4 cursor-pointer hover:shadow-card-hover transition-shadow flex items-start gap-3',
                todo.isPinned && 'border-l-4 border-primary-500'
              )}>
              {/* Status checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusCycle(todo); }}
                className={clsx('w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors',
                  todo.status === 'COMPLETED'
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-primary-500'
                )}
              >
                {todo.status === 'COMPLETED' && (
                  <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={clsx('text-sm font-medium text-gray-900 dark:text-gray-100',
                    todo.status === 'COMPLETED' && 'line-through text-gray-400')}>
                    {todo.title}
                  </p>
                  <span className={PRIORITY_BADGE[todo.priority]}>{todo.priority}</span>
                  <span className={STATUS_BADGE[todo.status]}>{todo.status.replace('_', ' ')}</span>
                </div>
                {todo.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{todo.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  {todo.dueDate && (
                    <span className={clsx('flex items-center gap-1',
                      new Date(todo.dueDate) < new Date() && todo.status !== 'COMPLETED' && 'text-red-500')}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(new Date(todo.dueDate), 'MMM d')}
                    </span>
                  )}
                  {todo.assignedTo?.length > 0 && (
                    <span>{todo.assignedTo.length} assignee{todo.assignedTo.length !== 1 ? 's' : ''}</span>
                  )}
                  {todo.checklist?.length > 0 && (
                    <span>{todo.checklist.filter(c => c.completed).length}/{todo.checklist.length} checklist</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); pinMutation.mutate(todo._id); }}
                  className={clsx('p-1.5 rounded-lg transition-colors',
                    todo.isPinned ? 'text-primary-600' : 'text-gray-300 hover:text-primary-500')}>
                  <svg className="w-4 h-4" fill={todo.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this todo?')) deleteMutation.mutate(todo._id); }}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
