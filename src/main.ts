import * as THREE from 'three';
import { SolitaireGame, cloneState } from './game';
import { Card, Suit, RANK_VALUE, SUIT_COLORS } from './types';

const CARD_W = 2.0;
const CARD_H = CARD_W * 1.285;
const CARD_DEPTH = 0.03;
const TABLEAU_SPACING_X = 2.5;
const OVERLAP_UP = 0.45;
const OVERLAP_DOWN = 0.12;
const ANIM = 0.18;

const STOCK_X = -9.5, STOCK_Z = 5;
const WASTE_X = -5.5, WASTE_Z = 5;
const FND_X = [-1.5, 2.0, 5.5, 9.0];
const FND_Z = 5;
const TAB_Z = 0.8;

// ── Texture helpers ──
function suitSym(s: Suit) {
  return s === 'hearts' ? '♥' : s === 'diamonds' ? '♦' : s === 'clubs' ? '♣' : '♠';
}

function cardTexture(card: Card, faceUp: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 330;
  const x = c.getContext('2d')!;

  x.fillStyle = '#FFF8F0';
  x.beginPath(); x.roundRect(0, 0, 256, 330, 12); x.fill();
  x.strokeStyle = '#CCC'; x.lineWidth = 2;
  x.beginPath(); x.roundRect(0, 0, 256, 330, 12); x.stroke();

  if (!faceUp) {
    x.fillStyle = '#1A3C6E';
    x.beginPath(); x.roundRect(10, 10, 236, 310, 8); x.fill();
    x.strokeStyle = '#2A5C9E'; x.lineWidth = 2;
    x.beginPath(); x.roundRect(18, 18, 220, 294, 6); x.stroke();
    x.beginPath();
    x.moveTo(128, 40); x.lineTo(220, 165); x.lineTo(128, 290); x.lineTo(36, 165); x.closePath();
    x.strokeStyle = '#3A7CBE'; x.lineWidth = 2; x.stroke();
    return c;
  }

  const col = SUIT_COLORS[card.suit];
  const sym = suitSym(card.suit);
  x.fillStyle = col;
  x.font = 'bold 28px serif'; x.textAlign = 'left'; x.textBaseline = 'top';
  x.fillText(card.rank, 12, 10);
  x.font = '36px serif';
  x.fillText(sym, 14, 42);
  x.save(); x.translate(256, 330); x.rotate(Math.PI);
  x.font = 'bold 28px serif'; x.textAlign = 'left'; x.textBaseline = 'top';
  x.fillText(card.rank, 12, 10);
  x.font = '36px serif'; x.fillText(sym, 14, 42);
  x.restore();

  const v = RANK_VALUE[card.rank];
  if (v === 1) {
    x.font = '100px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(sym, 128, 165);
  } else if (v >= 10) {
    x.strokeStyle = col; x.lineWidth = 2;
    x.beginPath(); x.roundRect(20, 20, 216, 290, 8); x.stroke();
    x.font = 'bold 72px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(card.rank, 128, 155);
    x.font = '22px serif'; x.fillText(sym, 128, 55); x.fillText(sym, 128, 275);
  } else {
    const pips = pipsFor(v);
    x.font = '42px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const p of pips) {
      x.save(); x.translate(p.x, p.y); if (p.f) x.rotate(Math.PI);
      x.fillText(sym, 0, 0); x.restore();
    }
  }
  return c;
}

function pipsFor(n: number): { x: number; y: number; f: boolean }[] {
  const cx = 128, dy = 70, ox = 60;
  const cy = 165, t = cy - dy, b = cy + dy, l = cx - ox, r = cx + ox;
  const F = true, T = false;
  switch (n) {
    case 2: return [{ x: cx, y: t, f: T }, { x: cx, y: b, f: F }];
    case 3: return [{ x: cx, y: t, f: T }, { x: cx, y: cy, f: T }, { x: cx, y: b, f: F }];
    case 4: return [{ x: l, y: t, f: T }, { x: r, y: t, f: T }, { x: l, y: b, f: F }, { x: r, y: b, f: F }];
    case 5: return [{ x: l, y: t, f: T }, { x: r, y: t, f: T }, { x: cx, y: cy, f: T }, { x: l, y: b, f: F }, { x: r, y: b, f: F }];
    case 6: return [{ x: l, y: t, f: T }, { x: r, y: t, f: T }, { x: l, y: cy, f: T }, { x: r, y: cy, f: T }, { x: l, y: b, f: F }, { x: r, y: b, f: F }];
    case 7: return [{ x: l, y: t, f: T }, { x: r, y: t, f: T }, { x: l, y: cy - 25, f: T }, { x: r, y: cy - 25, f: T }, { x: cx, y: cy, f: T }, { x: l, y: b, f: F }, { x: r, y: b, f: F }];
    case 8: return [{ x: l, y: t, f: T }, { x: r, y: t, f: T }, { x: l, y: cy - 25, f: T }, { x: r, y: cy - 25, f: T }, { x: l, y: cy + 25, f: F }, { x: r, y: cy + 25, f: F }, { x: l, y: b, f: F }, { x: r, y: b, f: F }];
    case 9: return [{ x: l, y: t - 15, f: T }, { x: r, y: t - 15, f: T }, { x: l, y: t + 15, f: T }, { x: r, y: t + 15, f: T }, { x: cx, y: cy, f: T }, { x: l, y: b - 15, f: F }, { x: r, y: b - 15, f: F }, { x: l, y: b + 15, f: F }, { x: r, y: b + 15, f: F }];
    case 10: return [{ x: l, y: t - 20, f: T }, { x: r, y: t - 20, f: T }, { x: l, y: t + 5, f: T }, { x: r, y: t + 5, f: T }, { x: l, y: cy - 10, f: T }, { x: r, y: cy - 10, f: T }, { x: l, y: cy + 10, f: F }, { x: r, y: cy + 10, f: F }, { x: l, y: b - 5, f: F }, { x: r, y: b - 5, f: F }];
  }
  return [];
}

// ── Card 3D ──
interface C3D {
  card: Card;
  mesh: THREE.Group;
  tx: number; tz: number; ty: number;
  cx: number; cy: number; cz: number;
  hx: number; hy: number; hz: number;
  dragging: boolean;
  pile: string; pidx: number;
}

function makeCard(card: Card): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_DEPTH);
  const faceTex = new THREE.CanvasTexture(cardTexture(card, true));
  const backTex = new THREE.CanvasTexture(cardTexture(card, false));
  // After rotation.x = -PI/2, +Z becomes +Y (top), -Z becomes -Y (bottom)
  const topMat = new THREE.MeshStandardMaterial({ map: card.faceUp ? faceTex : backTex });
  const botMat = new THREE.MeshStandardMaterial({ map: card.faceUp ? backTex : faceTex });
  const edge = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const m = new THREE.Mesh(geo, [edge, edge, edge, edge, topMat, botMat]);
  m.castShadow = true; m.receiveShadow = true;
  // Lay card flat on the table (face points toward +Y / camera)
  m.rotation.x = -Math.PI / 2;
  g.add(m);
  (g as any)._topMat = topMat; (g as any)._botMat = botMat;
  return g;
}

function refreshCard(c3d: C3D): void {
  const topMat = (c3d.mesh as any)._topMat as THREE.MeshStandardMaterial;
  const botMat = (c3d.mesh as any)._botMat as THREE.MeshStandardMaterial;
  topMat.map = new THREE.CanvasTexture(cardTexture(c3d.card, c3d.card.faceUp) ? cardTexture(c3d.card, true) : cardTexture(c3d.card, false));
  topMat.needsUpdate = true;
  botMat.map = new THREE.CanvasTexture(c3d.card.faceUp ? cardTexture(c3d.card, false) : cardTexture(c3d.card, true));
  botMat.needsUpdate = true;
}

// ── App ──
class App {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  renderer!: THREE.WebGLRenderer;
  game = new SolitaireGame();
  cards = new Map<string, C3D>();
  ray = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  drag: C3D | null = null;
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
  startTime = 0;
  elapsed = 0;
  running = true;

  constructor() {
    this._init();
    this._build();
    this._pos();
    this._loop();
  }

  _init() {
    // Table
    const tbl = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 20),
      new THREE.MeshStandardMaterial({ color: 0x1B5E20, roughness: 0.9 })
    );
    tbl.rotation.x = -Math.PI / 2; tbl.position.y = -0.5; tbl.receiveShadow = true;
    this.scene.add(tbl);

     // Foundation placeholders with suit symbols
    const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
    for (let i = 0; i < 4; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 330;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath(); ctx.roundRect(0, 0, 256, 330, 12); ctx.fill();
      ctx.fillStyle = '#1B5E20';
      ctx.font = '80px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(suitSym(suits[i]), 128, 165);
      const tex = new THREE.CanvasTexture(canvas);
      const ph = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W - 0.2, CARD_H - 0.2),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.5 })
      );
      ph.rotation.x = -Math.PI / 2;
      ph.position.set(FND_X[i], -0.49, FND_Z);
      this.scene.add(ph);
    }

    // Stock placeholder
    const sp = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W - 0.2, CARD_H - 0.2),
      new THREE.MeshStandardMaterial({ color: 0x2E7D32, transparent: true, opacity: 0.4 })
    );
    sp.rotation.x = -Math.PI / 2;
    sp.position.set(STOCK_X, -0.49, STOCK_Z);
    this.scene.add(sp);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(5, 15, 8); dl.castShadow = true;
    dl.shadow.mapSize.set(2048, 2048);
    const sc = dl.shadow.camera as THREE.OrthographicCamera;
    sc.left = -15; sc.right = 15; sc.top = 10; sc.bottom = -10; sc.updateProjectionMatrix();
    this.scene.add(dl);
    this.scene.add(new THREE.DirectionalLight(0x8888ff, 0.15));

    // Camera
    this.camera.position.set(0, 16, 6);
    this.camera.lookAt(0, 0, 1);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.setClearColor(0x0a0a1a);
    document.body.appendChild(this.renderer.domElement);

    // Events
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => this._down(e));
    this.renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => this._move(e));
    this.renderer.domElement.addEventListener('mouseup', (e: MouseEvent) => this._up(e));
    this.renderer.domElement.addEventListener('dblclick', (e: MouseEvent) => this._dbl(e));
    document.getElementById('newGame')!.addEventListener('click', () => this._newGame());
    document.getElementById('undo')!.addEventListener('click', () => this._undo());
  }

  _sv(x: number, y: number) {
    this.mouse.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
  }

  _sw(x: number, y: number): THREE.Vector3 {
    this._sv(x, y);
    const t = new THREE.Vector3();
    this.ray.ray.intersectPlane(this.plane, t);
    return t;
  }

  _hit(x: number, y: number): C3D | null {
    this._sv(x, y);
    const objs: THREE.Object3D[] = [];
    for (const c of this.cards.values()) for (const ch of c.mesh.children) if (ch instanceof THREE.Mesh) objs.push(ch);
    const hits = this.ray.intersectObjects(objs, false);
    if (!hits.length) return null;
    const grp = hits[0].object.parent as THREE.Group;
    for (const c of this.cards.values()) if (c.mesh === grp) return c;
    return null;
  }

  _src(c: C3D): { t: 'stock' | 'waste' | 'foundation' | 'tableau'; ci: number; ri: number } | null {
    const w = this.game.waste.findIndex(d => d.id === c.card.id);
    if (w >= 0) return { t: 'waste', ci: 0, ri: w };
    for (let col = 0; col < 7; col++) {
      const r = this.game.tableau[col].findIndex(d => d.id === c.card.id);
      if (r >= 0) return { t: 'tableau', ci: col, ri: r };
    }
    for (let f = 0; f < 4; f++) {
      const r = this.game.foundations[f].findIndex(d => d.id === c.card.id);
      if (r >= 0) return { t: 'foundation', ci: f, ri: r };
    }
    const s = this.game.stock.findIndex(d => d.id === c.card.id);
    if (s >= 0) return { t: 'stock', ci: 0, ri: s };
    return null;
  }

  _attached(c: C3D): C3D[] {
    const s = this._src(c);
    if (!s || s.t !== 'tableau') return [];
    const p = this.game.tableau[s.ci];
    const a: C3D[] = [];
    for (let i = s.ri + 1; i < p.length; i++) { const ac = this.cards.get(p[i].id); if (ac) a.push(ac); }
    return a;
  }

  _down(e: MouseEvent) {
    const c = this._hit(e.clientX, e.clientY);
    if (c && c.card.faceUp) {
      this.drag = c;
      const w = this._sw(e.clientX, e.clientY);
      c.cx = c.tx; c.cz = c.tz;
      (c as any)._dx = c.cx - w.x; (c as any)._dz = c.cz - w.z;
      c.dragging = true;
      c.mesh.position.y = 0.5;
      const att = this._attached(c);
      for (let i = 0; i < att.length; i++) { att[i].dragging = true; att[i].mesh.position.y = 0.5 + i * 0.01; }
      return;
    }
    // Click on stock (or stock area)
    const w = this._sw(e.clientX, e.clientY);
    if (c && c.pile === 'stock') {
      this._drawStock();
    } else if (!c && Math.abs(w.x - STOCK_X) < 1.5 && Math.abs(w.z - STOCK_Z) < 2) {
      this._drawStock();
    }
  }

  _move(e: MouseEvent) {
    if (!this.drag) return;
    const w = this._sw(e.clientX, e.clientY);
    this.drag.cx = w.x + (this.drag as any)._dx;
    this.drag.cz = w.z + (this.drag as any)._dz;
    this.drag.tx = this.drag.cx; this.drag.tz = this.drag.cz;
    const att = this._attached(this.drag);
    for (let i = 0; i < att.length; i++) {
      att[i].cx = this.drag.cx; att[i].cz = this.drag.cz + i * OVERLAP_UP;
      att[i].tx = att[i].cx; att[i].tz = att[i].cz;
    }
  }

  _up(e: MouseEvent) {
    if (!this.drag) return;
    const c = this.drag;
    c.mesh.position.y = 0;
    const ok = this._drop(c);
    if (!ok) { c.tx = c.hx; c.tz = c.hz; c.ty = c.hy; }
    c.dragging = false;
    this.drag = null;
  }

  _dbl(e: MouseEvent) {
    const c = this._hit(e.clientX, e.clientY);
    if (!c || !c.card.faceUp) return;
    this._autoFnd(c);
  }

  _autoFnd(c: C3D) {
    const s = this._src(c);
    if (!s) return;
    if (s.t === 'waste') {
      for (let f = 0; f < 4; f++) {
        if (this.game.moveToFoundation('waste', 0, f)) { this._sync(); return; }
      }
    } else if (s.t === 'tableau' && s.ri === this.game.tableau[s.ci].length - 1) {
      for (let f = 0; f < 4; f++) {
        if (this.game.moveToFoundation('tableau', s.ci, f)) { this._sync(); return; }
      }
    }
  }

  _drop(c: C3D): boolean {
    const s = this._src(c);
    if (!s) return false;

    // Foundation drop
    for (let f = 0; f < 4; f++) {
      if (Math.abs(c.cx - FND_X[f]) < 1.5 && Math.abs(c.cz - FND_Z) < 1.5) {
        if (s.t === 'waste' && this.game.waste.length > 0) {
          if (this.game.moveToFoundation('waste', 0, f)) { this._sync(); return true; }
        } else if (s.t === 'tableau' && s.ri === this.game.tableau[s.ci].length - 1) {
          if (this.game.moveToFoundation('tableau', s.ci, f)) { this._sync(); return true; }
        }
      }
    }

    // Tableau drop
    for (let col = 0; col < 7; col++) {
      const tx = col * TABLEAU_SPACING_X - 2 * TABLEAU_SPACING_X;
      if (Math.abs(c.cx - tx) < 1.5 && c.cz < 3.5) {
        if (s.t === 'tableau' && s.ci !== col) {
          if (this.game.moveToTableau(s.ci, col)) { this._sync(); return true; }
        } else if (s.t === 'waste' && this.game.waste.length > 0) {
          const top = this.game.waste[this.game.waste.length - 1];
          if (this.game.canPlaceOnTableau(top, col)) {
            this.game.history.push(cloneState(this.game));
            this.game.waste.pop(); this.game.tableau[col].push(top);
            this.game.score += 10;
            this._sync(); return true;
          }
        }
      }
    }
    return false;
  }

  _drawStock() {
    this.game.drawFromStock();
    this._sync();
  }

  _sync() {
    this._build(); this._pos(); this._score();
    if (this.game.isWon()) setTimeout(() => alert('You win! Score: ' + this.game.score), 200);
  }

  _build() {
    for (const c of this.cards.values()) this.scene.remove(c.mesh);
    this.cards.clear();

    const list: { card: Card; pile: string; idx: number }[] = [];
    this.game.stock.forEach((d, i) => list.push({ card: d, pile: 'stock', idx: i }));
    this.game.waste.forEach((d, i) => list.push({ card: d, pile: 'waste', idx: i }));
    for (let f = 0; f < 4; f++) this.game.foundations[f].forEach((d, i) => list.push({ card: d, pile: `f${f}`, idx: i }));
    for (let col = 0; col < 7; col++) this.game.tableau[col].forEach((d, i) => list.push({ card: d, pile: `t${col}`, idx: i }));

    for (const { card, pile, idx } of list) {
      const m = makeCard(card);
      const c: C3D = { card, mesh: m, tx: 0, tz: 0, ty: 0, cx: 0, cy: 0, cz: 0, hx: 0, hy: 0, hz: 0, dragging: false, pile, pidx: idx };
      this.scene.add(m); this.cards.set(card.id, c);
    }
  }

  _pos() {
    // Stock
    for (let i = 0; i < this.game.stock.length; i++) {
      const c = this.cards.get(this.game.stock[i].id);
      if (!c) continue;
      c.hx = STOCK_X; c.hz = STOCK_Z; c.hy = i * 0.005;
      c.tx = c.hx; c.tz = c.hz; c.ty = c.hy;
    }
    // Waste
    for (let i = 0; i < this.game.waste.length; i++) {
      const c = this.cards.get(this.game.waste[i].id);
      if (!c) continue;
      const fan = Math.max(0, i - this.game.waste.length + 3) * 0.8;
      c.hx = WASTE_X + fan; c.hz = WASTE_Z; c.hy = 0;
      c.tx = c.hx; c.tz = c.hz; c.ty = c.hy;
    }
    // Foundations
    for (let f = 0; f < 4; f++) {
      for (let i = 0; i < this.game.foundations[f].length; i++) {
        const c = this.cards.get(this.game.foundations[f][i].id);
        if (!c) continue;
        c.hx = FND_X[f]; c.hz = FND_Z; c.hy = 0;
        c.tx = c.hx; c.tz = c.hz; c.ty = c.hy;
      }
    }
    // Tableau
    for (let col = 0; col < 7; col++) {
      for (let i = 0; i < this.game.tableau[col].length; i++) {
        const c = this.cards.get(this.game.tableau[col][i].id);
        if (!c) continue;
        const tx = col * TABLEAU_SPACING_X - 2 * TABLEAU_SPACING_X;
        const ov = this.game.tableau[col][i].faceUp ? OVERLAP_UP : OVERLAP_DOWN;
        c.hx = tx; c.hz = TAB_Z + i * ov; c.hy = 0;
        c.tx = c.hx; c.tz = c.hz; c.ty = c.hy;
      }
    }
  }

  _loop() {
    for (const c of this.cards.values()) {
      if (c.dragging) {
        c.mesh.position.set(c.cx, c.mesh.position.y, c.cz);
        continue;
      }
      c.cx += (c.tx - c.cx) * ANIM;
      c.cz += (c.tz - c.cz) * ANIM;
      c.cy += (c.ty - c.cy) * ANIM;
      c.mesh.position.set(c.cx, c.cy, c.cz);
    }
    this.renderer.render(this.scene, this.camera);
    this._score();
    requestAnimationFrame(() => this._loop());
  }

  _newGame() { this.game.newGame(); this.startTime = performance.now(); this.elapsed = 0; this.running = true; this._sync(); }
  _undo() { this.game.undo(); this._sync(); }
  _score() {
    if (this.running) this.elapsed = Math.floor((performance.now() - this.startTime) / 1000);
    const m = Math.floor(this.elapsed / 60);
    const s = (this.elapsed % 60).toString().padStart(2, '0');
    document.getElementById('score')!.textContent = `Score: ${this.game.score} | Time: ${m}:${s} | Undo: ${this.game.history.length}`;
  }
}

new App();
