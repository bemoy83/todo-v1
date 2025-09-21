// gestureCoordinator.js - Complete implementation

import { haptic, isiOS } from './iosFixes.js';
import { DRAG, SWIPE } from './constants.js';

class GestureCoordinator {
  constructor() {
	// Single RAF loop for all gesture systems
	this.animationFrame = null;
	this.isAnimating = false;
	this.lastFrameTime = 0;
	
	// Gesture state tracking
	this.activeGestures = {
	  drag: false,
	  swipe: false,
	  dragType: null, // 'subtask' | 'task' | null
	  swipeType: null // 'subtask' | 'task' | null
	};
	
	// Haptic settings
	this.hapticsEnabled = isiOS() && 'vibrate' in navigator;
	
	// Dynamic swipe distances
	this.swipeDistances = new Map(); // element -> {left: distance, right: distance}
	
	console.log('🎮 Gesture Coordinator initialized');
	console.log('📳 Haptics:', this.hapticsEnabled ? 'Available' : 'Not available');
  }

  // ===== GESTURE STATE MANAGEMENT =====
  
  canStartGesture(type, subtype = null) {
	// Prevent multiple gestures at once
	if (type === 'drag') {
	  return !this.activeGestures.swipe && !this.activeGestures.drag;
	} else if (type === 'swipe') {
	  return !this.activeGestures.drag && !this.activeGestures.swipe;
	}
	return false;
  }
  
  startGesture(type, subtype = null) {
	if (!this.canStartGesture(type, subtype)) {
	  console.log(`❌ Cannot start ${type} gesture - conflict with active gesture`);
	  return false;
	}
	
	this.activeGestures[type] = true;
	if (subtype) {
	  this.activeGestures[`${type}Type`] = subtype;
	}
	
	// Start unified animation loop if needed
	this.startAnimationLoop();
	
	// Trigger start haptic
	this.triggerHaptic('start', type, subtype);
	
	console.log(`🎯 Started ${type} gesture${subtype ? ` (${subtype})` : ''}`);
	return true;
  }
  
  endGesture(type, success = false) {
	if (!this.activeGestures[type]) return;
	
	this.activeGestures[type] = false;
	this.activeGestures[`${type}Type`] = null;
	
	// Trigger end haptic
	this.triggerHaptic(success ? 'success' : 'end', type);
	
	console.log(`🏁 Ended ${type} gesture${success ? ' (success)' : ''}`);
	
	// Stop animation loop if no active gestures
	this.checkStopAnimation();
  }
  
  // ===== ANIMATION LOOP COORDINATION =====
  
  startAnimationLoop() {
	if (this.isAnimating) return;
	
	this.isAnimating = true;
	this.lastFrameTime = performance.now();
	
	const animate = (currentTime) => {
	  const deltaTime = currentTime - this.lastFrameTime;
	  this.lastFrameTime = currentTime;
	  
	  // Let existing systems handle their own animations
	  // We just coordinate the RAF loop
	  
	  if (this.hasActiveGestures()) {
		this.animationFrame = requestAnimationFrame(animate);
	  } else {
		this.isAnimating = false;
		this.animationFrame = null;
		console.log('🛑 Animation loop stopped');
	  }
	};
	
	this.animationFrame = requestAnimationFrame(animate);
	console.log('▶️ Animation loop started');
  }
  
  checkStopAnimation() {
	if (!this.hasActiveGestures() && this.isAnimating) {
	  if (this.animationFrame) {
		cancelAnimationFrame(this.animationFrame);
		this.animationFrame = null;
	  }
	  this.isAnimating = false;
	  console.log('🛑 Animation loop stopped');
	}
  }
  
  hasActiveGestures() {
	return this.activeGestures.drag || this.activeGestures.swipe;
  }
  
  // ===== HAPTIC FEEDBACK =====
  
  triggerHaptic(event, gestureType, gestureSubtype = null) {
	if (!this.hapticsEnabled) return;
	
	const hapticMap = {
	  // Drag gestures
	  'start-drag': 'light',
	  'activate-drag': 'medium', 
	  'success-drag': 'success',
	  'end-drag': 'light',
	  
	  // Swipe gestures  
	  'start-swipe': null, // No haptic on swipe start
	  'activate-swipe': 'light',
	  'threshold-swipe': 'light',
	  'success-swipe': 'medium',
	  'end-swipe': null,
	  
	  // Action-specific
	  'complete': 'success',
	  'delete': 'warning',
	  'edit': 'light',
	  'error': 'error'
	};
	
	const key = `${event}-${gestureType}`;
	const pattern = hapticMap[key];
	
	if (pattern) {
	  haptic(pattern);
	  console.log(`📳 Haptic: ${event} ${gestureType} (${pattern})`);
	}
  }
  
  // Specific haptic triggers for actions
  triggerActionHaptic(action) {
	const actionHaptics = {
	  complete: 'success',
	  'complete-all': 'success', 
	  delete: 'warning',
	  'delete-task': 'warning',
	  edit: 'light',
	  'edit-title': 'light'
	};
	
	const pattern = actionHaptics[action];
	if (pattern && this.hapticsEnabled) {
	  haptic(pattern);
	  console.log(`📳 Action haptic: ${action} (${pattern})`);
	}
  }
  
  // ===== DYNAMIC SWIPE DISTANCES =====
  
  calculateSwipeDistances(element) {
	const leftZone = element.querySelector('.zone.left');
	const rightZone = element.querySelector('.zone.right');
	
	if (!leftZone || !rightZone) {
	  return { left: 80, right: 120 }; // Defaults
	}
	
	// Count actions in each zone
	const leftActions = leftZone.querySelectorAll('.action').length;
	const rightActions = rightZone.querySelectorAll('.action').length;
	
	// Base distance + extra for each additional action
	const baseDistance = 60;
	const perActionDistance = 30;
	
	const leftDistance = baseDistance + (leftActions * perActionDistance);
	const rightDistance = baseDistance + (rightActions * perActionDistance);
	
	return { left: leftDistance, right: rightDistance };
  }
  
  updateSwipeDistances(element) {
	const distances = this.calculateSwipeDistances(element);
	this.swipeDistances.set(element, distances);
	
	// Update CSS custom properties for the swipe system
	element.style.setProperty('--left-reveal-distance', `${distances.left}px`);
	element.style.setProperty('--right-reveal-distance', `${distances.right}px`);
	
	console.log(`📏 Updated swipe distances for element:`, distances);
	return distances;
  }
  
  getSwipeDistances(element) {
	if (!this.swipeDistances.has(element)) {
	  return this.updateSwipeDistances(element);
	}
	return this.swipeDistances.get(element);
  }
  
  // ===== INTEGRATION HELPERS =====
  
  // For drag.js integration
  onDragStart(type = 'subtask') {
	return this.startGesture('drag', type);
  }
  
  onDragActivate(type = 'subtask') {
	this.triggerHaptic('activate', 'drag', type);
  }
  
  onDragEnd(type = 'subtask', success = false) {
	this.endGesture('drag', success);
  }
  
  // For swipe.js integration
  onSwipeStart(type = 'subtask') {
	return this.startGesture('swipe', type);
  }
  
  onSwipeActivate(type = 'subtask') {
	this.triggerHaptic('activate', 'swipe', type);
  }
  
  onSwipeThreshold(type = 'subtask') {
	this.triggerHaptic('threshold', 'swipe', type);
  }
  
  onSwipeEnd(type = 'subtask', success = false) {
	this.endGesture('swipe', success);
  }
  
  // ===== INITIALIZATION =====
  
  initializeSwipeElements() {
	// Set up dynamic distances for all swipe elements
	const swipeElements = document.querySelectorAll('.swipe-wrap, .card-swipe-wrap');
	
	swipeElements.forEach(element => {
	  this.updateSwipeDistances(element);
	});
	
	console.log(`📏 Initialized ${swipeElements.length} swipe elements with dynamic distances`);
  }
  
  // ===== PUBLIC API =====
  
  setHapticsEnabled(enabled) {
	this.hapticsEnabled = enabled && isiOS() && 'vibrate' in navigator;
	console.log(`📳 Haptics ${this.hapticsEnabled ? 'enabled' : 'disabled'}`);
  }
  
  getStatus() {
	return {
	  activeGestures: { ...this.activeGestures },
	  isAnimating: this.isAnimating,
	  hapticsEnabled: this.hapticsEnabled,
	  swipeElementCount: this.swipeDistances.size
	};
  }
  
  destroy() {
	if (this.animationFrame) {
	  cancelAnimationFrame(this.animationFrame);
	}
	
	this.activeGestures = {
	  drag: false,
	  swipe: false,
	  dragType: null,
	  swipeType: null
	};
	
	this.swipeDistances.clear();
	
	console.log('🧹 Gesture Coordinator destroyed');
  }
}

// Create singleton
export const gestureCoordinator = new GestureCoordinator();

// ===== INTEGRATION FUNCTIONS =====

// Function to integrate with existing drag.js
export function integrateDragSystem() {
  console.log('🔗 Integrating with drag system...');
  // Integration happens through the updated drag functions
}

// Function to integrate with existing swipe.js  
export function integrateSwipeSystem() {
  console.log('🔗 Integrating with swipe system...');
  
  // Initialize dynamic distances
  gestureCoordinator.initializeSwipeElements();
  
  // Set up observer for new elements
  const observer = new MutationObserver(() => {
	gestureCoordinator.initializeSwipeElements();
  });
  
  observer.observe(document.body, {
	childList: true,
	subtree: true
  });
}

// Main initialization function
export function initializeGestureCoordinator() {
  console.log('🚀 Initializing Gesture Coordinator...');
  
  integrateDragSystem();
  integrateSwipeSystem();
  
  // Make available for testing
  window.gestureCoordinator = gestureCoordinator;
  
  console.log('✅ Gesture Coordinator ready');
}

// Export for use in other modules
export { gestureCoordinator as default };