// Custom cursor: a dot pinned to the pointer + a ring that trails behind it
// with easing ("set back"), both tinted with the active theme colour (--lc).
const HOVER_SEL = 'a, button, .exp-stop, .stop, #explore-btn, .sp-play-btn, #sp-expand, .sp-tag';

export function initCursor() {
  // Skip on touch / coarse pointers — there's no cursor to replace.
  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;

  const dot  = document.createElement('div'); dot.className  = 'cursor-dot';
  const ring = document.createElement('div'); ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = innerWidth / 2, my = innerHeight / 2;   // true pointer
  let rx = mx, ry = my;                            // eased ring position

  addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    if (!document.body.classList.contains('has-cursor')) document.body.classList.add('has-cursor');
  });
  addEventListener('mousedown', () => document.body.classList.add('cursor-down'));
  addEventListener('mouseup',   () => document.body.classList.remove('cursor-down'));
  addEventListener('mouseleave',() => document.body.classList.remove('has-cursor'));

  addEventListener('mouseover', (e) => {
    if (e.target.closest && e.target.closest(HOVER_SEL)) document.body.classList.add('cursor-hover');
  });
  addEventListener('mouseout', (e) => {
    if (e.target.closest && e.target.closest(HOVER_SEL)) document.body.classList.remove('cursor-hover');
  });

  const loop = () => {
    rx += (mx - rx) * 0.16;   // trail / "set back"
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}
