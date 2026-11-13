// The hills behind the town, and what is on them. The hills themselves are five soft green rises. Everything on
// them is put there by hand: to the right of the town a farm with its orchard and haystacks, a path up from the
// quay to a white chapel, a vineyard in rows, lavender, a field of wheat, sheep, olives, umbrella pines on the
// skyline, rocks where the hill meets the sea; to the left a windmill with its sails going round, a barn, more
// sheep, a wood. Cypresses stand about all of it.
import * as THREE from 'three';
import { noise, rng } from '../noise.js';
import { ball, block, knead, put, roll, turned } from '../shape.js';
import { field, fieldBy, hue } from '../pencil.js';
import { GREENS, TILES, arched, pot, roof } from './houses.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const SUN = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();
const WHITE = '#f8f4ea', STONES = ['#d9cdb4', '#cfc1a6', '#e3d8c2', '#c6b89e'], DARK = ['#2f6b4a', '#3a7a52', '#2a5f47', '#34704c'], OLIVE = ['#a9bc94', '#97ad84', '#b8c8a2'];
// [x, z, how far it spreads in x (0.8 of that in z), how high for its width, its green]
const HILLS = [[-14, -26, 17, 0.62, '#9ac46a'], [10, -30, 21, 0.68, '#8bbb62'], [30, -22, 14, 0.5, '#a4cb74'], [-34, -20, 15, 0.45, '#a4cb74'], [-2, -52, 34, 0.6, '#8fb79a']];
const n3 = (x, y, z, s) => 0.6 * noise(x + s, y + z * 0.71) + 0.6 * noise(z - s * 1.3, x * 0.83 - y * 0.57 + 5);

/** kit: { line, both, flat, rand, pick, next, own, moving, time, colliders }. */
export function buildHills(kit) {
  const { line, both, flat, rand, pick, next, own, moving, time } = kit;
  // (the dice of this file are its own, so that what was already on the page stays where it was)
  const R = rng(4711), any = (list) => list[Math.floor(R() * list.length)], mine = { ...kit, rand: R, pick: any };
  // (and a second set, for what was added later: so that what the first set drew stays as it was)
  const S = rng(9001);

  const seeds = HILLS.map(() => next());
  HILLS.forEach(([x, z, r, tall, c], i) => line.add(put(knead(ball(r, 5).scale(1, tall, 0.8), r * 0.025, 1.6 / r, seeds[i]), x, 0, z), c, [0.5, 1, 0.4], [-0.7, 1, 0.2]));
  /** The top of the grass at (x, z): the hills as they were kneaded. */
  const surface = (x, z) => {
    let best = 0;
    HILLS.forEach(([cx, cz, r, tall], i) => {
      const lx = x - cx, lz = z - cz, q = 1 - (lx / r) ** 2 - (lz / (0.8 * r)) ** 2;
      if (q <= 0) return;
      const ly = tall * r * Math.sqrt(q), ny = ly / (tall * r) ** 2, len = Math.hypot(lx / (r * r), ny, lz / (0.8 * r) ** 2), g = 1.6 / r;
      best = Math.max(best, ly + (r * 0.025 * n3(lx * g, ly * g, lz * g, seeds[i]) * ny) / len);
    });
    return best;
  };
  const taken = []; // [x, z, how far out]: where something stands, so that nothing else is put through it
  const free = (x, z, r = 0.6) => taken.every(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) > tr + r);
  const claim = (x, z, r) => taken.push([x, z, r]);

  // ------------------------------------------------------------------------------------------------- growing things
  /** A mass of leaves, drawn in arcs that turn their backs to the sun. */
  const crown = (c, r, colour, squash = 0.82, stretch = 1) => {
    const g = knead(ball(r, 2).scale(1, squash, 1), r * 0.08, 2.2 / r, next()).translate(c.x, c.y, c.z), from = c.clone().addScaledVector(SUN, r * 2.6);
    line.add(fieldBy(g, (px, py, pz) => [Math.hypot((px - from.x) * stretch, py - from.y, (pz - from.z) * stretch) * 1.1, px * 0.6 - py * 0.5 + pz * 0.62]), colour);
  };
  /** A cypress: a dark flame built of overlapping tufts, lighter where the sun is on it, on a foot of trunk. */
  function cypress(x, z, h) {
    const y = surface(x, z) - 0.15, w = 0.44 + 0.1 * R(), up = (t) => y + 0.55 + h * (0.1 + 0.76 * t), wide = (t) => w * (1 - 0.74 * t ** 1.3) + 0.06;
    line.add(roll([V(x, y, z), V(x, y + 0.8, z)], 0.09, { around: 6, every: 0.4 }), '#7a5a3c', [0.9, 0.1, 0.4]);
    for (let i = 0; i < 6; i++) {
      const t = i / 5, rr = wide(t), c = V(x + (R() - 0.5) * 0.12, up(t), z + (R() - 0.5) * 0.12);
      const g = knead(ball(1, 2).scale(rr, h * 0.17, rr), 0.04, 3, next()).translate(c.x, c.y, c.z), from = c.clone().addScaledVector(SUN, 1.6);
      line.add(fieldBy(g, (px, py, pz) => [Math.hypot((px - from.x) * 2.2, (py - from.y) * 0.5, (pz - from.z) * 2.2), px * 0.6 - py * 0.5 + pz * 0.62]), any(DARK));
    }
    for (let i = 0; i < 4; i++) { const t = 0.12 + 0.2 * i + 0.06 * R(), rr = wide(t); crown(V(x - rr * 0.62, up(t), z + rr * 0.45), rr * 0.6, any(['#5c9a66', '#4f8f5c', '#69a56c']), 1.5); }
    line.add(put(turned([[0, 0], [0.1, 0], [0, 0.55]], 5), x, up(1) + h * 0.13, z), DARK[0], [0.9, 0.2, 0.3]);
    claim(x, z, 0.6);
  }
  /** A round tree: a trunk and a head of leaves in masses. fruit: a colour, for an orchard. */
  function tree(x, z, s = 1, colours = GREENS, fruit = null) {
    if (surface(x, z) < 0.6 || !free(x, z, 0.5 * s)) return;
    const y = surface(x, z) - 0.15, lean = (R() - 0.5) * 0.5 * s, top = V(x + lean, y + 1.9 * s, z);
    line.add(knead(roll([V(x, y, z), V(x + lean * 0.3, y + 1.0 * s, z), top], (t) => (0.2 - 0.08 * t) * s, { around: 8, every: 0.25 }), 0.015, 4, next()), '#8a5f3c', [0.9, 0.1, 0.4], [0.1, 1, 0.1]);
    for (let i = 0; i < 8; i++) {
      const a = R() * TAU, lift = R() * 1.6 - 0.5, sp = Math.sqrt(Math.max(0.1, 1 - (lift / 1.5) ** 2)) * (i < 2 ? 0.3 : 1), r = (0.55 + 0.35 * R()) * s;
      crown(V(top.x + Math.cos(a) * s * sp, top.y + 0.5 * s + lift * 0.6 * s, top.z + Math.sin(a) * s * sp), r, any(colours));
    }
    if (fruit) for (let i = 0; i < 9; i++) { const a = R() * TAU, lift = R() * 1.4 - 0.4, sp = Math.sqrt(Math.max(0.1, 1 - (lift / 1.5) ** 2)) * 1.5 * s; line.add(ball(0.1 * s + 0.03, 1).translate(top.x + Math.cos(a) * sp, top.y + 0.5 * s + lift * 0.7 * s, top.z + Math.sin(a) * sp), fruit); }
    claim(x, z, 0.5 * s);
  }
  /** An olive: a twisted grey trunk and a low silvery head. */
  function olive(x, z, s = 1) {
    if (surface(x, z) < 0.6 || !free(x, z, 0.6 * s)) return;
    const y = surface(x, z) - 0.15, top = V(x + (R() - 0.5) * 0.5, y + 1.25 * s, z + (R() - 0.5) * 0.3);
    line.add(knead(roll([V(x, y, z), V(x + 0.18 * s, y + 0.45 * s, z - 0.1 * s), V(x - 0.1 * s, y + 0.85 * s, z + 0.08 * s), top], (t) => (0.22 - 0.1 * t) * s, { around: 8, every: 0.16 }), 0.03, 5, next()), '#9a8a72', [0.9, 0.3, 0.4], [0.1, 1, 0.3]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + R(), out = i ? 0.85 * s : 0, r = (0.55 + 0.25 * R()) * s; crown(V(top.x + Math.cos(a) * out, top.y + 0.3 * s + (R() - 0.4) * 0.4 * s, top.z + Math.sin(a) * out), r, any(OLIVE), 0.65); }
    claim(x, z, 0.6 * s);
  }
  /** An umbrella pine: a tall leaning trunk and a flat dark head. */
  function pine(x, z, s = 1) {
    const y = surface(x, z) - 0.15, h = (4.6 + 1.2 * R()) * s, lean = (R() - 0.5) * 1.8 * s, top = V(x + lean, y + h, z + (R() - 0.5) * 0.6);
    line.add(knead(roll([V(x, y, z), V(x + lean * 0.3, y + h * 0.55, z), top], (t) => (0.26 - 0.1 * t) * s, { around: 9, every: 0.35 }), 0.02, 3, next()), '#9a6a48', [0.9, 0.1, 0.4], [0.1, 1, 0.1]);
    for (const [bx, bz] of [[0.9, 0.2], [-0.8, -0.3]]) line.add(roll([top.clone().add(V(0, -0.9 * s, 0)), top.clone().add(V(bx * 0.6 * s, -0.3 * s, bz * 0.6 * s)), top.clone().add(V(bx * 1.3 * s, 0.1 * s, bz * 1.3 * s))], (t) => (0.12 - 0.06 * t) * s, { around: 6, every: 0.3 }), '#9a6a48');
    for (let i = 0; i < 8; i++) { const a = (i / 7) * TAU, out = i ? 1.5 * s : 0, r = (0.95 + 0.5 * R()) * s; crown(V(top.x + Math.cos(a) * out, top.y + 0.3 * s + 0.35 * R() * s, top.z + Math.sin(a) * out), r, any(DARK.concat('#4f8f5a')), 0.42); }
    claim(x, z, 0.5);
  }
  /** Wild flowers, in a drift of one colour with a few of another. */
  function drift(x, z, colour, n = 26, spread = 0.9, show = true) {
    for (let i = 0; i < n; i++) {
      const fx = x + (R() - 0.5) * 2 * spread, fz = z + (R() - 0.5) * 2 * spread;
      if (surface(fx, fz) < 0.5 || !free(fx, fz, 0.1)) continue;
      // (a drift that is not shown still throws its dice, so that what comes after it stays where it was)
      const flower = ball(0.055 + 0.035 * R(), 1).translate(fx, surface(fx, fz) + 0.13 + 0.06 * R(), fz);
      if (show) line.add(flower, i % 5 === 4 ? WHITE : colour);
      if (i % 4 === 0) { const leaf = knead(ball(0.16, 1).scale(1, 0.6, 1), 0.03, 6, next()).translate(fx + 0.12, surface(fx, fz) + 0.06, fz - 0.05), green = any(GREENS); if (show) line.add(leaf, green); }
    }
  }
  /** Wild flowers on a steep face: a drift lying along the slope, thick in its middle and thinning to its ends, of
   *  one colour with a few of another among it. (Scattered singly down a slope they are only dots.) */
  function band(x, z, colour, other, n = 110, len = 3.6, wid = 0.5) {
    const gx = surface(x + 0.3, z) - surface(x - 0.3, z), gz = surface(x, z + 0.3) - surface(x, z - 0.3), gl = Math.hypot(gx, gz) || 1, ux = -gz / gl, uz = gx / gl, vx = gx / gl, vz = gz / gl;
    for (let i = 0; i < n; i++) {
      const u = ((S() + S() + S() - 1.5) / 1.5) * (len / 2), v = (S() - 0.5) * wid * (1.15 - Math.abs(u) / (len / 2)) + 0.22 * Math.sin(u * 1.3 + x);
      const fx = x + ux * u + vx * v, fz = z + uz * u + vz * v, fy = surface(fx, fz);
      if (fy < 0.5) continue;
      line.add(ball(0.06 + 0.04 * S(), 1).translate(fx, fy + 0.1 + 0.06 * S(), fz), i % 6 === 5 ? other : i % 9 === 4 ? WHITE : colour);
      if (i % 3 === 0) line.add(knead(ball(0.15, 1).scale(1, 0.55, 1), 0.03, 6, next()).translate(fx + 0.1, fy + 0.05, fz - 0.04), GREENS[Math.floor(S() * GREENS.length)]);
    }
  }

  // ---------------------------------------------------------------------------------------------- what is laid on them
  /** A strip lying on the ground along a line: a path. */
  function path(pts, width = 0.85, colour = '#ecdcb4', fade = true) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z))).getPoints(pts.length * 9), pos = [], index = [], t = V(0, 0, 0);
    curve.forEach((p, i) => {
      const a = curve[Math.max(0, i - 1)], b = curve[Math.min(curve.length - 1, i + 1)];
      t.set(b.x - a.x, 0, b.z - a.z).normalize();
      // it thins out to nothing where it ends
      const along = i / (curve.length - 1), thin = fade ? Math.min(1, (1 - along) * 7) ** 0.6 : 1;
      for (const s of [-0.5, 0, 0.5]) { const wide = width * thin * (0.95 + 0.08 * Math.sin(i * 0.7)), x = p.x - t.z * s * wide, z = p.z + t.x * s * wide; pos.push(x, surface(x, z) + 0.17, z); }
      if (i > 0) { const k = i * 3, d = k - 3; index.push(d, d + 1, k, d + 1, k + 1, k, d + 1, d + 2, k + 1, d + 2, k + 2, k + 1); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    both.add(g, colour, [0.3, 1, 0.9], [-0.8, 1, 0.3]);
  }
  /** A field: a piece of ground of another colour, from (x0, z0) to (x1, z1). */
  function plot(x0, x1, z0, z1, colour, a = [0.2, 1, 1], b = [1, 1, 0.1], lift = 0.06) {
    const N = 12, M = 8, pos = [], index = [];
    for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
      // (its edges are not ruled: they wander a little)
      const x = x0 + (x1 - x0) * (i / N) + 0.25 * Math.sin(j * 1.3 + x0), z = z0 + (z1 - z0) * (j / M) + 0.2 * Math.sin(i * 1.1 + z0);
      pos.push(x, surface(x, z) + lift, z);
      if (i < N && j < M) { const k = i + j * (N + 1); index.push(k, k + N + 1, k + 1, k + 1, k + N + 1, k + N + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    both.add(g, colour, a, b);
  }
  /** Rows of something low, planted across the slope: each row a line from x0 to x1 at one z. */
  function rows(x0, x1, zs, colours, { r = 0.2, lift = 0.26, posts = false, dots = null } = {}) {
    zs.forEach((z, k) => {
      const pts = [];
      for (let x = x0 + 0.3 * (k % 2); x <= x1; x += 0.9) pts.push(V(x, surface(x, z + 0.12 * Math.sin(x)) + lift, z + 0.12 * Math.sin(x)));
      line.add(knead(roll(pts, r, { around: 7, every: 0.3, flat: 0.9 }), r * 0.25, 2.4, next()), colours[k % colours.length], [0.2, 1, 0.9], [1, 0.6, 0.1]);
      if (posts) for (const p of [pts[0], pts[pts.length - 1]]) flat.add(roll([V(p.x, p.y - lift, p.z), V(p.x, p.y + 0.3, p.z)], 0.03, { around: 4, every: 1 }), '#8a6a48');
      if (dots) for (const p of pts) if (R() < 0.55) line.add(ball(0.07, 1).translate(p.x + (R() - 0.5) * 0.5, p.y + 0.02, p.z + r * 0.9), dots);
    });
  }
  /** A dry-stone wall along a line. */
  function wall(pts) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z))), n = Math.round(curve.getLength() / 0.46);
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n), t = curve.getTangentAt(i / n);
      if (surface(p.x, p.z) < 0.3) continue;
      line.add(put(knead(block(0.42 + 0.14 * R(), 0.3 + 0.1 * R(), 0.3, 0.07, 0.2), 0.02, 4, next()), p.x, surface(p.x, p.z) + 0.13, p.z, Math.atan2(-t.z, t.x) + (R() - 0.5) * 0.2), any(STONES), [0.2, 1, 0.3]);
    }
  }
  /** Rocks where a hill goes down into the sea. */
  function shore(h, u0, u1) {
    const [cx, cz, r] = HILLS[h];
    for (let u = u0; u <= u1; u += 0.07 + 0.05 * R()) {
      const s = 0.35 + 0.5 * R(), x = cx + u * r, z = cz + 0.8 * r * Math.sqrt(1 - u * u) + 0.2 + 0.5 * R();
      line.add(put(knead(ball(s, 2).scale(1, 0.7, 0.85), s * 0.16, 1.3 / s, next(), 3, s * 0.6), x, s * 0.2, z, R() * 6), any(['#bdb4a2', '#a9a091', '#cdc3ae']), [0.2, 1, 0.12], [1, 0.3, 0.4]);
    }
  }

  // ------------------------------------------------------------------------------------------------ what is built
  /** A farmhouse: lime-washed walls, a tiled roof, a chimney, shuttered windows, a door with a pot by it. */
  function farm(x, z, w, h, colour, shut = '#5d8f58', terrace = 0) {
    const y = surface(x, z) - 0.9, D = 2.6, front = z + D / 2;
    line.add(knead(block(w, h, D, 0.06, 0.4), 0.014, 1, next()).translate(x, y + h / 2, z), colour);
    // the hill falls away under it: it stands on a footing of stone
    line.add(knead(block(w + 0.08, 2.4, D + 0.08, 0.05, 0.4), 0.012, 2, next()).translate(x, y - 1.12, z), '#d8c9a8', [0.3, 1, 0.2], [-0.8, 0.5, 0.3]);
    if (terrace) {
      // ...and where it is steep, a terrace before the door, held up by a wall with a cellar door in it, and
      // steps down from the end of it where the ground comes nearest (terrace: -1 the left end, 1 the right)
      const TD = 0.7, top = y + 0.82, zf = front + TD, x0 = x - w / 2 - 0.25, x1 = x + w / 2 + 0.25, low = Math.min(surface(x0, zf), surface(x, zf), surface(x1, zf)), tall = top - low + 0.6;
      line.add(knead(block(x1 - x0, tall, TD, 0.05, 0.4), 0.012, 2, next()).translate(x, top - tall / 2, front + TD / 2 - 0.02), '#d8c9a8', [0.3, 1, 0.2], [-0.8, 0.5, 0.3]);
      line.add(block(x1 - x0 + 0.12, 0.09, TD + 0.1, 0.03, 0.3).translate(x, top + 0.01, front + TD / 2), '#e9dfc8', [0.1, 1, 0.9]);
      const cx = x + w * 0.3, cy = surface(cx, zf) + 0.3, cellar = cy + 1.05 < top - 0.15;
      if (cellar) { line.add(arched(0.62, 1.0).translate(cx, cy, zf - 0.02), '#e9dfc8'); line.add(arched(0.46, 0.9).translate(cx, cy + 0.02, zf + 0.01), '#6b4a2e', [0.05, 1, 0.05]); }
      for (let n = 0; n < 30; n++) {
        const sx = x0 + 0.25 + S() * (x1 - x0 - 0.5), sy = top - 0.25 - S() * (top - low - 0.2), sw = 0.3 + 0.24 * S(), tone = STONES[Math.floor(S() * STONES.length)];
        if (sy < surface(sx, zf) + 0.2 || (cellar && Math.abs(sx - cx) < 0.6 && sy < cy + 1.2)) continue;
        line.add(block(sw, 0.19, 0.06, 0.02, 0.2).translate(sx, sy, zf - 0.005), tone, [0.2, 1, 0.1]);
      }
      // something green trailing over the wall at its tall end, in flower
      const tx = terrace < 0 ? x1 - 0.55 : x0 + 0.55;
      for (let n = 0; n < 10; n++) {
        const dx = (S() - 0.5) * 1.0, drop = S() * S() * 1.1;
        crown(V(tx + dx, top + 0.08 - drop, zf + 0.06), 0.2 + 0.13 * S(), GREENS[Math.floor(S() * GREENS.length)], 0.8);
        if (n % 2 === 0) line.add(ball(0.07, 1).translate(tx + dx + 0.08, top + 0.1 - drop, zf + 0.24), '#f08ab0');
      }
      const xe = terrace < 0 ? x0 : x1;
      for (let k = 1; k < 12; k++) {
        const sx = xe + terrace * (k - 0.5) * 0.34, sy = top - k * 0.2;
        if (sy < surface(sx, front + TD / 2) + 0.04) break;
        line.add(knead(block(0.36, 1.4, TD - 0.06, 0.03, 0.2), 0.006, 4, next()).translate(sx, sy - 0.7, front + TD / 2 - 0.02), k % 2 ? '#e3d8c2' : '#d8c9a8', [0.3, 1, 0.9]);
      }
      pot({ ...kit, rand: S, pick: (list) => list[Math.floor(S() * list.length)] }, x + 0.78, top + 0.05, front + 0.4, 0.7);
    }
    roof(mine, { x, y: y + h, z, w, d: D, rh: 1.05, gable: false, tiles: TILES, wall: colour });
    line.add(put(knead(block(0.4, 0.9, 0.4, 0.05, 0.2), 0.008, 3, next()), x + w * 0.28, y + h + 0.95, z - 0.3), '#c9825a');
    line.add(block(0.5, 0.09, 0.5, 0.03, 0.2).translate(x + w * 0.28, y + h + 1.42, z - 0.3), '#e9dfc8');
    for (const s of [-1, 1]) {
      const wx = x + s * w * 0.27, wy = y + h * 0.66;
      line.add(block(0.5, 0.7, 0.08, 0.02, 0.3).translate(wx, wy, front + 0.01), WHITE);
      line.add(block(0.38, 0.58, 0.08, 0.015, 0.3).translate(wx, wy, front + 0.03), '#5f7fa6', [0.5, 1, 0], [-0.5, 1, 0]);
      for (const e of [-1, 1]) line.add(block(0.2, 0.7, 0.05, 0.012, 0.2).translate(wx + e * 0.36, wy, front + 0.02), shut, [0, 1, 0]);
      line.add(block(0.62, 0.06, 0.14, 0.02, 0.3).translate(wx, wy - 0.39, front + 0.05), '#e9dfc8');
    }
    line.add(arched(0.6, 1.15).translate(x, y + 0.84, front + 0.01), WHITE);
    line.add(arched(0.46, 1.05).translate(x, y + 0.86, front + 0.04), '#8a5a34', [0.05, 1, 0.05]);
    line.add(block(0.8, 0.2, 0.36, 0.04, 0.3).translate(x, y + 0.8, front + 0.2), '#d8c9a8');
    claim(x, z + 0.3, Math.max(w, D) * 0.62 + 0.3);
  }
  /** The chapel: white, a gable to the front with a bell in a little arch on it and a cross on that. */
  function chapel(x, z) {
    const W = 2.4, H = 2.5, D = 3.4, y = surface(x, z) - 0.7, front = z + D / 2, face = front + 0.24, mid = face - 0.15, wallC = '#fbf6ec', TRIM = '#e9dfc8';
    line.add(knead(block(W, H, D, 0.06, 0.4), 0.012, 1, next()).translate(x, y + H / 2, z), wallC);
    roof(mine, { x, y: y + H, z, w: W, d: D, rh: 1.15, gable: true, tiles: TILES, wall: wallC });
    // Its front is one wall. It goes up past the roof, which ends behind it, steps in, and carries on as the bell's
    // gable: an open arch with the bell hanging in it, a little pediment over that, and the cross.
    const a = W / 2 + 0.16, s = new THREE.Shape(), arch = new THREE.Path();
    s.moveTo(-a, -0.7); s.lineTo(a, -0.7); s.lineTo(a, H + 0.3); s.lineTo(0.5, H + 1.02); s.lineTo(0.5, H + 2.16); s.lineTo(0.64, H + 2.16); s.lineTo(0.64, H + 2.26); s.lineTo(0, H + 2.68);
    s.lineTo(-0.64, H + 2.26); s.lineTo(-0.64, H + 2.16); s.lineTo(-0.5, H + 2.16); s.lineTo(-0.5, H + 1.02); s.lineTo(-a, H + 0.3); s.lineTo(-a, -0.7);
    arch.moveTo(-0.23, H + 1.28); arch.lineTo(0.23, H + 1.28); arch.lineTo(0.23, H + 1.76); arch.absarc(0, H + 1.76, 0.23, 0, Math.PI, false); arch.lineTo(-0.23, H + 1.28);
    s.holes.push(arch);
    line.add(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 10 }).translate(x, y, face - 0.3), wallC);
    for (const sd of [-1, 1]) {
      // a coping of stone down each shoulder, and of tile on the pediment
      line.add(block(Math.hypot(a - 0.5, 0.72) + 0.16, 0.09, 0.4, 0.03, 0.2).rotateZ(-sd * Math.atan2(0.72, a - 0.5)).translate(x + (sd * (a + 0.5)) / 2, y + H + 0.72, mid), TRIM, [1, 0.2, 0]);
      line.add(block(Math.hypot(0.64, 0.42) + 0.14, 0.08, 0.42, 0.03, 0.2).rotateZ(-sd * Math.atan2(0.42, 0.64)).translate(x + sd * 0.33, y + H + 2.52, mid), TILES[1], [1, 0.2, 0]);
    }
    line.add(block(1.36, 0.07, 0.4, 0.02, 0.2).translate(x, y + H + 1.12, mid), TRIM, [1, 0.2, 0]);
    line.add(block(0.52, 0.05, 0.07, 0.015, 0.2).translate(x, y + H + 1.8, mid), '#7a5233');
    const bell = own((b) => {
      b.line.add(turned([[0, 0], [0.15, 0], [0.16, 0.04], [0.105, 0.13], [0.07, 0.27], [0, 0.3]], 12).translate(0, -0.31, 0), '#d9a441', [0.3, 1, 0.2]);
      b.line.add(ball(0.035, 1).translate(0, -0.33, 0.02), '#8a6a2a');
    });
    bell.position.set(x, y + H + 1.77, mid);
    moving.push(() => { bell.rotation.z = 0.24 * Math.sin(time.value * 2.6); });
    line.add(block(0.07, 0.62, 0.07, 0.015, 0.2).translate(x, y + H + 2.98, mid), '#2f3a44');
    line.add(block(0.34, 0.07, 0.07, 0.015, 0.2).translate(x, y + H + 3.08, mid), '#2f3a44');
    // the door, its step, and a round window over it
    line.add(arched(0.86, 1.6).translate(x, y + 0.72, face + 0.01), TRIM);
    line.add(arched(0.68, 1.48).translate(x, y + 0.74, face + 0.04), '#3f6f9a', [0.05, 1, 0.05]);
    line.add(block(1.3, 0.5, 0.6, 0.04, 0.3).translate(x, y + 0.5, face + 0.3), '#d8c9a8');
    line.add(turned([[0, 0], [0.26, 0], [0.26, 0.05], [0.19, 0.05], [0.18, 0.025], [0, 0.025]], 16).rotateX(Math.PI / 2).translate(x, y + H + 0.3, face), '#5f7fa6');
    claim(x, z + 0.3, 2.6);
  }
  /** A haystack. */
  const haystack = (x, z, s = 1) => { if (!free(x, z, 0.7 * s)) return; line.add(put(knead(turned([[0, 0], [0.75, 0], [0.82, 0.5], [0.62, 1.1], [0.26, 1.5], [0, 1.6]], 12), 0.03, 3, next()), x, surface(x, z) - 0.1, z, 0, s), any(['#e8c860', '#e2bd52', '#eed074']), [0.9, 0.25, 0.3], [0.1, 1, 0.1]); claim(x, z, 0.7 * s); };
  /** A sheep: grazing, or looking up. */
  function sheep(x, z, yaw) {
    if (surface(x, z) < 0.4 || !free(x, z, 0.4)) return;
    const y = surface(x, z) - 0.07, down = R() < 0.6, P = (g) => g.rotateY(yaw).translate(x, y, z);
    line.add(P(knead(ball(1, 2).scale(0.27, 0.24, 0.4), 0.035, 5, next()).translate(0, 0.44, 0)), '#f6f1e6', [0.5, 1, 0.4]);
    line.add(P(ball(1, 2).scale(0.1, 0.12, 0.15).translate(0, down ? 0.26 : 0.6, 0.44)), '#4a4038');
    for (const [lx, lz] of [[0.14, 0.24], [-0.14, 0.24], [0.14, -0.24], [-0.14, -0.24]]) line.add(P(roll([V(lx, 0.3, lz), V(lx, 0, lz)], 0.035, { around: 5, every: 1 })), '#4a4038');
    claim(x, z, 0.4);
  }
  /** The windmill: a white tower, a cap, and four sails of lattice and cloth that go round. */
  function windmill(x, z) {
    const y = surface(x, z) - 0.4, TALL = 4.4;
    line.add(put(knead(turned([[0, 0], [1.3, 0], [0.88, TALL], [0, TALL]], 20), 0.012, 2, next()), x, y, z), '#fbf6ec', [0.3, 1, 0.15], [-0.8, 0.5, 0.3]);
    line.add(put(knead(turned([[0, 0], [1.02, 0], [0.96, 0.14], [0.2, 0.95], [0, 1.0]], 14), 0.01, 3, next()), x, y + TALL, z), TILES[1], [0.9, 0.5, 0.2]);
    line.add(arched(0.62, 1.2).translate(x, y + 0.42, z + 1.27), '#3f6f9a', [0.05, 1, 0.05]);
    for (const wy of [2.2, 3.3]) { line.add(block(0.42, 0.52, 0.1, 0.02, 0.2).translate(x, y + wy, z + 1.3 - wy * 0.095), WHITE); line.add(block(0.3, 0.4, 0.1, 0.02, 0.2).translate(x, y + wy, z + 1.33 - wy * 0.095), '#5f7fa6'); }
    const sails = own((b) => {
      for (let k = 0; k < 4; k++) {
        const P = (g) => g.rotateZ((k * Math.PI) / 2);
        b.line.add(P(roll([V(0, 0, 0), V(0, 3.5, 0)], 0.05, { around: 5, every: 1.2 })), '#8a6a48');
        b.line.add(P(block(0.72, 2.5, 0.03, 0.01, 0.4).translate(0.42, 2.2, 0)), '#f3ead2', [0.2, 1, 0], [1, 0.3, 0]);
        for (let i = 0; i < 5; i++) b.line.add(P(block(0.76, 0.045, 0.05, 0.01, 0.4).translate(0.42, 1.0 + i * 0.6, 0.01)), '#8a6a48');
        b.line.add(P(block(0.045, 2.5, 0.05, 0.01, 0.4).translate(0.8, 2.2, 0.01)), '#8a6a48');
      }
      b.line.add(ball(0.16, 2), '#8a6a48');
    });
    // the sails turn well out in front of the tower, which is wider at its foot than at its cap: clear of the door
    sails.position.set(x, y + TALL + 0.3, z + 1.64);
    line.add(roll([V(x, y + TALL + 0.3, z + 0.5), V(x, y + TALL + 0.3, z + 1.62)], 0.08, { around: 6, every: 1 }), '#8a6a48');
    moving.push(() => { sails.rotation.z = -time.value * 0.45; });
    claim(x, z, 1.8);
  }

  // ====================================================================== to the right of the town: the farm, the chapel
  farm(18.5, -19, 2.7, 2.3, '#f2b8a8', '#5d8f58', -1);
  chapel(20.6, -24.8);
  // one lane: from the foot of the farm's steps, up past its side and round behind it to the chapel's door
  path([[16.1, -17.4], [16.3, -18.2], [16.55, -19.4], [16.9, -20.6], [17.8, -21.6], [19.2, -22.0], [20.6, -22.05]], 0.6, '#ecdcb4', false);
  for (const [x, z, h] of [[15.6, -20.0, 4.4], [15.9, -21.4, 3.6], [18.7, -25.3, 4.6], [22.6, -25.6, 4.0], [22.4, -20.6, 3.2]]) cypress(x, z, h);
  for (const [x, z] of [[28.3, -21.4], [29.3, -22.1], [28.4, -22.7]]) haystack(x, z, 0.8 + 0.25 * R());
  wall([[20.4, -16.8], [21.6, -16.5], [23.3, -15.9], [25.0, -14.9]]);
  // the orchard, in its rows, with a wall along the top of it
  for (const [x, z] of [[14.3, -16.2], [15.5, -16.8], [14.6, -17.7], [15.8, -18.3], [14.0, -19.0], [13.3, -17.4]]) tree(x, z, 0.55, GREENS, R() < 0.5 ? '#f08a3c' : '#f2c12b');
  // the vineyard, and the earth it stands in
  plot(24.6, 33.4, -19.0, -13.6, '#d8c08a', [0.1, 1, 1], [1, 1, 0.1]);
  rows(25, 33, [-14.2, -15.0, -15.8, -16.6, -17.4, -18.2], ['#5fa04a', '#74b356', '#4f8f44'], { posts: true, dots: '#7a4f9a' });
  // lavender above it, a field of wheat behind the farm
  plot(22.8, 27.4, -29.3, -24.9, '#b9a6da', [0.1, 1, 1], [1, 1, 0.1]);
  rows(23.2, 27, [-25.4, -26.2, -27.0, -27.8, -28.6], ['#8f74d6', '#a988e0', '#7d63c8'], { r: 0.17, lift: 0.2 });
  plot(13.4, 17.4, -25.6, -22.6, '#ecd27a', [0.9, 1, 0.2], [-0.6, 1, 0.5]);
  drift(15.5, -24.2, '#e8554e', 9, 1.6);
  for (const [x, z, yaw] of [[24.4, -13.3, 0.6], [25.6, -12.7, -1.2], [26.9, -13.0, 2.2], [28.2, -12.6, 0.2], [29.4, -13.1, -0.7], [23.7, -14.3, 1.5], [30.6, -12.5, 2.8]]) sheep(x, z, yaw);
  for (const [x, z, s] of [[22.6, -22.0, 1], [24.0, -23.0, 0.9], [25.2, -21.4, 1.1], [26.4, -23.8, 0.9], [34.5, -17.0, 1], [35.6, -19.0, 0.9]]) olive(x, z, s);
  pine(31.6, -21.2, 1); pine(34.2, -22.6, 0.85); pine(15.2, -27.6, 0.9);
  for (const [x, z, s] of [[25.6, -31.0, 1], [27.2, -32.0, 0.85], [24.2, -32.4, 0.9], [29.6, -27.4, 0.8], [36.8, -24.4, 0.9], [38.2, -22.2, 0.8]]) tree(x, z, s);
  shore(2, -0.52, 0.85);
  for (const [i, [x, z, c]] of [[17.3, -15.6, '#e8554e'], [19.6, -15.7, '#f2c12b'], [22.6, -14.6, '#f8f4ea'], [21.9, -23.9, '#f08ab0'], [30, -24.4, '#f2c12b'], [35.2, -15.2, '#e8554e'], [27.4, -20.6, '#b07ad6'], [19.4, -21.4, '#f2c12b']].entries()) drift(x, z, c, 26, 0.9, i > 2);
  // on the face above the town: poppies, buttercups, daisies, and pinks under the sheep
  band(17.2, -15.8, '#e8554e', '#f2c12b');
  band(19.3, -16.0, '#f2c12b', '#b07ad6', 90, 3.0);
  band(22.7, -14.8, '#f8f4ea', '#f2c12b', 100, 3.4);
  band(27.6, -11.9, '#f08ab0', '#f8f4ea', 90, 3.2);

  // ============================================================================== to the left: the windmill, the barn
  windmill(-31, -19.4);
  farm(-36.4, -14.6, 3.0, 2.2, '#f6e9cf', '#c2473d');
  // a path from the mill's door to the barn's, along the wall: it keeps to the easy ground on top of the hill
  // (lower down the hill falls too steeply into the sea for anyone to have trodden one)
  path([[-31.0, -17.9], [-31.1, -16.6], [-31.3, -15.2], [-31.9, -13.8], [-33.4, -13.05], [-35.2, -12.95], [-36.4, -13.2]], 0.6, '#ecdcb4', false);
  for (const [x, z, h] of [[-23.2, -13.6, 3.8], [-27.2, -17.8, 4.4], [-33.4, -20.4, 3.6], [-38.2, -16.0, 4.2]]) cypress(x, z, h);
  for (const [x, z] of [[-33.7, -14.6], [-32.9, -15.4], [-34.0, -16.0]]) haystack(x, z, 0.8 + 0.25 * R());
  wall([[-39.6, -12.6], [-37.2, -12.0], [-34.6, -12.0], [-32.2, -12.4]]);
  for (const [x, z, yaw] of [[-27.8, -12.6, 0.4], [-29.3, -12.1, -1.0], [-26.4, -12.3, 2.0], [-29.8, -13.3, 1.2], [-28.6, -13.8, -2.4]]) sheep(x, z, yaw);
  plot(-42.6, -37.6, -20.6, -17.0, '#ecd27a', [0.9, 1, 0.2], [-0.6, 1, 0.5]);
  for (const [x, z, s] of [[-34.6, -23.4, 1], [-37.2, -22.4, 0.9], [-40.6, -15.2, 1], [-36.0, -25.4, 0.9]]) olive(x, z, s);
  for (const [x, z, s] of [[-22.2, -20.8, 1], [-20.6, -22.8, 0.9], [-23.2, -24.4, 1], [-18.4, -17.4, 0.8], [-21.4, -18.2, 0.85], [-25.0, -22.0, 0.8]]) tree(x, z, s);
  pine(-43.4, -17.6, 0.9);
  shore(3, -0.8, 0.72);
  for (const [x, z, c] of [[-26.8, -11.4, '#e8554e'], [-32.6, -11.6, '#f2c12b'], [-38.4, -13.8, '#f8f4ea'], [-29.6, -21.8, '#f08ab0'], [-35.2, -18.4, '#b07ad6']]) drift(x, z, c);

  // ============================================ the houses up behind the town, and the cypresses that were always there
  for (const [x, z, w, h, c, shut] of [[-8.5, -17.5, 2.8, 2.2, '#f6e9cf', '#3f7f6a'], [-4.6, -19.5, 2.4, 2.6, '#f2b8a8', '#5d8f58'], [8.4, -18.2, 3.0, 2.0, '#f6e9cf', '#c2473d'], [13.2, -20.8, 2.6, 2.4, '#f4d78a', '#4f7fb0'], [-14.5, -18.6, 2.6, 2.0, '#bfe0f2', '#f3efe6']]) farm(x, z, w, h, c, shut);
  const old = (x, z) => Math.max(0, ...HILLS.map(([cx, cz, r, tall]) => tall * r * Math.sqrt(Math.max(0, 1 - ((x - cx) / r) ** 2 - ((z - cz) / (0.8 * r)) ** 2)))) - 0.4;
  for (let i = 0; i < 26; i++) {
    const x = -24 + rand() * 50, z = -13 - rand() * 12, h = 2.6 + 2.2 * rand();
    if (old(x, z) < 3) continue;
    pick(DARK.slice(0, 3));
    if (free(x, z, 0.7)) cypress(x, z, h * 1.1);
  }
  void field; void hue;
}
