// ── Learn about Taiwan — Q&A view ─────────────────────────────
// Renders config.faq into a list of expandable cards inside #qa-view.
// Click a question to open/close it; answers reveal text + a photo grid.
// Includes category ("line") filters, a text search, and a photo lightbox.

// One photo tile — a real <img> when `src` is set, otherwise a labelled
// placeholder so the layout reads even before real photos are dropped in.
function photoTile(p) {
  const cap = p.cap ? `<span class="qa-photo-cap">${p.cap}</span>` : '';
  if (p.src) {
    return `<figure class="qa-photo" data-full="${p.src}" data-cap="${p.cap || ''}">` +
           `<img src="${p.src}" alt="${p.cap || ''}" loading="lazy">${cap}</figure>`;
  }
  return `<figure class="qa-photo is-placeholder">${cap}</figure>`;
}

export class Learn {
  constructor(viewEl, items) {
    this.view    = viewEl;                        // #qa-view
    this.list    = viewEl.querySelector('#qa-list');
    this.filters = viewEl.querySelector('#qa-filters');
    this.search  = viewEl.querySelector('#qa-search');
    this.items   = items || [];
    this._built  = false;
    this._filter = 'all';
    this._q      = '';
    this._cards  = [];

    // Shared lightbox (lives at body level, above the overlay).
    this.lb     = document.getElementById('qa-lightbox');
    this.lbImg  = this.lb?.querySelector('.qa-lb-img');
    this.lbCap  = this.lb?.querySelector('.qa-lb-cap');
  }

  _build() {
    if (this._built) return;

    // ── Filter chips, one per unique category ("line"), plus ALL ──
    const seen = new Set();
    const cats = [];
    this.items.forEach((it) => {
      const c = it.cat || 'Other';
      if (!seen.has(c)) { seen.add(c); cats.push({ cat: c, line: it.line }); }
    });
    if (this.filters) {
      this.filters.innerHTML =
        `<button class="qa-chip is-active" type="button" data-cat="all">All</button>` +
        cats.map((c) =>
          `<button class="qa-chip" type="button" data-cat="${c.cat}"${c.line ? ` style="--ln:${c.line}"` : ''}>${c.cat}</button>`
        ).join('');
      this.filters.addEventListener('click', (e) => {
        const chip = e.target.closest('.qa-chip');
        if (!chip) return;
        this._filter = chip.dataset.cat;
        this.filters.querySelectorAll('.qa-chip').forEach((c) => c.classList.toggle('is-active', c === chip));
        this._applyFilter();
      });
    }

    // Activity / location tags — each with its OWN colour (--mc).
    const ACT_ICO = `<svg class="qa-meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`;
    const LOC_ICO = `<svg class="qa-meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6"/></svg>`;
    const metaItem = (cls, color, ico, label, kind) => label
      ? `<span class="qa-meta-item ${cls}" style="--mc:${color}">${ico}` +
        `<span class="qa-meta-k">${kind}</span><span class="qa-meta-v">${label}</span></span>`
      : '';

    // ── Cards (each is a "station" on the line) ──
    this.list.innerHTML = this.items.map((it, i) => {
      const photos = (it.photos || []).map(photoTile).join('');
      const photoBlock = photos ? `<div class="qa-photos">${photos}</div>` : '';
      const zh  = it.qZh ? `<span class="qa-q-zh">${it.qZh}</span>` : '';
      const tag = it.cat ? `<span class="qa-tag">${it.cat}</span>` : '';
      const ln  = it.line ? ` style="--ln:${it.line}"` : '';
      const act = metaItem('qa-meta-act', it.actColor || it.line, ACT_ICO, it.activity, 'Activity');
      const loc = metaItem('qa-meta-loc', it.locColor || it.line, LOC_ICO, it.location, 'Location');
      const meta = (act || loc) ? `<div class="qa-meta">${act}${loc}</div>` : '';
      return `
        <article class="qa-card" data-i="${i}" data-cat="${it.cat || 'Other'}"${ln}>
          <span class="qa-stop" aria-hidden="true"></span>
          <button class="qa-q" type="button" aria-expanded="false">
            <span class="qa-q-no">${String(i + 1).padStart(2, '0')}</span>
            <span class="qa-q-text">${it.q}</span>
            ${tag}
            ${zh}
            <span class="qa-chev" aria-hidden="true">+</span>
          </button>
          ${meta}
          <div class="qa-a"><div class="qa-a-inner"><div class="qa-a-pad">
            <p class="qa-a-text">${it.a}</p>
            ${photoBlock}
          </div></div></div>
        </article>`;
    }).join('');

    // "No results" line, appended once.
    this.empty = document.createElement('p');
    this.empty.className = 'qa-empty';
    this.empty.textContent = 'No stations match your search.';
    this.list.appendChild(this.empty);

    // Searchable text per card (question + category + answer).
    this._cards = this.items.map((it, i) => ({
      el: this.list.querySelector(`.qa-card[data-i="${i}"]`),
      text: `${it.q} ${it.cat || ''} ${it.activity || ''} ${it.location || ''} ${it.a}`.toLowerCase(),
    }));

    // Toggle a card open / closed, or open a photo in the lightbox.
    this.list.addEventListener('click', (e) => {
      const photo = e.target.closest('.qa-photo[data-full]');
      if (photo) { this._openLightbox(photo.dataset.full, photo.dataset.cap); return; }
      const q = e.target.closest('.qa-q');
      if (!q) return;
      const card = q.closest('.qa-card');
      const open = card.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Live search.
    if (this.search) {
      this.search.addEventListener('input', () => {
        this._q = this.search.value.trim().toLowerCase();
        this._applyFilter();
      });
    }

    // Lightbox dismissal.
    if (this.lb) {
      this.lb.addEventListener('click', () => this._closeLightbox());
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.lb.classList.contains('show')) this._closeLightbox();
      });
    }

    this._built = true;
  }

  // Show only cards that match BOTH the active category and the search text.
  _applyFilter() {
    let visible = 0;
    this._cards.forEach(({ el, text }) => {
      const catOk = this._filter === 'all' || el.dataset.cat === this._filter;
      const qOk   = !this._q || text.includes(this._q);
      const show  = catOk && qOk;
      el.classList.toggle('qa-hide', !show);
      if (!show) {
        el.classList.remove('open');
        el.querySelector('.qa-q')?.setAttribute('aria-expanded', 'false');
      } else visible++;
    });
    this.empty?.classList.toggle('show', visible === 0);
  }

  _openLightbox(src, cap) {
    if (!this.lb) return;
    this.lbImg.src = src;
    this.lbImg.alt = cap || '';
    if (this.lbCap) this.lbCap.textContent = cap || '';
    this.lb.classList.add('show');
    this.lb.setAttribute('aria-hidden', 'false');
  }

  _closeLightbox() {
    if (!this.lb) return;
    this.lb.classList.remove('show');
    this.lb.setAttribute('aria-hidden', 'true');
    this.lbImg.removeAttribute('src');
  }

  show() {
    this._build();
    this.view.setAttribute('aria-hidden', 'false');
    this.view.classList.add('qa-show');
    this.view.scrollTop = 0;
  }

  hide() {
    this.view.classList.remove('qa-show');
    this.view.setAttribute('aria-hidden', 'true');
    this._closeLightbox();
    // Collapse open cards and reset filters/search so it opens fresh next time.
    this.list.querySelectorAll('.qa-card.open').forEach((c) => {
      c.classList.remove('open');
      c.querySelector('.qa-q')?.setAttribute('aria-expanded', 'false');
    });
    this._filter = 'all';
    this._q = '';
    if (this.search) this.search.value = '';
    this.list.querySelectorAll('.qa-card.qa-hide').forEach((c) => c.classList.remove('qa-hide'));
    this.empty?.classList.remove('show');
    this.filters?.querySelectorAll('.qa-chip').forEach((c) => c.classList.toggle('is-active', c.dataset.cat === 'all'));
  }
}
