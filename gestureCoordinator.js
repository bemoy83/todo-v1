// gestureCoordinator.js - Simplified state machine approach
export class GestureCoordinator extends EventTarget {
  constructor() {
	super();
	
	// Simple states
	this.state = 'idle';
	this.activeGesture = null;
	this.element = null;
	this.startTime = 0;
	this.debugMode = false;
	
	// Simple cleanup registry
	this.cleanupFunctions = new Set();
	
	// Timeout protection
	this.timeoutId = null;
	this.GESTURE_TIMEOUT = 5000; // 5 seconds max
	
	// Bind methods
	this.start = this.start.bind(this);
	this.complete = this.complete.bind(this);
	this.cancel = this.cancel.bind(this);
  }
  
  // ===== PUBLIC API =====
  
  /**
   * Start a new gesture
   * @param {string} gestureType - 'drag-task', 'drag-subtask', 'swipe-task', 'swipe-subtask'
   * @param {Element} element - DOM element being manipulated
   * @param {Object} data - Additional gesture data
   * @returns {boolean} - true if started successfully
   */
  start(gestureType, element, data = {}) {
	if (this.state !== 'idle') {
	  this.log(`❌ Cannot start ${gestureType}: currently ${this.state} with ${this.activeGesture}`);
	  return false;
	}
	
	this.state = 'armed';
	this.activeGesture = gestureType;
	this.element = element;
	this.startTime = performance.now();
	
	// Start timeout protection
	this._startTimeout();
	
	this.log(`🎯 Started: ${gestureType}`);
	this._emit('start', { gestureType, element, data });
	
	return true;
  }
  
  /**
   * Transition to active gesture state
   * @returns {boolean} - true if transitioned successfully
   */
  activate() {
	if (this.state !== 'armed') {
	  this.log(`❌ Cannot activate: expected armed, got ${this.state}`);
	  return false;
	}
	
	const gestureState = this.activeGesture.includes('drag') ? 'dragging' : 'swiping';
	this.state = gestureState;
	
	this.log(`🔄 Activated: ${this.activeGesture} → ${gestureState}`);
	this._emit('activate', { gestureType: this.activeGesture, element: this.element });
	
	return true;
  }
  
  /**
   * Complete the current gesture successfully
   */
  complete() {
	if (this.state === 'idle') {
	  this.log('⚠️ Complete called but already idle');
	  return;
	}
	
	const completedGesture = this.activeGesture;
	const completedElement = this.element;
	const duration = performance.now() - this.startTime;
	
	this._reset();
	
	this.log(`✅ Completed: ${completedGesture} (${Math.round(duration)}ms)`);
	this._emit('complete', { gestureType: completedGesture, element: completedElement, duration });
  }
  
  /**
   * Cancel the current gesture
   * @param {string} reason - Why the gesture was cancelled
   */
  cancel(reason = 'manual') {
	if (this.state === 'idle') {
	  this.log(`⚠️ Cancel called but already idle (${reason})`);
	  return;
	}
	
	const cancelledGesture = this.activeGesture;
	const cancelledElement = this.element;
	
	this._reset();
	
	this.log(`🛑 Cancelled: ${cancelledGesture} (${reason})`);
	this._emit('cancel', { gestureType: cancelledGesture, element: cancelledElement, reason });
  }
  
  /**
   * Emergency reset - use when things go wrong
   * @param {string} reason - Why we're force resetting
   */
  forceReset(reason = 'force') {
	this.log(`🚨 Force reset: ${reason}`);
	this._reset();
	this._emit('reset', { reason });
  }
  
  // ===== QUERY METHODS =====
  
  canStart(gestureType) {
	return this.state === 'idle';
  }
  
  isActive() {
	return this.state !== 'idle';
  }
  
  isGesture(gestureType) {
	return this.activeGesture === gestureType;
  }
  
  getState() {
	return {
	  state: this.state,
	  activeGesture: this.activeGesture,
	  element: this.element,
	  duration: this.startTime ? performance.now() - this.startTime : 0
	};
  }
  
  // ===== CLEANUP MANAGEMENT =====
  
  /**
   * Register a cleanup function to run when gesture ends
   * @param {Function} cleanupFn - Function to call on cleanup
   * @returns {Function} - Unregister function
   */
  onCleanup(cleanupFn) {
	this.cleanupFunctions.add(cleanupFn);
	return () => this.cleanupFunctions.delete(cleanupFn);
  }
  
  // ===== DEBUGGING =====
  
  enableDebug() {
	this.debugMode = true;
	this.log('🐛 Debug mode enabled');
  }
  
  disableDebug() {
	this.debugMode = false;
  }
  
  log(...args) {
	if (this.debugMode) {
	  console.log('[GestureCoordinator]', ...args);
	}
  }
  
  // ===== PRIVATE METHODS =====
  
  _reset() {
	this._clearTimeout();
	this._runCleanup();
	
	this.state = 'idle';
	this.activeGesture = null;
	this.element = null;
	this.startTime = 0;
  }
  
  _runCleanup() {
	this.cleanupFunctions.forEach(fn => {
	  try {
		fn();
	  } catch (error) {
		console.error('Cleanup function failed:', error);
	  }
	});
	this.cleanupFunctions.clear();
  }
  
  _startTimeout() {
	this._clearTimeout();
	this.timeoutId = setTimeout(() => {
	  this.log(`⏰ Gesture timeout after ${this.GESTURE_TIMEOUT}ms`);
	  this.forceReset('timeout');
	}, this.GESTURE_TIMEOUT);
  }
  
  _clearTimeout() {
	if (this.timeoutId) {
	  clearTimeout(this.timeoutId);
	  this.timeoutId = null;
	}
  }
  
  _emit(eventName, data) {
	this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
}

// ===== GESTURE HELPER FUNCTIONS =====

/**
 * Create a standardized gesture handler
 * @param {GestureCoordinator} coordinator 
 * @param {string} gestureType 
 * @returns {Object} - Handler functions
 */
export function createGestureHandler(coordinator, gestureType) {
   let pointerStartData = null;
   
   return {
	 // Method names that match what drag.js expects
	 start(element, startPoint, additionalData = {}) {
	   if (!coordinator.canStart(gestureType)) {
		 return false;
	   }
	   
	   pointerStartData = { element, startPoint, ...additionalData };
	   
	   return coordinator.start(gestureType, element, {
		 startPoint,
		 ...additionalData
	   });
	 },
	 
	 activate() {
	   return coordinator.activate();
	 },
	 
	 complete() {
	   coordinator.complete();
	   pointerStartData = null;
	 },
	 
	 cancel(reason) {
	   coordinator.cancel(reason);
	   pointerStartData = null;
	 },
	 
	 isActive() {
	   return coordinator.isGesture(gestureType);
	 },
	 
	 getStartData() {
	   return pointerStartData;
	 },
	 
	 // Keep the old method names for backward compatibility if needed
	 onStart(element, startPoint, additionalData = {}) {
	   return this.start(element, startPoint, additionalData);
	 },
	 
	 onActivate() {
	   return this.activate();
	 },
	 
	 onComplete() {
	   this.complete();
	 },
	 
	 onCancel(reason) {
	   this.cancel(reason);
	 }
   };
 }

// ===== GLOBAL COORDINATOR INSTANCE =====

export const gestureCoordinator = new GestureCoordinator();

// ===== DEVELOPMENT HELPERS =====

if (typeof window !== 'undefined') {
  // Global access for debugging
  window.__GESTURE_COORDINATOR__ = gestureCoordinator;
  
  // Keyboard shortcuts for development
  document.addEventListener('keydown', (e) => {
	// Ctrl+Shift+G to toggle debug
	if (e.ctrlKey && e.shiftKey && e.key === 'G') {
	  e.preventDefault();
	  if (gestureCoordinator.debugMode) {
		gestureCoordinator.disableDebug();
		console.log('🔇 Gesture debug disabled');
	  } else {
		gestureCoordinator.enableDebug();
		console.log('🔊 Gesture debug enabled');
	  }
	}
	
	// Ctrl+Shift+R to force reset
	if (e.ctrlKey && e.shiftKey && e.key === 'R') {
	  e.preventDefault();
	  gestureCoordinator.forceReset('manual');
	}
	
	// Ctrl+Shift+S to show state
	if (e.ctrlKey && e.shiftKey && e.key === 'S') {
	  e.preventDefault();
	  console.log('🎯 Gesture State:', gestureCoordinator.getState());
	}
  });
  
  // Auto-enable debug in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
	gestureCoordinator.enableDebug();
	
	// Log all gesture events
	['start', 'activate', 'complete', 'cancel', 'reset'].forEach(eventName => {
	  gestureCoordinator.addEventListener(eventName, (e) => {
		console.log(`🎯 ${eventName.toUpperCase()}:`, e.detail);
	  });
	});
	
	// Warn about stuck gestures
	setInterval(() => {
	  const state = gestureCoordinator.getState();
	  if (state.state !== 'idle' && state.duration > 3000) {
		console.warn('⚠️ Long-running gesture detected:', state);
	  }
	}, 2000);
  }
}
