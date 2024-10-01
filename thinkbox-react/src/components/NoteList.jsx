// src/components/NoteList.js
import React, { useState, useEffect } from 'react';
import { noteOperations } from '../services/noteOperations';

const NoteList = () => {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const handleNotesUpdate = (updatedNotes) => {
      setNotes(updatedNotes);
    };

    noteOperations.addListener(handleNotesUpdate);
    noteOperations.loadNotes();

    return () => noteOperations.removeListener(handleNotesUpdate);
  }, []);

  return (
    <div className="note-list">
      {notes.map(note => (
        <NoteItem key={note.id} note={note} />
      ))}
    </div>
  );
};

export default NoteList;