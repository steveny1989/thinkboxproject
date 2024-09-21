// 从 firebase.js 导入 Firebase 认证实例
import { auth, onAuthStateChanged, signOut } from './firebase.js';
import noteOperations from './noteOperations.js';

const AUTH_PAGE_URL = "../html/auth.html"; // 定义 auth.html 的路径


export function updateNoteList(notesToDisplay) {
  const noteList = document.getElementById('noteList');
  const userEmailElement = document.getElementById('userEmail');

  if (!auth.currentUser) {
    userEmailElement.textContent = 'Not logged in';
    noteList.innerHTML = '<li>Please log in to view your notes.</li>';
    return;
  }

  userEmailElement.textContent = auth.currentUser.email;

  if (!notesToDisplay || notesToDisplay.length === 0) {
    noteList.innerHTML = '<li>No notes found. Create your first note!</li>';
    return;
  }

  noteList.innerHTML = notesToDisplay.map(note => `
    <li class="note-item">
      <div class="note-container">
        <div class="note-content">
          <span class="note-text">${note.content}</span>
          <span class="note-timestamp">${formatTimestamp(note.created_at)}</span>
        </div>
        <div class="dropdown">
          <span class="dropdown-trigger">...</span>
          <div class="dropdown-content">
            <a href="javascript:void(0)" class="delete-note" data-note-id="${note.note_id}">Delete</a>
          </div>
        </div>
      </div>
    </li>
  `).join('');

  // 绑定删除按钮的事件监听器
  bindDeleteButtons();
}

function bindDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.delete-note');
  console.log('Binding delete buttons:', deleteButtons);
  deleteButtons.forEach(button => {
    button.addEventListener('click', async function(event) {
      event.preventDefault(); // 防止默认行为
      const noteId = this.dataset.noteId;
      console.log(`Attempting to delete note with ID: ${noteId}`);
      try {
        // 立即从 UI 中移除笔记项
        this.closest('.note-item').remove();
        await noteOperations.deleteNote(noteId);
        console.log(`Note with ID: ${noteId} deleted successfully`);
        // 重新加载笔记列表
        await noteOperations.loadNotes();
      } catch (error) {
        console.error(`Error deleting note with ID: ${noteId}`, error);
        alert('Failed to delete note. Please try again.');
        // 如果删除失败，重新加载笔记列表以恢复 UI
        await noteOperations.loadNotes();
      }
    });
  });
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// export function updateFeedback(noteId, feedbackText) {
//   console.log(`Updating feedback for note ${noteId} with text: ${feedbackText}`);
//   const feedbackElement = document.querySelector(`#feedback-${noteId}`);
//   if (!feedbackElement) {
//     console.error(`Feedback element for note ${noteId} not found`);
//     return;
//   }
//   console.log(`Found feedback element:`, feedbackElement);
//   if (feedbackText === undefined) {
//     console.error('Feedback text is undefined');
//     return;
//   }
//   feedbackElement.innerHTML = `<a href="javascript:void(0)" class="feedback-link" data-note-id="${noteId}">${feedbackText}</a>`;
// }

// 页面加载时调用 loadNotes 函数
document.addEventListener('DOMContentLoaded', () => {
  noteOperations.loadNotes();
});