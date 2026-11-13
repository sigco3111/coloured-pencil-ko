// The church's bell tower, over the roofs. Cream stone with dressed corner stones; a clock on three of its faces,
// under a string course; above that the belfry, two arched openings a side with a bronze bell hanging in each;
// a cornice on its row of corbels; and a steep four-sided spire tiled row over row like the roofs of the town,
// with a gilt ball and a weather vane on its point.
import * as THREE from 'three';
import { ball, block, knead, roll, turned } from '../shape.js';
import { field, hue } from '../pencil.js';
import { arched } from './houses.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const WALL = '#f6ecd6', STONE = '#e9dcc0', DRESSED = '#fbf6e6', NAVY = '#3d5a80', GOLD = '#e3b54a', IRON = '#2f3a44';
const TILES = ['#c9663f', '#b5533c', '#d67a4a', '#bf5c3a', '#cf7050'];
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

/** kit: { line, flat, rand, pick, next }. Stands at (x, z); its cornice is at `top`. */
export function buildTower(kit, { x: TX = 2.6, z: TZ = -13.2, top = 15.4 } = {}) {
  const { line, flat, rand, pick, next, own, moving, time } = kit, HALF = 1.2;
  /** Puts a piece made for the front face (it faces +z, the wall at z = HALF) on face k, going round. */
  const P = (g, k = 0) => g.rotateY((k * Math.PI) / 2).translate(TX, 0, TZ);
  const every = (make) => { for (let k = 0; k < 4; k++) make(k); };

  // --- the shaft, its corner stones, and here and there a stone that shows through the limewash ---
  line.add(knead(block(2 * HALF, 9.3, 2 * HALF, 0.06, 0.5), 0.016, 1, next()).translate(TX, top - 4.65, TZ), WALL);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    let n = 0;
    for (let y = top - 5.4; y < top - 0.3; y += 0.42, n++) {
      const a = n % 2 ? 0.56 : 0.34, b = n % 2 ? 0.34 : 0.56;
      line.add(knead(block(a, 0.36, b, 0.03, 0.2), 0.005, 4, next()).translate(TX + sx * (HALF - a / 2 + 0.035), y, TZ + sz * (HALF - b / 2 + 0.035)), n % 3 ? STONE : '#e2d2b2', [0.3, 1, 0.2]);
    }
  }
  every((k) => {
    for (let n = 0; n < 9; n++) {
      const sx = (rand() - 0.5) * 1.5, sy = top - 5.2 + rand() * 4.9, w = 0.3 + 0.22 * rand();
      if (Math.hypot(sx, sy - (top - 2.4)) < 0.85 || sy > top - 1.8) continue;
      line.add(P(block(w, 0.18, 0.05, 0.02, 0.2).translate(sx, sy, HALF + 0.012), k), pick(['#eee1c4', '#e8dab9', '#f0e6cc']), [0.2, 1, 0.1]);
    }
  });

  // --- string courses: one under the clock, one that is the belfry's sill ---
  line.add(block(2 * HALF + 0.12, 0.1, 2 * HALF + 0.12, 0.035, 0.4).translate(TX, top - 3.2, TZ), DRESSED, [0.1, 1, 0.2]);
  line.add(block(2 * HALF + 0.18, 0.13, 2 * HALF + 0.18, 0.04, 0.4).translate(TX, top - 1.66, TZ), DRESSED, [0.1, 1, 0.2]);

  // --- the clock: a blue rim, a pale face, its hours and its hands at ten past ten ---
  for (const k of [0, 1, 3]) {
    const cy = top - 2.4, R = 0.62, front = HALF + 0.07;
    const dial = turned([[0, 0], [R, 0], [R, 0.07], [R - 0.1, 0.07], [R - 0.12, 0.035], [0, 0.035]], 28).rotateX(Math.PI / 2).translate(0, cy, HALF);
    hue(dial, (px, py) => (Math.hypot(px, py - cy) < R - 0.11 ? DRESSED : NAVY));
    line.add(P(field(dial, [0.6, 1, 0], [-0.7, 1, 0]), k));
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * TAU, big = h % 3 === 0;
      line.add(P(block(big ? 0.05 : 0.03, big ? 0.13 : 0.08, 0.03, 0.008, 0.1).translate(0, 0.4, 0).rotateZ(-a).translate(0, cy, front - 0.02), k), NAVY);
    }
    line.add(P(block(0.05, 0.3, 0.03, 0.01, 0.1).translate(0, 0.13, 0).rotateZ(1.05).translate(0, cy, front - 0.005), k), IRON);
    line.add(P(block(0.036, 0.42, 0.03, 0.01, 0.1).translate(0, 0.19, 0).rotateZ(-1.05).translate(0, cy, front + 0.01), k), IRON);
    line.add(P(ball(0.045, 1).scale(1, 1, 0.6).translate(0, cy, front + 0.02), k), GOLD);
  }

  // --- the belfry: two arched openings a side, a bell in each ---
  every((k) => {
    for (const ox of [-0.47, 0.47]) {
      const y0 = top - 1.6;
      line.add(P(arched(0.76, 1.34).translate(ox, y0, HALF + 0.02), k), DRESSED);
      line.add(P(arched(0.57, 1.2).translate(ox, y0 + 0.03, HALF + 0.045), k), '#4a5672', [0.5, 1, 0], [-0.5, 1, 0]);
      line.add(P(block(0.52, 0.06, 0.08, 0.02, 0.2).translate(ox, y0 + 1.0, HALF + 0.07), k), '#7a5233');
      // the bell hangs from its beam and swings, each in its own time
      const bell = own((b) => {
        b.line.add(turned([[0, 0], [0.19, 0], [0.2, 0.05], [0.135, 0.15], [0.1, 0.3], [0.05, 0.36], [0, 0.37]], 12).translate(0, -0.38, 0), '#d9a441', [0.3, 1, 0.2]);
        b.line.add(ball(0.045, 1).translate(0, -0.42, 0.03), '#8a6a2a');
      });
      const turnBy = (k * Math.PI) / 2, out = HALF + 0.03, ph = k * 1.3 + (ox > 0 ? 0.9 : 0);
      bell.position.set(TX + ox * Math.cos(turnBy) + out * Math.sin(turnBy), y0 + 0.98, TZ - ox * Math.sin(turnBy) + out * Math.cos(turnBy));
      bell.rotation.order = 'YXZ';
      bell.rotation.y = turnBy;
      moving.push(() => { bell.rotation.z = 0.26 * Math.sin(time.value * 2.1 + ph); });
    }
  });

  // --- the cornice, on its corbels ---
  every((k) => { for (let i = -3; i <= 3; i++) line.add(P(block(0.14, 0.16, 0.2, 0.03, 0.1).translate(i * 0.36, top - 0.08, HALF + 0.07), k), STONE); });
  line.add(block(2 * HALF + 0.34, 0.14, 2 * HALF + 0.34, 0.04, 0.4).translate(TX, top + 0.06, TZ), DRESSED, [0.1, 1, 0.2]);
  line.add(block(2 * HALF + 0.58, 0.12, 2 * HALF + 0.58, 0.04, 0.4).translate(TX, top + 0.18, TZ), DRESSED, [0.1, 1, 0.2]);

  // --- the spire: four steep sides, tiled in rows that lap, a roll of tile down each hip ---
  const y0 = top + 0.24, H = HALF + 0.29, rise = 2.5, L = Math.hypot(H, rise), slope = Math.atan2(rise, H), rows = 7, rw = L / rows, tones = TILES.map((c) => new THREE.Color(c));
  line.add(turned([[0, -0.02], [(H - 0.04) * Math.SQRT2, 0], [0.05, rise - 0.04], [0, rise - 0.04]], 4).rotateY(Math.PI / 4).translate(TX, y0, TZ), '#9a4a33');
  every((k) => {
    for (let i = 0; i < rows; i++) {
      const t = (i + 0.5) / rows, hw = H * (1 - t) + 0.03, lift = 0.05;
      const slab = knead(block(2 * hw, 0.07, rw + 0.1, 0.03, 0.3), 0.006, 4, next()).rotateX(slope - 0.08).translate(0, y0 + rise * t + (H / L) * lift - 0.05, H * (1 - t) + (rise / L) * lift);
      hue(slab, (px) => tones[Math.floor(hash(Math.floor(px / 0.27) * 7.3 + i * 3.1 + k) * tones.length)]);
      line.add(P(field(slab, [1, 0.05, 0], [0.3, 0.6, 1]), k));
    }
    line.add(P(roll([V(H, y0, H), V(0.02, y0 + rise, 0.02)], (t) => 0.08 - 0.03 * t, { around: 7, every: 0.3 }), k), '#a94f36', [0.4, 1, 0.4]);
  });
  // --- and on its point a gilt ball, and a vane that has the wind in the west ---
  const tip = y0 + rise;
  line.add(ball(0.14, 2).translate(TX, tip + 0.1, TZ), GOLD);
  flat.add(roll([V(TX, tip + 0.2, TZ), V(TX, tip + 0.74, TZ)], 0.018, { around: 5, every: 1 }), IRON);
  flat.add(roll([V(TX - 0.36, tip + 0.6, TZ), V(TX + 0.3, tip + 0.6, TZ)], 0.016, { around: 5, every: 1 }), IRON);
  line.add(turned([[0, 0], [0.07, 0], [0, 0.17]], 4).rotateZ(-Math.PI / 2).translate(TX + 0.3, tip + 0.6, TZ), IRON);
  line.add(block(0.22, 0.17, 0.02, 0.008, 0.2).translate(TX - 0.3, tip + 0.6, TZ), IRON);
  line.add(ball(0.04, 1).translate(TX, tip + 0.76, TZ), GOLD);
}
