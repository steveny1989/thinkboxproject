import { formatTimestamp } from '../noteHelper.js';
import renderHelpers from '../renderHelpers.js';
import { showLoadingIndicator, hideLoadingIndicator, showErrorMessage } from '../messageManager.js';

export default class NoteListManager {
  constructor(noteOperations) {
    this.noteOperations = noteOperations;
    this.noteList = document.getElementById('noteList');
    this.isGeneratingComment = false;
  }

  updateNoteList(notesToDisplay, append = false) {
    console.log('Updating note list with', notesToDisplay.length, 'notes');
    
    if (!append) {
      this.noteList.innerHTML = '';
    }

    const fragment = document.createDocumentFragment();
    notesToDisplay.forEach(note => {
      const noteElement = this.createNoteElement(note);
      fragment.appendChild(noteElement);
    });

    this.noteList.appendChild(fragment);

    this.setupNoteListeners();

    // 显示 "You've reached the end of your notes" 消息
    const allNotesLoadedElement = document.getElementById('allNotesLoaded');
    if (allNotesLoadedElement && notesToDisplay.length < 24) { // 假设每页加载24条笔记
      allNotesLoadedElement.classList.remove('hidden');
    }
  }

  createNoteElement(note) {
    const noteElement = document.createElement('li');
    noteElement.className = 'note-item';
    noteElement.setAttribute('data-note-id', note.note_id);
    
    const formattedTimestamp = note.created_at ? formatTimestamp(note.created_at) : '';

    noteElement.innerHTML = `
      <div class="note-container">
        <div class="note-content">
          <span class="note-text">${note.content}</span>
          <span class="note-timestamp">${formattedTimestamp}</span>
        </div>
        <div class="dropdown">
          <span class="dropdown-trigger">...</span>
          <div class="dropdown-content">
            <a href="javascript:void(0)" class="delete-note" data-note-id="${note.note_id}">Delete</a>
          </div>
        </div>
      </div>
      <div class="note-tags-container">
        <div id="tags-${note.note_id}" class="note-tags">${renderHelpers.renderTags(note.tags || [])}</div>
      </div>
      <div class="note-actions-container">
        <div class="note-actions">
          <span class="action-wrapper">
            <button class="act-btn comment" data-note-id="${note.note_id}" title="Generate AI comment" tabindex="0" role="button" aria-label="Generate AI comment">
              <i class="fas fa-robot" aria-hidden="true"></i>
              <i class="fas fa-spinner fa-spin" style="display: none;" aria-hidden="true"></i>
            </button>
            <span class="count ${note.comments?.length > 0 ? 'has-comments' : ''}" aria-label="${note.comments?.length || 0} comments">${note.comments?.length || 0}</span>
          </span>
          <span class="act-wrap">
            <button class="act-btn likes" data-note-id="${note.note_id}">
              <i class="fas fa-thumbs-up"></i>
            </button>
            <span class="count">${note.likes || 0}</span>
          </span>
          <span class="act-wrap">
            <button class="act-btn heart" data-note-id="${note.note_id}">
              <i class="fas fa-heart"></i>
            </button>
            <span class="count">${note.hearts || 0}</span>
          </span>
        </div>
        <div class="comments-container" id="comments-${note.note_id}">
          ${note.comments && note.comments.length > 0 ? renderHelpers.renderComments(note.comments) : ''}
        </div>
      </div>
    `;
    return noteElement;
  }

  setupNoteListeners() {
    this.noteList.removeEventListener('click', this.handleNoteListClick);
    this.noteList.addEventListener('click', this.handleNoteListClick.bind(this));
  }

  async handleNoteListClick(event) {
    const actionBtn = event.target.closest('.act-btn');
    if (actionBtn) {
      const noteId = actionBtn.dataset.noteId;
      const isLike = actionBtn.classList.contains('likes');
      const isHeart = actionBtn.classList.contains('heart');
      const isComment = actionBtn.classList.contains('comment');
      
      if (isLike) {
        await this.handleLike(noteId, actionBtn);
      } else if (isHeart) {
        await this.handleHeart(noteId, actionBtn);
      } else if (isComment) {
        await this.handleGenerateComments(noteId, actionBtn);
      }
    }

    const deleteButton = event.target.closest('.delete-note');
    if (deleteButton) {
      const noteId = deleteButton.dataset.noteId;
      await this.handleDeleteNote(noteId);
    }
  }

  async handleLike(noteId, button) {
    const countSpan = button.nextElementSibling;
    let count = parseInt(countSpan.textContent) || 0;
    
    if (button.classList.toggle('active')) {
      count++;
    } else {
      count = Math.max(0, count - 1);
    }
  
    countSpan.textContent = count;
    countSpan.style.color = button.classList.contains('active') ? 'red' : '';
  
    console.log(`Like for note ${noteId}: ${count}`);
    // 这里可以添加与后端通信的逻辑
  }

  async handleHeart(noteId, button) {
    const countSpan = button.nextElementSibling;
    let count = parseInt(countSpan.textContent) || 0;
    
    if (button.classList.toggle('active')) {
      count++;
    } else {
      count = Math.max(0, count - 1);
    }
  
    countSpan.textContent = count;
    countSpan.style.color = button.classList.contains('active') ? 'red' : '';
  
    console.log(`Heart for note ${noteId}: ${count}`);
    // 这里可以添加与后端通信的逻辑
  }

  async handleGenerateComments(noteId, button) {
    if (this.isGeneratingComment) {
      console.log('Comment generation already in progress');
      return;
    }
  
    this.isGeneratingComment = true;
    console.log(`Generating comment for note ${noteId}`);
    const commentsContainer = document.getElementById(`comments-${noteId}`);
    if (!commentsContainer) {
      console.error(`Comments container not found for note ${noteId}`);
      this.isGeneratingComment = false;
      return;
    }
  
    button.disabled = true;
    const spinner = button.querySelector('.fa-spinner');
    if (spinner) spinner.style.display = 'inline-block';
  
    try {
      showLoadingIndicator('AI is thinking...');
  
      const newComment = await this.noteOperations.generateCommentsForNote(noteId);
      console.log('Received new comment:', newComment);
  
      if (newComment && newComment.content) {
        this.addCommentToUI(commentsContainer, newComment, noteId);
      } else {
        throw new Error('New comment is empty or invalid');
      }
    } catch (error) {
      console.error('Error generating comment:', error);
      showErrorMessage('Failed to generate comment');
    } finally {
      hideLoadingIndicator();
      button.disabled = false;
      if (spinner) spinner.style.display = 'none';
      this.isGeneratingComment = false;
    }
  }

  async addCommentToUI(container, comment, noteId) {
    const renderedComment = renderHelpers.renderSingleComment(comment);
    const newCommentElement = document.createElement('div');
    newCommentElement.innerHTML = renderedComment;
    newCommentElement.style.opacity = '0';
    container.appendChild(newCommentElement);

    setTimeout(() => {
      newCommentElement.style.transition = 'opacity 0.5s ease-in';
      newCommentElement.style.opacity = '1';
    }, 10);

    this.updateCommentCount(noteId);
  }

  async updateCommentCount(noteId) {
    const commentCountElement = document.querySelector(`.act-btn.comment[data-note-id="${noteId}"] + .count`);
    if (commentCountElement) {
      const currentCount = parseInt(commentCountElement.textContent) || 0;
      commentCountElement.textContent = currentCount + 1;
    }
  }

  async handleDeleteNote(noteId) {
    console.log(`Deleting note ${noteId}`);
    try {
      await this.noteOperations.deleteNote(noteId);
      const noteElement = document.querySelector(`li[data-note-id="${noteId}"]`);
      if (noteElement) {
        noteElement.remove();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showErrorMessage('Failed to delete note');
    }
  }

  async updateNoteTagsInUI(noteId, tags) {
    const tagContainer = document.getElementById(`tags-${noteId}`);
    if (tagContainer) {
      tagContainer.innerHTML = renderHelpers.renderTags(tags);
    }
  }

  async displayGeneratedTags(noteId, tags) {
    const tagContainer = document.getElementById(`tags-${noteId}`);
    if (tagContainer) {
      tagContainer.innerHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    }
  }

  async applyHighlight(noteElement, searchTerm) {
    const noteText = noteElement.querySelector('.note-text');
    if (noteText) {
      const content = noteText.textContent;
      const highlightedContent = content.replace(new RegExp(searchTerm, 'gi'), match => `<mark>${match}</mark>`);
      noteText.innerHTML = highlightedContent;
    }
  }
}