// 定义 API 基础 URL
const BASE_API_URL = 'https://thinkboxs.com:3001'; // 定义 API 基础 URL

const COZE_API_URL = 'https://api.coze.cn/v3/chat'; // 更新为聊天 API 的 URL
const COZE_API_KEY = 'pat_7ds29bjXUQ2MU6iXoKCM00yz6n9mif4UPHvsdZp2zSQN4vMQoNx1rBOEKLcb8qxX'; // 替换为你的 API 访问令牌


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

  async generateFeedback(content) {
    const user = auth.currentUser;
    if (!user) {
        console.error('No user logged in');
        throw new Error('No user logged in');
    }

    try {
        const feedbackRequest = {
            bot_id: "7417280351762300940", // 确保这个值是有效的
            user_id: "123",
            stream: false,
            auto_save_history: true,
            additional_messages: [{
                role: "user",
                content: content,
                content_type: "text"
            }]
        };

        console.log('Feedback request body:', JSON.stringify(feedbackRequest, null, 2));

        const feedbackResponse = await fetch(`${COZE_API_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${COZE_API_KEY}`
            },
            body: JSON.stringify(feedbackRequest)
        });

        const feedbackData = await feedbackResponse.json();
        if (feedbackData.code !== 0) {
            throw new Error(`Feedback generation failed: ${feedbackData.msg}`);
        }

        const chatId = feedbackData.data.id; // 获取 chat_id
        const conversationId = feedbackData.data.conversation_id; // 获取 conversation_id
        let status = "in_progress";

        // 轮询反馈状态
        while (status === "in_progress") {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
            const statusResponse = await fetch(`${COZE_API_URL}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${COZE_API_KEY}`
                }
            });

            const statusData = await statusResponse.json();
            if (statusData.code !== 0) {
                throw new Error(`Failed to retrieve feedback status: ${statusData.msg}`);
            }
            status = statusData.data.status; // 更新状态
        }

        // 获取最终的模型回复
        const finalResponse = await fetch(`${COZE_API_URL}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${COZE_API_KEY}`
            }
        });

        const finalData = await finalResponse.json();
        console.log(finalData);
        if (finalData.code !== 0) {
            throw new Error(`Failed to retrieve final feedback: ${finalData.msg}`);
        }


// 使用第一个有效的反馈
if (finalData.data.length > 0) {
  const feedbackContent = finalData.data[0].content; // 选择第一个反馈内容
  return feedbackContent; // 返回最终的反馈内容
} else {
  throw new Error("No feedback content found");
}
        
    } catch (error) {
        console.error('Error in generateFeedback:', error);
        throw error;
    }
}


};

export default api;