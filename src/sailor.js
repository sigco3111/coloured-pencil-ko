// The wanderer of this page: a young sailor ashore, in a red beret, a striped jersey, a red neckerchief, blue
// trousers and brown boots, with a canvas bag at his hip. Underneath he is Patch's starter man (his bones, his
// clips, his way of moving), and nothing of that body is drawn. What is drawn is modelled in simple rounded
// pieces, one skin that bends at the joints, each piece with its own pencil and the way its strokes lie.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadMan } from './figure/man.js';
import { ball, block, knead, ring, roll, sstep, turned } from './shape.js';
import { field, hue } from './pencil.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RED = '#e2443c', NAVY = '#2f4f8f', WHITE = '#f8f4ea', SKIN = '#f6c9a4', BLUE = '#4a6fb0', BOOT = '#8a5a34', HAIR = '#7a4f2c', BAG = '#d9b97a';

export async function createFigure(pencil, onProgress) {
  const man = await loadMan({ base: './figure/', onProgress });
  for (const mesh of man.meshes) mesh.visible = false;
  man.object.updateMatrixWorld(true);
  const B = man.bones, names = Object.keys(B), id = Object.fromEntries(names.map((n, i) => [n, i]));
  const at = (name) => new THREE.Vector3().setFromMatrixPosition(B[name].matrixWorld);

  // every piece is given its pencil, the way its strokes lie, and which bones each point of it goes with
  const parts = [], v = new THREE.Vector3();
  function add(g, colour, weigh, a, b, lumps = 0.003) {
    if (lumps) knead(g, lumps, 9, parts.length + 1); else g.computeVertexNormals();
    field(g, a, b);
    hue(g, colour);
    const p = g.attributes.position, si = new Uint16Array(p.count * 4), sw = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const list = weigh(v.fromBufferAttribute(p, i));
      let sum = 0;
      for (const [, w] of list) sum += w;
      list.forEach(([name, w], k) => { si[i * 4 + k] = id[name]; sw[i * 4 + k] = w / sum; });
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    parts.push(g.index ? g.toNonIndexed() : g);
  }
  const only = (name) => () => [[name, 1]];

  // --- the jersey: white, hooped with blue ---
  const P = at('pelvis'), S1 = at('spine_01'), S2 = at('spine_02'), S3 = at('spine_03'), N = at('neck_01'), H = at('Head');
  const mids = [(P.y + S1.y) / 2, (S1.y + S2.y) / 2, (S2.y + S3.y) / 2, (S3.y + N.y) / 2], spine = ['pelvis', 'spine_01', 'spine_02', 'spine_03'];
  const trunk = (p) => {
    if (p.y <= mids[0]) return [['pelvis', 1]];
    for (let i = 0; i < 3; i++) if (p.y < mids[i + 1]) { const t = (p.y - mids[i]) / (mids[i + 1] - mids[i]); return [[spine[i], 1 - t], [spine[i + 1], t]]; }
    return [['spine_03', 1]];
  };
  const hem = P.y - 0.06, top = N.y + 0.02, zc = (P.z + S3.z) / 2, SX = 1.05, SZ = 0.82;
  const profile = [[0, hem + 0.03], [0.19, hem + 0.01], [0.215, hem + 0.03], [0.21, P.y + 0.08], [0.195, S1.y + 0.06], [0.195, S2.y + 0.05], [0.205, S3.y + 0.02], [0.185, S3.y + 0.12], [0.115, N.y - 0.02], [0.08, top], [0, top + 0.01]];
  const girth = (y) => { for (let i = 1; i < profile.length; i++) if (y <= profile[i][1]) { const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]; return r0 + (r1 - r0) * ((y - y0) / (y1 - y0 || 1)); } return 0; };
  add(turned(profile, 28).scale(SX, 1, SZ).translate(P.x, 0, zc), WHITE, trunk, undefined, undefined, 0.004);
  const hoop = (y) => ring(V(P.x, y, zc), V(0, 1, 0), girth(y) + 0.004, 20).map((p) => V(P.x + (p.x - P.x) * SX, p.y, zc + (p.z - zc) * SZ));
  for (let y = hem + 0.07; y < S3.y + 0.1; y += 0.085) add(roll(hoop(y), 0.017, { closed: true, around: 6, every: 0.04, flat: 1.4 }), NAVY, trunk, [0.1, 1, 0.1], undefined, 0);
  // a belt, the strap of his bag across him, the bag, and his neckerchief, knotted in front
  add(roll(hoop(P.y + 0.02), 0.028, { closed: true, around: 6, every: 0.04, flat: 1.4 }), '#6b4a2e', only('pelvis'), undefined, undefined, 0);
  add(roll([V(P.x - 0.17, S3.y + 0.13, zc + 0.02), V(P.x - 0.03, S2.y + 0.08, zc + 0.175), V(P.x + 0.15, S1.y + 0.0, zc + 0.16), V(P.x + 0.24, P.y + 0.03, zc + 0.02)], 0.02, { around: 6, every: 0.04 }), '#8a6a48', trunk, undefined, undefined, 0);
  add(block(0.24, 0.22, 0.1, 0.035, 0.05).translate(P.x + 0.28, P.y - 0.08, zc + 0.01), BAG, only('pelvis'), [0.3, 1, 0], [1, 0.3, 0], 0.004);
  add(block(0.25, 0.1, 0.11, 0.03, 0.05).translate(P.x + 0.282, P.y + 0.0, zc + 0.012), '#c2a468', only('pelvis'), undefined, undefined, 0);
  add(roll(ring(V(P.x, N.y - 0.005, zc + 0.008), V(0, 1, -0.1), 0.1, 14), 0.038, { closed: true, around: 8, every: 0.03 }), RED, only('spine_03'), [1, 0.2, 0.1], [0.1, 1, 0.2]);
  add(ball(0.045, 2).translate(P.x, N.y - 0.03, zc + 0.125), RED, only('spine_03'));
  for (const s of [-1, 1]) add(roll([V(P.x, N.y - 0.04, zc + 0.13), V(P.x + s * 0.05, N.y - 0.1, zc + 0.165), V(P.x + s * 0.075, N.y - 0.17, zc + 0.17)], (t) => 0.03 - 0.012 * t, { around: 7, every: 0.03 }), RED, trunk);

  for (const s of ['l', 'r']) {
    // --- an arm: a hooped sleeve pushed up to the elbow, a bare forearm, a hand ---
    const sh = at(`upperarm_${s}`), el = at(`lowerarm_${s}`), wr = at(`hand_${s}`);
    const upper = el.clone().sub(sh).normalize(), lower = wr.clone().sub(el).normalize(), whole = wr.clone().sub(sh).normalize();
    const arm = (p) => {
      const bend = sstep(-0.07, 0.07, p.clone().sub(el).dot(whole)), root = 0.5 * (1 - sstep(0, 0.1, p.clone().sub(sh).dot(upper)));
      return [[`clavicle_${s}`, root], [`upperarm_${s}`, (1 - bend) * (1 - root)], [`lowerarm_${s}`, bend * (1 - root)]];
    };
    add(roll([sh.clone().addScaledVector(upper, -0.03), sh.clone().lerp(el, 0.5), el.clone().addScaledVector(lower, 0.03)], (t) => 0.082 - 0.008 * t, { around: 12, every: 0.035 }), WHITE, arm, whole.toArray(), [0.7, 0.2, 0.7]);
    add(ball(0.09, 2).translate(sh.x, sh.y + 0.004, sh.z), WHITE, () => [[`clavicle_${s}`, 0.5], [`upperarm_${s}`, 0.5]]);
    for (const t of [0.22, 0.5, 0.78]) add(roll(ring(sh.clone().lerp(el, t), upper, 0.081, 12), 0.016, { closed: true, around: 5, every: 0.03, flat: 1 }), NAVY, arm, upper.toArray(), undefined, 0);
    add(roll(ring(el.clone().addScaledVector(lower, 0.03), lower, 0.074, 12), 0.022, { closed: true, around: 6, every: 0.03 }), WHITE, arm, lower.toArray(), undefined, 0);
    add(roll([el.clone().addScaledVector(lower, 0.02), el.clone().lerp(wr, 0.5), wr.clone().addScaledVector(lower, 0.01)], (t) => 0.062 - 0.012 * t, { around: 10, every: 0.035 }), SKIN, only(`lowerarm_${s}`), lower.toArray(), [0.7, 0.2, 0.7]);
    add(ball(0.066, 3).scale(0.92, 1.2, 0.8).translate(wr.x + lower.x * 0.065, wr.y + lower.y * 0.065, wr.z + lower.z * 0.065), SKIN, only(`hand_${s}`), lower.toArray(), [1, 0, 0.3]);
    add(ball(0.028, 2).translate(wr.x + lower.x * 0.045, wr.y + lower.y * 0.045, wr.z + lower.z * 0.045 + 0.058), SKIN, only(`hand_${s}`), undefined, undefined, 0);

    // --- a leg: wide blue trousers, turned up over a brown boot ---
    const hip = at(`thigh_${s}`), kn = at(`calf_${s}`), an = at(`foot_${s}`), toe = at(`ball_${s}`), leg = an.clone().sub(hip).normalize();
    add(roll([hip.clone().add(V(0, 0.02, 0)), hip.clone().lerp(kn, 0.5), kn, kn.clone().lerp(an, 0.62)], (t) => 0.108 - 0.004 * t, { around: 12, every: 0.04 }), BLUE, (p) => {
      const bend = sstep(-0.08, 0.08, p.clone().sub(kn).dot(leg));
      return [[`thigh_${s}`, 1 - bend], [`calf_${s}`, bend]];
    }, leg.toArray(), [0.9, 0.05, 0.4]);
    const cuff = kn.clone().lerp(an, 0.62), shin = an.clone().sub(kn).normalize();
    add(roll(ring(cuff, shin, 0.106, 12), 0.026, { closed: true, around: 6, every: 0.03, flat: 1 }), '#6f8fc8', only(`calf_${s}`), shin.toArray(), undefined, 0);
    add(roll([cuff, an.clone().add(V(0, 0.03, 0))], 0.082, { around: 10, every: 0.04 }), BOOT, only(`calf_${s}`), shin.toArray(), [1, 0.1, 0.4]);
    const fwd = toe.clone().sub(an).setY(0).normalize(), yaw = Math.atan2(fwd.x, fwd.z);
    add(ball(1, 3).scale(0.095, 0.08, 0.185).rotateY(yaw).translate(an.x + fwd.x * 0.075, 0.085, an.z + fwd.z * 0.075), BOOT, only(`foot_${s}`), [fwd.x, 0.2, fwd.z], [0.3, 1, 0]);
    add(ball(1, 2).scale(0.1, 0.03, 0.19).rotateY(yaw).translate(an.x + fwd.x * 0.075, 0.026, an.z + fwd.z * 0.075), '#4a3423', only(`foot_${s}`), undefined, undefined, 0);
  }

  // --- the head: a round face with red cheeks, a mop of brown hair, and the beret ---
  const R = 0.19, C = V(H.x, H.y + 0.125, H.z + 0.012), head = only('Head');
  const on = (g, x, y, z) => g.translate(C.x + x, C.y + y, C.z + z);
  add(on(ball(R, 4).scale(0.98, 1.0, 0.96), 0, 0, 0), SKIN, head, [0.5, 1, 0.3], [-0.7, 1, 0.2], 0.003);
  add(on(ball(0.028, 2), 0, -0.02, 0.185), '#eeb08e', head);
  add(roll([V(C.x - 0.045, C.y - 0.075, C.z + 0.168), V(C.x, C.y - 0.092, C.z + 0.176), V(C.x + 0.045, C.y - 0.075, C.z + 0.168)], 0.009, { around: 5, every: 0.02 }), '#b0524a', head, undefined, undefined, 0);
  for (const s of [-1, 1]) {
    add(on(ball(0.024, 2), s * 0.066, 0.03, 0.172), '#2a2420', head, undefined, undefined, 0);
    add(on(ball(0.04, 2).scale(1, 0.8, 0.3), s * 0.11, -0.04, 0.148), '#f29a8e', head, undefined, undefined, 0);
    add(on(ball(0.036, 2).scale(0.5, 1, 0.85), s * 0.185, 0.0, 0.0), SKIN, head, undefined, undefined, 0);
  }
  for (let i = 0; i < 13; i++) {
    // hair: lumps round the back and sides, and a fringe
    const a = Math.PI * (0.3 + 1.4 * (i / 12));
    add(on(ball(0.075 + 0.015 * (i % 3), 2), Math.sin(a) * 0.15, 0.05 - 0.05 * Math.abs(Math.cos(a)), Math.cos(a) * 0.14 - 0.02), HAIR, head, [0.3, 1, 0.2], [1, 0.4, 0.3], 0.006);
  }
  for (const x of [-0.09, -0.03, 0.04, 0.1]) add(on(ball(0.05, 2).scale(1, 0.8, 0.7), x, 0.125, 0.135), HAIR, head, [0.3, 1, 0.2], undefined, 0.005);
  {
    const tilt = -0.18, hat = (g) => g.rotateZ(0.2).rotateX(tilt).translate(C.x + 0.02, C.y + 0.14, C.z - 0.02);
    add(hat(ball(1, 4).scale(0.25, 0.085, 0.25)), RED, head, [0.6, 0.4, 0.7], [-0.7, 0.4, 0.5], 0.006);
    add(hat(roll(ring(V(0, -0.045, 0), V(0, 1, 0), 0.17, 16), 0.024, { closed: true, around: 6, every: 0.03 })), '#b5342e', head, undefined, undefined, 0);
    add(hat(roll([V(0, 0.07, 0), V(0.01, 0.12, 0)], 0.014, { around: 5, every: 0.03 })), '#b5342e', head, undefined, undefined, 0);
  }

  const bones = names.map((n) => B[n]), inverses = bones.map((b) => b.matrixWorld.clone().invert());
  const skeleton = new THREE.Skeleton(bones, inverses);
  skeleton.computeBoneTexture();
  skeleton.update = () => {};
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  const body = new THREE.SkinnedMesh(mergeGeometries(parts), pencil.line);
  body.bindMode = THREE.DetachedBindMode;
  body.bind(skeleton, new THREE.Matrix4());
  body.castShadow = body.receiveShadow = true;
  body.frustumCulled = false;
  group.add(body);
  const outer = new THREE.Group();
  outer.add(group);

  const inverse = new THREE.Matrix4(), M = new THREE.Matrix4();
  return {
    man, group: outer,
    simulate() {},
    follow() { group.matrix.copy(man.object.matrixWorld); group.matrixWorldNeedsUpdate = true; },
    /** Takes his pose from the bones as they are now. */
    pose() {
      inverse.copy(man.object.matrixWorld).invert();
      const out = skeleton.boneMatrices;
      for (let i = 0; i < bones.length; i++) M.multiplyMatrices(inverse, bones[i].matrixWorld).multiply(inverses[i]).toArray(out, i * 16);
      skeleton.boneTexture.needsUpdate = true;
    },
  };
}
