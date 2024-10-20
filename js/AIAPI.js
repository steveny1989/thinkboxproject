const COZE_API_URL = 'https://api.coze.cn/v3/chat';
const COZE_API_KEY = 'pat_LLh4Cpir313co8AQjZDOy1w4vvk8rsDyuEfBXmHsg3EHnveaixwUyV5uXmJQwOlM';
const JINA_API_KEY = 'jina_7d693e7cf3f3489a882cae33f1a957cc-CE2ZEhuNGJR1y2_I80ybPjDiiRC';
const siliconflow_API_KEY = 'sk-hlkffvnubygbratltvgicdiyypehpnusglwivijlpsewykho';

class AIAPI {
  async getAuthToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found');
      throw new Error('No auth token found');
    }
    return token;
  }

  async generateFeedback(content) {
    console.log('Entering AIAPI.generateFeedback', { content });
    const token = await this.getAuthToken();
    if (!token) {
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
          'Authorization': `Bearer ${token}`
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
    
      // 轮询反馈
      while (status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
        const statusResponse = await fetch(`${COZE_API_URL}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
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
          'Authorization': `Bearer ${token}`
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

  async generateTags(content) {
    console.log('AIAPI: Generating tags for content:', content);
    try {
      const token = await this.getAuthToken();
      console.log('Auth token retrieved:', token);

      if (!token) {
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
    
        // 送标签生成请求到 COZE API
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
        console.log('Received finalData:', JSON.stringify(finalData, null, 2)); // 打印最终数据以便调试
        if (finalData.code !== 0) {
          // 如果获取最终结果失败，抛出错误
          throw new Error(`Failed to retrieve final tags: ${finalData.msg}`);
        }
    
        // 检查是否有返回的数据
        if (finalData.data.length > 0) {
          const tagsContent = finalData.data[0].content; // 获取第一条消息的内容作为标签
          // 将标签内容分割成数组，并去除空白字符
          const tagsArray = tagsContent.split(',').map(tag => tag.trim()).filter(tag => tag);
          return tagsArray; // 返回标签数组
        } else {
          // 如果没有找到标签内容，抛出错误
          throw new Error("No tags content found");
        }
      } catch (error) {
        // 捕获并记录任何在过程中发生的错误
        console.error('Error in tagsGenerator:', error);
        throw error; // 将错误继续向上抛出
      }
    } catch (error) {
      console.error('Error in generateTags:', error);
      // 不使用handleApiError，而是直���处理错误
      return []; // 返回空数组而不是抛出错误
    }
  }

  async generateComments(content) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        console.error('No user logged in');
        throw new Error('No user logged in');
      }
    
      try {
        // 构建评论生成请求对象
        const commentsRequest = {
          bot_id: "7421237310903828490", // 指定用于生成评论的机器人ID
          user_id: "123", // 用户ID，这里使用固定值，可能需要根据实际情况修改
          stream: false, // 不使用流式响应
          auto_save_history: true, // 自动保存对话历史
          additional_messages: [{
            role: "user", // 设置消息角色为用户
            content: `Generate only one comment for the following content: ${content}`, // 构建请求评论生成的提示信息
            content_type: "text" // 指定内容类型为文本
          }]
        };
    
        // 发送评论生成请求到 COZE API
        const commentsResponse = await fetch(`${COZE_API_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${COZE_API_KEY}` // 使用 API 密钥进行认证
          },
          body: JSON.stringify(commentsRequest)
        });
    
        // 解析响应数据
        const commentsData = await commentsResponse.json();
        if (commentsData.code !== 0) {
          // 果响应码不为0，表示请求失败
          throw new Error(`Comments generation failed: ${commentsData.msg}`);
        }
    
        // 从响应中提取对话ID和会话ID
        const chatId = commentsData.data.id;
        const conversationId = commentsData.data.conversation_id;
        let status = "in_progress"; // 初始化状态为进中
    
        // 轮询检查评论生成状态
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
            throw new Error(`Failed to retrieve comments status: ${statusData.msg}`);
          }
          status = statusData.data.status; // 更新状态
        }
    
        // 获取最终的评论生成结果
        const finalResponse = await fetch(`${COZE_API_URL}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${COZE_API_KEY}`
          }
        });
    
        // 解析最终响应
        const finalData = await finalResponse.json();
        if (finalData.code !== 0) {
          // 如果获取最终结果失败，抛出错误
          throw new Error(`Failed to retrieve final comments: ${finalData.msg}`);
        }
    
        // 检查是否有返回的数据
        if (finalData.data.length > 0) {
          const commentsContent = finalData.data[0].content; // 获取第一条消息的内容作为评论
          return commentsContent; // 返回生成的评论内容
        } else {
          // 如果没有找到评论内容，抛出错误
          throw new Error("No comments content found");
        }
      } catch (error) {
        // 捕获并记录任何在过程中发生的错误
        console.error('Error in commentsGenerator:', error);
        throw error; // 将错误继续向上抛出
      }
    } catch (error) {
      handleApiError(error, 'Error in commentsGenerator');
    }
  }

  async tagsCommentor(tags) {
    const token = await this.getAuthToken();
    if (!token) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    
    try {
      const tagsCommentRequest = {
        bot_id: "7422507897416417331", // 请替换为专用于标签分析的机器人ID
        user_id: "123",
        stream: false,
        auto_save_history: true,
        additional_messages: [{
          role: "user",
          content: `Analyze the following tags and provide feedback and suggestions: ${tags.join(', ')}`,
          content_type: "text"
        }]
      };
    
      const commentResponse = await fetch(`${COZE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${COZE_API_KEY}`
        },
        body: JSON.stringify(tagsCommentRequest)
      });
    
      const commentData = await commentResponse.json();
      if (commentData.code !== 0) {
        throw new Error(`Tags analysis failed: ${commentData.msg}`);
      }
    
      const chatId = commentData.data.id;
      const conversationId = commentData.data.conversation_id;
      let status = "in_progress";
    
      while (status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`${COZE_API_URL}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${COZE_API_KEY}`
          }
        });
    
        const statusData = await statusResponse.json();
        if (statusData.code !== 0) {
          throw new Error(`Failed to retrieve tags analysis status: ${statusData.msg}`);
        }
        status = statusData.data.status;
      }
    
      const finalResponse = await fetch(`${COZE_API_URL}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`
        }
      });
    
      const finalData = await finalResponse.json();
      if (finalData.code !== 0) {
        throw new Error(`Failed to retrieve final tags analysis: ${finalData.msg}`);
      }
    
      if (finalData.data.length > 0) {
        const analysisContent = finalData.data[0].content;
        return analysisContent;
      } else {
        throw new Error("No tags analysis content found");
      }
    } catch (error) {
      console.error('Error in tagsCommentor:', error);
      throw error;
    }
  }

  async fetchWebContent(url) {
    console.log('Fetching web content for URL:', url);
    const token = await this.getAuthToken();
    if (!token) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }

    try {
      const readerUrl = `https://r.jina.ai/${url}`;
      
      console.log('Sending request to:', readerUrl);
      const response = await fetch(readerUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`Web content fetching failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const content = await response.text();
      console.log('Fetched content (first 200 chars):', content.substring(0, 200));
      return content;
    } catch (error) {
      console.error('Error in fetchWebContent:', error);
      throw error;
    }
  }

  async rewriteContent(content) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        console.error('No user logged in');
        throw new Error('No user logged in');
      }
    
      try {
        const rewriteRequest = {
          bot_id: "7422650152651472907", // 请替换为专门用于改写的机器人ID
          user_id: "123",
          stream: false,
          auto_save_history: true,
          additional_messages: [{
            role: "user",
            content: `请改写以下内容，保持原意的同时使用不同的表达方式：\n\n${content}`,
            content_type: "text"
          }]
        };
    
        console.log('Sending rewrite request:', JSON.stringify(rewriteRequest, null, 2));
    
        const response = await fetch(`${COZE_API_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${COZE_API_KEY}`
          },
          body: JSON.stringify(rewriteRequest)
        });
    
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
    
        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Error response body:', errorBody);
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }
    
        const data = await response.json();
        console.log('Rewrite API response:', data);
    
        if (data.code !== 0) {
          throw new Error(`Rewrite failed: ${data.msg}`);
        }
    
        const chatId = data.data.id;
        const conversationId = data.data.conversation_id;
        let status = "in_progress";
    
        while (status === "in_progress") {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const statusResponse = await fetch(`${COZE_API_URL}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
            headers: {
              'Authorization': `Bearer ${COZE_API_KEY}`
            }
          });
    
          const statusData = await statusResponse.json();
          if (statusData.code !== 0) {
            throw new Error(`Failed to retrieve rewrite status: ${statusData.msg}`);
          }
          status = statusData.data.status;
        }
    
        const finalResponse = await fetch(`${COZE_API_URL}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${COZE_API_KEY}`
          }
        });
    
        const finalData = await finalResponse.json();
        if (finalData.code !== 0) {
          throw new Error(`Failed to retrieve final rewrite: ${finalData.msg}`);
        }
    
        if (finalData.data.length > 0) {
          const rewrittenContent = finalData.data[0].content;
          return rewrittenContent;
        } else {
          throw new Error("No rewritten content found");
        }
      } catch (error) {
        console.error('Error in rewriteContent:', error);
        throw error;
      }
    } catch (error) {
      handleApiError(error, 'Error in rewriteContent');
    }
  }

  async completeUserInput(partialInput) {
    console.log('Entering AIAPI.completeUserInput', { partialInput });
    const token = await this.getAuthToken();
    if (!token) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    
    try {
      const completionRequest = {
        bot_id: "7422904350227316751", // 使用适合文本补全的机器人 ID
        user_id: "123",
        stream: false,
        auto_save_history: true,
        additional_messages: [{
          role: "user",
          content: `Complete the following text: ${partialInput}`,
          content_type: "text"
        }]
      };
    
      console.log('Completion request body:', JSON.stringify(completionRequest, null, 2));
    
      const completionResponse = await fetch(`${COZE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${COZE_API_KEY}`
        },
        body: JSON.stringify(completionRequest)
      });
    
      const completionData = await completionResponse.json();
      if (completionData.code !== 0) {
        throw new Error(`Completion generation failed: ${completionData.msg}`);
      }
    
      const chatId = completionData.data.id;
      const conversationId = completionData.data.conversation_id;
      let status = "in_progress";
    
      while (status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`${COZE_API_URL}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${COZE_API_KEY}`
          }
        });
    
        const statusData = await statusResponse.json();
        if (statusData.code !== 0) {
          throw new Error(`Failed to retrieve completion status: ${statusData.msg}`);
        }
        status = statusData.data.status;
      }
    
      const finalResponse = await fetch(`${COZE_API_URL}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`
        }
      });
    
      const finalData = await finalResponse.json();
      if (finalData.code !== 0) {
        throw new Error(`Failed to retrieve final completion: ${finalData.msg}`);
      }
    
      if (finalData.data.length > 0) {
        const completionContent = finalData.data[0].content;
        return completionContent;
      } else {
        throw new Error("No completion content found");
      }
    } catch (error) {
      console.error('Error in completeUserInput:', error);
      throw error;
    }
  }

  async clusterTags(tags) {
    const token = await this.getAuthToken();
    if (!token) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    
    //console.log('AIAPI.clusterTags called with:', tags);
    
    try {
      const tagsClusterRequest = {
        bot_id: "7427310689368227851", // 使用与 tagsCommentor 相同的机器人 ID，或者替换为专门用于标签聚类的机器人 ID
        user_id: "123",
        stream: false,
        auto_save_history: true,
        additional_messages: [{
          role: "user",
          content: `Please cluster the following tags into groups of similar meanings. For each group, provide a parent tag that represents the group. Format the output as JSON. Tags: ${tags.join(', ')}`,
          content_type: "text"
        }]
      };
    
      const clusterResponse = await fetch(`${COZE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${COZE_API_KEY}`
        },
        body: JSON.stringify(tagsClusterRequest)
      });
    
      const clusterData = await clusterResponse.json();
      if (clusterData.code !== 0) {
        throw new Error(`Tags clustering failed: ${clusterData.msg}`);
      }
    
      const chatId = clusterData.data.id;
      const conversationId = clusterData.data.conversation_id;
      let status = "in_progress";
    
      while (status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`${COZE_API_URL}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${COZE_API_KEY}`
          }
        });
    
        const statusData = await statusResponse.json();
        if (statusData.code !== 0) {
          throw new Error(`Failed to retrieve tags clustering status: ${statusData.msg}`);
        }
        status = statusData.data.status;
      }
    
      const finalResponse = await fetch(`${COZE_API_URL}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`
        }
      });
    
      const finalData = await finalResponse.json();
      if (finalData.code !== 0) {
        throw new Error(`Failed to retrieve final tags clusters: ${finalData.msg}`);
      }
    
      if (finalData.data.length > 0) {
        const clusterContent = finalData.data[0].content;
        console.log('Raw cluster content:', clusterContent);
        return clusterContent; // 直接��回原始内容，不进行 JSON 解析
      } else {
        throw new Error("No tags cluster content found");
      }
    } catch (error) {
      console.error('Error in clusterTags:', error);
      throw error;
    }
  }

  async siliconflow_clusterTags(tags) {
    console.log('Original tags for clustering:', tags);
  
    if (!Array.isArray(tags) || tags.length === 0) {
      console.error('Invalid tags input:', tags);
      throw new Error('Invalid tags data');
    }
  
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${siliconflow_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        //model:"01-ai/Yi-1.5-9B-Chat-16K",
        messages: [
          {
            role: "system",
            content: "你是一个标签聚类专家。你的任务是将给定的标签分组到合适的类别中。每个类别应该有一个描述性的名称。"
          },
          {
            role: "user",
            content: `请按以下步骤处理这些标签：
  1. 只给结论，不要太多介绍。仔细分析所有标签。
  2. 根据标签的语义相似性将它们分组。
  3. 为每个组创建一个描述性的类别名称。
  4. 返回一个结构化的结果，其中包含类别名称和属于该类别的标签。数量庞大的情况下，可以考虑减少重复的标签。
  5. 给出每个大类的名称和包含的主要 tags。回复示例：

    category
    tag1, tag2, tag3...
  
  标签：${tags.join(', ')}`
          }
        ],
        stream: false,
        max_tokens: 2048,
        temperature: 0.3,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        n: 1
      })
    };
  
    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Full API response:', JSON.stringify(data, null, 2));
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        let content = data.choices[0].message.content.trim();
        console.log('Raw clustered content:', content);
        
        // 直接返回原始内容，不进行解析
        return content;
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error in clusterTags:', error);
      throw error;
    }
  }

}


export default new AIAPI();
