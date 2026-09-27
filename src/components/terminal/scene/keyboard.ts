import * as THREE from "three";
import { DecalAtlas, mesh, place, profileSolid, roundedBox, taper, text } from "./kit";
import type { Materials } from "./materials";

const U = 0.19;
/** Keyboard top slope in radians (rises towards the back). */
export const KEYBOARD_SLOPE = 0.1;

type Tone = "cap" | "mod" | "blue" | "red";
interface KeyDef { label: string; key: string; width?: number; tone?: Tone; shift?: string; code?: string; tall?: boolean }

const k = (label: string, key = label.toLowerCase(), extra: Partial<KeyDef> = {}): KeyDef => ({ label, key, ...extra });
const mod = (label: string, key: string, width: number, extra: Partial<KeyDef> = {}): KeyDef => ({ label, key, width, tone: "mod", ...extra });

/** German ISO layout as sold with 1980s terminals; digits carry their shifted symbols. */
const MAIN: KeyDef[][] = [
  [k("^", "^", { shift: "°" }), ...[["1", "!"], ["2", "\""], ["3", "§"], ["4", "$"], ["5", "%"], ["6", "&"], ["7", "/"], ["8", "("], ["9", ")"], ["0", "="]].map(([d, s]) => k(d, d, { shift: s, code: `Digit${d}` })), k("ß", "ß", { shift: "?" }), k("´", "´", { shift: "`" }), mod("←", "Backspace", 2)],
  [mod("⇥", "Tab", 1.5), ...[..."QWERTZUIOPÜ"].map((c) => k(c)), k("+", "+", { shift: "*" })],
  [mod("⇪", "CapsLock", 1.75), ...[..."ASDFGHJKLÖÄ"].map((c) => k(c)), k("#", "#", { shift: "'", code: "Backslash" })],
  [mod("⇧", "Shift", 1.25), k("<", "<", { shift: ">" }), ...[..."YXCVBNM"].map((c) => k(c)), k(",", ",", { shift: ";" }), k(".", ".", { shift: ":" }), k("-", "-", { shift: "_" }), mod("⇧", "Shift", 2.75)],
  [mod("Strg", "Control", 1.5), mod("Alt", "Alt", 1.5), { label: "", key: " ", width: 9 }, mod("Alt Gr", "AltGraph", 1.5), mod("Strg", "Control", 1.5)],
];

/** The Btx block: Initiator (*) and Terminator (#) keys, page stepping and a numeric pad. */
const PAD: (KeyDef & { x: number; y: number })[] = [
  { label: "*", key: "*", tone: "blue", x: 0, y: 0, code: "NumpadMultiply" }, { label: "#", key: "#", tone: "red", x: 1, y: 0, code: "NumpadHash" },
  { label: "◀", key: "ArrowLeft", tone: "mod", x: 2, y: 0 }, { label: "▶", key: "ArrowRight", tone: "mod", x: 3, y: 0 },
  ...["7", "8", "9"].map((d, i) => ({ label: d, key: d, x: i, y: 1, code: `Numpad${d}` })), { label: "←", key: "Backspace", tone: "mod" as Tone, x: 3, y: 1, code: "NumpadBackspace" },
  ...["4", "5", "6"].map((d, i) => ({ label: d, key: d, x: i, y: 2, code: `Numpad${d}` })), { label: "Start", key: "Home", tone: "mod" as Tone, x: 3, y: 2 },
  ...["1", "2", "3"].map((d, i) => ({ label: d, key: d, x: i, y: 3, code: `Numpad${d}` })), { label: "↵", key: "Enter", tone: "mod" as Tone, x: 3, y: 3, tall: true, code: "NumpadEnter" },
  { label: "0", key: "0", x: 0, y: 4, width: 2, code: "Numpad0" }, { label: ",", key: ",", x: 2, y: 4, code: "NumpadDecimal" },
];

export interface KeyboardKey { group: THREE.Object3D; key: string; code?: string; rest: number }

export function buildKeyboard(m: Materials, atlas: DecalAtlas) {
  const group = new THREE.Group();
  group.name = "keyboard";
  const width = 4.46;
  // Wedge-shaped case, thicker at the back.
  const profile = new THREE.Shape();
  profile.moveTo(-0.96, 0.0);
  profile.lineTo(0.95, 0.0);
  profile.lineTo(0.99, 0.14);
  profile.quadraticCurveTo(1.0, 0.2, 0.93, 0.205);
  profile.lineTo(-0.9, 0.39);
  profile.quadraticCurveTo(-0.99, 0.4, -0.99, 0.32);
  profile.lineTo(-0.96, 0.0);
  mesh(group, profileSolid(profile, width, 0.06), m.housing);
  // Rubber feet.
  for (const x of [-2.0, 2.0]) for (const z of [-0.8, 0.8]) mesh(group, new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), m.rubber, [x, -0.01, z], undefined, false);

  const deck = new THREE.Group();
  deck.position.set(0, 0.3, 0.01);
  deck.rotation.x = KEYBOARD_SLOPE;
  group.add(deck);
  mesh(deck, roundedBox(4.08, 0.06, 1.24, 0.03), m.keyPlate, [0, -0.02, -0.1], undefined, false);

  const materials: Record<Tone, THREE.Material> = { cap: m.keyCap, mod: m.keyMod, blue: m.keyBlue, red: m.keyRed };
  const geometries = new Map<string, THREE.BufferGeometry>();
  const cap = (w: number, d: number) => {
    const id = `${w}:${d}`;
    if (!geometries.has(id)) geometries.set(id, taper(roundedBox(w * U - 0.024, 0.11, d * U - 0.024, 0.022, 3), { topX: 1 - 0.05 / (w * U), topZ: 1 - 0.05 / (d * U) }));
    return geometries.get(id)!;
  };
  const keys: KeyboardKey[] = [];
  const addKey = (def: KeyDef, x: number, z: number, w: number, d: number, tilt: number) => {
    const holder = place(deck, new THREE.Group(), [x, 0.062, z], [tilt, 0, 0]);
    mesh(holder, cap(w, d), materials[def.tone ?? "cap"], [0, 0, 0]);
    const dark = def.tone === "blue" || def.tone === "red";
    const ink = dark ? "#f0ead8" : def.tone === "mod" ? "#26271f" : "#2b2c26";
    if (def.label) {
      const legend = atlas.decal(w * U - 0.07, d * U - 0.07, (c, cw, ch) => {
        const big = def.label.length === 1 && !def.shift;
        if (def.shift) {
          text(c, def.shift, cw, ch * 0.5, { color: ink, size: 0.8, align: "left", weight: "500" });
          c.translate(0, ch * 0.5);
          text(c, def.label, cw, ch * 0.5, { color: ink, size: 0.8, align: "left", weight: "500" });
        } else if (def.tone === "mod" && def.label.length > 1) {
          text(c, def.label, cw, ch, { color: ink, size: 0.3, weight: "600" });
        } else {
          text(c, def.label, cw, ch, { color: ink, size: big && dark ? 0.62 : 0.46, align: big && !dark && def.tone !== "mod" ? "left" : "center", weight: "500" });
        }
      }, 460);
      place(holder, legend, [0, 0.0555, 0], [-Math.PI / 2, 0, 0]);
    }
    keys.push({ group: holder, key: def.key, code: def.code, rest: holder.position.y });
    holder.userData.key = def;
    return holder;
  };

  const left = -(19.4 * U) / 2, top = -0.5;
  const tilts = [-0.16, -0.08, 0, 0.06, 0.1];
  MAIN.forEach((row, r) => {
    let x = 0;
    for (const def of row) {
      const w = def.width ?? 1;
      addKey(def, left + (x + w / 2) * U, top + r * U, w, 1, tilts[r]);
      x += w;
    }
    // ISO Enter: an inverted L spanning the second and third rows.
    if (r === 1) {
      const holder = addKey(mod("↵", "Enter", 1.5), left + (13.5 + 0.75) * U, top + U, 1.5, 1, tilts[1]);
      mesh(holder, cap(1.25, 1.2), m.keyMod, [0.125 * U, -0.004, U * 0.55]);
    }
  });
  const padLeft = left + 15.4 * U;
  for (const def of PAD) {
    const w = def.width ?? 1, d = def.tall ? 2 : 1;
    addKey(def, padLeft + (def.x + w / 2) * U, top + (def.y + d / 2 - 0.5) * U, w, d, tilts[Math.min(4, def.y)]);
  }

  // Status lamp and nameplate above the Btx block.
  const onlineLed = m.led(0x72ff4c);
  // The case top at z = -0.83 sits at y ≈ 0.383 (see the profile above).
  mesh(group, new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), onlineLed, [1.14, 0.388, -0.83], [KEYBOARD_SLOPE, 0, 0], false);
  const plate = atlas.decal(0.74, 0.07, (c, w, h) => text(c, "Btx · ONLINE", w, h, { color: "#6d685a", weight: "700", size: 0.72, align: "left" }), 900);
  place(group, plate, [1.58, 0.386, -0.83], [-Math.PI / 2 + KEYBOARD_SLOPE, 0, 0]);
  return { group, keys, onlineLed };
}
