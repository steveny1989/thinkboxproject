import { auth, onAuthStateChanged, signOut } from './firebase.js';
import noteOperations from './noteOperations.js';
import { formatTimestamp } from './noteHelper.js';
import { localStorageService } from './localStorage.js';
import { debounce } from './utils.js';

const AUTH_PAGE_URL = "./html/auth.html"; // 定义 auth.html 的路径

let lastLoadedNoteId = null;
let isLoading = false;
let allNotesLoaded = false;
let originalNotes = [];
let isShowingSearchResults = false;
let isGeneratingComment = false;

function showLoadingIndicator() {
  document.getElementById('loading-indicator').classList.remove('hidden');
}

function hideLoadingIndicator() {
  document.getElementById('loading-indicator').classList.add('hidden');
}

function updateNoteList(notesToDisplay, append = false) {
  console.log('Updating note list with', notesToDisplay.length, 'notes');
  const noteList = document.getElementById('noteList');
  const userEmailElement = document.getElementById('userEmail');

  updateUserInfo(userEmailElement);
  
  if (!append) {
    noteList.innerHTML = '';
  }

  const fragment = document.createDocumentFragment();
  notesToDisplay.forEach(note => {
    const noteElement = createNoteElement(note);
    fragment.appendChild(noteElement);
  });

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
      <div class="feedback-container"></div>
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
        <span class="act-wrap">
          <button class="act-btn likes" data-note-id="${note.note_id}">
            <i class="fas fa-thumbs-up"></i>
          </button>
          <span class="count">${note.likes || 0}</span>
        </span>
        <span class="act-wrap">
          <button class="act-btn heart" data-note-id="${note.note_id}">
            <i class="fas fa-heart"></i>
          </button>
          <span class="count">${note.hearts || 0}</span>
        </span>
        <span class="action-wrapper">
          <button class="act-btn comment" data-note-id="${note.note_id}" title="Generate AI comment" tabindex="0" role="button" aria-label="Generate AI comment">
            <i class="fas fa-robot" aria-hidden="true"></i>
            <i class="fas fa-spinner fa-spin" style="display: none;" aria-hidden="true"></i>
          </button>
          <span class="count ${note.comments?.length > 0 ? 'has-comments' : ''}" aria-label="${note.comments?.length || 0} comments">${note.comments?.length || 0}</span>
        </span>
      </div>
      <div class="comments-container" id="comments-${note.note_id}">
        ${note.comments && note.comments.length > 0 ? renderComments(note.comments) : ''}
      </div>
    </div>
  `;
  return noteElement;
}

function renderComments(comments) {
  console.log('Rendering comments:', comments); // 添加这行日志

  if (!comments) {
    console.log('No comments to render');
    return '';
  }

  const commentsArray = Array.isArray(comments) ? comments : [comments];

  return commentsArray.map(comment => {
    console.log('Rendering comment:', comment); // 添加这行日志
    const author = comment.author || 'Anonymous';
    const avatarLetter = (author.charAt(0) || 'A').toUpperCase();
    const timestamp = comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'Unknown time';
    const content = comment.content || 'No content';

    return `
      <div class="comment-card">
        <div class="comment-avatar">${avatarLetter}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${author}</span>
            <span class="comment-timestamp">${timestamp}</span>
          </div>
          <div class="comment-content">${content}</div>
        </div>
      </div>
    `;
  }).join('');
}

function setupNoteListeners() {
  const noteList = document.getElementById('noteList');
  
  // 移除现有的事件监听器（如果有的话）
  noteList.removeEventListener('click', handleNoteListClick);
  
  // 添加新的事件监听器
  noteList.addEventListener('click', handleNoteListClick);
}

async function handleNoteListClick(event) {
  const actionBtn = event.target.closest('.act-btn');
  if (actionBtn) {
    const noteId = actionBtn.dataset.noteId;
    const isLike = actionBtn.classList.contains('likes');
    const isHeart = actionBtn.classList.contains('heart');
    const isComment = actionBtn.classList.contains('comment');
    
    if (isLike) {
      handleLike(noteId, actionBtn);
    } else if (isHeart) {
      handleHeart(noteId, actionBtn);
    } else if (isComment) {
      if (isGeneratingComment) {
        console.log('Comment generation already in progress');
        return;
      }
      console.log('Generate comments button clicked');
      console.log('Note ID:', noteId);
      isGeneratingComment = true;
      try {
        await handleGenerateComments(noteId);
      } finally {
        isGeneratingComment = false;
      }
    }
  }

  const deleteButton = event.target.closest('.delete-note');
  if (deleteButton) {
    const noteId = deleteButton.dataset.noteId;
    await handleDeleteNote(noteId);
  }

  const feedbackButton = event.target.closest('.feedback-button');
  if (feedbackButton) {
    const noteId = feedbackButton.dataset.noteId;
    const noteContent = feedbackButton.dataset.noteContent;
    await handleFeedback(noteId, noteContent);
  }
}

function updateNoteTagsInUI(noteId, tags) {
  updateTagsDisplay(noteId, tags);
}

async function handleDeleteNote(noteId) {
  console.log(`Attempting to delete note with ID: ${noteId}`);
  
  // 找到笔记元
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
    // 可以在这里添加用户通知逻辑，如显示错误息
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

async function handleSearch(event) {
  const searchTerm = event.target.value.trim();
  console.log('Searching for:', searchTerm);

  if (searchTerm.length === 0) {
    isShowingSearchResults = false;
    updateNoteList(originalNotes);
    hideSearchResultsInfo();
  } else {
    try {
      const searchResults = await noteOperations.searchNotes(searchTerm);
      isShowingSearchResults = true;
      updateNoteList(searchResults);
      showSearchResultsInfo(searchResults.length, searchTerm);
    } catch (error) {
      console.error('Error searching notes:', error);
      showErrorMessage('An error occurred while searching. Please try again.');
    }
  }
}

function showSearchResultsInfo(resultCount, searchTerm) {
  let infoElement = document.getElementById('searchResultsInfo');
  if (!infoElement) {
    const noteList = document.getElementById('noteList');
    infoElement = document.createElement('div');
    infoElement.id = 'searchResultsInfo';
    infoElement.className = 'search-results-info';
    if (noteList && noteList.parentNode) {
      noteList.parentNode.insertBefore(infoElement, noteList);
    } else {
      console.error('Could not find noteList or its parent');
      return;
    }
  }
  infoElement.innerHTML = `
    <span>Showing ${resultCount} result(s) for "${searchTerm}"</span>
    <button id="clearSearch" class="clear-search-button">
      <span>Clear Search</span>
    </button>
  `;
  document.getElementById('clearSearch').addEventListener('click', clearSearch);
}

function hideSearchResultsInfo() {
  const infoElement = document.getElementById('searchResultsInfo');
  if (infoElement && infoElement.parentNode) {
    infoElement.parentNode.removeChild(infoElement);
  }
}

function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  isShowingSearchResults = false;
  updateNoteList(originalNotes);
  hideSearchResultsInfo();
}

function showErrorMessage(message) {
  // 实现一个显示错误消息的函数
  alert(message); // 这只是一个简单的实现，你可能想要一个更优雅的解决方案
}

async function initializeUI() {
  console.log('Initializing UI...');
  
  showLoadingIndicator();

  try {
    console.log('Fetching initial notes...');
    const initialNotes = await noteOperations.getPaginatedNotes();
    console.log(`Received ${initialNotes.length} initial notes`);
    updateNoteList(initialNotes);
    
    if (initialNotes.length > 0) {
      lastLoadedNoteId = initialNotes[initialNotes.length - 1].note_id;
      showLoadMoreButton();
    } else {
      hideLoadMoreButton();
      allNotesLoaded = true;
    }

    setupEventListeners();
    originalNotes = await noteOperations.getNotes();
    updateNoteList(originalNotes);
  } catch (error) {
    console.error('Error initializing UI:', error);
    showErrorMessage('An error occurred while loading notes. Please refresh the page and try again.');
  } finally {
    hideLoadingIndicator();
  }
}

async function loadMoreNotes() {
  if (isShowingSearchResults) {
    console.log('Showing search results, not loading more notes');
    return;
  }

  if (isLoading || allNotesLoaded) return;

  isLoading = true;
  showLoadingIndicator();

  try {
    const notes = await noteOperations.getPaginatedNotes(lastLoadedNoteId);
    if (notes.length === 0) {
      allNotesLoaded = true;
      hideLoadMoreButton();
    } else {
      updateNoteList(notes, true); // true means append, not replace
      lastLoadedNoteId = notes[notes.length - 1].note_id;
      showLoadMoreButton();
    }
  } catch (error) {
    console.error('Error loading more notes:', error);
  } finally {
    isLoading = false;
    hideLoadingIndicator();
  }
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

      // 异添加笔记，传更新UI的回调函数
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

function showLoadMoreButton() {
  let loadMoreButton = document.getElementById('loadMoreButton');
  if (!loadMoreButton) {
    loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'loadMoreButton';
    loadMoreButton.textContent = 'Load More';
    loadMoreButton.addEventListener('click', loadMoreNotes);
    document.getElementById('app').appendChild(loadMoreButton);
  }
  loadMoreButton.style.display = 'block';
}

function hideLoadMoreButton() {
  const loadMoreButton = document.getElementById('loadMoreButton');
  if (loadMoreButton) {
    loadMoreButton.style.display = 'none';
  }
}

function setupEventListeners() {
  // ... 保持原有的事件监听器设置 ...

    // 添加笔记的事件监听器
    const addNoteButton = document.getElementById('addNoteButton');
    if (addNoteButton) {
      addNoteButton.addEventListener('click', handleAddNote);
    }
  
    // 注销按钮的事件监听器
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }

  // 添加滚动事件监听器，实现无限滚动
  window.addEventListener('scroll', _.throttle(() => {
    if (!isShowingSearchResults && 
        (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
      loadMoreNotes();
    }
  }, 200));

  // 添加搜索功能
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }
    // Command + Enter（或 Ctrl + Enter）快捷键监听器

    const noteInput = document.getElementById('noteInput');
  if (noteInput) {
    noteInput.addEventListener('keydown', handleNoteInputKeydown);
  }

  document.addEventListener('tagsGenerated', (event) => {
    console.log('tagsGenerated event received', event.detail);
    const { noteId, tags } = event.detail;
    if (noteId && tags) {
      updateTagsDisplay(noteId, tags);
    } else {
      console.error('Invalid data in tagsGenerated event', event.detail);
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('.act-btn.likes')) {
      const noteId = event.target.closest('.act-btn.likes').dataset.noteId;
      handleLike(noteId, event.target.closest('.act-btn.likes'));
    } else if (event.target.closest('.act-btn.heart')) {
      const noteId = event.target.closest('.act-btn.heart').dataset.noteId;
      handleHeart(noteId, event.target.closest('.act-btn.heart'));
    } else if (event.target.closest('.act-btn.comment')) {
      const noteId = event.target.closest('.act-btn.comment').dataset.noteId;
      handleGenerateComments(noteId);
    } else if (event.target.closest('.feedback-button')) {
      const noteId = event.target.closest('.feedback-button').dataset.noteId;
      const noteContent = event.target.closest('.feedback-button').dataset.noteContent;
      handleFeedback(noteId, noteContent);
    }
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
  handleNoteInputKeydown,  // 新添加的函数
  showLoadingIndicator,
  hideLoadingIndicator,
  handleSearch
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
  // 检查是按下了 Command+Enter (Mac) 或 Ctrl+Enter (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault(); // 阻止默认行为
    handleAddNote(event.target);
  }
}

function handleLike(noteId, button) {
  const countSpan = button.parentElement.querySelector('.count');
  let count = parseInt(countSpan.textContent);
  
  if (button.classList.toggle('active')) {
    count++;
  } else {
    count--;
  }
  
  countSpan.textContent = count;
  // 这里可以添加与后端通信的更新服务器上的点赞数
  // noteOperations.updateLikes(noteId, count);
}

function handleHeart(noteId, button) {
  const countSpan = button.parentElement.querySelector('.count');
  let count = parseInt(countSpan.textContent);
  
  if (button.classList.toggle('active')) {
    count++;
  } else {
    count--;
  }
  
  countSpan.textContent = count;
  // 这里可以添加与后端通信的代码，更新服务器上心形
  // noteOperations.updateHearts(noteId, count);
}

async function handleGenerateComments(noteId) {
  if (isGeneratingComment) {
    console.log('Comment generation already in progress');
    return;
  }

  isGeneratingComment = true;
  console.log(`Generating comment for note ${noteId}`);
  const commentsContainer = document.getElementById(`comments-${noteId}`);
  if (!commentsContainer) {
    console.error(`Comments container not found for note ${noteId}`);
    isGeneratingComment = false;
    return;
  }

  // 禁用评论按钮，防止重复点击
  const commentButton = document.querySelector(`.act-btn.comment[data-note-id="${noteId}"]`);
  if (commentButton) {
    commentButton.disabled = true;
  }

  try {
    // 创建并显示加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="spinner"></div>
      <p>AI is thinking...</p>
    `;
    commentsContainer.appendChild(loadingIndicator);

    // 生成单个评论
    const newComment = await noteOperations.generateCommentsForNote(noteId);
    console.log('Received new comment:', newComment);

    // 移除加载指示器
    loadingIndicator.remove();

    if (newComment && newComment.content) {
      const renderedComment = renderSingleComment(newComment);
      console.log('Rendered comment HTML:', renderedComment);
      
      // 使用淡入效果显示新评论
      const newCommentElement = document.createElement('div');
      newCommentElement.innerHTML = renderedComment;
      newCommentElement.style.opacity = '0';
      commentsContainer.appendChild(newCommentElement);

      // 触发重排后淡入显示
      setTimeout(() => {
        newCommentElement.style.transition = 'opacity 0.5s ease-in';
        newCommentElement.style.opacity = '1';
      }, 10);

      // 更新评论计数
      const commentCountElement = document.querySelector(`.act-btn.comment[data-note-id="${noteId}"] + .count`);
      if (commentCountElement) {
        const currentCount = parseInt(commentCountElement.textContent) || 0;
        commentCountElement.textContent = currentCount + 1;
      }
    } else {
      console.error('New comment is empty or invalid:', newComment);
      const noCommentMessage = document.createElement('p');
      noCommentMessage.textContent = 'Failed to generate comment.';
      commentsContainer.appendChild(noCommentMessage);
    }
  } catch (error) {
    console.error('Error generating comment:', error);
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Failed to generate comment';
    commentsContainer.appendChild(errorMessage);
  } finally {
    // 重新启用评论按钮
    if (commentButton) {
      commentButton.disabled = false;
    }
    isGeneratingComment = false;
  }
}

async function handleFeedback(noteId, noteContent) {
  console.log('Entering handleFeedback');
  
  // 创建一个临时的提示元素
  const messageElement = document.createElement('div');
  messageElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #fff;
    color: #333333;
    padding: 24px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-width: 90%;
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(messageElement);

  try {
    // 显示"正在思考"的消
    messageElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100px;">
        <div class="spinner"></div>
      </div>
      <p style="text-align: center; margin-top: 16px; color: #007BFF;">AI is thinking...</p>
    `;

    // 调用 AI API 生成反馈
    const feedback = await noteOperations.generateFeedbackForNote(noteId, noteContent);
    console.log('Received feedback:', feedback);

    // 显示生成的反馈
    messageElement.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #007BFF;">AI Feedback</h3>
      <p style="margin-bottom: 24px; line-height: 1.5;">${feedback}</p>
      <button id="closeFeedback" class="feedback-button" style="align-self: flex-end;">Close</button>
    `;

    // 添加关闭按钮的事件监听器
    document.getElementById('closeFeedback').addEventListener('click', () => {
      messageElement.style.opacity = '0';
      setTimeout(() => document.body.removeChild(messageElement), 300);
    });

  } catch (error) {
    console.error('Error in handleFeedback:', error);
    messageElement.innerHTML = `
      <p style="margin-bottom: 24px; color: #e74c3c;">Failed to generate feedback. Please try again.</p>
      <button id="closeFeedback" class="feedback-button" style="align-self: flex-end;">Close</button>
    `;

    // 添加关闭按钮的事件监听器
    document.getElementById('closeFeedback').addEventListener('click', () => {
      messageElement.style.opacity = '0';
      setTimeout(() => document.body.removeChild(messageElement), 300);
    });
  }
}

function renderSingleComment(comment) {
  console.log('Rendering comment:', comment);
  const author = comment.author || 'Anonymous';
  const avatarLetter = (author.charAt(0) || 'A').toUpperCase();
  const timestamp = comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'Unknown time';

  return `
    <div class="comment-card">
      <div class="comment-avatar">${avatarLetter}</div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">${author}</span>
          <span class="comment-timestamp">${timestamp}</span>
        </div>
        <div class="comment-content">${comment.content}</div>
      </div>
    </div>
  `;
}