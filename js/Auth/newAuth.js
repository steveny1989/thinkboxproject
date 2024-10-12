import { auth, registerUser, loginUser } from './authService.js';

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

    registerForm.addEventListener('submit', async (event) => {
        console.log('Register form submitted');
        event.preventDefault();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const errorDiv = document.getElementById('registerError');

        if (!email) {
            errorDiv.textContent = 'Email is required';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (!password) {
            errorDiv.textContent = 'Password is required';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            console.log('Attempting to register with:', { email, password });
            const data = await registerUser({ email, password });
            localStorage.setItem('authToken', data.token);
            window.location.href = '../index.html'; // 注册成功后跳转
        } catch (error) {
            console.error('Registration error:', error);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });

    loginForm.addEventListener('submit', async (event) => {
        console.log('Login form submitted');
        event.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const data = await loginUser(email, password);
            localStorage.setItem('authToken', data.token);
            window.location.href = '../index.html'; // 登录成功后跳转
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });

    // 可以在这里添加自动 token 刷新的逻辑
    setInterval(refreshToken, 15 * 60 * 1000); // 每15分钟刷新一次 token
});

export { auth };
