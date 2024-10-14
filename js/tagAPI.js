import { handleApiError } from './errorHandler.js';

class TagAPI {
  constructor() {
    this.baseUrl = 'https://api.thinkboxs.com';
  }

  async getAuthToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found in localStorage');
      throw new Error('No auth token found');
    }
    // console.log('Current auth token:', token);
    return token;
  }

  async getTags(noteId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/tags/notes/${noteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error fetching tags');
    }
  }

  async addTags(noteId, tags) {
    try {
      const token = await this.getAuthToken();
      const processedTags = Array.isArray(tags) 
        ? tags.filter(tag => typeof tag === 'string' && tag.trim() !== '')
        : [tags].filter(tag => typeof tag === 'string' && tag.trim() !== '');

      const response = await fetch(`${this.baseUrl}/tags/notes/${noteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
      handleApiError(error, 'Error adding tags');
    }
  }

  async generateTags(content) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/tags/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) {
        console.error('Failed to generate tags. Status:', response.status);
        console.error('Response:', await response.text());
        throw new Error(`Failed to generate tags. Status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error in generateTags:', error);
      throw error;
    }
  }

  async getAllTags() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch all tags');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error fetching all tags');
    }
  }

  async deleteTags(noteId, tags) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/tags/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tags })
      });
      if (!response.ok) throw new Error('Failed to delete tags');
      return { success: true, message: 'Tags deleted successfully' };
    } catch (error) {
      handleApiError(error, 'Error deleting tags');
    }
  }

  async searchTags(query) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/tags/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to search tags');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error searching tags');
    }
  }
}

export default new TagAPI();
