import NoteAPI from './noteAPI.js';
import TagAPI from './tagAPI.js';
import aiAPI from './AIAPI.js';

const api = {
  notes: NoteAPI,
  tags: TagAPI,
  ai: aiAPI,
};

export default api;