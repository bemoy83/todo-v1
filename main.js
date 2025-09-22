// main.js - Updated for event-driven system

import { setDomRefs, bootBehaviors, cleanup } from './core.js';
import { gestureManager } from './gestureManager.js';
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
        } else if (e.key === 'g') {
          e.preventDefault();
          // Toggle gesture debug mode
          window.toggleGestureDebug?.();
        } else if (e.key === 'i') {
          e.preventDefault();
          // Show gesture info
          import('./gestureManager.js').then(({ gestureManager }) => {
            console.log('🎯 Gesture State:', gestureManager.getStateInfo());
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

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  gestureManager.enableDebug();
  console.log('🎯 Gesture debug mode enabled for development');
  
  // Add gesture state listener for debugging
  gestureManager.addEventListener('statechange', (e) => {
    const { oldState, newState, event, gestureType } = e.detail;
    if (gestureManager.debugMode) {
      console.log(`🎯 ${oldState} → ${newState} (${event}) [${gestureType || 'none'}]`);
    }
  });
}
// main.js - ADD this test code temporarily (after your existing code)

// main.js - ADD this test code temporarily (after your existing code)

// TEMPORARY TEST CODE - Add this to test the gesture system
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('📱 App starting with simplified gesture system...');
    
    // Import and test gesture coordinator
    import('./gestureCoordinator.js').then(({ gestureCoordinator }) => {
      console.log('✅ Gesture coordinator loaded');
      
      // Enable debug mode in development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        gestureCoordinator.enableDebug();
        console.log('🐛 Debug mode enabled');
      }
      
      // Log gesture events for debugging
      ['start', 'activate', 'complete', 'cancel', 'reset'].forEach(eventName => {
        gestureCoordinator.addEventListener(eventName, (e) => {
          console.log(`🎯 GESTURE ${eventName.toUpperCase()}:`, e.detail);
        });
      });
      
      // Monitor for stuck gestures
      setInterval(() => {
        const state = gestureCoordinator.getState();
        if (state.state !== 'idle' && state.duration > 3000) {
          console.warn('⚠️ Long-running gesture detected:', state);
        }
      }, 2000);
      
      // Test gesture conflict prevention
      window.testGestureConflict = () => {
        console.log('Testing gesture conflict prevention...');
        const result1 = gestureCoordinator.start('drag-subtask', document.body);
        console.log('First gesture start:', result1);
        const result2 = gestureCoordinator.start('swipe-task', document.body);
        console.log('Second gesture start (should fail):', result2);
        gestureCoordinator.forceReset('test');
      };
      
      console.log('🧪 Test functions available:');
      console.log('- window.testGestureConflict()');
      console.log('- Ctrl+Shift+G to toggle debug');
      console.log('- Ctrl+Shift+R to force reset');
      console.log('- Ctrl+Shift+S to show state');
    });
    
    // Set up DOM refs - this will trigger initial render via store subscription
    setDomRefs();
    
    // Boot behaviors - gesture system, menu, etc.
    bootBehaviors();

    console.log('✅ Simplified gesture app initialized successfully');
    
  } catch (error) {
    console.error('App initialization failed:', error);
    // Show fallback UI
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="empty">App failed to load. Please refresh the page.</div>';
    }
  }
});

// REMOVE this temporary test code after confirming everything works