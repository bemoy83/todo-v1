// cleanupManager.js - FIXED - No more infinite recursion

export class CleanupManager {
  constructor() {
	this.cleanup = new Set();
	this.intervals = new Set();
	this.timeouts = new Set();
	this.observers = new Set();
	this.abortControllers = new Set();
	this.eventListeners = new Map(); // element -> [{ type, listener, options }]
	
	// Auto-cleanup on page unload
	this.setupGlobalCleanup();
  }
  
  // Enhanced event listener tracking
  addEventListener(element, type, listener, options = {}) {
	// Create abort controller for easy cleanup
	const controller = new AbortController();
	const enhancedOptions = { 
	  ...options, 
	  signal: controller.signal 
	};
	
	element.addEventListener(type, listener, enhancedOptions);
	
	// Track for manual cleanup if needed
	if (!this.eventListeners.has(element)) {
	  this.eventListeners.set(element, []);
	}
	this.eventListeners.get(element).push({
	  type, 
	  listener, 
	  options: enhancedOptions,
	  controller
	});
	
	this.abortControllers.add(controller);
	
	// Return cleanup function
	return () => {
	  controller.abort();
	  this.abortControllers.delete(controller);
	  this.removeEventListenerRecord(element, type, listener);
	};
  }
  
  removeEventListenerRecord(element, type, listener) {
	const listeners = this.eventListeners.get(element);
	if (listeners) {
	  const index = listeners.findIndex(l => l.type === type && l.listener === listener);
	  if (index !== -1) {
		listeners.splice(index, 1);
		if (listeners.length === 0) {
		  this.eventListeners.delete(element);
		}
	  }
	}
  }
  
  // FIXED: Enhanced timer management - no recursion
  setTimeout(callback, delay) {
	// Use the NATIVE setTimeout, not our own method
	const id = window.setTimeout(() => {
	  this.timeouts.delete(id);
	  callback();
	}, delay);
	this.timeouts.add(id);
	return id;
  }
  
  setInterval(callback, interval) {
	// Use the NATIVE setInterval, not our own method
	const id = window.setInterval(callback, interval);
	this.intervals.add(id);
	return id;
  }
  
  clearTimeout(id) {
	window.clearTimeout(id); // Use native clearTimeout
	this.timeouts.delete(id);
  }
  
  clearInterval(id) {
	window.clearInterval(id); // Use native clearInterval
	this.intervals.delete(id);
  }
  
  // Observer management
  observeIntersection(element, callback, options = {}) {
	const observer = new IntersectionObserver(callback, options);
	observer.observe(element);
	this.observers.add(observer);
	
	return () => {
	  observer.disconnect();
	  this.observers.delete(observer);
	};
  }
  
  observeMutation(element, callback, options = {}) {
	const observer = new MutationObserver(callback);
	observer.observe(element, options);
	this.observers.add(observer);
	
	return () => {
	  observer.disconnect();
	  this.observers.delete(observer);
	};
  }
  
  // Register cleanup functions
  register(cleanupFn) {
	this.cleanup.add(cleanupFn);
	return () => this.cleanup.delete(cleanupFn);
  }
  
  // Cleanup everything
  cleanupAll() {
	console.log('🧹 Starting comprehensive cleanup...');
	
	// Abort all event listeners
	this.abortControllers.forEach(controller => {
	  try { controller.abort(); } catch (e) { console.warn('Abort failed:', e); }
	});
	this.abortControllers.clear();
	this.eventListeners.clear();
	
	// Clear all timers using NATIVE functions
	this.timeouts.forEach(id => window.clearTimeout(id));
	this.intervals.forEach(id => window.clearInterval(id));
	this.timeouts.clear();
	this.intervals.clear();
	
	// Disconnect observers
	this.observers.forEach(observer => {
	  try { observer.disconnect(); } catch (e) { console.warn('Observer disconnect failed:', e); }
	});
	this.observers.clear();
	
	// Run custom cleanup functions
	this.cleanup.forEach(fn => {
	  try { fn(); } catch (e) { console.warn('Cleanup function failed:', e); }
	});
	this.cleanup.clear();
	
	console.log('✅ Comprehensive cleanup completed');
  }
  
  setupGlobalCleanup() {
	// Cleanup on page unload - use NATIVE addEventListener
	const cleanup = () => this.cleanupAll();
	window.addEventListener('beforeunload', cleanup);
	window.addEventListener('pagehide', cleanup);
	
	// Cleanup on visibility change (iOS background/foreground) - use NATIVE addEventListener
	document.addEventListener('visibilitychange', () => {
	  if (document.visibilityState === 'hidden') {
		// iOS might terminate the app, do quick cleanup
		this.cleanupNonEssential();
	  }
	});
  }
  
  cleanupNonEssential() {
	// Quick cleanup for iOS backgrounding - use NATIVE functions
	this.timeouts.forEach(id => window.clearTimeout(id));
	this.intervals.forEach(id => window.clearInterval(id));
	this.timeouts.clear();
	this.intervals.clear();
  }
  
  // Debug info
  getStats() {
	return {
	  eventListeners: this.eventListeners.size,
	  abortControllers: this.abortControllers.size,
	  timeouts: this.timeouts.size,
	  intervals: this.intervals.size,
	  observers: this.observers.size,
	  cleanupFunctions: this.cleanup.size
	};
  }
}

// Global instance
export const cleanupManager = new CleanupManager();

// Convenience functions - these are safe to export
export const { addEventListener } = cleanupManager;

// IMPORTANT: Don't export setTimeout/setInterval as they would override globals
// Instead, access them via cleanupManager.setTimeout() when needed