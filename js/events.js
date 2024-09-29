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
          setupNoteActions(); // 重新设置事件处理程序
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
          setupNoteActions(); // 重新设置事件处理程序
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

// 设置笔记的交互功能
function setupNoteActions() {
  document.querySelectorAll('.note-actions').forEach(noteAction => {
    const likesSpan = noteAction.querySelector('.likes');
    const heartSpan = noteAction.querySelector('.heart');
    const commentsSpan = noteAction.querySelector('.comments');
    const commentInputContainer = noteAction.parentElement.querySelector('.comment-input-container');
    const commentInput = commentInputContainer.querySelector('.comment-input');
    const submitCommentButton = commentInputContainer.querySelector('.submit-comment');

    // 处理喜欢点击事件
    likesSpan.addEventListener('click', () => {
      let currentLikes = parseInt(likesSpan.textContent.split(' ')[1]);
      likesSpan.textContent = `👍 ${currentLikes + 1}`;
    });

    // 处理心形点击事件
    heartSpan.addEventListener('click', () => {
      let currentHearts = parseInt(heartSpan.textContent.split(' ')[1]);
      heartSpan.textContent = `❤️ ${currentHearts + 1}`;
    });

    // 处理评论点击事件
    commentsSpan.addEventListener('click', () => {
      commentInputContainer.style.display = commentInputContainer.style.display === 'none' ? 'flex' : 'none'; // 切换输入框显示
    });

    // 处理提交评论事件
    submitCommentButton.addEventListener('click', () => {
      const commentText = commentInput.value.trim();
      if (commentText) {
        // 在这里处理评论提交逻辑，例如发送到服务器或更新 UI
        alert(`评论提交: ${commentText}`);
        commentInput.value = ''; // 清空输入框
        commentInputContainer.style.display = 'none'; // 隐藏输入框
      } else {
        alert('请输入评论内容');
      }
    });
  });
}