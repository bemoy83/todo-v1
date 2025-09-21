// gestureManager.js - Updated with haptic feedback integration

import { DRAG, SWIPE, PERFORMANCE } from './constants.js';
import { haptic } from './iosFixes.js'; // Import haptic function

export class GestureManager {
  constructor() {
	// Only ONE animation loop for everything
	this.isAnimating = false;
	this.animationFrame = null;
	
	// Track all active gestures to prevent conflicts
	this.activeGestures = new Map();
	
	// Queue updates to batch DOM changes (better performance)
	this.updateQueue = [];
	
	// Haptic feedback settings
	this.hapticsEnabled = this.checkHapticsSupport();
	console.log('📳 Haptics support:', this.hapticsEnabled ? 'Available' : 'Not available');
  }

  checkHapticsSupport() {
	// Check if haptics are supported and enabled
	return 'vibrate' in navigator && navigator.vibrate !== undefined;
  }

  // UPDATED: Register a gesture with haptic configuration
  registerGesture(element, config) {
	const gestureId = `gesture_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
	
	const gesture = {
	  id: gestureId,
	  element: element,
	  type: config.type, // 'drag' or 'swipe'
	  state: 'idle', // idle -> pending -> active -> ending
	  data: {},
	  handlers: config.handlers || {},
	  // NEW: Haptic configuration
	  haptics: {
		onStart: config.haptics?.onStart || 'light',
		onActivate: config.haptics?.onActivate || 'medium',
		onEnd: config.haptics?.onEnd || null,
		onSuccess: config.haptics?.onSuccess || 'success',
		onError: config.haptics?.onError || 'error',
		enabled: config.haptics?.enabled !== false // Default to true
	  }
	};

	// Store the gesture
	this.activeGestures.set(gestureId, gesture);

	// Attach event listeners
	this.attachListeners(element, gesture);
	
	return gestureId;
  }

  // UPDATED: Enhanced pointer down with haptics
  handlePointerDown(e, gesture) {
	// Check if another gesture is already active
	const hasActiveGesture = Array.from(this.activeGestures.values())
	  .some(g => g.state === 'active' && g.id !== gesture.id);
	
	if (hasActiveGesture) {
	  return; // Don't start if another gesture is active
	}

	// Initialize gesture data
	gesture.state = 'pending';
	gesture.data = {
	  startX: e.clientX,
	  startY: e.clientY,
	  currentX: e.clientX,
	  currentY: e.clientY,
	  startTime: performance.now(),
	  deltaX: 0,
	  deltaY: 0
	};

	// NEW: Trigger start haptic feedback
	this.triggerHaptic(gesture, 'onStart');

	// Add global move and up listeners
	window.addEventListener('pointermove', gesture.listeners.boundMove, { passive: false });
	window.addEventListener('pointerup', gesture.listeners.boundUp, { once: true });

	console.log('Gesture started:', gesture.type, '📳');
  }

  // UPDATED: Enhanced pointer move with activation haptics
  handlePointerMove(e, gesture) {
	if (gesture.state === 'idle') return;

	// Update current position
	gesture.data.currentX = e.clientX;
	gesture.data.currentY = e.clientY;
	gesture.data.deltaX = gesture.data.currentX - gesture.data.startX;
	gesture.data.deltaY = gesture.data.currentY - gesture.data.startY;

	// Check if gesture should become active
	if (gesture.state === 'pending') {
	  const shouldActivate = this.shouldActivateGesture(gesture);
	  if (shouldActivate) {
		gesture.state = 'active';
		
		// NEW: Trigger activation haptic feedback
		this.triggerHaptic(gesture, 'onActivate');
		
		this.startAnimation(); // Start the single animation loop
		console.log('Gesture activated:', gesture.type, '📳');
	  }
	}

	// If gesture is active, queue an update
	if (gesture.state === 'active') {
	  this.queueUpdate(gesture);
	  e.preventDefault(); // Prevent scrolling, etc.
	}
  }

  // UPDATED: Enhanced pointer up with completion haptics
  handlePointerUp(e, gesture) {
	console.log('Gesture ended:', gesture.type);
	
	// Determine if gesture was successful based on data
	const wasSuccessful = this.isGestureSuccessful(gesture);
	
	// NEW: Trigger appropriate end haptic
	if (wasSuccessful) {
	  this.triggerHaptic(gesture, 'onSuccess');
	} else if (gesture.state === 'active') {
	  this.triggerHaptic(gesture, 'onEnd');
	}
	
	// Call the end handler if provided
	if (gesture.handlers.onEnd) {
	  gesture.handlers.onEnd(gesture.data, wasSuccessful);
	}

	// Clean up this gesture
	this.cleanupGesture(gesture);
  }

  // NEW: Haptic feedback trigger method
  triggerHaptic(gesture, hapticType) {
	if (!this.hapticsEnabled || !gesture.haptics.enabled) {
	  return;
	}

	const hapticPattern = gesture.haptics[hapticType];
	if (hapticPattern) {
	  try {
		haptic(hapticPattern);
		console.log(`📳 Haptic: ${hapticType} (${hapticPattern})`);
	  } catch (error) {
		console.warn('Haptic feedback failed:', error);
	  }
	}
  }

  // NEW: Determine if gesture was successful
  isGestureSuccessful(gesture) {
	if (gesture.type === 'drag') {
	  // Consider drag successful if moved more than 50px
	  const distance = Math.sqrt(
		gesture.data.deltaX * gesture.data.deltaX + 
		gesture.data.deltaY * gesture.data.deltaY
	  );
	  return distance > 50;
	} else if (gesture.type === 'swipe') {
	  // Consider swipe successful if horizontal movement > 80px
	  return Math.abs(gesture.data.deltaX) > 80;
	}
	
	return false;
  }

  // Keep existing methods (shouldActivateGesture, queueUpdate, etc.)
  shouldActivateGesture(gesture) {
	const { deltaX, deltaY } = gesture.data;
	const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	if (gesture.type === 'drag') {
	  // Activate drag after moving 8 pixels (DRAG.JITTER_PX)
	  return distance > 8;
	} else if (gesture.type === 'swipe') {
	  // Activate swipe after horizontal movement of 40px with limited vertical
	  return Math.abs(deltaX) > 40 && Math.abs(deltaY) < 12;
	}

	return false;
  }

  queueUpdate(gesture) {
	// Remove any existing update for this gesture
	this.updateQueue = this.updateQueue.filter(item => item.gestureId !== gesture.id);
	
	// Add new update
	this.updateQueue.push({
	  gestureId: gesture.id,
	  type: gesture.type,
	  data: { ...gesture.data }, // Copy the data
	  element: gesture.element
	});
  }

  startAnimation() {
	if (this.isAnimating) return; // Already running

	this.isAnimating = true;
	
	const animate = () => {
	  // Process all queued updates in one frame
	  this.processBatchedUpdates();

	  // Check if any gestures are still active
	  const hasActiveGestures = Array.from(this.activeGestures.values())
		.some(g => g.state === 'active');

	  if (hasActiveGestures) {
		// Continue animation
		this.animationFrame = requestAnimationFrame(animate);
	  } else {
		// Stop animation
		this.isAnimating = false;
		this.animationFrame = null;
		console.log('Animation loop stopped');
	  }
	};

	this.animationFrame = requestAnimationFrame(animate);
	console.log('Animation loop started');
  }

  processBatchedUpdates() {
	// Limit to 3 updates per frame to maintain 60fps
	const maxUpdatesPerFrame = 3;
	const updates = this.updateQueue.splice(0, maxUpdatesPerFrame);

	updates.forEach(update => {
	  if (update.type === 'drag') {
		this.updateDragVisual(update);
	  } else if (update.type === 'swipe') {
		this.updateSwipeVisual(update);
	  }
	});
  }

  updateDragVisual(update) {
	const { element, data } = update;
	const { deltaX, deltaY } = data;
	
	// Find the drag ghost or use the element itself
	const dragGhost = document.querySelector('.drag-ghost');
	const targetElement = dragGhost || element;
	
	if (targetElement) {
	  targetElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
	}
  }

  updateSwipeVisual(update) {
	const { element, data } = update;
	const { deltaX } = data;
	
	// Find the swipeable row
	const swipeRow = element.querySelector('.subtask, .card-row');
	if (swipeRow) {
	  swipeRow.style.transform = `translate3d(${deltaX}px, 0, 0)`;
	  
	  // Update action button visibility
	  this.updateSwipeActions(element, deltaX);
	}
  }

  updateSwipeActions(element, deltaX) {
	const leftZone = element.querySelector('.zone.left');
	const rightZone = element.querySelector('.zone.right');
	
	if (leftZone && rightZone) {
	  // Calculate reveal percentage (0 to 1)
	  const leftReveal = Math.max(0, Math.min(1, deltaX / 80)); // 80px to fully reveal
	  const rightReveal = Math.max(0, Math.min(1, -deltaX / 120)); // 120px to fully reveal
	  
	  // Use CSS custom properties
	  leftZone.style.setProperty('--reveal', leftReveal);
	  rightZone.style.setProperty('--reveal', rightReveal);
	}
  }

  // Keep existing cleanup and utility methods...
  attachListeners(element, gesture) {
	// Create bound functions so we can remove them later
	const boundDown = (e) => this.handlePointerDown(e, gesture);
	const boundMove = (e) => this.handlePointerMove(e, gesture);
	const boundUp = (e) => this.handlePointerUp(e, gesture);

	// Store references for cleanup
	gesture.listeners = { boundDown, boundMove, boundUp };

	// Attach the initial listener
	element.addEventListener('pointerdown', boundDown, { passive: false });
  }

  cleanupGesture(gesture) {
	// Remove from active gestures
	this.activeGestures.delete(gesture.id);
	
	// Remove global event listeners
	window.removeEventListener('pointermove', gesture.listeners.boundMove);
	window.removeEventListener('pointerup', gesture.listeners.boundUp);
	
	// Remove from update queue
	this.updateQueue = this.updateQueue.filter(item => item.gestureId !== gesture.id);
	
	console.log('Gesture cleaned up:', gesture.id);
  }

  destroy() {
	// Cancel animation
	if (this.animationFrame) {
	  cancelAnimationFrame(this.animationFrame);
	}
	
	// Clean up all gestures
	this.activeGestures.forEach(gesture => this.cleanupGesture(gesture));
	this.activeGestures.clear();
	this.updateQueue = [];
	
	console.log('GestureManager destroyed');
  }

  // NEW: Global haptic settings
  setHapticsEnabled(enabled) {
	this.hapticsEnabled = enabled && this.checkHapticsSupport();
	console.log('📳 Haptics', this.hapticsEnabled ? 'enabled' : 'disabled');
  }

  // NEW: Test haptic patterns
  testHapticPattern(pattern) {
	if (this.hapticsEnabled) {
	  haptic(pattern);
	  console.log('📳 Testing haptic pattern:', pattern);
	} else {
	  console.log('❌ Haptics not supported or disabled');
	}
  }
}

// Create singleton instance
export const gestureManager = new GestureManager();

// STEP 17: Helper function to replace your old drag/swipe setup
// Add this to your gestureManager.js file - UPDATED enableGestures function

export function enableGestures() {
  console.log('🎮 Setting up gesture system with haptics...');
  
  // Set up drag gestures for task cards with haptic feedback
  document.querySelectorAll('.task-card').forEach(card => {
	const handle = card.querySelector('.card-handle');
	if (handle && !handle._gestureRegistered) {
	  gestureManager.registerGesture(handle, {
		type: 'drag',
		handlers: {
		  onEnd: (data, wasSuccessful) => {
			console.log('📦 Task drag ended:', {
			  moved: `${data.deltaX}px, ${data.deltaY}px`,
			  successful: wasSuccessful
			});
			
			// Your existing task drag logic goes here
			if (wasSuccessful) {
			  handleTaskDragEnd(card, data);
			}
		  }
		},
		// NEW: Haptic configuration for task dragging
		haptics: {
		  onStart: 'light',      // Light tap when drag starts
		  onActivate: 'medium',  // Medium pulse when drag activates
		  onSuccess: 'success',  // Success pattern on successful drop
		  onEnd: 'light',        // Light tap on failed drag
		  enabled: true
		}
	  });
	  handle._gestureRegistered = true;
	}
  });

  // Set up drag gestures for subtasks with haptic feedback
  document.querySelectorAll('.subtask').forEach(subtask => {
	const handle = subtask.querySelector('.sub-handle');
	if (handle && !handle._gestureRegistered) {
	  gestureManager.registerGesture(handle, {
		type: 'drag',
		handlers: {
		  onEnd: (data, wasSuccessful) => {
			console.log('📝 Subtask drag ended:', {
			  moved: `${data.deltaX}px, ${data.deltaY}px`,
			  successful: wasSuccessful
			});
			
			// Your existing subtask drag logic goes here
			if (wasSuccessful) {
			  handleSubtaskDragEnd(subtask, data);
			}
		  }
		},
		// NEW: Haptic configuration for subtask dragging
		haptics: {
		  onStart: 'light',      // Light tap when drag starts
		  onActivate: 'medium',  // Medium pulse when drag activates  
		  onSuccess: 'success',  // Success pattern on successful drop
		  onEnd: 'light',        // Light tap on failed drag
		  enabled: true
		}
	  });
	  handle._gestureRegistered = true;
	}
  });

  // Set up swipe gestures with contextual haptic feedback
  document.querySelectorAll('.swipe-wrap, .card-swipe-wrap').forEach(wrapper => {
	if (!wrapper._gestureRegistered) {
	  const isTaskCard = wrapper.classList.contains('card-swipe-wrap');
	  
	  gestureManager.registerGesture(wrapper, {
		type: 'swipe',
		handlers: {
		  onEnd: (data, wasSuccessful) => {
			console.log(`👆 ${isTaskCard ? 'Task' : 'Subtask'} swipe ended:`, {
			  deltaX: data.deltaX,
			  successful: wasSuccessful
			});
			
			// Your existing swipe logic goes here
			if (wasSuccessful) {
			  handleSwipeEnd(wrapper, data, isTaskCard);
			}
		  }
		},
		// NEW: Haptic configuration for swiping
		haptics: {
		  onStart: null,         // No haptic on swipe start (too sensitive)
		  onActivate: 'light',   // Light tap when swipe activates
		  onSuccess: 'medium',   // Medium pulse on successful swipe
		  onEnd: null,           // No haptic on cancelled swipe
		  enabled: true
		}
	  });
	  wrapper._gestureRegistered = true;
	}
  });

  console.log('✅ Gesture system with haptics ready!');
  
  // Log setup statistics
  const taskCards = document.querySelectorAll('.task-card').length;
  const subtasks = document.querySelectorAll('.subtask').length;
  const swipeWraps = document.querySelectorAll('.swipe-wrap, .card-swipe-wrap').length;
  
  console.log(`📊 Gestures set up: ${taskCards} task cards, ${subtasks} subtasks, ${swipeWraps} swipe elements`);
}

// NEW: Placeholder handlers for your existing logic
function handleTaskDragEnd(card, data) {
  // Replace this with your existing task reordering logic
  console.log('🔄 Processing task drag end...');
  
  // Example: Get task ID and calculate new position
  const taskId = card.dataset.id;
  // Your existing drag logic here...
}

function handleSubtaskDragEnd(subtask, data) {
  // Replace this with your existing subtask reordering logic
  console.log('🔄 Processing subtask drag end...');
  
  // Example: Get subtask and task IDs
  const subtaskId = subtask.dataset.id;
  const taskId = subtask.dataset.mainId;
  // Your existing drag logic here...
}

function handleSwipeEnd(wrapper, data, isTaskCard) {
  // Replace this with your existing swipe action logic
  console.log('🔄 Processing swipe end...', { isTaskCard, deltaX: data.deltaX });
  
  // Determine action based on swipe direction and distance
  const direction = data.deltaX > 0 ? 'right' : 'left';
  const distance = Math.abs(data.deltaX);
  
  if (distance > 80) {
	if (direction === 'right') {
	  // Complete action
	  performSwipeAction(wrapper, 'complete', isTaskCard);
	} else {
	  // Delete action  
	  performSwipeAction(wrapper, 'delete', isTaskCard);
	}
  }
}

function performSwipeAction(wrapper, action, isTaskCard) {
  console.log(`⚡ Performing ${action} action on ${isTaskCard ? 'task' : 'subtask'}`);
  
  // Add action-specific haptic feedback
  switch (action) {
	case 'complete':
	  haptic('success');
	  break;
	case 'delete':
	  haptic('warning');
	  break;
	case 'edit':
	  haptic('light');
	  break;
  }
  
  // Your existing action logic here...
}

// NEW: Haptic testing functions
export function testGestureHaptics() {
  console.log('🧪 Testing gesture haptics...');
  
  const patterns = ['light', 'medium', 'heavy', 'success', 'warning', 'error'];
  let index = 0;
  
  const testNext = () => {
	if (index >= patterns.length) {
	  console.log('✅ Haptic test completed');
	  return;
	}
	
	const pattern = patterns[index];
	console.log(`📳 Testing ${pattern} haptic...`);
	gestureManager.testHapticPattern(pattern);
	
	index++;
	setTimeout(testNext, 1500);
  };
  
  testNext();
}

// NEW: Enable/disable haptics globally
export function toggleGestureHaptics(enabled = null) {
  if (enabled === null) {
	// Toggle current state
	enabled = !gestureManager.hapticsEnabled;
  }
  
  gestureManager.setHapticsEnabled(enabled);
  console.log('📳 Gesture haptics:', enabled ? 'enabled' : 'disabled');
  
  return enabled;
}

// Make functions globally available for testing
window.testGestureHaptics = testGestureHaptics;
window.toggleGestureHaptics = toggleGestureHaptics;