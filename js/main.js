/* ═══════════════════════════════════════════════════════════════════
   main.js — Entry point: wires everything together
   ═══════════════════════════════════════════════════════════════════ */

import { handleResize, scene, renderer, camera } from './scene.js';
import { createOrbs }                from './orbs.js';
import { initNav }                   from './nav.js';
import { initPanel }                 from './panel.js';
import { initInteraction }           from './interaction.js';
import { startLoop }                 from './animation.js';
import { createParticles }           from './particles.js';
import { initPostProcessing, resizePostProcessing } from './postprocessing.js';
import { initParallax, parallaxGroup } from './parallax.js';
import { createConstellation }       from './constellation.js';
import { initIntro }                 from './intro.js';
import { applyTheme, toggleDarkMode, isDark, setAccentColor } from './darkmode.js';
import { initCursor } from './cursor.js';
import { runBootSequence } from './terminal.js';
import { initHud, resizeHud } from './hud.js';
import { initTabs } from './tabs.js';
import { initHelix } from './helix.js';
import { initOrbFx } from './orbfx.js';
import { createConstruct } from './construct.js';


// 0. Parallax group must exist before orbs are created
//    (parallax.js already creates it on import, initParallax sets up listeners)
scene.add(parallaxGroup);
initParallax();

// 1. Build orbs from project data (added to parallaxGroup)
createOrbs();

// 1b. Unique per-orb visual decorations
initOrbFx();

// 2. Particles
createParticles(parallaxGroup);

// 2b. Grand mechanical construct (background decoration)
const construct = createConstruct();
parallaxGroup.add(construct);

// 3. Constellation lines between orbs
createConstellation(parallaxGroup);

// 4. Post-processing (bloom + vignette)
initPostProcessing();  // uses renderer/scene/camera from scene.js imports

// 5. Build side navigation
initNav();

// 6. Wire up detail-panel close / escape
initPanel();

// 7. Enable raycaster hover + click (also wires audio resume)
initInteraction();

// 8. Intro fly-in animation
initIntro();

// 9. Apply initial theme
applyTheme(false);  // start in light mode

// 10. Dark mode toggle (text slider in header)
const darkBtn = document.getElementById('dark-toggle');
if (darkBtn) {
  darkBtn.addEventListener('click', () => {
    toggleDarkMode();
    darkBtn.classList.toggle('active', isDark);
  });
}

// 12. Color picker — accent swatches
const colorPicker = document.getElementById('color-picker');
if (colorPicker) {
  colorPicker.addEventListener('click', (e) => {
    const swatch = e.target.closest('.color-swatch');
    if (!swatch) return;
    const color = swatch.dataset.color;
    setAccentColor(color);
    colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
  });
}

// 13. Start the render loop
startLoop();

// 14. Custom cursor
initCursor();

// 15. Boot sequence terminal
runBootSequence();

// 16. HUD overlay
initHud();

// 17. Tab navigation
initTabs();

// 18. DNA helix background for contact page
initHelix();

// 13. Handle window resize
window.addEventListener('resize', () => {
  handleResize();
  resizePostProcessing();
  resizeHud();
});
