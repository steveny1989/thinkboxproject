import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Login from './login.jsx';
import Register from './Register';
import MainContent from './MainContent';

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Welcome to ThinkBox</h1>
        <Login />
        <Register />
      </div>
    );
  }

  return <MainContent />;
};

export default AppContent;