import * as THREE from "three";
import { FINGER_STOP, holeAngle } from "@/lib/terminal/dial";
import { DecalAtlas, V, mesh, place, roundedBox, roundedLoft, sectionAtHeight, type LoftSection } from "./kit";
import type { Materials } from "./materials";

/**
 * FeTAp 611 body as horizontal sections: a soft, strongly tapered trapezoid with a
 * steep dial face at the front and a rounded crown on which the handset bridges.
 */
const BODY: LoftSection[] = [
  { y: 0, halfWidth: 0.74, front: 0.9, back: -0.9, radius: 0.26 },
  { y: 0.025, halfWidth: 0.78, front: 0.94, back: -0.94, radius: 0.28 },
  { y: 0.08, halfWidth: 0.8, front: 0.96, back: -0.95, radius: 0.3 },
  { y: 0.18, halfWidth: 0.79, front: 0.9, back: -0.95, radius: 0.31 },
  { y: 0.4, halfWidth: 0.72, front: 0.64, back: -0.94, radius: 0.32 },
  { y: 0.65, halfWidth: 0.65, front: 0.35, back: -0.92, radius: 0.32 },
  { y: 0.82, halfWidth: 0.6, front: 0.16, back: -0.89, radius: 0.31 },
  { y: 0.93, halfWidth: 0.57, front: 0.03, back: -0.84, radius: 0.28 },
  { y: 0.99, halfWidth: 0.53, front: -0.05, back: -0.77, radius: 0.25 },
  { y: 1.025, halfWidth: 0.45, front: -0.13, back: -0.67, radius: 0.2 },
  { y: 1.045, halfWidth: 0.3, front: -0.2, back: -0.56, radius: 0.13 },
  { y: 1.055, halfWidth: 0.12, front: -0.28, back: -0.46, radius: 0.06 },
];
const DIAL_HEIGHT = 0.53;
const DIAL_RADIUS = 0.47;
/** Finger holes sit close together, as on the real Nummernschalter. */
const HOLE_RADIUS = 0.355;
const HOLE_SIZE = 0.07;
const CENTER_RADIUS = 0.28;
/** Capsule centres of the handset (0.235 radius, clear of the crown's flanks). */
const CAPSULE_X = 0.88;

/** Where the handset bridges the crown, relative to the phone origin. */
export const CRADLE = { position: new THREE.Vector3(0, 0.72, -0.4), quaternion: new THREE.Quaternion() };
/** Cradle switch plungers: pressed down by the resting handset, sprung up when it is lifted. */
export const PLUNGER_Y = { rest: 1.03, raised: 1.075 };
/** Where the coiled cord enters the body (right flank, towards the back). */
export const CORD_JACK = new THREE.Vector3(0.77, 0.22, -0.58);
/** Where the cord leaves the handset (mouthpiece end), in handset coordinates. */
export const HANDSET_CORD = new THREE.Vector3(1.1, 0.1, 0);

export function buildHandset(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "handset";
  // Broad, flattened grip arching from capsule to capsule.
  const curve = new THREE.CatmullRomCurve3([V(-0.9, 0.22, 0), V(-0.62, 0.42, 0), V(0, 0.48, 0), V(0.62, 0.42, 0), V(0.9, 0.22, 0)]);
  const handle = new THREE.TubeGeometry(curve, 64, 0.12, 24, false);
  handle.scale(1, 1, 1.3);
  handle.computeVertexNormals();
  mesh(group, handle, m.fern);
  // Domed capsules: widest just above the flat face, flowing up into the grip.
  const capsule = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.226, 0.012), new THREE.Vector2(0.235, 0.05),
    new THREE.Vector2(0.232, 0.12), new THREE.Vector2(0.21, 0.2), new THREE.Vector2(0.165, 0.27), new THREE.Vector2(0.1, 0.315),
    new THREE.Vector2(0.03, 0.335), new THREE.Vector2(0, 0.337),
  ], 56);
  for (const [x, many] of [[-CAPSULE_X, false], [CAPSULE_X, true]] as const) {
    mesh(group, capsule, m.fern, [x, 0, 0]);
    const cap = atlas.decal(0.42, 0.42, (c, w, h) => {
      c.fillStyle = "#3d6a2b";
      c.beginPath(); c.arc(w / 2, h / 2, w * 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#2a4a1f"; c.lineWidth = w * 0.025; c.beginPath(); c.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#0e140c";
      const rings = many ? [0, 0.1, 0.19, 0.28] : [0, 0.12];
      rings.forEach((radius, ring) => {
        const count = ring === 0 ? 1 : 6 * ring;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + ring * 0.3;
          c.beginPath(); c.arc(w / 2 + Math.cos(angle) * radius * w, h / 2 + Math.sin(angle) * radius * h, w * 0.024, 0, Math.PI * 2); c.fill();
        }
      });
    }, 360);
    place(group, cap, [x, -0.002, 0], [Math.PI / 2, 0, 0]);
  }
  // Strain relief where the cord leaves the mouthpiece end.
  mesh(group, new THREE.CylinderGeometry(0.035, 0.045, 0.12, 12), m.black, [1.1, 0.1, 0], [0, 0, Math.PI / 2]);
  return group;
}

export function buildTelephone(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "telephone";
  mesh(group, roundedLoft(BODY), m.fern);
  mesh(group, roundedBox(1.46, 0.02, 1.74, 0.2), m.rubber, [0, 0.008, 0], undefined, false);

  // Cradle switch plungers (Gabelumschalter) on the crown, under the grip.
  const plungers = [-0.32, 0.32].map((x) => mesh(group, roundedBox(0.1, 0.06, 0.14, 0.02), m.fernDark, [x, PLUNGER_Y.rest, -0.4]));

  // The dial sits on the face at the section's front, tilted with the local slope.
  const at = sectionAtHeight(BODY, DIAL_HEIGHT);
  const above = sectionAtHeight(BODY, DIAL_HEIGHT + 0.03), below = sectionAtHeight(BODY, DIAL_HEIGHT - 0.03);
  // Tilt the dial's +y onto the face normal (up and forward).
  const tilt = Math.atan2(above.y - below.y, below.front - above.front);
  const dial = place(group, new THREE.Group(), [0, at.y, at.front], [tilt, 0, 0]);
  const blackGloss = new THREE.MeshPhysicalMaterial({ color: 0x151719, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  mesh(dial, new THREE.CylinderGeometry(DIAL_RADIUS, DIAL_RADIUS + 0.012, 0.05, 72), blackGloss, [0, 0, 0]);
  // Number plate: bold white numerals that show through the finger holes.
  const numbers = atlas.decal(DIAL_RADIUS * 2 - 0.02, DIAL_RADIUS * 2 - 0.02, (c, w, h) => {
    const cx = w / 2, cy = h / 2, r = (HOLE_RADIUS / (DIAL_RADIUS - 0.01)) * (w / 2);
    c.fillStyle = "#16181a"; c.beginPath(); c.arc(cx, cy, w / 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#050606";
    for (const digit of "1234567890") {
      const angle = holeAngle(digit);
      c.beginPath(); c.arc(cx + Math.sin(angle) * r, cy - Math.cos(angle) * r, (HOLE_SIZE / (DIAL_RADIUS - 0.01)) * (w / 2) * 1.02, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "#f1ecdc";
    c.font = `800 ${Math.round(w * 0.095)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    for (const digit of "1234567890") {
      const angle = holeAngle(digit);
      c.fillText(digit, cx + Math.sin(angle) * r, cy - Math.cos(angle) * r + w * 0.005);
    }
  }, 620);
  place(dial, numbers, [0, 0.026, 0], [-Math.PI / 2, 0, 0]);

  // Clear finger wheel with ten closely spaced holes.
  const wheelShape = new THREE.Shape();
  wheelShape.absarc(0, 0, DIAL_RADIUS - 0.018, 0, Math.PI * 2, false);
  wheelShape.holes.push(new THREE.Path().absarc(0, 0, CENTER_RADIUS + 0.006, 0, Math.PI * 2, true));
  for (const digit of "1234567890") {
    const angle = holeAngle(digit);
    wheelShape.holes.push(new THREE.Path().absarc(Math.sin(angle) * HOLE_RADIUS, Math.cos(angle) * HOLE_RADIUS, HOLE_SIZE, 0, Math.PI * 2, true));
  }
  const wheelGeometry = new THREE.ExtrudeGeometry(wheelShape, { depth: 0.028, bevelEnabled: true, bevelSize: 0.008, bevelOffset: -0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 36 });
  wheelGeometry.rotateX(-Math.PI / 2);
  const wheel = place(dial, new THREE.Group(), [0, 0.034, 0]);
  const wheelMesh = mesh(wheel, wheelGeometry, m.acrylic, [0, 0, 0], undefined, false);
  wheelMesh.castShadow = true;

  // Fixed centre plate: small numeral ring, the subscriber's number and the emergency numbers.
  mesh(dial, new THREE.CylinderGeometry(CENTER_RADIUS, CENTER_RADIUS, 0.03, 64), new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.55 }), [0, 0.03, 0], undefined, false);
  const card = atlas.decal(CENTER_RADIUS * 2, CENTER_RADIUS * 2, (c, w, h) => {
    const cx = w / 2, cy = h / 2;
    c.fillStyle = "#2c3034"; c.beginPath(); c.arc(cx, cy, w / 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#e7e2d2";
    c.font = `500 ${Math.round(w * 0.085)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    for (const digit of "1234567890") {
      const angle = holeAngle(digit);
      if (["5", "6"].includes(digit)) continue;
      c.fillText(digit, cx + Math.sin(angle) * w * 0.4, cy - Math.cos(angle) * h * 0.4);
    }
    // Paper strips under the clear cover: own number, then fire brigade and police.
    const box = (x: number, y: number, bw: number, bh: number, value: string) => {
      c.fillStyle = "#f2efe4"; c.fillRect(x * w, y * h, bw * w, bh * h);
      c.fillStyle = "#2f4f9e"; c.font = `${Math.round(bh * h * 0.8)}px "Bradley Hand", "Segoe Script", cursive`;
      c.fillText(value, (x + bw / 2) * w, (y + bh / 2) * h + bh * h * 0.05);
    };
    box(0.26, 0.33, 0.5, 0.12, "38 17 41");
    box(0.26, 0.48, 0.23, 0.11, "112");
    box(0.53, 0.48, 0.23, 0.11, "110");
    c.fillStyle = "#d9d4c4"; c.font = `600 ${Math.round(w * 0.055)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    c.fillText("FEUER", 0.375 * w, 0.66 * h);
    c.fillText("NOTRUF", 0.645 * w, 0.66 * h);
    c.fillStyle = "#4a4f55";
    for (const x of [0.18, 0.82]) { c.beginPath(); c.arc(x * w, 0.47 * h, w * 0.018, 0, Math.PI * 2); c.fill(); }
  }, 1300);
  place(dial, card, [0, 0.0455, 0], [-Math.PI / 2, 0, 0]);

  // Finger stop: a black plastic lever just past four o'clock, stepping down onto the housing.
  const stopDirection = V(Math.sin(FINGER_STOP), 0, -Math.cos(FINGER_STOP));
  const stop = place(dial, new THREE.Group(), [0, 0.1, 0]);
  stop.quaternion.setFromUnitVectors(V(1, 0, 0), stopDirection);
  mesh(stop, roundedBox(0.2, 0.045, 0.075, 0.015), blackGloss, [0.44, 0, 0]);
  mesh(stop, roundedBox(0.07, 0.13, 0.07, 0.015), blackGloss, [0.52, -0.06, 0], [0, 0, -0.35]);

  // Line cord to the wall socket (TAE) behind the desk.
  const lineCord = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.5, 0.12, -0.9), V(0.7, 0.05, -1.4), V(0.3, 0.05, -2.3), V(-0.6, 0.05, -3.2)]), 40, 0.026, 8, false);
  mesh(group, lineCord, m.cord, [0, 0, 0]);
  return { group, dial, wheel, plungers };
}
