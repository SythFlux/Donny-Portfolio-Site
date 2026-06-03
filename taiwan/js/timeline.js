export class Timeline {
  constructor(container, timelineData) {
    this.container = container;
    this.data = timelineData;
    this.itemsContainer = container.querySelector('.items');
    this.marker = container.querySelector('.track-marker');
    this.activeIndex = 0;
    this.locked = false;
    this.WHEEL_LOCK_MS = 180;
    this.onProgressCb = null;

    this.render();
    
    this.stops = Array.from(this.itemsContainer.querySelectorAll('.stop'));
    this.videoStops = this.stops.filter((stop) => stop.dataset.index !== '-1' && stop.dataset.index !== String(this.data.length));
    this.startStop = this.stops.find((stop) => stop.dataset.index === '-1');
    this.endStop = this.stops.find((stop) => stop.dataset.index === String(this.data.length));

    this.bindEvents();
    this.commitProgress();
  }

  render() {
    this.itemsContainer.innerHTML = '';
    
    // START cap
    this.itemsContainer.insertAdjacentHTML('beforeend', `
      <div class="stop cap start" data-index="-1" aria-hidden="true">
        <span class="branch"></span>
        <div class="rect-label">START</div>
      </div>
    `);

    // Dynamic Items
    this.data.forEach((item, index) => {
      this.itemsContainer.insertAdjacentHTML('beforeend', `
        <div class="stop" data-index="${index}">
          <span class="branch"></span>
          <div class="video-thumb">
            <div class="play-icon"></div>
          </div>
          <div class="rect-label">${item.label}</div>
        </div>
      `);
    });

    // END cap
    this.itemsContainer.insertAdjacentHTML('beforeend', `
      <div class="stop cap end" data-index="${this.data.length}" aria-hidden="true">
        <span class="branch"></span>
        <div class="rect-label">END</div>
      </div>
    `);
  }

  onProgress(cb) {
    this.onProgressCb = cb;
  }

  commitProgress() {
    const progress = this.videoStops.length <= 1 ? 0 : Math.max(0, Math.min(this.videoStops.length - 1, this.activeIndex)) / (this.videoStops.length - 1);
    
    if (this.onProgressCb) this.onProgressCb(progress);
    if (!this.stops.length || !this.marker || !this.itemsContainer) return;

    this.stops.forEach((stop) => {
      const stopIndex = Number(stop.dataset.index);
      stop.classList.toggle('active', stopIndex === this.activeIndex);
    });

    const active = this.activeIndex < 0 ? this.startStop : this.activeIndex >= this.videoStops.length ? this.endStop : this.videoStops[this.activeIndex];
    if (!active) return;

    // Slide horizontally
    const activeX = active.offsetLeft + active.offsetWidth / 2;
    const trackCenter = this.container.clientWidth / 2;
    const shift = trackCenter - activeX;

    this.itemsContainer.style.transform = `translateX(${shift}px)`;
    this.marker.style.left = `${trackCenter}px`;
  }

  bindEvents() {
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onWheel(event) {
    event.preventDefault();
    if (this.locked) return;

    const direction = Math.sign(event.deltaY);
    if (direction === 0) return;

    this.activeIndex = Math.min(this.videoStops.length, Math.max(-1, this.activeIndex + direction));
    this.commitProgress();

    this.locked = true;
    window.setTimeout(() => {
      this.locked = false;
    }, this.WHEEL_LOCK_MS);
  }

  onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      this.activeIndex = Math.min(this.videoStops.length, this.activeIndex + 1);
      this.commitProgress();
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      this.activeIndex = Math.max(-1, this.activeIndex - 1);
      this.commitProgress();
    }
  }
}

