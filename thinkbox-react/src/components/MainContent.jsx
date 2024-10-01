import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/AuthService';

const MainContent = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await authService.logout();
      // 登出后的处理（如果需要）
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div>
      <header>
        <h1>Welcome to ThinkBox, {user.email}</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <nav>
        {/* 添加导航菜单项 */}
        <ul>
          <li>My Notes</li>
          <li>Create New Note</li>
          <li>Tags</li>
          <li>Settings</li>
        </ul>
      </nav>
      <main>
        {/* 这里可以是默认的内容区域，或者是嵌套路由 */}
        <p>Select an option from the menu to get started!</p>
      </main>
    </div>
  );
};

export default MainContent;