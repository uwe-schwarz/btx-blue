import * as THREE from "three";

const SAMPLES = 1100;
const RADIAL = 6;

/**
 * A coiled telephone cord. The centreline is a cubic curve with gravity sag that rests on the
 * desk; the wire winds around it with a fixed number of coils, so stretching spreads the pitch.
 */
export class SpiralCord {
  readonly mesh: THREE.Mesh;
  private positions: Float32Array;
  private normals: Float32Array;
  private centre = Array.from({ length: SAMPLES }, () => new THREE.Vector3());
  private helix = Array.from({ length: SAMPLES }, () => new THREE.Vector3());
  private tangent = new THREE.Vector3();
  private normal = new THREE.Vector3();
  private binormal = new THREE.Vector3();
  private scratch = new THREE.Vector3();

  constructor(material: THREE.Material, private coils = 58, private coilRadius = 0.05, private wireRadius = 0.017, private floor = 0) {
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(SAMPLES * RADIAL * 3);
    this.normals = new Float32Array(SAMPLES * RADIAL * 3);
    const index: number[] = [];
    for (let i = 0; i < SAMPLES - 1; i++) {
      for (let j = 0; j < RADIAL; j++) {
        const a = i * RADIAL + j, b = i * RADIAL + ((j + 1) % RADIAL), c = a + RADIAL, d = b + RADIAL;
        index.push(a, c, b, b, c, d);
      }
    }
    geometry.setIndex(index);
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("normal", new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
  }

  /** `startOut`/`endOut` point away from the anchors along the cord. */
  update(start: THREE.Vector3, startOut: THREE.Vector3, end: THREE.Vector3, endOut: THREE.Vector3) {
    const span = start.distanceTo(end);
    const reach = Math.min(0.9, 0.35 + span * 0.25);
    const p1 = start.clone().addScaledVector(startOut, reach);
    const p2 = end.clone().addScaledVector(endOut, reach);
    // A relaxed cord droops onto the desk; a stretched one hangs almost straight.
    const sag = Math.max(0.15, 1.3 - span * 0.12);
    const bottom = this.floor + this.coilRadius + this.wireRadius;
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1), s = 1 - t;
      const point = this.centre[i];
      point.set(0, 0, 0)
        .addScaledVector(start, s * s * s).addScaledVector(p1, 3 * s * s * t)
        .addScaledVector(p2, 3 * s * t * t).addScaledVector(end, t * t * t);
      point.y -= Math.sin(Math.PI * t) * sag;
      point.y = Math.max(bottom, point.y);
    }
    // Arc-length parameterisation keeps the coils evenly spaced along the cord.
    const lengths = new Float32Array(SAMPLES);
    for (let i = 1; i < SAMPLES; i++) lengths[i] = lengths[i - 1] + this.centre[i].distanceTo(this.centre[i - 1]);
    const total = lengths[SAMPLES - 1] || 1;
    // Parallel-transport frame avoids twisting.
    this.tangent.subVectors(this.centre[1], this.centre[0]).normalize();
    this.normal.set(0, 1, 0).cross(this.tangent);
    if (this.normal.lengthSq() < 1e-6) this.normal.set(1, 0, 0);
    this.normal.normalize();
    for (let i = 0; i < SAMPLES; i++) {
      const next = this.centre[Math.min(SAMPLES - 1, i + 1)], previous = this.centre[Math.max(0, i - 1)];
      const tangent = this.scratch.subVectors(next, previous).normalize();
      this.normal.addScaledVector(tangent, -this.normal.dot(tangent)).normalize();
      this.binormal.crossVectors(tangent, this.normal);
      const taper = Math.min(1, lengths[i] / 0.12, (total - lengths[i]) / 0.12);
      const angle = (lengths[i] / total) * this.coils * Math.PI * 2;
      this.helix[i].copy(this.centre[i])
        .addScaledVector(this.normal, Math.cos(angle) * this.coilRadius * taper)
        .addScaledVector(this.binormal, Math.sin(angle) * this.coilRadius * taper);
    }
    const ring = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
    for (let i = 0; i < SAMPLES; i++) {
      const next = this.helix[Math.min(SAMPLES - 1, i + 1)], previous = this.helix[Math.max(0, i - 1)];
      const tangent = this.scratch.subVectors(next, previous).normalize();
      side.set(0, 1, 0).cross(tangent);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0).cross(tangent);
      side.normalize();
      up.crossVectors(tangent, side);
      for (let j = 0; j < RADIAL; j++) {
        const a = (j / RADIAL) * Math.PI * 2;
        ring.copy(side).multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a));
        const o = (i * RADIAL + j) * 3;
        this.normals[o] = ring.x; this.normals[o + 1] = ring.y; this.normals[o + 2] = ring.z;
        this.positions[o] = this.helix[i].x + ring.x * this.wireRadius;
        this.positions[o + 1] = this.helix[i].y + ring.y * this.wireRadius;
        this.positions[o + 2] = this.helix[i].z + ring.z * this.wireRadius;
      }
    }
    const geometry = this.mesh.geometry;
    geometry.getAttribute("position").needsUpdate = true;
    geometry.getAttribute("normal").needsUpdate = true;
    geometry.computeBoundingSphere();
  }
}
