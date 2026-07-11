import { Outlet } from "react-router-dom";

/**
 * AuthLayout - Visual template optimized for authentication workflows
 */
const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header for auth pages */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-blue-600">
              MERN Stack
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Simple footer */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} MERN Stack Application. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;