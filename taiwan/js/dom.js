import { config } from './config.js';

// Single object holding all cached DOM refs — populated by initDOMRefs()
export const els = {};

export function initDOMRefs() {
  els.bgNum         = document.getElementById('bg-number');
  els.bgKanjiWrap   = document.getElementById('bg-kanji-wrap');
  els.bgKanji       = document.getElementById('bg-kanji');
  els.bgKanjiEn     = document.getElementById('bg-kanji-en');
  els.hudBadge      = document.getElementById('hud-line-badge');
  els.hudLineZh     = document.getElementById('hud-line-zh');
  els.hudLineEn     = document.getElementById('hud-line-en');
  els.hudCode       = document.getElementById('hud-station-code');
  els.heroBadge     = document.getElementById('hero-line-badge');
  els.heroLineLabel = document.getElementById('hero-line-label');
  els.heroStationZh = document.getElementById('hero-station-zh');
  els.heroStationEn = document.getElementById('hero-station-en');
  els.heroTitleEn   = document.getElementById('hero-title-en');
  els.heroTitle     = document.getElementById('hero-title');
  els.heroDesc      = document.getElementById('hero-desc');
  els.heroCode      = document.getElementById('hero-code-val');
  els.panel         = document.getElementById('stop-panel');
  els.spBadge       = document.getElementById('sp-badge');
  els.spLineZh      = document.getElementById('sp-line-zh');
  els.spLineEn      = document.getElementById('sp-line-en');
  els.spCode        = document.getElementById('sp-code');
  els.spStationZh   = document.getElementById('sp-station-zh');
  els.spStationEn   = document.getElementById('sp-station-en');
  els.spNum         = document.getElementById('sp-num');
  els.spLabelZh     = document.getElementById('sp-label-zh');
  els.spLabelEn     = document.getElementById('sp-label-en');
  els.spDesc        = document.getElementById('sp-desc');
  els.spVideo       = document.getElementById('sp-video');
  els.spDecal       = document.getElementById('sp-decal');
  els.spTicketNo    = document.getElementById('sp-ticket-no');
  els.modelName     = document.getElementById('model-station-name');
}

// city — CityScene instance (may be null during initial render)
export function updateDOM(index, city) {
  const item = config.timelineItems[index];
  if (!item) return;

  document.documentElement.style.setProperty('--lc', item.lineColor);
  if (city) city.setScene(item.scene, item.lineColor);

  if (els.hudBadge)      { els.hudBadge.textContent = item.lineCode; els.hudBadge.style.background = item.lineColor; }
  if (els.hudLineZh)       els.hudLineZh.textContent  = item.lineName;
  if (els.hudLineEn)       els.hudLineEn.textContent  = item.lineNameEn;
  if (els.hudCode)         els.hudCode.textContent    = item.stationCode;

  if (els.heroBadge)     { els.heroBadge.textContent = item.lineCode; els.heroBadge.style.background = item.lineColor; }
  if (els.heroLineLabel)   els.heroLineLabel.textContent = `${item.lineName} · ${item.lineNameEn.toUpperCase()}`;
  if (els.heroStationZh)   els.heroStationZh.textContent = item.stationName;
  if (els.heroStationEn)   els.heroStationEn.textContent = item.stationNameEn.toUpperCase();
  if (els.heroTitleEn)     els.heroTitleEn.textContent   = item.labelEn;
  if (els.heroTitle)       els.heroTitle.textContent     = item.label;
  if (els.heroDesc)        els.heroDesc.textContent      = item.desc;
  if (els.heroCode)        els.heroCode.textContent      = item.stationCode;

  if (els.bgNum)         { els.bgNum.textContent = item.id; els.bgNum.style.color = item.lineColor; }
  if (els.bgKanjiWrap)     els.bgKanjiWrap.style.color   = item.lineColor;
  if (els.bgKanji)         els.bgKanji.textContent       = item.stationName;
  if (els.bgKanjiEn)       els.bgKanjiEn.textContent     = item.stationNameEn.toUpperCase();

  if (els.spBadge)       { els.spBadge.textContent = item.lineCode; els.spBadge.style.background = item.lineColor; }
  if (els.spLineZh)        els.spLineZh.textContent    = item.lineName;
  if (els.spLineEn)        els.spLineEn.textContent    = item.lineNameEn;
  if (els.spCode)          els.spCode.textContent      = item.stationCode;
  if (els.spStationZh)     els.spStationZh.textContent = item.stationName;
  if (els.spStationEn)     els.spStationEn.textContent = item.stationNameEn.toUpperCase();
  if (els.spNum)           els.spNum.textContent       = item.id;
  if (els.spLabelZh)       els.spLabelZh.textContent   = item.label;
  if (els.spLabelEn)       els.spLabelEn.textContent   = item.labelEn;
  if (els.spDesc)          els.spDesc.textContent      = item.desc;
  if (els.spVideo)         els.spVideo.dataset.stop    = item.id;
  if (els.spDecal)         els.spDecal.textContent     = item.stationCode;
  if (els.spTicketNo)      els.spTicketNo.textContent  = item.stationCode;

  if (els.modelName) {
    els.modelName.style.color = item.lineColor;
    // Most stops lead with the big Mandarin name; some (e.g. SIEMENS) lead with
    // the English name as a bold "logo", with the Mandarin small + grey beneath.
    const enFirst = item.nameEmphasis === 'en';
    const big   = enFirst ? item.stationNameEn.toUpperCase() : item.stationName;
    const small = enFirst ? item.stationName : item.stationNameEn.toUpperCase();
    els.modelName.innerHTML =
      `<span class="msn-zh${enFirst ? ' msn-latin' : ''}">${big}</span>` +
      `<span class="msn-en">${small}</span>`;
  }
}
