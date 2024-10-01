// src/services/api.js

// import { auth } from '../firebase';

const BASE_API_URL = 'https://api.thinkboxs.com';

class Api {
  constructor() {
    this.baseUrl = BASE_API_URL;
  }

  async getAuthHeaders() {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    const idToken = await user.getIdToken();
    return { 'Authorization': `Bearer ${idToken}` };
  }

  async fetchWithAuth(endpoint, options = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  }

  async getNotes() {
    return this.fetchWithAuth('/notes');
  }

  async addNote(note) {
    return this.fetchWithAuth('/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
  }

  async deleteNote(noteId) {
    return this.fetchWithAuth(`/notes/${noteId}`, { method: 'DELETE' });
  }

  async updateNote(noteId, updates) {
    return this.fetchWithAuth(`/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  }

  // 添加新的方法，如获取标签、添加标签等
  async getTags(noteId) {
    return this.fetchWithAuth(`/notes/${noteId}/tags`);
  }

  async addTags(noteId, tags) {
    return this.fetchWithAuth(`/notes/${noteId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags })
    });
  }
}
const api = new Api();
export default api;