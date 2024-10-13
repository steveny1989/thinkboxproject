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
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const errorDiv = document.getElementById('registerError');

        if (!email) {
            messageManager.showError('Email is required');
            return;
        }

        if (!password) {
            messageManager.showError('Password is required');
            return;
        }

        if (password.length < 8) {
            messageManager.showError('Password must be at least 8 characters long');
            return;
        }

        let loadingMessage;
        try {
            loadingMessage = messageManager.showLoading('Registering...');
            const result = await registerUser({ email, password });
            messageManager.hide(loadingMessage);
            messageManager.showSuccess('Registration successful! Redirecting...');
            localStorage.setItem('authToken', result.token);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        } catch (error) {
            if (loadingMessage) {
                messageManager.hide(loadingMessage);
            }
            if (error.message === 'User already exists') {
                messageManager.showError('This email is already registered. Please try logging in.');
                // 可以考虑自动切换到登录表单
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginForm').scrollIntoView({ behavior: 'smooth' });
            } else {
                messageManager.showError(`Registration failed: ${error.message}`);
            }
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        if (!email) {
            messageManager.showError('Email is required');
            return;
        }

        if (!password) {
            messageManager.showError('Password is required');
            return;
        }

        try {
            const loadingMessage = messageManager.showLoading('Logging in...');
            const result = await loginUser(email, password);
            messageManager.hide(loadingMessage);
            messageManager.showSuccess('Login successful! Redirecting...');
            localStorage.setItem('authToken', result.token);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000); // 给用户2秒时间看到成功消息
        } catch (error) {
            messageManager.showError(`Login failed: ${error.message}`);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });

    // 添加输入验证
    document.getElementById('registerEmail').addEventListener('blur', validateEmail);
    document.getElementById('loginEmail').addEventListener('blur', validateEmail);
    document.getElementById('registerPassword').addEventListener('blur', validatePassword);
    document.getElementById('loginPassword').addEventListener('blur', validatePassword);

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
