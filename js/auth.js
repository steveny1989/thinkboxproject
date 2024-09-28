const INDEX_PAGE_URL = '../index.html'; // 定义 index.html 的路径
const BASE_API_URL = 'https://api.thinkboxs.com';

import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from './firebase.js';

// 添加这些函数
function showLoading() {
    console.log('showLoading called');
    document.getElementById('loading-indicator').classList.remove('hidden');
}

function hideLoading() {
    console.log('hideLoading called');
    document.getElementById('loading-indicator').classList.add('hidden');
}

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
        alert('注册成功！请登录。');

        // 获取用户的 ID 令牌
        showLoading();
        const idToken = await user.getIdToken();

        // 将用户信息同步到后端
        const response = await fetch(`${BASE_API_URL}/users`, {
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
        window.location.href = INDEX_PAGE_URL;
    } catch (error) {
        console.error('Registration error:', error);
        
        // 根据错误类型显示不同的错误消息
        let errorMessage = '注册失败，请重试。';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = '该邮箱已被注册，请使用其他邮箱或直接登录。';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = '密码强度不够，请使用更复杂的密码。';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '无效的邮箱地址，请检查并重新输入。';
        }

        alert(errorMessage);
        errorDiv.textContent = errorMessage;
    } finally {
        hideLoading();
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
        alert('认证成功！请登录。');

        // 获取用户的 ID 令牌
        showLoading();
        const idToken = await user.getIdToken();

        // 将用户信息同步到后端
        const response = await fetch(`${BASE_API_URL}/users`, {
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
        alert('登录失败，请检查邮箱和密码是否正确。');
        errorDiv.textContent = error.message;
    } finally {
        hideLoading();
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

    // 为录按钮绑定点击事件
    if (loginButton) {
        loginButton.addEventListener('click', loginUser);
    }
});

// 修改 signOut 函数
export async function signOut() {
    showLoading();
    try {
        await auth.signOut();
        console.log('User signed out');
        // 重定向到 auth.html
        window.location.href = './html/auth.html';
    } catch (error) {
        console.error('Error signing out:', error);
    } finally {
        hideLoading();
    }
}

// 如果需要在其他文件中使用这些函数，可以导出它们
export { showLoading, hideLoading };

document.addEventListener('DOMContentLoaded', () => {
    hideLoading();
});