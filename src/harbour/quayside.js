// The quay itself and the life on it: flagstones laid row by row, the café's tables under their
// parasols, lemon trees in tubs, nets and crates of fish by the pier, a bicycle against a lamp post, pigeons, and
// a line of washing between two houses.
import * as THREE from 'three';
import { ball, block, knead, put, ring, roll, turned } from '../shape.js';
import { GREENS, pot } from './houses.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2, UP = V(0, 1, 0);
const WHITE = '#f8f4ea', IRON = '#3a3f4a';

export function buildQuayside(kit) {
  const { line, both, flat, rand, pick, next, colliders, QUAY, FRONT, own, moving, time } = kit, y = QUAY.y;

  // --- flagstones: rows along the quay, no two the same length, each its own shade of stone ---
  {
    const TONES = ['#eadcc0', '#e3d2b2', '#efe4cc', '#dccdb4', '#e8d6c2', '#dad2c6', '#f0e0c4'];
    let row = 0;
    for (let z = QUAY.z0 + 0.36; z < QUAY.z1 - 0.66; z += 0.62, row++) {
      for (let x = QUAY.x0 + 0.45 + (row % 2) * 0.4; x < QUAY.x1 - 0.9;) {
        const w = 0.7 + 0.75 * rand(), cx = x + w / 2;
        x += w;
        if (z < FRONT + 0.2 && cx > -15.2 && cx < 14.85) continue; // under the houses
        line.add(put(knead(block(w - 0.035, 0.05, 0.585, 0.02, 0.5), 0.004, 3, next()), cx, y - 0.032 + 0.01 * rand(), z, (rand() - 0.5) * 0.02), pick(TONES), [0.45 + 0.4 * rand(), 1, 0.9], [-0.8, 1, 0.4]);
      }
    }
    // (four puddles lay here once; they read as blue shapes, not water, and were taken out. The dice they threw
    // are still thrown, so that everything drawn after them stays exactly where it was.)
    for (let i = 0; i < 4; i++) { next(); rand(); }
  }

  // --- the café: tables, chairs and parasols outside the orange house; lemon trees in tubs ---
  {
    const chair = (x, z, yaw, c) => {
      const P = (g) => g.rotateY(yaw).translate(x, y, z);
      line.add(P(block(0.4, 0.05, 0.4, 0.02, 0.2).translate(0, 0.46, 0)), c, [0.2, 0.3, 1]);
      line.add(P(block(0.4, 0.3, 0.04, 0.02, 0.2).translate(0, 0.84, -0.19)), c, [0.1, 1, 0.1]);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) flat.add(P(roll([V(a * 0.17, 0, b * 0.17), V(a * 0.17, b < 0 ? 0.98 : 0.46, b * 0.17)], 0.014, { around: 4, every: 1 })), IRON);
    };
    const table = (x, z, c1, c2, chairs) => {
      line.add(put(turned([[0, 0], [0.24, 0], [0.24, 0.03], [0.04, 0.06], [0.035, 0.7], [0.42, 0.72], [0.44, 0.75], [0.42, 0.78], [0, 0.78]], 16), x, y, z), WHITE, [0.2, 1, 0.4]);
      line.add(put(turned([[0, 0], [0.07, 0], [0.07, 0.01], [0, 0.01]], 10), x + 0.14, y + 0.78, z + 0.06), WHITE);
      line.add(put(turned([[0, 0], [0.03, 0], [0.045, 0.06], [0, 0.06]], 8), x + 0.14, y + 0.79, z + 0.06), '#f2c98a');
      line.add(put(turned([[0, 0], [0.04, 0], [0.04, 0.14], [0.015, 0.2], [0.015, 0.27], [0, 0.27]], 8), x - 0.12, y + 0.78, z - 0.08), '#5d9a52');
      // the parasol: eight panels, two colours by turns
      line.add(roll([V(x, y + 0.78, z), V(x, y + 2.62, z)], 0.028, { around: 6, every: 0.8 }), '#d8c9a8');
      const g = new THREE.ConeGeometry(1.35, 0.55, 16, 1, true).toNonIndexed(), p = g.attributes.position, col = [], a1 = new THREE.Color(c1), a2 = new THREE.Color(c2);
      for (let i = 0; i < p.count; i += 3) {
        const mx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, mz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, c = Math.floor(((Math.atan2(mz, mx) + Math.PI) / TAU) * 8 + 1e-3) % 2 ? a1 : a2;
        col.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      both.add(g.translate(x, y + 2.42, z));
      line.add(put(ball(0.05, 1), x, y + 2.72, z), '#d8c9a8');
      for (const a of chairs) chair(x + Math.sin(a) * 0.74, z + Math.cos(a) * 0.74, a + Math.PI, c1);
      colliders.push({ x, z, r: 0.5, h: 0.9 });
    };
    table(8.2, -3.5, '#4f9bd8', WHITE, [0.5, 3.4]);
    table(10.7, -3.1, '#4f9bd8', WHITE, [2.0, 5.2]);
    // a lemon tree in a tub, either side
    for (const tx of [7.0, 11.6]) {
      const tz = FRONT + 0.75;
      line.add(put(knead(turned([[0, 0], [0.3, 0], [0.38, 0.5], [0.41, 0.5], [0.41, 0.58], [0, 0.58]], 14), 0.008, 4, next()), tx, y, tz), '#c9714a', [0.2, 1, 0.1], [1, 0.3, 0.2]);
      line.add(roll([V(tx, y + 0.5, tz), V(tx + 0.03, y + 1.5, tz)], 0.045, { around: 6, every: 0.4 }), '#8a5f3c');
      for (let k = 0; k < 10; k++) { const a = rand() * TAU, u = rand() * 2 - 1, s = Math.sqrt(1 - u * u) * 0.36; line.add(put(knead(ball(0.26 + 0.1 * rand(), 2), 0.03, 5, next()), tx + Math.cos(a) * s, y + 1.9 + u * 0.3, tz + Math.sin(a) * s), pick(GREENS)); }
      for (let k = 0; k < 7; k++) { const a = rand() * TAU, u = rand() * 2 - 1, s = Math.sqrt(1 - u * u) * 0.62; line.add(put(ball(0.07, 1).scale(1, 1.2, 1), tx + Math.cos(a) * s, y + 1.9 + u * 0.5, tz + Math.sin(a) * s), '#f6d23a'); }
      colliders.push({ x: tx, z: tz, r: 0.45, h: 2 });
    }
  }

  // --- by the root of the pier: a heap of net with its floats, and the morning's catch in crates ---
  {
    const nx = 13.7, nz = 0.3;
    line.add(put(knead(ball(1, 3).scale(0.85, 0.3, 0.7), 0.12, 2.5, next(), 6, 0.4), nx, y + 0.2, nz), '#4f9a8a', [1, 0.4, 1], [-1, 0.4, 1]);
    for (let k = 0; k < 7; k++) { const a = rand() * TAU, r = 0.25 + 0.5 * rand(); line.add(put(ball(0.075, 1), nx + Math.cos(a) * r * 0.85, y + 0.36 + 0.1 * rand(), nz + Math.sin(a) * r * 0.7), k % 2 ? '#f08a3c' : WHITE); }
    colliders.push({ x: nx, z: nz, r: 0.75, h: 0.5 });
    for (const [cx, cz, yaw] of [[12.9, -1.2, 0.3], [13.9, -1.0, -0.2]]) {
      line.add(put(knead(block(0.8, 0.26, 0.56, 0.04, 0.2), 0.008, 4, next()), cx, y + 0.13, cz, yaw), '#b98a52', [0.1, 1, 0.1], [1, 0.1, 0.3]);
      for (let k = 0; k < 5; k++) line.add(put(ball(1, 2).scale(0.07, 0.05, 0.21), cx + (k - 2) * 0.14, y + 0.29 + 0.02 * (k % 2), cz + (k % 2) * 0.05, yaw + 1.57 + (rand() - 0.5) * 0.5), pick(['#8fa6c0', '#a3b7ce', '#7e97b4', '#b9c8d8']), [0.2, 0.3, 1]);
      colliders.push({ x: cx, z: cz, r: 0.45, h: 0.4 });
    }
  }

  // --- a bicycle against a lamp post, a loaf and flowers in its basket ---
  {
    const bx = 0.86, bz = QUAY.z1 - 1.1, RED = '#e2443c', P = (g) => g.rotateX(0.13).translate(bx, y, bz), tube = (a, b, r = 0.02, c = RED) => line.add(P(roll([V(...a), V(...b)], r, { around: 5, every: 1 })), c);
    for (const wx of [-0.52, 0.52]) {
      line.add(P(roll(ring(V(wx, 0.33, 0), V(0, 0, 1), 0.33, 20), 0.022, { closed: true, around: 5, every: 0.08 })), IRON);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; flat.add(P(roll([V(wx, 0.33, 0), V(wx + Math.cos(a) * 0.32, 0.33 + Math.sin(a) * 0.32, 0)], 0.006, { around: 3, every: 1 })), '#8a8f98'); }
    }
    tube([0, 0.3, 0], [-0.13, 0.86, 0]); tube([-0.11, 0.8, 0], [0.38, 0.84, 0]); tube([0, 0.3, 0], [0.4, 0.78, 0]); tube([0.37, 0.98, 0], [0.52, 0.33, 0]);
    tube([0, 0.3, 0], [-0.52, 0.33, 0], 0.015); tube([-0.11, 0.78, 0], [-0.52, 0.33, 0], 0.015);
    tube([0.37, 1.0, -0.24], [0.37, 1.0, 0.24], 0.016, IRON);
    line.add(P(ball(1, 2).scale(0.13, 0.035, 0.07).translate(-0.15, 0.9, 0)), '#6b4a2e');
    line.add(P(knead(block(0.3, 0.2, 0.3, 0.04, 0.1), 0.006, 6, next()).translate(0.62, 0.86, 0)), '#c9a468', [1, 1, 0.3], [-1, 1, 0.3]);
    line.add(P(ball(1, 2).scale(0.05, 0.05, 0.22).rotateX(0.5).translate(0.58, 1.02, 0)), '#e3b06a');
    for (let k = 0; k < 4; k++) line.add(P(ball(0.05, 1).translate(0.68 + 0.04 * (k % 2), 1.02 + 0.03 * k, -0.06 + 0.04 * k)), k % 2 ? '#f08ab0' : '#5fa04a');
    colliders.push({ x: bx, z: bz + 0.05, r: 0.5, h: 1 });
  }

  // --- pigeons, after crumbs ---
  for (const [px, pz, yaw] of [[1.1, -0.5, 0.4], [1.6, -0.1, 2.2], [0.6, 0.1, -1.0], [-4.3, 0.7, 1.2], [-4.8, 1.0, 3.0], [6.9, -1.4, 0.2]]) {
    const P = (g) => g.rotateY(yaw).translate(px, y, pz), down = rand() < 0.5;
    line.add(P(ball(1, 3).scale(0.085, 0.085, 0.145).translate(0, 0.105, 0)), pick(['#8f9bb0', '#a3acbd', '#7d8aa2']), [0.3, 1, 0.3]);
    line.add(P(ball(0.05, 2).translate(0, down ? 0.1 : 0.21, down ? 0.16 : 0.1)), '#6f7c96');
    line.add(P(turned([[0, 0], [0.014, 0], [0, 0.045]], 4).rotateX(down ? 2.2 : 1.57).translate(0, down ? 0.07 : 0.2, down ? 0.2 : 0.15)), '#e8a23a');
    line.add(P(ball(1, 2).scale(0.05, 0.018, 0.1).translate(0, 0.1, -0.18)), '#5f6b84');
  }

  // --- a line of washing, from the yellow house to the white one ---
  {
    const A = V(-8.4, y + 4.0, FRONT + 0.3), B = V(-4.5, y + 3.9, FRONT + 0.3), at = (t) => A.clone().lerp(B, t).add(V(0, -0.34 * 4 * t * (1 - t), 0));
    flat.add(roll(Array.from({ length: 11 }, (_, i) => at(i / 10)), 0.01, { around: 4, every: 0.5 }), '#6a655c');
    for (const p of [A, B]) line.add(ball(0.04, 1).translate(p.x, p.y, FRONT + 0.06), IRON);
    const CUTS = [
      [[[-0.35, 0], [-0.62, -0.12], [-0.54, -0.32], [-0.3, -0.22], [-0.3, -0.78], [0.3, -0.78], [0.3, -0.22], [0.54, -0.32], [0.62, -0.12], [0.35, 0], [0.12, -0.07], [-0.12, -0.07]], '#e8554e'],
      [[[-0.42, 0], [0.42, 0], [0.42, -0.62], [-0.42, -0.62]], WHITE],
      [[[-0.28, 0], [0.28, 0], [0.33, -0.9], [0.06, -0.9], [0, -0.32], [-0.06, -0.9], [-0.33, -0.9]], '#4a6fb0'],
      [[[-0.16, 0], [0.16, 0], [0.42, -0.8], [-0.42, -0.8]], '#f2c12b'],
      [[[-0.35, 0], [-0.62, -0.12], [-0.54, -0.32], [-0.3, -0.22], [-0.3, -0.78], [0.3, -0.78], [0.3, -0.22], [0.54, -0.32], [0.62, -0.12], [0.35, 0], [0.12, -0.07], [-0.12, -0.07]], '#8fcf9c'],
      [[[-0.1, 0], [0.1, 0], [0.1, -0.4], [0.28, -0.5], [0.28, -0.63], [-0.02, -0.63], [-0.1, -0.5]], '#f08ab0'],
    ];
    CUTS.forEach(([pts, colour], i) => {
      const s = new THREE.Shape(), p = at((i + 0.7) / (CUTS.length + 0.4));
      pts.forEach(([px, py], k) => (k ? s.lineTo(px, py) : s.moveTo(px, py)));
      // each piece hangs from the line and swings out from the wall and back, the breeze passing along them
      const tilt = (rand() - 0.5) * 0.3, piece = own((b) => b.both.add(new THREE.ShapeGeometry(s).scale(0.62, 0.62, 0.62), colour, [0.15, 1, 0], [1, 0.3, 0]));
      piece.position.set(p.x, p.y - 0.01, p.z);
      moving.push(() => { piece.rotation.x = tilt * 0.5 - 0.08 + 0.12 * Math.sin(time.value * 1.5 - i * 0.35) + 0.04 * Math.sin(time.value * 3.7 + i); });
    });
  }
  void UP;
}
