import { config } from './config.js';
import { Viewer } from './viewer.js';
import { Timeline } from './timeline.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Viewer
  const viewerEl = document.getElementById('viewer');
  const viewer = new Viewer(viewerEl, config.modelUrl, config.viewDefaults, config.timelineItems);
  
  await viewer.init();

  // Grab DOM elements for explore flow
  const heroEl = document.getElementById('hero-text');
  const exploreBtn = document.getElementById('explore-btn');
  const timelineEl = document.getElementById('timeline');

  // Timeline is hidden until explore is clicked
  // On explore click: fade hero + button, show timeline, start first view
  exploreBtn.addEventListener('click', () => {
    // Hide hero + explore
    if (heroEl) heroEl.classList.add('hidden');
    exploreBtn.classList.add('hidden');

    // Show timeline
    timelineEl.classList.remove('hidden');
    timelineEl.classList.add('visible');

    // Initialize Timeline (first time, after viewer is ready)
    const timeline = new Timeline(timelineEl, config.timelineItems);

    // Jump to first timeline item
    timeline.activeIndex = 0;
    timeline.commitProgress();

    // Bind them together
    timeline.onProgress((p) => {
      viewer.setModelProgress(p);
    });
  });
});