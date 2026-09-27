import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type Vec3 = [number, number, number];
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function place<T extends THREE.Object3D>(parent: THREE.Object3D, object: T, position?: Vec3, rotation?: Vec3): T {
  if (position) object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  parent.add(object);
  return object;
}

export function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position?: Vec3, rotation?: Vec3, shadows = true) {
  const result = place(parent, new THREE.Mesh(geometry, material), position, rotation);
  result.castShadow = shadows;
  result.receiveShadow = true;
  return result;
}

export function roundedBox(width: number, height: number, depth: number, radius: number, segments = 4) {
  return new RoundedBoxGeometry(width, height, depth, segments, Math.min(radius, width / 2, height / 2, depth / 2) * 0.999);
}

/** Moulded housings narrow towards the back and top; shrink vertices by their relative position. */
export function taper(geometry: THREE.BufferGeometry, { backX = 1, backY = 1, topX = 1, topZ = 1, centerY = 0, dropY = 0 }) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const back = (box.max.z - z) / (box.max.z - box.min.z || 1);
    const top = (y - box.min.y) / (box.max.y - box.min.y || 1);
    const sx = THREE.MathUtils.lerp(1, backX, back) * THREE.MathUtils.lerp(1, topX, top);
    const sy = THREE.MathUtils.lerp(1, backY, back);
    const sz = THREE.MathUtils.lerp(1, topZ, top);
    position.setXYZ(i, x * sx, centerY + (y - centerY) * sy - dropY * back, z * sz);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function roundedRectPath<T extends THREE.Path>(path: T, width: number, height: number, radius: number, cx = 0, cy = 0, clockwise = false): T {
  const x = cx - width / 2, y = cy - height / 2, r = Math.min(radius, width / 2, height / 2);
  if (!clockwise) {
    path.moveTo(x + r, y);
    path.lineTo(x + width - r, y); path.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x + width, y + height - r); path.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
    path.lineTo(x + r, y + height); path.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x, y + r); path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  } else {
    path.moveTo(x + r, y);
    path.absarc(x + r, y + r, r, Math.PI * 1.5, Math.PI, true); path.lineTo(x, y + height - r);
    path.absarc(x + r, y + height - r, r, Math.PI, Math.PI / 2, true); path.lineTo(x + width - r, y + height);
    path.absarc(x + width - r, y + height - r, r, Math.PI / 2, 0, true); path.lineTo(x + width, y + r);
    path.absarc(x + width - r, y + r, r, 0, -Math.PI / 2, true); path.lineTo(x + r, y);
  }
  return path;
}

export function roundedRect(width: number, height: number, radius: number, cx = 0, cy = 0) {
  return roundedRectPath(new THREE.Shape(), width, height, radius, cx, cy);
}

/** A flat frame (rounded rectangle with a rounded rectangular opening) extruded towards +z. */
export function frameGeometry(outer: [number, number, number], inner: [number, number, number], depth: number, bevel = 0.02, innerOffsetY = 0) {
  const shape = roundedRect(...outer);
  shape.holes.push(roundedRectPath(new THREE.Path(), inner[0], inner[1], inner[2], 0, innerOffsetY, true));
  // A negative bevel offset keeps the outline and the opening at their nominal size.
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelOffset: -bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 20 });
}

/**
 * Extrudes a side profile drawn in the (z, y) plane across the x axis, centred.
 * Swapping axes mirrors the mesh, so triangle winding is reversed as well.
 */
export function profileSolid(shape: THREE.Shape, width: number, bevel = 0.05, curveSegments = 24) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelOffset: -bevel, bevelThickness: bevel, bevelSegments: 5, curveSegments });
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    position.setXYZ(i, z - (width - bevel * 2) / 2, position.getY(i), x);
    const nx = normal.getX(i), nz = normal.getZ(i);
    normal.setXYZ(i, nz, normal.getY(i), nx);
  }
  for (let i = 0; i < position.count; i += 3) {
    for (const attribute of [position, normal, uv]) {
      const size = attribute.itemSize;
      for (let c = 0; c < size; c++) {
        const a = attribute.array[(i + 1) * size + c];
        attribute.array[(i + 1) * size + c] = attribute.array[(i + 2) * size + c];
        attribute.array[(i + 2) * size + c] = a;
      }
    }
  }
  return geometry;
}

let noiseSeed = 1985;
function random() { noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0; return noiseSeed / 4294967296; }

/** Tileable multi-octave value noise in [0, 1]. */
export function valueNoise(size: number, octaves: number[], seed = 1985) {
  noiseSeed = seed;
  const field = new Float32Array(size * size);
  let amplitude = 1, total = 0;
  for (const cells of octaves) {
    const lattice = Array.from({ length: cells * cells }, random);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells, fy = (y / size) * cells;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (ix: number, iy: number) => lattice[(iy % cells) * cells + (ix % cells)];
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      field[y * size + x] += (top + (bottom - top) * sy) * amplitude;
    }
    total += amplitude;
    amplitude *= 0.55;
  }
  for (let i = 0; i < field.length; i++) field[i] /= total;
  return field;
}

/** Tangent-space normal map from a height field (the injection-moulded "Narbung" of ABS plastic). */
export function normalMap(size: number, octaves: number[], strength: number, seed?: number) {
  const height = valueNoise(size, octaves, seed);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const h = (ix: number, iy: number) => height[((iy + size) % size) * size + ((ix + size) % size)];
    const dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    const n = V(-dx, -dy, 1).normalize();
    const i = (y * size + x) * 4;
    data[i] = (n.x * 0.5 + 0.5) * 255; data[i + 1] = (n.y * 0.5 + 0.5) * 255; data[i + 2] = (n.z * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Greyscale map for roughness variation (fingerprints, wear, dust). */
export function greyMap(size: number, octaves: number[], low: number, high: number, seed?: number) {
  const field = valueNoise(size, octaves, seed);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < field.length; i++) {
    const value = (low + (high - low) * field[i]) * 255;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

type Draw = (context: CanvasRenderingContext2D, width: number, height: number) => void;

/** One canvas atlas for every printed legend, badge and label; lit like the surface it sits on. */
export class DecalAtlas {
  readonly canvas = document.createElement("canvas");
  readonly texture: THREE.CanvasTexture;
  readonly material: THREE.MeshStandardMaterial;
  private context: CanvasRenderingContext2D;
  /** Skyline packer: the top edge of the filled area as a list of horizontal segments. */
  private skyline = [{ x: 0, y: 0, width: 0 }];

  constructor(private size = 2048) {
    this.skyline[0].width = size;
    this.canvas.width = this.canvas.height = size;
    this.context = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.material = new THREE.MeshStandardMaterial({ map: this.texture, transparent: true, roughness: 0.62, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  }

  private allocate(width: number, height: number) {
    let best: { x: number; y: number; index: number } | undefined;
    for (let i = 0; i < this.skyline.length; i++) {
      const x = this.skyline[i].x;
      if (x + width > this.size) break;
      let y = 0, covered = 0;
      for (let j = i; covered < width && j < this.skyline.length; j++) { y = Math.max(y, this.skyline[j].y); covered += this.skyline[j].width; }
      if (covered < width || y + height > this.size) continue;
      if (!best || y < best.y) best = { x, y, index: i };
    }
    if (!best) throw new Error("Decal atlas is full");
    this.skyline.splice(best.index, 0, { x: best.x, y: best.y + height, width });
    for (let i = best.index + 1; i < this.skyline.length; i++) {
      const previous = this.skyline[i - 1], current = this.skyline[i];
      const overlap = previous.x + previous.width - current.x;
      if (overlap <= 0) break;
      current.x += overlap; current.width -= overlap;
      if (current.width > 0) break;
      this.skyline.splice(i--, 1);
    }
    for (let i = 0; i < this.skyline.length - 1; i++) {
      if (this.skyline[i].y === this.skyline[i + 1].y) { this.skyline[i].width += this.skyline[i + 1].width; this.skyline.splice(i-- + 1, 1); }
    }
    return best;
  }

  region(width: number, height: number, draw: Draw) {
    const w = Math.ceil(width), h = Math.ceil(height), pad = 4;
    const { x, y } = this.allocate(w + pad, h + pad);
    this.context.save();
    this.context.beginPath(); this.context.rect(x, y, w, h); this.context.clip();
    this.context.translate(x, y);
    draw(this.context, w, h);
    this.context.restore();
    this.texture.needsUpdate = true;
    return [x / this.size, 1 - (y + h) / this.size, (x + w) / this.size, 1 - y / this.size] as const;
  }

  /** A plane of the given world size, facing +z; pixels per world unit set the print resolution. */
  decal(width: number, height: number, draw: Draw, density = 420, material: THREE.Material = this.material) {
    const [u0, v0, u1, v1] = this.region(width * density, height * density, draw);
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    const result = new THREE.Mesh(geometry, material);
    result.receiveShadow = true;
    return result;
  }
}

/** Centered single-line text, scaled down to fit its box. */
export function text(context: CanvasRenderingContext2D, value: string, width: number, height: number, { color = "#2b2c27", font = "Helvetica, Arial, sans-serif", weight = "600", size = 0.62, align = "center" as CanvasTextAlign, style = "", spacing = 0 } = {}) {
  context.fillStyle = color;
  context.font = `${style} ${weight} ${Math.round(height * size)}px ${font}`;
  context.textAlign = align;
  context.textBaseline = "middle";
  if (spacing) context.letterSpacing = `${spacing}px`;
  const x = align === "left" ? height * 0.1 : align === "right" ? width - height * 0.1 : width / 2;
  context.fillText(value, x, height / 2 + height * 0.04, width * 0.96);
  if (spacing) context.letterSpacing = "0px";
}

/** A horizontal cross-section of a moulded body: a rounded rectangle at height `y`. */
export interface LoftSection { y: number; halfWidth: number; front: number; back: number; radius: number }

const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

/** Catmull-Rom interpolation of the key sections at fractional key index `u`. */
export function sectionAt(keys: LoftSection[], u: number): LoftSection {
  const i = Math.min(keys.length - 2, Math.max(0, Math.floor(u)));
  const t = u - i;
  const at = (k: number) => keys[Math.min(keys.length - 1, Math.max(0, k))];
  const blend = (name: keyof LoftSection) => catmull(at(i - 1)[name], at(i)[name], at(i + 1)[name], at(i + 2)[name], t);
  return { y: blend("y"), halfWidth: blend("halfWidth"), front: blend("front"), back: blend("back"), radius: blend("radius") };
}

/** The section whose height is `y` (key heights must increase). */
export function sectionAtHeight(keys: LoftSection[], y: number) {
  let low = 0, high = keys.length - 1;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (sectionAt(keys, middle).y < y) low = middle; else high = middle;
  }
  return sectionAt(keys, (low + high) / 2);
}

/**
 * Smooth body lofted through rounded-rectangle sections (x across, z front/back), capped top and
 * bottom. Every ring has the same vertex layout, so the rounded corners line up from bottom to top.
 */
export function roundedLoft(keys: LoftSection[], ringsPerKey = 5, corner = 10, edge = 6) {
  const perimeter = 4 * edge + 2 * edge + 4 * corner;
  const ring = (s: LoftSection) => {
    const r = Math.max(0.001, Math.min(s.radius, s.halfWidth * 0.999, ((s.front - s.back) / 2) * 0.999));
    const hw = s.halfWidth, zf = s.front, zb = s.back, ix = hw - r;
    const points: [number, number][] = [];
    const line = (x0: number, z0: number, x1: number, z1: number, count: number) => { for (let i = 0; i < count; i++) points.push([x0 + ((x1 - x0) * i) / count, z0 + ((z1 - z0) * i) / count]); };
    const arc = (cx: number, cz: number, from: number, to: number) => { for (let i = 0; i < corner; i++) { const a = from + ((to - from) * i) / corner; points.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } };
    line(0, zf, ix, zf, edge);
    arc(ix, zf - r, Math.PI / 2, 0);
    line(hw, zf - r, hw, zb + r, edge);
    arc(ix, zb + r, 0, -Math.PI / 2);
    line(ix, zb, -ix, zb, edge * 2);
    arc(-ix, zb + r, -Math.PI / 2, -Math.PI);
    line(-hw, zb + r, -hw, zf - r, edge);
    arc(-ix, zf - r, Math.PI, Math.PI / 2);
    line(-ix, zf, 0, zf, edge);
    return points;
  };
  const count = (keys.length - 1) * ringsPerKey + 1;
  const sections = Array.from({ length: count }, (_, i) => sectionAt(keys, i / ringsPerKey));
  const top = keys.at(-1)!.y;
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  sections.forEach((section) => ring(section).forEach(([x, z], j) => { positions.push(x, section.y, z); uvs.push(j / perimeter, section.y / top); }));
  for (let i = 0; i < count - 1; i++) {
    for (let j = 0; j < perimeter; j++) {
      const a = i * perimeter + j, b = i * perimeter + ((j + 1) % perimeter), c = a + perimeter, d = b + perimeter;
      index.push(a, b, c, b, d, c);
    }
  }
  // Top cap shares the last ring so the crown shades smoothly.
  const last = sections.at(-1)!;
  const crown = positions.length / 3;
  positions.push(0, last.y + 0.004, (last.front + last.back) / 2); uvs.push(0.5, 1);
  for (let j = 0; j < perimeter; j++) index.push(crown, (count - 1) * perimeter + j, (count - 1) * perimeter + ((j + 1) % perimeter));
  // Bottom cap with its own vertices keeps the base edge crisp.
  const base = positions.length / 3, first = sections[0];
  positions.push(0, first.y, (first.front + first.back) / 2); uvs.push(0.5, 0);
  ring(first).forEach(([x, z], j) => { positions.push(x, first.y, z); uvs.push(j / perimeter, 0); });
  for (let j = 0; j < perimeter; j++) index.push(base, base + 1 + ((j + 1) % perimeter), base + 1 + j);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
