// iosOptimizations.js - iOS-specific performance and UX improvements
import { TIMING, UI } from './constants.js';

class iOSOptimizer {
  constructor() {
	this.isIOS = this.detectIOS();
	this.safariVersion = this.getSafariVersion();
	this.deviceMetrics = this.getDeviceMetrics();
	
	if (this.isIOS) {
	  this.applyOptimizations();
	}
  }

  detectIOS() {
	return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
		   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  getSafariVersion() {
	const match = navigator.userAgent.match(/Version\/(\d+)/);
	return match ? parseInt(match[1]) : 0;
  }

  getDeviceMetrics() {
	return {
	  pixelRatio: window.devicePixelRatio || 1,
	  screenWidth: screen.width,
	  screenHeight: screen.height,
	  viewportWidth: window.innerWidth,
	  viewportHeight: window.innerHeight,
	  safeAreaTop: this.getSafeAreaInset('top'),
	  safeAreaBottom: this.getSafeAreaInset('bottom')
	};
  }

  getSafeAreaInset(side) {
	const element = document.createElement('div');
	element.style.cssText = `
	  position: fixed;
	  top: 0;
	  left: 0;
	  width: 1px;
	  height: 1px;
	  padding-${side}: env(safe-area-inset-${side});
	  box-sizing: border-box;
	  visibility: hidden;
	`;
	document.body.appendChild(element);
	const inset = side === 'top' || side === 'bottom' 
	  ? element.offsetHeight - 1 
	  : element.offsetWidth - 1;
	document.body.removeChild(element);
	return inset;
  }

  applyOptimizations() {
	this.optimizeViewport();
	this.optimizeScrolling();
	this.optimizeTouch();
	this.optimizeAnimations();
	this.preventZoom();
	this.optimizeMemory();
  }

  optimizeViewport() {
	// Dynamic viewport height for iOS Safari
	const setVH = () => {
	  const vh = window.innerHeight * 0.01;
	  document.documentElement.style.setProperty('--vh', `${vh}px`);
	};
	
	setVH();
	window.addEventListener('resize', setVH);
	window.addEventListener('orientationchange', () => {
	  setTimeout(setVH, 100); // Delay for iOS
	});

	// Safe area optimization
	document.documentElement.style.setProperty('--sat', `${this.deviceMetrics.safeAreaTop}px`);
	document.documentElement.style.setProperty('--sab', `${this.deviceMetrics.safeAreaBottom}px`);
  }

  optimizeScrolling() {
	// iOS scroll momentum
	document.body.style.webkitOverflowScrolling = 'touch';
	
	// Prevent scroll chaining
	document.addEventListener('touchmove', (e) => {
	  const target = e.target.closest('.scrollable');
	  if (!target) return;
	  
	  const scrollTop = target.scrollTop;
	  const scrollHeight = target.scrollHeight;
	  const height = target.clientHeight;
	  const deltaY = e.touches[0].clientY - this.lastTouchY;
	  
	  if ((scrollTop === 0 && deltaY > 0) || 
		  (scrollTop === scrollHeight - height && deltaY < 0)) {
		e.preventDefault();
	  }
	  
	  this.lastTouchY = e.touches[0].clientY;
	}, { passive: false });
  }

  optimizeTouch() {
	// Improved touch responsiveness
	document.addEventListener('touchstart', () => {}, { passive: true });
	
	// Prevent iOS Safari's rubber band effect where needed
	const preventRubberBand = (e) => {
	  if (e.target.closest('.no-bounce')) {
		e.preventDefault();
	  }
	};
	
	document.addEventListener('touchmove', preventRubberBand, { passive: false });
  }

  optimizeAnimations() {
	// Use will-change sparingly and remove after animations
	const optimizedElements = new WeakSet();
	
	const addWillChange = (element, properties = 'transform') => {
	  if (!optimizedElements.has(element)) {
		element.style.willChange = properties;
		optimizedElements.add(element);
	  }
	};
	
	const removeWillChange = (element) => {
	  if (optimizedElements.has(element)) {
		element.style.willChange = 'auto';
		optimizedElements.delete(element);
	  }
	};
	
	// Auto-cleanup will-change after animations
	const observer = new MutationObserver((mutations) => {
	  mutations.forEach((mutation) => {
		if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
		  const element = mutation.target;
		  if (element.style.transform === '' && optimizedElements.has(element)) {
			setTimeout(() => removeWillChange(element), 100);
		  }
		}
	  });
	});
	
	observer.observe(document.body, {
	  attributes: true,
	  subtree: true,
	  attributeFilter: ['style']
	});

	// Export helpers
	window.iOSOptimizer = { addWillChange, removeWillChange };
  }

  preventZoom() {
	// Prevent accidental zoom while allowing intentional zoom
	let lastTouchEnd = 0;
	
	document.addEventListener('touchend', () => {
	  const now = Date.now();
	  if (now - lastTouchEnd <= 300) {
		event.preventDefault();
	  }
	  lastTouchEnd = now;
	}, false);
	
	// Prevent zoom on input focus
	document.addEventListener('focusin', (e) => {
	  if (e.target.matches('input, textarea')) {
		if (this.deviceMetrics.viewportWidth < 768) {
		  // Temporarily increase font size to prevent zoom
		  e.target.style.fontSize = '16px';
		}
	  }
	});
	
	document.addEventListener('focusout', (e) => {
	  if (e.target.matches('input, textarea')) {
		e.target.style.fontSize = '';
	  }
	});
  }

  optimizeMemory() {
	// Cleanup observers and listeners on page unload
	window.addEventListener('beforeunload', () => {
	  this.cleanup();
	});
	
	// Monitor memory usage
	if (performance.memory) {
	  setInterval(() => {
		const memory = performance.memory;
		const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
		
		if (usage > 0.8) {
		  console.warn('High memory usage detected:', usage);
		  this.triggerGarbageCollection();
		}
	  }, 30000);
	}
  }

  triggerGarbageCollection() {
	// Force garbage collection opportunities
	if (window.gc) {
	  window.gc();
	} else {
	  // Create pressure for GC
	  const arrays = [];
	  for (let i = 0; i < 100; i++) {
		arrays.push(new Array(1000).fill(0));
	  }
	  arrays.length = 0;
	}
  }

  cleanup() {
	// Remove all iOS-specific listeners and observers
	// Called on page unload
  }

  // Haptic feedback helper
  haptic(type = 'light') {
	if (!this.isIOS) return;
	
	const patterns = {
	  light: 10,
	  medium: 20,
	  heavy: 30,
	  success: [10, 50, 10],
	  error: [50, 100, 50],
	  warning: [30, 100, 30]
	};
	
	const pattern = patterns[type] || patterns.light;
	
	if (navigator.vibrate) {
	  navigator.vibrate(pattern);
	}
  }
}

// Initialize iOS optimizations
export const iosOptimizer = new iOSOptimizer();

// CSS optimizations for iOS
export const iOSCSS = `
  /* iOS-specific optimizations */
  @supports (-webkit-touch-callout: none) {
	:root {
	  --vh: 1vh;
	}
	
	body {
	  /* Prevent iOS Safari bounce */
	  position: fixed;
	  overflow: hidden;
	  width: 100%;
	  height: calc(var(--vh, 1vh) * 100);
	}
	
	.app {
	  /* Enable smooth scrolling */
	  -webkit-overflow-scrolling: touch;
	  overscroll-behavior: contain;
	  height: calc(var(--vh, 1vh) * 100);
	  overflow-y: auto;
	}
	
	/* Optimize transforms for iOS */
	.task-card,
	.subtask,
	.drag-ghost {
	  -webkit-transform: translateZ(0);
	  transform: translateZ(0);
	}
	
	/* Better input handling */
	input, textarea {
	  /* Prevent zoom on focus */
	  font-size: max(16px, 1em);
	  /* Better touch targets */
	  min-height: 44px;
	}
	
	/* Smooth animations */
	.swipe-wrap,
	.card-swipe-wrap {
	  -webkit-backface-visibility: hidden;
	  backface-visibility: hidden;
	}
  }
  
  /* iPhone X+ safe areas */
  @media (max-width: 430px) and (max-height: 932px) {
	.topbar {
	  padding-top: max(var(--sat, env(safe-area-inset-top)), 8px);
	}
	
	.add-bar {
	  padding-bottom: calc(16px + var(--sab, env(safe-area-inset-bottom)));
	}
  }
`;