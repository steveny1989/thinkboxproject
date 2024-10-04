import api from './api.js';
import * as helper from './noteHelper.js';
import { localStorageService } from './localStorage.js';

class NoteOperations {
  constructor() {
    this.notes = [];  // 初始化为空数组
    this.generatedTagsMap = new Map(localStorageService.getTags());
    this.api = api;
    this.helper = helper;
    this.randomNames = [
      "Alex", "Blake", "Casey", "Dana", "Eden", 
      "Fran", "Gray", "Harper", "Indigo", "Jamie", 
      "Kelly", "Logan", "Morgan", "Noel", "Oakley", 
      "Parker", "Quinn", "Riley", "Sage", "Taylor"
    ];
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

      // 更新笔记对象，添加新生成的评论
      note.comments = note.comments || [];
      note.comments.push(newComment);

      // 更新本地存储
      localStorageService.saveNotes(this.notes);

      //异步保存到数据库
      //this.api.comments.addComments(noteId, [newComment]);
      
      return [newComment]; // 返回包含新评论的数组
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

  // async saveCommentsToServer(noteId, comments) {
  //   try {
  //     const savedComments = await this.api.comments.addComments(noteId, comments);
  //     // 更新本地笔记中的评论，替换临时 ID 为服务器返回的 ID
  //     const note = this.notes.find(n => n.note_id === noteId);
  //     if (note) {
  //       note.comments = note.comments.map(comment => {
  //         const savedComment = savedComments.find(sc => sc.content === comment.content);
  //         return savedComment || comment;
  //       });
  //       localStorageService.saveNotes(this.notes);
  //     }
  //   } catch (error) {
  //     console.error('Error saving comments to server:', error);
  //     // 这里可以添加重试逻辑或通知用户
  //   }
  // }

  getNotes() {
    return this.notes;  // 返回当前加载的笔记
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
  
  async getPaginatedNotes(lastNoteId = null, limitCount = 20) {
    try {
      console.log(`Fetching paginated notes. lastNoteId: ${lastNoteId}, limit: ${limitCount}`);
      const paginatedNotes = await this.api.notes.getPaginatedNotes(lastNoteId, limitCount);
      console.log(`Received ${paginatedNotes.length} notes from API`);
      
      if (lastNoteId === null) {
        console.log('First page, replacing local cache');
        this.notes = paginatedNotes;
      } else {
        console.log('Not first page, appending to local cache');
        this.notes = [...this.notes, ...paginatedNotes];
      }
      
      console.log(`Total notes in local cache after update: ${this.notes.length}`);
      
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

  async initializePaginatedNotes() {
    this.notes = [];  // 清空现有的笔记
    return this.getPaginatedNotes();  // 加载第一页笔记
  }
}

export default new NoteOperations();