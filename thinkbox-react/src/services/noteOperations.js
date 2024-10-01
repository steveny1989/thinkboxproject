// src/services/noteOperations.js

import api from './api';  // 添加这行

console.log('API object:', api);

class NoteOperations {
  constructor() {
    this.notes = [];
    this.listeners = new Set();
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.notes));
  }

  async loadNotes() {
    try {
      this.notes = await api.getNotes();
      this.notifyListeners();
      return this.notes;
    } catch (error) {
      console.error('Error loading notes:', error);
      throw error;
    }
  }

  async addNote(newNote) {
    try {
      const addedNote = await api.addNote(newNote);
      this.notes.unshift(addedNote);
      this.notifyListeners();
      return addedNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  async deleteNote(noteId) {
    try {
      await api.deleteNote(noteId);
      this.notes = this.notes.filter(note => note.id !== noteId);
      this.notifyListeners();
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  async updateNote(noteId, updates) {
    try {
      const updatedNote = await api.updateNote(noteId, updates);
      this.notes = this.notes.map(note => 
        note.id === noteId ? { ...note, ...updatedNote } : note
      );
      this.notifyListeners();
      return updatedNote;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  // 添加新的方法，如处理标签等
  async addTagsToNote(noteId, tags) {
    try {
      const updatedTags = await api.addTags(noteId, tags);
      this.notes = this.notes.map(note => 
        note.id === noteId ? { ...note, tags: updatedTags } : note
      );
      this.notifyListeners();
      return updatedTags;
    } catch (error) {
      console.error('Error adding tags:', error);
      throw error;
    }
  }
}

const noteOperations = new NoteOperations();
export default noteOperations;