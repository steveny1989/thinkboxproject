import { auth, onAuthStateChanged, signOut } from './firebase.js';
import noteOperations from './noteOperations.js';
import { formatTimestamp } from './noteHelper.js';
import { localStorageService } from './localStorage.js';

const AUTH_PAGE_URL = "./html/auth.html"; // 定义 auth.html 的路径


function updateNoteList(notesToDisplay) {
  const noteList = document.getElementById('noteList');
  const userEmailElement = document.getElementById('userEmail');

  updateUserInfo(userEmailElement);
  
  if (!notesToDisplay || notesToDisplay.length === 0) {
    noteList.innerHTML = '<li>No notes to display.</li>';
    return;
  }

  const fragment = document.createDocumentFragment();
  notesToDisplay.forEach(note => {
    const noteElement = createNoteElement(note);
    fragment.appendChild(noteElement);
  });

  noteList.innerHTML = '';
  noteList.appendChild(fragment);

  setupNoteListeners();
}

function updateUserInfo(userEmailElement) {
  if (!auth.currentUser) {
    userEmailElement.textContent = '';
    return;
  }
  userEmailElement.textContent = auth.currentUser.email;
}

function createNoteElement(note) {
  const noteElement = document.createElement('li');
  noteElement.className = 'note-item';
  noteElement.setAttribute('data-note-id', note.note_id);
  
  const formattedTimestamp = note.created_at ? formatTimestamp(note.created_at) : '';

  noteElement.innerHTML = `
    <div class="note-container">
      <div class="note-content">
        <span class="note-text">${note.content}</span>
        <span class="note-timestamp">${formattedTimestamp}</span>
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
<div id="tags-${note.note_id}" class="note-tags">${renderTags(note.tags || [])}</div>
      </div>
    </div>
    <div class="note-actions-container">
      <div class="note-actions">
        <span class="likes"><i class="fas fa-thumbs-up"></i> 0</span>
        <span class="heart"><i class="fas fa-heart"></i> 0</span>
        <span class="comments"><i class="fas fa-comment"></i> 0</span>
      </div>
      <div class="comment-input-container" style="display: none;">
        <input type="text" class="comment-input" placeholder="Any comments..." />
        <button class="submit-comment">Submit</button>
      </div>
    </div>
  `;
  return noteElement;
}

function setupNoteListeners() {
  const noteList = document.getElementById('noteList');
  noteList.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('.delete-note');
    if (deleteButton) {
      const noteId = deleteButton.dataset.noteId;
      await handleDeleteNote(noteId);
    }
    // ... 其他事件处理 ...
  });
}

function updateNoteTagsInUI(noteId, tags) {
  updateTagsDisplay(noteId, tags);
}

async function handleDeleteNote(noteId) {
  console.log(`Attempting to delete note with ID: ${noteId}`);
  
  // 找到笔记元素
  const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
  if (noteElement) {
    // 确保我们找到的是 .note-item 元素
    const noteItem = noteElement.closest('.note-item');
    if (noteItem) {
      noteItem.remove();
      console.log(`Note ${noteId} removed from UI`);
    } else {
      console.warn(`Could not find .note-item for note ${noteId}`);
    }
  } else {
    console.warn(`Note element with ID ${noteId} not found in the DOM`);
  }

  // 调用 noteOperations 处理数据删除
  try {
    await noteOperations.deleteNote(noteId);
    console.log(`UI: Note ${noteId} deletion process completed`);
  } catch (error) {
    console.error(`UI: Error occurred while deleting note ${noteId}:`, error);
    // 可以在这里添加用户通知逻辑，如显示错误消息
  }
}

function displayGeneratedTags(noteId, tags) {
  const tagContainer = document.getElementById(`tags-${noteId}`);
  if (tagContainer) {
    tagContainer.innerHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
  }
}

function updateTagsDisplay(noteId, tags) {
  console.log('Updating tags display for note:', noteId, tags);
  const tagContainer = document.querySelector(`[data-note-id="${noteId}"] .note-tags`);
  if (tagContainer) {
    const renderedTags = renderTags(tags);
    console.log('Rendered tags:', renderedTags);
    tagContainer.innerHTML = renderedTags;
  } else {
    console.warn(`Tag container for note ${noteId} not found. Note may have been deleted.`);
  }
}

function initializeUI() {
  console.log('Initializing UI...');

  const addNoteButton = document.getElementById('addNoteButton');
  const noteInput = document.getElementById('noteInput');
  
  console.log('addNoteButton:', addNoteButton);
  console.log('noteInput:', noteInput);

  if (addNoteButton && noteInput) {
    addNoteButton.addEventListener('click', () => handleAddNote(noteInput));
    // 添加键盘事件监听
    noteInput.addEventListener('keydown', handleNoteInputKeydown);
    console.log('Event listeners added to addNoteButton and noteInput');
  } else {
    console.warn('Add note button or input not found');
    console.log('Document body:', document.body.innerHTML); // 输出整个 body 内容
    console.log('All elements with id:', Array.from(document.querySelectorAll('[id]')).map(el => el.id)); // 输出所有 id 的元素的 id
  }

  const logoutButton = document.getElementById('logoutButton');
  
  console.log('logoutButton:', logoutButton); // 添加日志

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
    console.log('Event listener added to logoutButton'); // 添加日志
  } else {
    console.warn('Logout button not found');
  }

  // 更新笔记列表
  updateNoteList(noteOperations.getNotes());
  console.log('Note list updated'); // 添加日志
}


async function handleAddNote(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  const noteText = noteInput.value.trim();
  if (noteText) {
    try {
      // 创建一临时的笔记对象
      const tempNote = {
        note_id: 'temp-' + Date.now(), // 临时ID
        content: noteText,
        tags: []
      };

            // 添加到内存列表
            noteOperations.addTempNote(tempNote);
            
      // 立即添加到 UI
      const noteElement = createNoteElement(tempNote);
      noteList.insertBefore(noteElement, noteList.firstChild);
      noteInput.value = '';

      // 异步添加笔记，传更新UI的回调函数
      const newNote = await noteOperations.addNote(noteText, updateNoteTagsInUI);
      
      // 更新 DOM 中的 note_id
      noteElement.dataset.noteId = newNote.note_id;
    } catch (error) {
      console.error('Error adding note:', error);
    }
  }
}

async function handleLogout() {
  // 实现登出逻辑
  auth.signOut()
    .then(() => {
      console.log('User signed out successfully');
      window.location.href = AUTH_PAGE_URL; // 重定向到登录页面
    })
    .catch((error) => {
      console.error('Error signing out:', error);
    });
}

// 确保导出 handleAddNote 函数
export {
  initializeUI,
  updateNoteList,
  handleAddNote,
  handleLogout,
  updateTagsDisplay,
  displayGeneratedTags,
  handleDeleteNote,
  handleNoteInputKeydown  // 新添加的函数
};

function renderTags(tags) {
  console.log('Rendering tags:', tags);
  if (!tags || tags.length === 0) {
    return '<span class="tag loading">Loading tags...</span>';
  }
  if (Array.isArray(tags) && tags[0] && typeof tags[0].name === 'string') {
    return tags[0].name.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('');
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('');
  }
  if (Array.isArray(tags)) {
    return tags.map(tag => `<span class="tag">${tag}</span>`).join('');
  }
  console.error('Invalid tags data:', tags);
  return '<span class="error-tags">Error loading tags</span>';
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  document.addEventListener('tagsGenerated', (event) => {
    console.log('tagsGenerated event received', event.detail);
    const { noteId, tags } = event.detail;
    if (noteId && tags) {
      updateTagsDisplay(noteId, tags);
    } else {
      console.error('Invalid data in tagsGenerated event', event.detail);
    }
  });
});

function handleNoteInputKeydown(event) {
  // 检查是否按下了 Command+Enter (Mac) 或 Ctrl+Enter (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault(); // 阻止默认行为
    handleAddNote(event.target);
  }
}