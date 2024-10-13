// 消息类型枚举
export const MessageType = {
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
    INFO: 'info'
  };
  
  // 消息管理器类
  export class MessageManager {
    constructor() {
      this.container = document.createElement('div');
      this.container.id = 'message-container';
      this.container.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
      `;
      document.body.appendChild(this.container);
    }

    show(message, type = MessageType.INFO, duration = 3000) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${type}`;
      messageElement.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 12px; // 增加圆角
        color: white;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-size: 14px;
        display: flex;
        align-items: center;
        transform: translateY(10px);
      `;

      switch (type) {
        case MessageType.LOADING:
          messageElement.style.backgroundColor = '#007bff'; // 
          messageElement.style.color = '#ffffff'; // 确保文字颜色为白色，以提高可读性
          break;
        case MessageType.ERROR:
          messageElement.style.backgroundColor = '#dc3545';
          break;
        case MessageType.SUCCESS:
          messageElement.style.backgroundColor = '#28a745';
          break;
        case MessageType.INFO:
          messageElement.style.backgroundColor = '#17a2b8';
          break;
      }

      if (type === MessageType.LOADING) {
        const textContent = message.replace(/\.+$/, '').trim();
        const textSpan = document.createElement('span');
        textSpan.textContent = textContent + ' ';
        const dotsSpan = document.createElement('span');
        dotsSpan.className = 'loading-dots';
        messageElement.appendChild(textSpan);
        messageElement.appendChild(dotsSpan);
      } else {
        messageElement.textContent = message;
      }

      this.container.appendChild(messageElement);

      // 触发重排后淡入显示
      setTimeout(() => {
        messageElement.style.opacity = '1';
      }, 10);

      if (type !== MessageType.LOADING) {
        setTimeout(() => this.hide(messageElement), duration);
      }

      return messageElement;
    }

    hide(messageElement) {
      messageElement.style.opacity = '0';
      setTimeout(() => {
        if (messageElement.parentNode === this.container) {
          this.container.removeChild(messageElement);
        }
      }, 300); // 等待淡出动画完成
    }

    showLoading(message = 'Loading') {
      return this.show(message, MessageType.LOADING);
    }

    showError(message) {
      return this.show(message, MessageType.ERROR);
    }

    showSuccess(message) {
      return this.show(message, MessageType.SUCCESS);
    }

    showInfo(message) {
      return this.show(message, MessageType.INFO);
    }
  }
  
  // 创建全局消息管理器实例
  export const messageManager = new MessageManager();
  
  // 辅助函数
  export function showLoadingIndicator(message = 'Loading...') {
    return messageManager.showLoading(message);
  }
  
  export function hideLoadingIndicator(loadingElement) {
    if (loadingElement) {
      messageManager.hide(loadingElement);
    } else {
      // 如果没有提供特定的 loadingElement，隐藏所有加载指示器
      const loadingMessages = document.querySelectorAll('.message.loading');
      loadingMessages.forEach(element => messageManager.hide(element));
    }
  }
  
  export function showAllNotesLoadedMessage() {
    messageManager.showInfo("You've reached the end of your notes");
  }
  
  export function showErrorMessage(message) {
    messageManager.showError(message);
  }
  
  export function showSuccessMessage(message) {
    messageManager.showSuccess(message);
  }
  
  // 修改全局样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loadingDots {
      0%, 33% {
        content: '.';
      }
      34%, 66% {
        content: '..';
      }
      67%, 100% {
        content: '...';
      }
    }

    .loading-dots::after {
      content: '';
      animation: loadingDots 1.5s infinite;
    }
  `;
  document.head.appendChild(style);
