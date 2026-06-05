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
          <div class="exp-here">
            <span class="exp-here-arrow">◀</span>
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
      <div class="exp-eyebrow">EXPLORE · 台北捷運</div>
      <div class="exp-track">
        <div class="exp-rail"></div>
        ${rows}
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
