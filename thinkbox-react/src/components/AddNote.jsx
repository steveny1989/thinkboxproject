import React, { useState } from 'react';
import noteOperations from '../services/noteOperations';

const AddNote = () => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (content.trim()) {
      try {
        await noteOperations.addNote({ content });
        setContent('');
      } catch (error) {
        console.error('Failed to add note:', error);
        // 可以在这里添加用户提示
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter your note..."
      />
      <button type="submit">Add Note</button>
    </form>
  );
};

export default AddNote;