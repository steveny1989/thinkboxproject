// 导入任何需要的依赖，比如日志记录库或通知服务

export function handleApiError(error, context) {
    // 记录错误
    console.error(`API Error in ${context}:`, error);
  
    // 可以在这里添加更多的错误处理逻辑
    // 例如：发送错误到日志服务，显示用户友好的错误消息等
  
    // 如果需要，可以根据错误类型返回不同的错误消息
    if (error.name === 'NetworkError') {
      return 'Network error. Please check your internet connection.';
    } else if (error.name === 'AuthenticationError') {
      return 'Authentication failed. Please log in again.';
    }
  
    // 默认错误消息
    return 'An unexpected error occurred. Please try again later.';
  }
  
  // 可以添加更多特定类型的错误处理函数
  export function handleAuthError(error) {
    console.error('Authentication Error:', error);
    // 处理身份验证错误的特定逻辑
  }
  
  export function handleNetworkError(error) {
    console.error('Network Error:', error);
    // 处理网络错误的特定逻辑
  }
  
  // ... 可以根据需要添加更多错误处理函数