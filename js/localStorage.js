const LOCAL_STORAGE_KEY = 'thinkbox_notes';
const LOCAL_STORAGE_TAGS_KEY = 'thinkbox_tags';
const TEMP_TO_SERVER_NOTE_MAP_KEY = 'thinkbox_temp_to_server_note_map';

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

  saveNote(note) {
    try {
      const notes = this.getNotes();
      notes.unshift(note);
      this.saveNotes(notes);
      if (note.tags) {
        this.saveTagsForNote(note.note_id, note.tags);
      }
    } catch (error) {
      console.error('Error saving new note to localStorage:', error);
    }
  },

  updateNote(updatedNote) {
    try {
      const notes = this.getNotes();
      const index = notes.findIndex(note => 
        note.note_id === updatedNote.note_id || note.note_id === `temp-${updatedNote.note_id}`
      );
      if (index !== -1) {
        notes[index] = updatedNote;
        this.saveNotes(notes);
        if (updatedNote.tags) {
          this.saveTagsForNote(updatedNote.note_id, updatedNote.tags);
        }
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
      
      const allTags = this.getTags();
      delete allTags[noteId];
      this.saveTags(allTags);
    } catch (error) {
      console.error('Error deleting note from localStorage:', error);
    }
  },

  saveTags(tags) {
    try {
      localStorage.setItem(LOCAL_STORAGE_TAGS_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error('Error saving all tags to localStorage:', error);
    }
  },

  getTags() {
    try {
      const storedTags = localStorage.getItem(LOCAL_STORAGE_TAGS_KEY);
      return storedTags ? JSON.parse(storedTags) : {};
    } catch (error) {
      console.error('Error getting all tags from localStorage:', error);
      return {};
    }
  },

  clearTags() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_TAGS_KEY);
    } catch (error) {
      console.error('Error clearing tags from localStorage:', error);
    }
  },

  saveTagsForNote(noteId, tags) {
    try {
      const allTags = this.getTags();
      allTags[noteId] = tags;
      localStorage.setItem(LOCAL_STORAGE_TAGS_KEY, JSON.stringify(allTags));
    } catch (error) {
      console.error('Error saving tags for note to localStorage:', error);
    }
  },

  getTagsForNote(noteId) {
    try {
      const allTags = this.getTags();
      return allTags[noteId] || [];
    } catch (error) {
      console.error('Error getting tags for note from localStorage:', error);
      return [];
    }
  },

  saveTempToServerNoteMap(map) {
    try {
      localStorage.setItem(TEMP_TO_SERVER_NOTE_MAP_KEY, JSON.stringify(Array.from(map.entries())));
    } catch (error) {
      console.error('Error saving temp to server note map to localStorage:', error);
    }
  },

  getTempToServerNoteMap() {
    try {
      const mapData = localStorage.getItem(TEMP_TO_SERVER_NOTE_MAP_KEY);
      return mapData ? new Map(JSON.parse(mapData)) : new Map();
    } catch (error) {
      console.error('Error getting temp to server note map from localStorage:', error);
      return new Map();
    }
  }
};