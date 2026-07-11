import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import { fetchWorkspaces } from '../../store/slices/workspaceSlice.js';
import { fetchUnreadCount } from '../../store/slices/notificationSlice.js';
import { selectSidebarOpen, selectTheme } from '../../store/slices/uiSlice.js';
import clsx from 'clsx';

export default function AppLayout() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector(selectSidebarOpen);
  const theme = useSelector(selectTheme);

  // Apply saved theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchWorkspaces());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Navbar />
      <main
        className={clsx(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-0'
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
