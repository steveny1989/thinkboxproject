import api from './api.js';
import { updateNoteList } from './ui.js';
import { auth } from './firebase.js';

let notes = [];

const noteOperations = {
  async loadNotes() {
    console.log('loadNotes called');
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping note loading');
      updateNoteList([]);
      return;
    }
    try {
      const notes = await api.getNotes();
      console.log('Notes loaded:', notes);
      updateNoteList(notes);
    } catch (error) {
      console.error('Error loading notes:', error);
      updateNoteList([]);
    }
  },

  async addNote(text) {
    console.log('addNote called with text:', text);
    try {
      const newNote = await api.addNote({ content: text });
      console.log('New note added:', newNote);
      await this.loadNotes(); // 重新加载笔记
    } catch (error) {
      console.error('Error adding note:', error);
    }
  },

  async deleteNote(noteId) {
    try {
      const result = await api.deleteNote(noteId);
      if (result.success) {
        notes = notes.filter(note => note.note_id !== noteId);
        updateNoteList(notes);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
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
}

};

function setupNoteInteractions() {
  document.querySelectorAll('.note-container').forEach(container => {
    const actionsContainer = container.querySelector('.note-actions-container');
    
    container.addEventListener('mouseenter', () => {
      actionsContainer.style.opacity = '1';
      actionsContainer.style.transform = 'translateY(0)';
    });

    container.addEventListener('mouseleave', () => {
      actionsContainer.style.opacity = '0';
      actionsContainer.style.transform = 'translateY(10px)';
    });
  });
}

// 在生成或更新笔记列表后调用此函数
setupNoteInteractions();

export default noteOperations;