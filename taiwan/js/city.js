/**
 * CityScene — animated flat backgrounds per metro stop.
 *  'design'  - Bauhaus geometric composition       (Stop 00)
 *  'village' - pine trees + fixed houses            (Stop 01)
 *  'runway'  - flat 2D airport + silhouette plane   (Stop 02)
 *  'mountain'- mountain + forest + city lights      (Stop 03)
 *  'city'    - urban skyline + moving people        (Stop 05)
 */
export class CityScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.lc     = '#7c3aed';
    this.type   = 'design';
    this._s     = {};
    this._resize();
    this._init();
    window.addEventListener('resize', () => { this._resize(); this._init(); });
  }

  setScene(type, color) { this.type = type; this.lc = color; this._init(); }
  setColor(color)        { this.lc = color; }

  start() {
    const loop = (ts) => { this._draw(ts); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  _resize() {
    this.W  = this.canvas.width  = window.innerWidth;
    this.H  = this.canvas.height = window.innerHeight;
    this.GY = this.H - 156;
  }

  _col(c) {
    if (c === 'line') return this.lc;
    if (c === 'dark') return '#111111';
    return '#e6e3dc';
  }

  _stripe(ctx, x, y, w, h) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1.5;
    for (let s = -h; s < w + h; s += 10) {
      ctx.beginPath(); ctx.moveTo(x+s, y); ctx.lineTo(x+s-h*.7, y+h); ctx.stroke();
    }
    ctx.restore();
  }

  _groundLine(ctx) {
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, this.GY); ctx.lineTo(this.W, this.GY); ctx.stroke();
  }

  _init() {
    const { W, H, GY } = this;
    const hs = Math.min(1, H / 900);

    // Shared background decals (grid + line-coloured rings) for EVERY scene.
    this._s.circles = [
      { cx:W*.20, cy:GY-210*hs, r:120*hs },
      { cx:W*.70, cy:GY-175*hs, r:95*hs  },
      { cx:W*.46, cy:GY-70*hs,  r:60*hs  },
    ].map(c => ({ ...c, r:Math.max(30, c.r) }));

    // Static crosshair "+" decals scattered across the field.
    this._s.pluses = [[.08,.22],[.27,.62],[.41,.16],[.6,.44],[.79,.7],[.9,.26],[.16,.82],[.52,.8]]
      .map(([fx,fy]) => ({ x:W*fx, y:GY*fy }));

    // Per-scene motion flavour — each stop animates a bit differently.
    const flavour = {
      design:  { orbit: 0.5,  drift:[ 0.16,-0.05] },
      village: { orbit: 0.3,  drift:[-0.10,-0.13] },
      runway:  { orbit: 0.85, drift:[ 0.22, 0.00] },
      mountain:{ orbit: 0.22, drift:[ 0.00,-0.09] },
      city:    { orbit: 0.45, drift:[-0.18,-0.04] },
    }[this.type] || { orbit: 0.4, drift:[0.12,-0.06] };
    this._s.orbit = flavour.orbit;
    // Drifting motes (kept only for the orange/mountain scene — "good as is").
    this._s.motes = this.type === 'mountain'
      ? Array.from({ length: 16 }, () => ({
          x: Math.random()*W, y: Math.random()*GY,
          vx: flavour.drift[0]*(0.5+Math.random()),
          vy: flavour.drift[1]*(0.5+Math.random()),
          r: 1 + Math.random()*2.2, ph: Math.random()*Math.PI*2,
        }))
      : [];

    // ── Per-theme weather / sky effects ──────────────────────────
    // purple → stars · blue → rain · green → wind-blown leaves · red → day/night
    this._s.stars  = this.type === 'design'
      ? Array.from({ length: 70 }, () => ({ x:Math.random()*W, y:Math.random()*GY*0.62, r:0.8+Math.random()*1.7, ph:Math.random()*Math.PI*2, big:Math.random()>0.82 })) : [];
    this._s.rain   = this.type === 'village'
      ? Array.from({ length: 110 }, () => ({ x:Math.random()*W, y:Math.random()*GY, len:8+Math.random()*12, sp:7+Math.random()*6 })) : [];
    this._s.leaves = this.type === 'runway'
      ? Array.from({ length: 26 }, () => ({ x:Math.random()*W, y:Math.random()*GY, vx:0.5+Math.random()*0.9, vy:0.45+Math.random()*0.7, rot:Math.random()*Math.PI*2, spin:(Math.random()-0.5)*0.08, size:4+Math.random()*4, ph:Math.random()*Math.PI*2 })) : [];

    if (this.type === 'design') {
      this._s.blocks = [
        // (left dark tower removed — it sat behind the station explorer)
        {x:W*.34,  y:GY-100*hs, w:120*hs, h:100*hs, c:'pale',  stripe:false},
        {x:W*.44,  y:GY-240*hs, w:80*hs,  h:240*hs, c:'dark',  stripe:false},
        {x:W*.50,  y:GY-140*hs, w:200*hs, h:140*hs, c:'line',  stripe:true },
        {x:W-180*hs-W*.02, y:GY-300*hs, w:180*hs, h:300*hs, c:'dark', stripe:false},
        {x:W-380*hs-W*.02, y:GY-160*hs, w:220*hs, h:160*hs, c:'line', stripe:true },
        {x:W-140*hs-W*.14, y:GY-220*hs, w:100*hs, h:220*hs, c:'pale', stripe:false},
      ].map(b => ({...b, w:Math.max(40,b.w), h:Math.max(40,b.h)}));
    }

    if (this.type === 'village') {
      this._s.houses = [
        {x:W*.03, w:70,  h:80*hs,  c:'pale'},
        {x:W*.12, w:90,  h:100*hs, c:'line'},
        {x:W*.22, w:60,  h:70*hs,  c:'pale'},
        {x:W*.32, w:85,  h:95*hs,  c:'dark'},
        {x:W*.63, w:75,  h:85*hs,  c:'pale'},
        {x:W*.73, w:90,  h:100*hs, c:'line'},
        {x:W*.83, w:60,  h:70*hs,  c:'dark'},
        {x:W*.91, w:80,  h:90*hs,  c:'pale'},
      ].map(b => ({...b, h:Math.max(50,b.h), y:GY-Math.max(50,b.h)}));
      this._s.pines = [
        {x:W*.00,h:90*hs},{x:W*.08,h:70*hs},{x:W*.17,h:85*hs},
        {x:W*.28,h:75*hs},{x:W*.40,h:95*hs},{x:W*.48,h:80*hs},
        {x:W*.56,h:90*hs},{x:W*.65,h:70*hs},{x:W*.74,h:85*hs},
        {x:W*.86,h:75*hs},{x:W*.95,h:90*hs},
      ].map(p => ({...p, h:Math.max(40,p.h)}));
      if (!this._s.villagePeople) this._s.villagePeople = this._makePeople(5, GY, 0.22);
    }

    // runway has no animated state to init

    if (this.type === 'mountain') {
      if (!this._s.cityLights) {
        this._s.cityLights = Array.from({length:90}, () => ({
          x:Math.random()*W, y:GY*.28+Math.random()*(GY*.55),
          r:.8+Math.random()*1.8, ph:Math.random()*Math.PI*2,
        }));
        this._s.birds = Array.from({length:5}, () => ({
          x:Math.random()*W, y:GY*.12+Math.random()*(GY*.18),
          sp:.3+Math.random()*.35, ph:Math.random()*Math.PI*2,
        }));
      }
    }

    if (this.type === 'city') {
      const defs = [
        [-18,72,200*hs,'line'],[52,92,270*hs,'dark'],
        [142,58,140*hs,'pale'],[198,108,310*hs,'line'],
        [304,64,168*hs,'pale'],[364,50,95*hs,'dark'],[410,38,65*hs,'pale'],
        [W-410,38,65*hs,'pale'],[W-364,50,95*hs,'line'],[W-304,64,168*hs,'dark'],
        [W-198,108,310*hs,'line'],[W-142,58,140*hs,'pale'],
        [W-52,92,270*hs,'dark'],[W+18,72,200*hs,'pale'],
      ];
      this._s.buildings = defs.map(([x,w,rh,c]) => {
        const h = Math.max(36, rh);
        return { x, w, h, y:GY-h, c };
      });
      if (!this._s.cityPeople) this._s.cityPeople = this._makePeople(8, GY, 1.0);
    }
  }

  _makePeople(n, GY, spd) {
    return Array.from({length:n}, (_, i) => {
      const r = 10 + Math.random()*12;
      return {
        x:(i/n)*this.W+(Math.random()-.5)*100, r,
        speed:(0.28+Math.random()*.5)*(Math.random()>.5?1:-1)*spd,
        ph:Math.random()*Math.PI*2, baseY:GY-r,
      };
    });
  }

  _person(ctx, p, t, GY) {
    p.x += p.speed;
    if (p.x>this.W+80) p.x=-80; if (p.x<-80) p.x=this.W+80;
    const by = p.baseY+Math.sin(t*1.9+p.ph)*1.4;
    ctx.beginPath(); ctx.ellipse(p.x,GY,p.r*.72,3.5,0,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.07)'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x,by,p.r,0,Math.PI*2); ctx.fillStyle='#0e0e0e'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x,by-p.r-p.r*.28,p.r*.42,0,Math.PI*2); ctx.fillStyle='#0e0e0e'; ctx.fill();
  }

  /* ── SHARED BACKDROP (grid + rings + animated decals) ────────── */
  _plus(ctx, x, y, s) {
    ctx.strokeStyle='rgba(0,0,0,0.11)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x-s,y); ctx.lineTo(x+s,y);
    ctx.moveTo(x,y-s); ctx.lineTo(x,y+s); ctx.stroke();
  }

  _drawBackdrop(t) {
    const {ctx,W,GY} = this;

    // Grid
    ctx.strokeStyle='rgba(0,0,0,0.04)'; ctx.lineWidth=1;
    for (let x=0;x<W;x+=40) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,GY);ctx.stroke(); }
    for (let y=0;y<GY;y+=40) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }

    // Static "+" crosshair decals
    for (const p of this._s.pluses??[]) this._plus(ctx, p.x, p.y, 5);

    // Drifting motes (moving) — flavour differs per scene
    for (const m of this._s.motes??[]) {
      m.x += m.vx; m.y += m.vy;
      if (m.x < -5) m.x += W+10; else if (m.x > W+5) m.x -= W+10;
      if (m.y < -5) m.y += GY+10; else if (m.y > GY+5) m.y -= GY+10;
      const tw = 0.45 + 0.55*Math.abs(Math.sin(t*1.4 + m.ph));
      ctx.save(); ctx.globalAlpha = 0.06 + 0.16*tw;
      ctx.fillStyle = this.lc;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Rings + a dot orbiting each (moving), alternating direction
    const sp = this._s.orbit ?? 0.4;
    (this._s.circles??[]).forEach((c, i) => {
      ctx.beginPath(); ctx.arc(c.cx,c.cy,c.r,0,Math.PI*2);
      ctx.strokeStyle=this.lc+'22'; ctx.lineWidth=2; ctx.stroke();
      const a  = t * sp * (i % 2 ? -1 : 1) + i*2.1;
      const ox = c.cx + Math.cos(a)*c.r, oy = c.cy + Math.sin(a)*c.r;
      ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI*2);
      ctx.fillStyle = this.lc + 'cc'; ctx.fill();
      ctx.strokeStyle = 'rgba(245,243,238,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    this._skyFx(t);   // stars / day-night sky (behind the scene)
  }

  // Background sky effects: purple → stars, red → day/night sun-moon arc.
  _skyFx(t) {
    const {ctx,W,GY} = this;
    // Stars (purple / design)
    for (const s of this._s.stars ?? []) {
      const tw = 0.35 + 0.65*Math.abs(Math.sin(t*1.6 + s.ph));
      ctx.save(); ctx.globalAlpha = tw;
      ctx.fillStyle = this.lc;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
      if (s.big) {
        ctx.strokeStyle = this.lc; ctx.globalAlpha = tw*0.6; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(s.x-5,s.y); ctx.lineTo(s.x+5,s.y);
        ctx.moveTo(s.x,s.y-5); ctx.lineTo(s.x,s.y+5); ctx.stroke();
      }
      ctx.restore();
    }
    // Day / night cycle (red / city)
    if (this.type === 'city') {
      const ph  = (t * 0.05) % 1;            // full cycle ≈ 20s
      const ang = ph * Math.PI;               // sun rises and sets
      const isDay = ph < 0.5;
      ctx.save();
      ctx.fillStyle = isDay ? `rgba(255,205,110,${(0.12*Math.sin(ang)).toFixed(3)})`
                            : `rgba(35,45,85,${(0.18*Math.sin(ang)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, GY);
      const sx = W*0.12 + W*0.76*ph, sy = GY*0.46 - Math.sin(ang)*GY*0.34;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = isDay ? 'rgba(255,190,70,1)' : 'rgba(225,228,255,1)';
      ctx.beginPath(); ctx.arc(sx, sy, isDay ? 15 : 11, 0, Math.PI*2); ctx.fill();
      if (isDay) { ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
  }

  // Foreground weather: blue → rain, green → wind-blown leaves.
  _weatherFx(t) {
    const {ctx,W,GY} = this;
    for (const d of this._s.rain ?? []) {
      d.y += d.sp; if (d.y > GY) { d.y = -d.len; d.x = Math.random()*W; }
      ctx.strokeStyle = 'rgba(70,120,175,0.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x-2, d.y+d.len); ctx.stroke();
    }
    for (const l of this._s.leaves ?? []) {
      l.x += l.vx + Math.sin(t*1.2 + l.ph)*0.5;   // wind sway
      l.y += l.vy; l.rot += l.spin;
      if (l.y > GY) { l.y = -10; l.x = Math.random()*W; }
      if (l.x > W+10) l.x = -10;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot);
      ctx.fillStyle = this.lc + 'bb';
      ctx.beginPath(); ctx.ellipse(0, 0, l.size, l.size*0.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  /* ── DESIGN ────────────────────────────────────────────────── */
  _drawDesign(t) {
    const {ctx,W,GY} = this;
    for (const b of this._s.blocks??[]) {
      ctx.fillStyle=this._col(b.c); ctx.fillRect(b.x,b.y,b.w,b.h);
      if (b.stripe) this._stripe(ctx,b.x,b.y,b.w,b.h);
      ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=1;
      ctx.strokeRect(b.x+.5,b.y+.5,b.w-1,b.h-1);
    }
    ctx.fillStyle=this.lc; ctx.fillRect(0,GY-5,W,5); ctx.fillRect(0,46,W*.35,4);
    this._groundLine(ctx);
  }

  /* ── VILLAGE ───────────────────────────────────────────────── */
  _drawPine(ctx, x, baseY, h) {
    const trunkH=h*.22, trunkW=6;
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(x-trunkW/2,baseY-trunkH,trunkW,trunkH);
    for (let l=0;l<3;l++) {
      const ty=baseY-trunkH-(h-trunkH)*((l+1)/3);
      const by2=baseY-trunkH-(h-trunkH)*(l/3)+(l>0?10:0);
      const hw=(h*.55)*(1-l*.2);
      ctx.beginPath(); ctx.moveTo(x,ty); ctx.lineTo(x+hw,by2); ctx.lineTo(x-hw,by2);
      ctx.closePath(); ctx.fillStyle=this.lc+'cc'; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.09)'; ctx.lineWidth=1; ctx.stroke();
    }
  }

  _drawHouse(ctx, b) {
    const {x,y,w,h,c} = b;
    const fill=this._col(c), roofH=h*.45, bodyY=y+roofH*.85;
    ctx.fillStyle=fill; ctx.fillRect(x,bodyY,w,h-roofH*.85);
    ctx.strokeStyle='rgba(0,0,0,0.08)'; ctx.lineWidth=1;
    ctx.strokeRect(x+.5,bodyY+.5,w-1,h-roofH*.85-1);
    ctx.beginPath(); ctx.moveTo(x-5,bodyY); ctx.lineTo(x+w/2,y); ctx.lineTo(x+w+5,bodyY);
    ctx.closePath(); ctx.fillStyle='#111'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1; ctx.stroke();
    const winFill=c==='dark'?'rgba(255,255,255,0.14)':'rgba(0,0,0,0.1)';
    ctx.fillStyle=winFill;
    ctx.fillRect(x+w*.12,bodyY+h*.12,w*.28,h*.28);
    if (w>65) ctx.fillRect(x+w*.60,bodyY+h*.12,w*.28,h*.28);
    ctx.fillStyle='rgba(0,0,0,0.22)';
    const dw=w*.2,dh=h*.32;
    ctx.fillRect(x+w*.5-dw*.5,bodyY+(h-roofH*.85)-dh,dw,dh);
  }

  _drawVillage(t) {
    const {ctx,W,GY}=this;
    ctx.beginPath(); ctx.moveTo(0,GY); ctx.lineTo(0,GY-55);
    ctx.quadraticCurveTo(W*.12,GY-120,W*.25,GY-65);
    ctx.quadraticCurveTo(W*.38,GY-18, W*.50,GY-95);
    ctx.quadraticCurveTo(W*.62,GY-165,W*.75,GY-85);
    ctx.quadraticCurveTo(W*.87,GY-25, W,   GY-65);
    ctx.lineTo(W,GY); ctx.closePath(); ctx.fillStyle='rgba(0,0,0,0.05)'; ctx.fill();
    for (const h of this._s.houses??[]) this._drawHouse(ctx,h);
    for (const p of this._s.pines??[]) this._drawPine(ctx,p.x,GY,p.h);
    this._groundLine(ctx);
    for (const p of this._s.villagePeople??[]) this._person(ctx,p,t,GY);
  }

  /* ── RUNWAY ────────────────────────────────────────────────── */
  _drawRunway(t) {
    const {ctx,W,GY}=this;
    const vpX=W*.5, vpY=GY-150;

    // Runway tarmac (perspective trapezoid)
    ctx.fillStyle='rgba(0,0,0,0.13)';
    ctx.beginPath(); ctx.moveTo(vpX-10,vpY); ctx.lineTo(vpX+10,vpY);
    ctx.lineTo(W*.72,GY); ctx.lineTo(W*.28,GY); ctx.closePath(); ctx.fill();

    // Center dashes
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=2; ctx.setLineDash([10,9]);
    for (let i=1;i<9;i++) {
      const f=i/9;
      const x1=vpX+(W*.28-vpX)*f, y1=vpY+(GY-vpY)*f;
      const x2=vpX+(W*.28-vpX)*Math.min(1,f+.06), y2=vpY+(GY-vpY)*Math.min(1,f+.06);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();

    // Edge lights
    for (let i=0;i<=10;i++) {
      const f=i/10, pulse=.55+.45*Math.sin(t*2.8+i*.7);
      const lx=vpX+(W*.28-vpX)*f, rx=vpX+(W*.72-vpX)*f, ly=vpY+(GY-vpY)*f, lr=2+f*3.5;
      [lx,rx].forEach(ex => {
        ctx.beginPath(); ctx.arc(ex,ly,lr,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,210,40,${.5+pulse*.45})`; ctx.fill();
      });
    }

    // ── ATC Control Tower ──
    const tx=W*.80;
    // Foundation / base
    ctx.fillStyle=this._col('dark'); ctx.fillRect(tx-18,GY-22,36,22);
    // Main shaft
    ctx.fillRect(tx-7,GY-200,14,180);
    // Mid equipment section (slightly wider)
    ctx.fillRect(tx-11,GY-155,22,36);
    // Control room (wide glassy box at top of shaft)
    ctx.fillStyle=this.lc; ctx.fillRect(tx-22,GY-240,44,40);
    // Glass panes
    ctx.fillStyle='rgba(255,255,255,0.20)'; ctx.fillRect(tx-20,GY-237,40,33);
    ctx.fillStyle='rgba(0,0,0,0.10)';
    for (let w=0;w<4;w++) ctx.fillRect(tx-19+w*10,GY-237,8,33);
    // Observation deck rim
    ctx.fillStyle=this._col('dark'); ctx.fillRect(tx-24,GY-242,48,4);
    // Antenna mast
    ctx.strokeStyle=this._col('dark'); ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(tx,GY-242); ctx.lineTo(tx,GY-278); ctx.stroke();
    // Cross arm
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(tx-10,GY-266); ctx.lineTo(tx+10,GY-266); ctx.stroke();
    // Blinking warning light
    const blink=0.4+0.6*Math.abs(Math.sin(t*2.5));
    ctx.beginPath(); ctx.arc(tx,GY-280,4,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,60,60,${blink})`; ctx.fill();

    this._groundLine(ctx);
  }

  /* ── MOUNTAIN ──────────────────────────────────────────────── */
  _drawMountain(t) {
    const {ctx,W,GY}=this;
    ctx.beginPath(); ctx.moveTo(0,GY);
    ctx.lineTo(0,GY-90); ctx.lineTo(W*.10,GY-140); ctx.lineTo(W*.22,GY-275);
    ctx.lineTo(W*.35,GY-175); ctx.lineTo(W*.50,GY-310); ctx.lineTo(W*.65,GY-195);
    ctx.lineTo(W*.78,GY-255); ctx.lineTo(W*.90,GY-125); ctx.lineTo(W,GY-85); ctx.lineTo(W,GY);
    ctx.closePath(); ctx.fillStyle='rgba(0,0,0,0.07)'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W*.15,GY); ctx.lineTo(W*.35,GY-175); ctx.lineTo(W*.50,GY-370);
    ctx.lineTo(W*.65,GY-175); ctx.lineTo(W*.85,GY);
    ctx.closePath(); ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(W*.50,GY-370); ctx.lineTo(W*.44,GY-295); ctx.lineTo(W*.56,GY-295);
    ctx.closePath(); ctx.fillStyle=this.lc+'28'; ctx.fill();
    for (let i=0;i<20;i++) {
      const tx=W*.10+(W*.80*i/19), th=28+Math.sin(i*1.4)*9;
      ctx.beginPath(); ctx.moveTo(tx-13,GY-1); ctx.lineTo(tx,GY-1-th); ctx.lineTo(tx+13,GY-1);
      ctx.closePath(); ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fill();
    }
    for (const lt of this._s.cityLights??[]) {
      const flk=.55+.45*Math.sin(t*1.8+lt.ph);
      ctx.beginPath(); ctx.arc(lt.x,lt.y,lt.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,200,50,${.22*flk})`; ctx.fill();
    }
    ctx.fillStyle=this._col('dark');
    ctx.fillRect(W*.61,GY-98,58,7); ctx.fillRect(W*.625,GY-98,4,98); ctx.fillRect(W*.655,GY-98,4,98);
    ctx.fillStyle=this.lc; ctx.fillRect(W*.605,GY-102,64,5);
    for (const bd of this._s.birds??[]) {
      bd.x+=bd.sp; if (bd.x>this.W+40) bd.x=-40;
      const by=bd.y+Math.sin(t*.6+bd.ph)*5;
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(bd.x-6,by); ctx.lineTo(bd.x,by+4); ctx.lineTo(bd.x+6,by); ctx.stroke();
    }
    this._groundLine(ctx);
  }

  /* ── CITY ──────────────────────────────────────────────────── */
  _drawCity(t) {
    const {ctx,W,GY}=this;
    for (const b of this._s.buildings??[]) {
      ctx.fillStyle=this._col(b.c); ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle='rgba(0,0,0,0.07)'; ctx.lineWidth=1;
      ctx.strokeRect(b.x+.5,b.y+.5,b.w-1,b.h-1);
      if (b.c==='line') {
        ctx.save(); ctx.beginPath(); ctx.rect(b.x,b.y,b.w,b.h); ctx.clip();
        ctx.strokeStyle='rgba(0,0,0,0.13)'; ctx.lineWidth=1.5;
        for (let s=-b.h;s<b.w+b.h;s+=10) {
          ctx.beginPath(); ctx.moveTo(b.x+s,b.y); ctx.lineTo(b.x+s-b.h*.7,b.y+b.h); ctx.stroke();
        }
        ctx.restore();
      }
      if (b.h>80&&b.w>36) {
        const cols=Math.max(1,Math.floor(b.w/22)), rows=Math.max(1,Math.floor((b.h-18)/26));
        const ww=8,wh=11,hg=b.w/(cols+1),vg=(b.h-18)/(rows+1);
        ctx.fillStyle=b.c==='dark'?'rgba(255,255,255,0.11)':'rgba(0,0,0,0.09)';
        for (let r=1;r<=rows;r++) for (let c=1;c<=cols;c++)
          ctx.fillRect(b.x+c*hg-ww/2, b.y+8+r*vg-wh/2, ww, wh);
      }
    }
    this._groundLine(ctx);
    for (const p of this._s.cityPeople??[]) this._person(ctx,p,t,GY);
  }

  _draw(ts) {
    const {ctx,W,H}=this;
    const t=ts*.001;
    ctx.clearRect(0,0,W,H);
    this._drawBackdrop(t);   // grid + rings behind every scene
    switch(this.type) {
      case 'design':   this._drawDesign(t);   break;
      case 'village':  this._drawVillage(t);  break;
      case 'runway':   this._drawRunway(t);   break;
      case 'mountain': this._drawMountain(t); break;
      case 'city':     this._drawCity(t);     break;
    }
    this._weatherFx(t);   // rain / leaves in front of the scene
  }
}
