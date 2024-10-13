import { auth, registerUser, loginUser } from './authService.js';
import { messageManager, MessageType } from '../messageManager.js';


console.log('newAuth.js loaded');

// 添加 token 刷新函数
async function refreshToken() {
    const currentToken = localStorage.getItem('authToken');
    if (!currentToken) {
        throw new Error('No token found');
    }

    try {
        const response = await fetch(`${NEW_AUTH_API_URL}/refresh-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        return data.token;
    } catch (error) {
        console.error('Token refresh error:', error);
        // 如果刷新失败，可能需要重新登录
        window.location.href = 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    const authForm = document.getElementById('authForm');
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const authTitle = document.getElementById('authTitle');
    const confirmPasswordField = document.getElementById('confirmPassword');
    const submitButton = document.getElementById('submitButton');

    let isLoginMode = true;
    let loadingMessage;

    function setLoginMode() {
        isLoginMode = true;
        confirmPasswordField.style.display = 'none';
        confirmPasswordField.removeAttribute('required');
        submitButton.textContent = '登录';
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
    }

    function setRegisterMode() {
        isLoginMode = false;
        confirmPasswordField.style.display = 'block';
        confirmPasswordField.setAttribute('required', '');
        submitButton.textContent = '注册';
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
    }

    loginToggle.addEventListener('click', setLoginMode);
    registerToggle.addEventListener('click', setRegisterMode);

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('errorMessage');

        if (!email) {
            messageManager.showError('Email is required');
            return;
        }

        if (!password) {
            messageManager.showError('Password is required');
            return;
        }

        if (!isLoginMode && password !== confirmPassword) {
            messageManager.showError('Passwords do not match');
            return;
        }

        try {
            loadingMessage = messageManager.showLoading(isLoginMode ? 'Logging in...' : 'Registering...');
            let result;
            if (isLoginMode) {
                result = await loginUser(email, password);
            } else {
                result = await registerUser({ email, password });
            }
            messageManager.hide(loadingMessage);
            messageManager.showSuccess(isLoginMode ? 'Login successful! Redirecting...' : 'Registration successful! Redirecting...');
            localStorage.setItem('authToken', result.token);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        } catch (error) {
            messageManager.hide(loadingMessage);
            messageManager.showError(`${isLoginMode ? 'Login' : 'Registration'} failed: ${error.message}`);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });

    // 初始化为登录模式
    setLoginMode();

    // 添加输入验证
    document.getElementById('email').addEventListener('blur', validateEmail);
    document.getElementById('password').addEventListener('blur', validatePassword);

    // 可以在这里添加自动 token 刷新的逻辑
    setInterval(refreshToken, 60 * 60 * 1000); // 每60分钟刷新一次 token
});

function validateEmail(e) {
    const email = e.target.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        messageManager.showError('Please enter a valid email address');
    }
}

function validatePassword(e) {
    const password = e.target.value;
    if (password.length < 8) {
        messageManager.showInfo('Password must be at least 8 characters long');
    } else {
        messageManager.showSuccess('Password length is good');
    }
}

export { auth };
