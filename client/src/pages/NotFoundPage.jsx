import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-8xl font-black text-primary-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Page not found</h2>
        <p className="text-gray-500 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/dashboard" className="btn-primary btn-lg">Go to dashboard</Link>
      </div>
    </div>
  );
}
