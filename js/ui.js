import { state } from './main.js';
import noteOperations from './noteOperations.js';
import { formatTimestamp } from './noteHelper.js';
import { localStorageService } from './localStorage.js';
import { debounce } from './utils.js';
import renderHelpers from './renderHelpers.js';
import { isValidUrl } from './utils.js';
import api from './api.js';
import { messageManager, showLoadingIndicator, hideLoadingIndicator, showAllNotesLoadedMessage, showErrorMessage } from './messageManager.js';
import { AUTH_PAGE_URL } from './main.js';
import { auth, logoutUser } from './Auth/authService.js'; // 确保正确导入 auth 和 logoutUser
import { transcribeAudio, polishText } from './audioTextProcessing.js';

// UI 初始化
export function initializeUI() {
  console.log('Initializing UI...');
  updateUserInfo();
  loadInitialNotes();
  setupEventListeners();
  initializeTrendingTags();
  initializeTrendingTagsAnalysis(); // 添加这一行
}

// 更新用户信息显示
async function updateUserInfo() {
  console.log('Updating user info...');
  const usernameElement = document.getElementById('username');
  
  if (!usernameElement) {
    console.warn('Username element not found in the DOM');
    return;
  }

  try {
    console.log('Calling auth.getCurrentUser()');
    const currentUser = await auth.getCurrentUser();
    console.log('Current user:', currentUser);

    if (currentUser && currentUser.email) {
      const email = currentUser.email;
      const username = email.split('@')[0];
      console.log('User logged in:', username, email);
      usernameElement.textContent = `  ${username}`;
    } else {
      console.log('No user logged in or email not available');
      console.log('localStorage authToken:', localStorage.getItem('authToken'));
      console.log('localStorage userEmail:', localStorage.getItem('userEmail'));
      usernameElement.textContent = '';
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    usernameElement.textContent = '';
  }
}

// 加载初始笔记
async function loadInitialNotes() {
  try {
    showLoadingIndicator('Loading notes...');
    state.currentPage = 0; // 重置到第一页
    const notes = await noteOperations.getPaginatedNotes(state.currentPage, state.pageSize);
    state.originalNotes = notes;
    updateNoteList(notes);
    state.currentPage++; // 准备加载下一页
  } catch (error) {
    console.error('Error loading initial notes:', error);
    showErrorMessage('Failed to load notes. Please try again.');
  } finally {
    hideLoadingIndicator();
  }
}

let mediaRecorder;
let audioChunks = [];
let recognition;

function updateVisualFeedback(isRecording) {
  const voiceButton = document.getElementById('voiceInputButton');
  if (isRecording) {
    voiceButton.classList.add('recording');
    voiceButton.setAttribute('aria-label', 'Stop voice input');
  } else {
    voiceButton.classList.remove('recording');
    voiceButton.setAttribute('aria-label', 'Start voice input');
  }
}

function setupSpeechRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new window.SpeechRecognition();
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.lang = 'zh-CN'; // 设置为中文，可以根据需要更改

  recognition.addEventListener('result', (e) => {
    const transcript = Array.from(e.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');

    document.getElementById('noteInput').value = transcript;
  });

  recognition.addEventListener('end', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      recognition.start();
    }
  });
}

function handleVoiceInput() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
    if (recognition) recognition.stop();
  } else {
    startRecording();
    if (recognition) recognition.start();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start();
    updateVisualFeedback(true);
  } catch (error) {
    console.error('Error starting recording:', error);
    alert('无法启动录音。请确保您的浏览器支持录音功能，并且您已授予录音权限。');
  }
}

async function stopRecording() {
  updateVisualFeedback(false);
  startProcessingAnimation(); // 开始处理动画

  return new Promise((resolve) => {
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const wavBlob = await convertToWAV(audioBlob);
      console.log('WAV blob created:', wavBlob);
      console.log('WAV blob size:', wavBlob.size, 'bytes');

      try {
        const transcription = await transcribeAudio(wavBlob);
        console.log('Transcription:', transcription);
        const polishedText = await polishText(transcription);
        document.getElementById('noteInput').value = polishedText;
      } catch (error) {
        console.error('Error processing audio:', error);
        alert('处理音频时出错，请重试。');
      } finally {
        stopProcessingAnimation(); // 停止处理动画
      }
      resolve();
    };
    mediaRecorder.stop();
  });
}

async function convertToWAV(audioBlob) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  // WAV 文件头
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * 2, true);

  // 写入音频数
  const channelData = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

//更新笔记列表

function updateNoteList(notesToDisplay, append = false) {
  const noteList = document.getElementById('noteList');
  if (!append) {
    noteList.innerHTML = '';
  }

  const fragment = document.createDocumentFragment();
  notesToDisplay.forEach(note => {
    const noteElement = createNoteElement(note);
    fragment.appendChild(noteElement);
  });
  noteList.appendChild(fragment);

    // 更新所有笔记的标签
    updateTagsDisplay(notesToDisplay);

  setupNoteListeners();

  // 显示 "You've reached the end of your notes" 消息
  const allNotesLoadedElement = document.getElementById('allNotesLoaded');
  if (allNotesLoadedElement && notesToDisplay.length < 24) { // 假设每页加载24条笔
    allNotesLoadedElement.classList.remove('hidden');
  }
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
    // 可以在这里添加用户通逻辑，如显示错误息
  }
}

async function updateTagsDisplay(notesOrNote) {
  console.log('updateTagsDisplay 被调用，参数：', notesOrNote);
  
  const notes = Array.isArray(notesOrNote) ? notesOrNote : [notesOrNote];

  for (const note of notes) {
    const noteId = typeof note === 'string' ? note : note.note_id;
    const tags = Array.isArray(note.tags) ? note.tags : (typeof note === 'object' ? note.tags : []);

    const noteElement = document.querySelector(`.note-item[data-note-id="${noteId}"]`);
    if (!noteElement) {
      console.warn(`未在DOM中找到ID为 ${noteId} 的笔记元素`);
      continue;
    }

    const tagContainer = noteElement.querySelector('.note-tags');
    if (!tagContainer) {
      console.warn(`在笔记 ${noteId} 的元素中未找到标签容器`);
      console.log('笔记元素HTML：', noteElement.innerHTML);
      continue;
    }

    // console.log(`渲染笔记 ${noteId} 的标签数组：`, tags);

    // 渲染标签
    tagContainer.innerHTML = renderHelpers.renderTags(tags);

    // 如果需要等待DOM更新，可以使用 requestAnimationFrame
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

async function handleSearch(event) {
  const searchTerm = event.target.value.trim();
  console.log('Searching for:', searchTerm);

  if (searchTerm.length === 0) {
    state.isShowingSearchResults = false;
    updateNoteList(state.originalNotes);
    hideSearchResultsInfo();
  } else {
    try {
      const searchResults = await noteOperations.searchNotes(searchTerm);
      state.isShowingSearchResults = true;
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
  const clearSearchButton = document.getElementById('clearSearch');
  clearSearchButton.removeEventListener('click', clearSearch); // 移除旧的监听器
  clearSearchButton.addEventListener('click', clearSearch);
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
  state.isShowingSearchResults = false;
  updateNoteList(state.originalNotes);
  hideSearchResultsInfo();
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

function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}



// 新增：延迟加载热标签分析
async function initializeTrendingTagsAnalysis() {
  if (state.isAnalyzing) return; // 使用 state.isAnalyzing 而不是 isAnalyzing
  
  state.isAnalyzing = true;
  console.log('Initializing trending tags analysis');
  try {
    const { trendingTags } = await noteOperations.getTrendingTags(10);
    console.log('Trending tags for analysis:', trendingTags);
    if (trendingTags && trendingTags.length > 0) {
      const analysisReport = await noteOperations.analyzeTrendingTags(trendingTags);
      updateTrendingTagsAnalysis(trendingTags, analysisReport);
    } else {
      console.log('No trending tags available for analysis');
    }
  } catch (error) {
    console.error('Error initializing trending tags analysis:', error);
    showErrorMessage('Failed to analyze trending tags. Please try again later.');
  } finally {
    state.isAnalyzing = false;
  }
}

async function updateTrendingTagsAnalysis(trendingTags, analysisReport) {
  try {
    console.log('Updating trending tags analysis:', trendingTags, analysisReport);
    
    const trendingTagsContainer = document.getElementById('trending-tags-container');
    console.log('Trending tags container:', trendingTagsContainer);
    
    if (trendingTagsContainer) {
      const trendingTagsDiv = trendingTagsContainer.querySelector('.trending-tags');
      if (trendingTagsDiv) {
        const topTagsList = trendingTagsDiv.querySelector('#topTagsList');
        const trendingTagsAnalysisElement = trendingTagsDiv.querySelector('#trending-tags-analysis');
        
        if (topTagsList && trendingTagsAnalysisElement) {
          // 更新热门标签列表
          // const tagsHtml = trendingTags.map(tag => `<li><span class="tag">#${tag.name} (${tag.count})</span></li>`).join('');
          // topTagsList.innerHTML = tagsHtml;
          
          // 更新分析报告
          trendingTagsAnalysisElement.innerHTML = `
            <h3>Analysis</h3>
            <div class="analysis-report">
              <p>${analysisReport}</p>
            </div>
          `;
          console.log('Trending tags analysis updated');
        } else {
          console.warn('Top tags list or trending tags analysis element not found');
          console.log('topTagsList:', topTagsList);
          console.log('trendingTagsAnalysisElement:', trendingTagsAnalysisElement);
        }
      } else {
        console.warn('Trending tags div not found');
      }
    } else {
      console.warn('Trending tags container not found. DOM structure:', document.body.innerHTML);
    }
  } catch (error) {
    console.error('Error updating trending tags analysis:', error);
  }
}

async function loadMoreNotes() {
  if (state.isShowingSearchResults || state.isLoading || state.allNotesLoaded) return;

  state.isLoading = true;
  const loadingIndicator = showLoadingIndicator('Loading more notes...');

  try {
    console.log('Loading more notes, page:', state.currentPage);
    const newNotes = await noteOperations.getPaginatedNotes(state.currentPage, state.pageSize);
    console.log('New notes received:', newNotes);

    if (newNotes.length === 0) {
      console.log('No new notes received, all notes loaded');
      state.allNotesLoaded = true;
      showAllNotesLoadedMessage();
    } else {
      updateNoteList(newNotes, true); // true means append, not replace
      state.currentPage++; // 增加页码

      if (newNotes.length < state.pageSize) {
        // 如果返回的笔记数量少于页面大小，说明这是最后一页
        showEndOfNotesMessage();
      } else {
        // 如果不是最后一页，显示已加载的笔记数量
        showLoadedNotesCountMessage(newNotes.length);
      }
    }
  } catch (error) {
    console.error('Error loading more notes:', error);
    showErrorMessage('An error occurred while loading more notes. Please try again.');
  } finally {
    state.isLoading = false;
    hideLoadingIndicator(loadingIndicator);
  }
}

function showEndOfNotesMessage() {
  messageManager.showInfo("You've reached the end of your notes!");
}

function showLoadedNotesCountMessage(count) {
  messageManager.showInfo(`Loaded ${count} more notes. Scroll for more!`);
}

// 修 handleAddNote 数
async function handleAddNote(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  const noteInput = document.getElementById('noteInput');
  let noteText = noteInput.value.trim();
  if (!noteText) return;

  let tempNoteId = null;
  let loadingIndicator = null;

  try {
    if (isValidUrl(noteText)) {
      loadingIndicator = showLoadingIndicator('Fetching web content');
      startProcessingAnimation();
      try {
        const content = await fetchWebContent(noteText);
        if (content) {
          noteText = content;
          noteInput.value = noteText;
        }
      } catch (error) {
        console.error('Error fetching web content:', error);
        showErrorMessage('Failed to fetch web content. Please try again.');
      } finally {
        hideLoadingIndicator(loadingIndicator);
        stopProcessingAnimation();
      }
    }

    if (noteText.length > 1000 && !noteInput.dataset.rewritten) {
      loadingIndicator = showLoadingIndicator('Rewriting content');
      startProcessingAnimation();
      console.log('Content too long, rewriting...');
      const rewrittenText = await api.ai.rewriteContent(noteText);
      console.log('Rewritten content:', rewrittenText);
      
      noteInput.value = rewrittenText;
      noteInput.dataset.rewritten = 'true';
      
      messageManager.showInfo('Content has been rewritten by AI for brevity. Please review and submit.');
      
      hideLoadingIndicator(loadingIndicator);
      stopProcessingAnimation
      return; // 结束函数执行，等待用户确认改写后的内容
    }

    // 如果内容已经被重写或不需要重写，则继续添加笔记
    tempNoteId = 'temp-' + Date.now();
    const tempNote = {
      note_id: tempNoteId,
      content: noteText,
      tags: []
    };

    noteOperations.addTempNote(tempNote);
    
    const tempNoteElement = createNoteElement(tempNote);
    const noteList = document.getElementById('noteList');
    noteList.insertBefore(tempNoteElement, noteList.firstChild);

    const newNote = await noteOperations.addNote(noteText);
    console.log('Note added successfully:', newNote);

    const existingNoteElement = document.querySelector(`.note-item[data-note-id="${tempNoteId}"]`);
    if (existingNoteElement) {
      existingNoteElement.dataset.noteId = newNote.note_id;
      updateNoteContent(existingNoteElement, newNote);
    }

    await updateTagsDisplay(newNote);

    clearNoteInput();
    delete noteInput.dataset.rewritten;



  } catch (error) {
    console.error('Error adding note or fetching web content:', error);
    showErrorMessage('An error occurred. Please try again.');
    if (tempNoteId) {
      document.querySelector(`.note-item[data-note-id="${tempNoteId}"]`)?.remove();
    }
  } finally {
    if (loadingIndicator) {
      hideLoadingIndicator(loadingIndicator);
    }
  }
}

async function handleNoteInputChange(event) {
  const input = event.target;
  const url = input.value.trim();

  if (isValidUrl(url)) {
    try {
      showLoadingIndicator();
      startProcessingAnimation();
      const content = await fetchWebContent(url);
      input.value = content;
    } catch (error) {
      console.error('Error fetching web content:', error);
      showErrorMessage('Failed to fetch web content. Please try again.');
    } finally {
      hideLoadingIndicator();
      stopProcessingAnimation();
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

function updateNoteContent(element, note) {
  const contentElement = element.querySelector('.note-text');
  if (contentElement) contentElement.textContent = note.content;
  
  const timestampElement = element.querySelector('.note-timestamp');
  if (timestampElement) timestampElement.textContent = formatTimestamp(note.created_at);
  
}

async function handleCompleteUserInput() {
  const noteInput = document.getElementById('noteInput');
  const partialInput = noteInput.value;

  if (partialInput.trim() === '') return;

  try {
    showLoadingIndicator('Completing input...');
    startProcessingAnimation();
    const completion = await noteOperations.completeUserInput(partialInput);
    noteInput.value = partialInput + ' ' + completion;
    noteInput.setSelectionRange(noteInput.value.length, noteInput.value.length);
    noteInput.focus();
  } catch (error) {
    console.error('Error completing user input:', error);
    showErrorMessage('Failed to complete input. Please try again.');
  } finally {
    hideLoadingIndicator();
    stopProcessingAnimation();
  }
}

function clearNoteInput() {
  requestAnimationFrame(() => {
    document.getElementById('noteInput').value = '';
  });
}

async function initializeTrendingTags() {
  const trendingTagsContainer = document.getElementById('trending-tags-container');
  if (!trendingTagsContainer) {
    console.warn('Trending tags container not found in the DOM');
    return;
  }

  const trendingTagsDiv = trendingTagsContainer.querySelector('.trending-tags');
  if (!trendingTagsDiv) {
    console.warn('Trending tags div not found in the DOM');
    return;
  }

  async function fetchAndUpdateTrendingTags() {
    try {
      const { trendingTags } = await noteOperations.getTrendingTags();
      updateTrendingTagsList(trendingTags);
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      updateTrendingTagsList([]); // 显示错误消息
    }
  }

  function updateTrendingTagsList(tags) {
    const topTagsList = trendingTagsDiv.querySelector('#topTagsList');
    if (!topTagsList) {
      console.warn('Top tags list not found in the DOM');
      return;
    }

    topTagsList.innerHTML = '';

    if (Array.isArray(tags) && tags.length > 0) {
      tags.forEach(tag => {
        const li = document.createElement('li');
        li.className = 'trending-tag-item';
        li.innerHTML = `
          <span class="tag-name">#${tag.name}</span>
          <span class="tag-count">${tag.count}</span>
        `;
        topTagsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No trending tags available';
      topTagsList.appendChild(li);
    }
  }

  // 初始加载
  await fetchAndUpdateTrendingTags();

  // 每60分钟更新一次
  setInterval(fetchAndUpdateTrendingTags, 60 * 60 * 1000);
}

export function setupEventListeners() {
  setupSpeechRecognition();
  //语音输入
  const voiceButton = document.getElementById('voiceInputButton');
  if (voiceButton) {
    voiceButton.addEventListener('click', handleVoiceInput);
  } else {
    console.error('Voice input button not found');
  }

    // 添笔记的事件监听
    const addNoteButton = document.getElementById('addNoteButton');
    if (addNoteButton) {
      addNoteButton.addEventListener('click', handleAddNote);
    }

    const clusterTagsButton = document.getElementById('clusterTagsButton');
    if (clusterTagsButton) {
      clusterTagsButton.addEventListener('click', handleClusterTags);
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

  // 添加滚事件监听器，实现无限滚动
  window.addEventListener('scroll', _.throttle(() => {
    if (!state.isShowingSearchResults && 
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
    // console.log('tagsGenerated event received', event.detail);
    const { note_id, tags } = event.detail;
    if (note_id && tags) {
      updateTagsDisplay(note_id, tags);
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
    // console.log('tagsGenerated event received', event.detail);
    const { note_id, tags } = event.detail;
    if (note_id && tags) {
      updateTagsDisplay({ note_id, tags });
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
    // console.log('Comment generation already in progress');
    return;
  }

  isGeneratingComment = true;
  // console.log(`Generating comment for note ${noteId}`);
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

      // 触重排后淡入显
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
    // 重新启用评按钮
    if (commentButton) {
      commentButton.disabled = false;
    }
    isGeneratingComment = false;
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


// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const voiceButton = document.getElementById('voiceInputButton');
  if (voiceButton) {
    voiceButton.addEventListener('click', handleVoiceInput);
  } else {
    console.warn('Voice input button not found');
  }
});

async function handleLogout() {
    try {
        await logoutUser(); // 使用我们自定义的 logoutUser 函数
        console.log('Logout successful');
        // 更新 UI 以反映用户已登出
        updateUserInfo();
        // 重定向到登录页面或首页
        window.location.href = './html/newAuth.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // 显示错误消息给用户
        alert('Failed to log out. Please try again.');
    }
}

async function handleClusterTags() {
  try {
    const clusteredTagsText = await noteOperations.clusterTags();
    console.log('Clustered tags:', clusteredTagsText);
    displayClusteredTags(clusteredTagsText);
  } catch (error) {
    console.error('Error clustering tags:', error);
    showErrorMessage('Failed to cluster tags. Please try again.');
  }
}

function displayClusteredTags(clusteredTags) {
  const clusteredTagsContainer = document.getElementById('clusteredTagsContainer');
  if (!clusteredTagsContainer) {
    console.error('Clustered tags container not found');
    return;
  }
  
  clusteredTagsContainer.innerHTML = '';

  if (!clusteredTags || (typeof clusteredTags !== 'object' && typeof clusteredTags !== 'string') || Object.keys(clusteredTags).length === 0) {
    clusteredTagsContainer.innerHTML = '<p class="no-clusters">No clusters found.</p>';
    return;
  }

  let parsedTags = clusteredTags;

  // 如果输入是字符串，尝试解析为JSON
  if (typeof clusteredTags === 'string') {
    try {
      parsedTags = JSON.parse(clusteredTags);
    } catch (error) {
      console.error('Error parsing clustered tags:', error);
      clusteredTagsContainer.innerHTML = '<p class="no-clusters">Error parsing clusters.</p>';
      return;
    }
  }

  Object.entries(parsedTags).forEach(([cluster, tags]) => {
    const clusterDiv = document.createElement('div');
    clusterDiv.className = 'cluster';
    
    let tagsHtml = '';

    if (Array.isArray(tags)) {
      // 如果标签是数组
      tagsHtml = tags.map(tag => `<span class="cluster-tag">${tag}</span>`).join('');
    } else if (typeof tags === 'string') {
      // 如果标签是字符串
      tagsHtml = tags.split(',').map(tag => `<span class="cluster-tag">${tag.trim()}</span>`).join('');
    } else if (typeof tags === 'object' && tags !== null) {
      // 如果标签是对象（可能是嵌套的聚类）
      tagsHtml = Object.entries(tags).map(([subCluster, subTags]) => 
        `<div class="sub-cluster">
           <h4 class="sub-cluster-title">${subCluster}</h4>
           <div class="sub-cluster-tags">
             ${Array.isArray(subTags) 
               ? subTags.map(tag => `<span class="cluster-tag">${tag}</span>`).join('')
               : `<span class="cluster-tag">${subTags}</span>`}
           </div>
         </div>`
      ).join('');
    } else {
      console.error(`Invalid tags format for cluster "${cluster}"`);
      return;
    }

    clusterDiv.innerHTML = `
      <h3 class="cluster-title">${cluster}</h3>
      <div class="cluster-tags">
        ${tagsHtml}
      </div>
    `;
    clusteredTagsContainer.appendChild(clusterDiv);
  });
}


//处理动画

export function startProcessingAnimation() {
  const noteInput = document.getElementById('noteInput');
  noteInput.classList.add('processing');
}

export function stopProcessingAnimation() {
  const noteInput = document.getElementById('noteInput');
  noteInput.classList.remove('processing');
}

// 确保导出 handleAddNote 函数
export {
  updateNoteList,
  handleAddNote,
  updateTagsDisplay,
  handleDeleteNote,
  handleNoteInputKeydown,  // 新添加的函数
  showLoadingIndicator,
  hideLoadingIndicator,
  handleSearch,
  initializeTrendingTagsAnalysis,
  updateTrendingTagsAnalysis,
  handleCompleteUserInput,
  handleLogout,
  initializeTrendingTags,
  handleClusterTags,
  displayClusteredTags
};