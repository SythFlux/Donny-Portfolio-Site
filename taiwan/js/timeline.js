export class Timeline {
  constructor(container, timelineData) {
    this.container = container;
    this.data = timelineData;
    this.itemsContainer = container.querySelector('.items');
    this.marker = container.querySelector('.track-marker');
    this.activeIndex = 0;
    this._debounced = false;       // short debounce between wheel ticks
    this._extLock = false;         // hard lock held by main.js during transition
    this.enabled = true;           // false on the menu / Q&A view → ignore scroll+keys
    this.DEBOUNCE_MS = 120;
    this.onProgressCb = null;
    this.onStopChangeCb = null;
    this._lastIndex = -999;

    this.render();

    this.stops = Array.from(this.itemsContainer.querySelectorAll('.stop'));
    this.videoStops = this.stops.filter(
      (s) => s.dataset.index !== '-1' && s.dataset.index !== String(this.data.length)
    );
    this.startStop = this.stops.find((s) => s.dataset.index === '-1');
    this.endStop   = this.stops.find((s) => s.dataset.index === String(this.data.length));

    this.bindEvents();
    this.commitProgress();
  }

  // Called by main.js to hard-block ALL input for the transition duration
  lock()   { this._extLock = true; }
  unlock() { this._extLock = false; }

  // Enable/disable the whole timeline (scroll + keys). When disabled it stops
  // hijacking the wheel so other views (the Q&A page) can scroll normally.
  setEnabled(on) { this.enabled = on; }

  // Set active station from outside without firing onStopChange callback
  setActive(idx) {
    this.activeIndex = idx;
    this._lastIndex  = idx;
    this.commitProgress();
  }

  render() {
    this.itemsContainer.innerHTML = '';

    this.itemsContainer.insertAdjacentHTML('beforeend', `
      <div class="stop cap start" data-index="-1" aria-hidden="true">
        <span class="branch"></span>
        <div class="cap-label">[ START ]</div>
      </div>
    `);

    this.data.forEach((item, index) => {
      this.itemsContainer.insertAdjacentHTML('beforeend', `
        <div class="stop" data-index="${index}">
          <div class="stop-code">${item.stationCode}</div>
          <span class="branch"></span>
          <div class="station-plate">
            <span class="station-zh">${item.stationName}</span>
            <span class="station-en">${item.stationNameEn ?? item.labelEn}</span>
          </div>
        </div>
      `);
    });

    this.itemsContainer.insertAdjacentHTML('beforeend', `
      <div class="stop cap end" data-index="${this.data.length}" aria-hidden="true">
        <span class="branch"></span>
        <div class="cap-label">[ END ]</div>
      </div>
    `);
  }

  onProgress(cb)   { this.onProgressCb = cb; }
  onStopChange(cb) { this.onStopChangeCb = cb; }

  commitProgress() {
    const maxIdx = this.videoStops.length - 1;
    const progress = maxIdx <= 0
      ? 0
      : Math.max(0, Math.min(this.activeIndex, maxIdx)) / maxIdx;

    // Fire onStopChangeCb FIRST so main.js can set viewerBlocked=true
    // before onProgressCb fires — otherwise the viewer starts animating too early.
    const stopChanged = this.onStopChangeCb &&
      this.activeIndex !== this._lastIndex &&
      this.activeIndex >= 0 &&
      this.activeIndex < this.videoStops.length;
    if (stopChanged) this.onStopChangeCb(this.activeIndex);
    this._lastIndex = this.activeIndex;

    if (this.onProgressCb) this.onProgressCb(progress);
    if (!this.stops.length || !this.marker || !this.itemsContainer) return;

    this.stops.forEach((stop) => {
      stop.classList.toggle('active', Number(stop.dataset.index) === this.activeIndex);
    });

    let active;
    if (this.activeIndex < 0) active = this.startStop;
    else if (this.activeIndex >= this.videoStops.length) active = this.endStop;
    else active = this.videoStops[this.activeIndex];
    if (!active) return;

    const activeX = active.offsetLeft + active.offsetWidth / 2;
    const trackCenter = this.container.clientWidth / 2;
    this.itemsContainer.style.transform = `translateX(${trackCenter - activeX}px)`;
    this.marker.style.left = `${trackCenter}px`;
  }

  _tryMove(dir) {
    // Block if hard-locked (transition in progress) or short-debounced
    if (this._extLock || this._debounced) return;

    const maxIdx = this.videoStops.length - 1;
    let next = this.activeIndex + dir;
    if (next > maxIdx) next = 0;        // 05 → wrap all the way back to 00
    else next = Math.max(0, next);
    this.activeIndex = next;
    this.commitProgress();

    this._debounced = true;
    setTimeout(() => { this._debounced = false; }, this.DEBOUNCE_MS);
  }

  bindEvents() {
    window.addEventListener('wheel', (e) => {
      if (!this.enabled) return;           // let the page (e.g. Q&A) scroll
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      if (dir !== 0) this._tryMove(dir);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault(); this._tryMove(1);
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault(); this._tryMove(-1);
      }
    });

    this.itemsContainer.addEventListener('click', (e) => {
      if (this._extLock) return;
      const stop = e.target.closest('.stop[data-index]');
      if (!stop || stop.classList.contains('cap')) return;
      const idx = Number(stop.dataset.index);
      if (idx < 0 || idx >= this.videoStops.length || idx === this.activeIndex) return;
      this.activeIndex = idx;
      this.commitProgress();
    });

    // ── Touch swipe (mobile) ──────────────────────────────────────
    // Phones don't emit `wheel`, so the scroll-to-navigate flow was dead on
    // mobile. A swipe up / left advances a stop; down / right goes back.
    let sx = 0, sy = 0, st = 0, swiping = false;
    window.addEventListener('touchstart', (e) => {
      if (!this.enabled || e.touches.length !== 1) { swiping = false; return; }
      // Don't hijack swipes that start on a scrollable overlay (Q&A etc.).
      if (e.target.closest('#qa-view, #metro-map')) { swiping = false; return; }
      swiping = true;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!swiping || !this.enabled) return;
      swiping = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy, dt = Date.now() - st;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      // Ignore taps and slow drags; require a deliberate flick.
      if (Math.max(adx, ady) < 45 || dt > 800) return;
      const dir = ady >= adx ? (dy < 0 ? 1 : -1)   // vertical: up = next
                             : (dx < 0 ? 1 : -1);  // horizontal: left = next
      this._tryMove(dir);
    }, { passive: true });
  }
}
