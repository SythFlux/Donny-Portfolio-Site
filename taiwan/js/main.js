import { config }              from './config.js';
import { Viewer }              from './viewer.js';
import { Timeline }            from './timeline.js';
import { CityScene }           from './city.js';
import { Explorer }            from './explorer.js';
import { showMetroTransition } from './metro.js';
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
  await viewer.init();

  const heroEl     = document.getElementById('hero-text');
  const exploreBtn = document.getElementById('explore-btn');
  const timelineEl = document.getElementById('timeline');
  const explorerEl = document.getElementById('explorer-panel');
  const modelName  = document.getElementById('model-station-name');

  // Side panel: click the pill to enlarge / shrink the whole panel.
  const expandBtn = document.getElementById('sp-expand');
  expandBtn?.addEventListener('click', () => {
    const big = document.body.classList.toggle('panel-big');
    expandBtn.querySelector('.sp-expand-ico').textContent = big ? '⤡' : '⤢';
    expandBtn.querySelector('.sp-expand-txt').textContent = big ? 'SHRINK' : 'ENLARGE';
  });

  exploreBtn.addEventListener('click', () => {
    heroEl?.classList.add('hidden');
    exploreBtn.classList.add('hidden');
    modelName?.classList.add('visible');   // station name floats above the model
    timelineEl.classList.remove('hidden');
    timelineEl.classList.add('visible');

    const timeline = new Timeline(timelineEl, config.timelineItems);
    timeline.activeIndex = 0;
    timeline.commitProgress();

    const explorer = new Explorer(explorerEl, config.timelineItems);
    explorer.show();

    let viewerBlocked  = false;
    let pendingProgress = 0;

    // ── Shared navigation handler ─────────────────────────────
    function navigateTo(toIdx) {
      if (isTransitioning || toIdx === currentStopIdx) return;
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
  });
});
