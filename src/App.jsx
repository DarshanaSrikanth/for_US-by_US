import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Onboarding from './screens/Onboarding';
import Pairing from './screens/Pairing';
import Home from './screens/Home';
import Settings from './screens/Settings';
import AddChit from './screens/AddChit';
import ReadChest from './screens/ReadChest';
import History from './screens/History';
import './styles/global.css';

// Protected Route Component
const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { isAuthenticated, loading, profile } = useAuth();

  console.log('=== PROTECTED ROUTE DEBUG ===');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('loading:', loading);
  console.log('profile:', profile);
  console.log('requireAuth:', requireAuth);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    console.log('Not authenticated, redirecting to /');
    return <Navigate to="/" />;
  }

  if (!requireAuth && isAuthenticated) {
    console.log('Authenticated but on public route, checking state...');
    if (!profile?.gender) {
      console.log('No gender, staying on onboarding');
      return children; // Stay on onboarding to select gender
    } else if (!profile?.pairedUserId) {
      console.log('Not paired, redirecting to pairing');
      return <Navigate to="/pairing" />;
    } else {
      console.log('Paired, redirecting to home');
      return <Navigate to="/home" />;
    }
  }

  // For authenticated users on protected routes
  if (isAuthenticated) {
    if (!profile?.gender) {
      console.log('No gender on protected route, redirecting to /');
      return <Navigate to="/" />;
    } else if (!profile?.pairedUserId && window.location.pathname !== '/pairing') {
      console.log('Not paired and not on pairing page, redirecting to pairing');
      return <Navigate to="/pairing" />;
    }
  }

  console.log('Allowing access to:', window.location.pathname);
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public route - redirects if already authenticated */}
      <Route path="/" element={
        <ProtectedRoute requireAuth={false}>
          <Onboarding />
        </ProtectedRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/pairing" element={
        <ProtectedRoute>
          <Pairing />
        </ProtectedRoute>
      } />
      
      <Route path="/home" element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      
      <Route path="/add-chit" element={
        <ProtectedRoute>
          <AddChit />
        </ProtectedRoute>
      } />
      
      <Route path="/read-chest" element={
        <ProtectedRoute>
          <ReadChest />
        </ProtectedRoute>
      } />
      
      <Route path="/history" element={
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      } />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;