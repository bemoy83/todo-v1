// gestureManager.js - Centralized gesture state management
import { DRAG, SWIPE } from './constants.js';

// Gesture states
export const GestureStates = {
  IDLE: 'idle',
  ARMED: 'armed',           // Hold timer active, waiting for movement
  DRAGGING: 'dragging',     // Actively dragging
  SWIPING: 'swiping',       // Actively swiping
  FINISHING: 'finishing'    // Cleanup/animation phase
};

// Gesture types
export const GestureTypes = {
  DRAG_TASK: 'drag_task',
  DRAG_SUBTASK: 'drag_subtask', 
  SWIPE_TASK: 'swipe_task',
  SWIPE_SUBTASK: 'swipe_subtask'
};

// Events that can trigger state transitions
export const GestureEvents = {
  POINTER_DOWN: 'pointer_down',
  HOLD_TIMER_COMPLETE: 'hold_timer_complete',
  MOVEMENT_DETECTED: 'movement_detected',
  JITTER_DETECTED: 'jitter_detected',
  POINTER_UP: 'pointer_up',
  CANCEL: 'cancel',
  COMPLETE: 'complete'
};

class GestureStateMachine extends EventTarget {
  constructor() {
	super();
	this.state = GestureStates.IDLE;
	this.activeGesture = null;
	this.gestureData = null;
	this.debugMode = false;
	
	// State transition rules
	this.transitions = {
	  [GestureStates.IDLE]: {
		[GestureEvents.POINTER_DOWN]: GestureStates.ARMED
	  },
	  [GestureStates.ARMED]: {
		[GestureEvents.HOLD_TIMER_COMPLETE]: GestureStates.ARMED, // Stay armed, ready for movement
		[GestureEvents.MOVEMENT_DETECTED]: (gestureType) => 
		  gestureType.includes('drag') ? GestureStates.DRAGGING : GestureStates.SWIPING,
		[GestureEvents.JITTER_DETECTED]: GestureStates.IDLE,
		[GestureEvents.POINTER_UP]: GestureStates.IDLE,
		[GestureEvents.CANCEL]: GestureStates.IDLE
	  },
	  [GestureStates.DRAGGING]: {
		[GestureEvents.POINTER_UP]: GestureStates.FINISHING,
		[GestureEvents.CANCEL]: GestureStates.FINISHING
	  },
	  [GestureStates.SWIPING]: {
		[GestureEvents.POINTER_UP]: GestureStates.FINISHING,
		[GestureEvents.CANCEL]: GestureStates.FINISHING
	  },
	  [GestureStates.FINISHING]: {
		[GestureEvents.COMPLETE]: GestureStates.IDLE
	  }
	};
  }
  
  // Main transition method
  transition(event, gestureType = null, data = null) {
	const oldState = this.state;
	const allowedTransitions = this.transitions[this.state];
	
	if (!allowedTransitions || !allowedTransitions[event]) {
	  if (this.debugMode) {
		console.warn(`🚫 Invalid transition: ${this.state} + ${event}`);
	  }
	  return false;
	}
	
	// Get new state
	let newState = allowedTransitions[event];
	if (typeof newState === 'function') {
	  newState = newState(gestureType);
	}
	
	// Update state
	this.state = newState;
	
	// Handle gesture type and data
	if (gestureType) {
	  this.activeGesture = gestureType;
	}
	if (data) {
	  this.gestureData = { ...this.gestureData, ...data };
	}
	
	// Clear gesture when returning to idle
	if (newState === GestureStates.IDLE) {
	  this.activeGesture = null;
	  this.gestureData = null;
	}
	
	// Debug logging
	if (this.debugMode || oldState !== newState) {
	  console.log(`🎯 Gesture: ${oldState} → ${newState} (${event}) [${this.activeGesture || 'none'}]`);
	}
	
	// Emit state change event
	this.dispatchEvent(new CustomEvent('statechange', {
	  detail: {
		oldState,
		newState,
		event,
		gestureType: this.activeGesture,
		data: this.gestureData
	  }
	}));
	
	return true;
  }
  
  // Convenience methods
  canStart(gestureType) {
	// Can only start new gestures when idle
	if (this.state !== GestureStates.IDLE) {
	  if (this.debugMode) {
		console.log(`🚫 Cannot start ${gestureType}: current state is ${this.state}`);
	  }
	  return false;
	}
	return true;
  }
  
  canContinue(gestureType) {
	// Can only continue if we're in the right state with the right gesture
	if (this.activeGesture !== gestureType) {
	  return false;
	}
	return this.state === GestureStates.DRAGGING || this.state === GestureStates.SWIPING;
  }
  
  isActive() {
	return this.state !== GestureStates.IDLE;
  }
  
  isArmed() {
	return this.state === GestureStates.ARMED;
  }
  
  isDragging() {
	return this.state === GestureStates.DRAGGING;
  }
  
  isSwiping() {
	return this.state === GestureStates.SWIPING;
  }
  
  isFinishing() {
	return this.state === GestureStates.FINISHING;
  }
  
  getCurrentGesture() {
	return this.activeGesture;
  }
  
  getGestureData() {
	return this.gestureData;
  }
  
  // Force cancel current gesture
  cancel(reason = 'manual') {
	if (this.state !== GestureStates.IDLE) {
	  console.log(`🛑 Canceling gesture: ${reason}`);
	  this.transition(GestureEvents.CANCEL);
	}
  }
  
  // Force complete current gesture
  complete() {
	if (this.state === GestureStates.FINISHING) {
	  this.transition(GestureEvents.COMPLETE);
	}
  }
  
  // Debug helpers
  enableDebug() {
	this.debugMode = true;
	console.log('🐛 Gesture debug mode enabled');
  }
  
  disableDebug() {
	this.debugMode = false;
  }
  
  getStateInfo() {
	return {
	  state: this.state,
	  activeGesture: this.activeGesture,
	  gestureData: this.gestureData,
	  isActive: this.isActive()
	};
  }
}

// Create singleton instance
export const gestureManager = new GestureStateMachine();

// Development helpers
if (typeof window !== 'undefined') {
  window.__GESTURE_MANAGER__ = gestureManager;
  
  // Quick debug toggle
  window.toggleGestureDebug = () => {
	if (gestureManager.debugMode) {
	  gestureManager.disableDebug();
	} else {
	  gestureManager.enableDebug();
	}
  };
}

// Export for convenience
export default gestureManager;