// iosFixes.js - CORRECTED VERSION with proper constructor order

export class iOSManager {
  constructor() {
	this.isIOS = this.detectIOS();
	this.isStandalone = this.isRunningStandalone();
	
	// FIX: Calculate safe areas FIRST before using them
	this.safeAreas = this.calculateSafeAreas();
	
	// THEN get device info (which uses safe areas)
	this.deviceInfo = this.getDeviceInfo();
	
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

  // FIX: Simplified calculateSafeAreas that doesn't depend on other properties
  calculateSafeAreas() {
	try {
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
	} catch (error) {
	  console.warn('Failed to calculate safe areas:', error);
	  return { top: 0, right: 0, bottom: 0, left: 0 };
	}
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
	try {
	  if (screen.orientation) {
		return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
	  }
	  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
	} catch (error) {
	  return 'unknown';
	}
  }

  hasNotch() {
	// FIX: Safe check for safeAreas
	return this.safeAreas && this.safeAreas.top > 20;
  }

  hasDynamicIsland() {
	// FIX: Safe check for both properties
	return this.deviceInfo?.deviceType?.includes('Pro') && 
		   this.safeAreas && this.safeAreas.top >= 47;
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
	  try {
		// Use the visual viewport API if available (iOS 13+)
		const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
		const vh = height * 0.01;
		document.documentElement.style.setProperty('--vh', `${vh}px`);
		document.documentElement.style.setProperty('--real-vh', `${window.innerHeight * 0.01}px`);
		
		console.log(`📱 Viewport height set: ${height}px (vh: ${vh}px)`);
	  } catch (error) {
		console.warn('Failed to set viewport height:', error);
	  }
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
	
	try {
	  // Enable momentum scrolling globally
	  document.body.style.webkitOverflowScrolling = 'touch';
	  
	  // REMOVE these lines that prevent all touchmove:
	  // document.addEventListener('touchmove', (e) => {
	  //   const scrollableParent = e.target.closest('.app, .scrollable, [data-scrollable]');
	  //   if (!scrollableParent) {
	  //     e.preventDefault();
	  //     return;
	  //   }
	  // }, { passive: false });
	  
	  // Only prevent overscroll behavior, not normal scrolling
	  document.body.style.overscrollBehavior = 'none';
	  
	  // Let the gesture systems handle scroll locking during gestures
	  console.log('✅ Scroll behavior fixed - normal scrolling enabled');
	} catch (error) {
	  console.warn('Failed to fix scrolling:', error);
	}
  }

  // Fix 3: Prevent zoom on input focus
  fixInputZoom() {
	console.log('🔍 Fixing input zoom...');
	
	try {
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
	} catch (error) {
	  console.warn('Failed to fix input zoom:', error);
	}
  }

  // Fix 4: Optimize touch handling
  fixTouchHandling() {
	console.log('👆 Optimizing touch handling...');
	
	try {
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
	} catch (error) {
	  console.warn('Failed to optimize touch handling:', error);
	}
  }

  // Fix 5: Safe area handling
  fixSafeAreas() {
	console.log('🛡️ Applying safe area fixes...');
	
	try {
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
	} catch (error) {
	  console.warn('Failed to apply safe area fixes:', error);
	}
  }

  // Fix 6: Animation optimizations
  optimizeAnimations() {
	console.log('🎬 Optimizing animations for iOS...');
	
	try {
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
	  
	  // Make helpers globally available
	  window.iOSAnimationHelpers = {
		addWillChange: this.addWillChange,
		removeWillChange: this.removeWillChange
	  };
	} catch (error) {
	  console.warn('Failed to optimize animations:', error);
	}
  }

  // Fix 7: Prevent unwanted behaviors
  preventUnwantedBehaviors() {
	console.log('🚫 Preventing unwanted iOS behaviors...');
	
	try {
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
	} catch (error) {
	  console.warn('Failed to prevent unwanted behaviors:', error);
	}
  }

  // Fix 8: Memory management
  setupMemoryManagement() {
	console.log('🧠 Setting up memory management...');
	
	try {
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
	} catch (error) {
	  console.warn('Failed to setup memory management:', error);
	}
  }

  triggerMemoryCleanup() {
	try {
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
	} catch (error) {
	  console.warn('Memory cleanup failed:', error);
	}
  }

  // Fix 9: Add iOS-specific CSS
  addIOSSpecificCSS() {
	try {
	  const style = document.createElement('style');
	  style.id = 'ios-fixes';
	  style.textContent = this.getIOSCSS();
	  document.head.appendChild(style);
	} catch (error) {
	  console.warn('Failed to add iOS CSS:', error);
	}
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
		
		.topbar {
		  padding-top: max(var(--space-sm, 8px), var(--safe-top, env(safe-area-inset-top)));
		}
		
		.add-bar {
		  padding-bottom: calc(var(--space-md, 12px) + var(--safe-bottom, env(safe-area-inset-bottom)));
		}
		
		input, textarea, select {
		  font-size: max(16px, 1em);
		  -webkit-user-select: text;
		  user-select: text;
		}
		
		.task-card, .subtask {
		  -webkit-user-select: none;
		  user-select: none;
		  -webkit-touch-callout: none;
		  -webkit-transform: translateZ(0);
		  transform: translateZ(0);
		  -webkit-backface-visibility: hidden;
		  backface-visibility: hidden;
		}
		
		.sub-handle, .card-handle {
		  touch-action: none;
		  -webkit-user-drag: none;
		}
	  }
	  
	  .has-notch .topbar {
		padding-top: max(20px, var(--safe-top, env(safe-area-inset-top)));
	  }
	  
	  .has-notch .add-bar {
		padding-bottom: calc(20px + var(--safe-bottom, env(safe-area-inset-bottom)));
	  }
	  
	  .has-dynamic-island .topbar {
		padding-top: max(24px, var(--safe-top, env(safe-area-inset-top)));
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
	
	try {
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
	} catch (error) {
	  console.warn('Cleanup failed:', error);
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