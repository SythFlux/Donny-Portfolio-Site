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

  // ── Mobile bottom-sheet: drag the handle to step collapsed ⇄ normal ⇄ big ──
  // Bound to the handle only, so dragging never fights scrolling the sheet body.
  // Swipe up grows it (peek → normal → enlarged); swipe down shrinks it; a tap
  // toggles the peek state.
  const handle = els.panel?.querySelector('.sp-handle');
  if (handle) {
    const cl = document.body.classList;
    let hsy = 0, hActive = false;
    handle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { hActive = false; return; }
      hActive = true; hsy = e.touches[0].clientY;
    }, { passive: true });
    handle.addEventListener('touchend', (e) => {
      if (!hActive) return;
      hActive = false;
      const dy = e.changedTouches[0].clientY - hsy;
      if (Math.abs(dy) < 30) {                        // a tap → peek / restore
        cl.remove('panel-big'); cl.toggle('sheet-collapsed');
        return;
      }
      if (dy < 0) {                                   // swipe up → grow
        if (cl.contains('sheet-collapsed')) cl.remove('sheet-collapsed');
        else cl.add('panel-big');
      } else {                                        // swipe down → shrink
        if (cl.contains('panel-big')) cl.remove('panel-big');
        else cl.add('sheet-collapsed');
      }
    }, { passive: true });
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
      // Make sure a peeked sheet pops back up to show the new station's info.
      document.body.classList.remove('sheet-collapsed');
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
