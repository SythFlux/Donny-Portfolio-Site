// Real Taipei MRT stations that sit between each pair of journey stops,
// so the explorer reads like an actual metro line.
const MINOR_STATIONS = [
  // 出發站 → 西門
  [ { name: 'Beimen',        code: 'G13'  }, { name: 'Taipei Main',  code: 'BL12' } ],
  // 西門 → 公館
  [ { name: 'Xiaonanmen',    code: 'G09'  }, { name: 'CKS Memorial', code: 'G10'  } ],
  // 公館 → 象山
  [ { name: 'Taipower Bldg', code: 'G08'  }, { name: 'Guting',       code: 'O05'  } ],
  // 象山 → 台北101
  [ { name: 'Xinyi Anhe',    code: 'R04'  }, { name: 'Daan',         code: 'R05'  } ],
  // 台北101 → 西門子 (SIEMENS)
  [ { name: 'World Trade Ctr', code: 'BL18' }, { name: 'Nangang',     code: 'BL19' } ],
];

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
    // Build the line as: major station, then a connector segment carrying the
    // real intermediate stations, then the next major — like a real line.
    // A little metro train (.exp-train) rides the active stop's "you are here".
    const TRAIN = `
      <span class="exp-train" aria-hidden="true">
        <svg viewBox="0 0 40 24" fill="none">
          <rect class="exp-train-body" x="1.5" y="2.5" width="37" height="16" rx="5"/>
          <path class="exp-train-nose" d="M4 18.5 Q1.5 14 1.5 9"/>
          <rect class="exp-train-win" x="6"  y="6" width="6" height="6" rx="1.5"/>
          <rect class="exp-train-win" x="15" y="6" width="6" height="6" rx="1.5"/>
          <rect class="exp-train-win" x="24" y="6" width="6" height="6" rx="1.5"/>
          <line class="exp-train-head" x1="33" y1="8" x2="36" y2="8"/>
          <circle class="exp-train-wheel" cx="11" cy="20" r="2.4"/>
          <circle class="exp-train-wheel" cx="28" cy="20" r="2.4"/>
        </svg>
      </span>`;

    let rows = '';
    this.items.forEach((item, i) => {
      rows += `
        <button class="exp-stop${i === 0 ? ' active' : ''}"
                data-index="${i}"
                style="--sc:${item.lineColor}"
                aria-label="Go to ${item.stationNameEn}">
          <div class="exp-dot"></div>
          <div class="exp-label">
            <span class="exp-name">${item.stationNameEn.toUpperCase()}</span>
            <span class="exp-code">${item.stationCode}</span>
          </div>
          ${TRAIN}
          <div class="exp-here">
            <span class="exp-here-arrow">▸</span>
            <span class="exp-here-txt">YOU ARE HERE</span>
          </div>
        </button>`;
      if (i < this.items.length - 1) {
        const minors = (MINOR_STATIONS[i] || []).map(m => `
          <div class="exp-minor-stop">
            <span class="exp-minor"></span>
            <span class="exp-minor-label">
              <span class="exp-minor-name">${m.name}</span>
              <span class="exp-minor-code">${m.code}</span>
            </span>
          </div>`).join('');
        rows += `<div class="exp-seg" style="--sc:${item.lineColor}">${minors}</div>`;
      }
    });

    this.container.innerHTML = `
      <div class="exp-head">
        <span class="exp-head-ico" aria-hidden="true">
          <svg viewBox="0 0 40 24" fill="none">
            <rect x="1.5" y="2.5" width="37" height="16" rx="5"/>
            <rect x="6"  y="6" width="6" height="6" rx="1.5"/>
            <rect x="15" y="6" width="6" height="6" rx="1.5"/>
            <rect x="24" y="6" width="6" height="6" rx="1.5"/>
            <circle cx="11" cy="20" r="2.2"/><circle cx="28" cy="20" r="2.2"/>
          </svg>
        </span>
        <div class="exp-head-txt">
          <span class="exp-head-zh">台北捷運 · MRT</span>
          <span class="exp-head-en">LINE GUIDE</span>
        </div>
        <span class="exp-head-tag">${String(this.items.length).padStart(2, '0')} STOPS</span>
      </div>
      <div class="exp-track">
        <div class="exp-rail"></div>
        ${rows}
      </div>
      <div class="exp-foot" aria-hidden="true">
        <span class="exp-foot-barcode"></span>
        <span class="exp-foot-txt">MRT · ADMIT ONE</span>
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
    this._scrollToActive(idx);
  }

  // Keep the active stop centred in the (scrollable) card, so you can always
  // see where you are on the line — even at the far end (e.g. SIEMENS). Scrolls
  // only the panel itself, never the page.
  _scrollToActive(idx) {
    const el = this._stops[idx];
    if (!el) return;
    const c = this.container;
    requestAnimationFrame(() => {
      const cRect = c.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const delta = (eRect.top - cRect.top) - (c.clientHeight / 2) + (eRect.height / 2);
      c.scrollTo({ top: Math.max(0, c.scrollTop + delta), behavior: 'smooth' });
    });
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
