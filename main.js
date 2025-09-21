// main.js - Updated with gesture coordinator testing

import { setDomRefs, bootBehaviors, cleanup } from './core.js';
import { renderAll } from './rendering.js';
import './drag.js';
import './swipe.js';
import './menu.js';

// ADD: Import iOS fixes for testing
import { iosManager, haptic, getIOSInfo } from './iosFixes.js';

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
    
    // Initialize iOS fixes first
    if (iosManager.isIOS) {
      console.log('🍎 iOS device detected');
    }
    
    setDomRefs();
    renderAll();
    bootBehaviors();
    
    // ADD: Gesture coordinator testing after everything loads
    setTimeout(() => {
      console.log('🎮 Gesture Coordinator Status:');
      
      if (window.gestureCoordinator) {
        const status = window.gestureCoordinator.getStatus();
        console.log('📊 Coordinator ready:', status);
        
        // Add testing functions
        window.testGestureCoordinator = () => {
          const status = gestureCoordinator.getStatus();
          console.log('🎮 Coordinator Status:', status);
          
          // Show visual status
          const popup = document.createElement('div');
          popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9); color: white; padding: 20px;
            border-radius: 12px; z-index: 10000; text-align: left; font-family: monospace;
          `;
          popup.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 10px;">🎮 Gesture Coordinator</div>
            <div>Drag: ${status.activeGestures.drag ? '✅ Active' : '❌ Inactive'}</div>
            <div>Swipe: ${status.activeGestures.swipe ? '✅ Active' : '❌ Inactive'}</div>
            <div>Animation: ${status.isAnimating ? '✅ Running' : '❌ Stopped'}</div>
            <div>Haptics: ${status.hapticsEnabled ? '✅ Enabled' : '❌ Disabled'}</div>
            <div>Swipe Elements: ${status.swipeElementCount}</div>
          `;
          document.body.appendChild(popup);
          setTimeout(() => popup.remove(), 3000);
          
          return status;
        };
        
        window.testHapticPatterns = () => {
          if (!iosManager.isIOS) {
            console.log('❌ Not iOS device, haptics not available');
            return;
          }
          
          const patterns = ['light', 'medium', 'heavy', 'success', 'warning', 'error'];
          let index = 0;
          
          const testNext = () => {
            if (index >= patterns.length) {
              console.log('✅ Haptic pattern test completed');
              return;
            }
            
            const pattern = patterns[index];
            console.log(`📳 Testing ${pattern} haptic...`);
            haptic(pattern);
            
            // Visual indicator
            const indicator = document.createElement('div');
            indicator.style.cssText = `
              position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
              background: rgba(59, 130, 246, 0.9); color: white; padding: 8px 16px;
              border-radius: 8px; font-weight: bold; z-index: 10000;
            `;
            indicator.textContent = `📳 ${pattern} haptic`;
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
        };
        
        window.testDynamicSwipeDistances = () => {
          const swipeElements = document.querySelectorAll('.swipe-wrap, .card-swipe-wrap');
          
          swipeElements.forEach((element, i) => {
            const distances = gestureCoordinator.getSwipeDistances(element);
            console.log(`📏 Element ${i + 1}:`, distances);
            
            // Visual indication
            const indicator = document.createElement('div');
            indicator.style.cssText = `
              position: absolute; top: 0; left: 0; right: 0; bottom: 0;
              pointer-events: none; z-index: 1000;
              border: 2px solid rgba(59, 130, 246, 0.5);
              background: rgba(59, 130, 246, 0.1);
            `;
            indicator.innerHTML = `
              <div style="position: absolute; top: 2px; left: 2px; background: rgba(59, 130, 246, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
                L:${distances.left}px R:${distances.right}px
              </div>
            `;
            
            element.style.position = 'relative';
            element.appendChild(indicator);
            
            setTimeout(() => {
              if (element.contains(indicator)) {
                element.removeChild(indicator);
              }
            }, 3000);
          });
          
          console.log(`📊 Tested ${swipeElements.length} swipe elements`);
        };
        
        console.log('🧪 Test functions loaded:');
        console.log('  - testGestureCoordinator() - Check coordinator status');
        console.log('  - testHapticPatterns() - Test all haptic patterns');
        console.log('  - testDynamicSwipeDistances() - Show swipe distances');
        
      } else {
        console.warn('⚠️ Gesture coordinator not found');
      }
      
    }, 2000);
    
    console.log('✅ App initialized successfully');
    
  } catch (error) {
    console.error('App initialization failed:', error);
    // Show fallback UI
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="empty">App failed to load. Please refresh the page.</div>';
    }
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  console.log('🚪 Page unloading, cleaning up...');
  cleanup(); // This now includes gesture coordinator cleanup
});

console.log('📱 App with Gesture Coordinator loaded');