import * as THREE from "three";
import { DecalAtlas, V, mesh, place, roundedBox, text } from "./kit";
import type { Materials } from "./materials";

export const DESK = { width: 17, depth: 8.2, centerZ: 0.35 };

export function buildDesk(m: Materials) {
  const group = new THREE.Group();
  group.name = "desk";
  mesh(group, roundedBox(DESK.width, 0.32, DESK.depth, 0.07, 3), m.wood, [0, -0.16, DESK.centerZ]);
  // Front apron below the top edge.
  mesh(group, roundedBox(DESK.width - 0.6, 1.4, 0.12, 0.03), m.wood, [0, -1.0, DESK.centerZ + DESK.depth / 2 - 0.35]);
  return group;
}

/** Brass desk lamp with an enamelled shade; returns where the bulb sits and where it points. */
export function buildLamp(m: Materials) {
  const group = new THREE.Group();
  group.name = "lamp";
  mesh(group, new THREE.LatheGeometry([V2(0, 0), V2(0.66, 0), V2(0.68, 0.04), V2(0.6, 0.1), V2(0.34, 0.18), V2(0.12, 0.23), V2(0.08, 0.3), V2(0, 0.3)], 64), m.brass);
  const button = mesh(group, new THREE.CylinderGeometry(0.06, 0.065, 0.05, 20), m.charcoal, [0.34, 0.17, 0.42], [0.5, 0, 0]);
  const stem = new THREE.CatmullRomCurve3([V(0, 0.25, 0), V(0, 2.2, 0), V(0.04, 3.1, 0.02), V(0.3, 3.55, 0.2), V(0.85, 3.62, 0.62), V(1.18, 3.42, 0.9)]);
  mesh(group, new THREE.TubeGeometry(stem, 80, 0.05, 14, false), m.brass);
  mesh(group, new THREE.SphereGeometry(0.085, 20, 14), m.brass, [0, 2.95, 0]);
  const shade = place(group, new THREE.Group(), [1.25, 3.3, 0.96]);
  // Aim the shade opening down towards the keyboard and notepad.
  shade.lookAt(group.localToWorld(V(2.3, 0, 2.6)));
  shade.rotateX(-Math.PI / 2);
  // Lathe normals face outward when the profile runs from the rim up to the neck.
  const profile = [V2(0.64, -0.12), V2(0.62, -0.08), V2(0.46, 0.1), V2(0.3, 0.29), V2(0.2, 0.39), V2(0.12, 0.42)];
  mesh(shade, new THREE.LatheGeometry(profile, 64), m.brass);
  mesh(shade, new THREE.LatheGeometry(profile.map((p) => V2(p.x - 0.014, p.y - 0.004)), 64), m.enamel, [0, 0, 0], undefined, false);
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc27a, emissiveIntensity: 6, roughness: 0.3 });
  const bulb = mesh(shade, new THREE.SphereGeometry(0.15, 24, 16), bulbMaterial, [0, 0.1, 0], undefined, false);
  // Cloth-covered mains cord.
  mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.3, 0.05, -0.55), V(-0.5, 0.03, -1.3), V(-0.2, 0.03, -2.2), V(0.5, 0.03, -3.0)]), 30, 0.028, 8, false), m.cable);
  return { group, shade, bulb, bulbMaterial, button };
}

function V2(x: number, y: number) { return new THREE.Vector2(x, y); }

/** Squared ("kariert") notepad with handwritten Btx notes and a ballpoint pen. */
export function buildNotepad(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "notepad";
  mesh(group, roundedBox(1.5, 0.06, 2.05, 0.01), m.paper, [0, 0.03, 0]);
  mesh(group, roundedBox(1.52, 0.03, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: 0x6b2a22, roughness: 0.8 }), [0, 0.05, -1.0]);
  const page = atlas.decal(1.46, 1.96, (c, w, h) => {
    c.fillStyle = "#f4efdf"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(96, 128, 160, 0.33)"; c.lineWidth = 1;
    const step = w / 28;
    for (let x = step; x < w; x += step) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = step * 2; y < h; y += step) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.strokeStyle = "rgba(190, 70, 60, 0.5)"; c.beginPath(); c.moveTo(step * 3, 0); c.lineTo(step * 3, h); c.stroke();
    c.fillStyle = "#1f3470";
    c.font = `${Math.round(step * 1.5)}px 'Bradley Hand', 'Segoe Script', 'Comic Sans MS', cursive`;
    c.textBaseline = "alphabetic";
    const lines: [string, number, number][] = [["Btx  –  01910", 3.6, 3.5], ["Hörer erst bei Pfeifton", 3.6, 6.5], ["in den Koppler!", 4.4, 8.5],
      ["000  Startseite", 3.6, 12], ["800  Seitenfinder", 3.6, 14.5], ["* S  Suche", 3.6, 17.5], ["# H  zurück zum Start", 3.6, 20], ["1200/75  →  ~ 8 Sek./Seite", 3.6, 24], ["Mondscheintarif ab 18 h", 3.6, 27.5]];
    lines.forEach(([line, x, y], index) => {
      c.save(); c.translate(x * step, y * step); c.rotate(-0.012 + (index % 3) * 0.006); c.fillText(line, 0, 0); c.restore();
    });
    c.strokeStyle = "#1f3470"; c.lineWidth = step * 0.08;
    c.beginPath(); c.moveTo(3.6 * step, 9.3 * step); c.quadraticCurveTo(8 * step, 9.8 * step, 13 * step, 9.2 * step); c.stroke();
  }, 300);
  place(group, page, [0, 0.062, 0.02], [-Math.PI / 2, 0, 0]);
  const pen = place(group, new THREE.Group(), [0.35, 0.1, 0.3], [0, -0.55, 0]);
  const body = new THREE.MeshPhysicalMaterial({ color: 0x1d3a78, roughness: 0.3, clearcoat: 0.6 });
  mesh(pen, new THREE.CylinderGeometry(0.038, 0.038, 1.2, 20), body, [0, 0, 0], [0, 0, Math.PI / 2]);
  mesh(pen, new THREE.ConeGeometry(0.038, 0.12, 20), m.satin, [-0.66, 0, 0], [0, 0, Math.PI / 2]);
  mesh(pen, new THREE.CylinderGeometry(0.042, 0.042, 0.3, 20), m.satin, [0.5, 0, 0], [0, 0, Math.PI / 2]);
  mesh(pen, roundedBox(0.3, 0.012, 0.03, 0.005), m.satin, [0.42, 0.045, 0]);
  return group;
}

/** A few books and period paperwork. */
export function buildProps(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "props";
  const book = (width: number, height: number, depth: number, cover: number, spine: string, title: string, ink: string) => {
    const result = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: cover, roughness: 0.78 });
    mesh(result, roundedBox(width, height, depth, 0.02), material);
    mesh(result, roundedBox(width - 0.08, height - 0.04, depth - 0.02, 0.01), m.paper, [0.04, 0, 0]);
    const label = atlas.decal(depth * 0.9, height * 0.7, (c, w, h) => text(c, spine, w, h, { color: ink, font: "Georgia, 'Times New Roman', serif", weight: "700", size: 0.5 }), 300);
    place(result, label, [-width / 2 - 0.001, 0, 0], [0, -Math.PI / 2, 0]);
    const front = atlas.decal(width * 0.8, depth * 0.5, (c, w, h) => {
      const lines = title.split("\n");
      lines.forEach((line, index) => { c.save(); c.translate(0, (index / lines.length) * h); text(c, line, w, h / lines.length, { color: ink, font: "Georgia, 'Times New Roman', serif", weight: index ? "400" : "700", size: 0.6 }); c.restore(); });
    }, 220);
    place(result, front, [0.02, height / 2 + 0.001, 0], [-Math.PI / 2, 0, Math.PI / 2]);
    return result;
  };
  // Telephone directory and the Btx handbook stacked at the back right.
  place(group, book(2.3, 0.42, 1.6, 0xe8e0c4, "FERNSPRECHBUCH KÖLN", "Amtliches\nFernsprechbuch\nKöln 1985/86", "#1d3d7a"), [7.2, 0.21, -1.9], [0, 0.18, 0]);
  place(group, book(2.0, 0.12, 1.45, 0x243a6b, "BILDSCHIRMTEXT", "Bildschirmtext\nTeilnehmer-Handbuch", "#e5d9a8"), [7.15, 0.48, -1.95], [0, 0.05, 0]);
  // Lexikon under the lamp side.
  place(group, book(1.9, 0.36, 1.4, 0x3d2a1e, "DER GROSSE BROCKHAUS", "Der Große\nBrockhaus", "#c9a764"), [-6.2, 0.18, -2.3], [0, -0.1, 0]);
  place(group, book(1.8, 0.3, 1.3, 0x4a4630, "ATLANTIS WELTATLAS", "Weltatlas", "#c9a764"), [-6.15, 0.51, -2.28], [0, 0.04, 0]);
  // Porcelain cup with pencils.
  const cup = place(group, new THREE.Group(), [-4.8, 0, -1.6]);
  mesh(cup, new THREE.LatheGeometry([V2(0, 0.02), V2(0.3, 0.0), V2(0.33, 0.06), V2(0.33, 0.78), V2(0.3, 0.8), V2(0.28, 0.1), V2(0, 0.1)], 40), m.ceramic);
  // Blue painted band, wrapped around the cup.
  const [u0, v0, u1, v1] = atlas.region(640, 90, (c, w, h) => {
    c.strokeStyle = "#2a4a9a"; c.lineWidth = h * 0.07;
    for (let x = h * 0.45; x < w; x += h * 0.9) { c.beginPath(); c.arc(x, h * 0.5, h * 0.28, 0, Math.PI); c.stroke(); }
    c.beginPath(); c.moveTo(0, h * 0.1); c.lineTo(w, h * 0.1); c.moveTo(0, h * 0.9); c.lineTo(w, h * 0.9); c.stroke();
  });
  const bandGeometry = new THREE.CylinderGeometry(0.334, 0.334, 0.3, 40, 1, true);
  const bandUv = bandGeometry.getAttribute("uv");
  for (let i = 0; i < bandUv.count; i++) bandUv.setXY(i, u0 + bandUv.getX(i) * (u1 - u0), v0 + bandUv.getY(i) * (v1 - v0));
  mesh(cup, bandGeometry, atlas.material, [0, 0.52, 0], undefined, false);
  const pencil = new THREE.MeshStandardMaterial({ color: 0xd9a620, roughness: 0.5 });
  for (const [x, z, tilt, color] of [[0.08, 0.05, 0.12, 0xd9a620], [-0.09, 0.02, -0.16, 0x2b2b2b], [0.02, -0.1, 0.05, 0x9a2a22]] as const) {
    const stick = place(cup, new THREE.Group(), [x, 0.1, z], [tilt, 0, tilt * 0.8]);
    mesh(stick, new THREE.CylinderGeometry(0.03, 0.03, 1.25, 6), color === 0xd9a620 ? pencil : new THREE.MeshStandardMaterial({ color, roughness: 0.5 }), [0, 0.62, 0]);
    mesh(stick, new THREE.ConeGeometry(0.03, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0xe2c9a0, roughness: 0.8 }), [0, 1.29, 0]);
  }
  return group;
}
