export class Explorer {
  constructor(container, items) {
    this.container = container;
    this.items     = items;
    this._locked   = false;
    this.onSelectCb = null;
    this._stops    = [];
    this._render();
  }

  _render() {
    const dots = this.items.map((item, i) => `
      <button class="exp-stop${i === 0 ? ' active' : ''}"
              data-index="${i}"
              style="--sc:${item.lineColor}"
              aria-label="Go to ${item.stationNameEn}">
        <div class="exp-dot"></div>
        <div class="exp-label">
          <span class="exp-name">${item.stationNameEn.toUpperCase()}</span>
          <span class="exp-code">${item.stationCode}</span>
        </div>
      </button>
    `).join('');

    this.container.innerHTML = `
      <div class="exp-eyebrow">EXPLORE</div>
      <div class="exp-track">
        <div class="exp-rail"></div>
        ${dots}
      </div>
    `;

    this._stops = Array.from(this.container.querySelectorAll('.exp-stop'));

    this.container.addEventListener('click', (e) => {
      if (this._locked) return;
      const stop = e.target.closest('.exp-stop');
      if (!stop) return;
      const idx = Number(stop.dataset.index);
      if (this.onSelectCb) this.onSelectCb(idx);
    });
  }

  setActive(idx) {
    this._stops.forEach((s, i) => s.classList.toggle('active', i === idx));
  }

  lock()   { this._locked = true; }
  unlock() { this._locked = false; }

  show() {
    this.container.classList.remove('exp-hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.container.classList.add('exp-visible'));
    });
  }

  onStopSelect(cb) { this.onSelectCb = cb; }
}
