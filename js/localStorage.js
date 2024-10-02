const LOCAL_STORAGE_KEY = 'thinkbox_notes';
const LOCAL_STORAGE_TAGS_KEY = 'thinkbox_tags';

export const localStorageService = {
  saveNotes(notes) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
    }
  },

  getNotes() {
    try {
      const storedNotes = localStorage.getItem(LOCAL_STORAGE_KEY);
      return storedNotes ? JSON.parse(storedNotes) : [];
    } catch (error) {
      console.error('Error getting notes from localStorage:', error);
      return [];
    }
  },

  clearNotes() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing notes from localStorage:', error);
    }
  },

  updateNote(updatedNote) {
    try {
      const notes = this.getNotes();
      const index = notes.findIndex(note => note.note_id === updatedNote.note_id);
      if (index !== -1) {
        notes[index] = updatedNote;
        this.saveNotes(notes);
      }
    } catch (error) {
      console.error('Error updating note in localStorage:', error);
    }
  },

  deleteNote(noteId) {
    try {
      const notes = this.getNotes();
      const updatedNotes = notes.filter(note => note.note_id !== noteId);
      this.saveNotes(updatedNotes);
    } catch (error) {
      console.error('Error deleting note from localStorage:', error);
    }
  },

  saveTags(tags) {
    try {
      localStorage.setItem(LOCAL_STORAGE_TAGS_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error('Error saving tags to localStorage:', error);
    }
  },

  getTags() {
    try {
      const storedTags = localStorage.getItem(LOCAL_STORAGE_TAGS_KEY);
      return storedTags ? JSON.parse(storedTags) : [];
    } catch (error) {
      console.error('Error getting tags from localStorage:', error);
      return [];
    }
  },

  clearTags() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_TAGS_KEY);
    } catch (error) {
      console.error('Error clearing tags from localStorage:', error);
    }
  }
};