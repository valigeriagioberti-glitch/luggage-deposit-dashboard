
import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const UnauthorizedPage: React.FC = () => {
  const handleSignOut = async () => {
    await signOut(auth);
    window.location.hash = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-8">
          Your account (<strong>{auth.currentUser?.email}</strong>) is not authorized to access this dashboard. 
          Please contact the system administrator to request access.
        </p>
        <button
          onClick={handleSignOut}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
        >
          Sign Out & Try Another Account
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
