// authService.js
const NEW_AUTH_API_URL = 'https://api.thinkboxs.com'; // 新系统的 API URL
// console.log('API URL:', NEW_AUTH_API_URL);

export const auth = {
  currentUser: null,

  getCurrentUser: async () => {
    console.log('getCurrentUser called');
    console.log('Current auth.currentUser:', auth.currentUser);
    if (auth.currentUser && auth.currentUser.email) {
      console.log('Returning existing currentUser');
      return auth.currentUser;
    }
    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('userEmail');
    console.log('Token from localStorage:', token);
    console.log('Email from localStorage:', email);
    if (token && email) {
      console.log('Creating new currentUser object');
      auth.currentUser = { email };
      return auth.currentUser;
    }
    console.log('No user information found');
    auth.currentUser = null;
    return null;
  }
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
            
            // 设置 localStorage 和 auth.currentUser
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userEmail', email);
            auth.currentUser = { email: email };
            
            console.log('Updated auth.currentUser:', auth.currentUser);
            
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

export async function logoutUser() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('No token found, user already logged out');
            return { success: true };
        }

        // 向服务器发送登出请求
        try {
            const response = await fetch(`${NEW_AUTH_API_URL}/users/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn('Server-side logout failed:', response.statusText);
            }
        } catch (serverError) {
            console.error('Error during server-side logout:', serverError);
            // 即使服务器端登出失败，我们仍然继续客户端的登出过程
        }

        // 清除本地存储
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');

        // 重置 auth.currentUser
        auth.currentUser = null;

        console.log('User logged out, auth.currentUser:', auth.currentUser);

        // 如果需要，这里可以添加向服务器发送登出请求的逻辑

        window.location.href = '/html/newAuth.html';


        // 返回成功状态
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}
