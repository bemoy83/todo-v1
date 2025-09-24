// main.js - UPDATED with built-in cleanup tests

import { setDomRefs, bootBehaviors, cleanup } from './core.js';
import { cleanupManager } from './cleanupManager.js';
import './drag.js';
import './swipe.js';
import './menu.js';

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  e.preventDefault();
});

document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('📱 App starting with cleanup manager...');
    
    // Set up DOM refs
    setDomRefs();
    
    // Boot behaviors
    bootBehaviors();

    console.log('✅ App initialized successfully');
    
    // Add undo/redo keyboard shortcuts with cleanup manager
    setupUndoRedoShortcuts();
    
    // Run cleanup verification in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setTimeout(verifyCleanupImplementation, 2000); // Wait 2 seconds for app to fully load
    }
    
  } catch (error) {
    console.error('App initialization failed:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="empty">App failed to load. Please refresh the page.</div>';
    }
  }
});

function setupUndoRedoShortcuts() {
  const unsubscribe = cleanupManager.addEventListener(document, 'keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.target.matches('input, textarea, [contenteditable]')) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        import('./store.js').then(({ store }) => {
          if (store.canUndo()) {
            store.undo();
            console.log('↶ Undid last action');
          }
        });
      } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) {
        e.preventDefault();
        import('./store.js').then(({ store }) => {
          if (store.canRedo()) {
            store.redo();
            console.log('↷ Redid last action');
          }
        });
      }
    }
  });
  
  cleanupManager.register(unsubscribe);
}

// BUILT-IN CLEANUP VERIFICATION
function verifyCleanupImplementation() {
  console.log('\n🧪 Verifying cleanup manager implementation...');
  
  // Check if cleanup manager is available
  if (typeof cleanupManager === 'undefined') {
    console.error('❌ cleanupManager not found! Check your import.');
    return;
  }
  
  // Get initial stats
  const stats = cleanupManager.getStats();
  console.log('📊 Cleanup Manager Stats:', stats);
  
  // Verify we have some listeners (from the app)
  if (stats.eventListeners > 0) {
    console.log('✅ App is using cleanup manager for event listeners');
  } else {
    console.warn('⚠️ No event listeners detected. App may not be using cleanup manager yet.');
  }
  
  // Test basic functionality
  testBasicCleanupFunction();
  
  // Set up monitoring
  setupCleanupMonitoring();
}

function testBasicCleanupFunction() {
  console.log('\n🔬 Testing basic cleanup functionality...');
  
  const initialStats = cleanupManager.getStats();
  
  // Create a test element and add listener
  const testDiv = document.createElement('div');
  testDiv.id = 'cleanup-test-element';
  document.body.appendChild(testDiv);
  
  const unsubscribe = cleanupManager.addEventListener(testDiv, 'click', () => {
    console.log('Test click handler');
  });
  
  const afterStats = cleanupManager.getStats();
  
  if (afterStats.eventListeners > initialStats.eventListeners) {
    console.log('✅ Event listener tracking working');
  } else {
    console.log('❌ Event listener tracking NOT working');
  }
  
  // Clean up test
  unsubscribe();
  document.body.removeChild(testDiv);
  
  const finalStats = cleanupManager.getStats();
  
  if (finalStats.eventListeners <= initialStats.eventListeners) {
    console.log('✅ Event listener cleanup working');
  } else {
    console.log('❌ Event listener cleanup NOT working');
  }
}

function setupCleanupMonitoring() {
  let lastStats = cleanupManager.getStats();
  
  setInterval(() => {
    const currentStats = cleanupManager.getStats();
    
    // Check for significant increases that might indicate leaks
    const listenerIncrease = currentStats.eventListeners - lastStats.eventListeners;
    const timeoutIncrease = currentStats.timeouts - lastStats.timeouts;
    
    if (listenerIncrease > 10) {
      console.warn(`⚠️ Event listeners increased by ${listenerIncrease} (possible leak)`);
    }
    
    if (timeoutIncrease > 5) {
      console.warn(`⚠️ Timeouts increased by ${timeoutIncrease} (possible leak)`);
    }
    
    // Log stats every minute in development
    if (Date.now() % 60000 < 10000) { // Roughly every minute
      console.log('📊 Periodic cleanup stats:', currentStats);
    }
    
    lastStats = currentStats;
  }, 10000); // Check every 10 seconds
}

// Enhanced cleanup on page unload
const handlePageUnload = () => {
  console.log('🚪 Page unloading, cleaning up...');
  const finalStats = cleanupManager.getStats();
  console.log('📊 Final cleanup stats before unload:', finalStats);
  cleanup();
};

window.addEventListener('beforeunload', handlePageUnload);
window.addEventListener('pagehide', handlePageUnload);

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Expose for debugging
  window.__CLEANUP_MANAGER__ = cleanupManager;
  
  // Add helpful console commands
  window.checkCleanupStats = () => {
    const stats = cleanupManager.getStats();
    console.log('📊 Current Cleanup Stats:', stats);
    
    if (stats.eventListeners > 50) {
      console.warn('⚠️ High number of event listeners detected');
    }
    
    if (stats.timeouts > 10) {
      console.warn('⚠️ High number of timeouts detected');
    }
    
    return stats;
  };
  
  window.testCleanup = () => {
    console.log('🧪 Running manual cleanup test...');
    testBasicCleanupFunction();
  };
  
  window.forceCleanup = () => {
    console.log('🧹 Forcing complete cleanup...');
    cleanupManager.cleanupAll();
    console.log('✅ Cleanup completed');
  };
  
  console.log(`
🔧 Development Mode - Cleanup Manager
    
Available commands:
- checkCleanupStats()  - Check current stats
- testCleanup()        - Run basic test
- forceCleanup()       - Force complete cleanup
- __CLEANUP_MANAGER__  - Direct access to cleanup manager

The app will automatically verify cleanup implementation in 2 seconds...
  `);
}

console.log('📱 App loaded with cleanup manager');