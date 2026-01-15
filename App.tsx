import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// Using explicit type import for User and standardizing modular imports
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ScanPage from './pages/ScanPage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Correctly call onAuthStateChanged with the auth instance
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        try {
          // Check if user is in the admins collection
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.email || ''));
          if (adminDoc.exists() && adminDoc.data().active === true) {
            setUser(currentUser);
            setIsAdmin(true);
          } else {
            // Logged in but not an authorized admin
            setUser(currentUser);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error verifying admin status:", error);
          setUser(currentUser);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium tracking-wide">Securing connection...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={user ? (isAdmin ? <Navigate to="/" /> : <Navigate to="/unauthorized" />) : <LoginPage />} 
        />
        <Route 
          path="/unauthorized" 
          element={user && !isAdmin ? <UnauthorizedPage /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={user && isAdmin ? <DashboardPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/scan" 
          element={user && isAdmin ? <ScanPage /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;