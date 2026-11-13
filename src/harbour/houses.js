// The houses along the quay: tall, narrow, each its own colour, and each drawn with what a house there has: a
// roof tiled row over row, a chimney with its pots, windows with sills and shutters, a balcony with an iron rail,
// an arched door with a fanlight, a shop's window under an awning or a hanging sign, a drainpipe, a vine up the
// wall, pots of flowers on the step.
import * as THREE from 'three';
import { ball, block, knead, put, roll, turned } from '../shape.js';
import { field, hue } from '../pencil.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const WHITE = '#f8f4ea', STONE = '#e9dfc8', IRON = '#2f3a44';
export const GREENS = ['#5fa04a', '#74b356', '#4f8f44', '#8cc063'];
export const BLOOMS = ['#e8554e', '#f08ab0', '#f2c12b', '#f3efe6', '#b07ad6', '#f08a3c'];
export const TILES = ['#c9663f', '#b5533c', '#d67a4a', '#bf5c3a', '#cf7050'], SLATE = ['#8a8fa0', '#7b8194', '#989cab', '#868b9c'];
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const darker = (c, k = 0.82) => new THREE.Color(c).multiplyScalar(k);

export const HOUSES = [
  { x: -13.2, w: 3.6, h: 6.2, wall: '#e9705a', tiles: TILES, shut: '#3f7f6a', door: '#3f7f6a', pipe: true, pots: 2, sign: { board: '#f3e9d6', icon: '#3f6f9a', kind: 'fish' } },
  { x: -9.5, w: 3.4, h: 7.5, wall: '#f4c552', tiles: TILES, shut: '#4f7fb0', door: '#4f7fb0', gable: false, balcony: 1, pots: 1 },
  { x: -5.9, w: 3.6, h: 5.6, wall: '#f3e9d6', tiles: TILES, shut: '#c2473d', door: '#c2473d', awning: '#e8554e', arch: true, sign: { board: '#c2473d', icon: '#f2c98a', kind: 'loaf' } },
  { x: -2.2, w: 3.5, h: 7.0, wall: '#74b2dc', tiles: SLATE, shut: '#f3efe6', door: '#f2c12b', pots: 2, vine: { flowers: ['#a988e0', '#8f74d6', '#c3a8ee'], bloom: 0.55, hang: true } },
  { x: 1.5, w: 3.7, h: 6.0, wall: '#f295a6', tiles: TILES, shut: '#5d8f58', door: '#5d8f58', gable: false, awning: '#59a640', balcony: 0 },
  { x: 5.3, w: 3.6, h: 7.7, wall: '#8fcf9c', tiles: TILES, shut: '#f3efe6', door: '#c2473d', arch: true, pipe: true, pots: 1 },
  { x: 9.1, w: 3.8, h: 5.8, wall: '#f0a04e', tiles: SLATE, shut: '#3f6f9a', door: '#3f6f9a', awning: '#4f9bd8', sign: { board: '#3f6f9a', icon: '#f8f4ea', kind: 'cup' } },
  { x: 12.9, w: 3.5, h: 6.9, wall: '#cfc6f2', tiles: TILES, shut: '#7a4a8a', door: '#7a4a8a', gable: false, balcony: 1, pots: 2, vine: { flowers: ['#e8478f', '#f06aa8', '#d83a7a'], bloom: 0.6, hang: false } },
];

/** A flat piece with a round-arched top: w wide, h high to its crown, standing on y = 0, facing +z. */
export function arched(w, h, deep = 0.1) {
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, Math.max(h - r, 0)); s.absarc(0, Math.max(h - r, 0), r, 0, Math.PI, false); s.lineTo(-r, 0);
  return new THREE.ExtrudeGeometry(s, { depth: deep, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -deep / 2);
}

/** A pot of flowers. */
export function pot(kit, x, y, z, s = 1, flowers = null) {
  const { line, rand, pick, next } = kit, bloom = flowers ?? pick(BLOOMS);
  line.add(put(turned([[0, 0], [0.15, 0], [0.21, 0.3], [0.235, 0.3], [0.235, 0.37], [0, 0.37]], 12), x, y, z, 0, s), '#c9714a', [0.2, 1, 0.1], [1, 0.3, 0.2]);
  for (let k = 0; k < 8; k++) {
    const a = rand() * TAU, r = 0.17 * Math.sqrt(rand()) * s;
    line.add(put(knead(ball((0.09 + 0.05 * rand()) * s, 2), 0.012 * s, 9, next()), x + Math.cos(a) * r, y + (0.43 + 0.22 * rand()) * s, z + Math.sin(a) * r), k % 3 === 0 ? bloom : pick(GREENS));
  }
}

/** A tiled roof on a house whose walls end at y: a gable to the street (its ridge running back) or its eaves (its ridge along the street). */
export function roof(kit, { x, y, z, w, d, rh, gable, tiles, wall }) {
  const { line, next } = kit, tones = tiles.map((c) => new THREE.Color(c));
  // what the tiles lie on; its ends are the wall going up into the gable
  const g = block(w + 0.06, rh, d + 0.06, 0.04, 0.28), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 - 0.95 * (p.getY(i) / rh + 0.5); if (gable) p.setX(i, p.getX(i) * k); else p.setZ(i, p.getZ(i) * k); }
  g.computeVertexNormals();
  hue(g, (px, py, pz, i, nx, ny, nz) => (Math.abs(gable ? nz : nx) > 0.6 ? wall : darker(tiles[0], 0.8)));
  line.add(field(g.translate(x, y + rh / 2 - 0.06, z)));
  // the tiles: rows of them, each row lapping the one below, every tile a little different in its red
  const H = (gable ? w : d) / 2 + 0.22, len = (gable ? d : w) + 0.36, L = Math.hypot(H, rh), a = Math.atan2(rh, H), rows = Math.max(3, Math.round(L / 0.36)), rw = L / rows;
  for (const s of [-1, 1]) for (let i = 0; i < rows; i++) {
    const t = (i + 0.5) / rows, off = s * H * (1 - t), lift = 0.05, slab = knead(gable ? block(rw + 0.1, 0.07, len, 0.03, 0.3) : block(len, 0.07, rw + 0.1, 0.03, 0.3), 0.006, 4, next());
    if (gable) slab.rotateZ(-s * (a - 0.08)); else slab.rotateX(s * (a - 0.08));
    slab.translate(x + (gable ? off + (s * rh / L) * lift : 0), y + rh * t + (H / L) * lift - 0.05, z + (gable ? 0 : off + (s * rh / L) * lift));
    hue(slab, (px, py, pz) => tones[Math.floor(hash(Math.floor((gable ? pz : px) / 0.3) * 7.3 + i * 3.1 + s) * tones.length)]);
    line.add(field(slab, gable ? [0, 0.05, 1] : [1, 0.05, 0], gable ? [1, 0.6, 0.3] : [0.3, 0.6, 1]));
  }
  const e = len / 2;
  line.add(roll(gable ? [V(x, y + rh + 0.02, z - e), V(x, y + rh + 0.02, z + e)] : [V(x - e, y + rh + 0.02, z), V(x + e, y + rh + 0.02, z)], 0.1, { around: 8, every: 0.3 }), darker(tiles[0], 0.9), gable ? [0, 0, 1] : [1, 0, 0]);
}

/** Builds the row. kit: { line, both, flat, rand, pick, next, colliders, boxes, QUAY, FRONT }. Gives each house's top, by its x. */
export function buildHouses(kit) {
  const { line, both, flat, rand, pick, next, QUAY, FRONT } = kit;
  const D = 3.4, z0 = FRONT - D / 2, y0 = QUAY.y, tops = {};

  function house(o) {
    const { x, w, h, wall, tiles, shut, gable = true, door = '#3f6f8a', awning = null, flowers = 0.4, arch = false, balcony = -1, vine = null, sign = null, pipe = false, pots = 0 } = o;
    line.add(knead(block(w, h, D, 0.06, 0.45), 0.018, 0.9, next()).translate(x, y0 + h / 2, z0), wall);
    // a darker band at its foot, and a moulding under the roof
    line.add(block(w + 0.03, 0.46, 0.1, 0.02, 0.4).translate(x, y0 + 0.23, FRONT), darker(wall, 0.84));
    line.add(block(w + 0.14, 0.13, 0.2, 0.04, 0.4).translate(x, y0 + h - 0.08, FRONT + 0.03), WHITE);
    const rh = gable ? w * 0.44 : 1.5;
    roof(kit, { x, y: y0 + h, z: z0, w, d: D, rh, gable, tiles, wall });
    tops[x] = y0 + h + rh;
    // the chimney, capped, with two pots
    const cx = x + w * 0.28, cy = y0 + h + (gable ? rh * 0.55 : rh * 0.85), cz = z0 - 0.5;
    line.add(put(knead(block(0.46, 1.1, 0.46, 0.05, 0.2), 0.01, 3, next()), cx, cy, cz), '#c9825a');
    line.add(block(0.58, 0.1, 0.58, 0.03, 0.2).translate(cx, cy + 0.58, cz), STONE);
    for (const s of [-1, 1]) line.add(put(turned([[0, 0], [0.08, 0], [0.065, 0.22], [0.085, 0.26], [0, 0.26]], 8), cx + s * 0.12, cy + 0.63, cz), '#c9663f');

    // --- windows, floor above floor ---
    const floors = Math.max(1, Math.floor((h - 2.5) / 1.5)), cols = w > 3.55 ? 3 : 2, z = FRONT;
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const wx = x + (c - (cols - 1) / 2) * (w / cols) * 0.94, wy = y0 + 3.05 + f * 1.5, tall = f === balcony;
      if (tall) {
        // onto a balcony: a glazed door
        line.add(block(0.7, 1.52, 0.1, 0.02, 0.3).translate(wx, wy - 0.2, z + 0.02), WHITE);
        line.add(block(0.56, 1.38, 0.1, 0.015, 0.3).translate(wx, wy - 0.2, z + 0.045), '#5f7fa6', [0.5, 1, 0], [-0.5, 1, 0]);
        line.add(block(0.045, 1.38, 0.1, 0.01, 0.4).translate(wx, wy - 0.2, z + 0.06), WHITE);
        for (const dy of [-0.5, 0.1]) line.add(block(0.56, 0.04, 0.1, 0.01, 0.4).translate(wx, wy + dy, z + 0.06), WHITE);
        continue;
      }
      if (arch) {
        line.add(arched(0.66, 1.06).translate(wx, wy - 0.5, z + 0.02), WHITE);
        line.add(arched(0.52, 0.95).translate(wx, wy - 0.44, z + 0.045), '#5f7fa6', [0.5, 1, 0], [-0.5, 1, 0]);
      } else {
        line.add(block(0.64, 0.98, 0.1, 0.02, 0.3).translate(wx, wy, z + 0.02), WHITE);
        line.add(block(0.5, 0.84, 0.1, 0.015, 0.3).translate(wx, wy, z + 0.045), '#5f7fa6', [0.5, 1, 0], [-0.5, 1, 0]);
      }
      line.add(block(0.045, 0.84, 0.1, 0.01, 0.4).translate(wx, wy - 0.02, z + 0.06), WHITE);
      line.add(block(0.5, 0.045, 0.1, 0.01, 0.4).translate(wx, wy + 0.08, z + 0.06), WHITE);
      line.add(block(0.8, 0.07, 0.18, 0.02, 0.3).translate(wx, wy - 0.53, z + 0.06), STONE);
      if (cols === 2 && !arch) for (const s of [-1, 1]) line.add(knead(block(0.28, 0.98, 0.06, 0.015, 0.2), 0.004, 5, next()).translate(wx + s * 0.48, wy, z + 0.03), shut, [0, 1, 0], [1, 0.2, 0]);
      if (rand() < flowers) {
        line.add(block(0.72, 0.15, 0.2, 0.03, 0.2).translate(wx, wy - 0.45, z + 0.18), '#96673c');
        const bloom = pick(BLOOMS);
        for (let k = 0; k < 6; k++) line.add(put(knead(ball(0.08 + 0.03 * rand(), 1), 0.012, 9, next()), wx + (k - 2.5) * 0.125, wy - 0.3 + 0.05 * rand(), z + 0.2 + 0.03 * rand()), k % 2 ? pick(GREENS) : bloom);
      }
    }
    // --- a balcony: a slab on brackets, an iron rail, pots ---
    if (balcony >= 0 && balcony < floors) {
      const by = y0 + 3.05 + balcony * 1.5 - 0.98, bw = w * 0.86, bz = FRONT + 0.36, rail = by + 0.78;
      line.add(block(bw, 0.09, 0.66, 0.03, 0.3).translate(x, by, bz), STONE);
      for (const s of [-1, 1]) line.add(block(0.1, 0.3, 0.46, 0.03, 0.2).translate(x + s * bw * 0.38, by - 0.19, FRONT + 0.26), '#d8cdb4');
      const A = V(x - bw / 2 + 0.04, rail, FRONT + 0.06), B = V(x - bw / 2 + 0.04, rail, bz + 0.29), C = V(x + bw / 2 - 0.04, rail, bz + 0.29), E = V(x + bw / 2 - 0.04, rail, FRONT + 0.06);
      for (const [p, q] of [[A, B], [B, C], [C, E]]) {
        line.add(roll([p, q], 0.026, { around: 5, every: 1 }), IRON);
        const n = Math.round(p.distanceTo(q) / 0.13);
        for (let k = 0; k <= n; k++) { const t = p.clone().lerp(q, k / n); flat.add(roll([t, t.clone().setY(by + 0.04)], 0.011, { around: 4, every: 1 }), IRON); }
      }
      for (const px of [-0.36, 0.36]) pot(kit, x + px * bw, by + 0.045, bz + 0.14, 0.62);
    }

    // --- the door: a step, an arch with a fanlight (or a plain head), panels, a brass knob ---
    const dx = x - w * 0.24;
    line.add(block(1.14, 0.16, 0.42, 0.04, 0.3).translate(dx, y0 + 0.06, FRONT + 0.2), '#d8c9a8');
    if (!awning) {
      line.add(arched(0.98, 2.14).translate(dx, y0 + 0.02, FRONT + 0.02), WHITE);
      line.add(arched(0.8, 0.4).translate(dx, y0 + 1.64, FRONT + 0.05), '#8fb0cf', [0.5, 1, 0], [-0.5, 1, 0]);
      for (const a of [0.52, 1.57, 2.62]) flat.add(roll([V(dx, y0 + 1.65, FRONT + 0.11), V(dx + Math.cos(a) * 0.38, y0 + 1.65 + Math.sin(a) * 0.38, FRONT + 0.11)], 0.012, { around: 4, every: 1 }), WHITE);
      line.add(block(0.86, 0.06, 0.12, 0.01, 0.3).translate(dx, y0 + 1.62, FRONT + 0.06), WHITE);
    } else line.add(block(0.94, 1.76, 0.1, 0.03, 0.3).translate(dx, y0 + 0.9, FRONT + 0.02), WHITE);
    line.add(knead(block(0.8, 1.6, 0.1, 0.03, 0.3), 0.004, 5, next()).translate(dx, y0 + 0.82, FRONT + 0.05), door, [0.05, 1, 0.05], [1, 0.2, 0]);
    for (const [py, ph] of [[1.2, 0.56], [0.52, 0.5]]) for (const s of [-1, 1]) line.add(block(0.27, ph, 0.1, 0.02, 0.2).translate(dx + s * 0.185, y0 + py, FRONT + 0.065), darker(door, 0.86), [0.05, 1, 0.05]);
    line.add(ball(0.045, 1).translate(dx + 0.3, y0 + 0.88, FRONT + 0.13), '#e3b54a');
    for (let k = 0; k < pots; k++) { const px = dx + (k ? 0.78 : -0.78); pot(kit, px, y0, FRONT + 0.44, 0.85 + 0.35 * rand()); kit.colliders.push({ x: px, z: FRONT + 0.44, r: 0.24, h: 0.6 }); }

    // --- the shop's window, and its awning or its board ---
    const sx = x + w * 0.2;
    line.add(block(1.46, 1.34, 0.1, 0.03, 0.3).translate(sx, y0 + 1.2, FRONT + 0.02), WHITE);
    line.add(block(1.3, 1.18, 0.1, 0.02, 0.3).translate(sx, y0 + 1.2, FRONT + 0.045), '#6f8fb0', [0.5, 1, 0], [-0.5, 1, 0]);
    for (const s of [-1, 1]) line.add(block(0.04, 1.18, 0.1, 0.01, 0.4).translate(sx + s * 0.22, y0 + 1.2, FRONT + 0.06), WHITE);
    line.add(block(1.5, 0.08, 0.2, 0.02, 0.3).translate(sx, y0 + 0.56, FRONT + 0.07), STONE);
    if (awning) {
      const g = new THREE.PlaneGeometry(1.9, 1.05, 8, 1).toNonIndexed(), ap = g.attributes.position, col = [], c1 = new THREE.Color(awning), c2 = new THREE.Color(WHITE);
      for (let i = 0; i < ap.count; i += 3) { const c = Math.floor(((ap.getX(i) + ap.getX(i + 1) + ap.getX(i + 2)) / 3 + 0.95) / 0.2375) % 2 ? c1 : c2; col.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      both.add(field(g.rotateX(-1.05).translate(sx, y0 + 2.14, FRONT + 0.54), [0.05, 0.4, 1], [1, 0.3, 0.2]));
      // its scalloped edge, hanging
      for (let k = 0; k < 8; k++) both.add(field(new THREE.CircleGeometry(0.119, 8, Math.PI, Math.PI).translate(sx - 0.83 + k * 0.2375, y0 + 1.885, FRONT + 0.995), [0.05, 0.4, 1]), k % 2 ? awning : WHITE);
      for (const s of [-1, 1]) flat.add(roll([V(sx + s * 0.93, y0 + 1.72, FRONT + 1.0), V(sx + s * 0.93, y0 + 1.92, FRONT + 0.06)], 0.014, { around: 4, every: 1 }), '#4a4744');
    } else if (sign) line.add(block(1.56, 0.3, 0.07, 0.03, 0.3).translate(sx, y0 + 2.1, FRONT + 0.04), sign.board, [0.1, 1, 0]);

    // --- a sign hung out from the wall on an iron arm ---
    if (sign) {
      const hx = x + w / 2 - 0.16, hy = y0 + 3.0, hz = FRONT, sy = hy - 0.44, sz = hz + 0.48;
      line.add(roll([V(hx, hy, hz), V(hx, hy, hz + 0.82)], 0.024, { around: 5, every: 1 }), IRON);
      flat.add(roll([V(hx, hy + 0.34, hz), V(hx, hy, hz + 0.66)], 0.012, { around: 4, every: 1 }), IRON);
      for (const dz of [0.3, 0.66]) flat.add(roll([V(hx, hy, hz + dz), V(hx, sy + 0.26, hz + dz)], 0.01, { around: 4, every: 1 }), IRON);
      line.add(turned([[0, 0], [0.29, 0], [0.29, 0.05], [0, 0.05]], 22).rotateZ(Math.PI / 2).translate(hx + 0.025, sy, sz), sign.board, [0.1, 1, 0.3]);
      for (const s of [-1, 1]) {
        const at = (g) => g.translate(hx + s * 0.035, sy, sz);
        if (sign.kind === 'fish') { line.add(at(ball(1, 2).scale(0.02, 0.075, 0.15)), sign.icon); line.add(at(ball(1, 1).scale(0.02, 0.085, 0.05).translate(0, 0, -0.17)), sign.icon); }
        else if (sign.kind === 'loaf') { line.add(at(ball(1, 2).scale(0.02, 0.1, 0.18)), sign.icon); }
        else { line.add(at(block(0.03, 0.15, 0.17, 0.012, 0.1).translate(0, -0.01, 0)), sign.icon); line.add(at(ball(1, 1).scale(0.02, 0.05, 0.045).translate(0, 0, 0.1)), sign.icon); }
      }
    }
    // --- a drainpipe down one corner ---
    if (pipe) {
      const px = x - w / 2 + 0.11, c = '#6f9084';
      line.add(roll([V(px, y0 + h - 0.2, FRONT + 0.08), V(px, y0 + 0.12, FRONT + 0.08)], 0.045, { around: 6, every: 1.2 }), c, [1, 0.1, 0.3]);
      line.add(block(0.2, 0.22, 0.17, 0.03, 0.2).translate(px, y0 + h - 0.26, FRONT + 0.09), c);
      for (let py = y0 + 1.2; py < y0 + h - 0.6; py += 1.5) line.add(block(0.15, 0.05, 0.13, 0.015, 0.2).translate(px, py, FRONT + 0.08), darker(c));
    }
    // --- a vine: up the corner and along over the windows, in leaf and in flower ---
    if (vine) {
      const vx = x + w / 2 - 0.2, topY = y0 + h * 0.74, pts = [V(vx, y0, FRONT + 0.1)];
      for (let k = 1; k <= 6; k++) pts.push(V(vx - 0.13 * Math.sin(k * 1.7), y0 + ((topY - y0) * k) / 6, FRONT + 0.1));
      for (let k = 1; k <= 5; k++) pts.push(V(vx - w * 0.17 * k, topY + 0.22 * Math.sin(k * 1.3), FRONT + 0.1));
      line.add(roll(pts, (t) => 0.05 - 0.03 * t, { around: 6, every: 0.2 }), '#7a5a3c', [1, 0.2, 0.2]);
      const curve = new THREE.CatmullRomCurve3(pts);
      for (let k = 0; k < 95; k++) {
        const t = 0.1 + 0.9 * rand(), p = curve.getPointAt(t), flower = rand() < vine.bloom, drop = flower && vine.hang ? rand() * 0.7 : 0, r = flower ? 0.07 + 0.05 * rand() : 0.09 + 0.08 * rand();
        line.add(put(knead(ball(r, 2).scale(1, 1, 0.45), 0.012, 8, next()), p.x + (rand() - 0.5) * 0.55, p.y + (rand() - 0.5) * 0.42 - drop, FRONT + 0.1 + 0.05 * rand() + (flower ? 0.04 : 0)), flower ? pick(vine.flowers) : pick(GREENS));
      }
    }
  }
  HOUSES.forEach(house);
  kit.boxes.push({ x: -0.2, y: 5, z: (QUAY.z0 + FRONT) / 2, hx: 15.1, hy: 6, hz: (FRONT - QUAY.z0) / 2, turn: 0 });
  return tops;
}
