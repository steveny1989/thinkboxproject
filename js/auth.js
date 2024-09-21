const INDEX_PAGE_URL = '/html/index.html'; // 定义 index.html 的路径

import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from './firebase.js';

// 用户注册函数
async function registerUser() {
    // 获取用户输入的邮箱和密码
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');

    try {
        // 使用 Firebase 认证创建新用户
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User registered:', user);

        // 获取用户的 ID 令牌
        const idToken = await user.getIdToken();

        // 将用户信息同步到后端
        const response = await fetch('https://178.128.81.19:3001/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                uid: user.uid,
                email: user.email,
                username: user.displayName || user.email.split('@')[0]
            })
        });

        // 检查同步是否成功
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', errorText);
            console.warn('Failed to sync user data after registration, but allowing process to continue');
        } else {
            const data = await response.json();
            console.log('User synced successfully after registration:', data);
        }

        // 注册成功后跳转到主页
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = error.message;
    }
}

// 用户登录函数
async function loginUser() {
    // 获取用户输入的邮箱和密码
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        // 使用 Firebase 认证登录用户
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User logged in:', user);

        // 获取用户的 ID 令牌
        const idToken = await user.getIdToken();

        // 将用户信息同步到后端
        const response = await fetch('https://178.128.81.19:3001/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                uid: user.uid,
                email: user.email,
                username: user.displayName || user.email.split('@')[0]
            })
        });

        // 检查同步是否成功
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', errorText);
            console.warn('Failed to sync user data, but allowing login to proceed');
        } else {
            const data = await response.json();
            console.log('User synced successfully:', data);
        }

        // 登录成功后跳转到主页
        window.location.href = INDEX_PAGE_URL;
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message;
    }
}

// 绑定事件处理程序
document.addEventListener('DOMContentLoaded', function() {
    const registerButton = document.getElementById('registerButton');
    const loginButton = document.getElementById('loginButton');

    // 为注册按钮绑定点击事件
    if (registerButton) {
        registerButton.addEventListener('click', registerUser);
    }

    // 为登录按钮绑定点击事件
    if (loginButton) {
        loginButton.addEventListener('click', loginUser);
    }
});

export async function signOut() {
    try {
        await auth.signOut();
        console.log('User signed out');
        // 重定向到 auth.html
        window.location.href = '../html/auth.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
}