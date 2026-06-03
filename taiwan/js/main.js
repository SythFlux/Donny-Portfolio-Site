import { config } from './config.js';
import { Viewer } from './viewer.js';
import { Timeline } from './timeline.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Viewer
  const viewerEl = document.getElementById('viewer');
  const viewer = new Viewer(viewerEl, config.modelUrl, config.viewDefaults, config.timelineItems);
  
  // Initialize Timeline
  const timelineEl = document.getElementById('timeline');
  const timeline = new Timeline(timelineEl, config.timelineItems);

  // Bind them together
  timeline.onProgress((p) => {
    viewer.setModelProgress(p);
  });

  await viewer.init();
});