// taskOperationsNew.js - Refactored to use the store
import { store, dispatch } from './store.js';
import { Actions } from './todoStore.js';

// The operations now just dispatch actions and return promises
class TaskOperationsClass {
  async create(title) {
	const oldState = store.getState();
	const newState = dispatch(Actions.task.create(title));
	
	// Find the newly created task
	const newTask = newState.find(task => !oldState.includes(task));
	return newTask;
  }

  async delete(taskId) {
	const task = store.findTask(taskId);
	if (!task) throw new Error(`Task ${taskId} not found`);
	
	if (!confirm(`Delete "${task.title}" and all its subtasks?`)) {
	  return false;
	}
	
	dispatch(Actions.task.delete(taskId));
	return true;
  }

  async update(taskId, changes) {
	const task = store.findTask(taskId);
	if (!task) throw new Error(`Task ${taskId} not found`);
	
	dispatch(Actions.task.update(taskId, changes));
	return store.findTask(taskId);
  }

  async move(fromIndex, toIndex) {
	const state = store.getState();
	if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.length) {
	  throw new Error('Invalid move indices');
	}
	
	dispatch(Actions.task.move(fromIndex, toIndex));
	return true;
  }

  async toggleCompletion(taskId) {
	const task = store.findTask(taskId);
	if (!task) throw new Error(`Task ${taskId} not found`);
	
	dispatch(Actions.task.toggleCompletion(taskId));
	return true;
  }
}

class SubtaskOperationsClass {
  async create(taskId, text) {
	const task = store.findTask(taskId);
	if (!task) throw new Error(`Task ${taskId} not found`);
	
	const oldSubtaskCount = task.subtasks.length;
	dispatch(Actions.subtask.create(taskId, text));
	
	// Return the newly created subtask
	const updatedTask = store.findTask(taskId);
	return updatedTask.subtasks[oldSubtaskCount];
  }

  async delete(taskId, subtaskId) {
	const { task, subtask } = store.findSubtask(taskId, subtaskId);
	if (!task || !subtask) throw new Error(`Subtask ${subtaskId} not found`);
	
	dispatch(Actions.subtask.delete(taskId, subtaskId));
	return true;
  }

  async update(taskId, subtaskId, changes) {
	const { task, subtask } = store.findSubtask(taskId, subtaskId);
	if (!task || !subtask) throw new Error(`Subtask ${subtaskId} not found`);
	
	dispatch(Actions.subtask.update(taskId, subtaskId, changes));
	
	// Return updated subtask
	const { subtask: updatedSubtask } = store.findSubtask(taskId, subtaskId);
	return updatedSubtask;
  }

  async toggle(taskId, subtaskId) {
	const { task, subtask } = store.findSubtask(taskId, subtaskId);
	if (!task || !subtask) throw new Error(`Subtask ${subtaskId} not found`);
	
	dispatch(Actions.subtask.toggle(taskId, subtaskId));
	return true;
  }

  async move(fromTaskId, subtaskId, toTaskId, toIndex) {
	const fromTask = store.findTask(fromTaskId);
	const toTask = store.findTask(toTaskId);
	
	if (!fromTask || !toTask) {
	  throw new Error('Source or target task not found');
	}
	
	const subtask = fromTask.subtasks.find(s => s.id === subtaskId);
	if (!subtask) {
	  throw new Error(`Subtask ${subtaskId} not found`);
	}
	
	dispatch(Actions.subtask.move(fromTaskId, subtaskId, toTaskId, toIndex));
	return true;
  }
}

// Export the operations (same interface as before)
export const TaskOperations = {
  task: new TaskOperationsClass(),
  subtask: new SubtaskOperationsClass(),
  
  // Bulk operations
  bulk: {
	async clearCompleted() {
	  const state = store.getState();
	  let hasCompleted = false;
	  
	  for (const task of state) {
		if (task.subtasks.some(st => st.done)) {
		  hasCompleted = true;
		  break;
		}
	  }
	  
	  if (hasCompleted) {
		// We'd need to add this action type, or handle it differently
		// For now, let's handle it by dispatching individual deletions
		for (const task of state) {
		  const completedSubtasks = task.subtasks.filter(st => st.done);
		  for (const subtask of completedSubtasks) {
			dispatch(Actions.subtask.delete(task.id, subtask.id));
		  }
		}
	  }
	  
	  return hasCompleted;
	},

	export: () => JSON.stringify(store.getState(), null, 2),

	async import(data) {
	  try {
		dispatch(Actions.bulk.import(data));
		return true;
	  } catch (error) {
		console.error('Import failed:', error);
		return false;
	  }
	}
  }
};

// Helper function for auto-focusing subtask input after task creation
export async function focusSubtaskInput(taskId) {
  setTimeout(() => {
	const taskCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
	const subtaskInput = taskCard?.querySelector('.add-sub-input');
	subtaskInput?.focus();
  }, 100);
}