// store.js - Global store instance and initialization
import { TodoStore } from './todoStore.js';

// Load initial state from localStorage (keeping your existing logic)
function loadInitialState() {
  try {
	const raw = localStorage.getItem('todo:model');
	if (raw) {
	  const data = JSON.parse(raw);
	  // Keep your existing demo cleanup logic
	  const looksLikeDemo = Array.isArray(data) && data.some(t => t && typeof t.title === 'string' && (
		t.title === 'Ship mobilapp v1.2' || t.title === 'Skriv lanseringsblogg' || t.title === 'Planlegg sprint'
	  ));
	  if (looksLikeDemo) { 
		try { localStorage.removeItem('todo:model'); } catch {}
		return [];
	  }
	  return data;
	}
  } catch (error) {
	console.error('Failed to load initial state:', error);
  }
  return [];
}

// Create the global store instance
export const store = new TodoStore(loadInitialState());

// Export convenience methods
export const { dispatch, getState, subscribe } = store;

// Helper to get current model (for backward compatibility)
export function getModel() {
  return store.getState();
}

// Development helpers
if (typeof window !== 'undefined') {
  window.__TODO_STORE__ = store; // For debugging
  window.__TODO_ACTIONS__ = () => {
	// Import actions dynamically to avoid circular deps
	import('./todoStore.js').then(({ Actions }) => {
	  window.__TODO_ACTIONS__ = Actions;
	});
  };
}