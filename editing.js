// editing.js - Edit functionality UPDATED with cleanup manager
import { TaskOperations } from './taskOperations.js';
import { cleanupManager } from './cleanupManager.js'; // ← ADD THIS

export function startEditMode(subtaskElement) {
  console.log('Starting edit mode for subtask');
  
  const wrap = subtaskElement.closest('.swipe-wrap');
  const textEl = subtaskElement.querySelector('.sub-text');
  if (!textEl || !wrap) {
    console.log('Missing required elements');
    return;
  }
  
  // Get IDs from data attributes
  const mainId = wrap.dataset.mainId;
  const subId = wrap.dataset.id;
  
  console.log('Edit - mainId:', mainId, 'subId:', subId);
  
  // Get current text from the element (more reliable than model lookup)
  const originalText = textEl.textContent?.trim() || 'Untitled';
  console.log('Original text:', originalText);
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'subtask-edit-input';
  input.style.cssText = `
    width: 100%;
    border: 2px solid #3b82f6;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: inherit;
    font-family: inherit;
    background: white;
    outline: none;
    margin: 0;
    box-sizing: border-box;
    -webkit-user-select: text;
    user-select: text;
  `;
  
  // Replace text element with input
  textEl.style.display = 'none';
  textEl.parentNode.insertBefore(input, textEl);
  
  // Focus and select all text
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
  
  // UPDATED: Save function with cleanup
  const saveEdit = async () => {
    const newText = input.value.trim();
    console.log('Saving edit - new text:', newText);
    
    if (newText && newText !== originalText) {
      try {
        await TaskOperations.subtask.update(mainId, subId, { text: newText });
        console.log('Saved and re-rendering');
      } catch (error) {
        console.error('Failed to update subtask:', error);
        // Restore original display on error
        restoreOriginal();
        alert('Failed to save changes. Please try again.');
        return;
      }
    } else {
      console.log('No changes, restoring original');
      restoreOriginal();
    }
    
    // Clean up event listeners
    cleanup();
  };
  
  // Cancel function
  const cancelEdit = () => {
    console.log('Canceling edit');
    restoreOriginal();
    cleanup();
  };
  
  // Restore original display
  const restoreOriginal = () => {
    textEl.style.display = '';
    if (input.parentNode) {
      input.parentNode.removeChild(input);
    }
  };
  
  // UPDATED: Event listeners with cleanup manager
  const keydownCleanup = cleanupManager.addEventListener(input, 'keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });
  
  const blurCleanup = cleanupManager.addEventListener(input, 'blur', saveEdit);
  
  // Prevent swipe/drag while editing
  const pointerCleanup = cleanupManager.addEventListener(input, 'pointerdown', (e) => {
    e.stopPropagation();
  });
  
  // Cleanup function for this edit session
  const cleanup = () => {
    keydownCleanup();
    blurCleanup();
    pointerCleanup();
  };
  
  // Auto-cleanup after 30 seconds (safety net)
  const timeoutCleanup = cleanupManager.setTimeout(() => {
    console.log('Edit mode timeout - auto-canceling');
    cancelEdit();
  }, 30000);
  
  // Register cleanup with cleanup manager
  cleanupManager.register(() => {
    cleanup();
    cleanupManager.clearTimeout(timeoutCleanup);
  });
}

export function startEditTaskTitle(taskElement) {
  console.log('Starting edit mode for task title');
  
  const card = taskElement.closest('.task-card');
  const titleEl = card.querySelector('.task-title');
  if (!titleEl || !card) {
    console.log('Missing required elements for task edit');
    return;
  }
  
  // Get task ID from data attribute
  const taskId = card.dataset.id;
  
  console.log('Edit task - taskId:', taskId);
  
  // Get current title from the element
  const originalTitle = titleEl.textContent?.trim() || 'Untitled';
  console.log('Original title:', originalTitle);
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalTitle;
  input.className = 'task-title-edit-input';
  input.style.cssText = `
    width: 100%;
    border: 2px solid #3b82f6;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: inherit;
    font-family: inherit;
    font-weight: 800;
    background: white;
    outline: none;
    margin: 0;
    box-sizing: border-box;
    -webkit-user-select: text;
    user-select: text;
  `;
  
  // Replace title element with input
  titleEl.style.display = 'none';
  titleEl.parentNode.insertBefore(input, titleEl);
  
  // Focus and select all text
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
  
  // UPDATED: Save function with cleanup
  const saveEdit = async () => {
    const newTitle = input.value.trim();
    
    if (newTitle && newTitle !== originalTitle) {
      try {
        await TaskOperations.task.update(taskId, { title: newTitle });
        console.log('Task title updated successfully');
      } catch (error) {
        console.error('Failed to update task title:', error);
        restoreOriginal();
        alert('Failed to save changes. Please try again.');
        return;
      }
    } else {
      restoreOriginal();
    }
    
    cleanup();
  };
  
  // Cancel function
  const cancelEdit = () => {
    restoreOriginal();
    cleanup();
  };
  
  // Restore original display
  const restoreOriginal = () => {
    titleEl.style.display = '';
    if (input.parentNode) {
      input.parentNode.removeChild(input);
    }
  };
  
  // UPDATED: Event listeners with cleanup manager
  const keydownCleanup = cleanupManager.addEventListener(input, 'keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });
  
  const blurCleanup = cleanupManager.addEventListener(input, 'blur', saveEdit);
  
  // Prevent swipe/drag while editing
  const pointerCleanup = cleanupManager.addEventListener(input, 'pointerdown', (e) => {
    e.stopPropagation();
  });
  
  // Cleanup function for this edit session
  const cleanup = () => {
    keydownCleanup();
    blurCleanup();
    pointerCleanup();
  };
  
  // Auto-cleanup after 30 seconds (safety net)
  const timeoutCleanup = cleanupManager.setTimeout(() => {
    console.log('Task edit mode timeout - auto-canceling');
    cancelEdit();
  }, 30000);
  
  // Register cleanup with cleanup manager
  cleanupManager.register(() => {
    cleanup();
    cleanupManager.clearTimeout(timeoutCleanup);
  });
}

// BONUS: Helper function for batch editing (future feature)
export async function startBatchEdit(taskIds) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) return;
  
  const action = confirm(
    `Mark all ${taskIds.length} selected tasks as complete?`
  );
  
  if (action) {
    try {
      // Use TaskOperations for consistency
      for (const taskId of taskIds) {
        await TaskOperations.task.toggleCompletion(taskId);
      }
      console.log(`Batch completed ${taskIds.length} tasks`);
    } catch (error) {
      console.error('Batch edit failed:', error);
      alert('Some tasks could not be updated. Please try again.');
    }
  }
}