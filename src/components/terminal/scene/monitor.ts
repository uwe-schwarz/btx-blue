import * as THREE from "three";
import { CrtTube } from "./crt";
import { DecalAtlas, frameGeometry, mesh, place, roundedBox, taper, text } from "./kit";
import type { Materials } from "./materials";
import type { ScreenRaster } from "./raster";

/** Raster size: slightly larger than the visible glass (overscan), 4:3. */
export const RASTER = { width: 2.9, height: 2.175 };
/** Screen centre relative to the monitor origin (desk surface below the housing, front face at z = 0). */
export const SCREEN_CENTER = new THREE.Vector3(0, 2.27, -0.1);

export function buildMonitor(m: Materials, atlas: DecalAtlas, raster: ScreenRaster) {
  const group = new THREE.Group();
  group.name = "terminal";

  // Tilt-and-swivel foot.
  mesh(group, roundedBox(2.1, 0.12, 2.0, 0.05), m.housingShade, [0, 0.06, -1.35]);
  mesh(group, new THREE.CylinderGeometry(0.62, 0.72, 0.2, 40), m.housingShade, [0, 0.2, -1.35]);

  // Rear shell, the separate front bezel with its screen opening, and the funnel around the tube neck.
  // The shell starts behind the tube so the curved faceplate corners stay visible.
  mesh(group, roundedBox(3.72, 3.32, 0.73, 0.2), m.housing, [0, 1.98, -0.785]);
  mesh(group, frameGeometry([3.74, 3.34, 0.22], [3.0, 2.34, 0.2], 0.42, 0.04, SCREEN_CENTER.y - 1.98), m.housing, [0, 1.98, -0.46]);
  const funnel = taper(roundedBox(3.5, 3.08, 2.4, 0.34, 5), { backX: 0.6, backY: 0.6, centerY: 0, dropY: 0.12 });
  mesh(group, funnel, m.housing, [0, 2.0, -2.15]);
  // Cooling slots across the top and down both flanks.
  for (let i = 0; i < 18; i++) {
    mesh(group, roundedBox(0.045, 0.02, 0.62, 0.008), m.darkMask, [-1.2 + i * 0.141, 3.636, -0.62], undefined, false);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) mesh(group, roundedBox(0.02, 0.04, 0.72, 0.008), m.darkMask, [side * 1.861, 2.3 + i * 0.12, -0.58], undefined, false);
  }

  // Raised lip around the screen and the recessed charcoal mask.
  const lip = mesh(group, frameGeometry([3.28, 2.62, 0.26], [2.98, 2.32, 0.2], 0.05, 0.035), m.housing, [0, SCREEN_CENTER.y, 0]);
  lip.castShadow = false;
  // Deep enough to hide the curved tube corners, which fall back behind the opening.
  mesh(group, frameGeometry([3.0, 2.34, 0.2], [2.8, 2.14, 0.14], 0.34, 0.012), m.darkMask, [0, SCREEN_CENTER.y, -0.34], undefined, false);
  // Behind the glass everything is dark: the inside of the funnel.
  mesh(group, new THREE.PlaneGeometry(3.1, 2.4), m.black, [0, SCREEN_CENTER.y, -0.4], undefined, false);

  const tube = new CrtTube(raster, RASTER.width, RASTER.height, 0.075);
  place(group, tube.group, [0, SCREEN_CENTER.y, -0.1]);

  // Control strip below the screen: badge, knobs, mains rocker and indicator.
  const badge = atlas.decal(0.46, 0.2, (c, w, h) => {
    c.fillStyle = "#2c2d29";
    c.beginPath(); c.roundRect(0, 0, w, h, h * 0.18); c.fill();
    c.strokeStyle = "#8d8a7e"; c.lineWidth = h * 0.05; c.beginPath(); c.roundRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16, h * 0.12); c.stroke();
    text(c, "Btx", w, h, { color: "#e7dfca", font: "Georgia, 'Times New Roman', serif", weight: "700", size: 0.68, style: "italic" });
  }, 900);
  place(group, badge, [-1.38, 0.66, 0.011]);
  const brand = atlas.decal(1.4, 0.1, (c, w, h) => text(c, "BILDSCHIRMTEXT · TERMINAL 1200", w, h, { color: "#6f6a5c", weight: "700", size: 0.62, spacing: h * 0.08 }), 900);
  place(group, brand, [-0.38, 0.66, 0.011]);
  mesh(group, roundedBox(3.2, 0.012, 0.02, 0.004), m.housingShade, [0, 0.93, 0.0], undefined, false);

  const knobs: THREE.Mesh[] = [];
  for (const [x, label] of [[0.72, "HELLIGKEIT"], [1.0, "KONTRAST"]] as const) {
    const knob = mesh(group, new THREE.CylinderGeometry(0.07, 0.078, 0.09, 24), m.charcoal, [x, 0.7, 0.045], [Math.PI / 2, 0, 0]);
    mesh(knob, new THREE.CylinderGeometry(0.009, 0.009, 0.092, 6), m.satin, [0, 0.001, -0.05], undefined, false);
    knobs.push(knob);
    place(group, atlas.decal(0.26, 0.05, (c, w, h) => text(c, label, w, h, { color: "#5d5a4f", weight: "700", size: 0.7 }), 1200), [x, 0.56, 0.011]);
  }
  const power = mesh(group, roundedBox(0.3, 0.17, 0.08, 0.025), m.charcoal, [1.45, 0.7, 0.02]);
  place(power, atlas.decal(0.14, 0.07, (c, w, h) => text(c, "I  O", w, h, { color: "#d8d2c0", weight: "700", size: 0.7 }), 1200), [0, 0, 0.041]);
  place(group, atlas.decal(0.2, 0.05, (c, w, h) => text(c, "NETZ", w, h, { color: "#5d5a4f", weight: "700", size: 0.7 }), 1200), [1.45, 0.56, 0.011]);
  const powerLed = m.led(0x7dff5a);
  mesh(group, new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16), powerLed, [1.22, 0.7, 0.012], [Math.PI / 2, 0, 0], false);

  return { group, tube, knobs, power, powerLed };
}
