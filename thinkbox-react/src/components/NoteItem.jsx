// src/components/NoteItem.js
import React from 'react';
import { noteOperations } from '../services/noteOperations';

const NoteItem = ({ note }) => {
  return (
    <div className="note-item">
      <div dangerouslySetInnerHTML={{ __html: note.content }}></div>
      {/* 其他笔记项目内容 */}
    </div>
  );
};

export default NoteItem;