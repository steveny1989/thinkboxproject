// src/components/Login.jsx
import React, { useState } from 'react';
import authService from '../services/AuthService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await AuthService.login(email, password);
      // 登录成功后的操作，例如重定向
    } catch (error) {
      setError('登录失败，请检查邮箱和密码是否正确。');
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
      <button type="submit">登录</button>
      {error && <p>{error}</p>}
    </form>
  );
};

export default Login;