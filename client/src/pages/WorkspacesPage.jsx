import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectWorkspaces, selectWorkspaceLoading, createWorkspace, deleteWorkspace, setCurrentWorkspace } from '../store/slices/workspaceSlice.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
});

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function WorkspacesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const workspaces = useSelector(selectWorkspaces);
  const isLoading = useSelector(selectWorkspaceLoading);
  const [showForm, setShowForm] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await dispatch(createWorkspace({ ...data, color: selectedColor })).unwrap();
      toast.success('Workspace created');
      reset();
      setSelectedColor(COLORS[0]);
      setShowForm(false);
    } catch (err) {
      toast.error(err || 'Failed to create workspace');
    }
  };

  const handleOpen = (ws) => {
    dispatch(setCurrentWorkspace(ws));
    navigate(`/workspaces/${ws._id}`);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this workspace and all its data? This cannot be undone.')) return;
    try {
      await dispatch(deleteWorkspace(id)).unwrap();
      toast.success('Workspace deleted');
    } catch (err) {
      toast.error(err || 'Failed to delete workspace');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Workspaces</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Workspace
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h2 className="section-title mb-4">Create Workspace</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="My Workspace" />
                {errors.name && <p className="error-text">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} className="input resize-none h-20" placeholder="Optional description" />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c} type="button" onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${selectedColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No workspaces yet</h3>
          <p className="text-gray-400 text-sm mb-4">Create one to start organising your todos</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create your first workspace</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws._id}
              onClick={() => handleOpen(ws)}
              className="card p-5 cursor-pointer hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: ws.color || '#6366f1' }}
                  >
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">{ws.name}</h3>
                    <p className="text-xs text-gray-400">{ws.members?.length} member{ws.members?.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(ws._id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {ws.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{ws.description}</p>
              )}
              <p className="text-xs text-gray-400">
                Created {format(new Date(ws.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
