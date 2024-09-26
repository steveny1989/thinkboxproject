const AUTH_PAGE_URL = "html/auth.html"; // 定义 auth.html 的路径

import { auth, signOut, onAuthStateChanged } from './firebase.js';
import noteOperations from './noteOperations.js';
import { updateNoteList } from './ui.js'; // 确保这里是正确的导入

import './events.js';

onAuthStateChanged(auth, (user) => {
  if (user) {
    noteOperations.loadNotes().catch(error => {
      console.error('Error loading notes:', error);
    });
  } else {
    updateNoteList([]);
  }
});