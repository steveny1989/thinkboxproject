import { auth, onAuthStateChanged, signOut } from './firebase.js';
import noteOperations from './noteOperations.js';
import { formatTimestamp } from './noteHelper.js';

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
      <div id="tags-${note.note_id}" class="note-tags">${renderTags(note.tags)}</div>
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

async function handleDeleteNote(noteId) {
  try {
    await noteOperations.deleteNote(noteId);
    updateNoteList(noteOperations.getNotes());
    updateTagsDisplay(); // 这里可能是问题所在
  } catch (error) {
    console.error(`Error deleting note with ID: ${noteId}`, error);
  }
}

function displayGeneratedTags(noteId, tags) {
  const tagContainer = document.getElementById(`tags-${noteId}`);
  if (tagContainer) {
    tagContainer.innerHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
  }
}

function updateTagsDisplay() {
  const allTags = new Map();
  noteOperations.getNotes().forEach(note => {
    if (note.tags) {
      note.tags.forEach(tag => {
        allTags.set(tag, (allTags.get(tag) || 0) + 1);
      });
    }
  });

  const tagsContainer = document.getElementById('tags-container');
  tagsContainer.innerHTML = '';

  // 使用可选链操作符和空值合并操作符来避免错误
  Array.from(allTags?.entries() ?? []).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
    const tagElement = document.createElement('span');
    tagElement.textContent = `${tag} (${count})`;
    tagElement.classList.add('tag');
    tagsContainer.appendChild(tagElement);
  });
}

function initializeUI() {
  console.log('Initializing UI...'); // 添加日志

  const addNoteButton = document.getElementById('addNoteButton');
  const noteInput = document.getElementById('noteInput');
  
  console.log('addNoteButton:', addNoteButton); // 添加日志
  console.log('noteInput:', noteInput); // 添加日志

  if (addNoteButton && noteInput) {
    addNoteButton.addEventListener('click', () => handleAddNote(noteInput));
    console.log('Event listener added to addNoteButton'); // 添加日志
  } else {
    console.warn('Add note button or input not found');
    console.log('Document body:', document.body.innerHTML); // 输出整个 body 内容
    console.log('All elements with id:', Array.from(document.querySelectorAll('[id]')).map(el => el.id)); // 输出所有带 id 的元素的 id
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

// 修改 handleAddNote 函数
async function handleAddNote(noteInput) {
  const noteText = noteInput.value.trim();
  if (noteText) {
    try {
      const newNote = await noteOperations.addNote(noteText);
      noteInput.value = '';
      updateNoteList(noteOperations.getNotes());
      console.log('New note added:', newNote);
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
  handleDeleteNote
};

function renderTags(tags) {
  if (!tags || tags.length === 0) return '';
  return tags.map(tag => `<span class="tag">${tag}</span>`).join('');
}