import { config }              from './config.js';
import { Viewer }              from './viewer.js';
import { Timeline }            from './timeline.js';
import { CityScene }           from './city.js';
import { Explorer }            from './explorer.js';
import { Learn }               from './learn.js';
import { showMetroTransition, openMetroMap } from './metro.js';
import { els, initDOMRefs, updateDOM } from './dom.js';
import { initCursor }          from './cursor.js';

let city = null, isTransitioning = false, currentStopIdx = 0;

document.addEventListener('DOMContentLoaded', async () => {
  initDOMRefs();
  initCursor();
  updateDOM(0, city);

  const cityCanvas = document.getElementById('city-canvas');
  if (cityCanvas) {
    city = new CityScene(cityCanvas);
    city.setScene(config.timelineItems[0].scene, config.timelineItems[0].lineColor);
    city.start();
  }

  const viewerEl = document.getElementById('viewer');
  const viewer   = new Viewer(viewerEl, config.modelUrl, config.viewDefaults, config.timelineItems);
  // Load the model in the background — don't block UI wiring on the (large)
  // download, or early taps on the menu are lost until it finishes. The viewer's
  // camera tweens are safe to call before the mesh arrives.
  viewer.init();

  const heroEl        = document.getElementById('hero-text');
  const startMenu     = document.getElementById('start-menu');
  const exploreBtn    = document.getElementById('explore-btn');
  const learnBtn      = document.getElementById('learn-btn');
  const backMenu      = document.getElementById('back-menu');
  const backPortfolio = document.getElementById('back-portfolio');
  const timelineEl    = document.getElementById('timeline');
  const explorerEl    = document.getElementById('explorer-panel');
  const modelName     = document.getElementById('model-station-name');
  const qaView        = document.getElementById('qa-view');

  const learn = new Learn(qaView, config.faq);

  // Side panel: click the pill to enlarge / shrink the whole panel.
  const expandBtn = document.getElementById('sp-expand');
  expandBtn?.addEventListener('click', () => {
    const big = document.body.classList.toggle('panel-big');
    expandBtn.querySelector('.sp-expand-ico').textContent = big ? '⤡' : '⤢';
    expandBtn.querySelector('.sp-expand-txt').textContent = big ? 'SHRINK' : 'ENLARGE';
  });

  // ── Mobile bottom-sheet: drag the handle to resize between two states ──────
  // SMALL (default peek) ⇄ FULL (near full-screen). The sheet follows the finger
  // 1:1 by driving max-height live, then snaps to the nearer state on release —
  // so it feels fluent and consistent. A tap on the handle toggles the state.
  // Bound to the handle only, so it never fights scrolling the sheet body.
  const handle = els.panel?.querySelector('.sp-handle');
  if (handle) {
    const panel = els.panel;
    const cl = document.body.classList;
    const MIN_H = 92;                                   // peek floor while dragging
    const fullH = () => Math.round(window.innerHeight - 160);
    let startY = 0, startH = 0, lastH = 0, dragging = false, moved = false;

    handle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { dragging = false; return; }
      dragging = true; moved = false;
      startY = e.touches[0].clientY;
      startH = panel.getBoundingClientRect().height;
      lastH  = startH;
      panel.classList.add('sp-dragging');               // kill transition → track finger
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const dy = startY - e.touches[0].clientY;          // up = positive
      if (Math.abs(dy) > 4) moved = true;
      lastH = Math.max(MIN_H, Math.min(fullH(), startH + dy));
      panel.style.maxHeight = lastH + 'px';
    }, { passive: true });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('sp-dragging');
      panel.style.maxHeight = '';                        // hand sizing back to the CSS state
      if (!moved) { cl.toggle('panel-big'); return; }    // tap → toggle
      // Direction-based snap: a deliberate drag up expands, down collapses; a
      // small nudge just settles back to whatever state you were in.
      const delta = lastH - startH;
      if (delta > 60)       cl.add('panel-big');         // dragged up → FULL
      else if (delta < -60) cl.remove('panel-big');      // dragged down → SMALL
    };
    handle.addEventListener('touchend', endDrag, { passive: true });
    handle.addEventListener('touchcancel', endDrag, { passive: true });
  }

  // ── Top-left nav: PORTFOLIO on the menu, BACK TO MENU inside a view ──
  const setInExperience = (on) => {
    backMenu.hidden = !on;
    backPortfolio.style.display = on ? 'none' : '';
  };

  let timeline = null;          // built lazily on first "Explore"
  let exploreReady = false;     // explore UI built once, then re-shown

  // ── Return to the start menu from any experience ──────────────
  function backToMenu() {
    // Tear down the explore experience UI
    timeline?.setEnabled(false);
    timelineEl.classList.add('hidden');
    timelineEl.classList.remove('visible');
    explorerEl.classList.remove('exp-visible');
    explorerEl.classList.add('exp-hidden');
    els.panel.classList.add('sp-hidden');
    document.body.classList.remove('panel-open');
    modelName?.classList.remove('visible');
    // Hide the Q&A view
    learn.hide();
    // Show the menu again
    setInExperience(false);
    startMenu.classList.remove('hidden');
    heroEl?.classList.remove('hidden');
  }
  backMenu.addEventListener('click', backToMenu);

  // ── Enter the "Learn about Taiwan" Q&A view ───────────────────
  learnBtn.addEventListener('click', () => {
    startMenu.classList.add('hidden');
    heroEl?.classList.add('hidden');
    setInExperience(true);
    learn.show();
  });

  // ── Enter the explore journey (timeline + explorer + panel) ───
  exploreBtn.addEventListener('click', () => {
    startMenu.classList.add('hidden');
    heroEl?.classList.add('hidden');
    setInExperience(true);
    modelName?.classList.add('visible');
    timelineEl.classList.remove('hidden');
    timelineEl.classList.add('visible');
    explorerEl.classList.remove('exp-hidden');

    // Re-entry: the experience is already built — just re-show it.
    if (exploreReady) {
      timeline.setEnabled(true);
      explorerEl.classList.add('exp-visible');
      setTimeout(() => { els.panel.classList.remove('sp-hidden'); document.body.classList.add('panel-open'); }, 400);
      return;
    }
    exploreReady = true;

    timeline = new Timeline(timelineEl, config.timelineItems);
    timeline.activeIndex = 0;
    timeline.commitProgress();

    const explorer = new Explorer(explorerEl, config.timelineItems);
    explorer.show();

    let viewerBlocked  = false;
    let pendingProgress = 0;

    // ── Shared navigation handler ─────────────────────────────
    function navigateTo(toIdx) {
      if (isTransitioning || toIdx === currentStopIdx) return;
      // The mobile swipe coach mark stays put as a persistent affordance — it's
      // the only nav hint on phones, so we no longer retire it after first use.
      isTransitioning = true;
      viewerBlocked   = true;
      timeline.lock();
      explorer.lock();
      const fromIdx  = currentStopIdx;
      currentStopIdx = toIdx;
      showMetroTransition(fromIdx, toIdx, els.panel,
        () => updateDOM(toIdx, city),
        () => {
          isTransitioning = false;
          timeline.unlock();
          explorer.unlock();
          viewerBlocked = false;
          viewer.setStation(toIdx);   // tween straight to the destination view
        }
      );
    }

    timeline.onProgress((p) => {
      pendingProgress = p;
      if (!viewerBlocked) viewer.setModelProgress(p);
    });

    setTimeout(() => { els.panel.classList.remove('sp-hidden'); document.body.classList.add('panel-open'); }, 800);

    // Timeline scroll/click → navigate, sync explorer
    timeline.onStopChange((toIdx) => {
      explorer.setActive(toIdx);
      navigateTo(toIdx);
    });

    // Explorer click → navigate, sync timeline + own active state
    explorer.onStopSelect((toIdx) => {
      explorer.setActive(toIdx);
      timeline.setActive(toIdx);
      navigateTo(toIdx);
    });

    // Map button → open the interactive network map; picking a station
    // runs the same navigation as the explorer/timeline.
    const mapFab = document.getElementById('map-fab');
    mapFab?.addEventListener('click', () => {
      if (isTransitioning) return;
      openMetroMap(currentStopIdx, (toIdx) => {
        explorer.setActive(toIdx);
        timeline.setActive(toIdx);
        navigateTo(toIdx);
      });
    });
  });
});
