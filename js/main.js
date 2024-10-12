import noteOperations from './noteOperations.js';
import { initializeUI, updateNoteList, initializeTrendingTagsAnalysis } from './ui.js';
import { logoutUser } from './Auth/authService.js';
import noteAPI from './noteAPI.js';

export const AUTH_PAGE_URL = "html/newAuth.html"; // 更新为新的认证页面路径
const loadingIndicator = document.getElementById('loading-indicator');
let isInitialized = false;

async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('No auth token found. Redirecting to login page...');
        window.location.href = AUTH_PAGE_URL;
        return null;
    }
    return { token }; // 假设 token 有效，返回一个包含 token 的对象
}

function showErrorMessage(message) {
  console.error(message);
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

async function handleAuthStateChange() {
    if (isInitialized) return;
    
    try {
        const user = await checkAuthStatus();
        if (user) {
            console.log('User authenticated');
            try {
                await Promise.all([
                    noteOperations.initializePaginatedNotes(),
                    initializeUI()
                ]);
            } catch (error) {
                if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                    console.error('Authentication error:', error);
                    showErrorMessage('Your session has expired. Please log in again.');
                    redirectToLogin();
                } else {
                    throw error; // 重新抛出其他类型的错误
                }
            }
        } else {
            console.log('User not authenticated. Redirecting to login page...');
            handleLogout();
        }
    } catch (error) {
        console.error('Error in handleAuthStateChange:', error);
        showErrorMessage('An unexpected error occurred. Please try again later.');
    }
}

// 使用防抖函数来避免多次快速的状态变化
const debouncedHandleAuthStateChange = debounce(handleAuthStateChange, 300);

// 页面加载时检查认证状态
document.addEventListener('DOMContentLoaded', debouncedHandleAuthStateChange);

// 添加防抖函数
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

// 添加登出功能
document.getElementById('logoutButton').addEventListener('click', logoutUser);
