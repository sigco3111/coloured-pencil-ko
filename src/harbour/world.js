// The harbour: a page of a sketchbook. A quay with a row of tall painted houses along it, bunting strung across,
// a market stall, a tree, a small lighthouse at one end; boats at their moorings in the basin; a wooden pier to
// walk out along; green hills behind and blue ones across the bay. All of it in coloured pencil (see pencil.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { noise, rng } from '../noise.js';
import { ball, block, knead, put, ring, roll, turned } from '../shape.js';
import { PENCIL, createBatch, field, fieldBy, hue } from '../pencil.js';
import { HOUSES, arched, buildHouses } from './houses.js';
import { buildQuayside } from './quayside.js';
import { buildMountains } from './mountains.js';
import { buildTower } from './tower.js';
import { buildHills } from './hills.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2, UP = V(0, 1, 0);
// (the quay has a clear walk along its lip, between what stands by the houses and the lamps at the water's edge;
// the pier is wide enough to walk down without minding its sides)
export const QUAY = { x0: -18, x1: 18, z0: -9, z1: 3.5, y: 1 }, PIER = { x0: 6.9, x1: 11.1, z0: 3.5, z1: 13.4 }, FRONT = -5.4;
const onQuay = (x, z) => x > QUAY.x0 && x < QUAY.x1 && z > QUAY.z0 && z <= QUAY.z1;
const onPier = (x, z) => x > PIER.x0 && x < PIER.x1 && z > PIER.z0 && z < PIER.z1;
const ground = (x, z) => (onQuay(x, z) || onPier(x, z) ? QUAY.y : 0);
const SUN = V(-0.62, 0.62, 0.48).normalize();
const WHITE = '#f8f4ea', WOOD = ['#a8763f', '#96673c', '#b98a52', '#8a5a34'];

const NOISE = /* glsl */ `
float skyHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float skyNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(skyHash(i), skyHash(i + vec2(1, 0)), f.x), mix(skyHash(i + vec2(0, 1)), skyHash(i + vec2(1, 1)), f.x), f.y); }
float skyFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * skyNoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }`;

export async function createWorld({ pencil, renderer, scene, say, turn }) {
  const group = new THREE.Group(), rand = rng(1907);
  const line = createBatch(pencil.line), both = createBatch(pencil.both), flat = createBatch(pencil.flat);
  const colliders = [], boxes = [], walls = [], moving = [];
  const time = { value: 0 }, sunU = { value: SUN };
  const mirror = {
    uHX: { value: HOUSES.map((h) => h.x - h.w / 2) }, uHW: { value: HOUSES.map((h) => h.w) }, uHH: { value: HOUSES.map((h) => QUAY.y + h.h) }, uHC: { value: HOUSES.map((h) => new THREE.Color(h.wall)) },
    uBoat: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, -999, 1)) }, uBoatC: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
  };
  let moored = 0;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  let seed = 50;
  /** A mesh of its own (for what moves), from pieces already added to a batch of their own. */
  const own = (make) => { const b = { line: createBatch(pencil.line), both: createBatch(pencil.both) }, g = new THREE.Group(); make(b); if (b.line.count) g.add(b.line.build()); if (b.both.count) g.add(b.both.build()); group.add(g); return g; };

  // ============================================================================================================ the sky
  say('Laying in the sky');
  await turn();
  {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, uniforms: { uPx: pencil.px, uSun: sunU, uTime: time },
      vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir; uniform vec3 uSun; uniform float uTime;
        ${PENCIL}
        ${NOISE}
        void main() {
          vec3 d = normalize(vDir);
          float e = asin(clamp(d.y, -1.0, 1.0)), up = smoothstep(0.0, 0.8, d.y);
          // clouds: left as bare paper, in soft heaps, drifting
          vec2 c = d.xz / (abs(d.y) + 0.3) * 1.2 + vec2(uTime * 0.005, 0.0);
          float m = skyFbm(c * vec2(0.7, 1.25) + 3.0), cloud = smoothstep(0.5, 0.6, m) * smoothstep(0.0, 0.09, d.y);
          vec3 blue = mix(vec3(0.36, 0.62, 0.92), vec3(0.16, 0.38, 0.84), up);
          float tooth = pcTooth(d * 11.0);
          vec3 left = vec3(1.0);
          // the blue: lightly all over, then in long slanting strokes, more of it overhead
          left *= mix(vec3(1.0), blue, clamp((0.3 + 0.4 * up) * (1.0 - cloud) * (0.5 + 0.85 * tooth), 0.0, 1.0));
          left *= mix(vec3(1.0), blue, clamp(pcStrokes(e * 26.0 + d.x * 9.0 + d.z * 5.0, (0.4 + 0.4 * up) * (1.0 - cloud)) * (0.5 + 0.8 * tooth) * 0.85, 0.0, 1.0));
          // a little violet grey under the clouds
          left *= mix(vec3(1.0), vec3(0.55, 0.56, 0.8), clamp(pcStrokes(e * 30.0 - d.x * 8.0, cloud * smoothstep(0.6, 0.78, m) * 0.7) * (0.5 + 0.7 * tooth) * 0.7, 0.0, 1.0));
          // warm round the sun, and pale along the horizon
          left *= mix(vec3(1.0), vec3(1.0, 0.86, 0.5), 0.3 * exp(-acos(clamp(dot(d, uSun), -1.0, 1.0)) * 2.6) * (0.6 + 0.6 * tooth));
          gl_FragColor = vec4(left, 1.0);
        }`,
    }));
    sky.frustumCulled = false;
    group.add(sky);
    moving.push((dt, camera) => sky.position.copy(camera.position));
  }

  // ============================================================================================================ the sea
  {
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1700, 64).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { uPx: pencil.px, uSun: sunU, uTime: time, ...mirror },
      vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        varying vec3 vW; uniform vec3 uSun; uniform float uTime;
        uniform float uHX[8]; uniform float uHW[8]; uniform float uHH[8]; uniform vec3 uHC[8]; uniform vec3 uBoat[6]; uniform vec3 uBoatC[6];
        ${PENCIL}
        void main() {
          vec2 p = vW.xz;
          float far = length(p - cameraPosition.xz);
          float sw = 0.5 * sin(p.x * 0.35 + p.y * 0.12 + uTime * 0.5) + 0.28 * sin(p.x * 0.83 - uTime * 0.8 + p.y * 0.4) + 0.12 * sin(p.x * 2.1 + uTime * 1.2 + p.y * 1.3);
          float h = p.y + sw * 0.3;
          // green-blue in the harbour, a deeper blue out in the bay
          vec3 local = mix(vec3(0.07, 0.5, 0.55), vec3(0.07, 0.25, 0.62), smoothstep(8.0, 110.0, far));
          // What the water mirrors. A line from the eye to the water, turned over, goes on up to the housefronts:
          // where it clears the lip of the quay and meets a wall, the water is drawn with that house's pencil,
          // broken by the ripples.
          vec3 eye = cameraPosition; vec2 run = p - eye.xz;
          float ripple = smoothstep(-0.25, 0.25, sin(p.y * 5.5 + sw * 6.0 + uTime * 0.9) + 0.5 * sin(p.y * 13.0 - uTime * 1.6 + p.x));
          if (run.y < -0.5) {
            float s = (-5.4 - p.y) / run.y, lip = eye.y * (3.5 - p.y) / run.y;
            float X = p.x + run.x * s + (0.25 + 0.12 * s) * sin(p.y * 3.3 + sw * 4.0 + uTime * 1.1), Y = eye.y * s + 0.3 * sin(p.x * 2.1 + uTime * 0.7);
            vec3 wall = vec3(0.0); float hit = 0.0;
            for (int i = 0; i < 8; i++) {
              float inX = step(uHX[i], X) * step(X, uHX[i] + uHW[i]);
              hit += inX * step(1.0, Y) * step(Y, uHH[i] + 1.3);
              wall += inX * mix(uHC[i], vec3(0.72, 0.36, 0.26), step(uHH[i], Y));
            }
            local = mix(local, wall, clamp(hit, 0.0, 1.0) * step(1.2, lip) * ripple * 0.82);
          }
          for (int i = 0; i < 6; i++) {
            vec2 toEye = normalize(eye.xz - uBoat[i].xy), q = p - uBoat[i].xy - toEye * 1.3 * uBoat[i].z;
            float al = dot(q, toEye), ac = dot(q, vec2(-toEye.y, toEye.x)) + 0.12 * sin(al * 6.0 + uTime * 1.4);
            float inB = 1.0 - smoothstep(0.7, 1.0, length(vec2(ac / (0.62 * uBoat[i].z), al / (1.5 * uBoat[i].z))));
            local = mix(local, uBoatC[i] * 0.85, inB * 0.62 * (0.55 + 0.45 * ripple));
          }
          float D = clamp(0.4 + 0.22 * sin(p.y * 0.8 + sw * 2.2 + uTime * 0.3) + 0.2 * (1.0 - smoothstep(2.0, 40.0, far)), 0.0, 1.0);
          // darker under the quay's wall
          D = clamp(D + 0.4 * (1.0 - smoothstep(3.5, 5.1, p.y)) * step(abs(p.x), 18.0) * step(3.5, p.y), 0.0, 1.0);
          // where the sun catches it the paper is left bare
          float bare = smoothstep(0.6, 0.78, pcNoise(vec3(p * vec2(0.45, 2.0) + vec2(uTime * 0.2, 0.0), uTime * 0.25))) * (1.0 - 0.6 * smoothstep(60.0, 300.0, far));
          float tooth = pcTooth(vec3(p.x, 0.0, p.y) * 0.6);
          vec3 left = vec3(1.0);
          left *= mix(vec3(1.0), local, clamp((0.4 + 0.35 * D) * (0.5 + 0.85 * tooth) * (1.0 - 0.85 * bare), 0.0, 1.0));
          // water is drawn one way only, level; its darks are a second pencil along the same strokes
          left *= mix(vec3(1.0), local, clamp(pcStrokes(h, 0.5 + 0.35 * D) * (0.6 + 0.7 * tooth) * (1.0 - 0.9 * bare), 0.0, 1.0));
          left *= mix(vec3(1.0), vec3(0.08, 0.13, 0.5), clamp(pcStrokes(h + 0.37 + 0.2 * sin(p.x * 0.6), clamp((D - 0.42) * 1.5, 0.0, 0.7)) * (0.5 + 0.7 * tooth) * 0.85, 0.0, 1.0));
          gl_FragColor = vec4(left, 1.0);
        }`,
    }));
    sea.frustumCulled = false;
    group.add(sea);
  }

  // ====================================================================================================== quay and pier
  say('Drawing the quay');
  await turn();
  {
    // the quay: pale stone on top, its wall weathered and green where the tide reaches
    const w = QUAY.x1 - QUAY.x0, d = QUAY.z1 - QUAY.z0, g = block(w, 1.8, d, 0.07, 0.4).translate((QUAY.x0 + QUAY.x1) / 2, QUAY.y - 0.95, (QUAY.z0 + QUAY.z1) / 2);
    hue(g, (x, y, z, i, nx, ny) => (ny > 0.6 ? (noise(x / 2.2, z / 2.2) > 0.25 ? '#e6d6b4' : '#eee2c6') : y < 0.3 ? '#74875a' : y < 0.5 ? '#a99f78' : '#cdb994'));
    fieldBy(g, (x, y, z) => [x * 0.55 + z * 0.84 + y * 0.9, -x * 0.8 + z * 0.5 + y * 0.7]);
    line.add(g);
    // its coping: a row of big stones along the lip
    for (let x = QUAY.x0 + 0.6; x < QUAY.x1; x += 1.2) if (x < PIER.x0 - 0.2 || x > PIER.x1 + 0.2) line.add(put(knead(block(1.14, 0.2, 0.62, 0.05, 0.2), 0.012, 3, seed++), x, QUAY.y + 0.02, QUAY.z1 - 0.3), pick(['#f1e8d2', '#e9dcc0', '#efe4ca']), [0.4, 1, 0.9]);
    // iron rings and bollards to make fast to
    for (const x of [-15.6, -12.4, -9.2, -6, -2.8, 0.4, 3.6, 6.3, 12.2, 15.4]) {
      line.add(put(turned([[0, 0], [0.17, 0], [0.19, 0.06], [0.12, 0.12], [0.12, 0.36], [0.2, 0.42], [0.2, 0.5], [0.1, 0.56], [0, 0.56]], 14), x, QUAY.y + 0.1, QUAY.z1 - 0.3), '#3d4654', [0.2, 1, 0.3]);
      colliders.push({ x, z: QUAY.z1 - 0.3, r: 0.22, h: 0.7 });
    }
    // the pier: planks on beams on piles
    for (let z = PIER.z0 + 0.2; z < PIER.z1; z += 0.4) line.add(put(knead(block(PIER.x1 - PIER.x0 + 0.1 * rand(), 0.12, 0.37, 0.035, 0.25), 0.006, 5, seed++), (PIER.x0 + PIER.x1) / 2, QUAY.y - 0.06 + (rand() - 0.5) * 0.012, z, (rand() - 0.5) * 0.03), pick(WOOD), [0.1, 0.3, 1], [1, 0.4, 0.2]);
    for (const x of [PIER.x0 + 0.3, PIER.x1 - 0.3]) line.add(roll([V(x, QUAY.y - 0.22, PIER.z0), V(x, QUAY.y - 0.22, PIER.z1)], 0.09, { around: 7, every: 0.6 }), '#7a5233');
    for (let z = PIER.z0 + 1.2; z < PIER.z1 + 0.3; z += 2.4) for (const x of [PIER.x0 - 0.05, PIER.x1 + 0.05]) {
      line.add(knead(roll([V(x, -0.3, z), V(x, QUAY.y + 0.5, z)], 0.13, { around: 9, every: 0.25 }), 0.01, 4, seed++), '#7a5233', [0.9, 0.1, 0.4], [0.1, 1, 0.1]);
      line.add(put(ball(0.14, 2).scale(1, 0.5, 1), x, QUAY.y + 0.55, z), '#5f3f27');
    }
    // he can't walk off the edge: walls he doesn't see
    const wall = (x0, z0, x1, z1) => { boxes.push({ x: (x0 + x1) / 2, y: 4, z: (z0 + z1) / 2, hx: Math.abs(x1 - x0) / 2 + 0.08, hy: 8, hz: Math.abs(z1 - z0) / 2 + 0.08, turn: 0 }); walls.push([Math.min(x0, x1) - 0.3, Math.min(z0, z1) - 0.3, Math.max(x0, x1) + 0.3, Math.max(z0, z1) + 0.3]); };
    wall(QUAY.x0, QUAY.z1 - 0.72, PIER.x0 + 0.25, QUAY.z1 - 0.72); wall(PIER.x1 - 0.25, QUAY.z1 - 0.72, QUAY.x1, QUAY.z1 - 0.72);
    wall(PIER.x0 + 0.25, PIER.z0 - 0.7, PIER.x0 + 0.25, PIER.z1 - 0.3); wall(PIER.x1 - 0.25, PIER.z0 - 0.7, PIER.x1 - 0.25, PIER.z1 - 0.3); wall(PIER.x0, PIER.z1 - 0.3, PIER.x1, PIER.z1 - 0.3);
    wall(QUAY.x0 + 0.4, QUAY.z0, QUAY.x0 + 0.4, QUAY.z1); wall(QUAY.x1 - 0.4, QUAY.z0, QUAY.x1 - 0.4, QUAY.z1);
  }

  // ========================================================================================================= the houses
  say('Colouring the houses');
  await turn();
  const kit = { line, both, flat, rand, pick, next: () => seed++, colliders, boxes, QUAY, FRONT, own, moving, time };
  const tops = buildHouses(kit);
  say('Paving the quay');
  await turn();
  buildQuayside(kit);
  // Smoke from three of the chimneys, drawn the way a pencil draws it: two thin lines that curl up out of the pot,
  // widening as they go and leaning with the wind, fading out at both ends. Each is a spiral that turns about its
  // own axis, which is what makes it seem to rise.
  {
    [1, 3, 6].forEach((hi, c) => {
      const o = HOUSES[hi], gable = o.gable ?? true, rh = gable ? o.w * 0.44 : 1.5, sx = o.x + o.w * 0.28, sy = QUAY.y + o.h + (gable ? rh * 0.55 : rh * 0.85) + 0.9, sz = FRONT - 2.2;
      const lean = new THREE.Group();
      lean.position.set(sx, sy, sz);
      lean.rotation.z = -0.42;
      group.add(lean);
      [[3.4, 2.2, 0.36, '#aeb0c2', 0], [2.7, 1.6, 0.27, '#c2c3d1', 2.4]].forEach(([tall, turns, wide, colour, from], k) => {
        const wisp = createBatch(pencil.flat), pts = Array.from({ length: 64 }, (_, i) => { const t = i / 63, ang = from + t * turns * TAU, r = 0.03 + wide * t ** 1.25; return V(Math.cos(ang) * r, tall * t, Math.sin(ang) * r); });
        wisp.add(roll(pts, (t) => 0.004 + 0.03 * Math.sin(Math.PI * t) ** 0.7, { around: 5, every: 0.07 }), colour);
        const mesh = wisp.build();
        mesh.castShadow = mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        lean.add(mesh);
        const speed = (k ? -1.25 : -1.0) * (1 + 0.15 * c);
        moving.push(() => { mesh.rotation.y = time.value * speed; mesh.scale.y = 1 + 0.06 * Math.sin(time.value * 0.8 + c + k * 2); });
      });
    });
  }

  // ============================================================================================ bunting, lamps and things
  const LAMPS = [[-11, QUAY.z1 - 0.85], [0.2, QUAY.z1 - 0.85], [14, QUAY.z1 - 0.85]];
  for (const [x, z] of LAMPS) {
    line.add(knead(roll([V(x, QUAY.y, z), V(x, QUAY.y + 3.3, z)], (t) => 0.075 - 0.03 * t, { around: 8, every: 0.3 }), 0.004, 5, seed++), '#2f5248', [0.9, 0.1, 0.4], [0.1, 1, 0.1]);
    line.add(put(turned([[0, 0], [0.16, 0], [0.2, 0.08], [0.1, 0.16], [0, 0.16]], 12), x, QUAY.y, z), '#2f5248');
    line.add(put(turned([[0, 0], [0.1, 0], [0.17, 0.3], [0.17, 0.34], [0, 0.34]], 6), x, QUAY.y + 3.3, z), '#f6dc8a');
    line.add(put(turned([[0, 0], [0.22, 0], [0.05, 0.16], [0, 0.2]], 6), x, QUAY.y + 3.64, z), '#2f5248');
    colliders.push({ x, z, r: 0.16, h: 3.5 });
  }
  {
    // strings of flags from the housetops to the lamps
    const FLAGS = ['#e8554e', '#f2c12b', '#4f9bd8', '#59a640', '#f08a3c', '#f8f4ea', '#b07ad6'];
    let n = 0;
    for (const [hx, lamp] of [[-9.5, 0], [-2.2, 0], [-2.2, 1], [5.3, 1], [5.3, 2], [12.9, 2]]) {
      const a = V(hx, tops[hx] - 0.25, FRONT + 0.05), b = V(LAMPS[lamp][0], QUAY.y + 3.5, LAMPS[lamp][1]), len = a.distanceTo(b), at = (t) => a.clone().lerp(b, t).add(V(0, -1.3 * 4 * t * (1 - t) * (len / 12), 0));
      flat.add(roll(Array.from({ length: 13 }, (_, i) => at(i / 12)), 0.011, { around: 4, every: 0.5 }), '#6a655c');
      const side = b.clone().sub(a).setY(0).normalize(), pos = [], col = [], c = new THREE.Color();
      for (let d = 0.5; d < len - 0.4; d += 0.52) {
        const p = at(d / len), q = at((d + 0.34) / len), tip = p.clone().lerp(q, 0.5).add(V(side.z * 0.05 * Math.sin(n), -0.42, -side.x * 0.05 * Math.sin(n)));
        pos.push(p.x, p.y, p.z, q.x, q.y, q.z, tip.x, tip.y, tip.z);
        c.set(FLAGS[n++ % FLAGS.length]);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      const flags = new THREE.Mesh(field(g), pencil.both);
      flags.castShadow = flags.receiveShadow = true;
      flags.frustumCulled = false;
      group.add(flags);
      // They lift and fall in the breeze. Each flag's point swings out from under its string, a gust running
      // along the line from one end to the other; what it swings out it also rises, being a fixed length.
      const rest = Float32Array.from(pos), P = g.attributes.position, nx = side.z, nz = -side.x, k0 = n * 0.37;
      moving.push(() => {
        const t = time.value;
        for (let i = 0; i < P.count / 3; i++) {
          const gust = 0.55 + 0.45 * Math.sin(t * 0.7 - i * 0.35 + k0), sw = gust * (0.07 + 0.19 * Math.sin(t * 3.4 - i * 0.9 + k0) + 0.07 * Math.sin(t * 7.1 + i * 2.3)), j = (i * 3 + 2) * 3;
          P.array[j] = rest[j] + nx * sw;
          P.array[j + 1] = rest[j + 1] + (sw * sw) / 0.84;
          P.array[j + 2] = rest[j + 2] + nz * sw;
        }
        P.needsUpdate = true;
      });
    }
  }
  // a tree in a ring of stone, with a bench under it
  {
    const tx = -6.4, tz = -1.6, o = V(tx, QUAY.y, tz);
    line.add(roll(ring(V(tx, QUAY.y + 0.18, tz), UP, 0.95, 16), 0.2, { closed: true, around: 7, every: 0.2 }), '#d8c9a8', [0.3, 1, 0.2]);
    line.add(put(ball(0.9, 2).scale(1, 0.12, 1), tx, QUAY.y + 0.2, tz), '#8a6a48');
    line.add(knead(roll([o.clone(), o.clone().add(V(0.1, 1.3, 0)), o.clone().add(V(-0.1, 2.6, 0.1))], (t) => 0.3 - 0.1 * t, { around: 10, every: 0.2 }), 0.02, 3, seed++), '#8a5f3c', [0.9, 0.1, 0.4], [0.1, 1, 0.1]);
    for (const [x, y, z] of [[-1.0, 3.2, 0.2], [1.0, 3.3, -0.1], [0.1, 3.5, 0.9], [0, 3.6, -0.9]]) line.add(roll([o.clone().add(V(-0.1, 2.4, 0.1)), o.clone().add(V(x * 0.6, y - 0.4, z * 0.6)), o.clone().add(V(x, y, z))], (t) => 0.16 - 0.08 * t, { around: 7, every: 0.2 }), '#8a5f3c');
    const GREENS = ['#5fa04a', '#74b356', '#4f8f44', '#8cc063'];
    for (let i = 0; i < 34; i++) {
      const a = rand() * TAU, up = rand() * 1.8 - 0.6, s = Math.sqrt(Math.max(0.08, 1 - (up / 1.7) ** 2)), r = 0.55 + 0.4 * rand();
      const c = o.clone().add(V(Math.cos(a) * 1.75 * s * (i < 6 ? 0.3 : 1), 4.1 + up * 1.05, Math.sin(a) * 1.75 * s * (i < 6 ? 0.3 : 1))), from = c.clone().addScaledVector(SUN, r * 2.4);
      const g = knead(ball(r, 3).scale(1, 0.82, 1), r * 0.07, 2.2 / r, seed++).translate(c.x, c.y, c.z);
      fieldBy(g, (px, py, pz) => [Math.hypot(px - from.x, py - from.y, pz - from.z) * 1.1, px * 0.6 - py * 0.5 + pz * 0.62]);
      line.add(g, pick(GREENS));
    }
    colliders.push({ x: tx, z: tz, r: 1.15, h: 3 });
    const bx = -2.6, bz = QUAY.z1 - 1.7;
    line.add(block(1.9, 0.09, 0.5, 0.03, 0.2).translate(bx, QUAY.y + 0.5, bz), '#3f7f6a', [0.1, 0.3, 1]);
    line.add(block(1.9, 0.5, 0.08, 0.03, 0.2).rotateX(-0.2).translate(bx, QUAY.y + 0.86, bz - 0.26), '#3f7f6a', [0.1, 1, 0.3]);
    for (const s of [-1, 1]) line.add(block(0.09, 0.5, 0.5, 0.03, 0.2).translate(bx + s * 0.8, QUAY.y + 0.25, bz), '#3a3f4a');
    colliders.push({ x: bx - 0.5, z: bz, r: 0.42, h: 1 }, { x: bx + 0.5, z: bz, r: 0.42, h: 1 });
  }
  // the market stall: fruit in boxes under a striped awning; and a cat
  {
    const sx = 3.1, sz = -2.4, y = QUAY.y;
    line.add(block(2.5, 0.1, 1.15, 0.03, 0.25).translate(sx, y + 0.85, sz), '#b98a52', [0.1, 0.3, 1]);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      line.add(roll([V(sx + a * 1.15, y, sz + b * 0.5), V(sx + a * 1.15, y + (b < 0 ? 2.5 : 2.15), sz + b * 0.5)], 0.04, { around: 6, every: 0.5 }), '#8a5a34');
    }
    const a = new THREE.PlaneGeometry(2.8, 1.5, 10, 1).toNonIndexed(), ap = a.attributes.position, col = [], c1 = new THREE.Color('#e8554e'), c2 = new THREE.Color(WHITE);
    for (let i = 0; i < ap.count; i += 3) { const c = Math.floor(((ap.getX(i) + ap.getX(i + 1) + ap.getX(i + 2)) / 3 + 1.4) / 0.28) % 2 ? c1 : c2; col.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b); }
    a.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    both.add(field(a.rotateX(-Math.PI / 2 + 0.32).translate(sx, y + 2.36, sz), [0.05, 0.4, 1], [1, 0.3, 0.2]));
    [['#f08a3c', -0.8], ['#f2c12b', 0], ['#d9453a', 0.8]].forEach(([fruit, off], k) => {
      line.add(knead(block(0.68, 0.22, 0.8, 0.03, 0.2), 0.006, 5, seed++).rotateX(0.18).translate(sx + off, y + 1.02, sz), WOOD[k]);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) line.add(ball(0.085, 1).translate(sx + off + (i - 1.5) * 0.15 + (rand() - 0.5) * 0.03, y + 1.16 + (1.5 - j) * 0.03 + 0.03 * rand(), sz + (j - 1.5) * 0.17), fruit);
    });
    boxes.push({ x: sx, y: y + 0.6, z: sz, hx: 1.3, hy: 0.7, hz: 0.65, turn: 0 });
    const crate = [5.2, -1.3];
    line.add(knead(block(0.72, 0.62, 0.62, 0.04, 0.2), 0.008, 4, seed++).translate(crate[0], y + 0.31, crate[1]), '#a8763f', [0.1, 1, 0.1], [1, 0.1, 0.3]);
    colliders.push({ x: crate[0], z: crate[1], r: 0.45, h: 0.7 });
    const cat = (g, c = '#e8923c') => line.add(g.rotateY(0.6).translate(crate[0], y + 0.62, crate[1]), c);
    cat(ball(1, 3).scale(0.17, 0.22, 0.2).translate(0, 0.2, 0));
    cat(ball(0.13, 3).translate(0, 0.5, 0.08));
    for (const s of [-1, 1]) cat(turned([[0, 0], [0.05, 0], [0, 0.1]], 5).translate(s * 0.075, 0.59, 0.06));
    // its tail lies round it, and now and then flicks
    const tail = own((b) => b.line.add(roll([V(0, 0, 0), V(0.2, -0.01, -0.04), V(0.28, 0.01, 0.14)], 0.035, { around: 6, every: 0.06 }), '#e8923c'));
    tail.position.set(crate[0] - 0.16 * Math.sin(0.6), y + 0.67, crate[1] - 0.16 * Math.cos(0.6));
    moving.push(() => { const t = time.value; tail.rotation.y = 0.6 + 0.16 * Math.sin(t * 1.1) + 0.32 * Math.sin(t * 6.5) * Math.max(0, Math.sin(t * 0.55)) ** 6; });
    cat(ball(0.05, 1).scale(1.3, 0.8, 0.8).translate(0, 0.46, 0.19), WHITE);
  }
  // by the root of the pier: barrels, a coil of rope, buoys
  {
    const y = QUAY.y;
    for (const [x, z, s] of [[6.3, -0.4, 1], [5.6, 0.2, 0.85]]) {
      line.add(put(knead(turned([[0, 0], [0.26, 0], [0.33, 0.2], [0.34, 0.42], [0.33, 0.64], [0.26, 0.84], [0, 0.84]], 16), 0.006, 5, seed++), x, y, z, 0, s), '#b98a52', [0.9, 0.1, 0.4], [0.05, 1, 0.05]);
      for (const h of [0.2, 0.64]) line.add(roll(ring(V(x, y + h * s, z), UP, 0.335 * s, 14), 0.022, { closed: true, around: 5, every: 0.1 }), '#3d4654');
      colliders.push({ x, z, r: 0.36 * s, h: 0.9 });
    }
    for (let i = 0; i < 4; i++) line.add(roll(ring(V(12.9, y + 0.06 + i * 0.085, 2.3), UP, 0.36 - i * 0.03, 14), 0.05, { closed: true, around: 6, every: 0.08 }), '#d8c79a', [0.2, 1, 0.2]);
    for (const [x, z, r, c] of [[11.8, 2.5, 0.22, '#f08a3c'], [12.25, 2.6, 0.18, '#e8554e'], [12.0, 2.1, 0.2, WHITE]]) line.add(put(knead(ball(r, 3), 0.008, 5, seed++), x, y + r * 0.9, z), c);
  }
  // the lighthouse, at the end of the quay: red and white in bands on a foot of stone, a door up two steps and three
  // little windows, an iron gallery, and the lantern under its red cap
  {
    const x = -15.3, z = 0.3, y0 = QUAY.y, FOOT = 0.45, TALL = 6.6, BANDS = 5, RH = TALL / BANDS, rad = (h) => 1.45 - 0.5 * (h / TALL), faces = 0.85, IRON = '#3d4654';
    /** Puts a piece made for a wall that faces +z on the tower, at height h, round from the door by `by`. */
    const P = (g, h, by = 0, out = 0) => g.translate(0, 0, rad(h) + out).rotateY(faces + by).translate(x, y0 + FOOT + h, z);
    line.add(put(knead(turned([[0, 0], [1.85, 0], [1.9, 0.12], [1.9, FOOT - 0.1], [1.75, FOOT], [0, FOOT]], 26), 0.012, 2, seed++), x, y0, z), '#d8c9a8', [0.3, 1, 0.2], [-0.8, 0.5, 0.3]);
    for (let i = 0; i < BANDS; i++) {
      const r0 = rad(i * RH), r1 = rad((i + 1) * RH);
      line.add(put(knead(turned([[0, 0], [r0, 0], [(r0 + r1) / 2 + 0.012, RH / 2], [r1, RH], [0, RH]], 32), 0.006, 3, seed++), x, y0 + FOOT + i * RH, z), i % 2 ? WHITE : '#e8554e', [0.3, 1, 0.15], [-0.8, 0.5, 0.3]);
    }
    // its door, and the steps up to it
    line.add(P(arched(0.9, 1.66, 0.3), 0, 0, -0.08), WHITE);
    line.add(P(arched(0.64, 1.48, 0.3), 0, 0, -0.05), '#3f6f8a', [0.05, 1, 0.05]);
    line.add(P(ball(0.045, 1), 0.72, 0, 0.12).translate(0, 0, 0), '#e3b54a');
    line.add(P(block(1.2, 0.24, 0.5, 0.04, 0.2).translate(0, 0.12, 0), -FOOT, 0, 0.62), '#e3d8c2', [0.3, 1, 0.9]);
    line.add(P(block(1.0, 0.2, 0.34, 0.04, 0.2).translate(0, 0.32, 0), -FOOT, 0, 0.52), '#d8c9a8', [0.3, 1, 0.9]);
    // windows up the stair
    for (const [h, by] of [[3.3, 0], [2.0, -1.7], [4.8, 1.5]]) {
      line.add(P(arched(0.5, 0.74, 0.2), h, by, -0.03), WHITE);
      line.add(P(arched(0.34, 0.6, 0.2), h + 0.06, by, 0), '#5f7fa6', [0.5, 1, 0], [-0.5, 1, 0]);
    }
    // the gallery: a deck on a flared collar, a rail of iron round it
    const top = y0 + FOOT + TALL, deck = top + 0.14;
    line.add(put(turned([[0, 0], [rad(TALL) + 0.03, 0], [1.4, 0.22], [1.5, 0.22], [1.5, 0.36], [0, 0.36]], 26), x, top - 0.22, z), IRON, [0.3, 1, 0.2]);
    for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; line.add(roll([V(x + Math.cos(a) * 1.42, deck, z + Math.sin(a) * 1.42), V(x + Math.cos(a) * 1.42, deck + 0.64, z + Math.sin(a) * 1.42)], 0.028, { around: 5, every: 1 }), IRON); }
    for (const h of [0.34, 0.64]) line.add(roll(ring(V(x, deck + h, z), UP, 1.42, 26), 0.024, { closed: true, around: 5, every: 0.15 }), IRON);
    // the lantern: glass in iron bars, and the lamp in it
    line.add(put(turned([[0, 0], [0.8, 0], [0.8, 0.24], [0, 0.24]], 20), x, deck, z), WHITE, [0.3, 1, 0.2]);
    line.add(put(turned([[0, 0], [0.66, 0], [0.66, 1.0], [0, 1.0]], 20), x, deck + 0.24, z), '#f6dc8a', [0.4, 1, 0.3], [-0.6, 1, 0.3]);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; line.add(roll([V(x + Math.cos(a) * 0.67, deck + 0.24, z + Math.sin(a) * 0.67), V(x + Math.cos(a) * 0.67, deck + 1.24, z + Math.sin(a) * 0.67)], 0.026, { around: 5, every: 1 }), IRON); }
    line.add(roll(ring(V(x, deck + 0.74, z), UP, 0.67, 20), 0.02, { closed: true, around: 5, every: 0.15 }), IRON);
    line.add(put(turned([[0, 0], [0.78, 0], [0.78, 0.1], [0, 0.1]], 20), x, deck + 1.24, z), IRON);
    line.add(put(knead(turned([[0, 0], [0.95, 0], [0.92, 0.08], [0.72, 0.34], [0.4, 0.58], [0.13, 0.7], [0, 0.72]], 22), 0.006, 4, seed++), x, deck + 1.34, z), '#e8554e', [0.3, 1, 0.15], [-0.8, 0.5, 0.3]);
    line.add(put(ball(0.11, 2), x, deck + 2.12, z), '#e3b54a');
    flat.add(roll([V(x, deck + 2.2, z), V(x, deck + 2.75, z)], 0.016, { around: 5, every: 1 }), IRON);
    colliders.push({ x, z, r: 1.95, h: 9 });
  }

  // ============================================================================================================ the boats
  say('Mooring the boats');
  await turn();
  {
    const boat = (x, z, yaw, hullColour, trim, { mast = false, size = 1 } = {}) => {
      if (moored < 6) { mirror.uBoat.value[moored].set(x, z, size); mirror.uBoatC.value[moored++].set(hullColour); }
      const g = own((b) => {
        const hull = ball(1, 4).scale(0.62, 0.44, 1.45), p = hull.attributes.position, inside = [];
        for (let i = 0; i < p.count; i++) { const up = p.getY(i) > 1e-4; inside.push(up); if (up) p.setY(i, -0.22 * Math.max(0, 1 - (p.getX(i) / 0.62) ** 2 - (p.getZ(i) / 1.45) ** 2)); }
        hull.computeVertexNormals();
        knead(hull, 0.01, 3, seed++);
        hue(hull, (px, py, pz, i) => (inside[i] ? '#ead9b4' : py < -0.3 ? '#8a3a30' : hullColour));
        b.line.add(field(hull, [0.15, 1, 0.1], [0.3, 0.4, 1]));
        b.line.add(roll(Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * TAU; return V(Math.cos(a) * 0.62, 0.01, Math.sin(a) * 1.45); }), 0.05, { closed: true, around: 6, every: 0.1 }), trim);
        b.line.add(block(1.04, 0.06, 0.26, 0.025, 0.1).translate(0, -0.04, -0.25), '#b98a52');
        b.line.add(block(0.9, 0.06, 0.24, 0.025, 0.1).translate(0, -0.04, 0.6), '#b98a52');
        if (mast) {
          b.line.add(roll([V(0, -0.15, 0.25), V(0, 3.4, 0.25)], 0.04, { around: 6, every: 0.5 }), '#96673c');
          b.line.add(roll([V(0, 0.55, 0.25), V(0, 0.62, -1.3)], 0.03, { around: 6, every: 0.5 }), '#96673c');
          // its sail, loosely furled along the boom
          b.line.add(knead(roll([V(0, 0.68, 0.15), V(0, 0.72, -0.5), V(0, 0.7, -1.2)], (t) => 0.1 - 0.03 * t, { around: 8, every: 0.12 }), 0.012, 6, seed++), WHITE);
          const flag = new THREE.BufferGeometry();
          flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 3.4, 0.25, 0, 3.12, 0.25, 0, 3.26, -0.3], 3));
          b.both.add(flag, '#e8554e');
        } else {
          b.line.add(roll([V(0.22, 0.02, -1.0), V(0.3, 0.06, 0.0), V(0.34, 0.04, 0.9)], 0.028, { around: 6, every: 0.3 }), '#96673c');
          b.line.add(ball(1, 2).scale(0.085, 0.02, 0.2).translate(0.2, 0.02, -1.12), '#96673c');
        }
      });
      g.scale.setScalar(size);
      g.position.set(x, 0.3 * size, z);
      g.rotation.order = 'YXZ';
      g.rotation.y = yaw;
      const ph = rand() * 6;
      moving.push(() => { const t = time.value; g.position.y = 0.3 * size + 0.035 * Math.sin(t * 1.1 + ph); g.rotation.x = 0.03 * Math.sin(t * 0.9 + ph); g.rotation.z = 0.05 * Math.sin(t * 0.7 + ph * 2); });
      // its painter, made fast ashore
      flat.add(roll([V(x + Math.sin(yaw) * 1.4 * size, 0.42, z + Math.cos(yaw) * 1.4 * size), V(x + Math.sin(yaw) * 1.9 * size, 0.55, z + Math.cos(yaw) * 1.9 * size - 0.2), V(x + Math.sin(yaw) * 2.2, QUAY.y + 0.2, QUAY.z1 - 0.3)], 0.012, { around: 4, every: 0.5 }), '#8a7a5a');
    };
    boat(-12.4, 5.4, Math.PI + 0.15, '#e8554e', WHITE);
    boat(-8.6, 5.8, Math.PI - 0.2, '#4f9bd8', '#f2c12b', { mast: true, size: 1.2 });
    boat(-4.2, 5.3, Math.PI + 0.1, '#59a640', WHITE);
    boat(0.2, 5.7, Math.PI - 0.12, WHITE, '#e8554e');
    boat(4.0, 5.4, Math.PI + 0.25, '#f2c12b', '#3f6f9a');
    boat(14.4, 5.8, Math.PI - 0.18, '#3f6f9a', WHITE, { mast: true });
    // out in the bay, boats under sail
    for (const [x, z, s, c] of [[-46, 78, 1, WHITE], [38, 120, 1.3, '#f6e2b0'], [-130, 210, 1.6, WHITE], [95, 260, 1.8, WHITE], [-10, 170, 1.2, '#f2b8a8']]) {
      const g = own((b) => {
        b.line.add(ball(1, 3).scale(1.1, 0.7, 3.4).translate(0, 0.25, 0), '#7a5233');
        const sail = new THREE.BufferGeometry();
        sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.9, 0.9, 0, 0.9, -2.8, 0.25, 7.6, 0.8, 0, 1.0, 1.1, 0.25, 7.2, 0.9, 0, 1.0, 3.3], 3));
        b.both.add(sail, c, [0.2, 1, 0.3], [0, 0.4, 1]);
      });
      g.scale.setScalar(s);
      g.position.set(x, 0, z);
      g.rotation.y = rand() * 0.8 + 1.2;
      moving.push(() => { g.rotation.z = 0.05 * Math.sin(time.value * 0.5 + x); });
    }
  }

  // ====================================================================================== behind the town, and far off
  say('Shading the hills');
  await turn();
  {
    buildHills(kit);
    // the church's tower, over the roofs
    buildTower(kit);
    buildMountains({ group, pencil });
    // across the bay and up the coast: headlands, blue with distance
    for (const [x, z, r, tall, c] of [[-420, 620, 230, 0.36, '#9fa6dc'], [260, 780, 300, 0.3, '#a9aee2'], [-760, 140, 240, 0.34, '#a6b4e0'], [700, 60, 260, 0.3, '#a6b4e0']]) {
      line.add(put(knead(ball(r, 4).scale(1, tall, 0.6), r * 0.07, 3 / r, seed++), x, -r * tall * 0.15, z), c, [0.4, 1, 0.3], [-0.7, 1, 0.2]);
    }
  }

  // ============================================================================================================= gulls
  {
    const gull = (b) => {
      b.line.add(ball(1, 3).scale(0.11, 0.1, 0.24), WHITE);
      b.line.add(ball(0.07, 2).translate(0, 0.07, 0.2), WHITE);
      b.line.add(turned([[0, 0], [0.025, 0], [0, 0.09]], 5).rotateX(Math.PI / 2).translate(0, 0.06, 0.26), '#f2a224');
      for (const s of [-1, 1]) b.line.add(ball(0.014, 1).translate(s * 0.045, 0.1, 0.24), '#16130f');
    };
    // two that have landed
    for (const [x, y, z, yaw] of [[-2.8, QUAY.y + 0.74, QUAY.z1 - 0.3, 2.4], [PIER.x1 + 0.05, QUAY.y + 0.72, PIER.z0 + 6, -1.2]]) {
      const g = own((b) => { gull(b); for (const s of [-1, 1]) b.line.add(ball(1, 2).scale(0.03, 0.07, 0.2).translate(s * 0.1, 0.02, -0.05), '#9aa3ad'); });
      g.position.set(x, y, z); g.rotation.y = yaw;
    }
    const wing = (s) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.1, 0, 0, -0.1, s * 0.34, 0.05, 0, s * 0.34, 0.05, 0, 0, 0, -0.1, s * 0.68, -0.02, -0.08], 3)); g.computeVertexNormals(); return hue(field(g), (x) => (Math.abs(x) > 0.5 ? '#6f7882' : '#f8f4ea')); };
    const flock = Array.from({ length: 6 }, (_, i) => {
      const bird = own(gull), l = new THREE.Mesh(wing(-1), pencil.both), r = new THREE.Mesh(wing(1), pencil.both);
      l.position.y = r.position.y = 0.05;
      bird.add(l, r);
      return { bird, l, r, cx: -4 + rand() * 12, cz: 2 + rand() * 12, rad: 6 + rand() * 9, y: 7 + rand() * 6, speed: (0.18 + 0.1 * rand()) * (i % 2 ? 1 : -1), ph: rand() * 6 };
    });
    moving.push(() => flock.forEach((b) => {
      const a = b.ph + time.value * b.speed, flap = Math.sin(time.value * 5.2 + b.ph * 3) * (0.5 + 0.5 * Math.sin(time.value * 0.3 + b.ph));
      b.bird.position.set(b.cx + Math.cos(a) * b.rad, b.y + 0.6 * Math.sin(a * 2 + b.ph), b.cz + Math.sin(a) * b.rad);
      b.bird.rotation.order = 'YXZ';
      b.bird.rotation.y = -a + (b.speed > 0 ? 0 : Math.PI);
      b.bird.rotation.z = b.speed > 0 ? 0.22 : -0.22;
      b.l.rotation.z = -0.5 * flap; b.r.rotation.z = 0.5 * flap;
    }));
  }

  group.add(line.build(), both.build(), flat.build());
  scene.add(group);

  // ============================================================================================================ the light
  // A bright morning: the sun high over the left shoulder, so the housefronts are in the light and every shadow
  // is a second, cooler pencil.
  const light = new THREE.DirectionalLight('#ffffff', Math.PI * 1.25);
  light.position.copy(SUN).multiplyScalar(60);
  light.target.position.set(0, 0, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(4096, 4096);
  Object.assign(light.shadow.camera, { left: -30, right: 30, top: 26, bottom: -22, near: 5, far: 140 });
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  light.shadow.radius = 3;
  scene.add(light, light.target, new THREE.AmbientLight('#ffffff', Math.PI * 0.27), new THREE.HemisphereLight('#ffffff', '#000000', Math.PI * 0.2));

  return {
    ground,
    field: { cells: 256, size: 44, centre: [0, 2.5] },
    colliders, boxes,
    start: { x: 9, z: 11.2, yaw: Math.PI + 0.3 },
    road: [[9, 10.5], [9, 6], [8.6, 3.2], [6.6, 1.6], [3, 1.2], [-3, 0.5], [-8, 1.2], [-12, 0.2]],
    open: (x, z) => walls.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1),
    follow: { pitch: 0.02, want: 9.2, side: 1.2, lift: 2.0 },
    fov: 42, far: 4000, sun: SUN,
    counts: { pieces: line.count + both.count + flat.count },
    update(dt, feet, camera) { time.value += dt; for (const f of moving) f(dt, camera); },
  };
}
