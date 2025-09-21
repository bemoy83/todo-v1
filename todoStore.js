// todoStore.js - Event-driven state management
import { uid, debounce } from './utils.js';

// Action types
export const ActionTypes = {
  TASK_CREATE: 'TASK_CREATE',
  TASK_DELETE: 'TASK_DELETE',
  TASK_UPDATE: 'TASK_UPDATE',
  TASK_MOVE: 'TASK_MOVE',
  TASK_TOGGLE_COMPLETION: 'TASK_TOGGLE_COMPLETION',
  
  SUBTASK_CREATE: 'SUBTASK_CREATE',
  SUBTASK_DELETE: 'SUBTASK_DELETE',
  SUBTASK_UPDATE: 'SUBTASK_UPDATE',
  SUBTASK_TOGGLE: 'SUBTASK_TOGGLE',
  SUBTASK_MOVE: 'SUBTASK_MOVE',
  
  BULK_IMPORT: 'BULK_IMPORT',
  BULK_CLEAR: 'BULK_CLEAR',
  
  // For undo/redo (future)
  UNDO: 'UNDO',
  REDO: 'REDO'
};

// Action creators
export const Actions = {
  task: {
	create: (title) => ({ type: ActionTypes.TASK_CREATE, payload: { title } }),
	delete: (taskId) => ({ type: ActionTypes.TASK_DELETE, payload: { taskId } }),
	update: (taskId, changes) => ({ type: ActionTypes.TASK_UPDATE, payload: { taskId, changes } }),
	move: (fromIndex, toIndex) => ({ type: ActionTypes.TASK_MOVE, payload: { fromIndex, toIndex } }),
	toggleCompletion: (taskId) => ({ type: ActionTypes.TASK_TOGGLE_COMPLETION, payload: { taskId } })
  },
  
  subtask: {
	create: (taskId, text) => ({ type: ActionTypes.SUBTASK_CREATE, payload: { taskId, text } }),
	delete: (taskId, subtaskId) => ({ type: ActionTypes.SUBTASK_DELETE, payload: { taskId, subtaskId } }),
	update: (taskId, subtaskId, changes) => ({ type: ActionTypes.SUBTASK_UPDATE, payload: { taskId, subtaskId, changes } }),
	toggle: (taskId, subtaskId) => ({ type: ActionTypes.SUBTASK_TOGGLE, payload: { taskId, subtaskId } }),
	move: (fromTaskId, subtaskId, toTaskId, toIndex) => ({ 
	  type: ActionTypes.SUBTASK_MOVE, 
	  payload: { fromTaskId, subtaskId, toTaskId, toIndex } 
	})
  },
  
  bulk: {
	import: (data) => ({ type: ActionTypes.BULK_IMPORT, payload: { data } }),
	clear: () => ({ type: ActionTypes.BULK_CLEAR, payload: {} })
  }
};

// Reducer function
function todoReducer(state, action) {
  const { type, payload } = action;
  
  switch (type) {
	case ActionTypes.TASK_CREATE: {
	  const task = { 
		id: uid('m'), 
		title: payload.title.trim(), 
		subtasks: [],
		completed: false
	  };
	  return [task, ...state];
	}
	
	case ActionTypes.TASK_DELETE: {
	  return state.filter(task => task.id !== payload.taskId);
	}
	
	case ActionTypes.TASK_UPDATE: {
	  return state.map(task => 
		task.id === payload.taskId 
		  ? { ...task, ...payload.changes }
		  : task
	  );
	}
	
	case ActionTypes.TASK_MOVE: {
	  const newState = [...state];
	  const [task] = newState.splice(payload.fromIndex, 1);
	  newState.splice(payload.toIndex, 0, task);
	  return newState;
	}
	
	case ActionTypes.TASK_TOGGLE_COMPLETION: {
	  return state.map(task => {
		if (task.id !== payload.taskId) return task;
		
		if (task.subtasks.length > 0) {
		  const allCompleted = task.subtasks.every(st => st.done);
		  return {
			...task,
			subtasks: task.subtasks.map(st => ({ ...st, done: !allCompleted }))
		  };
		} else {
		  return { ...task, completed: !task.completed };
		}
	  });
	}
	
	case ActionTypes.SUBTASK_CREATE: {
	  const subtask = { 
		id: uid('s'), 
		text: payload.text.trim(), 
		done: false 
	  };
	  
	  return state.map(task =>
		task.id === payload.taskId
		  ? { ...task, subtasks: [...task.subtasks, subtask] }
		  : task
	  );
	}
	
	case ActionTypes.SUBTASK_DELETE: {
	  return state.map(task =>
		task.id === payload.taskId
		  ? { 
			  ...task, 
			  subtasks: task.subtasks.filter(st => st.id !== payload.subtaskId)
			}
		  : task
	  );
	}
	
	case ActionTypes.SUBTASK_UPDATE: {
	  return state.map(task =>
		task.id === payload.taskId
		  ? {
			  ...task,
			  subtasks: task.subtasks.map(st =>
				st.id === payload.subtaskId
				  ? { ...st, ...payload.changes }
				  : st
			  )
			}
		  : task
	  );
	}
	
	case ActionTypes.SUBTASK_TOGGLE: {
	  return state.map(task =>
		task.id === payload.taskId
		  ? {
			  ...task,
			  subtasks: task.subtasks.map(st =>
				st.id === payload.subtaskId
				  ? { ...st, done: !st.done }
				  : st
			  )
			}
		  : task
	  );
	}
	
	case ActionTypes.SUBTASK_MOVE: {
	  // Find source task and subtask
	  const sourceTask = state.find(t => t.id === payload.fromTaskId);
	  const subtask = sourceTask?.subtasks.find(s => s.id === payload.subtaskId);
	  
	  if (!sourceTask || !subtask) return state;
	  
	  return state.map(task => {
		if (task.id === payload.fromTaskId) {
		  // Remove from source
		  return {
			...task,
			subtasks: task.subtasks.filter(s => s.id !== payload.subtaskId)
		  };
		}
		if (task.id === payload.toTaskId) {
		  // Add to target
		  const newSubtasks = [...task.subtasks];
		  newSubtasks.splice(payload.toIndex, 0, subtask);
		  return { ...task, subtasks: newSubtasks };
		}
		return task;
	  });
	}
	
	case ActionTypes.BULK_IMPORT: {
	  try {
		const parsed = JSON.parse(payload.data);
		if (!Array.isArray(parsed)) throw new Error('Invalid format');
		
		return parsed.map(x => ({
		  id: x.id || uid('m'),
		  title: String(x.title || 'Untitled'),
		  completed: !!x.completed,
		  subtasks: Array.isArray(x.subtasks)
			? x.subtasks.map(s => ({ 
				id: s.id || uid('s'), 
				text: String(s.text || ''), 
				done: !!s.done 
			  }))
			: []
		}));
	  } catch (error) {
		console.error('Import failed:', error);
		return state; // Return unchanged state on error
	  }
	}
	
	case ActionTypes.BULK_CLEAR: {
	  return [];
	}
	
	default:
	  return state;
  }
}

// Main TodoStore class
export class TodoStore extends EventTarget {
  constructor(initialState = []) {
	super();
	this._state = initialState;
	this._history = [initialState]; // For undo/redo
	this._historyIndex = 0;
	
	// Debounced persistence
	this._debouncedSave = debounce(() => this._persist(), 300);
	
	// Bind methods
	this.dispatch = this.dispatch.bind(this);
	this.getState = this.getState.bind(this);
	this.subscribe = this.subscribe.bind(this);
  }
  
  getState() {
	return this._state;
  }
  
  dispatch(action) {
	console.log('Dispatching action:', action.type, action.payload);
	
	const oldState = this._state;
	const newState = todoReducer(oldState, action);
	
	// Only update if state actually changed
	if (newState !== oldState) {
	  this._state = newState;
	  
	  // Add to history (truncate if we're not at the end)
	  this._history = this._history.slice(0, this._historyIndex + 1);
	  this._history.push(newState);
	  this._historyIndex++;
	  
	  // Limit history size
	  if (this._history.length > 50) {
		this._history.shift();
		this._historyIndex--;
	  }
	  
	  // Persist to localStorage
	  this._debouncedSave();
	  
	  // Emit change event
	  this.dispatchEvent(new CustomEvent('change', {
		detail: {
		  action,
		  oldState,
		  newState,
		  timestamp: Date.now()
		}
	  }));
	  
	  console.log('State updated. Tasks:', newState.length);
	}
	
	return newState;
  }
  
  subscribe(listener) {
	this.addEventListener('change', listener);
	
	// Return unsubscribe function
	return () => this.removeEventListener('change', listener);
  }
  
  // Undo/redo functionality
  canUndo() {
	return this._historyIndex > 0;
  }
  
  canRedo() {
	return this._historyIndex < this._history.length - 1;
  }
  
  undo() {
	if (this.canUndo()) {
	  this._historyIndex--;
	  this._state = this._history[this._historyIndex];
	  this._debouncedSave();
	  
	  this.dispatchEvent(new CustomEvent('change', {
		detail: {
		  action: { type: ActionTypes.UNDO },
		  oldState: this._history[this._historyIndex + 1],
		  newState: this._state,
		  timestamp: Date.now()
		}
	  }));
	}
  }
  
  redo() {
	if (this.canRedo()) {
	  this._historyIndex++;
	  this._state = this._history[this._historyIndex];
	  this._debouncedSave();
	  
	  this.dispatchEvent(new CustomEvent('change', {
		detail: {
		  action: { type: ActionTypes.REDO },
		  oldState: this._history[this._historyIndex - 1],
		  newState: this._state,
		  timestamp: Date.now()
		}
	  }));
	}
  }
  
  _persist() {
	try {
	  localStorage.setItem('todo:model', JSON.stringify(this._state));
	} catch (error) {
	  console.error('Failed to persist state:', error);
	}
  }
  
  // Helper methods
  findTask(taskId) {
	return this._state.find(task => task.id === taskId);
  }
  
  findSubtask(taskId, subtaskId) {
	const task = this.findTask(taskId);
	const subtask = task?.subtasks.find(s => s.id === subtaskId);
	return { task, subtask };
  }
}