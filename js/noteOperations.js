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

  // async generateFeedbackForNote(noteId, content) {
  //   console.log('generateFeedbackForNote called with:', noteId, content);
  //   try {
  //     const feedbackResponse = await api.generateFeedback(noteId, content);
  //     console.log('Feedback generated:', feedbackResponse);
  //     if (feedbackResponse.feedbackText) {
  //       await api.storeFeedback(noteId, feedbackResponse.feedbackText);
  //       updateFeedback(noteId, feedbackResponse.feedbackText);
  //     } else {
  //       console.error('Generated feedback text is undefined');
  //     }
  //   } catch (error) {
  //     console.error('Error generating feedback:', error);
  //   }
  // },

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

  // async fetchFeedbacks() {
  //   console.log('fetchFeedbacks called');
  //   const user = auth.currentUser;
  //   if (!user) {
  //     console.log('No user logged in, skipping feedback loading');
  //     return;
  //   }
  //   try {
  //     const feedbacks = await api.getFeedbacks(); // 确保这个函数能正确获取反馈
  //     console.log('Feedbacks loaded:', feedbacks);
  //     feedbacks.forEach(feedback => {
  //       if (feedback.feedbackText) {
  //         updateFeedback(feedback.noteId, feedback.feedbackText);
  //       } else {
  //         console.error(`Feedback text for note ${feedback.noteId} is undefined`);
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Error fetching feedbacks:', error);
  //   }
  // },

  async searchNotes(query) {
    try {
      const matchingNotes = await api.searchNotes(query);
      updateNoteList(matchingNotes);
    } catch (error) {
      console.error('Error searching notes:', error);
      updateNoteList([]);
    }
  }
};

export default noteOperations;