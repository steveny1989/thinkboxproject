import { auth, onAuthStateChanged, signOut } from './firebase.js';
import noteOperations from './noteOperations.js';
import { formatTimestamp } from './noteHelper.js';
import { localStorageService } from './localStorage.js';
import { debounce } from './utils.js';
import renderHelpers from './renderHelpers.js';
import { isValidUrl } from './utils.js';
import api from './api.js';
import aiAPI from './AIAPI.js';
import { 
  showLoadingIndicator, 
  hideLoadingIndicator, 
  showAllNotesLoadedMessage, 
  showErrorMessage, 
  showSuccessMessage 
} from './messageManager.js';



const AUTH_PAGE_URL = "./html/auth.html"; // 定义 auth.html 的路径

let lastLoadedNoteId = null;
let isLoading = false;
let allNotesLoaded = false;
let originalNotes = [];
let isShowingSearchResults = false;
let isGeneratingComment = false;
let recognition;
let isListening = false;
let isAnalyzing = false;


if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
} else if ('SpeechRecognition' in window) {
  recognition = new SpeechRecognition();
} else {
  console.warn('Speech recognition is not supported in this browser.');
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

  // 显示 "You've reached the end of your notes" 消息
  const allNotesLoadedElement = document.getElementById('allNotesLoaded');
  if (allNotesLoadedElement && notesToDisplay.length < 24) { // 假设每页加载24条笔记
    allNotesLoadedElement.classList.remove('hidden');
  }
}

function updateUserInfo(userEmailElement) {
  if (!auth.currentUser) {
    userEmailElement.textContent = '';
    return;
  }
  const email = auth.currentUser.email;
  const username = email.split('@')[0]; // 这行代码提取 @ 符号前的部分
  userEmailElement.textContent = username;
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
      <div class="dropdown">
        <span class="dropdown-trigger">...</span>
        <div class="dropdown-content">
          <a href="javascript:void(0)" class="delete-note" data-note-id="${note.note_id}">Delete</a>
        </div>
      </div>
      <div class="note-tags-container">
        <div id="tags-${note.note_id}" class="note-tags">${renderHelpers.renderTags(note.tags || [])}</div>
      </div>
      <div class="note-actions-container">
        <div class="note-actions">
          <span class="action-wrapper">
            <button class="act-btn comment" data-note-id="${note.note_id}" title="Generate AI comment" tabindex="0" role="button" aria-label="Generate AI comment">
              <i class="fas fa-robot" aria-hidden="true"></i>
              <i class="fas fa-spinner fa-spin" style="display: none;" aria-hidden="true"></i>
            </button>
            <span class="count ${note.comments?.length > 0 ? 'has-comments' : ''}" aria-label="${note.comments?.length || 0} comments">${note.comments?.length || 0}</span>
          </span>
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
        </div>
      </div>
      <div class="note-comments-container" id="comments-${note.note_id}">
        ${note.comments && note.comments.length > 0 ? renderHelpers.renderComments(note.comments) : ''}
      </div>
    </div>
  `;
  return noteElement;
}

function setupNoteListeners() {
  const noteList = document.getElementById('noteList');
  
  // 移除现有的事件监听器（如果有的话）
  noteList.removeEventListener('click', handleNoteListClick);
  
  // 添加的事件监听器
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
    // 确保 tags 是一个数组
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    
    // 将标签符分割成单独的标签
    const individualTags = tagsArray.flatMap(tag => 
      tag.split(/[,\s]+/)  // 用逗号或空格分割
         .filter(t => t.startsWith('#'))
         .map(t => t.trim())
    );
    
    // 使用 renderHelpers.renderTags 来渲染分割后的标签
    tagContainer.innerHTML = renderHelpers.renderTags(individualTags);
    console.log('Rendered individual tags:', individualTags);
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
      // 应用高亮到搜索结果
      const noteElements = document.querySelectorAll('.note-item');
      noteElements.forEach(noteElement => applyHighlight(noteElement, searchTerm));
      
    } catch (error) {
      console.error('Error during search:', error);
      showErrorMessage('An error occurred while searching. Please try again.');
    } finally {
      hideLoadingIndicator();
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

async function initializeUI() {
  console.log('Initializing UI...');
  
  const loadingIndicator = showLoadingIndicator('Initializing...');

  try {
    console.log('Fetching initial notes...');
    const initialNotes = await noteOperations.getPaginatedNotes();
    console.log(`Received ${initialNotes.length} initial notes`);
    updateNoteList(initialNotes);
    
    if (initialNotes.length > 0) {
      lastLoadedNoteId = initialNotes[initialNotes.length - 1].note_id;
    } else {
      allNotesLoaded = true;
      showAllNotesLoadedMessage();
    }

    setupEventListeners();
    
    // 将初始加载的笔记设置为 originalNotes
    originalNotes = initialNotes;

  } catch (error) {
    console.error('Error initializing UI:', error);
    showErrorMessage('An error occurred while loading notes. Please refresh the page and try again.');
  } finally {
    hideLoadingIndicator(loadingIndicator);
  }
}

// 新增：延迟加载热门标签分析
async function initializeTrendingTagsAnalysis() {
  if (isAnalyzing) {
    console.log('Analysis already in progress, skipping');
    return;
  }
  
  isAnalyzing = true;
  console.log('Initializing trending tags analysis');
  try {
    const trendingTags = await noteOperations.getTrendingTags(10);
    console.log('Trending tags for analysis:', trendingTags);
    if (trendingTags.length > 0) {
      const analysisReport = await noteOperations.analyzeTrendingTags(trendingTags);
      updateTrendingTagsAnalysis(trendingTags, analysisReport);
    } else {
      console.log('No trending tags available for analysis');
    }
  } catch (error) {
    console.error('Error initializing trending tags analysis:', error);
    showErrorMessage('Failed to analyze trending tags. Please try again later.');
  } finally {
    isAnalyzing = false;
  }
}

function updateTrendingTagsAnalysis(trendingTags, analysisReport) {
  console.log('Updating trending tags analysis');
  const trendingTagsAnalysisElement = document.getElementById('trending-tags-analysis');
  if (trendingTagsAnalysisElement) {
    const tagsHtml = trendingTags.map(tag => `<span class="tag">#${tag.name} (${tag.count})</span>`).join(' ');
    trendingTagsAnalysisElement.innerHTML = `
      <h3>Some Suggestions</h3>
      <div class="analysis-report">
        <h4></h4>
        <p>${analysisReport}</p>
      </div>
    `;
    console.log('Trending tags analysis updated');
  } else {
    console.warn('Trending tags analysis element not found. Creating element.');
    const newElement = document.createElement('div');
    newElement.id = 'trending-tags-analysis';
    document.body.appendChild(newElement);
    updateTrendingTagsAnalysis(trendingTags, analysisReport); // 递归调用以更新新创建的元素
  }
}

async function loadMoreNotes() {
  if (isShowingSearchResults || isLoading || allNotesLoaded) return;

  isLoading = true;
  const loadingIndicator = showLoadingIndicator('Loading more notes...');

  try {
    const lastNoteId = lastLoadedNoteId;
    const notes = await noteOperations.getPaginatedNotes(lastNoteId);
    if (notes.length === 0) {
      allNotesLoaded = true;
      showAllNotesLoadedMessage();
    } else {
      updateNoteList(notes, true); // true means append, not replace
      lastLoadedNoteId = notes[notes.length - 1].note_id;
    }
  } catch (error) {
    console.error('Error loading more notes:', error);
    showErrorMessage('An error occurred while loading more notes. Please try again.');
  } finally {
    isLoading = false;
    hideLoadingIndicator(loadingIndicator);
  }
}

// 在文件顶部添加这个函数定义
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 修改 handleAddNote 函数
async function handleAddNote(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  const noteInput = document.getElementById('noteInput');
  let noteText = noteInput.value.trim();
  if (noteText) {
    try {
      if (isValidUrl(noteText)) {
        showLoadingIndicator('Fetching web content...');
        try {
          const content = await fetchWebContent(noteText);
          if (content) {
            noteText = content;
            noteInput.value = noteText;
          }
        } catch (error) {
          console.error('Error fetching web content:', error);
          // 即使获取网页内容失败，我们也继续处理原始的 noteText
        } finally {
          hideLoadingIndicator();
        }
      }

      // 检查内容长度，如果超过500字符，使用AI改写
      if (noteText.length > 500 && !noteInput.dataset.rewritten) {
        showLoadingIndicator("Rewriting content...");
        console.log('Content too long, rewriting...');
        const rewrittenText = await aiAPI.rewriteContent(noteText);
        console.log('Rewritten content:', rewrittenText);
        
        // 更新 noteText 为改写后的内容
        noteText = rewrittenText;
        
        // 更新输入框的内容，让用户看到改写后的内容
        noteInput.value = rewrittenText;
        
        // 显示一个通知，告诉用户内容已被改写
        showNotification('Content has been rewritten by AI for brevity.');
        
        // 标记输入框，表示内容已被改写
        noteInput.dataset.rewritten = 'true';
        
        hideLoadingIndicator();
        return; // 结束函数执行，等待用户确认改写后的内容
      }

      // 创建一个临时的笔记对象
      const tempNote = {
        note_id: 'temp-' + Date.now(),
        content: noteText, // 使用可能已经被改写的 noteText
        tags: []
      };

      // 添加到内存列表
      noteOperations.addTempNote(tempNote);
      
      // 立即添加到 UI
      const noteElement = createNoteElement(tempNote);
      const noteList = document.getElementById('noteList');
      noteList.insertBefore(noteElement, noteList.firstChild);

      // 异步添加笔记，传入更新UI的回调函数
      const newNote = await noteOperations.addNote(noteText, updateNoteTagsInUI);
      
      // 更新 DOM 中的 note_id
      noteElement.dataset.noteId = newNote.note_id;

      console.log('Note added successfully:', newNote);
      
      // 清空输入框
      noteInput.value = '';
      
      // 重置输入框状态
      delete noteInput.dataset.rewritten;

    } catch (error) {
      console.error('Error adding note or fetching web content:', error);
      showErrorMessage('An error occurred. Please try again.');
    } finally {
      hideLoadingIndicator();
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

async function initializeTrendingTags() {
  function updateTopTagsList(tags) {
    console.log('Updating top tags list with:', tags); // 添加这行日志
    const topTagsList = document.getElementById('topTagsList');
    if (topTagsList) {
      topTagsList.innerHTML = tags.map(tag => {
        console.log('Processing tag:', tag); // 添加这行日志
        return `
          <li class="trending-tag-item">
            <span class="tag-name">#${tag.name || 'Unknown'}</span>
            <span class="tag-count">${tag.count || 0}</span>
          </li>
        `;
      }).join('');
    }
  }

  async function fetchAndUpdateTrendingTags() {
    const trendingTags = await noteOperations.getTrendingTags();
    console.log('Fetched trending tags:', trendingTags); // 添加这行日志
    updateTopTagsList(trendingTags);
  }

  // 初始加载
  await fetchAndUpdateTrendingTags();

  // 每60分钟更新一次
  setInterval(fetchAndUpdateTrendingTags, 60 * 60 * 1000);
}

function setupEventListeners() {
  // ... 保持原有的事件监听设置 ...

    // 添笔记的事件监听器
    const addNoteButton = document.getElementById('addNoteButton');
    if (addNoteButton) {
      addNoteButton.addEventListener('click', handleAddNote);
    }
  
    // 注销按钮的事件监听器
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }
//自动完成的监听器
    const completeButton = document.getElementById('completeButton');
    if (completeButton) {
      completeButton.addEventListener('click', handleCompleteUserInput);
    }

  // 添加滚动事件监听器，实现无限滚动
  window.addEventListener('scroll', _.throttle(() => {
    if (!isShowingSearchResults && 
        (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
      loadMoreNotes();
    }
  }, 200));

    // 添加趋势标签功能
    initializeTrendingTags();
  
    // 添加趋势标签分析功能
    initializeTrendingTagsAnalysis();

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
    const likeButton = event.target.closest('.act-btn.likes');
    if (likeButton) {
      const noteId = likeButton.dataset.noteId;
      handleLike(noteId, likeButton);
    }

    const heartButton = event.target.closest('.act-btn.heart');
    if (heartButton) {
      const noteId = heartButton.dataset.noteId;
      handleHeart(noteId, heartButton);
    }

    const commentButton = event.target.closest('.act-btn.comment');
    if (commentButton) {
      const noteId = commentButton.dataset.noteId;
      handleGenerateComments(noteId);
    }

    const feedbackButton = event.target.closest('.feedback-button');
    if (feedbackButton) {
      const noteId = feedbackButton.dataset.noteId;
      const noteContent = feedbackButton.dataset.noteContent;
      handleFeedback(noteId, noteContent);
    }
  });
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
  const countSpan = button.nextElementSibling;
  let count = parseInt(countSpan.textContent) || 0;
  
  if (button.classList.toggle('active')) {
    count++;
  } else {
    count = Math.max(0, count - 1);
  }

  countSpan.textContent = count;
  countSpan.style.color = button.classList.contains('active') ? 'red' : '';

  console.log(`Like for note ${noteId}: ${count}`);
}

function handleHeart(noteId, button) {
  const countSpan = button.nextElementSibling;
  let count = parseInt(countSpan.textContent) || 0;
  
  if (button.classList.toggle('active')) {
    count++;
  } else {
    count = Math.max(0, count - 1);
  }

  countSpan.textContent = count;
  countSpan.style.color = button.classList.contains('active') ? 'red' : '';

  console.log(`Heart for note ${noteId}: ${count}`);
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

      // 触重排后淡入显示
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
  
  // 检查是否已存在反馈元素
  let messageElement = document.querySelector(`.feedback-message[data-note-id="${noteId}"]`);
  let isExisting = !!messageElement;

  if (!messageElement) {
    messageElement = document.createElement('div');
    messageElement.className = 'feedback-message';
    messageElement.setAttribute('data-note-id', noteId);
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
      opacity: 0;
    `;
    document.body.appendChild(messageElement);
  }

  if (isExisting) {
    // 如果反馈已经存在，切换其显示状态
    if (messageElement.style.display === 'none' || messageElement.style.opacity === '0') {
      // 如果当前是隐藏状态，则显示
      messageElement.style.display = 'block';
      setTimeout(() => {
        messageElement.style.opacity = '1';
      }, 10);
    } else {
      // 如果当前是显示状态，则隐藏
      closeFeedback(messageElement);
    }
    return; // 直接返回，不再继续执行生成新反馈的逻辑
  }

  // 显示或重新显示反馈
  try {
    // 显示"正在思考"的消息
    messageElement.innerHTML = `
      <div class="ai-thinking-container">
        <div class="spinner"></div>
      </div>
      <p class="ai-thinking-text">AI is thinking...</p>
    `;
    messageElement.style.display = 'block';
    setTimeout(() => {
      messageElement.style.opacity = '1';
    }, 10);

    // 调用 AI API 生成反馈
    const feedback = await noteOperations.generateFeedbackForNote(noteId, noteContent);
    console.log('Received feedback:', feedback);

    // 显示生成的反馈
    messageElement.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #007BFF;">AI Feedback</h3>
      <p style="margin-bottom: 24px; line-height: 1.5;">${feedback}</p>
      <button id="closeFeedback-${noteId}" class="feedback-button" style="align-self: flex-end;">Close</button>
    `;

    // 添加关闭按钮的事件监听器
    document.getElementById(`closeFeedback-${noteId}`).addEventListener('click', (event) => {
      event.stopPropagation(); // 阻止事件冒泡
      closeFeedback(messageElement);
    });
  } catch (error) {
    console.error('Error in handleFeedback:', error);
    messageElement.innerHTML = `
      <p style="margin-bottom: 24px; color: #e74c3c;">Failed to generate feedback. Please try again.</p>
      <button id="closeFeedback-${noteId}" class="feedback-button" style="align-self: flex-end;">Close</button>
    `;

    // 添加关闭按钮的事件监听器
    document.getElementById(`closeFeedback-${noteId}`).addEventListener('click', (event) => {
      event.stopPropagation(); // 阻止事件冒泡
      closeFeedback(messageElement);
    });
  }
}

function closeFeedback(element) {
  element.style.opacity = '0';
  setTimeout(() => {
    element.style.display = 'none';
    element.innerHTML = ''; // 清空内容
  }, 300);
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

function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function applyHighlight(noteElement, searchTerm) {
  if (!searchTerm) return;

  // 高亮笔记内容
  const noteTextElement = noteElement.querySelector('.note-text');
  if (noteTextElement) {
    noteTextElement.innerHTML = highlightText(noteTextElement.textContent, searchTerm);
  }

  // 高亮标签（如果存在）
  const tagElements = noteElement.querySelectorAll('.tag');
  tagElements.forEach(tagElement => {
    tagElement.innerHTML = highlightText(tagElement.textContent, searchTerm);
  });
}

function initializeSpeechRecognition() {
  if (!recognition) {
    console.warn('Speech recognition is not supported in this browser.');
    return;
  }

  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    
    if (result.isFinal) {
      const noteInput = document.getElementById('noteInput');
      noteInput.value += transcript + ' ';
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };
}

function toggleSpeechRecognition() {
  if (!recognition) {
    console.warn('Speech recognition is not supported in this browser.');
    return;
  }

  if (isListening) {
    recognition.stop();
    isListening = false;
  } else {
    recognition.start();
    isListening = true;
  }
  updateButtonState();
}

function updateButtonState() {
  const button = document.getElementById('voiceInputButton');
  if (button) {
    if (isListening) {
      button.classList.add('active');
      button.setAttribute('aria-label', 'Stop voice input');
    } else {
      button.classList.remove('active');
      button.setAttribute('aria-label', 'Start voice input');
    }
  } else {
    console.warn('Voice input button not found');
  }
}

async function handleNoteInputChange(event) {
  const input = event.target;
  const url = input.value.trim();

  if (isValidUrl(url)) {
    try {
      showLoadingIndicator();
      const content = await fetchWebContent(url);
      input.value = content;
    } catch (error) {
      console.error('Error fetching web content:', error);
      showErrorMessage('Failed to fetch web content. Please try again.');
    } finally {
      hideLoadingIndicator();
    }
  }
}

async function fetchWebContent(url) {
  try {
    const content = await api.ai.fetchWebContent(url);
    return content;
  } catch (error) {
    console.error('Error in fetchWebContent:', error);
    throw error;
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initializeSpeechRecognition();
  const voiceButton = document.getElementById('voiceInputButton');
  if (voiceButton) {
    voiceButton.addEventListener('click', toggleSpeechRecognition);
  } else {
    console.warn('Voice input button not found');
  }
});

async function handleCompleteUserInput() {
  const noteInput = document.getElementById('noteInput');
  const partialInput = noteInput.value;

  if (partialInput.trim() === '') return;

  try {
    showLoadingIndicator('Completing input...');
    const completion = await noteOperations.completeUserInput(partialInput);
    noteInput.value = partialInput + ' ' + completion;
    noteInput.setSelectionRange(noteInput.value.length, noteInput.value.length);
    noteInput.focus();
  } catch (error) {
    console.error('Error completing user input:', error);
    showErrorMessage('Failed to complete input. Please try again.');
  } finally {
    hideLoadingIndicator();
  }
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
  handleSearch,
  initializeTrendingTagsAnalysis,
  updateTrendingTagsAnalysis,
  handleCompleteUserInput,
};
