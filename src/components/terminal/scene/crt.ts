import * as THREE from "three";
import type { ScreenRaster } from "./raster";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uContent;
  uniform sampler2D uPrevious;
  uniform vec2 uTexel;
  uniform float uLines;
  uniform float uTime;
  uniform float uPower;
  uniform float uCollapse;
  uniform float uDot;
  uniform float uBrightness;
  uniform float uEffect;
  uniform float uDegauss;
  uniform float uStatic;
  uniform float uAfterglow;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // Limited video bandwidth smears each scanline horizontally.
  vec3 scan(vec2 uv) {
    vec3 c = texture2D(uContent, uv).rgb * 0.56;
    c += texture2D(uContent, uv + vec2(uTexel.x * 1.1, 0.0)).rgb * 0.18;
    c += texture2D(uContent, uv - vec2(uTexel.x * 1.1, 0.0)).rgb * 0.18;
    c += texture2D(uContent, uv - vec2(uTexel.x * 3.0, 0.0)).rgb * 0.08;
    return c;
  }

  vec3 raster(vec2 p) {
    float y = p.y * uLines;
    float row = floor(y);
    float f = fract(y) - 0.5;
    vec3 c = scan(vec2(p.x, (row + 0.5) / uLines));
    vec3 n = scan(vec2(p.x, (row + (f > 0.0 ? 1.5 : -0.5)) / uLines));
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    // The electron beam widens with intensity (beam bloom).
    float width = mix(0.27, 0.46, clamp(lum * 1.4, 0.0, 1.0));
    float beam = exp(-f * f / (2.0 * width * width));
    float g = 1.0 - abs(f);
    float neighbour = exp(-g * g / (2.0 * 0.34 * 0.34));
    vec3 lines = (c * beam + n * neighbour * 0.5) * 1.32;
    // Fade scanlines out when they would alias (less than ~2.5 device pixels apart).
    float visible = 1.0 - smoothstep(0.32, 0.6, fwidth(y));
    return mix(c, lines, clamp(uEffect * 1.4, 0.0, 1.0) * visible);
  }

  void main() {
    vec2 uv = vUv;
    // Power-off: the vertical deflection collapses first, then the horizontal.
    float squeezeY = mix(1.0, 0.004, smoothstep(0.0, 1.0, uCollapse));
    float squeezeX = mix(1.0, 0.006, smoothstep(1.0, 2.0, uCollapse));
    vec2 p = (uv - 0.5) / vec2(squeezeX, squeezeY) + 0.5;
    // Degaussing leaves the purity briefly disturbed: colour swirls that settle.
    vec2 swirl = uDegauss * 0.018 * vec2(sin(p.y * 11.0 + uTime * 23.0), cos(p.x * 9.0 - uTime * 19.0));
    vec3 color = vec3(0.0);
    if (p.x > -0.02 && p.x < 1.02 && p.y > -0.02 && p.y < 1.02) {
      vec2 q = clamp(p, 0.0, 1.0);
      color.r = raster(q + swirl).r;
      color.g = raster(q).g;
      color.b = raster(q - swirl * 0.8).b;
      // Phosphor persistence of the previous page.
      color = max(color, texture2D(uPrevious, q).rgb * uAfterglow * 0.45);
      // Halation: light scattered inside the thick faceplate glass.
      color += texture2D(uContent, q, 5.0).rgb * 0.1 * (0.4 + uEffect);
      color += uDegauss * 0.25 * vec3(0.5 + 0.5 * sin(p.x * 6.0 + uTime * 4.0), 0.3, 0.5 + 0.5 * cos(p.y * 5.0 - uTime * 3.0)) * color;
    }
    float lum = dot(color, vec3(0.3, 0.59, 0.11));
    // The collapsing raster concentrates the same beam energy into less area, turning white-hot.
    float whiten = smoothstep(0.35, 1.0, uCollapse);
    float gain = pow(1.0 / max(squeezeY, 0.03), 0.55) * pow(1.0 / max(squeezeX, 0.02), 0.35);
    vec3 hot = vec3(lum * 0.6 + 0.4 * step(0.0005, lum)) * vec3(0.85, 0.92, 1.0);
    color = mix(color, hot, whiten) * gain;
    color *= uBrightness * uPower;
    // A slowly dying bright spot after switch-off.
    vec2 d = (uv - 0.5) * vec2(1.333, 1.0);
    color += vec3(0.8, 0.9, 1.0) * uDot * exp(-dot(d, d) / 0.00018) * 6.0;
    // EHT charging static.
    color += vec3(hash(uv * vec2(640.0, 480.0) + fract(uTime * 7.1))) * uStatic * 0.35 * vec3(0.8, 0.85, 1.0);
    // The tube face is darker towards its corners.
    vec2 c = (uv - 0.5) * vec2(1.0, 1.08);
    color *= 1.0 - smoothstep(0.28, 0.75, length(c)) * 0.55;
    vec3 glass = vec3(0.014, 0.017, 0.016);
    // Phosphor saturates: a soft knee keeps white text bright without blowing out.
    color = color * 1.7 / (1.0 + 0.35 * max(color, vec3(0.0)));
    gl_FragColor = vec4(glass + color, 1.0);
  }
`;

/** Spherical-ish faceplate: flat enough to read, curved enough to catch the lamp. */
export function tubeGeometry(width: number, height: number, bulge: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 48, 36);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) / (width / 2), v = position.getY(i) / (height / 2);
    position.setZ(i, -bulge * (u * u * 0.8 + v * v * 1.0));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export class CrtTube {
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;
  readonly glass: THREE.Mesh;
  private content: THREE.CanvasTexture;
  private previous: THREE.CanvasTexture;
  private version = -1;
  private power = { on: true, changed: -10, instant: true };
  private afterglowStart = -10;
  private brightness = 1;
  private effect = 0.4;

  constructor(private raster: ScreenRaster, width: number, height: number, bulge = 0.06) {
    this.content = new THREE.CanvasTexture(raster.canvas);
    this.previous = new THREE.CanvasTexture(raster.previous);
    for (const texture of [this.content, this.previous]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.anisotropy = 4;
    }
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uContent: { value: this.content },
        uPrevious: { value: this.previous },
        uTexel: { value: new THREE.Vector2(1 / raster.canvas.width, 1 / raster.canvas.height) },
        // 24 text rows of ten lines each within a 600 px tall screen of 22 px rows: about 273 visible lines.
        uLines: { value: (600 / 22) * 10 },
        uTime: { value: 0 },
        uPower: { value: 1 },
        uCollapse: { value: 0 },
        uDot: { value: 0 },
        uBrightness: { value: 1 },
        uEffect: { value: 0.4 },
        uDegauss: { value: 0 },
        uStatic: { value: 0 },
        uAfterglow: { value: 0 },
      },
    });
    const geometry = tubeGeometry(width, height, bulge);
    const phosphor = new THREE.Mesh(geometry, this.material);
    phosphor.name = "phosphor";
    this.group.add(phosphor);
    // Black glass that only adds reflections: the lamp, the room and a soft sheen.
    this.glass = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
      color: 0x000000, roughness: 0.07, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6,
      specularIntensity: 1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.glass.position.z = 0.006;
    this.glass.renderOrder = 2;
    this.group.add(this.glass);
  }

  setBrightness(value: number) { this.brightness = value; }
  setEffect(value: number) { this.effect = value; }

  setPower(on: boolean, now: number, instant = false) {
    if (this.power.on === on && !instant) return;
    this.power = { on, changed: now, instant };
  }

  /** Called when a new page replaces the old one: the old picture fades on the phosphor. */
  afterglow(now: number) {
    this.raster.snapshot();
    this.previous.needsUpdate = true;
    this.afterglowStart = now;
  }

  /** Advances animations; returns true while anything on the tube is still moving. */
  update(now: number) {
    const u = this.material.uniforms;
    const t = (now - this.power.changed) / 1000;
    u.uTime.value = now / 1000;
    u.uBrightness.value = this.brightness;
    u.uEffect.value = this.effect;
    let animating = false;
    if (this.power.on) {
      const warm = this.power.instant ? 1 : THREE.MathUtils.smoothstep(t, 0.35, 2.2);
      u.uPower.value = 0.04 + warm * 0.96;
      if (this.power.instant) u.uPower.value = 1;
      u.uCollapse.value = 0;
      u.uDot.value = 0;
      u.uDegauss.value = this.power.instant ? 0 : Math.max(0, 1 - t / 1.4) * (t > 0.3 ? 1 : 0);
      u.uStatic.value = this.power.instant ? 0 : Math.max(0, 0.9 - t / 1.6) * (t > 0.15 ? 1 : 0);
      animating = !this.power.instant && t < 2.4;
    } else if (this.power.instant) {
      u.uPower.value = 0; u.uCollapse.value = 0; u.uDot.value = 0; u.uDegauss.value = 0; u.uStatic.value = 0;
    } else {
      u.uCollapse.value = Math.min(2, t / 0.09 < 1 ? t / 0.09 : 1 + (t - 0.09) / 0.16);
      u.uPower.value = t < 0.25 ? 1 : 0;
      u.uDot.value = t < 0.2 ? 0 : Math.max(0, Math.exp(-(t - 0.2) / 0.55) - 0.01);
      u.uDegauss.value = 0; u.uStatic.value = 0;
      animating = t < 3.5;
    }
    const glow = Math.max(0, 1 - (now - this.afterglowStart) / 380);
    u.uAfterglow.value = glow;
    if (glow > 0) animating = true;
    if (this.raster.update(now) || this.raster.version !== this.version) {
      this.version = this.raster.version;
      this.content.needsUpdate = true;
      animating = true;
    }
    return animating;
  }

  /** Average light leaving the tube, for the room light the CRT casts. */
  get emission() {
    const u = this.material.uniforms;
    return u.uPower.value * u.uBrightness.value + u.uDot.value * 0.2;
  }

  dispose() {
    this.content.dispose();
    this.previous.dispose();
    this.material.dispose();
    (this.glass.material as THREE.Material).dispose();
    this.glass.geometry.dispose();
  }
}
