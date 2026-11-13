// The mountains behind the town. Two ranges, drawn the way they are in a sketchbook: a nearer ridge of wooded
// foothills in blue-green, and far behind it a high range in pale blue with snow on its summits. Each is one long
// ridge with its summits put on it by hand (see below), not a row of separate hills. The sun is on their left
// faces, and the right ones are in the shadow pencil, lightly: they are a long way off.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { noise, rng } from '../noise.js';
import { turned } from '../shape.js';
import { field, hue } from '../pencil.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ridged = (v) => 1 - Math.abs(v);
const SUN = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();

// A range: how far off it is, how high its ridge runs, and its summits. Each summit: where (the angle round from
// due east, so 1.57 is straight inland), how far it stands above the ridge, and how far its shoulders run to the
// right and to the left. From the pier the church tower stands at about 1.83, the right edge of the page is 1.27
// and the left 2.47: the highest summit is over the houses to the right of the tower, the second to its left.
const FAR = {
  R: 1000, ridge: 250, light: '#a9bdf7', dark: '#869cee', snow: 312, seed: 23,
  peaks: [[0.45, 30, 0.2, 0.2], [0.8, 70, 0.14, 0.16], [1.08, 45, 0.1, 0.12], [1.3, 92, 0.1, 0.1], [1.55, 142, 0.085, 0.1], [1.72, 58, 0.06, 0.07], [1.93, 48, 0.07, 0.07], [2.12, 94, 0.09, 0.08], [2.3, 40, 0.07, 0.08], [2.47, 76, 0.1, 0.1], [2.75, 50, 0.14, 0.16], [3.1, 25, 0.2, 0.2]],
};
const NEAR = {
  R: 600, ridge: 60, light: '#a3cdbb', dark: '#84b6a3', wood: '#6fa392', snow: 0, seed: 7, firs: 2600,
  peaks: [[0.6, 24, 0.25, 0.25], [1.1, 34, 0.2, 0.2], [1.6, 20, 0.2, 0.2], [2.0, 30, 0.16, 0.18], [2.35, 44, 0.16, 0.16], [2.8, 36, 0.2, 0.22], [3.15, 22, 0.2, 0.2]],
};

function range({ R, ridge, light, dark, wood, snow, seed, peaks, firs = 0 }, material) {
  const R0 = R;
  const A0 = 0.1, A1 = 3.5, SEG = 520, ROWS = 18, W = SEG + 1, pos = [], col = [], hat = [], index = [], c = new THREE.Color(), c2 = new THREE.Color();
  const crest = (a) => {
    let rise = 0;
    // a summit is a point, with hollow flanks
    for (const [at, high, right, left] of peaks) rise = Math.max(rise, high * Math.exp(-((Math.abs(a - at) / (a < at ? right : left)) ** 1.15)));
    const h = ridge * (1 + 0.06 * noise(a * 2.3 + seed, 1)) + rise;
    // and the ridge between summits is notched, never a smooth line
    return h * (0.975 + 0.05 * ridged(noise(a * 11 + seed, 4)) + 0.02 * noise(a * 37 + seed, 8)) * sstep(A0, A0 + 0.3, a) * sstep(A1, A1 - 0.3, a);
  };
  // buttresses and gullies down the face: what the light and the snow pick out
  const rib = (a) => ridged(noise(a * 23 + seed, 2)) * 0.65 + ridged(noise(a * 61 + seed, 5)) * 0.35;
  for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= SEG; i++) {
    const a = A0 + (A1 - A0) * (i / SEG), t = j / ROWS, high = crest(a), b = rib(a);
    const face = (1 - t) * t * 4; // most in the middle of the face, nothing at its foot or its crest
    const r = R - (high * 1.25 + 40) * (1 - t) - (b - 0.5) * 0.13 * high * face, y = high * (t ** 1.12) * (1 - 0.04 * (1 - b) * face);
    pos.push(Math.cos(a) * r, y - 4, -Math.sin(a) * r);
    c.set(dark).lerp(c2.set(light), sstep(0.25, 0.75, b));
    if (snow) {
      // bare rock in the gullies, and a belt of forest along its foot
      c.lerp(c2.set('#7f89d2'), (1 - sstep(0.12, 0.34, b)) * sstep(0.3, 0.55, t) * 0.7);
      c.lerp(c2.set('#8fb0c9'), (1 - sstep(0.2, 0.42, t + 0.08 * noise(a * 40 + seed, 6))) * 0.8);
      // snow lies on down the gullies below the snow line
      c.lerp(c2.set('#ffffff'), (1 - sstep(0.16, 0.3, b)) * sstep(snow - 75, snow - 20, y) * 0.85);
    }
    // woods on the foothills, in patches
    if (wood) c.lerp(c2.set(wood), sstep(0.05, 0.35, noise(a * 26 + seed, t * 5 + 3)) * 0.8);
    // snow above the snow line: lower on the buttresses than in the gullies, its edge ragged
    if (snow) c.lerp(c2.set('#ffffff'), sstep(snow - 9, snow + 9, y + 30 * (b - 0.5) + 9 * noise(a * 80, t * 9)));
    col.push(c.r, c.g, c.b);
    // its strokes lie on the slant of the hand, like everything else on the page, and bend a little over each buttress
    hat.push((a * R * 0.62 + y) * 0.034 + b * 0.5, (y - a * R * 0.78) * 0.034);
    // (the side that is seen from the town is its front)
    if (i < SEG && j < ROWS) { const k = i + j * W; index.push(k, k + W, k + 1, k + 1, k + W, k + W + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('hatch', new THREE.Float32BufferAttribute(hat, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  // far things are drawn with a light hand: their shade is kept shallow by turning every face part way to the sun
  const n = g.attributes.normal, v = new THREE.Vector3();
  if (v.fromBufferAttribute(n, W * 8 + 200).dot(new THREE.Vector3(-pos[(W * 8 + 200) * 3], 0, -pos[(W * 8 + 200) * 3 + 2])) < 0) { g.setIndex(index.reverse()); g.computeVertexNormals(); }
  for (let i = 0; i < n.count; i++) { v.fromBufferAttribute(n, i).addScaledVector(SUN, 1.3).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  if (firs) {
    // woods: firs, thick along the crest and in the folds, each a pale spire at this distance
    const R = rng(seed * 31 + 5), trees = [], tones = ['#5f9a84', '#538c78', '#6ea58d', '#4c8474'];
    // they stand in woods, not one by one: a wood is a few dozen of them close enough to run together
    for (let n = 0; trees.length < firs && n < firs; n++) {
      const a0 = A0 + 0.35 + R() * (A1 - A0 - 0.7), t0 = 0.45 + 0.45 * R();
      if (noise(a0 * 26 + seed, t0 * 5 + 3) < 0.05) continue;
      const many = 30 + Math.floor(R() * 40), wide = 0.03 + 0.035 * R();
      for (let k = 0; k < many; k++) {
        const a = a0 + (R() + R() - 1) * wide, t = Math.min(0.98, Math.max(0.3, t0 + (R() + R() - 1) * 0.16));
        const high = crest(a), b = rib(a), face = (1 - t) * t * 4, r = R0 - (high * 1.25 + 40) * (1 - t) - (b - 0.5) * 0.13 * high * face, y = high * (t ** 1.12) * (1 - 0.04 * (1 - b) * face) - 4, tall = 9 + 8 * R();
        const fir = turned([[0, 0], [2.6, 0.4], [1.4, tall * 0.5], [0, tall]], 5).translate(Math.cos(a) * r, y - 0.8, -Math.sin(a) * r);
        trees.push(hue(field(fir, [0.9, 0.3, 0.3], [0.1, 1, 0.1]), tones[Math.floor(R() * tones.length)]).toNonIndexed());
      }
    }
    const all = mergeGeometries(trees), tn = all.attributes.normal;
    // drawn with the same light hand as the slope they stand on
    for (let i = 0; i < tn.count; i++) { v.fromBufferAttribute(tn, i).addScaledVector(SUN, 0.6).normalize(); tn.setXYZ(i, v.x, v.y, v.z); }
    const wood = new THREE.Mesh(all, material);
    wood.frustumCulled = false;
    mesh.add(wood);
  }
  return mesh;
}

export function buildMountains({ group, pencil }) {
  group.add(range(FAR, pencil.line), range(NEAR, pencil.line));
}
