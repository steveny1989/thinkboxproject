import api from './api.js';
import * as helper from './noteHelper.js';
import { localStorageService } from './localStorage.js';

class NoteOperations {
  constructor() {
    this.notes = [];  // 初始化为空数组

    // 处理 generatedTagsMap
    this.generatedTagsMap = new Map();
    const tagsFromStorage = localStorageService.getTags();
    console.log('Raw tagsFromStorage:', tagsFromStorage);
    if (tagsFromStorage && typeof tagsFromStorage === 'object') {
      Object.entries(tagsFromStorage).forEach(([key, value]) => {
        this.generatedTagsMap.set(key, value);
      });
    }
    console.log('Initialized generatedTagsMap:', this.generatedTagsMap);
    
    this.api = api;
    this.helper = helper;
    this.randomNames = [
      "Alex", "Blake", "Casey", "Dana", "Eden", 
      "Fran", "Gray", "Harper", "Indigo", "Jamie", 
      "Kelly", "Logan", "Morgan", "Noel", "Oakley", 
      "Parker", "Quinn", "Riley", "Sage", "Taylor"
    ];
    // 处理 tempToServerNoteMap
    this.tempToServerNoteMap = new Map();
    const tempToServerNoteMapFromStorage = localStorageService.getTempToServerNoteMap();
    console.log('Raw tempToServerNoteMapFromStorage:', tempToServerNoteMapFromStorage);

    if (tempToServerNoteMapFromStorage && typeof tempToServerNoteMapFromStorage === 'object') {
      Object.entries(tempToServerNoteMapFromStorage).forEach(([key, value]) => {
        this.tempToServerNoteMap.set(key, value);
      });
    }

    console.log('Initialized tempToServerNoteMap:', this.tempToServerNoteMap);
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
      const tempId = 'temp-' + Date.now();
      const tempNote = { note_id: tempId, content: noteText, created_at: new Date().toISOString() };
      this.notes.unshift(tempNote);
      this.tempToServerNoteMap.set(tempId, null); // 初始时，服务器ID为null

      const newNote = await this.api.notes.addNote({ content: noteText });
      
      // 更新映射和笔记列表
      this.tempToServerNoteMap.set(tempId, newNote.note_id);
      const index = this.notes.findIndex(note => note.note_id === tempId);
      if (index !== -1) {
        this.notes[index] = newNote;
      }

      localStorageService.saveNotes(this.notes);
      localStorageService.saveTempToServerNoteMap(this.tempToServerNoteMap);

      // 异步生成标签
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

    // 更新本地储
    await localStorageService.saveNotes(this.notes);

    if (noteId.startsWith('temp-')) {
      const serverNoteId = this.tempToServerNoteMap.get(noteId);
      if (serverNoteId) {
        try {
          await this.api.notes.deleteNote(serverNoteId);
          console.log(`NoteOperations: Corresponding server note ${serverNoteId} deleted for temp note ${noteId}`);
        } catch (error) {
          console.error(`NoteOperations: Error deleting server note ${serverNoteId} for temp note ${noteId}:`, error);
        }
      }
      this.tempToServerNoteMap.delete(noteId);
    } else {
      try {
        await this.api.notes.deleteNote(noteId);
        console.log(`NoteOperations: Note ${noteId} deleted from server`);
      } catch (error) {
        console.error(`NoteOperations: Error deleting note ${noteId} from server:`, error);
        throw error;
      }
    }

    // 从生成的签映射中删除
    this.generatedTagsMap.delete(noteId);
    await localStorageService.saveTags(Array.from(this.generatedTagsMap.entries()));
    await localStorageService.saveTempToServerNoteMap(this.tempToServerNoteMap);

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

  async generateCommentsForNote(noteId) {
    try {
      const note = this.notes.find(n => n.note_id === noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      // 准备现有评论的上下文
      const existingComments = note.comments || [];
      const existingCommentsContext = existingComments.map(c => `${c.author}: ${c.content}`).join('\n');

      // 准备发送给 AI 的内容，包括笔记内容和现有评论
      const contextForAI = `
        Note: ${note.content}
        
        Existing comments:
        ${existingCommentsContext}
        
        Please generate a new comment based on the note and existing comments:
      `;

      // 调用 AI API 生成评论
      const commentContent = await this.api.ai.generateComments(contextForAI);
      
      const randomName = this.getRandomName();
      console.log('Generated random name:', randomName); // 添加这行日志

      const newComment = {
        id: 'temp-' + Math.random().toString(36).substr(2, 9),
        content: commentContent,
        author: randomName, // 使用生成的随机名字
        timestamp: new Date().toISOString()
      };

      console.log('New comment:', newComment); // 添加这行日志

      // // 更新笔记对象，添加新生成的评论
      // note.comments = note.comments || [];
      // note.comments.push(newComment);

      // 更新本地存储
      localStorageService.saveNotes(this.notes);

      //异步保存到数据库
      //this.api.comments.addComments(noteId, [newComment]);
      
      return newComment; // 
    } catch (error) {
      console.error('Error generating comment:', error);
      throw error;
    }
  }

  async generateFeedbackForNote(noteId, noteContent) {
    try {
      console.log('Entering generateFeedbackForNote', { noteId, noteContent });
      const feedbackContent = await this.api.ai.generateFeedback(noteContent);
      return feedbackContent;
    } catch (error) {
      console.error('Error generating feedback:', error);
      throw error;
    }
  }

  getRandomName() {
    return this.randomNames[Math.floor(Math.random() * this.randomNames.length)];
  }

  getNotes() {
    return this.notes;  // 返笔记
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
  
  async initializePaginatedNotes() {
    if (this.notes.length === 0) {
      return this.getPaginatedNotes();
    }
    return this.notes;
  }

  async getPaginatedNotes(lastNoteId = null, limit = 24) {
    console.log('Fetching paginated notes. lastNoteId:', lastNoteId, 'limit:', limit);
    
    if (lastNoteId === null && this.notes.length > 0) {
      console.log('Returning cached notes');
      return this.notes;
    }

    try {
      const paginatedNotes = await this.api.notes.getPaginatedNotes(lastNoteId, limit);
      console.log('Received', paginatedNotes.length, 'notes from API');

      if (lastNoteId === null) {
        console.log('First page, replacing local cache');
        this.notes = paginatedNotes;
      } else {
        console.log('Not first page, appending to local cache');
        this.notes = [...this.notes, ...paginatedNotes];
      }

      console.log('Total notes in local cache after update:', this.notes.length);
      
      // 更新本地存储
      localStorageService.saveNotes(this.notes);
      
      // 获取新加载笔记的标签
      const tagsPromises = paginatedNotes.map(note => this.api.tags.getTags(note.note_id));
      const tagsResults = await Promise.all(tagsPromises);
      
      // 将标签添加到相应的笔记中
      paginatedNotes.forEach((note, index) => {
        note.tags = tagsResults[index];
      });
      
      return paginatedNotes;
    } catch (error) {
      console.error('Error getting paginated notes:', error);
      throw error;
    }
  }

  async searchNotes(searchTerm) {
    try {
      const searchResults = await this.api.notes.searchNotes(searchTerm);
      
      // 获取搜索结果中每个笔记的标签
      const tagsPromises = searchResults.map(note => this.api.tags.getTags(note.note_id));
      const tagsResults = await Promise.all(tagsPromises);
      
      // 将标签添加到相应的笔记中
      searchResults.forEach((note, index) => {
        note.tags = tagsResults[index];
      });

      return searchResults;
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }

  async getTrendingTags(limit = 10) {
    try {
      const allTags = await api.tags.getAllTags();
      console.log('All tags received:', allTags);

      if (!Array.isArray(allTags)) {
        console.error('Unexpected data structure for tags:', allTags);
        return [];
      }

      // 提取和处理标签
      const tagCounts = {};
      allTags.forEach(tagString => {
        if (typeof tagString === 'string') {
          // 使用正则表达式匹配所有 '#' 开头的标签
          const tags = tagString.match(/#[^\s#,]+/g);
          if (tags) {
            tags.forEach(tag => {
              const cleanTag = tag.slice(1).trim(); // 移除 '#' 符号并修剪空白
              tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            });
          }
        }
      });

      console.log('Processed tag counts:', tagCounts);

      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));

      console.log('Sorted and limited tags:', sortedTags);
      return sortedTags;
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      return [];
    }
  }

  async analyzeTrendingTags(trendingTags) {
    console.log('Analyzing trending tags:', trendingTags);
    try {
      if (!trendingTags || !Array.isArray(trendingTags) || trendingTags.length === 0) {
        console.log('No valid trending tags provided for analysis');
        return "No trending tags available for analysis.";
      }

      const tagsString = trendingTags.map(tag => `#${tag.name} (${tag.count})`).join(', ');
      console.log('Tags string for analysis:', tagsString);

      const analysisReport = await this.api.ai.tagsCommentor([tagsString]);
      console.log('Analysis report received:', analysisReport);

      return analysisReport;
    } catch (error) {
      console.error('Error in analyzeTrendingTags:', error);
      return "An error occurred while analyzing trending tags.";
    }
  }
  
  getTotalNoteCount() {
    return this.notes.length;
  }
  
}

const noteOperations = new NoteOperations();
console.log('Exporting noteOperations:', noteOperations); // 添加这行日志
export default noteOperations;