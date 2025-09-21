// core.js – Updated with Gesture Coordinator integration

// Keep existing drag and swipe imports
import { bindCrossSortContainer } from './drag.js';
import { enableSwipe } from './swipe.js';

// ADD gesture coordinator import
import { initializeGestureCoordinator, gestureCoordinator } from './gestureCoordinator.js';

// Keep all existing imports
import { bindMenu } from './menu.js';
import { debounce, safeExecute } from './utils.js';
import { model, saveModel, uid, syncTaskCompletion, isTaskCompleted, optimisticUpdate } from './state.js';
import { setApp } from './rendering.js';
import { renderAll } from './rendering.js';
import { startEditMode, startEditTaskTitle } from './editing.js';
import { TaskOperations, focusSubtaskInput } from './taskOperations.js';

// ===== Helpers (unchanged) =====
export const $  = (s, root=document) => root.querySelector(s);
export const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
export const pt = e => ({ x: e.clientX, y: e.clientY });

// ---- Feature flags & logging (unchanged) ----
export const FLAGS = (function(){
  try {
    const saved = JSON.parse(localStorage.getItem('flags:swipe') || '{}');
    return { swipeGestures: saved.swipeGestures ?? true };
  } catch(_) { return { swipeGestures: true }; }
})();

const DEV = false;
export function log(){ if(DEV) try{ console.log('[todo]', ...arguments); }catch{} }
export function guard(fn){ return function guarded(){ try { return fn.apply(this, arguments); } catch(e){ if(DEV) console.error(e); } }; }

// ---- Module state (unchanged) ----
let app = null;
let dragLayer = null;
// shared gesture state (used by drag.js & swipe.js)
export const gesture = { drag: false, swipe: false };

// ===== UPDATED BEHAVIOR WIRING =====
let crossBound = false;

export function bootBehaviors(){
  console.log('🚀 Starting bootBehaviors with Gesture Coordinator...');
  
  // Initialize existing systems first
  if(!crossBound){ bindCrossSortContainer(); crossBound = true; }
  enableSwipe(); // This needs to run every time to rebind to new DOM elements
  
  // Keep existing bindings
  bindAdders();
  bindMenu();
  bindKeyboardShortcuts();
  
  // ADD: Initialize gesture coordinator after existing systems
  initializeGestureCoordinator();
  
  console.log('✅ bootBehaviors completed with Gesture Coordinator');
}

// Keep all existing functions unchanged...

function bindKeyboardShortcuts() {
  if (document._keyboardBound) return;
  
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when not typing in an input
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    
    if (e.metaKey || e.ctrlKey) {
      switch(e.key) {
        case 'n':
          e.preventDefault();
          document.getElementById('newTaskTitle')?.focus();
          break;
        case 's':
          e.preventDefault();
          // Force save
          saveModel();
          break;
      }
    }
    
    // Escape to clear focus
    if (e.key === 'Escape') {
      document.activeElement?.blur();
    }
  });
  
  document._keyboardBound = true;
}

function bindAdders(){
  // Main add bar - UPDATED to use TaskOperations
  const form = document.getElementById('addMainForm');
  if(form && !form._bound){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const inp = document.getElementById('newTaskTitle');
      const title = (inp?.value || '').trim();
      if(!title) return;
      
      try {
        // Use TaskOperations instead of direct model manipulation
        const task = await TaskOperations.task.create(title);
        inp.value = '';
        
        // Auto-focus the newly created task's subtask input for rapid entry
        if (task) {
          focusSubtaskInput(task.id);
        }
      } catch (error) {
        console.error('Failed to create task:', error);
        // Optionally show user feedback
      }
    });
    form._bound = true;
  }
  
  // Delegate for per-card subtask add - UPDATED to use TaskOperations
  app?.addEventListener('submit', function(e){
    const f = e.target.closest('.add-subtask-form');
    if(!f) return;
    e.preventDefault();
    
    const mainId = f.dataset.mainId;
    const input = f.querySelector('input[name="subtask"]');
    const text = (input.value || '').trim();
    if(!text) return;
    
    // Use TaskOperations instead of direct model manipulation
    TaskOperations.subtask.create(mainId, text).then(() => {
      // Clear input after successful creation
      input.value = '';
      
      // Restore focus to the same input after re-render for rapid entry
      setTimeout(() => {
        const taskCard = document.querySelector('.task-card[data-id="' + mainId + '"]');
        const subtaskInput = taskCard?.querySelector('.add-sub-input');
        if (subtaskInput) {
          subtaskInput.focus();
        }
      }, 50);
    }).catch(error => {
      console.error('Failed to create subtask:', error);
      // Optionally show user feedback
    });
  }, { once: false });
}

// ===== Shared util for swipe/drag (unchanged) =====
export function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

// Expose start helper so main.js can assign DOM refs
export function setDomRefs(){
  app = document.getElementById('app');
  dragLayer = document.getElementById('dragLayer');
  // Pass app to rendering module
  setApp(app);
}

// UPDATED cleanup function
export function cleanup() {
  console.log('🧹 Starting cleanup...');
  
  // Remove any global event listeners
  if (window._resizeHandler) {
    window.removeEventListener('resize', window._resizeHandler);
  }
  
  // Clear any timers
  if (window._resizeTimer) {
    clearTimeout(window._resizeTimer);
  }
  
  // ADD: Clean up gesture coordinator
  if (gestureCoordinator) {
    gestureCoordinator.destroy();
  }
  
  // Reset gesture state (keep for compatibility with old code)
  gesture.drag = false;
  gesture.swipe = false;
  
  console.log('✅ Cleanup completed');
}

export { renderAll } from './rendering.js';