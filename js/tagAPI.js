import { auth } from './firebase.js';
import { handleApiError } from './errorHandler.js';

const BASE_API_URL = 'https://api.thinkboxs.com';

class TagAPI {
  async getTags(noteId) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/tags/notes/${noteId}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error fetching tags');
    }
  }

  async addTags(noteId, tags) {
    console.log('Adding tags:', tags, 'to note:', noteId);
    try {
      // 确保 tags 是一个数组，每个元素都是一个完整的标签字符串
      const processedTags = Array.isArray(tags) 
        ? tags.filter(tag => typeof tag === 'string' && tag.trim() !== '')
        : [tags].filter(tag => typeof tag === 'string' && tag.trim() !== '');

      const response = await fetch(`${BASE_API_URL}/tags/notes/${noteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
        },
        body: JSON.stringify({ tags: processedTags })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to add tags: ${response.status}. ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log('Tags added successfully:', result);
      return result;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  }

  async generateTags(content) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/tags/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Failed to generate tags');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error generating tags');
    }
  }

  async getAllTags() {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/tags`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch all tags');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error fetching all tags');
    }
  }
}

export default new TagAPI();