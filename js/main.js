const AUTH_PAGE_URL = "html/auth.html"; // 定义 auth.html 的路径

import { auth, signOut, onAuthStateChanged } from './firebase.js';
import noteOperations from './noteOperations.js';
import { updateNoteList, updateTagsDisplay } from './ui.js'; // 确保这里是正确的导入

import './events.js';

// 在应用启动时清理缓存数据
noteOperations.clearAllCachedData();

async function initializeApp(user) {
  if (user) {
    try {
      await noteOperations.clearAllCachedData();
      const loadedNotes = await noteOperations.loadNotes();
      if (loadedNotes.length > 0) {
        const loadedTags = await noteOperations.loadTags(loadedNotes);
        updateNoteList(loadedNotes);
        updateTagsDisplay(loadedTags);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  } else {
    updateNoteList([]);
  }
}

// 在应用启动时调用
initializeApp();

onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
  initializeApp(user);
});