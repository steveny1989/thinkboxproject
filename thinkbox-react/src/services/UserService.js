const BASE_API_URL = 'https://api.thinkboxs.com';

class UserService {
  async syncUserToBackend(user) {
    try {
      const idToken = await user.getIdToken();
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('User synced successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to sync user data:', error);
      throw error;
    }
  }

  // 可以添加其他用户相关的方法，如获取用户信息、更新用户信息等
}

export default new UserService();