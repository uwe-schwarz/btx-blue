import * as THREE from "three";
import { DecalAtlas, V, mesh, place, roundedBox, text } from "./kit";
import type { Materials } from "./materials";

/** Cup centres are 1.72 apart, matching the FeTAp handset's earpiece–mouthpiece spacing. */
export const CUP_X = 0.86;
/** Handset pose when pressed into the cups, relative to the coupler origin. */
export const SEATED = new THREE.Vector3(0, 0.72, 0);

export function buildCoupler(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "coupler";
  for (const side of [-1, 1]) mesh(group, roundedBox(0.98, 0.5, 0.85, 0.08), m.couplerBody, [side * 0.87, 0.25, 0]);
  // The bellows in the middle lets the two halves follow any handset.
  mesh(group, roundedBox(0.8, 0.36, 0.7, 0.05), m.couplerBody, [0, 0.22, 0]);
  for (let i = 0; i < 8; i++) mesh(group, roundedBox(0.062, 0.45, 0.8, 0.028), m.couplerBody, [-0.3 + i * 0.086, 0.235, 0]);

  const ring = new THREE.LatheGeometry([
    new THREE.Vector2(0.205, -0.02), new THREE.Vector2(0.205, 0.18), new THREE.Vector2(0.215, 0.235), new THREE.Vector2(0.25, 0.262),
    new THREE.Vector2(0.33, 0.265), new THREE.Vector2(0.362, 0.238), new THREE.Vector2(0.372, 0.18), new THREE.Vector2(0.366, 0.02), new THREE.Vector2(0.35, -0.02),
  ], 56);
  for (const side of [-1, 1]) {
    mesh(group, ring, m.rubber, [side * CUP_X, 0.5, 0]);
    mesh(group, new THREE.CylinderGeometry(0.205, 0.205, 0.02, 32), m.foam, [side * CUP_X, 0.56, 0], undefined, false);
    const grille = atlas.decal(0.36, 0.36, (c, w, h) => {
      c.fillStyle = "#2c2c2a"; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#0b0b0b";
      for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
        const px = (x + 0.5 + (y % 2) * 0.5) / 9.5 * w, py = (y + 0.5) / 9 * h;
        if (Math.hypot(px - w / 2, py - h / 2) < w * 0.42) { c.beginPath(); c.arc(px, py, w * 0.018, 0, Math.PI * 2); c.fill(); }
      }
    }, 500);
    place(group, grille, [side * CUP_X, 0.571, 0], [-Math.PI / 2, 0, 0]);
  }

  const label = atlas.decal(0.72, 0.12, (c, w, h) => {
    c.fillStyle = "#4a4a44"; c.fillRect(0, h * 0.14, w * 0.008, h * 0.72);
    c.translate(w * 0.03, 0);
    text(c, "dataphon  s 21 d", w, h, { color: "#3f3f3a", font: "Helvetica, Arial, sans-serif", weight: "700", style: "italic", size: 0.7, align: "left" });
  }, 900);
  place(group, label, [0.9, 0.24, 0.427]);

  const leds = { power: m.led(0x6bff44), carrier: m.led(0xffb326), data: m.led(0xff3b26) };
  const ledLabels = [["BETR.", leds.power], ["TRÄGER", leds.carrier], ["DATEN", leds.data]] as const;
  ledLabels.forEach(([name, material], index) => {
    const x = -1.18 + index * 0.2;
    mesh(group, new THREE.CylinderGeometry(0.024, 0.024, 0.03, 16), material, [x, 0.3, 0.428], [Math.PI / 2, 0, 0], false);
    place(group, atlas.decal(0.2, 0.05, (c, w, h) => text(c, name, w, h, { color: "#56554c", weight: "700", size: 0.62 }), 1200), [x, 0.2, 0.427]);
  });
  // Speed slide on the left end: AUS · 300 · 1200.
  const slot = mesh(group, roundedBox(0.02, 0.07, 0.36, 0.01), m.darkMask, [-1.36, 0.28, 0], undefined, false);
  const slider = mesh(group, roundedBox(0.05, 0.06, 0.08, 0.012), m.charcoal, [-1.37, 0.28, 0.1]);
  place(group, atlas.decal(0.46, 0.06, (c, w, h) => text(c, "AUS   300   1200", w, h, { color: "#56554c", weight: "700", size: 0.7 }), 1200), [-1.362, 0.36, 0], [0, -Math.PI / 2, 0]);
  // V.24 socket and cable to the terminal.
  mesh(group, roundedBox(0.03, 0.12, 0.34, 0.02), m.satin, [1.36, 0.25, 0], undefined, false);
  const cable = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(1.38, 0.25, 0), V(1.7, 0.12, -0.1), V(1.9, 0.04, -0.9), V(1.2, 0.04, -2.3), V(-1.4, 0.05, -3.0)]), 60, 0.028, 8, false);
  mesh(group, cable, m.cable, [0, 0, 0]);
  return { group, leds, slider, slot };
}

/** A direct-connect modem (V.22bis / V.32 era) with the usual front-panel indicator row. */
export function buildDirectModem(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "modem";
  mesh(group, roundedBox(2.3, 0.36, 1.35, 0.08), m.housing, [0, 0.18, 0]);
  mesh(group, roundedBox(2.1, 0.16, 0.05, 0.02), m.darkMask, [0, 0.19, 0.66], undefined, false);
  const names = ["HS", "AA", "CD", "OH", "RD", "SD", "TR", "MR"];
  const leds = names.map((name, index) => {
    const material = m.led(index === 2 || index === 3 ? 0xffb326 : 0xff3b26);
    const x = -0.2 + index * 0.16;
    mesh(group, new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), material, [x, 0.22, 0.69], [Math.PI / 2, 0, 0], false);
    place(group, atlas.decal(0.14, 0.04, (c, w, h) => text(c, name, w, h, { color: "#c9c3ae", weight: "700", size: 0.8 }), 1200), [x, 0.15, 0.688]);
    return material;
  });
  place(group, atlas.decal(0.8, 0.09, (c, w, h) => text(c, "MODEM 2400/9600", w, h, { color: "#c9c3ae", weight: "700", size: 0.7, align: "left", spacing: h * 0.06 }), 900), [-0.6, 0.19, 0.688]);
  return { group, leds };
}
