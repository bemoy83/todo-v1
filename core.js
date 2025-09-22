// core.js – Updated to use gesture state machine

import { bindCrossSortContainer } from './drag.js';
import { enableSwipe } from './swipe.js';
import { bindMenu } from './menu.js';
import { debounce, safeExecute } from './utils.js';
import { model, saveModel, uid, syncTaskCompletion, isTaskCompleted, optimisticUpdate } from './state.js';
import { setApp } from './rendering.js';
import { startEditMode, startEditTaskTitle } from './editing.js';
import { TaskOperations, focusSubtaskInput } from './taskOperations.js';
import { gestureCoordinator } from './gestureCoordinator.js';

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

// ---- Module state - UPDATED ----
let app = null;
let dragLayer = null;

export { gestureCoordinator as gesture };


// ===== BEHAVIOR WIRING =====
let crossBound = false;

export function bootBehaviors(){
  
  if(!crossBound){ bindCrossSortContainer(); crossBound = true; }
  enableSwipe();

  bindAdders();
  bindMenu();
  bindKeyboardShortcuts();
}

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
          console.log('Save shortcut - store persists automatically');
          break;
        case 'g': // NEW: Toggle gesture debug
          e.preventDefault();
          window.toggleGestureDebug?.();
          break;
      }
    }
    
    // REPLACE this escape key handler:
    if (e.key === 'Escape') {
      document.activeElement?.blur();
      // OLD LINE (remove this):
      // gestureManager.cancel('escape_key');
      
      // NEW LINE (add this):
      gestureCoordinator.cancel('escape_key');
    }
  });
  
  document._keyboardBound = true;
}

function bindAdders(){
  // Main add bar
  const form = document.getElementById('addMainForm');
  if(form && !form._bound){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const inp = document.getElementById('newTaskTitle');
      const title = (inp?.value || '').trim();
      if(!title) return;
      
      try {
        const task = await TaskOperations.task.create(title);
        inp.value = '';
        
        if (task) {
          focusSubtaskInput(task.id);
        }
      } catch (error) {
        console.error('Failed to create task:', error);
      }
    });
    form._bound = true;
  }
  
  // Delegate for per-card subtask add
  app?.addEventListener('submit', function(e){
    const f = e.target.closest('.add-subtask-form');
    if(!f) return;
    e.preventDefault();
    
    const mainId = f.dataset.mainId;
    const input = f.querySelector('input[name="subtask"]');
    const text = (input.value || '').trim();
    if(!text) return;
    
    TaskOperations.subtask.create(mainId, text).then(() => {
      input.value = '';
      
      setTimeout(() => {
        const taskCard = document.querySelector('.task-card[data-id="' + mainId + '"]');
        const subtaskInput = taskCard?.querySelector('.add-sub-input');
        if (subtaskInput) {
          subtaskInput.focus();
        }
      }, 50);
    }).catch(error => {
      console.error('Failed to create subtask:', error);
    });
  }, { once: false });
}

// ===== Shared util for swipe/drag (unchanged) =====
export function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

// UPDATED: Expose start helper so main.js can assign DOM refs
export function setDomRefs(){
  app = document.getElementById('app');
  dragLayer = document.getElementById('dragLayer');
  setApp(app);
}

// 4. UPDATE the cleanup function - REPLACE the gesture cancellation:
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

  gestureCoordinator.forceReset('cleanup');
  
  // Clean up rendering subscription
  import('./rendering.js').then(({ cleanup: cleanupRendering }) => {
    cleanupRendering();
  });
  
  console.log('✅ Cleanup completed');
}