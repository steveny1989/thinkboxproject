import api from './api.js';
import { updateNoteList, updateTagsDisplay } from './ui.js';
import { auth } from './firebase.js';

let notes = [];
let generatedTagsMap = new Map();

const noteOperations = {
  async loadNotes() {
    console.log('loadNotes called');
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping note loading');
      updateNoteList([]);
      return [];
    }
    try {
      notes = await api.getNotes();
      console.log('Notes loaded:', notes);
      console.log('Number of notes loaded:', notes.length);
      updateNoteList(notes);
      return notes;
    } catch (error) {
      console.error('Error loading notes:', error);
      notes = [];
      updateNoteList([]);
      return [];
    }
  },

  async loadTags(loadedNotes) {
    console.log('loadTags called');
    if (!loadedNotes || loadedNotes.length === 0) {
      console.log('No notes to load tags for');
      return new Map();
    }
    try {
      // 加载存储的生成标签
      this.loadGeneratedTags();
      
      // 清理不存在的笔记的标签
      const currentNoteIds = loadedNotes.map(note => note.note_id);
      this.cleanupGeneratedTags(currentNoteIds);
      
      // 检查是否有新的笔记需要生成标签
      const notesWithoutTags = loadedNotes.filter(note => !generatedTagsMap.has(note.note_id));
      if (notesWithoutTags.length > 0) {
        await this.generateTagsForNotes(notesWithoutTags);
      }
      
      console.log('Tags loaded:', generatedTagsMap);
      return generatedTagsMap;
    } catch (error) {
      console.error('Error loading tags:', error);
      return new Map();
    }
  },

  async checkAndGenerateTags() {
    console.log('Checking notes for missing tags...');
    console.log('Total notes:', notes.length);

    // 详细输出每个笔记的标签状态
    notes.forEach((note, index) => {
      console.log(`Note ${index + 1}:`);
      console.log(`  ID: ${note.note_id}`);
      console.log(`  Content: ${note.content.substring(0, 50)}...`);
      console.log(`  Tags: ${note.tags ? JSON.stringify(note.tags) : 'No tags'}`);
    });

    const notesWithoutTags = notes.filter(note => !note.tags || note.tags.length === 0);
    console.log('Notes without tags:', notesWithoutTags.length);

    if (notesWithoutTags.length > 0) {
      console.log(`Found ${notesWithoutTags.length} notes without tags. Generating tags...`);
      await this.generateTagsForNotes(notesWithoutTags);
    } else {
      console.log('All notes have tags. Skipping tag generation.');
    }
  },

  async generateTagsForNotes(notesWithoutTags) {
    console.log('Starting tag generation for notes without tags');
    generatedTagsMap.clear(); // 清空之前的数据

    for (const note of notesWithoutTags) {
      console.log(`Generating tags for note: ${note.note_id}`);
      console.log(`Note content: ${note.content.substring(0, 50)}...`); // 打印笔记内容的前50个字符
      try {
        const generatedTags = await api.tagsGenerator(note.content);
        console.log(`Raw generated tags for note ${note.note_id}:`, generatedTags);
        
        const tagArray = generatedTags.split(',').map(tag => tag.trim());
        console.log(`Processed tags for note ${note.note_id}:`, tagArray);
        
        // 将生成的标签存储到 Map 中
        generatedTagsMap.set(note.note_id, tagArray);
        
      } catch (error) {
        console.error(`Error generating tags for note ${note.note_id}:`, error);
      }
    }
    
    // console.log('Tag generation process completed');
    // console.log('All notes with their generated tags:');
    generatedTagsMap.forEach((tags, noteId) => {
      const note = notes.find(n => n.note_id === noteId);
      console.log(`Note ID: ${noteId}`);
      console.log(`Content: ${note ? note.content.substring(0, 50) : 'N/A'}...`);
      console.log(`Generated Tags: ${tags.join(', ')}`);
      console.log('---');
    });

    // 更新 UI 以显示新生成的标签
    updateNoteList(notes);
  },

  async addNote(noteText) {
    try {
      const newNote = await api.addNote({ content: noteText });
      console.log('New note added:', newNote);
      
      // 将新笔记添加到本地数组
      notes.push(newNote);
      updateNoteList(notes);
      
      // 为新笔记生成标签
      await this.generateTagsForNotes([newNote]);
      
      // 更新UI
      updateNoteList(notes);
      updateTagsDisplay(generatedTagsMap);
      
      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  },

  async deleteNote(noteId) {
    try {
      await api.deleteNote(noteId);
      notes = notes.filter(note => note.note_id !== noteId);
      updateNoteList(notes);
      
      // 从标签映射中删除该笔记的标签
      generatedTagsMap.delete(noteId);
      this.saveGeneratedTags();
      
      // 更新UI中的标签显示
      updateTagsDisplay(generatedTagsMap);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  },

  async generateTagsForNotes(notesWithoutTags) {
    for (const note of notesWithoutTags) {
      try {
        console.log(`Generating tags for note: ${note.note_id}`);
        const generatedTags = await api.tagsGenerator(note.content);
        console.log(`Generated tags for note ${note.note_id}:`, generatedTags);
        generatedTagsMap.set(note.note_id, generatedTags);
      } catch (error) {
        console.error(`Error generating tags for note ${note.note_id}:`, error);
      }
    }
    this.saveGeneratedTags();
    // 更新UI中的标签显示
    updateTagsDisplay(generatedTagsMap);
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
    this.saveGeneratedTags();
  },

  loadGeneratedTags() {
    // 加载存储的生成标签
    // 这里可以根据实际需求实现对存储的生成标签的加载
  },

  saveGeneratedTags() {
    // 保存生成的标签
    // 这里可以根据实际需求实现对生成标签的保存
  },

  async clearAllCachedData() {
    generatedTagsMap.clear();
    localStorage.removeItem('generatedTags');
    localStorage.removeItem('notes');
    
    console.log('All cached data has been cleared');

    // 重新加载笔记和标签
    await this.loadNotes();
  },
};

export default noteOperations;