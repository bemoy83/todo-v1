// main.js - Updated for event-driven system

import { setDomRefs, bootBehaviors, cleanup } from './core.js';
// REMOVED: import { renderAll } from './rendering.js'; 
// The new system handles rendering automatically via store subscriptions
import './drag.js';
import './swipe.js';
import './menu.js';

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  // Could show a user-friendly message here
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  e.preventDefault(); // Prevent console spam
});

document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('📱 App starting with event-driven architecture...');
    
    // Set up DOM refs - this will trigger initial render via store subscription
    setDomRefs();
    
    // Boot behaviors - gesture system, menu, etc.
    bootBehaviors();

    console.log('✅ Event-driven app initialized successfully');
    
    // Optional: Add undo/redo keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.target.matches('input, textarea, [contenteditable]')) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          import('./store.js').then(({ store }) => {
            if (store.canUndo()) {
              store.undo();
              console.log('Undid last action');
            }
          });
        } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) {
          e.preventDefault();
          import('./store.js').then(({ store }) => {
            if (store.canRedo()) {
              store.redo();
              console.log('Redid last action');
            }
          });
        }
      }
    });
    
  } catch (error) {
    console.error('App initialization failed:', error);
    // Show fallback UI
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="empty">App failed to load. Please refresh the page.</div>';
    }
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  console.log('🚪 Page unloading, cleaning up...');
  cleanup();
});

console.log('📱 Event-driven app loaded successfully');