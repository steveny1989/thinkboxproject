// noteHelpers.js

export function validateNoteText(noteText) {
    return noteText && noteText.trim().length > 0;
  }
  
  export function saveTagsToLocalStorage(tagsMap) {
    localStorage.setItem('noteTags', JSON.stringify(Array.from(tagsMap.entries())));
  }
  
  export function loadTagsFromLocalStorage() {
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
  
  export function loadNotesFromLocalStorage() {
    const savedNotes = localStorage.getItem('notes');
    return savedNotes ? JSON.parse(savedNotes) : [];
  }
  
  export function mergeNotes(localNotes, serverNotes) {
    const mergedNotes = [...serverNotes];
    for (const localNote of localNotes) {
      if (!serverNotes.some(note => note.note_id === localNote.note_id)) {
        mergedNotes.push(localNote);
      }
    }
    return mergedNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  export function getTagsFromLocalStorage(noteId, generatedTagsMap) {
    return generatedTagsMap.get(noteId) || [];
  }
  
  export function cleanupGeneratedTags(generatedTagsMap, currentNoteIds) {
    for (const noteId of generatedTagsMap.keys()) {
      if (!currentNoteIds.includes(noteId)) {
        generatedTagsMap.delete(noteId);
      }
    }
    saveTagsToLocalStorage(generatedTagsMap);
  }
  
  export function saveNotesToLocalStorage(notes) {
    localStorage.setItem('notes', JSON.stringify(notes));
  }
  
  // 如果有其他辅助函数，也可以添加到这里