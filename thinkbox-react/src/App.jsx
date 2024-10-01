import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/login';
import Register from './components/Register';
import MainContent from './components/MainContent';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        {user && <Header />}
        <div className="main-container">
          {user && <Sidebar />}
          <main>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <MainContent /> : <Navigate to="/login" />} />
              {/* 添加其他路由 */}
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;