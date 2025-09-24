// state.js - CLEANED UP - Removed unused backward compatibility layer
import { store } from './store.js';
import { debounce } from './utils.js';

// Keep only the utilities that are actually used
export { uid } from './utils.js'; // Still used in various places

// Keep existing helper functions that are still useful
export function syncTaskCompletion(task) {
  if (task.subtasks.length === 0) {
    return;
  }
  
  const allSubtasksDone = task.subtasks.every(st => st.done);
  task.completed = allSubtasksDone;
}

export function isTaskCompleted(task) {
  return task.completed || false;
}

export function optimisticUpdate(taskId, changes) {
  const state = store.getState();
  const task = state.find(x => x.id === taskId);
  if (task) {
    console.warn('optimisticUpdate called. Consider using TaskOperations.task.update instead.');
    return { ...task, ...changes };
  }
}

// Keep these for any legacy calls, but they're now no-ops since store handles persistence
export const debouncedSave = debounce(() => {
  console.log('debouncedSave called - store handles persistence automatically');
}, 300);

export function saveModel() { 
  console.log('saveModel called - store handles persistence automatically');
}

export function loadModel() {
  return store.getState();
}

// REMOVED: 
// - The Proxy-based model export (unused)
// - Complex backward compatibility layer
// - Potential memory leaks from the Proxy