
import React, { useState } from 'react';
// Standardizing modular Firebase Auth import
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Functional call to sign in with auth instance
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Access denied. Please check your credentials.');
      setLoading(false);
    }
  };

  const logoUrl = "https://cdn.shopify.com/s/files/1/0753/8144/0861/files/cropped-Untitled-design-2025-09-11T094640.576_1.png?v=1765462614&width=160&format=webp";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src={logoUrl} 
              alt="Luggage Deposit Rome" 
              className="w-32 h-auto drop-shadow-sm"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
          <p className="text-slate-500 mt-2">Luggage Deposit Rome Management</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="admin@luggagedepositrome.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
