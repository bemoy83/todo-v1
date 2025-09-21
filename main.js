// main.js - Updated with new gesture system and testing code

// OLD IMPORTS (comment out these lines):
// import './drag.js';
// import './swipe.js';

// NEW/UPDATED IMPORTS:
import { setDomRefs, bootBehaviors, cleanup } from './core.js';
import { renderAll } from './rendering.js';
import { gestureManager } from './gestureManager.js'; // NEW: Add gesture manager
import { iosManager, haptic, getIOSInfo } from './iosFixes.js';
import './menu.js';

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  // Could show a user-friendly message here
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  e.preventDefault(); // Prevent console spam
});

document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('📱 App starting...');
    
    // Initialize iOS fixes FIRST (before other setup)
    if (iosManager.isIOS) {
      console.log('🍎 iOS device detected, fixes already applied');
      console.log('📱 Device info:', getIOSInfo());
    }
    
    setDomRefs();
    renderAll();
    bootBehaviors();
    
    // Add iOS-specific testing
    setTimeout(() => {
      console.log('🎯 Performance Test Results:');
      console.log('Active gestures:', gestureManager.activeGestures.size);
      console.log('Animation running:', gestureManager.isAnimating);
      console.log('iOS Manager:', iosManager.isIOS ? '✅ Active' : '❌ Not iOS');
      
      // Add iOS test functions
      if (iosManager.isIOS) {
        window.testIOSFeatures = testIOSFeatures;
        window.testHaptics = testHaptics;
        window.getIOSDebugInfo = getIOSInfo;
        console.log('🍎 iOS test functions loaded:');
        console.log('  - testIOSFeatures() - Test iOS-specific features');
        console.log('  - testHaptics() - Test haptic feedback');
        console.log('  - getIOSDebugInfo() - Get device info');
      }
      
    }, 2000);
    
  } catch (error) {
    console.error('App initialization failed:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="empty">App failed to load. Please refresh the page.</div>';
    }
  }
});

// UPDATED: Cleanup on page unload with gesture manager
window.addEventListener('beforeunload', () => {
  console.log('🚪 Page unloading, cleaning up...');
  cleanup(); // This now includes gestureManager.destroy()
});

// 🧪 STEP 5 TEST CODE - ADD THIS FUNCTION
function testGestureSystem() {
  console.log('🧪 Testing new gesture system...');
  
  // Create a test element
  const testElement = document.createElement('div');
  testElement.style.cssText = `
    width: 100px; 
    height: 100px; 
    background: #ff4444; 
    position: fixed; 
    top: 100px; 
    left: 100px; 
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 12px;
    cursor: grab;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  testElement.textContent = 'DRAG ME';
  document.body.appendChild(testElement);
  
  // Register a drag gesture on the test element
  const gestureId = gestureManager.registerGesture(testElement, {
    type: 'drag',
    handlers: {
      onEnd: (data) => {
        console.log('✅ Test drag completed!', {
          moved: `${data.deltaX}px, ${data.deltaY}px`,
          distance: Math.sqrt(data.deltaX * data.deltaX + data.deltaY * data.deltaY).toFixed(1) + 'px'
        });
        
        // Remove test element
        if (document.body.contains(testElement)) {
          document.body.removeChild(testElement);
          console.log('🗑️ Test element removed');
        }
      }
    }
  });
  
  console.log('🔴 Red test square added. Try dragging it!');
  console.log('📝 Gesture ID:', gestureId);
  
  // Auto-remove after 15 seconds if not interacted with
  setTimeout(() => {
    if (document.body.contains(testElement)) {
      document.body.removeChild(testElement);
      console.log('⏰ Test element auto-removed after 15 seconds');
    }
  }, 15000);
  
  return gestureId;
}

// 🧪 ADDITIONAL TEST FUNCTION - Test swipe gestures
function testSwipeSystem() {
  console.log('👆 Testing swipe system...');
  
  // Find an existing task card to test with
  const existingCard = document.querySelector('.task-card');
  if (!existingCard) {
    console.log('❌ No task cards found. Add a task first, then try this test.');
    return;
  }
  
  console.log('✅ Found task card:', existingCard.querySelector('.task-title')?.textContent);
  console.log('👆 Try swiping left or right on the task card above');
  
  // Add temporary visual indicator
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(59, 130, 246, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 10000;
    pointer-events: none;
  `;
  indicator.textContent = '👆 Swipe the task card';
  document.body.appendChild(indicator);
  
  // Remove indicator after 3 seconds
  setTimeout(() => {
    if (document.body.contains(indicator)) {
      document.body.removeChild(indicator);
    }
  }, 3000);
}

// 🧪 MEMORY TEST FUNCTION
function testMemoryUsage() {
  console.log('🧠 Testing memory usage...');
  
  if (performance.memory) {
    const memory = performance.memory;
    const used = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    const total = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
    const limit = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
    
    console.log(`💾 Memory Usage:
      Used: ${used} MB
      Total: ${total} MB  
      Limit: ${limit} MB
      Usage: ${((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(1)}%`);
    
    if (memory.usedJSHeapSize / memory.totalJSHeapSize > 0.8) {
      console.warn('⚠️ High memory usage detected!');
    } else {
      console.log('✅ Memory usage looks good');
    }
  } else {
    console.log('❌ Memory API not available in this browser');
  }
}

// Make test functions available globally
window.testSwipeSystem = testSwipeSystem;
window.testMemoryUsage = testMemoryUsage;

// Step 2: Add iOS test functions

function testIOSFeatures() {
  console.log('🧪 Testing iOS features...');
  
  const info = getIOSInfo();
  console.log('📱 Device Info:', info);
  
  // Test viewport height
  const vh = getComputedStyle(document.documentElement).getPropertyValue('--vh');
  const realVh = getComputedStyle(document.documentElement).getPropertyValue('--real-vh');
  console.log('📏 Viewport heights:', { vh, realVh });
  
  // Test safe areas
  const safeTop = getComputedStyle(document.documentElement).getPropertyValue('--safe-top');
  const safeBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom');
  console.log('🛡️ Safe areas:', { top: safeTop, bottom: safeBottom });
  
  // Test device classes
  const classes = Array.from(document.body.classList).filter(c => 
    c.includes('ios') || c.includes('notch') || c.includes('island') || c.includes('standalone')
  );
  console.log('🏷️ iOS classes:', classes);
  
  // Visual feedback
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: bold;
    z-index: 10000;
    pointer-events: none;
    text-align: center;
  `;
  indicator.innerHTML = `
    <div>🍎 iOS Features Test</div>
    <div style="font-size: 14px; margin-top: 8px;">Check console for details</div>
  `;
  document.body.appendChild(indicator);
  
  setTimeout(() => {
    if (document.body.contains(indicator)) {
      document.body.removeChild(indicator);
    }
  }, 3000);
  
  return info;
}

function testHaptics() {
  console.log('📳 Testing haptic feedback...');
  
  if (!iosManager.isIOS) {
    console.log('❌ Not iOS device, haptics not available');
    return;
  }
  
  const hapticTypes = ['light', 'medium', 'heavy', 'success', 'error', 'warning'];
  let index = 0;
  
  const testNext = () => {
    if (index >= hapticTypes.length) {
      console.log('✅ Haptic test completed');
      return;
    }
    
    const type = hapticTypes[index];
    console.log(`📳 Testing ${type} haptic...`);
    haptic(type);
    
    // Show visual feedback
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(59, 130, 246, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      pointer-events: none;
    `;
    indicator.textContent = `📳 ${type} haptic`;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      if (document.body.contains(indicator)) {
        document.body.removeChild(indicator);
      }
    }, 1000);
    
    index++;
    setTimeout(testNext, 1500);
  };
  
  testNext();
}

// 1. BASIC HAPTIC TEST - Add to your main.js setTimeout section:
setTimeout(() => {
  if (iosManager.isIOS) {
    console.log('📳 Haptic testing functions loaded:');
    console.log('  - testGestureHaptics() - Test all haptic patterns');
    console.log('  - toggleGestureHaptics() - Enable/disable haptics');
    console.log('  - testSwipeHaptics() - Test swipe-specific haptics');
    
    // Make testing functions available
    window.testSwipeHaptics = testSwipeHaptics;
    window.hapticDemo = hapticDemo;
  }
}, 2000);

// 2. SWIPE-SPECIFIC HAPTIC TEST
function testSwipeHaptics() {
  console.log('👆 Testing swipe haptic patterns...');
  
  if (!iosManager.isIOS) {
    console.log('❌ Not iOS device, haptics not available');
    return;
  }
  
  const tests = [
    { action: 'Swipe Recognition', pattern: 'light', delay: 0 },
    { action: 'Hold Gesture', pattern: 'medium', delay: 1000 },
    { action: 'Complete Action', pattern: 'success', delay: 2000 },
    { action: 'Delete Action', pattern: 'warning', delay: 3000 },
    { action: 'Edit Action', pattern: 'light', delay: 4000 },
    { action: 'Error Feedback', pattern: 'error', delay: 5000 }
  ];
  
  tests.forEach(test => {
    setTimeout(() => {
      console.log(`📳 ${test.action}: ${test.pattern}`);
      haptic(test.pattern);
      
      // Visual feedback
      showHapticIndicator(test.action, test.pattern);
    }, test.delay);
  });
}

// 3. HAPTIC DEMO WITH VISUAL FEEDBACK
function hapticDemo() {
  console.log('🎬 Starting haptic demo...');
  
  const demoSteps = [
    {
      name: 'Gesture Start',
      haptic: 'light',
      description: 'Light tap when you start dragging',
      color: '#3b82f6'
    },
    {
      name: 'Gesture Activate',
      haptic: 'medium',
      description: 'Medium pulse when gesture activates',
      color: '#8b5cf6'
    },
    {
      name: 'Success',
      haptic: 'success',
      description: 'Success pattern for completed actions',
      color: '#10b981'
    },
    {
      name: 'Warning',
      haptic: 'warning',
      description: 'Warning pattern for delete actions',
      color: '#f59e0b'
    },
    {
      name: 'Error',
      haptic: 'error',
      description: 'Error pattern for failed actions',
      color: '#ef4444'
    }
  ];
  
  let currentStep = 0;
  
  const runNext = () => {
    if (currentStep >= demoSteps.length) {
      console.log('✅ Haptic demo completed');
      return;
    }
    
    const step = demoSteps[currentStep];
    console.log(`📳 ${step.name}: ${step.description}`);
    
    // Trigger haptic
    haptic(step.haptic);
    
    // Show visual indicator
    showHapticIndicator(step.name, step.haptic, step.color);
    
    currentStep++;
    setTimeout(runNext, 2000);
  };
  
  runNext();
}

// 4. VISUAL HAPTIC INDICATOR
function showHapticIndicator(action, pattern, color = '#3b82f6') {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${color};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: bold;
    z-index: 10000;
    pointer-events: none;
    text-align: center;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    animation: hapticPulse 0.6s ease-out;
  `;
  
  indicator.innerHTML = `
    <div style="font-size: 18px; margin-bottom: 4px;">📳 ${action}</div>
    <div style="font-size: 14px; opacity: 0.9;">${pattern} haptic</div>
  `;
  
  // Add animation keyframes if not already added
  if (!document.getElementById('haptic-animations')) {
    const style = document.createElement('style');
    style.id = 'haptic-animations';
    style.textContent = `
      @keyframes hapticPulse {
        0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(indicator);
  
  setTimeout(() => {
    if (document.body.contains(indicator)) {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translate(-50%, -50%) scale(0.9)';
      indicator.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        if (document.body.contains(indicator)) {
          document.body.removeChild(indicator);
        }
      }, 300);
    }
  }, 1500);
}

// 5. GESTURE-SPECIFIC TESTING
function testDragHaptics() {
  console.log('🎯 Testing drag haptic sequence...');
  
  const sequence = [
    { step: 'Touch Down', haptic: 'light', delay: 0 },
    { step: 'Drag Start', haptic: 'medium', delay: 500 },
    { step: 'Successful Drop', haptic: 'success', delay: 2000 }
  ];
  
  sequence.forEach(item => {
    setTimeout(() => {
      console.log(`🎯 Drag: ${item.step}`);
      haptic(item.haptic);
      showHapticIndicator(`Drag ${item.step}`, item.haptic, '#8b5cf6');
    }, item.delay);
  });
}

// 6. REAL-WORLD SCENARIO TESTS
function testRealWorldHaptics() {
  console.log('🌍 Testing real-world haptic scenarios...');
  
  const scenarios = [
    {
      name: 'Complete Task',
      steps: [
        { action: 'Swipe Start', haptic: 'light', delay: 0 },
        { action: 'Action Threshold', haptic: 'light', delay: 300 },
        { action: 'Task Completed', haptic: 'success', delay: 600 }
      ]
    },
    {
      name: 'Delete Task',
      steps: [
        { action: 'Swipe Start', haptic: 'light', delay: 2000 },
        { action: 'Delete Threshold', haptic: 'light', delay: 2300 },
        { action: 'Task Deleted', haptic: 'warning', delay: 2600 }
      ]
    },
    {
      name: 'Edit Task',
      steps: [
        { action: 'Long Press', haptic: 'medium', delay: 4000 },
        { action: 'Edit Mode', haptic: 'light', delay: 4300 }
      ]
    }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`📋 Scenario: ${scenario.name}`);
    
    scenario.steps.forEach(step => {
      setTimeout(() => {
        console.log(`  ${step.action}: ${step.haptic}`);
        haptic(step.haptic);
        showHapticIndicator(step.action, step.haptic);
      }, step.delay);
    });
  });
}

// 7. PERFORMANCE MONITORING
function monitorHapticPerformance() {
  console.log('📊 Monitoring haptic performance...');
  
  let hapticCount = 0;
  let lastHapticTime = 0;
  
  // Override haptic function to monitor usage
  const originalHaptic = window.haptic;
  window.haptic = function(pattern) {
    const now = performance.now();
    const timeSinceLastHaptic = now - lastHapticTime;
    
    hapticCount++;
    lastHapticTime = now;
    
    console.log(`📳 Haptic #${hapticCount}: ${pattern} (${timeSinceLastHaptic.toFixed(1)}ms since last)`);
    
    if (timeSinceLastHaptic < 50) {
      console.warn('⚠️ Rapid haptic feedback detected (may reduce battery)');
    }
    
    return originalHaptic(pattern);
  };
  
  // Report stats every 10 seconds
  setInterval(() => {
    if (hapticCount > 0) {
      console.log(`📊 Haptic Stats: ${hapticCount} haptics in last 10s`);
      hapticCount = 0;
    }
  }, 10000);
}

// 8. GESTURE INTERACTION SIMULATOR
function simulateGestureHaptics() {
  console.log('🎮 Simulating gesture interactions with haptics...');
  
  const interactions = [
    {
      name: 'Drag Task Card',
      sequence: () => {
        haptic('light');   // Touch down
        setTimeout(() => haptic('medium'), 200);  // Drag activate
        setTimeout(() => haptic('success'), 1000); // Successful drop
      }
    },
    {
      name: 'Swipe to Complete',
      sequence: () => {
        setTimeout(() => haptic('light'), 2000);   // Swipe recognize
        setTimeout(() => haptic('light'), 2200);   // Cross threshold
        setTimeout(() => haptic('success'), 2400); // Complete action
      }
    },
    {
      name: 'Failed Gesture',
      sequence: () => {
        setTimeout(() => haptic('light'), 4000);   // Gesture start
        setTimeout(() => haptic('medium'), 4200);  // Activate
        setTimeout(() => haptic('light'), 4800);   // Return to start (no success haptic)
      }
    }
  ];
  
  interactions.forEach(interaction => {
    console.log(`🎭 ${interaction.name}`);
    interaction.sequence();
  });
}

// Make all test functions globally available
Object.assign(window, {
  testSwipeHaptics,
  hapticDemo,
  testDragHaptics,
  testRealWorldHaptics,
  monitorHapticPerformance,
  simulateGestureHaptics
});

console.log('🧪 Haptic testing suite loaded');
console.log('💡 Available test functions:');
console.log('  - hapticDemo() - Full haptic demo with visuals');
console.log('  - testSwipeHaptics() - Test swipe-specific patterns');
console.log('  - testDragHaptics() - Test drag gesture sequence');
console.log('  - testRealWorldHaptics() - Test realistic scenarios');
console.log('  - monitorHapticPerformance() - Monitor haptic usage');
console.log('  - simulateGestureHaptics() - Simulate gesture interactions');

// 🧪 QUICK HEALTH CHECK FUNCTION
function appHealthCheck() {
  console.log('🏥 App Health Check:');
  
  const checks = {
    'DOM ready': !!document.getElementById('app'),
    'Gesture manager loaded': !!gestureManager,
    'Active gestures': gestureManager.activeGestures.size,
    'Animation running': gestureManager.isAnimating,
    'Task cards found': document.querySelectorAll('.task-card').length,
    'Swipe wraps found': document.querySelectorAll('.swipe-wrap').length,
    'Memory usage': performance.memory ? 
      `${((performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100).toFixed(1)}%` : 
      'Unknown'
  };
  
  Object.entries(checks).forEach(([check, result]) => {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${check}: ${result}`);
  });
  
  return checks;
}

window.appHealthCheck = appHealthCheck;

console.log('🎮 Test functions loaded:');
console.log('  - testGestureSystem() - Test drag gestures');
console.log('  - testSwipeSystem() - Test swipe gestures');  
console.log('  - testMemoryUsage() - Check memory usage');
console.log('  - appHealthCheck() - Overall app status');