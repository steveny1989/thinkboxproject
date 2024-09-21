import noteOperations from './noteOperations.js';
import { signOut } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
  const noteInput = document.getElementById('noteInput');
  const addNoteButton = document.getElementById('addNoteButton');
  const searchInput = document.getElementById('searchInput');
  const logoutButton = document.getElementById('logoutButton');

  if (addNoteButton) {
    addNoteButton.addEventListener('click', function() {
      const noteText = noteInput.value.trim();
      if (noteText) {
        noteOperations.addNote(noteText).then(() => {
          noteInput.value = '';
        }).catch(error => {
          console.error('Error adding note:', error);
          alert('Failed to add note. Please try again.');
        });
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = searchInput.value.trim();
      if (query) {
        noteOperations.searchNotes(query).catch(error => {
          console.error('Error searching notes:', error);
          alert('Failed to search notes. Please try again.');
        });
      } else {
        noteOperations.loadNotes();
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async function() {
      try {
        await signOut();
        // 其他登出后的处理逻辑
      } catch (error) {
        console.error('Error during sign out:', error);
      }
    });
  }
  // 添加监听 command + enter 组合键
  document.addEventListener('keydown', function(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      const noteText = noteInput.value.trim();
      if (noteText) {
        noteOperations.addNote(noteText).then(() => {
          noteInput.value = '';
        }).catch(error => {
          console.error('Error adding note:', error);
          alert('Failed to add note. Please try again.');
        });
      }
    }
  });
  
  document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
      await signOut();
      // 其他登出后的处理逻辑（如果有）
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  });
});