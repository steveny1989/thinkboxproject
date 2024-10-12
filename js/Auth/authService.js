// authService.js
const NEW_AUTH_API_URL = 'https://api.thinkboxs.com'; // 新系统的 API URL
console.log('API URL:', NEW_AUTH_API_URL);

export const auth = {
  currentUser: null,
  // 其他需要的属性和方法
};

export async function registerUser(userData) {
    try {
        if (!userData || typeof userData !== 'object') {
            throw new Error('Invalid user data');
        }

        if (!userData.email || typeof userData.email !== 'string') {
            throw new Error('Valid email is required');
        }

        if (!userData.password || typeof userData.password !== 'string') {
            throw new Error('Valid password is required');
        }

        // 从 email 中提取用户名
        const username = userData.email;

        const response = await fetch(`${NEW_AUTH_API_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userData.email,
                password: userData.password,
                username: username,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

export async function loginUser(email, password) {
    try {
        console.log('Attempting to login with:', email);
        const response = await fetch(`${NEW_AUTH_API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));

        const responseText = await response.text();
        console.log('Response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
        }

        try {
            const data = JSON.parse(responseText);
            console.log('Login successful, received data:', data);
            return data;
        } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError);
            throw new Error('Invalid JSON response from server');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export function logoutUser() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    // 可能还需要清除其他与用户相关的本地存储数据
    window.location.href = './html/newAuth.html';
    auth.currentUser = null; // 清除当前用户
}
