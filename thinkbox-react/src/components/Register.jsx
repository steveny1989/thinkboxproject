import React, { useState } from 'react';
import authService from '../services/AuthService';
import userService from '../services/UserService';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await authService.register(email, password);
      console.log('Registration successful', user);
      
      // 尝试同步用户信息到后端
      try {
        await userService.syncUserToBackend(user);
      } catch (syncError) {
        console.warn('Failed to sync user data, but registration was successful:', syncError);
        // 可以选择是否向用户显示同步失败的消息
      }

      // 处理成功注册，例如重定向到主页
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('该邮箱已被注册，请使用其他邮箱或直接登录。');
      } else if (error.code === 'auth/weak-password') {
        setError('密码强度不够，请使用更复杂的密码。');
      } else if (error.code === 'auth/invalid-email') {
        setError('无效的邮箱地址，请检查并重新输入。');
      } else {
        setError('注册失败，请重试。');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">注册</button>
      {error && <p style={{color: 'red'}}>{error}</p>}
    </form>
  );
};

export default Register;