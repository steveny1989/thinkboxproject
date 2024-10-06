const AUTH_PAGE_URL = "html/auth.html"; // 定义 auth.html 的路径

import { auth } from './firebase.js';
import noteOperations from './noteOperations.js';
import { initializeUI, handleLogout, updateNoteList, initializeTrendingTagsAnalysis } from './ui.js';


// 添加加载指示器的引用
const loadingIndicator = document.getElementById('loading-indicator');
let isInitialized = false;

async function handleAuthStateChange(user) {
  if (isInitialized) return;
  
  loadingIndicator.style.display = 'block';
  
  if (user) {
    console.log('User authenticated:', user.email);
    try {
      // 使用 Promise.all 并行加载数据和初始化 UI
      const [initialNotes] = await Promise.all([
        noteOperations.initializePaginatedNotes(),
        initializeUI()
      ]);
      console.log('Notes and UI initialized');
      
      // 更新笔记列表（如果需要）
      if (initialNotes && initialNotes.length > 0) {
        updateNoteList(initialNotes);
      }

      // 初始化热门标签分析
      await initializeTrendingTagsAnalysis();
    } catch (error) {
      console.error('Error in handleAuthStateChange:', error);
      // 显示错误消息给用户
    }
  } else {
    console.log('User not authenticated. Redirecting to login page...');
    handleLogout();
  }
  
  loadingIndicator.style.display = 'none';
  isInitialized = true;
}

// 使用防抖函数来避免多次快速的状态变化
const debouncedHandleAuthStateChange = debounce(handleAuthStateChange, 300);

auth.onAuthStateChanged(debouncedHandleAuthStateChange);

// 移除 DOMContentLoaded 和 load 事件监听器，因为 auth.onAuthStateChanged 应该足够处理初始化

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}