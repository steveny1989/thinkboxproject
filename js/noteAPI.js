import { handleApiError } from './errorHandler.js';

class NoteAPI {
  constructor() {
    this.baseUrl = 'https://api.thinkboxs.com';
  }

  async getAuthToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found in localStorage');
      throw new Error('No auth token found');
    }
    console.log('Current auth token:', token); // 添加这行来检查令牌
    return token;
  }

  async getNotes() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error fetching notes');
    }
  }

  async addNote(note) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/notes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(note)
      });
      if (!response.ok) throw new Error('Failed to add note');
      const data = await response.json();
      console.log('Server response for addNote:', data);
      
      // 返回一个标准化的笔记对象，确保键名一致
      return {
        note_id: data.noteId, // 使用服务器返回的 noteId
        content: note.content,
        created_at: new Date().toISOString(),
        user_uuid: data.user_uuid || undefined // 如果服务器没有返回 user_uuid，则设为 undefined
      };
    } catch (error) {
      console.error('Error in addNote API call:', error);
      throw error;
    }
  }

  async deleteNote(noteId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete note');
      return { success: true, message: 'Note deleted successfully' };
    } catch (error) {
      handleApiError(error, 'Error deleting note');
    }
  }

  async searchNotes(query) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/notes/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to search notes');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error searching notes');
    }
  }

  async generateFeedback(content) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/notes/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Failed to generate feedback');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error generating feedback');
    }
  }

  async addComments(noteId, comments) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/notes/${noteId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comments })
      });
      if (!response.ok) throw new Error('Failed to add comments');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error adding comments');
    }
  }

  async getPaginatedNotes(limit = 24, offset = 0) {
    try {
      const token = await this.getAuthToken();
      const url = `${this.baseUrl}/notes?limit=${limit}&offset=${offset}`;
      console.log('Fetching notes from URL:', url);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error('Failed to fetch notes. Status:', response.status);
        console.error('Response:', await response.text());
        throw new Error(`Failed to fetch notes. Status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error in getPaginatedNotes:', error);
      throw error;
    }
  }
}

export default new NoteAPI();
