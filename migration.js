// migration.js - Helper script for gradual migration
// Add this temporarily to test the new system alongside the old one

import { store } from './store.js';
import { Actions } from './todoStore.js';

// Migration utilities
export const Migration = {
  // Test the new system alongside the old
  async testNewSystem() {
	console.log('🧪 Testing new event-driven system...');
	
	// Save current state
	const originalState = JSON.stringify(localStorage.getItem('todo:model'));
	
	try {
	  // Test creating a task
	  console.log('Testing task creation...');
	  const beforeCount = store.getState().length;
	  store.dispatch(Actions.task.create('Test Task'));
	  const afterCount = store.getState().length;
	  console.log(`✅ Task creation: ${beforeCount} -> ${afterCount}`);
	  
	  // Test creating a subtask
	  const tasks = store.getState();
	  if (tasks.length > 0) {
		console.log('Testing subtask creation...');
		const taskId = tasks[0].id;
		const beforeSubtasks = tasks[0].subtasks.length;
		store.dispatch(Actions.subtask.create(taskId, 'Test Subtask'));
		const afterSubtasks = store.getState().find(t => t.id === taskId).subtasks.length;
		console.log(`✅ Subtask creation: ${beforeSubtasks} -> ${afterSubtasks}`);
	  }
	  
	  // Test undo
	  console.log('Testing undo...');
	  if (store.canUndo()) {
		store.undo();
		console.log('✅ Undo worked');
	  }
	  
	  // Test redo
	  console.log('Testing redo...');
	  if (store.canRedo()) {
		store.redo();
		console.log('✅ Redo worked');
	  }
	  
	  console.log('🎉 All tests passed!');
	  
	} catch (error) {
	  console.error('❌ Test failed:', error);
	  // Restore original state
	  if (originalState) {
		localStorage.setItem('todo:model', originalState);
	  }
	}
  },
  
  // Compare old vs new performance
  async performanceComparison() {
	console.log('⏱️ Performance comparison...');
	
	// Measure old system (if still available)
	const oldStart = performance.now();
	// Would call old renderAll here
	const oldEnd = performance.now();
	
	// Measure new system
	const newStart = performance.now();
	store.dispatch(Actions.task.create('Performance Test'));
	const newEnd = performance.now();
	
	console.log(`Old system: ${oldEnd - oldStart}ms`);
	console.log(`New system: ${newEnd - newStart}ms`);
  },
  
  // Validate data integrity
  validateDataIntegrity() {
	const state = store.getState();
	let issues = [];
	
	state.forEach((task, i) => {
	  if (!task.id) issues.push(`Task ${i} missing ID`);
	  if (!task.title) issues.push(`Task ${i} missing title`);
	  if (!Array.isArray(task.subtasks)) issues.push(`Task ${i} subtasks not array`);
	  
	  task.subtasks.forEach((subtask, j) => {
		if (!subtask.id) issues.push(`Task ${i} subtask ${j} missing ID`);
		if (!subtask.text) issues.push(`Task ${i} subtask ${j} missing text`);
		if (typeof subtask.done !== 'boolean') issues.push(`Task ${i} subtask ${j} done not boolean`);
	  });
	});
	
	if (issues.length === 0) {
	  console.log('✅ Data integrity check passed');
	} else {
	  console.warn('⚠️ Data integrity issues:', issues);
	}
	
	return issues;
  },
  
  // Enable debugging mode
  enableDebugMode() {
	// Add store to window for debugging
	window.__STORE__ = store;
	window.__ACTIONS__ = Actions;
	
	// Log all actions
	store.addEventListener('change', (e) => {
	  console.log('🔄 Store changed:', e.detail.action.type, e.detail);
	});
	
	console.log('🐛 Debug mode enabled. Use window.__STORE__ and window.__ACTIONS__');
  },
  
  // Export current state for backup
  exportForBackup() {
	const state = store.getState();
	const backup = {
	  version: '2.0.0',
	  timestamp: new Date().toISOString(),
	  data: state,
	  metadata: {
		taskCount: state.length,
		subtaskCount: state.reduce((sum, task) => sum + task.subtasks.length, 0)
	  }
	};
	
	console.log('📦 Backup created:', backup);
	return JSON.stringify(backup, null, 2);
  }
};

// Auto-run basic validation on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
	Migration.validateDataIntegrity();
  }, 1000);
}