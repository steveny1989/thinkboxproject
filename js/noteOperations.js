import api from './api.js';
import * as helper from './noteHelper.js';
import { localStorageService } from './localStorage.js';


class NoteOperations {
  constructor() {
    this.notes = [];
    this.generatedTagsMap = new Map();
    this.api = api;  // 将导入的 api 赋值给实例属性
    this.helper = helper;
  }

  async loadNotes() {
    try {
      const notes = await this.api.notes.getNotes();
      
      // 获取所有笔记的标签
      const tagsPromises = notes.map(note => this.api.tags.getTags(note.note_id));
      const tagsResults = await Promise.all(tagsPromises);
      
      // 将标签添加到相应的笔记中
      this.notes = notes.map((note, index) => ({
        ...note,
        tags: tagsResults[index]
      }));

      this.helper.saveNotesToLocalStorage(this.notes);
      return this.notes;
    } catch (error) {
      console.error('Error loading notes:', error);
      return [];
    }
  }

  async addNote(noteText) {
    if (!this.helper.validateNoteText(noteText)) {
      throw new Error('Invalid note text');
    }
    try {
      const newNote = await this.api.notes.addNote({ content: noteText });
      this.notes.unshift(newNote);
      await this.generateAndSaveTagsForNote(newNote);
      this.helper.saveNotesToLocalStorage(this.notes);
      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  async deleteNote(noteId) {
    try {
      await this.api.notes.deleteNote(noteId);
      this.notes = this.notes.filter(note => note.note_id !== noteId);
      this.helper.saveNotesToLocalStorage(this.notes);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  async generateAndSaveTagsForNote(note) {
    try {
      const tags = await api.ai.generateTags(note.content);
      await api.tags.addTags(note.note_id, tags);
      this.generatedTagsMap.set(note.note_id, tags);
      helper.saveTagsToLocalStorage(this.generatedTagsMap);
      return tags;
    } catch (error) {
      console.error('Error generating or saving tags:', error);
      return [];
    }
  }

  async processAllNoteTags() {
    for (const note of this.notes) {
      if (!this.generatedTagsMap.has(note.note_id)) {
        await this.generateAndSaveTagsForNote(note);
      }
    }
  }

  getNotes() {
    return this.notes;
  }

  getTagsForNote(noteId) {
    return this.generatedTagsMap.get(noteId) || [];
  }

  clearAllCachedData() {
    helper.clearAllCachedData();
  }
  
  async clearAllData() {
    this.notes = [];
    this.generatedTagsMap.clear();
    helper.clearAllCachedData();
    // 如果需要，可以在这里添加清除服务器数据的API调用
    console.log('All data cleared');
  }
  // ... 其他方法 ...
}

export default new NoteOperations();