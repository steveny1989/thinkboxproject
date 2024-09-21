// 定义 API 基础 URL
const BASE_API_URL = 'https://178.128.81.19:3001'; // 定义 API 基础 URL
// // Hugging Face API 相关设置
// const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/gpt2'; // 假设的 Huggingface API URL
// const HUGGINGFACE_API_KEY = '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'; // 你的 Huggingface API 密钥

import { auth } from './firebase.js';

const api = {
  async getNotes() {
    console.log('getNotes called');
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in');
      return [];
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_API_URL}/notes`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Failed to fetch notes: ${response.statusText}`);
    }
    return response.json();
  },

  async addNote(note) {
    console.log('API addNote called with:', note);
    const user = auth.currentUser;
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_API_URL}/notes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(note)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Failed to add note: ${response.statusText}. ${errorText}`);
    }
    return response.json();
  },

  async deleteNote(noteId) {
    console.log(`deleteNote called with id: ${noteId}`);
    const user = auth.currentUser;
    if (!user) {
      console.error('Delete attempt with no user logged in');
      throw new Error('No user logged in');
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_API_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (response.status === 200 || response.status === 404) {
      return { success: true, message: 'Note deleted successfully' };
    } else if (response.status === 204) {
      return { success: true, message: 'Note not found, may have been already deleted' };
    }
    const errorText = await response.text();
    return { success: true, message: 'Note may have been deleted, but with a warning', warning: errorText };
  },

  async searchNotes(query) {
    console.log('searchNotes called with query:', query);
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping note search');
      return [];
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_API_URL}/notes/search?query=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Failed to search notes: ${response.statusText}`);
    }
    return response.json();
  },
// //调取反馈
//   async generateFeedback(noteId, content) {
//     console.log('API generateFeedback called with:', noteId, content);
//     const user = auth.currentUser;
//     if (!user) {
//       console.error('No user logged in');
//       throw new Error('No user logged in');
//     }
//     const idToken = await user.getIdToken();
//     console.log('User ID token obtained:', idToken);

//     try {
//       // 调用 Huggingface API 获取反馈
//       console.log('Calling Huggingface API with content:', content);
//       const huggingfaceResponse = await fetch(HUGGINGFACE_API_URL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
//         },
//         body: JSON.stringify({ inputs: content }) // 确保包含 inputs 字段
//       });

//       if (!huggingfaceResponse.ok) {
//         const errorText = await huggingfaceResponse.text();
//         console.error('Huggingface API error:', errorText);
//         throw new Error(`Failed to generate feedback from Huggingface: ${huggingfaceResponse.statusText}. ${errorText}`);
//       }

//       const feedbackData = await huggingfaceResponse.json();
//       console.log('Feedback data received from Huggingface:', feedbackData);
//       const feedbackText = feedbackData[0]?.generated_text || 'No feedback generated'; // 假设 Huggingface API 返回的反馈字段名为 generated_text

//       // 将反馈存储到你的服务器
//       console.log('Storing feedback to server with noteId:', noteId, 'and feedbackText:', feedbackText);
//       const response = await fetch(`${BASE_API_URL}/notes/feedbacks`, { // 确保路径为 /notes/feedbacks
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${idToken}`
//         },
//         body: JSON.stringify({ noteId, feedbackText }) // 确保请求体格式一致
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error('API error while storing feedback:', errorText);
//         throw new Error(`Failed to store feedback: ${response.statusText}. ${errorText}`);
//       }

//       const storedFeedback = await response.json();
//       console.log('Feedback successfully stored:', storedFeedback);
//       return storedFeedback;
//     } catch (error) {
//       console.error('Error in generateFeedback:', error);
//       throw error;
//     }
//   },
// //存储反馈
//   async storeFeedback(noteId, feedbackText) {
//     console.log('API storeFeedback called with:', noteId, feedbackText);
//     const user = auth.currentUser;
//     if (!user) {
//       console.error('No user logged in');
//       throw new Error('No user logged in');
//     }
//     const idToken = await user.getIdToken();
//     const response = await fetch(`${BASE_API_URL}/notes/feedbacks`, {
//       method: 'POST',
//       headers: { 
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${idToken}`
//       },
//       body: JSON.stringify({ noteId, feedbackText })
//     });
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('API error:', errorText);
//       throw new Error(`Failed to store feedback: ${response.statusText}. ${errorText}`);
//     }
//     return response.json();
//   },

//   //调取反馈
//   async getFeedbacks() {
//     console.log('API getFeedbacks called');
//     const user = auth.currentUser;
//     if (!user) {
//       console.log('No user logged in');
//       return [];
//     }
//     const idToken = await user.getIdToken();
//     const response = await fetch(`${BASE_API_URL}/notes/feedbacks`, {
//       headers: { 'Authorization': `Bearer ${idToken}` }
//     });
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('API error:', errorText);
//       throw new Error(`Failed to fetch feedbacks: ${response.statusText}`);
//     }
//     const feedbacks = await response.json();
//     console.log('Feedbacks received from API:', feedbacks); // 添加日志
//     return feedbacks;
//   }
};

export default api;