// swipe.js - Updated for gesture coordinator system
import { pt, clamp, FLAGS } from './core.js';
import { gestureCoordinator, createGestureHandler } from './gestureCoordinator.js';
import { startEditMode, startEditTaskTitle } from './editing.js';
import { TaskOperations } from './taskOperations.js';
import { SWIPE, FEEDBACK, TIMING } from './constants.js';
import { throttle } from './utils.js';

export function enableSwipe() {
  if (!FLAGS.swipeGestures) return;
  
  // Re-query DOM elements every time this is called (after re-renders)
  const subtaskWraps = document.querySelectorAll('.swipe-wrap');
  const cardWraps = document.querySelectorAll('.card-swipe-wrap');
  
  // Remove existing listeners first (prevent duplicates)
  subtaskWraps.forEach(wrap => {
    if (wrap._swipeBound) return;
    attachSubtaskSwipe(wrap);
    wrap._swipeBound = true;
  });
  
  cardWraps.forEach(wrap => {
    if (wrap._swipeBound) return;
    attachTaskSwipe(wrap);
    wrap._swipeBound = true;
  });
  
  // Global click prevention
  const app = document.getElementById('app') || document;
  if (!app._swipeClickBound) {
    app.addEventListener('click', (e) => {
      if (e.target.closest('.action')) e.stopPropagation();
    });
    app._swipeClickBound = true;
  }
}

function attachSubtaskSwipe(wrap) {
  const row = wrap.querySelector('.subtask');
  const actions = wrap.querySelector('.swipe-actions');
  const leftZone = actions?.querySelector('.zone.left');
  const rightZone = actions?.querySelector('.zone.right');

  if (!row || !actions || !leftZone || !rightZone) return;

  // Use CSS custom properties instead of direct style manipulation
  const alignActions = () => {
    const rowRect = row.getBoundingClientRect();
    actions.style.setProperty('--subtask-row-height', `${rowRect.height}px`);
  };
  
  alignActions();
  window.addEventListener('resize', alignActions);

  attachSwipeToElement(wrap, row, actions, leftZone, rightZone, 'subtask');
}

function attachTaskSwipe(wrap) {
  const row = wrap.querySelector('.card-row');
  const actions = wrap.querySelector('.card-swipe-actions');
  const leftZone = actions?.querySelector('.zone.left');
  const rightZone = actions?.querySelector('.zone.right');

  if (!row || !actions || !leftZone || !rightZone) return;

  // Use CSS custom properties instead of direct style manipulation
  const alignActions = () => {
    const rowRect = row.getBoundingClientRect();
    actions.style.setProperty('--card-row-height', `${rowRect.height}px`);
  };
  
  alignActions();
  window.addEventListener('resize', alignActions);

  attachSwipeToElement(wrap, row, actions, leftZone, rightZone, 'task');
}

function attachSwipeToElement(wrap, row, actions, leftZone, rightZone, type) {
  if (!row || !actions || !leftZone || !rightZone) return;
  
  // Create gesture handler
  const gestureType = type === 'task' ? 'swipe-task' : 'swipe-subtask';
  const swipeHandler = createGestureHandler(gestureCoordinator, gestureType);
  
  // Swipe state variables
  let startX = 0, startY = 0, currentX = 0;
  let openX = 0;
  let tracking = false, captured = false;
  let holdTimer = null, isHolding = false;
  let scrollYAtStart = 0;
  let unlockScroll = null;
  let velocityTracker = [];

  // Helper functions
  const getLeftRevealDistance = () => SWIPE.LEFT_REVEAL_DISTANCE || 80;
  const getRightRevealDistance = () => SWIPE.RIGHT_REVEAL_DISTANCE || 120;
  const setTransform = (x) => row.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
  const haptic = () => navigator.vibrate?.(FEEDBACK.HAPTIC_MEDIUM || 8);
  const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Velocity tracking
  function trackVelocity(x, time) {
    velocityTracker.push({ x, time });
    const cutoff = time - SWIPE.FLING_EXPIRE;
    velocityTracker = velocityTracker.filter(s => s.time >= cutoff);
  }

  function getVelocity() {
    if (velocityTracker.length < 2) return 0;
    const latest = velocityTracker[velocityTracker.length - 1];
    const earliest = velocityTracker[0];
    const dt = latest.time - earliest.time;
    if (dt <= 0) return 0;
    return Math.abs(latest.x - earliest.x) / dt;
  }

  function isFling() {
    const velocity = getVelocity();
    const distance = Math.abs(currentX - startX);
    return velocity >= SWIPE.FLING_VX && distance >= SWIPE.FLING_MIN;
  }

  function lockScroll() {
    if (unlockScroll) return;
    document.body.classList.add('lock-scroll');
    const preventScroll = (e) => e.preventDefault();
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('wheel', preventScroll, { passive: false });
    unlockScroll = () => {
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('wheel', preventScroll);
      document.body.classList.remove('lock-scroll');
      unlockScroll = null;
    };
  }

  function applyResistance(x) {
    // Use separate max distances for left and right
    const maxLeft = getLeftRevealDistance() * SWIPE.MAX_OVEREXTEND;
    const maxRight = getRightRevealDistance() * SWIPE.MAX_OVEREXTEND;
    
    if (x > maxLeft) return maxLeft + (x - maxLeft) * SWIPE.RESISTANCE_FACTOR;
    if (x < -maxRight) return -maxRight + (x + maxRight) * SWIPE.RESISTANCE_FACTOR;
    return x;
  }

  function startHoldTimer() {
    clearHoldTimer();
    holdTimer = setTimeout(() => {
      if (captured && tracking && swipeHandler.isActive()) {
        isHolding = true;
        wrap.classList.add('held');
        wrap.style.setProperty('--hold-feedback', '1');
        haptic();
      }
    }, SWIPE.HOLD_MS);
  }

  function clearHoldTimer() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  // Use CSS custom properties instead of direct calculations
  const updateVisuals = throttle((x) => {
    // Use separate distances for left and right zones
    const leftReveal = clamp(x / getLeftRevealDistance(), 0, 1);
    const rightReveal = clamp(-x / getRightRevealDistance(), 0, 1);
    
    leftZone.style.setProperty('--reveal', leftReveal.toFixed(3));
    rightZone.style.setProperty('--reveal', rightReveal.toFixed(3));
  }, 16);

  function pulseZone(zone) {
    zone.style.setProperty('--pulse', SWIPE.PULSE_SCALE || 1.1);
    setTimeout(() => zone.style.setProperty('--pulse', '1'), 180);
  }

  // Event handlers
  function onDown(e) {
    if (e.target.closest('.sub-handle') || 
        e.target.closest('.card-handle') ||
        e.target.closest('a,button,input,textarea,select,label,[contenteditable="true"]')) return;

    const startPoint = { x: e.clientX, y: e.clientY };
    
    // Try to start gesture
    if (!swipeHandler.start(row, startPoint)) {
      return; // Another gesture is active
    }

    startX = startPoint.x;
    startY = startPoint.y;
    currentX = startPoint.x;
    
    tracking = true;
    captured = false;
    isHolding = false;
    
    scrollYAtStart = (document.scrollingElement || document.documentElement).scrollTop || 0;
    wrap.classList.add('swiping');
    
    // Create named function references for proper cleanup
    const handlePointerMove = (e) => onMove(e);
    const handlePointerUp = () => onUp();
    
    // Register cleanup with coordinator
    gestureCoordinator.onCleanup(() => {
      cleanupSwipeState();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    });
    
    try { row.setPointerCapture?.(e.pointerId); } catch {}
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }

  function onMove(e) {
    if (!swipeHandler.isActive()) return;
    
    const samples = e.getCoalescedEvents?.() || [e];
    const p = pt(samples[samples.length - 1]);
    const dx = p.x - startX;
    const dy = p.y - startY;
    const now = performance.now();
    
    currentX = p.x;

    if (!captured) {
      const scrolled = Math.abs(((document.scrollingElement || document.documentElement).scrollTop || 0) - scrollYAtStart) > 2;
      
      if (Math.abs(dy) > SWIPE.VERTICAL_GUARD || scrolled) {
        swipeHandler.cancel('vertical_scroll');
        return;
      }
      
      if (Math.abs(dx) >= SWIPE.MIN_INTENT_DISTANCE) {
        captured = true;
        lockScroll();
        e.preventDefault();
        
        // Activate the gesture
        if (swipeHandler.activate()) {
          startHoldTimer();
        }
      } else {
        return;
      }
    }

    e.preventDefault();
    trackVelocity(p.x, now);
    
    const newX = applyResistance(openX + dx);
    setTransform(newX);
    updateVisuals(newX);
  }

  function onUp() {
    if (!swipeHandler.isActive()) return;
    
    tracking = false;
    clearHoldTimer();
    
    if (!captured) {
      swipeHandler.cancel('no_capture');
      return;
    }
    
    const dx = currentX - startX;
    
    // Check for fling gesture first (highest priority)
    if (isFling()) {
      if (dx > 0) {
        executeAction(type === 'task' ? 'complete-all' : 'complete', leftZone);
      } else {
        executeAction(type === 'task' ? 'delete-task' : 'delete', rightZone);
      }
      return;
    }
    
    // Check for hold-open threshold
    const distance = Math.abs(dx);
    const leftThreshold = getLeftRevealDistance() * 0.6;
    const rightThreshold = getRightRevealDistance() * 0.6;
    
    if (distance >= leftThreshold || distance >= rightThreshold) {
      // Hold open - complete the gesture but keep drawer open
      const targetX = dx > 0 ? getLeftRevealDistance() : -getRightRevealDistance();
      holdOpen(targetX);
      return;
    }
    
    // Snap back to closed
    animateTo(0);
    openX = 0;
    updateVisuals(0);
    swipeHandler.complete();
  }
  
  function holdOpen(targetX) {
    openX = targetX;
    
    // Set the transform immediately and mark as held-open
    setTransform(targetX);
    updateVisuals(targetX);
    wrap.classList.add('held-open');
    wrap.style.removeProperty('--hold-feedback');
    
    // Use a smooth animation to the final position
    row.style.transition = `transform ${TIMING.NORMAL}ms ease`;
    
    // Ensure the position sticks after animation
    setTimeout(() => {
      row.style.transition = '';
      setTransform(targetX);
      console.log(`Drawer visually held at ${targetX}px, openX=${openX}`);
    }, TIMING.NORMAL + 10);
    
    // Complete the gesture to prevent timeout
    swipeHandler.complete();
    
    console.log(`Drawer held open at ${targetX}px - gesture completed`);
  }

  // UPDATE executeAction to not try to complete an already completed gesture:
  function executeAction(actionName, zone) {
    haptic();
    pulseZone(zone);
    
    // Only complete gesture if it's still active
    if (swipeHandler.isActive()) {
      swipeHandler.complete();
    }
    
    // Remove held-open state
    wrap.classList.remove('held-open');
    
    // Then perform action and animate
    performAction(actionName);
    afterExecute(actionName.includes('complete') ? 'right' : 'left');
  }
  
  // ADD a new function to handle action button clicks specifically:
  function handleActionClick(actionName) {
    console.log(`Action clicked: ${actionName}`);
    
    // Remove held-open state immediately
    wrap.classList.remove('held-open');
    
    // Perform the action
    performAction(actionName);
    
    // Close the drawer with animation
    if (actionName !== 'edit' && actionName !== 'edit-title') {
      afterExecute(actionName.includes('complete') ? 'right' : 'left');
    } else {
      // For edit actions, just close normally
      closeDrawer();
    }
  }

  // UPDATE the cleanupSwipeState function to handle held-open state:
  function cleanupSwipeState() {
    // Clear timers
    clearHoldTimer();
  
    // Clean up DOM
    document.body.classList.remove('lock-scroll');
    wrap.classList.remove('swiping', 'held', 'held-open'); // Added 'held-open'
    wrap.style.removeProperty('--hold-feedback');
    
    // Unlock scroll
    if (unlockScroll) {
      unlockScroll();
      unlockScroll = null;
    }
    
    // Reset state variables
    tracking = false;
    captured = false;
    isHolding = false;
    velocityTracker = [];
    
    // Reset styles
    row.style.transform = '';
    row.style.transition = '';
    row.style.opacity = '';
    updateVisuals(0);
    openX = 0; // Reset openX on cleanup
  }
  
  // UPDATE the action button event listener to use the new handler:
  // REPLACE the existing actions.addEventListener with:
  actions.addEventListener('click', async (e) => {
    const button = e.target.closest('.action');
    if (!button) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const actionName = button.dataset.act;
    console.log(`Action button clicked: ${actionName}`);
    
    // Use the specialized handler for action clicks
    handleActionClick(actionName);
  });

  function animateTo(targetX) {
    // Don't animate if we're trying to hold open
    if (wrap.classList.contains('held-open') && targetX !== 0) {
      setTransform(targetX);
      return;
    }
    
    const duration = prefersReducedMotion() ? TIMING.REDUCED_MOTION_DURATION : SWIPE.SNAP_MS;
    row.style.transition = `transform ${duration}ms ease`;
    setTransform(targetX);
    
    const cleanup = () => {
      row.style.transition = '';
      // Don't reset transform if we're held open
      if (!wrap.classList.contains('held-open')) {
        setTransform(targetX);
      }
    };
    
    row.addEventListener('transitionend', cleanup, { once: true });
    // Fallback cleanup
    setTimeout(cleanup, duration + 50);
  }

  function afterExecute(direction) {
    const duration = prefersReducedMotion() ? TIMING.REDUCED_MOTION_DURATION : SWIPE.EXEC_MS;
    const distance = direction === 'right' ? getRightRevealDistance() * 1.2 : -getLeftRevealDistance() * 1.2;
    
    row.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
    setTransform(distance);
    row.style.opacity = 0;
    
    setTimeout(() => {
      // Reset everything
      openX = 0;
      setTransform(0);
      row.style.opacity = 1;
      row.style.transition = '';
      updateVisuals(0);
      wrap.classList.remove('swiping', 'held');
      wrap.style.removeProperty('--hold-feedback');
    }, duration + 10);
  }

  // Action handler
  async function performAction(actionName) {
    try {
      if (type === 'subtask') {
        const mainId = wrap.closest('.task-card').dataset.id;
        const subId = row.dataset.id;
        
        switch (actionName) {
          case 'delete':
            await TaskOperations.subtask.delete(mainId, subId);
            break;
          case 'complete':
            await TaskOperations.subtask.toggle(mainId, subId);
            break;
          case 'edit':
            // For edit actions, clean up immediately
            startEditMode(row);
            return;
        }
      } else if (type === 'task') {
        const taskId = wrap.closest('.task-card').dataset.id;
        
        switch (actionName) {
          case 'complete-all':
            await TaskOperations.task.toggleCompletion(taskId);
            break;
          case 'edit-title':
            // For edit actions, clean up immediately
            startEditTaskTitle(row);
            return;
          case 'delete-task':
            await TaskOperations.task.delete(taskId);
            break;
        }
      }
    } catch (error) {
      console.error('Swipe action failed:', error);
    }
  }
  
  // UPDATE the closeDrawer function to handle held-open state:
  function closeDrawer() {
    if (openX !== 0) {
      animateTo(0);
      openX = 0;
      updateVisuals(0);
      wrap.classList.remove('swiping', 'held', 'held-open');
      isHolding = false;
      
      // No need to complete gesture here since it's already completed in holdOpen
      console.log('Drawer closed');
    }
  }

  // Event bindings
  row.addEventListener('pointerdown', onDown, { passive: true });
  row.addEventListener('click', closeDrawer);
  
  document.addEventListener('pointerdown', (e) => {
    // Check if this specific drawer is held open and click is outside
    if (wrap.classList.contains('held-open') && !wrap.contains(e.target)) {
      console.log('Clicked outside held-open drawer, closing');
      closeDrawer();
    }
    // Also handle the original case for any open drawer
    else if (!wrap.contains(e.target)) {
      closeDrawer();
    }
  });
  
}