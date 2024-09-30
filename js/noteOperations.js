import api from './api.js';
import { updateNoteList, updateTagsDisplay } from './ui.js';
import { auth } from './firebase.js';

let notes = [];
let generatedTagsMap = new Map();

// 在文件顶部添加这个函数
function saveTagsToLocalStorage(tagsMap) {
  localStorage.setItem('noteTags', JSON.stringify(Array.from(tagsMap.entries())));
}

function loadTagsFromLocalStorage() {
  const savedTags = localStorage.getItem('noteTags');
  if (savedTags) {
    try {
      const parsedTags = JSON.parse(savedTags);
      return new Map(parsedTags.map(([key, value]) => [key, Array.isArray(value) ? value : [value]]));
    } catch (error) {
      console.error('Error parsing saved tags:', error);
      return new Map();
    }
  }
  return new Map();
}

const noteOperations = {
  async loadNotes() {
    console.log('loadNotes called');
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping note loading');
      await this.updateNoteList();
      return [];
    }
    try {
      notes = await api.getNotes();
      console.log('Notes loaded:', notes);
      console.log('Number of notes loaded:', notes.length);
     
          // 按创建时间降序排序笔记
    notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
      // 立即更新笔记列表，不等待标签
      await this.updateNoteList(notes);
      
      // 更新笔记列表和标签
      await this.updateNoteListAndTags();
      
      return notes;
    } catch (error) {
      console.error('Error loading notes:', error);
      notes = [];
      await this.updateNoteList();
      return [];
    }
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
    const noteElement = document.querySelector(`li[data-note-id="${noteId}"]`);
    if (!noteElement) {
      console.warn(`Note element for ${noteId} not found, skipping tag update`);
      return;
    }

    let tagElement = noteElement.querySelector(`#tags-${noteId}`);
    if (!tagElement) {
      console.log(`Creating new tag element for note ${noteId}`);
      tagElement = document.createElement('div');
      tagElement.id = `tags-${noteId}`;
      tagElement.className = 'note-tags';
      const tagContainer = noteElement.querySelector('.note-tags-container');
      if (tagContainer) {
        tagContainer.appendChild(tagElement);
      } else {
        console.warn(`Tag container not found for note ${noteId}`);
        return;
      }
    }

    // 确保 tags 是一个数组
    const tagsArray = Array.isArray(tags) ? tags : 
                      (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : 
                      (tags ? [String(tags)] : []));

    tagElement.innerHTML = tagsArray.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    // 如果需要，这里可以添加一个小延迟，以确保 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 0));
  },

  async loadTags(loadedNotes) {
    if (!loadedNotes || loadedNotes.length === 0) {
      console.log('No notes to load tags for');
      return new Map();
    }
    try {
      // 从本地存储加载标签
      generatedTagsMap = loadTagsFromLocalStorage();
      
      // 清理不存在的笔记的标签
      const currentNoteIds = loadedNotes.map(note => note.note_id);
      this.cleanupGeneratedTags(currentNoteIds);
      
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
          const generatedTags = await api.tagsGenerator(note.content);
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
    let originalText = '';
    let tempNoteId = '';
    try {
      const currentTime = new Date().toISOString();
      
      // 清除输入框并保存原始文本
      const noteInput = document.getElementById('noteInput');
      originalText = noteInput.value;
      noteInput.value = '';

      // 创建临时笔记对象，包括临时标签
      tempNoteId = 'temp_' + Date.now();
      const tempNote = {
        note_id: tempNoteId,
        content: noteText,
        created_at: currentTime
      };

      // 创建临时标签对象
      const tempTags = ['Adding...'];
      generatedTagsMap.set(tempNoteId, tempTags);

      // 将新笔记添加到数组的开头
      notes.unshift(tempNote);

      // 立即更新UI以显示临时笔记和标签
      await this.updateNoteListAndTags();

      // 异步添加笔记到服务器
      const newNote = await api.addNote({ 
        content: noteText,
        created_at: currentTime
      });

      // 用服务器返回的数据替换临时笔记
      const index = notes.findIndex(n => n.note_id === tempNoteId);
      if (index !== -1) {
        notes[index] = {
          ...newNote,
          created_at: currentTime // 使用原始的客户端时间戳
        };
        // 移除临时笔记ID的标签
        generatedTagsMap.delete(tempNoteId);
      } else {
        // 如果找不到临时笔记，直接添加新笔记
        notes.unshift(newNote);
      }

      // 异步生成标签
      const generatedTags = await api.tagsGenerator(newNote.content);
      generatedTagsMap.set(newNote.note_id, generatedTags);
      saveTagsToLocalStorage(generatedTagsMap);

      // 尝试保存生成的标签到数据库
      try {
        await this.saveTags(newNote.note_id, generatedTags);
      } catch (tagError) {
        console.warn(`Failed to save tags for note ${newNote.note_id}:`, tagError);
        // 即使标签保存失败，我们仍然继续处理
      }

      // 更新UI以显示新笔记和标签
      await this.updateNoteListAndTags();

      console.log(`Added note ${newNote.note_id} with tags:`, generatedTags);

      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      noteInput.value = originalText;
      // 如果出错，移除临时笔记和标签
      notes = notes.filter(note => note.note_id !== tempNoteId);
      generatedTagsMap.delete(tempNoteId);
      await this.updateNoteListAndTags();
      throw error;
    }
  },

  async updateNoteListAndTags() {
    console.log('Updating note list and tags');
    
    // 更新笔记列表
    await updateNoteList(notes);
    
    // 更新每个笔记的标签
    for (const note of notes) {
      const tags = generatedTagsMap.get(note.note_id);
      console.log(`Updating tags for note ${note.note_id}:`, tags);
      if (tags) {
        await this.updateNoteTagsInUI(note.note_id, tags);
      }
    }
  },

  async deleteNote(noteId) {
    try {
      await api.deleteNote(noteId);
      
      // 从本地数组中移除笔记
      notes = notes.filter(note => note.note_id !== noteId);
      generatedTagsMap.delete(noteId);
      
      // 更新本地存储
      this.saveNotesToLocalStorage();
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
      const matchingNotes = await api.searchNotes(query);
      updateNoteList(matchingNotes);
    } catch (error) {
      console.error('Error searching notes:', error);
      updateNoteList([]);
    }
  },

  async generateFeedbackForNote(noteId, content) {
    console.log('generateFeedbackForNote called with:', noteId, content);
    try {
        const feedbackResponse = await api.generateFeedback(content);
        console.log('Feedback generated:', feedbackResponse);

        // 输出反馈响应的完整内容
        console.log('Full feedback response:', JSON.stringify(feedbackResponse, null, 2));

        // 检查反馈响应的格式
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
 
  cleanupGeneratedTags(currentNoteIds) {
    for (const noteId of generatedTagsMap.keys()) {
      if (!currentNoteIds.includes(noteId)) {
        generatedTagsMap.delete(noteId);
      }
    }
    saveTagsToLocalStorage(generatedTagsMap);
  },

  saveNotesToLocalStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
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
      const result = await api.addTags(noteId, tags);
      console.log('Tags saved successfully:', result);
      return result;
    } catch (error) {
      console.error(`Error saving tags for note ${noteId}:`, error);
      // 返回更详细的错误信息
      return { 
        success: false, 
        error: error.message,
        details: error.response ? error.response.data : 'No additional details'
      };
    }
  },
};

export default noteOperations;