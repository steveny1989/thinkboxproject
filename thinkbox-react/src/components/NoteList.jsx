// src/components/NoteList.js
import React from 'react';
import NoteItem from './NoteItem';

const NoteList = ({ notes }) => {
  return (
    <ul id="noteList">
      {notes.map(note => (
        <NoteItem key={note.id} note={note} />
      ))}
    </ul>
  );
};

export default NoteList;