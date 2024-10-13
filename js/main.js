import noteOperations from './noteOperations.js';
import { initializeUI, updateNoteList, updateTrendingTagsAnalysis, setupEventListeners } from './ui.js';
import { auth, loginUser, logoutUser } from './Auth/authService.js';
import { debounce } from './utils.js';

export const AUTH_PAGE_URL = "html/newAuth.html";

export const state = {
  lastLoadedNoteId: null,
  isLoading: false,
  allNotesLoaded: false,
  originalNotes: [],
  isShowingSearchResults: false,
  isGeneratingComment: false,
  isListening: false,
  isAnalyzing: false,
  currentPage: 0,
  pageSize: 24
};

let isInitialized = false;

function showErrorMessage(message) {
  console.error(message);
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

async function checkAuthStatus() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.log('No auth token found. Redirecting to login page...');
    window.location.href = AUTH_PAGE_URL;
    return null;
  }
  return { token };
}

async function handleAuthStateChange(authStatus) {
  if (isInitialized) return;
  
  try {
    if (authStatus && authStatus.token) {
      console.log('User is signed in');
      try {
        await Promise.all([
          noteOperations.initializePaginatedNotes(),
          initializeUI(),
          updateTrendingTagsAnalysis()
        ]);
        setupEventListeners();
        isInitialized = true;
      } catch (error) {
        handleInitializationError(error);
      }
    } else {
      console.log('User is signed out');
      window.location.href = AUTH_PAGE_URL;
    }
  } catch (error) {
    console.error('Error in handleAuthStateChange:', error);
    showErrorMessage('An unexpected error occurred. Please try again later.');
  }
}

function handleInitializationError(error) {
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    console.error('Authentication error:', error);
    showErrorMessage('Your session has expired. Please log in again.');
    logoutUser();
  } else {
    console.error('Initialization error:', error);
    showErrorMessage('An error occurred during initialization. Please try again.');
  }
}

function initializeApp() {
  console.log('Initializing app...');
  
  checkAuthStatus().then(handleAuthStateChange);

  document.getElementById('logoutButton').addEventListener('click', logoutUser);
}

// 使用防抖函数来避免多次快速的状态变化
const debouncedInitializeApp = debounce(initializeApp, 300);

document.addEventListener('DOMContentLoaded', debouncedInitializeApp);

// 启动应用
debouncedInitializeApp();

const debouncedUpdateTrendingTagsAnalysis = debounce(updateTrendingTagsAnalysis, 300);

// 在需要调用 updateTrendingTagsAnalysis 的地方使用 debouncedUpdateTrendingTagsAnalysis
