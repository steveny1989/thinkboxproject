import { auth } from './firebase.js';

const COZE_API_URL = 'https://api.coze.cn/v3/chat';
const COZE_API_KEY = 'pat_7ds29bjXUQ2MU6iXoKCM00yz6n9mif4UPHvsdZp2zSQN4vMQoNx1rBOEKLcb8qxX';
const JINA_API_KEY = 'jina_7d693e7cf3f3489a882cae33f1a957cc-CE2ZEhuNGJR1y2_I80ybPjDiiRC';

class AIAPI {

    async generateFeedback(content) {
        console.log('Entering AIAPI.generateFeedback', { content });
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

      async generateTags(content) {
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
      }

      async generateComments(content) {
        // 检查当前用户是否已登录
        const user = auth.currentUser;
        if (!user) {
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
            // 如果响应码不为0，表示请求失败
            throw new Error(`Comments generation failed: ${commentsData.msg}`);
          }
      
          // 从响应中提取对话ID和会话ID
          const chatId = commentsData.data.id;
          const conversationId = commentsData.data.conversation_id;
          let status = "in_progress"; // 初始化状态为进行中
      
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
      }

      async tagsCommentor(tags) {
        const user = auth.currentUser;
        if (!user) {
          console.error('No user logged in');
          throw new Error('No user logged in');
        }
    
        try {
          const tagsCommentRequest = {
            bot_id: "7422507897416417331", // 请替换为专门用于标签分析的机器人ID
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
        const user = auth.currentUser;
        if (!user) {
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
        const user = auth.currentUser;
        if (!user) {
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
      }

      async completeUserInput(partialInput) {
        console.log('Entering AIAPI.completeUserInput', { partialInput });
        const user = auth.currentUser;
        if (!user) {
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

}

export default new AIAPI();