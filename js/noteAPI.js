import { auth } from './firebase.js';
import { handleApiError } from './errorHandler.js';

const BASE_API_URL = 'https://api.thinkboxs.com';

class NoteAPI {
  async getNotes() {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/notes`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error fetching notes');
    }
  }

  async addNote(note) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/notes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(note)
      });
      if (!response.ok) throw new Error('Failed to add note');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error adding note');
    }
  }

  async deleteNote(noteId) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!response.ok) throw new Error('Failed to delete note');
      return { success: true, message: 'Note deleted successfully' };
    } catch (error) {
      handleApiError(error, 'Error deleting note');
    }
  }

  async searchNotes(query) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/notes/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!response.ok) throw new Error('Failed to search notes');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error searching notes');
    }
  }

  async generateFeedback(content) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${BASE_API_URL}/notes/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Failed to generate feedback');
      return response.json();
    } catch (error) {
      handleApiError(error, 'Error generating feedback');
    }
  }
}

export default new NoteAPI();