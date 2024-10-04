const AUTH_PAGE_URL = "html/auth.html"; // 定义 auth.html 的路径

import { auth } from './firebase.js';
import noteOperations from './noteOperations.js';
import { initializeUI, handleLogout, updateNoteList } from './ui.js';

async function handleAuthStateChange(user) {
  if (user) {
    console.log('User authenticated:', user.email);
    try {
      await noteOperations.initializePaginatedNotes();
      console.log('Notes initialized, initializing UI...');
      initializeUI();
    } catch (error) {
      console.error('Error in handleAuthStateChange:', error);
    }
  } else {
    console.log('User not authenticated. Redirecting to login page...');
    handleLogout();
  }
}

auth.onAuthStateChanged(handleAuthStateChange);

// 确保在 DOM 加载完成后初始化 UI
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  if (auth.currentUser) {
    initializeUI();
  }
});

// 添加一个 load 事件监听器
window.addEventListener('load', () => {
  console.log('Window fully loaded');
  if (auth.currentUser) {
    initializeUI();
  }
});