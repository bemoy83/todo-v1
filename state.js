// state.js - UPDATED to use new store (backward compatibility layer)
import { store, getModel } from './store.js';
import { debounce } from './utils.js';

// Keep existing exports for backward compatibility
export function uid(prefix='id'){ 
  return `${prefix}-${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-2)}`; 
}

// Backward compatibility: export model as a getter that always returns current state
export const model = new Proxy([], {
  get(target, prop) {
    const currentState = store.getState();
    
    // Handle array methods and properties
    if (prop in Array.prototype || prop === 'length' || typeof prop === 'symbol') {
      return currentState[prop];
    }
    
    // Handle numeric indices
    if (!isNaN(prop)) {
      return currentState[prop];
    }
    
    return currentState[prop];
  },
  
  set() {
    console.warn('Direct model mutation detected! Use TaskOperations instead.');
    return false; // Prevent direct mutations
  }
});

// Backward compatibility: keep existing functions
export function loadModel(){
  return store.getState();
}

// Updated to work with store
export const debouncedSave = debounce(() => {
  // Store handles its own persistence, but keep this for any external calls
  console.log('debouncedSave called - store handles persistence automatically');
}, 300);

export function saveModel(){ 
  // Store handles its own persistence, but keep this for backward compatibility
  console.log('saveModel called - store handles persistence automatically');
}

// Keep existing helper functions
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
    // Instead of direct mutation, suggest using TaskOperations
    console.warn('optimisticUpdate called. Consider using TaskOperations.task.update instead.');
    return { ...task, ...changes };
  }
}