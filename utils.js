// utils.js - Shared utility functions

// Add the uid function here so both old and new systems can use it
export function uid(prefix='id'){ 
  return `${prefix}-${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-2)}`; 
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
	const later = () => {
	  clearTimeout(timeout);
	  func(...args);
	};
	clearTimeout(timeout);
	timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function() {
	const args = arguments;
	const context = this;
	if (!inThrottle) {
	  func.apply(context, args);
	  inThrottle = true;
	  setTimeout(() => inThrottle = false, limit);
	}
  }
}

export function safeExecute(fn, fallback = () => {}) {
  try {
	return fn();
  } catch (error) {
	console.error('Safe execute failed:', error);
	return fallback();
  }
}