// 从 firebase.js 导入 Firebase 认证实例
import { auth, onAuthStateChanged, signOut } from './firebase.js';
import noteOperations from './noteOperations.js';

const AUTH_PAGE_URL = "./html/auth.html"; // 定义 auth.html 的路径



export function updateNoteList(notesToDisplay) {
  const noteList = document.getElementById('noteList');
  const userEmailElement = document.getElementById('userEmail');

  if (!auth.currentUser) {
    userEmailElement.textContent = '';
    noteList.innerHTML = '<li>Please log in to view your notes.</li>';
    return;
  }

  userEmailElement.textContent = auth.currentUser.email;

  if (!notesToDisplay || notesToDisplay.length === 0) {
    noteList.innerHTML = '<li></li>';
    return;
  }

  noteList.innerHTML = notesToDisplay.map(note => `
    <li class="note-item" data-note-id="${note.note_id}">
      <div class="note-container">
        <div class="note-content">
          <span class="note-text">${note.content}</span>
          <span class="note-timestamp">${formatTimestamp(note.created_at)}</span>
        </div>
        <button class="feedback-button" data-note-id="${note.note_id}" data-note-content="${note.content}">AI</button>
        <div class="dropdown">
          <span class="dropdown-trigger">...</span>
          <div class="dropdown-content">
            <a href="javascript:void(0)" class="delete-note" data-note-id="${note.note_id}">Delete</a>
          </div>
        </div>
      </div>
<div class="note-tags-container">
<div id="tags-${note.note_id}" class="note-tags"></div>
</div>
  <div class="note-actions-container">
<div class="note-actions">
  <span class="likes">
    <i class="fas fa-thumbs-up"></i> 0
  </span>
  <span class="heart">
    <i class="fas fa-heart"></i> 0
  </span>
  <span class="comments">
    <i class="fas fa-comment"></i> 0
  </span>
      </div>
    <div class="comment-input-container" style="display: none;"> <!-- 隐藏的输入框 -->
        <input type="text" class="comment-input" placeholder="Any comments..." />
        <button class="submit-comment">Submit</button>
    </div>
</div>
  </div>
    </li>
  `).join('');

  // 绑定删除按钮的事件监听器
  bindDeleteButtons();
  // 添加反馈按钮监听器
  addFeedbackButtonListeners();
  
  // 绑定笔记操作事件
  setupNoteActions(); // 添加这一行
}

function addFeedbackButtonListeners() {
  const feedbackButtons = document.querySelectorAll('.feedback-button');
  feedbackButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const noteId = event.target.getAttribute('data-note-id');
      const content = event.target.getAttribute('data-note-content');
      noteOperations.generateFeedbackForNote(noteId, content);
    });
  });

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

function setupNoteActions() {
  document.querySelectorAll('.note-actions').forEach(noteAction => {
    const likesSpan = noteAction.querySelector('.likes');
    const heartSpan = noteAction.querySelector('.heart');
    const commentsSpan = noteAction.querySelector('.comments');
    
    // 确保正确找到 commentInputContainer
    const commentInputContainer = noteAction.closest('.note-actions-container').querySelector('.comment-input-container');
    const commentInput = commentInputContainer.querySelector('.comment-input');
    const submitCommentButton = commentInputContainer.querySelector('.submit-comment');
    
    // 确保正确获取评论列表
    const commentList = noteAction.closest('.note-actions-container').querySelector('.comment-list');

    // 处理喜欢点击事件
    likesSpan.addEventListener('click', () => {
      // 使用正则表达式提取数字
      let currentLikes = parseInt(likesSpan.textContent.match(/\d+/)[0]);
      likesSpan.innerHTML = `<i class="fas fa-thumbs-up"></i> ${currentLikes + 1}`; // 使用图标
    });

    // 处理心形点击事件
    heartSpan.addEventListener('click', () => {
      // 使用正则表达式提取数字
      let currentHearts = parseInt(heartSpan.textContent.match(/\d+/)[0]);
      heartSpan.innerHTML = `<i class="fas fa-heart"></i> ${currentHearts + 1}`; // 使用图标
    });

    // 处理评论点击事件
    commentsSpan.addEventListener('click', () => {
      commentInputContainer.style.display = commentInputContainer.style.display === 'none' ? 'flex' : 'none'; // 切换输入框显示
    });

    // 处理提交评论事件
    submitCommentButton.addEventListener('click', () => {
      const commentText = commentInput.value.trim();
      if (commentText) {
          // 创建新的评论元素
          const commentItem = document.createElement('div');
          commentItem.classList.add('comment-item');
          commentItem.textContent = commentText; // 设置评论文本

          // 将评论添加到评论列表中
          if (commentList) { // 确保 commentList 存在
              commentList.appendChild(commentItem);
          } else {
              console.error('评论列表未找到');
          }

          // 清空输入框并隐藏输入框
          commentInput.value = ''; // 清空输入框
          commentInputContainer.style.display = 'none'; // 隐藏输入框
      } else {
          alert('请输入评论内容');
      }
    });
  });
}

// 页面加载时调用 loadNotes 函数
document.addEventListener('DOMContentLoaded', () => {
  noteOperations.loadNotes();
});

export function displayGeneratedTags() {
  const generatedTagsContainer = document.getElementById('generated-tags-container');
  if (!generatedTagsContainer) return;

  const allGeneratedTags = noteOperations.getAllGeneratedTags();

  let tagsHtml = '<h3>Generated Tags</h3>';
  for (const [noteId, tags] of Object.entries(allGeneratedTags)) {
    const tagsArray = Array.isArray(tags) ? tags : [tags].filter(Boolean);
    tagsHtml += `
      <div>
        <p>Note ID: ${noteId}</p>
        <p>Generated Tags: ${tagsArray.join(', ')}</p>
      </div>
    `;
  }

  generatedTagsContainer.innerHTML = tagsHtml;
}

export function updateTagsDisplay(tagsMap) {
  console.log('Updating tags display:', tagsMap);
  for (const [noteId, tags] of tagsMap) {
    const tagElement = document.getElementById(`tags-${noteId}`);
    if (tagElement) {
      tagElement.textContent = Array.isArray(tags) ? tags.join(', ') : tags;
    } else {
      console.warn(`Tag element for note ${noteId} not found`);
      // 如果找不到标签元素，尝试创建一个
      const noteElement = document.querySelector(`li[data-note-id="${noteId}"]`);
      if (noteElement) {
        const newTagElement = document.createElement('div');
        newTagElement.id = `tags-${noteId}`;
        newTagElement.className = 'note-tags';
        newTagElement.textContent = Array.isArray(tags) ? tags.join(', ') : tags;
        noteElement.querySelector('.note-container').appendChild(newTagElement);
      } else {
        console.error(`Note element for ${noteId} not found`);
      }
    }
  }
}