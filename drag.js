// drag.js - Complete corrected structure

import { $, $$, pt, clamp } from './core.js';
import { gestureCoordinator, createGestureHandler } from './gestureCoordinator.js';
import { store } from './store.js';
import { TaskOperations } from './taskOperations.js';
import { DRAG } from './constants.js';

const { HOLD_MS, JITTER_PX, GATE, FORCE, FOLLOW_MIN, FOLLOW_MAX, SPEED_GAIN, GAP_GAIN, SNAP_EPS } = DRAG;

export function bindCrossSortContainer() {
  const app = document.getElementById('app');
  const dragLayer = document.getElementById('dragLayer');
  if (!app || !dragLayer) return;

  patchCSSOnce();

  // Helpers
  const getRows = (list) => Array.from(list.children).filter(n => n.classList?.contains('swipe-wrap'));
  const tailAnchor = (list) => list.querySelector('.add-subtask-form');

  // ----- Subtask drag state -----
  let drag = null, ghost = null, ph = null;
  let start = null, hold = false, armedAt = null, timer = null, started = false;
  let anchorY = 0, railLeft = 0, sourceMainId = null, gw = 0, gh = 0;
  let targetY = 0, smoothY = 0, ticking = false, prevTargetY = 0, prevStepY = 0;
  let slotOriginCenterY = 0, lastFrameT = 0;

  // ----- Card drag state -----
  let cdrag = null, cghost = null, cph = null;
  let cstart = null, chold = false, cstarted = false, carmedAt = null, ctimer = null;
  let csmoothY = 0, ctargetY = 0, cprevTargetY = 0, cslotOriginCenterY = 0, canchorY = 0;
  let cgw = 0, cgh = 0, crailLeft = 0, cardTicking = false, clastSwapY = null;
  let cintent = 0, cintentStartY = 0;
  const CARD_STICKY = 16, CARD_SWAP_PX = 56, CARD_EDGE_FRAC = 0.25;

  // ===== Subtask drag functions =====
  
  function onPointerDown(e) {
    const handle = e.target.closest('.sub-handle');
    const row = e.target.closest('.subtask');
    if (!handle || !row) return;

    const dragHandler = createGestureHandler(gestureCoordinator, 'drag-subtask');
    
    const startPoint = { x: e.clientX, y: e.clientY };
    const taskMainId = row.closest('.task-card').dataset.id;

    if (!dragHandler.start(row, startPoint, { sourceMainId: taskMainId })) {
      return;
    }

    e.preventDefault();
    try { handle.setPointerCapture?.(e.pointerId); } catch {}
    
    drag = row;
    start = startPoint;
    sourceMainId = taskMainId;
    hold = false;
    started = false;
    armedAt = null;

    const handlePointerMove = (e) => onPointerMove(e, dragHandler);
    const handlePointerUp = () => onPointerUp(dragHandler);

    gestureCoordinator.onCleanup(() => {
      cleanupDragState();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    });

    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!dragHandler.isActive()) return;
      hold = true;
      armedAt = startPoint;
      row.classList.add('armed');
      if (navigator.vibrate) navigator.vibrate(5);
    }, HOLD_MS);

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }

  function onPointerMove(e, dragHandler) {
    if (!dragHandler.isActive()) return;

    const samples = e.getCoalescedEvents?.() || [e];
    const last = samples[samples.length - 1];
    const p = pt(last);

    const dx0 = Math.abs(p.x - start.x), dy0 = Math.abs(p.y - start.y);
    
    if (!hold) {
      if (dx0 > JITTER_PX || dy0 > JITTER_PX) {
        clearTimeout(timer);
        drag.classList.remove('armed');
        dragHandler.cancel('jitter');
        return;
      }
      return;
    }
    
    if (hold && !started) {
      const dx = Math.abs(p.x - armedAt.x), dy = Math.abs(p.y - armedAt.y);
      if (dx + dy > 2) {
        if (dragHandler.activate()) {
          startDrag(p);
        }
      } else return;
    } else if (!hold) return;

    e.preventDefault();
    const appRect = app.getBoundingClientRect();
    const pointerCY = p.y - appRect.top;
    prevTargetY = targetY;
    targetY = pointerCY - anchorY;
  }

  async function onPointerUp(dragHandler) {
    clearTimeout(timer);
    document.body.classList.remove('lock-scroll');
    
    if (!started) {
      dragHandler.cancel('no_movement');
      return;
    }
    
    const subtaskId = drag?.dataset?.id;
    const savedSourceMainId = sourceMainId;
    
    const targetList = ph?.parentElement?.classList.contains('subtask-list') ? ph.parentElement : null;
    const targetMainCard = targetList ? targetList.closest('.task-card') : null;
    const targetMainId = targetMainCard ? targetMainCard.dataset.id : null;
    
    let newIndex = 0;
    if (targetList) {
      for (let n = targetList.firstElementChild; n; n = n.nextElementSibling) {
        if (n === ph) break;
        if (n.classList?.contains('swipe-wrap')) newIndex++;
      }
    }
    
    dragHandler.complete();
    
    if (targetList && targetMainId && subtaskId && savedSourceMainId) {
      try {
        await TaskOperations.subtask.move(savedSourceMainId, subtaskId, targetMainId, newIndex);
        console.log(`Subtask moved from ${savedSourceMainId} to ${targetMainId} at index ${newIndex}`);
      } catch (error) {
        console.error('Subtask drag failed:', error);
      }
    } else {
      console.log('Invalid subtask drop target');
    }
  }

  function cleanupDragState() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    
    document.body.classList.remove('lock-scroll');
    if (drag) drag.classList.remove('armed');
    
    if (dragLayer) dragLayer.innerHTML = '';
    
    drag = null;
    ghost = null;
    ph = null;
    hold = false;
    started = false;
    start = null;
    armedAt = null;
    sourceMainId = null;
    ticking = false;
  }

  // ===== Card drag functions =====
  
  function onCardPointerDown(e) {
    const handle = e.target.closest('.card-handle');
    const card = e.target.closest('.task-card');
    if (!handle || !card) return;

    const cardDragHandler = createGestureHandler(gestureCoordinator, 'drag-task');
    
    const startPoint = { x: e.clientX, y: e.clientY };
    
    if (!cardDragHandler.start(card, startPoint)) {
      return;
    }

    e.preventDefault();
    try { handle.setPointerCapture?.(e.pointerId); } catch {}
    
    cdrag = card;
    cstart = startPoint;
    chold = false;
    cstarted = false;
    carmedAt = null;
    
    const handleCardPointerMove = (e) => onCardPointerMove(e, cardDragHandler);
    const handleCardPointerUp = () => onCardPointerUp(cardDragHandler);
    
    gestureCoordinator.onCleanup(() => {
      cleanupCardDragState();
      window.removeEventListener('pointermove', handleCardPointerMove);
      window.removeEventListener('pointerup', handleCardPointerUp);
    });
    
    clearTimeout(ctimer);
    ctimer = setTimeout(() => {
      if (!cardDragHandler.isActive()) return;
      chold = true;
      carmedAt = startPoint;
      cdrag.classList.add('armed');
      if (navigator.vibrate) navigator.vibrate(5);
    }, HOLD_MS);

    window.addEventListener('pointermove', handleCardPointerMove, { passive: false });
    window.addEventListener('pointerup', handleCardPointerUp, { once: true });
  }

  function onCardPointerMove(e, cardDragHandler) {
    if (!cardDragHandler.isActive()) return;
    
    const samples = e.getCoalescedEvents?.() || [e];
    const p = pt(samples[samples.length - 1]);

    const dx0 = Math.abs(p.x - cstart.x), dy0 = Math.abs(p.y - cstart.y);
    
    if (!chold) {
      if (dx0 > JITTER_PX || dy0 > JITTER_PX) {
        clearTimeout(ctimer);
        cdrag.classList.remove('armed');
        cardDragHandler.cancel('jitter');
        return;
      }
      return;
    }
    
    if (chold && !cstarted) {
      const dx = Math.abs(p.x - carmedAt.x), dy = Math.abs(p.y - carmedAt.y);
      if (dx + dy > 2) {
        if (cardDragHandler.activate()) {
          startCardDrag(p);
        }
      } else return;
    } else if (!chold) return;

    e.preventDefault();
    const appRect = app.getBoundingClientRect();
    const pointerCY = p.y - appRect.top;
    cprevTargetY = ctargetY;
    ctargetY = pointerCY - canchorY;
  }

  async function onCardPointerUp(cardDragHandler) {
    clearTimeout(ctimer);
    document.body.classList.remove('lock-scroll');
    
    if (!cstarted) {
      cardDragHandler.cancel('no_movement');
      return;
    }
  
    const movingId = cdrag?.dataset?.id;
    
    const oldIndex = movingId ? store.getState().findIndex(x => x.id === movingId) : -1;
    
    let newIndex = 0;
    for (let n = app.firstElementChild; n; n = n.nextElementSibling) {
      if (n === cph) break;
      if (n.classList?.contains('task-card')) newIndex++;
    }
  
    cardDragHandler.complete();
  
    if (oldIndex !== -1 && movingId) {
      try {
        await TaskOperations.task.move(oldIndex, newIndex);
        console.log(`Task moved from ${oldIndex} to ${newIndex}`);
      } catch (error) {
        console.error('Task drag failed:', error);
      }
    } else {
      console.log('Invalid task move - could not find task or indices');
    }
  }

  function cleanupCardDragState() {
    if (ctimer) {
      clearTimeout(ctimer);
      ctimer = null;
    }
    
    document.body.classList.remove('lock-scroll');
    if (cdrag) cdrag.classList.remove('armed');
    
    if (dragLayer) dragLayer.innerHTML = '';
    
    cdrag = null;
    cghost = null;
    cph = null;
    chold = false;
    cstarted = false;
    cstart = null;
    carmedAt = null;
    cintent = 0;
    clastSwapY = null;
    cardTicking = false;
  }

  // ===== Event binding =====
  app.addEventListener('pointerdown', onPointerDown, { passive: false });
  app.addEventListener('pointerdown', onCardPointerDown, { passive: false });

  // ===== Keep all your existing helper functions below =====
  // (startDrag, startCardDrag, step, cardStep, insertIntoListByGate, etc.)
  
  // I'll provide these in the next part since they're lengthy...


// Add these helper functions to the end of your bindCrossSortContainer function in drag.js:

  function startDrag(p) {
    started = true; 
    drag.classList.remove('armed');
    document.body.classList.add('lock-scroll');

    const r = drag.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();

    ghost = drag.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.setProperty('--ghost-w', r.width);
    ghost.style.setProperty('--ghost-h', r.height);
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    ghost.style.willChange = 'transform, opacity';
    gw = r.width; gh = r.height;

    const wrap = drag.closest('.swipe-wrap');
    ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.style.height = r.height + 'px';
    wrap.insertAdjacentElement('afterend', ph);
    wrap.remove();

    const pointerCY = (p.y - appRect.top);
    const cardTopCY = r.top - appRect.top;
    anchorY = pointerCY - cardTopCY;

    railLeft = (r.left - appRect.left);
    ghost.style.left = railLeft + 'px';

    targetY = smoothY = pointerCY - anchorY;
    prevTargetY = targetY; 
    prevStepY = smoothY;
    ghost.style.transform = `translate3d(0,${smoothY}px,0)`;
    dragLayer.appendChild(ghost);
    ghost.style.visibility = 'visible';

    const phr = ph.getBoundingClientRect();
    slotOriginCenterY = (phr.top - appRect.top) + phr.height / 2;

    lastFrameT = performance.now();
    
    if (!ticking) { 
      ticking = true; 
      requestAnimationFrame(step); 
    }
  }

  function startCardDrag(p) {
    cstarted = true; 
    cdrag.classList.remove('armed');
    document.body.classList.add('lock-scroll');

    const r = cdrag.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();

    cghost = cdrag.cloneNode(true);
    cghost.classList.add('drag-ghost');
    cghost.style.setProperty('--ghost-w', r.width);
    cghost.style.setProperty('--ghost-h', r.height);
    cghost.style.width = r.width + 'px'; 
    cghost.style.height = r.height + 'px';
    cghost.style.willChange = 'transform, opacity';
    cgw = r.width; cgh = r.height;

    cph = document.createElement('div');
    cph.className = 'placeholder';
    cph.style.height = r.height + 'px';
    cdrag.insertAdjacentElement('afterend', cph);
    cdrag.remove();

    const pointerCY = (p.y - appRect.top);
    const cardTopCY = r.top - appRect.top;
    canchorY = pointerCY - cardTopCY;
    crailLeft = (r.left - appRect.left);
    cghost.style.left = crailLeft + 'px';
    ctargetY = csmoothY = pointerCY - canchorY;
    cprevTargetY = ctargetY;
    cghost.style.transform = `translate3d(0,${csmoothY}px,0)`;
    dragLayer.appendChild(cghost);
    cghost.style.visibility = 'visible';

    const phr = cph.getBoundingClientRect();
    cslotOriginCenterY = (phr.top - appRect.top) + phr.height / 2;

    if (!cardTicking) { 
      cardTicking = true; 
      requestAnimationFrame(cardStep); 
    }
  }

  function insertIntoListByGate(targetList, ghostCenterY, appRect){
    const anchor = tailAnchor(targetList);
    const rows = getRows(targetList);

    if (rows.length === 0) {
      anchor ? targetList.insertBefore(ph, anchor) : targetList.appendChild(ph);
      return;
    }

    let placed = false;
    for (const n of rows) {
      const content = n.querySelector('.subtask');
      const r = content.getBoundingClientRect();
      const gateTop = (r.top - appRect.top) + r.height * GATE;
      const gateBot = (r.bottom - appRect.top) - r.height * GATE;
      if (ghostCenterY <= gateTop) { 
        targetList.insertBefore(ph, n); 
        placed = true; 
        break; 
      }
      if (ghostCenterY >= gateBot) { 
        continue; 
      }
    }

    if (!placed) {
      anchor ? targetList.insertBefore(ph, anchor) : targetList.appendChild(ph);
    }
  }

  function step(now) {
    if (!drag) { ticking = false; return; }

    const dt = Math.max(1, (now || performance.now()) - lastFrameT);
    lastFrameT = (now || performance.now());

    const gap = Math.abs(targetY - smoothY);
    const vel = Math.abs(targetY - prevStepY) / dt;
    let alpha = FOLLOW_MIN + GAP_GAIN * gap + SPEED_GAIN * (vel * 1000);
    if (alpha > FOLLOW_MAX) alpha = FOLLOW_MAX;

    smoothY += (targetY - smoothY) * alpha;
    prevStepY = smoothY;

    const renderY = Math.abs(targetY - smoothY) < SNAP_EPS ? targetY : smoothY;
    ghost.style.transform = `translate3d(0,${renderY}px,0)`;

    // Autoscroll logic
    try {
      const gr = ghost.getBoundingClientRect();
      const doc = document.scrollingElement || document.documentElement;
      const vh = window.innerHeight || doc.clientHeight || 0;
      if (vh && gr) {
        const EDGE = 56, MAX = 18;
        const topGap = gr.top, bottomGap = vh - gr.bottom;
        const ramp = g => Math.min(1, Math.max(0, (EDGE - g) / EDGE)) ** 2;
        const willDown = targetY >= prevTargetY;
        const moved = Math.abs(targetY - prevTargetY) > 2;
        let dy = 0;
        if (moved && !willDown && topGap < EDGE && doc.scrollTop > 0) {
          dy = -Math.min(MAX, MAX * ramp(topGap));
        } else if (moved && willDown && bottomGap < EDGE && (doc.scrollTop + vh) < doc.scrollHeight) {
          dy = Math.min(MAX, MAX * ramp(bottomGap));
        }
        if (dy) window.scrollBy(0, Math.round(dy));
      }
    } catch {}

    const appRect = app.getBoundingClientRect();
    const ghostCenterY = (renderY) + gh / 2;
    const probeX = railLeft + gw / 2;

    // Find target list
    let targetList = null;
    for (const ls of $$('.subtask-list', app)) {
      const lr = ls.getBoundingClientRect();
      const lyTop = lr.top - appRect.top, lyBot = lr.bottom - appRect.top;
      const lxLeft = lr.left - appRect.left, lxRight = lr.right - appRect.left;
      if (ghostCenterY >= lyTop && ghostCenterY <= lyBot && probeX >= lxLeft && probeX <= lxRight) {
        targetList = ls; 
        break;
      }
    }
    if (!targetList) { 
      requestAnimationFrame(step); 
      return; 
    }

    const dirDown = targetY >= prevTargetY;
    prevTargetY = targetY;

    if (ph.parentElement !== targetList) {
      insertIntoListByGate(targetList, ghostCenterY, appRect);
      const phr = ph.getBoundingClientRect();
      slotOriginCenterY = (phr.top - appRect.top) + phr.height / 2;
      requestAnimationFrame(step);
      return;
    }

    // Slot movement logic (simplified for space)
    const before = ph.previousElementSibling?.classList?.contains('swipe-wrap') ? ph.previousElementSibling : null;
    const after  = ph.nextElementSibling?.classList?.contains('swipe-wrap') ? ph.nextElementSibling : null;

    let moved = false;
    if (dirDown && after) {
      const content = after.querySelector('.subtask');
      const ar = content.getBoundingClientRect();
      const gate = (ar.top - appRect.top) + ar.height * GATE;
      const forceGate = slotOriginCenterY + gh * FORCE;
      if (ghostCenterY >= gate || ghostCenterY >= forceGate) {
        const anchor = tailAnchor(targetList);
        const next = after.nextElementSibling;
        const ref = (next && next !== anchor) ? next : anchor;
        targetList.insertBefore(ph, ref);
        moved = true;
      }
    } else if (!dirDown && before) {
      const content = before.querySelector('.subtask');
      const br = content.getBoundingClientRect();
      const gate = (br.bottom - appRect.top) - br.height * GATE;
      const forceGate = slotOriginCenterY - gh * FORCE;
      if (ghostCenterY <= gate || ghostCenterY <= forceGate) {
        targetList.insertBefore(ph, before);
        moved = true;
      }
    }

    if (moved) {
      const phr = ph.getBoundingClientRect();
      slotOriginCenterY = (phr.top - appRect.top) + phr.height / 2;
    }

    requestAnimationFrame(step);
  }

  function cardStep() {
    if (!cghost) { cardTicking = false; return; }

    const gap = Math.abs(ctargetY - csmoothY);
    const vel = Math.abs(ctargetY - csmoothY) / 16;
    let alpha = FOLLOW_MIN + GAP_GAIN * gap + SPEED_GAIN * (vel * 1000);
    if (alpha > FOLLOW_MAX) alpha = FOLLOW_MAX;
    csmoothY += (ctargetY - csmoothY) * alpha;

    const renderY = Math.abs(ctargetY - csmoothY) < SNAP_EPS ? ctargetY : csmoothY;
    cghost.style.transform = `translate3d(0,${renderY}px,0)`;

    // Card autoscroll (same pattern as subtask)
    try {
      const gr = cghost.getBoundingClientRect();
      const doc = document.scrollingElement || document.documentElement;
      const vh = window.innerHeight || doc.clientHeight || 0;
      if (vh && gr) {
        const EDGE = 56, MAX = 18;
        const topGap = gr.top, bottomGap = vh - gr.bottom;
        const ramp = g => Math.min(1, Math.max(0, (EDGE - g) / EDGE)) ** 2;
        const willDown = ctargetY >= cprevTargetY;
        const moved = Math.abs(ctargetY - cprevTargetY) > 2;
        let dy = 0;
        if (moved && !willDown && topGap < EDGE && doc.scrollTop > 0) {
          dy = -Math.min(MAX, MAX * ramp(topGap));
        } else if (moved && willDown && bottomGap < EDGE && (doc.scrollTop + vh) < doc.scrollHeight) {
          dy = Math.min(MAX, MAX * ramp(bottomGap));
        }
        if (dy) window.scrollBy(0, Math.round(dy));
      }
    } catch {}

    // Card swapping logic (simplified)
    const appRect = app.getBoundingClientRect();
    const ghostCenterY = renderY + cgh / 2;
    const dirDown = ctargetY >= cprevTargetY;
    const currentSign = dirDown ? 1 : -1;
    
    if (cintent === 0) { 
      cintent = currentSign; 
      cintentStartY = renderY; 
    } else if (cintent !== currentSign) {
      if (Math.abs(renderY - cintentStartY) > CARD_STICKY) { 
        cintent = currentSign; 
        cintentStartY = renderY; 
      }
    }
    cprevTargetY = ctargetY;

    const before = cph.previousElementSibling?.classList?.contains('task-card') ? cph.previousElementSibling : null;
    const after  = cph.nextElementSibling?.classList?.contains('task-card') ? cph.nextElementSibling : null;

    let moved = false;
    if (cintent > 0 && after) {
      const ar = after.getBoundingClientRect();
      const afterTopCY = (ar.top - appRect.top);
      const confirmCY = afterTopCY + ar.height * CARD_EDGE_FRAC;
      const ghostBottom = renderY + cgh;
      const trigger = (ghostBottom - CARD_SWAP_PX >= confirmCY);
      const passedSticky = (clastSwapY === null) || (Math.abs(ghostCenterY - clastSwapY) > CARD_STICKY);
      if (trigger && passedSticky) { 
        app.insertBefore(cph, after.nextSibling); 
        moved = true; 
        clastSwapY = ghostCenterY; 
      }
    } else if (cintent < 0 && before) {
      const br = before.getBoundingClientRect();
      const beforeBottomCY = (br.bottom - appRect.top);
      const confirmCY = beforeBottomCY - br.height * CARD_EDGE_FRAC;
      const ghostTop = renderY;
      const trigger = (ghostTop + CARD_SWAP_PX <= confirmCY);
      const passedSticky = (clastSwapY === null) || (Math.abs(ghostCenterY - clastSwapY) > CARD_STICKY);
      if (trigger && passedSticky) { 
        app.insertBefore(cph, before); 
        moved = true; 
        clastSwapY = ghostCenterY; 
      }
    }

    if (moved) {
      const phr = cph.getBoundingClientRect();
      cslotOriginCenterY = (phr.top - appRect.top) + phr.height / 2;
    }

    requestAnimationFrame(cardStep);
  }

} // End of bindCrossSortContainer function

// Keep the patchCSSOnce function outside
function patchCSSOnce() {
  if (document.getElementById('dragPerfPatch')) return;
  const style = document.createElement('style');
  style.id = 'dragPerfPatch';
  style.textContent = `
    .drag-ghost {
      will-change: transform, opacity;
      transform: translateZ(0);
      box-shadow: 0 6px 14px rgba(0,0,0,.12);
    }
    .sub-handle, .card-handle { touch-action: none; }
  `;
  document.head.appendChild(style);
}