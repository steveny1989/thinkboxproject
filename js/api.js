// 定义 API 基础 URL
const BASE_API_URL = 'https://api.thinkboxs.com'; // 移除 /api 路径

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
      console.log(`Fetching notes from: ${BASE_API_URL}/notes`);
      console.log(`Response status: ${response.status}`);
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
  },

  async tagsGenerator(content) {
    // 检查当前用户是否已登录
    const user = auth.currentUser;
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }

    try {
      // 构建标签生成请求对象
      const tagsRequest = {
        bot_id: "7419979643098628132", // 指定用于生成标签的机器人ID
        user_id: "123", // 用户ID，这里使用固定值，可能需要根据实际情况修改
        stream: false, // 不使用流式响应
        auto_save_history: true, // 自动保存对话历史
        additional_messages: [{
          role: "user", // 设置消息角色为用户
          content: `Generate tags for the following content: ${content}`, // 构建请求标签生成的提示信息
          content_type: "text" // 指定内容类型为文本
        }]
      };

      // // 打印请求体以便调试
      // console.log('Tags request body:', JSON.stringify(tagsRequest, null, 2));

      // 发送标签生成请求到 COZE API
      const tagsResponse = await fetch(`${COZE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${COZE_API_KEY}` // 使用 API 密钥进行认证
        },
        body: JSON.stringify(tagsRequest)
      });

      // 解析响应数据
      const tagsData = await tagsResponse.json();
      if (tagsData.code !== 0) {
        // 如果响应码不为0，表示请求败
        throw new Error(`Tags generation failed: ${tagsData.msg}`);
      }

      // 从响应中提取对话ID和会话ID
      const chatId = tagsData.data.id;
      const conversationId = tagsData.data.conversation_id;
      let status = "in_progress"; // 初始化状态为进行中

      // 轮询检查标签生成状态
      while (status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后再次检查
        // 发送状态检查请求
        const statusResponse = await fetch(`${COZE_API_URL}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${COZE_API_KEY}`
          }
        });

        // 解析状态响应
        const statusData = await statusResponse.json();
        if (statusData.code !== 0) {
          // 如果状态检查失败，抛出错误
          throw new Error(`Failed to retrieve tags status: ${statusData.msg}`);
        }
        status = statusData.data.status; // 更新状态
      }

      // 获取最终的标签生成结果
      const finalResponse = await fetch(`${COZE_API_URL}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`
        }
      });

      // 解析最终响应
      const finalData = await finalResponse.json();
      // console.log(finalData); // 打印最终数据以便调试
      if (finalData.code !== 0) {
        // 如果获取最终结果失败，抛出错误
        throw new Error(`Failed to retrieve final tags: ${finalData.msg}`);
      }

      // 检查是否有返回的数据
      if (finalData.data.length > 0) {
        const tagsContent = finalData.data[0].content; // 获取第一条消息的内容作为标签
        return tagsContent; // 返回生成的标签内容
      } else {
        // 如果没有找到标签内容，抛出错误
        throw new Error("No tags content found");
      }
    } catch (error) {
      // 捕获并记录任何在过程中发生的错误
      console.error('Error in tagsGenerator:', error);
      throw error; // 将错误继续向上抛出
    }
  },

  // 保存笔记的标签
  async saveTags(noteId, tags) {
    console.log(`Saving tags for note ${noteId}:`, tags); // 新增的日志
    const user = auth.currentUser;
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_API_URL}/notes/${noteId}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ tags })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Failed to save tags: ${response.statusText}`);
    }
    return response.json();
  },

  // 获取所有标签
  async getAllTags() {
    const user = auth.currentUser;
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_API_URL}/tags`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Failed to get tags: ${response.statusText}`);
    }
    return response.json();
  },

  // 获取特定笔记的标签
  async getNoteTags(noteId) {
    const user = auth.currentUser;
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_API_URL}/notes/${noteId}/tags`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Failed to get note tags: ${response.statusText}`);
    }
    return response.json();
  },

  async addTags(noteId, content) {
    console.log('API addTags called for noteId:', noteId);
    const user = auth.currentUser;
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }

    try {
      // 使用 tagsGenerator 生成标签
      const tagsContent = await this.tagsGenerator(content);
      
      // 解析生成的标签内容
      // 假设 tagsContent 是一个逗号分隔的标签字符串
      const tags = tagsContent.split(',').map(tag => tag.trim());
      
      console.log('Generated tags:', tags);

      // 获取用户的 ID 令牌
      const idToken = await user.getIdToken();

      // 发送请求到后端 API 来保存标签
      const response = await fetch(`${BASE_API_URL}/tags/notes/${noteId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ tags })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        throw new Error(`Failed to add tags: ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();
      console.log('Tags added successfully:', result);
      return result;

    } catch (error) {
      console.error('Error in addTags:', error);
      throw error;
    }
  },
};

export default api;