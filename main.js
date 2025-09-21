// main.js - Reverted to original working state

import { setDomRefs, bootBehaviors, cleanup } from './core.js';
import { renderAll } from './rendering.js';
import './drag.js';      // RESTORE this line
import './swipe.js';     // RESTORE this line
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
    console.log('📱 App starting...');
    setDomRefs();
    renderAll();
    bootBehaviors();

    console.log('✅ App initialized successfully');
    
  } catch (error) {
    console.error('App initialization failed:', error);
    // Show fallback UI
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="empty">App failed to load. Please refresh the page.</div>';
    }
  }
});

// RESTORE original cleanup
window.addEventListener('beforeunload', () => {
  console.log('🚪 Page unloading, cleaning up...');
  cleanup(); // This is the original cleanup without gesture manager
});

console.log('📱 Original app loaded successfully');