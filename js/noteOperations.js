import api from './api.js';
import * as helper from './noteHelper.js';
import { localStorageService } from './localStorage.js';

class NoteOperations {
  constructor() {
    this.notes = localStorageService.getNotes();
    this.generatedTagsMap = new Map(localStorageService.getTags());
    this.api = api;
    this.helper = helper;
  }

  async loadNotes() {
    try {
      const apiNotes = await this.api.notes.getNotes();
      
      // 获取所有笔记的标签
      const tagsPromises = apiNotes.map(note => this.api.tags.getTags(note.note_id));
      const tagsResults = await Promise.all(tagsPromises);
      
      // 将标签添加到相应的笔记中
      this.notes = apiNotes.map((note, index) => ({
        ...note,
        tags: tagsResults[index]
      }));

      localStorageService.saveNotes(this.notes);
      return this.notes;
    } catch (error) {
      console.error('Error loading notes from API:', error);
      return this.notes; // 返回本地存储的笔记
    }
  }

  async addNote(noteText) {
    if (!this.helper.validateNoteText(noteText)) {
      throw new Error('Invalid note text');
    }
    try {
      const newNote = await this.api.notes.addNote({ content: noteText });
      this.notes.unshift(newNote);
      localStorageService.saveNotes(this.notes);
      
      // 异步生成标签，不等待完成
      this.generateAndSaveTagsForNote(newNote).then(tags => {
        newNote.tags = tags;
        localStorageService.saveNotes(this.notes);
        // 触发事件来更新UI中的标签
        document.dispatchEvent(new CustomEvent('tagsGenerated', { detail: { noteId: newNote.note_id, tags } }));
      });

      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  async deleteNote(noteId) {
    console.log(`NoteOperations: Attempting to delete note with ID: ${noteId}`);

    // 从内存中移除笔记
    this.notes = this.notes.filter(note => note.note_id !== noteId);

    // 如果不是临时笔记，从服务器删除
    if (!noteId.startsWith('temp-')) {
      try {
        await this.api.notes.deleteNote(noteId);
        console.log(`NoteOperations: Note ${noteId} deleted from server`);
      } catch (error) {
        console.error(`NoteOperations: Error deleting note ${noteId} from server:`, error);
        throw error; // 将错误抛出，让 UI 层处理
      }
    }

    // 更新本地存储
    localStorageService.saveNotes(this.notes);

    // 从生成的标签映射中删除
    this.generatedTagsMap.delete(noteId);
    localStorageService.saveTags(Array.from(this.generatedTagsMap.entries()));

    console.log(`NoteOperations: Note ${noteId} deletion completed`);
    return true;
  }

  async generateAndSaveTagsForNote(note) {
    try {
      const tags = await this.api.ai.generateTags(note.content);
      await this.api.tags.addTags(note.note_id, tags);
      console.log('Tags generated and saved:', note.note_id, tags);
      
      // 直接使用生成的标签数组，而不是创建对象数组
      
      // 触发事件来更新UI中的标签
      document.dispatchEvent(new CustomEvent('tagsGenerated', { 
        detail: { noteId: note.note_id, tags: tags }
      }));
      
      return tags;
    } catch (error) {
      console.error('Error generating or saving tags:', error);
      return [];
    }
  }

  getNotes() {
    console.log('Getting notes, total:', this.notes.length);
    return this.notes;
  }

  getTagsForNote(noteId) {
    return this.generatedTagsMap.get(noteId) || [];
  }

  clearAllCachedData() {
    localStorageService.clearNotes();
    localStorageService.clearTags();
    this.notes = [];
    this.generatedTagsMap.clear();
  }

  addTempNote(tempNote) {
    console.log('Adding temp note:', tempNote);
    this.notes.unshift(tempNote);
    localStorageService.saveNotes(this.notes);
  }

  updateTempNote(tempId, newNote) {
    console.log('Updating temp note:', tempId, newNote);
    const index = this.notes.findIndex(note => note.note_id === tempId);
    if (index !== -1) {
      this.notes[index] = newNote;
      localStorageService.saveNotes(this.notes);
    } else {
      console.warn('Temp note not found for updating:', tempId);
    }
  }
  
}

export default new NoteOperations();