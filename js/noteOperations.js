import api from './api.js';
import { updateNoteList, updateTagsDisplay } from './ui.js';
import { auth } from './firebase.js';

import {
  validateNoteText,
  saveTagsToLocalStorage,
  loadTagsFromLocalStorage,
  loadNotesFromLocalStorage,
  mergeNotes,
  getTagsFromLocalStorage,
  cleanupGeneratedTags,
  saveNotesToLocalStorage
} from './noteHelper.js';


let notes = [];
let generatedTagsMap = new Map();

const noteOperations = {
  async loadNotes() {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping note loading');
      notes = [];
      return notes;
    }

    try {
      const localNotes = loadNotesFromLocalStorage();  // 直接使用导入的函数
      const serverNotes = await api.notes.getNotes();
      notes = mergeNotes(localNotes, serverNotes);

      generatedTagsMap = loadTagsFromLocalStorage();

      for (const note of notes) {
        await this.processNoteTags(note);
      }

      saveNotesToLocalStorage(notes);
      saveTagsToLocalStorage(generatedTagsMap);
      await this.updateNoteListAndTags();

      return notes;
    } catch (error) {
      this.handleError('Error loading notes:', error);
      notes = [];
      return notes;
    }
  },

  async processNoteTags(note) {
    try {
      let tags = getTagsFromLocalStorage(note.note_id, generatedTagsMap);
      if (!tags || tags.length === 0) {
        console.log(`Fetching tags for note ${note.note_id} from server`);
        tags = await api.tags.getTags(note.note_id);
      }

      if (!tags || tags.length === 0) {
        console.log(`Generating tags for note ${note.note_id}`);
        tags = await api.ai.generateTags(note.content);
        await this.saveTags(note.note_id, tags);
      }

      generatedTagsMap.set(note.note_id, tags);
    } catch (tagError) {
      this.handleError(`Error processing tags for note ${note.note_id}:`, tagError);
    }
  },

  handleError(message, error) {
    console.error(message, error);
  },

  async updateNoteList() {
    console.log('Updating note list');
    await updateNoteList(notes);
  },

  async updateNoteTags() {
    console.log('Updating note tags');
    for (const note of notes) {
      const tags = generatedTagsMap.get(note.note_id);
      if (tags) {
        await this.updateNoteTagsInUI(note.note_id, tags);
      }
    }
  },

  async updateNoteTagsInUI(noteId, tags) {
    console.log(`Updating UI for note ${noteId} with tags:`, tags);
    
    // 使用更通用的选择器
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    if (!noteElement) {
      console.error(`Note element for ${noteId} not found, cannot update tags`);
      return;
    }

    // 确保有一个标签容器
    let tagContainer = noteElement.querySelector('.note-tags-container');
    if (!tagContainer) {
      console.log(`Creating new tag container for note ${noteId}`);
      tagContainer = document.createElement('div');
      tagContainer.className = 'note-tags-container';
      noteElement.appendChild(tagContainer);
    }

    // 获取或创建标签元素
    let tagElement = noteElement.querySelector(`#tags-${noteId}`);
    if (!tagElement) {
      console.log(`Creating new tag element for note ${noteId}`);
      tagElement = document.createElement('div');
      tagElement.id = `tags-${noteId}`;
      tagElement.className = 'note-tags';
      tagContainer.appendChild(tagElement);
    }

    // 确保 tags 是一个数组
    const tagsArray = Array.isArray(tags) ? tags : 
                      (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : 
                      (tags ? [String(tags)] : []));

    // 更新标签内容
    tagElement.innerHTML = tagsArray.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    // 添加一个小延迟，确保 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 0));

    console.log(`Tags updated for note ${noteId}`);
  },

  async loadTags(loadedNotes) {
    if (!Array.isArray(loadedNotes) || loadedNotes.length === 0) {
      console.log('No notes to load tags for');
      return new Map();
    }
    try {
      // 从本地存储加载标签
      generatedTagsMap = loadTagsFromLocalStorage();
      
      // 清理不存在的笔记的标签
      const currentNoteIds = loadedNotes.map(note => note.note_id);
      if (Array.isArray(currentNoteIds) && currentNoteIds.length > 0) {
        cleanupGeneratedTags(generatedTagsMap, currentNoteIds);
      } else {
        console.warn('No valid note IDs found for cleanup');
      }
      
      // 检查是否有新的笔记需要生成标签
      const notesWithoutTags = loadedNotes.filter(note => !generatedTagsMap.has(note.note_id));
      if (notesWithoutTags.length > 0) {
        await this.generateTagsForNotes(notesWithoutTags);
      }
      
      return generatedTagsMap;
    } catch (error) {
      console.error('Error loading tags:', error);
      return new Map();
    }
  },

  async checkAndGenerateTags() {
    // console.log('Checking notes for missing tags...');
    // console.log('Total notes:', notes.length);

    // // 详细输出每个笔记的标签状态
    // notes.forEach((note, index) => {
    //   console.log(`Note ${index + 1}:`);
    //   console.log(`  ID: ${note.note_id}`);
    //   console.log(`  Content: ${note.content.substring(0, 50)}...`);
    //   console.log(`  Tags: ${note.tags ? JSON.stringify(note.tags) : 'No tags'}`);
    // });

    const notesWithoutTags = notes.filter(note => !note.tags || note.tags.length === 0);
    // console.log('Notes without tags:', notesWithoutTags.length);

    if (notesWithoutTags.length > 0) {
      console.log(`Found ${notesWithoutTags.length} notes without tags. Generating tags...`);
      await this.generateTagsForNotes(notesWithoutTags);
    } else {
      console.log('All notes have tags. Skipping tag generation.');
    }
  },

  async generateTagsForNotes(notesWithoutTags) {
    for (const note of notesWithoutTags) {
      if (!generatedTagsMap.has(note.note_id)) {
        try {
          const generatedTags = await api.ai.generateTags(note.content);
          console.log(`Generated tags for note ${note.note_id}:`, generatedTags);
          
          // 确保 generatedTags 是数组
          const tagsArray = Array.isArray(generatedTags) ? generatedTags : 
                            (typeof generatedTags === 'string' ? generatedTags.split(',').map(tag => tag.trim()) : 
                            []);
          
          generatedTagsMap.set(note.note_id, tagsArray);
          this.updateNoteTagsInUI(note.note_id, tagsArray);

          // 保存生成的标签到数据库
          await this.saveTags(note.note_id, tagsArray);
        } catch (error) {
          console.error(`Error generating tags for note ${note.note_id}:`, error);
        }
      }
    }
    saveTagsToLocalStorage(generatedTagsMap);
  },

  async addNote(noteText) {
    if (!validateNoteText(noteText)) {
      throw new Error('Invalid note text');
    }

    let originalText = '';
    let tempNoteId = '';
    const noteInput = document.getElementById('noteInput');

    try {
      const currentTime = new Date().toISOString();
      originalText = noteInput.value;
      noteInput.value = '';

      tempNoteId = 'temp_' + Date.now();
      const tempNote = { note_id: tempNoteId, content: noteText, created_at: currentTime };
      
      await this.addTempNoteAndUpdateUI(tempNote);

      const newNote = await api.notes.addNote({ content: noteText, created_at: currentTime });
      await this.finalizeNewNote(newNote, tempNoteId, currentTime);
      
      return newNote;
    } catch (error) {
      this.handleAddNoteError(error, originalText, tempNoteId);
      throw error;
    }
  },

  async addTempNoteAndUpdateUI(tempNote) {
    generatedTagsMap.set(tempNote.note_id, ['Adding...']);
    notes.unshift(tempNote);
    await this.debouncedUpdateUI();
  },

  // 使用原生 JavaScript 实现防抖
  debouncedUpdateUI: (function() {
    let timeout;
    return function() {
      clearTimeout(timeout);
      return new Promise(resolve => {
        timeout = setTimeout(async () => {
          await this.updateNoteListAndTags();
          resolve();
        }, 300);
      });
    };
  })(),

  async finalizeNewNote(newNote, tempNoteId, currentTime) {
    const index = notes.findIndex(n => n.note_id === tempNoteId);
    if (index !== -1) {
      notes[index] = { ...newNote, created_at: currentTime };
    } else {
      notes.unshift(newNote);
    }

    try {
      const generatedTags = await api.ai.generateTags(newNote.content);
      console.log(`Generated tags for new note ${newNote.note_id}:`, generatedTags);
      
      await api.tags.addTags(newNote.note_id, generatedTags);
      
      // 更新整个笔记列表
      await this.updateNoteList();
    
      // 延迟更新标签，给 DOM 一些时间来更新
      setTimeout(() => this.updateNoteTagsInUI(newNote.note_id, generatedTags), 100);
    } catch (error) {
      console.error('Error generating or saving tags:', error);
    }
  },

  handleAddNoteError(error, originalText, tempNoteId) {
    console.error('Error adding note:', error);
    document.getElementById('noteInput').value = originalText;
    this.cleanupTempNote(tempNoteId);
  },

  async cleanupTempNote(tempNoteId) {
    notes = notes.filter(note => note.note_id !== tempNoteId);
    generatedTagsMap.delete(tempNoteId);
    await this.debouncedUpdateUI();
  },

  async updateNoteListAndTags() {
    console.log('Updating note list and tags');
    
    await updateNoteList(notes);
    
    for (const note of notes) {
      await this.processNoteTags.call(this, note);
    }
  },

  async deleteNote(noteId) {
    try {
      await api.notes.deleteNote(noteId);
      
      // 从本地数组中移除笔记
      notes = notes.filter(note => note.note_id !== noteId);
      generatedTagsMap.delete(noteId);
      
      // 更新本地存储
      saveNotesToLocalStorage(notes);
      saveTagsToLocalStorage(generatedTagsMap);

      // 更新 UI
      this.updateNoteListAndTags();
      
      console.log(`Note with ID: ${noteId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Error deleting note with ID: ${noteId}`, error);
      throw error;
    }
  },

  async searchNotes(query) {
    try {
      const matchingNotes = await api.notes.searchNotes(query);
      updateNoteList(matchingNotes);
    } catch (error) {
      console.error('Error searching notes:', error);
      updateNoteList([]);
    }
  },

  async generateFeedbackForNote(noteId, content) {
    console.log('generateFeedbackForNote called with:', noteId, content);
    try {
      const feedbackResponse = await api.ai.generateFeedback(content);
      console.log('Feedback generated:', feedbackResponse);

      // 输出反馈响应的完整内容
      console.log('Full feedback response:', JSON.stringify(feedbackResponse, null, 2));

      // 检反馈响应的格式
      if (typeof feedbackResponse === 'string' && feedbackResponse.trim() !== '') {
          alert(` ${feedbackResponse}`);
      } else if (Array.isArray(feedbackResponse) && feedbackResponse.length > 0) {
          const feedbackText = feedbackResponse[0].content; // 获取第一个反馈的内容
          if (feedbackText) {
              alert(` ${feedbackText}`);
          } else {
              console.error('Generated feedback text is undefined');
          }
      } else {
          console.error('Feedback response is not in the expected format or is empty', feedbackResponse);
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
    }
  },

  async clearAllCachedData() {
    generatedTagsMap.clear();
    localStorage.removeItem('generatedTags');
    localStorage.removeItem('notes');
    
    console.log('All cached data has been cleared');

    // 重新加载笔记和签
    await this.loadNotes();
  },

  updateNoteCount() {
    const noteCountElement = document.getElementById('noteCount');
    if (noteCountElement) {
      noteCountElement.textContent = `Total Notes: ${notes.length}`;
    }
  },

  updateAllNoteTags() {
    notes.forEach(note => {
      const tags = generatedTagsMap.get(note.note_id);
      if (tags) {
        this.updateNoteTagsInUI(note.note_id, tags);
      }
    });
  },

  async saveTags(noteId, tags) {
    console.log(`Saving tags for note ${noteId}:`, tags);
    try {
      const result = await api.tags.addTags(noteId, tags);
      console.log('Tags saved successfully:', result);
      
      generatedTagsMap.set(noteId, tags);
      saveTagsToLocalStorage(generatedTagsMap);
      
      return result;
    } catch (error) {
      console.error(`Error saving tags for note ${noteId}:`, error);
      return { 
        success: false, 
        error: error.message, 
        details: error.response ? error.response.data : 'No additional details'
      };
    }
  },

  async addTempNoteAndUpdateUI(tempNote) {
    notes.unshift(tempNote);
    generatedTagsMap.set(tempNote.note_id, ['Adding...']);
    await this.updateNoteList();
  },

  async updateNewNoteWithServerData(newNote, tempNoteId) {
    const index = notes.findIndex(note => note.note_id === tempNoteId);
    if (index !== -1) {
      notes[index] = newNote;
      generatedTagsMap.delete(tempNoteId);
      await this.updateNoteList();
    }
  },

  async generateAndSaveTagsForNote(note) {
    try {
      const tags = await api.ai.generateTags(note.content);
      await this.saveTags(note.note_id, tags);
      await this.updateNoteTagsInUI(note.note_id, tags);
    } catch (error) {
      console.error('Error generating or saving tags:', error);
      await this.updateNoteTagsInUI(note.note_id, ['Error generating tags']);
    }
  },

  handleAddNoteError(error, originalText, tempNoteId) {
    console.error('Error adding note:', error);
    document.getElementById('noteInput').value = originalText;
    const index = notes.findIndex(note => note.note_id === tempNoteId);
    if (index !== -1) {
      notes.splice(index, 1);
      this.updateNoteList();
    }
  },
};

export default noteOperations;