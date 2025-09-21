// iosFixes.js - Complete iOS Safari and mobile optimizations

export class iOSManager {
  constructor() {
	this.isIOS = this.detectIOS();
	this.isStandalone = this.isRunningStandalone();
	this.deviceInfo = this.getDeviceInfo();
	this.safeAreas = this.calculateSafeAreas();
	
	// Auto-apply fixes if on iOS
	if (this.isIOS) {
	  this.applyAllFixes();
	}
  }

  // ===== DETECTION METHODS =====
  
  detectIOS() {
	// Modern detection that works with iPadOS too
	return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
		   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
		   /Safari/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
  }

  isRunningStandalone() {
	// Check if app is running as PWA (added to home screen)
	return window.matchMedia('(display-mode: standalone)').matches ||
		   window.navigator.standalone === true;
  }

  getDeviceInfo() {
	const screen = window.screen;
	const viewport = {
	  width: window.innerWidth,
	  height: window.innerHeight
	};
	
	// Detect specific iPhone models by screen dimensions
	const deviceType = this.detectDeviceType(screen.width, screen.height);
	
	return {
	  screen: { width: screen.width, height: screen.height },
	  viewport,
	  pixelRatio: window.devicePixelRatio || 1,
	  deviceType,
	  orientation: this.getOrientation(),
	  hasNotch: this.hasNotch(),
	  hasDynamicIsland: this.hasDynamicIsland()
	};
  }

  detectDeviceType(width, height) {
	// iPhone model detection based on screen dimensions
	const max = Math.max(width, height);
	const min = Math.min(width, height);
	
	const devices = {
	  // iPhone 14 Pro Max, 13 Pro Max, 12 Pro Max
	  932: 'iPhone Pro Max',
	  // iPhone 14 Pro, 13 Pro, 12 Pro, iPhone 14, 13, 12
	  844: 'iPhone Pro/Standard',
	  // iPhone 11 Pro Max, XS Max
	  896: 'iPhone Plus/Max (older)',
	  // iPhone 11 Pro, XS, X
	  812: 'iPhone X-style',
	  // iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus
	  736: 'iPhone Plus',
	  // iPhone SE 3rd gen, 8, 7, 6s, 6
	  667: 'iPhone Standard',
	  // iPhone SE 1st/2nd gen, 5s, 5c, 5
	  568: 'iPhone SE/5',
	  // iPad variations
	  1024: 'iPad',
	  1080: 'iPad Pro',
	  1112: 'iPad Pro 10.5',
	  1194: 'iPad Pro 11',
	  1366: 'iPad Pro 12.9'
	};
	
	return devices[max] || `Unknown (${max}x${min})`;
  }

  getOrientation() {
	if (screen.orientation) {
	  return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
	}
	return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  hasNotch() {
	// Detect iPhone X-style notch by safe area
	return this.safeAreas.top > 20;
  }

  hasDynamicIsland() {
	// iPhone 14 Pro/Pro Max detection (approximation)
	return this.deviceInfo?.deviceType?.includes('Pro') && this.safeAreas.top >= 47;
  }

  calculateSafeAreas() {
	const testElement = document.createElement('div');
	testElement.style.cssText = `
	  position: fixed;
	  top: 0; left: 0; right: 0; bottom: 0;
	  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
	  visibility: hidden;
	  pointer-events: none;
	`;
	
	document.body.appendChild(testElement);
	const computed = getComputedStyle(testElement);
	const safeAreas = {
	  top: parseInt(computed.paddingTop) || 0,
	  right: parseInt(computed.paddingRight) || 0,
	  bottom: parseInt(computed.paddingBottom) || 0,
	  left: parseInt(computed.paddingLeft) || 0
	};
	document.body.removeChild(testElement);
	
	return safeAreas;
  }

  // ===== FIX IMPLEMENTATION =====

  applyAllFixes() {
	console.log('🍎 Applying iOS fixes...', this.deviceInfo);
	
	this.fixViewportHeight();
	this.fixScrolling();
	this.fixInputZoom();
	this.fixTouchHandling();
	this.fixSafeAreas();
	this.optimizeAnimations();
	this.preventUnwantedBehaviors();
	this.setupMemoryManagement();
	this.addIOSSpecificCSS();
	
	console.log('✅ iOS fixes applied successfully');
  }

  // Fix 1: Dynamic viewport height (most important for iOS)
  fixViewportHeight() {
	console.log('📏 Fixing viewport height...');
	
	const setVH = () => {
	  // Use the visual viewport API if available (iOS 13+)
	  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
	  const vh = height * 0.01;
	  document.documentElement.style.setProperty('--vh', `${vh}px`);
	  document.documentElement.style.setProperty('--real-vh', `${window.innerHeight * 0.01}px`);
	  
	  console.log(`📱 Viewport height set: ${height}px (vh: ${vh}px)`);
	};
	
	// Set immediately
	setVH();
	
	// Update on resize with debouncing
	let resizeTimer;
	const debouncedSetVH = () => {
	  clearTimeout(resizeTimer);
	  resizeTimer = setTimeout(setVH, 100);
	};
	
	window.addEventListener('resize', debouncedSetVH);
	window.addEventListener('orientationchange', () => {
	  // iOS needs extra delay after orientation change
	  setTimeout(setVH, 200);
	});
	
	// Use visual viewport API if available
	if (window.visualViewport) {
	  window.visualViewport.addEventListener('resize', debouncedSetVH);
	}
  }

  // Fix 2: Scroll handling and rubber band prevention
  fixScrolling() {
	console.log('📜 Fixing scroll behavior...');
	
	// Enable momentum scrolling globally
	document.body.style.webkitOverflowScrolling = 'touch';
	
	// Prevent document scrolling when not needed
	let lastTouchY = 0;
	
	document.addEventListener('touchstart', (e) => {
	  lastTouchY = e.touches[0].clientY;
	}, { passive: true });
	
	document.addEventListener('touchmove', (e) => {
	  const currentY = e.touches[0].clientY;
	  const deltaY = lastTouchY - currentY;
	  
	  // Find scrollable parent
	  const scrollableParent = e.target.closest('.app, .scrollable, [data-scrollable]');
	  
	  if (!scrollableParent) {
		// No scrollable parent, prevent default
		e.preventDefault();
		return;
	  }
	  
	  // Check if at scroll boundaries
	  const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
	  const atTop = scrollTop === 0;
	  const atBottom = scrollTop + clientHeight >= scrollHeight;
	  
	  // Prevent rubber band at boundaries
	  if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
		e.preventDefault();
	  }
	  
	  lastTouchY = currentY;
	}, { passive: false });
	
	// Prevent overscroll
	document.body.style.overscrollBehavior = 'none';
  }

  // Fix 3: Prevent zoom on input focus
  fixInputZoom() {
	console.log('🔍 Fixing input zoom...');
	
	const originalFontSizes = new WeakMap();
	
	// Prevent zoom by ensuring inputs are at least 16px
	document.addEventListener('focusin', (e) => {
	  if (e.target.matches('input, textarea, select')) {
		const element = e.target;
		const computedStyle = getComputedStyle(element);
		const currentFontSize = parseFloat(computedStyle.fontSize);
		
		// Store original font size
		originalFontSizes.set(element, element.style.fontSize || '');
		
		// Set to 16px if smaller (iOS won't zoom if 16px+)
		if (currentFontSize < 16) {
		  element.style.fontSize = '16px';
		  element.dataset.iosZoomFixed = 'true';
		}
	  }
	});
	
	document.addEventListener('focusout', (e) => {
	  if (e.target.matches('input, textarea, select') && e.target.dataset.iosZoomFixed) {
		const element = e.target;
		const originalSize = originalFontSizes.get(element);
		
		if (originalSize !== undefined) {
		  element.style.fontSize = originalSize;
		  originalFontSizes.delete(element);
		}
		
		delete element.dataset.iosZoomFixed;
	  }
	});
	
	// Also prevent double-tap zoom
	let lastTouchEnd = 0;
	document.addEventListener('touchend', (event) => {
	  const now = Date.now();
	  if (now - lastTouchEnd <= 300) {
		event.preventDefault();
	  }
	  lastTouchEnd = now;
	}, { passive: false });
  }

  // Fix 4: Optimize touch handling
  fixTouchHandling() {
	console.log('👆 Optimizing touch handling...');
	
	// Add touch-action support
	document.body.style.touchAction = 'manipulation';
	
	// Improve touch responsiveness
	document.addEventListener('touchstart', () => {}, { passive: true });
	
	// Prevent text selection during gestures
	document.addEventListener('selectstart', (e) => {
	  if (e.target.closest('.task-card, .subtask, .swipe-wrap')) {
		e.preventDefault();
	  }
	});
	
	// Fix touch delay
	if (window.FastClick) {
	  FastClick.attach(document.body);
	}
  }

  // Fix 5: Safe area handling
  fixSafeAreas() {
	console.log('🛡️ Applying safe area fixes...');
	
	// Set CSS custom properties for safe areas
	Object.entries(this.safeAreas).forEach(([side, value]) => {
	  document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
	});
	
	// Add classes for different device types
	document.body.classList.add('ios-device');
	
	if (this.hasNotch()) {
	  document.body.classList.add('has-notch');
	}
	
	if (this.hasDynamicIsland()) {
	  document.body.classList.add('has-dynamic-island');
	}
	
	if (this.isStandalone) {
	  document.body.classList.add('standalone-app');
	}
	
	// Log safe area info
	console.log('📱 Safe areas:', this.safeAreas);
	console.log('📱 Device type:', this.deviceInfo.deviceType);
  }

  // Fix 6: Animation optimizations
  optimizeAnimations() {
	console.log('🎬 Optimizing animations for iOS...');
	
	// Track elements with will-change
	const optimizedElements = new WeakSet();
	
	this.addWillChange = (element, properties = 'transform') => {
	  if (!optimizedElements.has(element)) {
		element.style.willChange = properties;
		optimizedElements.add(element);
	  }
	};
	
	this.removeWillChange = (element) => {
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
			setTimeout(() => this.removeWillChange(element), 100);
		  }
		}
	  });
	});
	
	observer.observe(document.body, {
	  attributes: true,
	  subtree: true,
	  attributeFilter: ['style']
	});
	
	// Store observer for cleanup
	this.animationObserver = observer;
	
	// Make helpers globally available
	window.iOSAnimationHelpers = {
	  addWillChange: this.addWillChange,
	  removeWillChange: this.removeWillChange
	};
  }

  // Fix 7: Prevent unwanted behaviors
  preventUnwantedBehaviors() {
	console.log('🚫 Preventing unwanted iOS behaviors...');
	
	// Prevent pull-to-refresh
	document.addEventListener('touchstart', (e) => {
	  if (e.touches.length !== 1) return;
	  
	  const startY = e.touches[0].clientY;
	  const element = e.target.closest('.app');
	  
	  if (element && element.scrollTop === 0 && startY > 10) {
		// Prevent pull to refresh at top of scroll
		document.addEventListener('touchmove', (moveEvent) => {
		  if (moveEvent.touches[0].clientY > startY) {
			moveEvent.preventDefault();
		  }
		}, { passive: false, once: true });
	  }
	});
	
	// Prevent context menu on long press (for gesture elements)
	document.addEventListener('contextmenu', (e) => {
	  if (e.target.closest('.task-card, .subtask, .sub-handle, .card-handle')) {
		e.preventDefault();
	  }
	});
	
	// Prevent image drag
	document.addEventListener('dragstart', (e) => {
	  if (e.target.tagName === 'IMG') {
		e.preventDefault();
	  }
	});
  }

  // Fix 8: Memory management
  setupMemoryManagement() {
	console.log('🧠 Setting up memory management...');
	
	let memoryCheckTimer;
	
	const checkMemory = () => {
	  if (performance.memory) {
		const used = performance.memory.usedJSHeapSize;
		const total = performance.memory.totalJSHeapSize;
		const usage = used / total;
		
		if (usage > 0.8) {
		  console.warn('⚠️ High memory usage detected:', (usage * 100).toFixed(1) + '%');
		  this.triggerMemoryCleanup();
		}
	  }
	};
	
	// Check memory every 30 seconds
	memoryCheckTimer = setInterval(checkMemory, 30000);
	
	// Cleanup on page hide
	document.addEventListener('visibilitychange', () => {
	  if (document.hidden) {
		this.triggerMemoryCleanup();
	  }
	});
	
	// Store timer for cleanup
	this.memoryCheckTimer = memoryCheckTimer;
  }

  triggerMemoryCleanup() {
	// Create memory pressure to encourage garbage collection
	const temp = [];
	for (let i = 0; i < 1000; i++) {
	  temp.push(new Array(100).fill(Math.random()));
	}
	temp.length = 0;
	
	// Force GC if available
	if (window.gc) {
	  window.gc();
	}
	
	console.log('🗑️ Memory cleanup triggered');
  }

  // Fix 9: Add iOS-specific CSS
  addIOSSpecificCSS() {
	const style = document.createElement('style');
	style.id = 'ios-fixes';
	style.textContent = this.getIOSCSS();
	document.head.appendChild(style);
  }

  getIOSCSS() {
	return `
	  /* iOS-specific fixes */
	  @supports (-webkit-touch-callout: none) {
		:root {
		  --vh: 1vh;
		  --real-vh: 1vh;
		  --safe-top: ${this.safeAreas.top}px;
		  --safe-right: ${this.safeAreas.right}px;
		  --safe-bottom: ${this.safeAreas.bottom}px;
		  --safe-left: ${this.safeAreas.left}px;
		}
		
		/* Viewport fixes */
		html, body {
		  height: calc(var(--vh, 1vh) * 100);
		  overflow-x: hidden;
		}
		
		body {
		  position: relative;
		  -webkit-overflow-scrolling: touch;
		  overscroll-behavior: none;
		  touch-action: manipulation;
		}
		
		.app {
		  min-height: calc(var(--vh, 1vh) * 100);
		  -webkit-overflow-scrolling: touch;
		  overscroll-behavior: contain;
		}
		
		/* Safe area support */
		.topbar {
		  padding-top: max(var(--space-sm, 8px), var(--safe-top, env(safe-area-inset-top)));
		}
		
		.add-bar {
		  padding-bottom: calc(var(--space-md, 12px) + var(--safe-bottom, env(safe-area-inset-bottom)));
		}
		
		/* Input fixes */
		input, textarea, select {
		  font-size: max(16px, 1em);
		  -webkit-user-select: text;
		  user-select: text;
		}
		
		/* Touch optimizations */
		.task-card, .subtask {
		  -webkit-user-select: none;
		  user-select: none;
		  -webkit-touch-callout: none;
		}
		
		/* Animation optimizations */
		.task-card, .subtask, .drag-ghost {
		  -webkit-transform: translateZ(0);
		  transform: translateZ(0);
		  -webkit-backface-visibility: hidden;
		  backface-visibility: hidden;
		}
		
		/* Gesture area improvements */
		.sub-handle, .card-handle {
		  touch-action: none;
		  -webkit-user-drag: none;
		}
		
		/* Prevent unwanted selections */
		.swipe-wrap, .card-swipe-wrap {
		  -webkit-user-select: none;
		  user-select: none;
		}
		
		/* Scrolling improvements */
		.subtask-list {
		  -webkit-overflow-scrolling: touch;
		}
	  }
	  
	  /* iPhone X+ specific styles */
	  .has-notch .topbar {
		padding-top: max(16px, var(--safe-top, env(safe-area-inset-top)));
	  }
	  
	  .has-notch .add-bar {
		padding-bottom: calc(16px + var(--safe-bottom, env(safe-area-inset-bottom)));
	  }
	  
	  /* Dynamic Island specific styles */
	  .has-dynamic-island .topbar {
		padding-top: max(20px, var(--safe-top, env(safe-area-inset-top)));
	  }
	  
	  /* Standalone app styles */
	  .standalone-app {
		/* Additional padding when running as PWA */
	  }
	  
	  /* Reduced motion support */
	  @media (prefers-reduced-motion: reduce) {
		.task-card, .subtask {
		  transition: none !important;
		  animation: none !important;
		}
	  }
	`;
  }

  // ===== UTILITY METHODS =====

  haptic(type = 'light') {
	if (!this.isIOS) return;
	
	const patterns = {
	  light: 10,
	  medium: 20,
	  heavy: 30,
	  success: [10, 50, 10],
	  error: [50, 100, 50],
	  warning: [30, 100, 30],
	  selection: 5
	};
	
	const pattern = patterns[type] || patterns.light;
	
	if (navigator.vibrate) {
	  navigator.vibrate(pattern);
	}
  }

  // Cleanup method
  destroy() {
	console.log('🧹 Cleaning up iOS fixes...');
	
	if (this.memoryCheckTimer) {
	  clearInterval(this.memoryCheckTimer);
	}
	
	if (this.animationObserver) {
	  this.animationObserver.disconnect();
	}
	
	// Remove iOS-specific styles
	const style = document.getElementById('ios-fixes');
	if (style) {
	  style.remove();
	}
  }

  // Debug info
  getDebugInfo() {
	return {
	  isIOS: this.isIOS,
	  isStandalone: this.isStandalone,
	  deviceInfo: this.deviceInfo,
	  safeAreas: this.safeAreas,
	  viewport: {
		width: window.innerWidth,
		height: window.innerHeight,
		visualHeight: window.visualViewport?.height || 'not available'
	  }
	};
  }
}

// Create singleton instance
export const iosManager = new iOSManager();

// Export utility functions
export const isiOS = () => iosManager.isIOS;
export const haptic = (type) => iosManager.haptic(type);
export const getIOSInfo = () => iosManager.getDebugInfo();

// Export for manual setup
export const setupiOS = () => {
  if (!iosManager.isIOS) {
	console.log('📱 Not iOS device, skipping iOS fixes');
	return false;
  }
  
  iosManager.applyAllFixes();
  return true;
};

// Auto-setup on import
console.log('🍎 iOS manager loaded:', iosManager.isIOS ? 'iOS detected' : 'Non-iOS device');