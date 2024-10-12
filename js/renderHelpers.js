export default {
    renderTags(tags) {
      if (!tags || tags.length === 0) {
        return '<span class="tag loading">Loading tags...</span>';
      }
      
      if (Array.isArray(tags)) {
        if (tags[0] && typeof tags[0].name === 'string') {
          // 如果是对象数组，每个对象有 name 属性
          return tags.map(tag => `<span class="tag">${tag.name.trim()}</span>`).join('');
        } else {
          // 如果是字符串数组
          return tags.map(tag => `<span class="tag">${tag.trim()}</span>`).join('');
        }
      }
      
      if (typeof tags === 'string') {
        // 如果是逗号分隔的字符串
        return tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('');
      }
      
      console.error('Invalid tags data:', tags);
      return '<span class="error-tags">Error loading tags</span>';
    },
  
    renderComments(comments) {
      if (!comments) {
        console.log('No comments to render');
        return '';
      }
  
      const commentsArray = Array.isArray(comments) ? comments : [comments];
  
      return commentsArray.map(comment => {
        console.log('Rendering comment:', comment);
        const author = comment.author || 'Anonymous';
        const avatarLetter = (author.charAt(0) || 'A').toUpperCase();
        const timestamp = comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'Unknown time';
        const content = comment.content || 'No content';
  
        return `
          <div class="comment-card">
            <div class="comment-avatar">${avatarLetter}</div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author">${author}</span>
                <span class="comment-timestamp">${timestamp}</span>
              </div>
              <div class="comment-content">${content}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  };
