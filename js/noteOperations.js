import api from './api.js';
import * as helper from './noteHelper.js';
import { localStorageService } from './localStorage.js';

class NoteOperations {
  constructor() {
    this.notes = [];  // 初始化为空数组
    this.initializeNoteCompletion();

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
    console.log('addNote called with:', noteText);
    if (!this.helper.validateNoteText(noteText)) {
      console.error('Invalid note text');
      throw new Error('Invalid note text');
    }
    try {
      const tempId = 'temp-' + Date.now();
      const tempNote = { note_id: tempId, content: noteText, created_at: new Date().toISOString() };
      this.notes.unshift(tempNote);
      this.tempToServerNoteMap.set(tempId, null); // 初始时，服务器ID为null

      console.log('Calling API to add note');
      const newNote = await this.api.notes.addNote({ content: noteText });
      console.log('New note added:', newNote);
      
      // 确保 newNote 有所有必要的字段
      if (!newNote.note_id || !newNote.content) {
        throw new Error('Invalid note object returned from API');
      }
      
      // 更新映射和笔记列表
      this.tempToServerNoteMap.set(tempId, newNote.note_id);
      const index = this.notes.findIndex(note => note.note_id === tempId);
      if (index !== -1) {
        this.notes[index] = newNote;
      }

      localStorageService.saveNotes(this.notes);
      localStorageService.saveTempToServerNoteMap(this.tempToServerNoteMap);

      console.log('Calling generateAndSaveTagsForNote');
      const tags = await this.generateAndSaveTagsForNote(newNote);
      newNote.tags = tags;
      
      // 更新本地存储
      this.updateNoteWithTags(newNote.note_id, tags);

      // 触发事件来更新UI中的标签
      document.dispatchEvent(new CustomEvent('tagsGenerated', { 
        detail: { note_id: newNote.note_id, tags } 
      }));

      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  initializeNoteCompletion() {
    // 移除这个方法中的 DOM 操作
    console.log('Note completion initialized');
  }

  async completeUserInput(partialInput) {
    if (partialInput.trim() === '') return '';

    try {
      const completion = await this.api.ai.completeUserInput(partialInput);
      return completion;
    } catch (error) {
      console.error('Error completing user input:', error);
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
    console.log('为笔记生成标签：', note);
    if (!note || !note.content || !note.note_id) {
      console.error('无效的笔记对象', note);
      return [];
    }
    try {
      const generatedTags = await this.api.ai.generateTags(note.content);
      console.log('生成的标签：', generatedTags);

      if (generatedTags.length > 0) {
        await this.api.tags.addTags(note.note_id, generatedTags);
        console.log('标签已保存到服务器');
        // 更新本地笔记对象
        this.updateNoteWithTags(note.note_id, generatedTags);
        return generatedTags; // 返回生成的标签数组，而不是服务器响应
      } else {
        console.warn('未为笔记生成有效标签：', note.note_id);
        return [];
      }
    } catch (error) {
      console.error('generateAndSaveTagsForNote 中的错误：', error);
      return [];
    }
  }

  updateNoteWithTags(noteId, tags) {
    const noteIndex = this.notes.findIndex(note => note.note_id === noteId);
    if (noteIndex !== -1) {
      this.notes[noteIndex].tags = tags;
      localStorageService.saveNotes(this.notes);
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
    try {
      console.log('Initializing paginated notes...');
      const notes = await this.getPaginatedNotes();
      console.log('Received notes:', notes);
      // ... 处理笔记的代码 ...
    } catch (error) {
      console.error('Error initializing paginated notes:', error);
      throw error;
    }
  }

  async getPaginatedNotes(lastNoteId = null, limit = 24) {
    console.log('Attempting to fetch notes with:', { lastNoteId, limit });
    try {
      const notes = await this.api.notes.getPaginatedNotes(lastNoteId, limit);
      console.log('Received notes:', notes);
      
      if (!Array.isArray(notes)) {
        console.warn('Received invalid notes data:', notes);
        return [];
      }

      if (lastNoteId === null) {
        console.log('First page, replacing local cache');
        this.notes = notes;
      } else {
        console.log('Not first page, appending to local cache');
        this.notes = [...this.notes, ...notes];
      }

      console.log('Total notes in local cache after update:', this.notes.length);
      
      // 更新本地存储
      localStorageService.saveNotes(this.notes);
      
      // 获取新加载笔记的标签
      const tagsPromises = notes.map(note => this.api.tags.getTags(note.note_id));
      const tagsResults = await Promise.all(tagsPromises);
      
      // 将标签添加到相应的笔记中
      notes.forEach((note, index) => {
        note.tags = tagsResults[index];
      });
      
      return notes;
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
    const cachedData = localStorageService.getTrendingTagsCache();
    const currentTime = Date.now();
    if (cachedData && currentTime < cachedData.expiration) {
      console.log('Using cached trending tags');
      return cachedData.tags;
    }

    try {
      const allTags = await this.api.tags.getAllTags();
      console.log('All tags received:', allTags);

      if (!Array.isArray(allTags) || allTags.length === 0) {
        console.error('Unexpected data structure for tags or empty array:', allTags);
        return [];
      }

      const tagCounts = allTags.reduce((acc, tag) => {
        if (tag && tag.name) {
          const name = tag.name.startsWith('#') ? tag.name.slice(1) : tag.name;
          acc[name] = (acc[name] || 0) + 1;
        }
        return acc;
      }, {});

      console.log('Processed tag counts:', tagCounts);

      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));

      console.log('Sorted and limited tags:', sortedTags);

      const expirationTime = currentTime + this.cacheExpiration;
      localStorageService.saveTrendingTagsCache(sortedTags, expirationTime);
      return sortedTags;
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      return [];
    }
  }

  async analyzeTrendingTags(trendingTags) {
    const cachedData = localStorageService.getTrendingTagsAnalysisCache();
    const currentTime = Date.now();
    if (cachedData && currentTime < cachedData.expiration) {
      console.log('Using cached trending tags analysis');
      return cachedData.analysis;
    }

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

      const expirationTime = currentTime + this.cacheExpiration;
      localStorageService.saveTrendingTagsAnalysisCache(analysisReport, expirationTime);
      return analysisReport;
    } catch (error) {
      console.error('Error in analyzeTrendingTags:', error);
      return "An error occurred while analyzing trending tags.";
    }
  }
  
  getTotalNoteCount() {
    return this.notes.length;
  }
  
  refreshCache() {
    localStorageService.clearTrendingTagsCache();
  }

}

const noteOperations = new NoteOperations();
console.log('Exporting noteOperations:', noteOperations); // 添加这行日志
export default noteOperations;