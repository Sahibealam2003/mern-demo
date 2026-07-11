import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import authService from '../../services/authService.js';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }

    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <svg className="animate-spin h-10 w-10 text-primary-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
              <p className="text-gray-600">Verifying your email…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-gray-500 text-sm mb-6">Your account is now fully activated.</p>
              <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-500 text-sm mb-6">
                The link is invalid or has expired. Request a new one from your account settings.
              </p>
              <Link to="/login" className="btn-primary">Back to sign in</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
