import * as THREE from "three";
import { FINGER_STOP, holeAngle } from "@/lib/terminal/dial";
import { DecalAtlas, V, mesh, place, profileSolid, roundedBox, taper, text } from "./kit";
import type { Materials } from "./materials";

/** Face of the dial: centre and tilt of the sloped front of the FeTAp 611 body. */
const DIAL_CENTER = new THREE.Vector3(0, 0.6, 0.645);
const DIAL_TILT = 0.749;
const HOLE_RADIUS = 0.316;
/** Where the handset rests on the cradle, relative to the phone origin. */
export const CRADLE = { position: new THREE.Vector3(0, 1.1, -0.36), quaternion: new THREE.Quaternion() };
/** Cradle switch plungers: pressed flush by the handset, sprung up when it is lifted. */
export const PLUNGER_Y = { rest: 1.075, raised: 1.12 };
/** Where the spiral cord enters the body (left flank). */
export const CORD_JACK = new THREE.Vector3(-0.98, 0.3, 0.5);
/** Where the cord leaves the handset (mouthpiece end), in handset coordinates. */
export const HANDSET_CORD = new THREE.Vector3(-1.02, 0.1, 0);

export function buildHandset(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "handset";
  const curve = new THREE.CatmullRomCurve3([V(-0.74, 0.17, 0), V(-0.46, 0.285, 0), V(0, 0.315, 0), V(0.46, 0.285, 0), V(0.74, 0.17, 0)]);
  // The FeTAp grip is broad and flattened: an elliptical section wider than it is thick.
  const handle = new THREE.TubeGeometry(curve, 48, 0.118, 20, false);
  handle.scale(1, 1, 1.42);
  handle.computeVertexNormals();
  mesh(group, handle, m.fern);
  // Rounded capsule housings, earpiece to the right, mouthpiece (with the cord) to the left.
  const capsule = new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.255, 0), new THREE.Vector2(0.278, 0.018), new THREE.Vector2(0.285, 0.07),
    new THREE.Vector2(0.272, 0.13), new THREE.Vector2(0.235, 0.19), new THREE.Vector2(0.16, 0.245), new THREE.Vector2(0.07, 0.27), new THREE.Vector2(0, 0.272),
  ], 48);
  capsule.scale(1, 1, 1.04);
  for (const [x, holes] of [[-0.8, 3], [0.8, 1]] as const) {
    mesh(group, capsule, m.fern, [x, 0, 0]);
    const cap = atlas.decal(0.5, 0.5, (c, w, h) => {
      c.fillStyle = "#3f5c3b";
      c.beginPath(); c.arc(w / 2, h / 2, w * 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#2c4229"; c.lineWidth = w * 0.02; c.beginPath(); c.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#101710";
      const rings = holes === 3 ? [0, 0.1, 0.19, 0.28] : [0, 0.12];
      rings.forEach((radius, ring) => {
        const count = ring === 0 ? 1 : Math.round(6 * ring * (holes === 3 ? 1 : 1.2));
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + ring * 0.3;
          c.beginPath(); c.arc(w / 2 + Math.cos(angle) * radius * w, h / 2 + Math.sin(angle) * radius * h, w * 0.022, 0, Math.PI * 2); c.fill();
        }
      });
    }, 360);
    place(group, cap, [x, -0.002, 0], [Math.PI / 2, 0, 0]);
  }
  // Strain relief where the cord enters.
  mesh(group, new THREE.CylinderGeometry(0.035, 0.045, 0.1, 12), m.fernDark, [-1.03, 0.1, 0], [0, 0, Math.PI / 2]);
  return group;
}

export function buildTelephone(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "telephone";
  // Side profile of the FeTAp 611: low front lip, steep dial face, flat cradle top.
  const profile = new THREE.Shape();
  profile.moveTo(-1.0, 0.0);
  profile.lineTo(1.0, 0.0);
  profile.lineTo(1.05, 0.12);
  profile.quadraticCurveTo(1.07, 0.2, 1.0, 0.26);
  profile.lineTo(0.28, 0.93);
  profile.quadraticCurveTo(0.2, 1.0, 0.1, 1.0);
  profile.lineTo(-0.8, 1.0);
  profile.quadraticCurveTo(-1.0, 1.0, -1.02, 0.84);
  profile.lineTo(-1.04, 0.08);
  profile.quadraticCurveTo(-1.04, 0.0, -1.0, 0.0);
  const body = taper(profileSolid(profile, 2.06, 0.1), { topX: 0.86 });
  mesh(group, body, m.fern);
  mesh(group, new THREE.BoxGeometry(1.9, 0.03, 1.9), m.rubber, [0, 0.012, 0], undefined, false);

  // Handset saddles at both ends of the top, each with a cradle-switch plunger (Gabelumschalter).
  for (const x of [-0.66, 0.66]) mesh(group, roundedBox(0.44, 0.16, 0.62, 0.06), m.fern, [x, 1.02, -0.36]);
  const plungers = [-0.66, 0.66].map((x) => mesh(group, roundedBox(0.12, 0.08, 0.16, 0.025), m.fernDark, [x, PLUNGER_Y.rest, -0.36]));

  // Nummernschalter: number plate, clear finger wheel, centre card and finger stop.
  const dial = place(group, new THREE.Group(), [DIAL_CENTER.x, DIAL_CENTER.y, DIAL_CENTER.z], [DIAL_TILT, 0, 0]);
  mesh(dial, new THREE.CylinderGeometry(0.455, 0.465, 0.03, 64), m.satin, [0, 0.0, 0]);
  const plateMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d5ca, metalness: 0.2, roughness: 0.4 });
  mesh(dial, new THREE.CylinderGeometry(0.43, 0.43, 0.022, 64), plateMaterial, [0, 0.02, 0], undefined, false);
  const numbers = atlas.decal(0.86, 0.86, (c, w, h) => {
    const cx = w / 2, cy = h / 2, r = (HOLE_RADIUS / 0.43) * (w / 2);
    c.strokeStyle = "#8e8b82"; c.lineWidth = w * 0.004;
    c.beginPath(); c.arc(cx, cy, w * 0.49, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "#1c1c1a";
    c.font = `700 ${Math.round(w * 0.075)}px Helvetica, Arial, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    for (const digit of "1234567890") {
      const angle = holeAngle(digit);
      c.fillText(digit, cx + Math.sin(angle) * r, cy - Math.cos(angle) * r + w * 0.004);
    }
  }, 560);
  place(dial, numbers, [0, 0.032, 0], [-Math.PI / 2, 0, 0]);

  const wheelShape = new THREE.Shape();
  wheelShape.absarc(0, 0, 0.42, 0, Math.PI * 2, false);
  wheelShape.holes.push(new THREE.Path().absarc(0, 0, 0.175, 0, Math.PI * 2, true));
  for (const digit of "1234567890") {
    const angle = holeAngle(digit);
    wheelShape.holes.push(new THREE.Path().absarc(Math.sin(angle) * HOLE_RADIUS, Math.cos(angle) * HOLE_RADIUS, 0.066, 0, Math.PI * 2, true));
  }
  const wheelGeometry = new THREE.ExtrudeGeometry(wheelShape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 32 });
  wheelGeometry.rotateX(-Math.PI / 2);
  const wheel = place(dial, new THREE.Group(), [0, 0.042, 0]);
  const wheelMesh = mesh(wheel, wheelGeometry, m.acrylic, [0, 0, 0], undefined, false);
  wheelMesh.castShadow = true;

  mesh(dial, new THREE.CylinderGeometry(0.168, 0.168, 0.02, 48), m.satin, [0, 0.05, 0], undefined, false);
  const card = atlas.decal(0.3, 0.3, (c, w, h) => {
    c.fillStyle = "#f3efe2"; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#b73b2f"; c.lineWidth = h * 0.012;
    c.beginPath(); c.moveTo(w * 0.12, h * 0.36); c.lineTo(w * 0.88, h * 0.36); c.moveTo(w * 0.12, h * 0.64); c.lineTo(w * 0.88, h * 0.64); c.stroke();
    c.save(); c.translate(0, h * 0.2); text(c, "FEUER 112", w, h * 0.14, { color: "#b73b2f", weight: "700", size: 0.9 }); c.restore();
    c.save(); c.translate(0, h * 0.66); text(c, "NOTRUF 110", w, h * 0.14, { color: "#b73b2f", weight: "700", size: 0.9 }); c.restore();
    c.save(); c.translate(0, h * 0.4); text(c, "38 17 41", w, h * 0.2, { color: "#24346a", font: "'Bradley Hand', 'Segoe Script', cursive", weight: "400", size: 0.95 }); c.restore();
  }, 1000);
  place(dial, card, [0, 0.061, 0], [-Math.PI / 2, 0, 0]);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.012, 10, 48), m.chrome);
  place(dial, ring, [0, 0.062, 0], [Math.PI / 2, 0, 0]);

  // Finger stop: a chrome hook just past four o'clock, riding above the wheel.
  const stopDirection = V(Math.sin(FINGER_STOP), 0, -Math.cos(FINGER_STOP));
  const stopPoint = (radius: number, y: number) => stopDirection.clone().multiplyScalar(radius).setY(y);
  const stop = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([stopPoint(0.3, 0.09), stopPoint(0.43, 0.09), stopPoint(0.47, 0.05), stopPoint(0.475, -0.005)]), 16, 0.016, 8, false);
  mesh(dial, stop, m.chrome, [0, 0, 0]);

  // Line cord to the wall socket (TAE) behind the desk.
  const lineCord = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.4, 0.14, -1.0), V(0.5, 0.06, -1.5), V(0.1, 0.05, -2.3), V(-0.6, 0.05, -3.2)]), 40, 0.028, 8, false);
  mesh(group, lineCord, m.cord, [0, 0, 0]);
  return { group, dial, wheel, plungers };
}
