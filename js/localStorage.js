const LOCAL_STORAGE_KEY = 'thinkbox_notes';
const LOCAL_STORAGE_TAGS_KEY = 'thinkbox_tags';
const TEMP_TO_SERVER_NOTE_MAP_KEY = 'thinkbox_temp_to_server_note_map';
const TRENDING_TAGS_CACHE_KEY = 'thinkbox_trending_tags_cache';
const TRENDING_TAGS_ANALYSIS_CACHE_KEY = 'thinkbox_trending_tags_analysis_cache';
const CACHE_EXPIRATION_KEY = 'thinkbox_cache_expiration';

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
    const mapString = localStorage.getItem(TEMP_TO_SERVER_NOTE_MAP_KEY);
    // console.log('Raw localStorage tempToServerNoteMap:', mapString);
    if (!mapString) return null;
    try {
      const parsed = JSON.parse(mapString);
      // console.log('Parsed tempToServerNoteMap:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error parsing tempToServerNoteMap from localStorage:', error);
      return null;
    }
  },

  saveTrendingTagsCache(tags, expirationTime) {
    try {
      localStorage.setItem(TRENDING_TAGS_CACHE_KEY, JSON.stringify(tags));
      localStorage.setItem(CACHE_EXPIRATION_KEY, expirationTime.toString());
      console.log('Trending tags cache saved:', tags);
    } catch (error) {
      console.error('Error saving trending tags cache to localStorage:', error);
    }
  },

  getTrendingTagsCache() {
    try {
      const cachedTags = localStorage.getItem(TRENDING_TAGS_CACHE_KEY);
      const expirationTime = localStorage.getItem(CACHE_EXPIRATION_KEY);
      if (cachedTags && expirationTime) {
        console.log('Trending tags cache retrieved:', JSON.parse(cachedTags));
        return {
          tags: JSON.parse(cachedTags),
          expiration: parseInt(expirationTime)
        };
      }
      console.log('No trending tags cache found');
      return null;
    } catch (error) {
      console.error('Error getting trending tags cache from localStorage:', error);
      return null;
    }
  },

  saveTrendingTagsAnalysisCache(analysis, expirationTime) {
    try {
      if (analysis === undefined) {
        console.warn('Attempted to save undefined analysis to cache');
        return;
      }
      const cacheData = JSON.stringify({
        analysis: analysis,
        expiration: expirationTime
      });
      localStorage.setItem(TRENDING_TAGS_ANALYSIS_CACHE_KEY, cacheData);
      console.log('Trending tags analysis cache saved:', analysis);
    } catch (error) {
      console.error('Error saving trending tags analysis cache to localStorage:', error);
    }
  },

  getTrendingTagsAnalysisCache() {
    try {
      const cachedData = localStorage.getItem(TRENDING_TAGS_ANALYSIS_CACHE_KEY);
      if (cachedData === null || cachedData === 'undefined') {
        console.log('No valid trending tags analysis cache found');
        return null;
      }
      const parsedData = JSON.parse(cachedData);
      console.log('Trending tags analysis cache retrieved:', parsedData);
      return parsedData;
    } catch (error) {
      console.error('Error getting trending tags analysis cache from localStorage:', error);
      return null;
    }
  },

  clearTrendingTagsCache() {
    try {
      localStorage.removeItem(TRENDING_TAGS_CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRATION_KEY);
    } catch (error) {
      console.error('Error clearing trending tags cache from localStorage:', error);
    }
  },

  clearTrendingTagsAnalysisCache() {
    try {
      localStorage.removeItem(TRENDING_TAGS_ANALYSIS_CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRATION_KEY);
    } catch (error) {
      console.error('Error clearing trending tags analysis cache from localStorage:', error);
    }
  },

  clearAllTrendingCaches() {
    this.clearTrendingTagsCache();
    this.clearTrendingTagsAnalysisCache();
  }
};
