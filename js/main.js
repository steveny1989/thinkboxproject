import noteOperations from './noteOperations.js';
import { initializeUI, updateNoteList, updateTrendingTagsAnalysis, setupEventListeners } from './ui.js';
import { auth, loginUser, logoutUser } from './Auth/authService.js';
import noteAPI from './noteAPI.js';

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
  notesPerPage: 24,
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
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.error('Authentication error:', error);
          showErrorMessage('Your session has expired. Please log in again.');
          logoutUser();
        } else {
          throw error;
        }
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

function initializeApp() {
  console.log('Initializing app...');
  
  checkAuthStatus().then(handleAuthStateChange);

  document.getElementById('logoutButton').addEventListener('click', logoutUser);
}

// 使用防抖函数来避免多次快速的状态变化
const debouncedInitializeApp = debounce(initializeApp, 300);

document.addEventListener('DOMContentLoaded', debouncedInitializeApp);

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 启动应用
debouncedInitializeApp();
