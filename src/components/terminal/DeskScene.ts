import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { ConnectionState, ModemSpeed } from "@/lib/terminal/connection";

export type DeskAction = "receiver" | "dial" | "power" | "brightness" | "lamp" | "speed" | "screen" | `key:${string}`;
type Material = THREE.Material;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function roundedRect(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function box(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: Material, radius = 0.04) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 5, radius), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, top: number, bottom: number, height: number, position: [number, number, number], material: Material, segments = 48) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function tube(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: Material, segments = 64) {
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 8, false), material);
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
function label(parent: THREE.Object3D, text: string, width: number, height: number, position: [number, number, number], color = "#3a392e", background?: string, font = "monospace") {
  const canvas = document.createElement("canvas"); canvas.width = width < 0.4 ? 128 : width < 1 ? 256 : 512; canvas.height = Math.max(32, Math.round(canvas.width * height / width));
  const ctx = canvas.getContext("2d")!;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.fillStyle = color; ctx.font = `${Math.round(canvas.height * 0.62)}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.94);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
  mesh.position.set(...position); parent.add(mesh); return mesh;
}
function roughTexture() {
  const data = new Uint8Array(128 * 128 * 4);
  let seed = 1985;
  for (let i = 0; i < data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 150 + seed % 100; data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 128, 128); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(5, 5); texture.needsUpdate = true;
  return texture;
}

export class DeskScene {
  private scene = new THREE.Scene();
  private htmlScene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer;
  private css = new CSS3DRenderer();
  private composer: EffectComposer;
  private ao: GTAOPass;
  private dirty = true;
  private lastRenderTime = 0;
  private camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
  private screenObject: CSS3DObject;
  private receiver = new THREE.Group();
  private dial = new THREE.Group();
  private phone = new THREE.Group();
  private lamp = new THREE.PointLight(0xffc27c, 28, 13, 2);
  private screenLight = new THREE.PointLight(0x3659ff, 2.5, 5, 2);
  private lampShade?: THREE.Mesh;
  private lampBulb = new THREE.MeshStandardMaterial({ color: 0xffdd97, emissive: 0xffbf63, emissiveIntensity: 2.5 });
  private powerLed = new THREE.MeshStandardMaterial({ color: 0xaade82, emissive: 0x64ab2b, emissiveIntensity: 1.8 });
  private receiveLed = new THREE.MeshStandardMaterial({ color: 0x413726, emissive: 0xffac32, emissiveIntensity: 0 });
  private directModem = new THREE.Group();
  private coupler = new THREE.Group();
  private clicks: THREE.Object3D[] = [];
  private pressedKeys = new Map<string, THREE.Mesh>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private hovered?: THREE.Object3D;
  private lastPointer = new THREE.Vector2();
  private handsetCable?: THREE.Mesh;
  private frame = 0;
  private previousTime = 0;
  private focused = false;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private resizeObserver: ResizeObserver;
  private connection: ConnectionState = "idle";
  private acoustic = true;
  private transferring = false;
  private cameraTarget = V(-0.3, 1.72, 0.25);
  private lookAt = V(-0.3, 1.72, 0.25);
  private screenCenter = V(-1.35, 2.52, 0.99);
  private handRest = V(2.35, 1.22, -0.38);
  private handCoupled = V(2.35, 0.67, 1.44);
  private handRaised = V(2.5, 2.0, 0.7);
  private targetReceiver = this.handRest.clone();
  private stopped = false;
  private environment: THREE.WebGLRenderTarget;
  private handleVisibility = () => {
    if (document.hidden) cancelAnimationFrame(this.frame);
    else if (!this.stopped) { this.previousTime = performance.now(); this.frame = requestAnimationFrame(this.render); }
  };

  constructor(private stage: HTMLElement, screen: HTMLElement, private onAction: (action: DeskAction) => void, private tooltip: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.domElement.className = "desk-webgl";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.css.domElement.className = "desk-html";
    // Focus must never scroll HTML independently of the WebGL screen bezel.
    this.css.domElement.style.overflow = "clip";
    stage.append(this.renderer.domElement, this.css.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    this.environment = pmrem.fromScene(environment, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.18;
    environment.dispose(); pmrem.dispose();
    this.scene.background = new THREE.Color(0x22231e);
    this.scene.fog = new THREE.FogExp2(0x22231e, 0.024);
    this.build();
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new GTAOPass(this.scene, this.camera, 512, 512);
    this.ao.updateGtaoMaterial({ radius: 0.35, thickness: 0.8, samples: 8, distanceExponent: 1.4 });
    this.ao.blendIntensity = 0.7;
    this.composer.addPass(this.ao);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new SMAAPass());
    this.screenObject = new CSS3DObject(screen);
    this.screenObject.position.copy(this.screenCenter);
    this.screenObject.scale.setScalar(3.52 / 800);
    this.htmlScene.add(this.screenObject);
    this.camera.position.set(0.7, 5.15, 12.9);
    stage.addEventListener("pointermove", this.pointerMove);
    stage.addEventListener("pointerdown", this.pointerDown);
    stage.addEventListener("pointerup", this.pointerUp);
    stage.addEventListener("pointerleave", this.pointerLeave);
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.resize();
    this.frame = requestAnimationFrame(this.render);
  }

  private interactive(object: THREE.Object3D, action: DeskAction, title: string) {
    object.userData = { action, title }; this.clicks.push(object); return object;
  }

  private build() {
    const grain = roughTexture();
    const abs = new THREE.TextureLoader().load("/textures/aged-abs.jpg", () => { this.dirty = true; });
    abs.colorSpace = THREE.SRGBColorSpace; abs.wrapS = abs.wrapT = THREE.RepeatWrapping; abs.repeat.set(2, 2); abs.anisotropy = 8;
    const plastic = new THREE.MeshStandardMaterial({ map: abs, color: 0xb9b09d, roughness: 0.63, bumpMap: abs, bumpScale: 0.008 });
    const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x343934, roughness: 0.6, bumpMap: grain, bumpScale: 0.003 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x101310, roughness: 0.91 });
    const green = new THREE.MeshPhysicalMaterial({ color: 0x355137, roughness: 0.26, clearcoat: 0.5, clearcoatRoughness: 0.22, bumpMap: grain, bumpScale: 0.003 });
    const brass = new THREE.MeshStandardMaterial({ color: 0x947044, metalness: 0.82, roughness: 0.27 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xaaa99d, metalness: 0.85, roughness: 0.2 });
    const woodMap = new THREE.TextureLoader().load("/textures/walnut.jpg", () => { this.dirty = true; });
    woodMap.colorSpace = THREE.SRGBColorSpace; woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping; woodMap.repeat.set(2, 1.3); woodMap.anisotropy = 8;
    const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.36, bumpMap: woodMap, bumpScale: 0.025 });
    box(this.scene, [17, 0.22, 10], [0, -0.12, 0], wood, 0.06);
    const wall = new THREE.MeshStandardMaterial({ color: 0x4f5040, roughness: 1, bumpMap: grain, bumpScale: 0.014 });
    box(this.scene, [26, 13, 0.2], [0, 5, -4.2], wall);
    const roomMap = new THREE.TextureLoader().load("/textures/room.jpg", () => { this.dirty = true; });
    roomMap.colorSpace = THREE.SRGBColorSpace; roomMap.anisotropy = 8;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), new THREE.MeshBasicMaterial({ map: roomMap, toneMapped: false }));
    backdrop.position.set(0, -0.3, -4.06); this.scene.add(backdrop);
    const ambient = new THREE.HemisphereLight(0xd7e1e7, 0x6a4830, 0.32); this.scene.add(ambient);
    const key = new THREE.SpotLight(0xffcf90, 62, 24, 0.8, 0.8, 1.5); key.position.set(-4.5, 6.5, 4); key.target.position.set(-0.5, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.025; key.shadow.radius = 4;
    this.scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x8ba7cb, 0.5); rim.position.set(5, 5, -2); this.scene.add(rim);
    this.screenLight.position.set(-1.3, 2.0, 1.5); this.scene.add(this.screenLight);

    // CRT cabinet: separate back shell, bevelled front surround and recessed glass opening.
    const terminal = new THREE.Group(); terminal.position.x = -1.35; this.scene.add(terminal);
    box(terminal, [3.8, 3.0, 2.25], [0, 2.4, -0.53], plastic, 0.22);
    box(terminal, [4.36, 3.51, 0.26], [0, 2.35, 0.56], plastic, 0.15);
    const face = roundedRect(4.32, 3.5, 0.23);
    const hole = roundedRect(3.76, 2.83, 0.22); face.holes.push(new THREE.Path(hole.getPoints().map((p) => p.add(new THREE.Vector2(0, 0.16)))));
    const surround = new THREE.Mesh(new THREE.ExtrudeGeometry(face, { depth: 0.15, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.07, bevelThickness: 0.08, curveSegments: 16 }), plastic);
    surround.position.set(0, 2.35, 0.72); surround.castShadow = true; surround.receiveShadow = true; terminal.add(surround);
    const inner = roundedRect(3.85, 2.92, 0.24); inner.holes.push(new THREE.Path(roundedRect(3.52, 2.64, 0.18).getPoints()));
    const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(inner, { depth: 0.04, bevelEnabled: true, bevelSegments: 4, bevelSize: 0.07, bevelThickness: 0.065, curveSegments: 16 }), darkPlastic);
    bezel.position.set(0, 2.52, 0.86); terminal.add(bezel);
    box(terminal, [3.49, 2.61, 0.04], [0, 2.52, 0.94], new THREE.MeshBasicMaterial({ color: 0x020d29 }), 0.16);
    box(terminal, [2.0, 0.22, 1.4], [0, 0.47, -0.25], darkPlastic, 0.1);
    box(terminal, [2.65, 0.26, 1.8], [0, 0.21, -0.15], plastic, 0.09);
    for (let i = 0; i < 15; i++) {
      box(terminal, [0.025, 0.54, 0.055], [-1.75 + i * 0.077, 3.94, -0.42], rubber, 0.009).rotation.x = Math.PI / 2;
      box(terminal, [0.018, 0.025, 0.98], [-1.909, 2.0 + i * 0.064, -0.57], darkPlastic, 0.005);
    }
    for (const x of [-1.99, 1.99]) {
      const screw = cylinder(terminal, 0.025, 0.025, 0.007, [x, 0.78, 0.967], chrome, 20); screw.rotation.x = Math.PI / 2;
      box(terminal, [0.028, 0.006, 0.003], [x, 0.78, 0.973], rubber, 0.001);
    }
    label(terminal, "Btx", 0.35, 0.16, [-1.67, 0.93, 0.98], "#454d45", undefined, "serif");
    label(terminal, "BILDSCHIRMTEXT", 1.25, 0.075, [-0.75, 0.92, 0.975]);
    const power = box(terminal, [0.24, 0.14, 0.07], [1.72, 0.91, 0.985], darkPlastic, 0.015);
    this.interactive(power, "power", "Netzschalter");
    label(terminal, "I / O", 0.16, 0.07, [1.72, 0.91, 1.025], "#c9c8b5");
    box(terminal, [0.035, 0.035, 0.02], [1.49, 0.91, 1.0], this.powerLed, 0.008);
    const knob = cylinder(terminal, 0.065, 0.065, 0.07, [1.15, 0.91, 1.0], darkPlastic); knob.rotation.x = Math.PI / 2;
    this.interactive(knob, "brightness", "Helligkeit einstellen");
    label(terminal, "☼", 0.1, 0.09, [0.99, 0.91, 1.01]);

    // Individual key caps, legends, key travel and a recessed keyboard tray.
    const keyboard = new THREE.Group(); keyboard.position.set(-1.3, 0.0, 2.17); keyboard.rotation.x = 0.07; this.scene.add(keyboard);
    box(keyboard, [4.65, 0.26, 1.66], [0, 0.24, 0], plastic, 0.12);
    box(keyboard, [4.28, 0.04, 1.21], [0, 0.385, -0.08], darkPlastic, 0.05);
    const keys = ["1 2 3 4 5 6 7 8 9 0 ß ←", "Q W E R T Z U I O P Ü +", "A S D F G H J K L Ö Ä ↵", "⇧ Y X C V B N M , . - ⇧"];
    const keyMat = new THREE.MeshStandardMaterial({ color: 0xd1c8b1, roughness: 0.48, bumpMap: grain, bumpScale: 0.002 });
    const modifierMat = keyMat.clone(); modifierMat.color.set(0x999884);
    keys.forEach((row, r) => row.split(" ").forEach((key, c) => {
      const x = -1.96 + c * 0.27 + (r === 1 ? 0.05 : r === 2 ? 0.1 : 0), z = -0.52 + r * 0.25;
      const cap = box(keyboard, [0.265, 0.13, 0.217], [x, 0.46, z], ["←", "↵", "⇧"].includes(key) ? modifierMat : keyMat, 0.025);
      const legend = label(cap, key, 0.16, 0.12, [0, 0.07, 0], "#414337"); legend.rotation.x = -Math.PI / 2;
      const name = key === "←" ? "Backspace" : key === "↵" ? "Enter" : key === "⇧" ? "Shift" : key;
      this.interactive(cap, `key:${name}`, key); this.pressedKeys.set(name.toLowerCase(), cap);
    }));
    const space = box(keyboard, [1.83, 0.14, 0.21], [-0.15, 0.46, 0.5], keyMat, 0.02); this.interactive(space, "key: ", "Leertaste"); this.pressedKeys.set(" ", space);
    for (const [x, name] of [[-1.9, "Home"], [-1.5, "*"], [1.05, "#"], [1.47, "Enter"], [1.88, "Escape"]] as const) {
      const cap = box(keyboard, [0.34, 0.13, 0.21], [x, 0.46, 0.5], modifierMat, 0.02);
      const legend = label(cap, name === "Home" ? "H" : name === "Escape" ? "Esc" : name === "Enter" ? "↵" : name, 0.24, 0.1, [0, 0.07, 0]); legend.rotation.x = -Math.PI / 2;
      this.interactive(cap, `key:${name}`, name); this.pressedKeys.set(name.toLowerCase(), cap);
    }
    const numpad = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "Enter"];
    numpad.forEach((key, i) => {
      const cap = box(keyboard, [0.22, 0.13, 0.217], [1.43 + (i % 3) * 0.25, 0.46, -0.52 + Math.floor(i / 3) * 0.25], keyMat, 0.023);
      const legend = label(cap, key === "Enter" ? "↵" : key, 0.15, 0.1, [0, 0.07, 0]); legend.rotation.x = -Math.PI / 2;
      this.interactive(cap, `key:${key}`, key);
    });
    tube(this.scene, [V(-3.5, 0.16, 1.85), V(-4, 0.13, 1.2), V(-3.8, 0.14, -0.9), V(-2.7, 0.26, -1.5)], 0.035, rubber);

    // Fern-green rotary telephone, raised dial plate and recessed finger holes.
    this.phone.position.set(2.35, 0, -0.32); this.phone.rotation.y = -0.14; this.scene.add(this.phone);
    box(this.phone, [1.85, 0.15, 1.52], [0, 0.14, 0], darkPlastic, 0.08);
    const phoneProfile = new THREE.Shape();
    phoneProfile.moveTo(-0.7, 0.17); phoneProfile.lineTo(0.65, 0.17);
    phoneProfile.quadraticCurveTo(0.73, 0.2, 0.69, 0.5);
    phoneProfile.quadraticCurveTo(0.6, 0.76, 0.39, 0.75);
    phoneProfile.lineTo(-0.5, 0.46); phoneProfile.quadraticCurveTo(-0.72, 0.4, -0.7, 0.17);
    const housing = new THREE.Mesh(new THREE.ExtrudeGeometry(phoneProfile, { depth: 1.62, bevelEnabled: true, bevelSize: 0.09, bevelThickness: 0.09, bevelSegments: 5, curveSegments: 24 }), green);
    housing.rotation.y = Math.PI / 2; housing.position.x = -0.81; housing.castShadow = true; housing.receiveShadow = true; this.phone.add(housing);
    for (const x of [-0.66, 0.66]) {
      box(this.phone, [0.19, 0.42, 0.24], [x, 0.95, -0.37], green, 0.06);
      cylinder(this.phone, 0.045, 0.045, 0.14, [x, 1.2, -0.37], chrome);
    }
    this.dial.position.set(0, 0.67, 0.24); this.dial.rotation.x = 0.35; this.phone.add(this.dial);
    cylinder(this.dial, 0.52, 0.55, 0.05, [0, 0, 0], chrome);
    cylinder(this.dial, 0.48, 0.48, 0.06, [0, 0.035, 0], darkPlastic);
    const dialFace = cylinder(this.dial, 0.42, 0.42, 0.065, [0, 0.071, 0], brass);
    this.interactive(dialFace, "dial", "01910 wählen");
    cylinder(this.dial, 0.21, 0.21, 0.07, [0, 0.085, 0], green);
    const number = label(this.dial, "01910", 0.29, 0.095, [0, 0.125, 0], "#2d3628", "#ddd6b8"); number.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 10; i++) {
      const angle = -0.65 + i * 0.51, x = Math.sin(angle) * 0.33, z = Math.cos(angle) * 0.33;
      const hole = cylinder(this.dial, 0.067, 0.064, 0.009, [x, 0.109, z], rubber, 24); this.interactive(hole, "dial", "Wählscheibe drehen");
      const n = label(this.dial, String((i + 1) % 10), 0.08, 0.075, [Math.sin(angle) * 0.472, 0.071, Math.cos(angle) * 0.472], "#e7e1c5"); n.rotation.x = -Math.PI / 2;
    }
    box(this.dial, [0.07, 0.07, 0.16], [0.43, 0.14, 0.23], chrome, 0.014);
    this.receiver.position.copy(this.handRest); this.scene.add(this.receiver);
    tube(this.receiver, [V(-0.78, 0.11, 0), V(-0.48, 0.31, 0), V(0, 0.33, 0), V(0.48, 0.31, 0), V(0.78, 0.11, 0)], 0.115, green);
    for (const x of [-0.79, 0.79]) {
      const points = [new THREE.Vector2(0, 0), new THREE.Vector2(0.27, 0), new THREE.Vector2(0.29, 0.03), new THREE.Vector2(0.285, 0.11), new THREE.Vector2(0.25, 0.22), new THREE.Vector2(0.17, 0.29), new THREE.Vector2(0.06, 0.31), new THREE.Vector2(0, 0.31)];
      const ear = new THREE.Mesh(new THREE.LatheGeometry(points, 48), green); ear.position.set(x, 0, 0); ear.castShadow = true; this.receiver.add(ear);
      cylinder(this.receiver, 0.273, 0.265, 0.025, [x, 0.018, 0], darkPlastic);
    }
    this.interactive(this.receiver, "receiver", "Hörer abheben / einsetzen");
    const coils: THREE.Vector3[] = [];
    for (let i = 0; i <= 600; i++) {
      const t = i / 600, angle = t * Math.PI * 2 * 30;
      coils.push(V(1.22 + 0.1 * Math.cos(angle) - 0.35 * Math.sin(t * Math.PI), 0.16 + 0.09 * Math.sin(angle), -0.35 + t * 2.15));
    }
    tube(this.scene, coils, 0.024, rubber, 700);
    this.handsetCable = tube(this.scene, [V(1.22, 0.16, -0.35), V(1.04, 0.35, -0.46), V(1.5, 1.38, -0.38)], 0.027, rubber);

    this.coupler.position.set(2.35, 0, 1.43); this.scene.add(this.coupler);
    box(this.coupler, [2.11, 0.31, 0.88], [0, 0.26, 0], darkPlastic, 0.075);
    for (const x of [-0.78, 0.78]) {
      cylinder(this.coupler, 0.33, 0.34, 0.17, [x, 0.49, 0], rubber);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.066, 12, 48), rubber); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.62, 0); this.coupler.add(ring);
      cylinder(this.coupler, 0.235, 0.235, 0.02, [x, 0.58, 0], darkPlastic);
    }
    this.interactive(this.coupler, "receiver", "Hörer in den Akustikkoppler legen");
    label(this.coupler, "AKUSTIKKOPPLER", 1.06, 0.075, [-0.21, 0.29, 0.449], "#c6c9b6");
    box(this.coupler, [0.032, 0.032, 0.015], [0.54, 0.29, 0.452], this.receiveLed, 0.005);
    const speed = box(this.coupler, [0.2, 0.095, 0.04], [0.82, 0.29, 0.46], rubber, 0.01); this.interactive(speed, "speed", "Übertragungsrate ändern");
    tube(this.scene, [V(3.42, 0.3, 1.45), V(4, 0.2, 1.25), V(4.2, 0.1, -0.8), V(3.7, 0.2, -2.4)], 0.03, rubber);
    this.directModem.position.set(2.35, 0.17, 1.43); this.directModem.visible = false; this.scene.add(this.directModem);
    box(this.directModem, [2.1, 0.3, 1.0], [0, 0.04, 0], plastic, 0.06);
    box(this.directModem, [1.99, 0.19, 0.04], [0, 0.035, 0.51], darkPlastic, 0.01);
    label(this.directModem, "DIREKTMODEM", 0.72, 0.075, [-0.48, 0.045, 0.535], "#c5c6ad");
    for (let i = 0; i < 5; i++) box(this.directModem, [0.03, 0.03, 0.02], [0.16 + i * 0.15, 0.04, 0.541], i === 2 ? this.receiveLed : this.powerLed, 0.004);
    this.interactive(this.directModem, "speed", "Modemprofil wählen");

    // Brass desk lamp with a warm, emissive inner shade.
    const lamp = new THREE.Group(); lamp.position.set(-5.25, 0, 0.5); this.scene.add(lamp);
    cylinder(lamp, 0.56, 0.65, 0.13, [0, 0.1, 0], brass);
    cylinder(lamp, 0.34, 0.48, 0.13, [0, 0.22, 0], brass);
    cylinder(lamp, 0.065, 0.095, 2.72, [0, 1.55, 0], brass);
    tube(lamp, [V(0, 2.86, 0), V(0.05, 3.45, 0), V(0.7, 3.6, 0), V(0.83, 3.4, 0)], 0.058, brass);
    const shade = new THREE.Group(); shade.position.set(0.83, 3.25, 0); shade.rotation.z = -0.12; lamp.add(shade);
    const lathe = [new THREE.Vector2(0.18, 0.43), new THREE.Vector2(0.25, 0.4), new THREE.Vector2(0.34, 0.29), new THREE.Vector2(0.5, 0.12), new THREE.Vector2(0.66, -0.06), new THREE.Vector2(0.67, -0.11)];
    const shadeMaterial = brass.clone(); shadeMaterial.side = THREE.DoubleSide;
    this.lampShade = new THREE.Mesh(new THREE.LatheGeometry(lathe, 64), shadeMaterial); this.lampShade.castShadow = true; shade.add(this.lampShade);
    cylinder(shade, 0.61, 0.61, 0.018, [0, -0.09, 0], this.lampBulb);
    this.lamp.position.set(-4.42, 3.05, 0.5); this.scene.add(this.lamp);
    this.interactive(lamp, "lamp", "Schreibtischlampe schalten");
    tube(this.scene, [V(-4.65, 0.1, -0.9), V(-4.4, 0.1, -2.2), V(-5.3, 0.1, -3.8)], 0.025, rubber);

    // Paper note with useful page shortcuts; the text is drawn into a small decal.
    const note = new THREE.Group(); note.position.set(-4.0, 0.025, 2.25); note.rotation.y = -0.23; this.scene.add(note);
    box(note, [1.22, 0.012, 1.51], [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0xd9c694, roughness: 0.97 }), 0.005);
    const noteCanvas = document.createElement("canvas"); noteCanvas.width = 512; noteCanvas.height = 640;
    const ctx = noteCanvas.getContext("2d")!;
    ctx.fillStyle = "#d9c99e"; ctx.fillRect(0, 0, 512, 640);
    ctx.strokeStyle = "#b4b395"; ctx.lineWidth = 1;
    for (let y = 80; y < 640; y += 46) { ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(490, y); ctx.stroke(); }
    ctx.fillStyle = "#3d4948"; ctx.font = "italic 32px Georgia";
    ["Nicht vergessen:", "", "000  Startseite", "800  Seitenfinder", "", "* S  →  Suche", "# H  →  Start", "", "Erst den Hörer", "einlegen!"].forEach((line, i) => ctx.fillText(line, 35, 72 + i * 46));
    const noteTexture = new THREE.CanvasTexture(noteCanvas); noteTexture.colorSpace = THREE.SRGBColorSpace;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.19, 1.48), new THREE.MeshStandardMaterial({ map: noteTexture, roughness: 1 })); paper.rotation.x = -Math.PI / 2; paper.position.y = 0.01; note.add(paper);
    this.interactive(paper, "screen", "Platz nehmen");
    const pen = cylinder(note, 0.035, 0.035, 1.18, [0.24, 0.06, 0.54], darkPlastic, 24); pen.rotation.z = Math.PI / 2; pen.rotation.y = -0.22;
    const clip = box(pen, [0.018, 0.33, 0.015], [0.035, 0.3, 0], brass, 0.004); void clip;

    // A small book stack gives the desk some lived-in detail.
    for (let i = 0; i < 2; i++) {
      const book = new THREE.Group(); book.position.set(-4.85, 0.18 + i * 0.32, 0.8); book.rotation.y = i * 0.08; this.scene.add(book);
      const cover = new THREE.MeshStandardMaterial({ color: i ? 0x514b31 : 0x423326, roughness: 0.83 });
      box(book, [1.22, 0.28, 1.2], [0, 0, 0], cover, 0.02);
      box(book, [1.15, 0.21, 1.14], [0.01, 0, -0.01], new THREE.MeshStandardMaterial({ color: 0xc5bfa2, roughness: 1 }), 0.007);
      box(book, [1.22, 0.28, 0.05], [0, 0, 0.595], cover, 0.015);
      label(book, i ? "WELTATLAS" : "LEXIKON", 0.85, 0.12, [0, 0, 0.625], "#bda775", undefined, "serif");
    }

  }

  setConnection(state: ConnectionState) {
    this.dirty = true;
    this.connection = state;
    this.targetReceiver.copy(state === "idle" || state === "off" ? this.handRest : state === "online" || state === "coupling" ? (this.acoustic ? this.handCoupled : this.handRest) : this.handRaised);
    this.powerLed.emissiveIntensity = state === "off" ? 0 : 1.8;
    this.screenLight.intensity = state === "off" ? 0 : 2.5;
  }
  setSpeed(speed: ModemSpeed) {
    this.acoustic = speed === 300 || speed === 1200;
    this.coupler.visible = this.acoustic; this.directModem.visible = !this.acoustic;
    this.setConnection(this.connection);
  }
  setTransfer(active: boolean) { this.transferring = active; this.dirty = true; }
  setLamp(enabled: boolean) { this.lamp.intensity = enabled ? 28 : 0; this.lampBulb.emissiveIntensity = enabled ? 2.5 : 0; this.dirty = true; }
  focus(value: boolean) { this.focused = value; this.resize(); }
  key(key: string) {
    const mesh = this.pressedKeys.get(key.toLowerCase());
    if (!mesh) return;
    this.dirty = true;
    mesh.position.y = 0.417;
    setTimeout(() => { mesh.position.y = 0.46; this.dirty = true; }, 100);
  }
  private resize() {
    const { width, height } = this.stage.getBoundingClientRect();
    this.renderer.setSize(width, height); this.composer.setSize(width, height); this.ao.enabled = width > 720; this.dirty = true; this.css.setSize(width, height); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  }
  private render = (time: number) => {
    if (this.stopped) return;
    if (time - this.lastRenderTime < 30) { this.frame = requestAnimationFrame(this.render); return; }
    this.lastRenderTime = time;
    const dt = Math.min((time - this.previousTime) / 1000 || 0.016, 0.5); this.previousTime = time;
    const focus = this.focused;
    const target = focus ? V(-1.35, 2.52, 0.9) : this.cameraTarget;
    // Fit the whole screen on phones and the entire desk on narrow desktops.
    const distance = focus ? Math.max(4.95, 2.0 / (this.camera.aspect * Math.tan(THREE.MathUtils.degToRad(18.5)))) : Math.max(10.8, 5.0 / (this.camera.aspect * Math.tan(THREE.MathUtils.degToRad(18.5))));
    const cameraPosition = focus ? V(-1.35, 2.64, 0.99 + distance) : V(-0.05 + this.lastPointer.x * 0.14, 4.9 - this.lastPointer.y * 0.08, distance);
    const smoothing = this.reduced.matches ? 1 : 1 - Math.exp(-dt * 4.8);
    const cameraMoving = this.camera.position.distanceToSquared(cameraPosition) > 0.000001 || this.lookAt.distanceToSquared(target) > 0.000001;
    if (cameraMoving) { this.camera.position.lerp(cameraPosition, smoothing); this.lookAt.lerp(target, smoothing); }
    else { this.camera.position.copy(cameraPosition); this.lookAt.copy(target); }
    this.camera.lookAt(this.lookAt);
    const receiverMoving = this.receiver.position.distanceToSquared(this.targetReceiver) > 0.00001;
    this.receiver.position.lerp(this.targetReceiver, this.reduced.matches ? 1 : 1 - Math.exp(-dt * 5));
    if (receiverMoving && this.handsetCable) {
      const end = this.receiver.position.clone().add(V(-0.94, 0.16, 0));
      this.handsetCable.geometry.dispose();
      this.handsetCable.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(1.22, 0.16, -0.35), V(1.01, 0.4, 0.1), end.clone().add(V(-0.22, -0.35, 0.05)), end]), 48, 0.027, 8, false);
    }
    this.receiver.rotation.z = this.connection === "paused" || this.connection === "lifting" ? Math.sin(time * 0.001) * 0.04 : 0;
    if (this.connection === "dialing" && !this.reduced.matches) this.dial.rotation.y = -Math.abs(Math.sin(time * 0.0024)) * 1.9;
    else this.dial.rotation.y *= 0.88;
    this.receiveLed.emissiveIntensity = this.transferring && !this.reduced.matches ? (Math.sin(time * 0.025) > 0 ? 3 : 0.2) : this.connection === "online" ? 0.7 : 0;
    if (this.dirty || cameraMoving || receiverMoving || this.connection === "dialing" || this.transferring) {
      if (receiverMoving || this.dirty) this.renderer.shadowMap.needsUpdate = true;
      this.composer.render(); this.css.render(this.htmlScene, this.camera); this.dirty = false;
    }
    this.frame = requestAnimationFrame(this.render);
  };
  private pick(event: PointerEvent) {
    const rect = this.stage.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clicks, true);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object, action: THREE.Object3D | undefined;
      let visible = true;
      while (object) { if (!object.visible) visible = false; if (object.userData.action) action = object; object = object.parent; }
      if (visible && action) return action;
    }
    return undefined;
  }
  private pointerMove = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest(".btx-screen")) return;
    this.hovered = this.pick(event); this.lastPointer.copy(this.pointer);
    this.stage.style.cursor = this.hovered ? "pointer" : "default";
    this.tooltip.textContent = this.hovered?.userData.title ?? "";
    this.tooltip.style.left = `${Math.min(event.clientX + 16, innerWidth - 220)}px`; this.tooltip.style.top = `${event.clientY - 35}px`;
  };
  private down = { x: 0, y: 0 };
  private pointerDown = (event: PointerEvent) => { this.down = { x: event.clientX, y: event.clientY }; };
  private pointerUp = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest(".btx-screen") || Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 8) return;
    const object = this.pick(event); if (object) this.onAction(object.userData.action as DeskAction);
  };
  private pointerLeave = () => { this.tooltip.textContent = ""; this.lastPointer.set(0, 0); };
  private contextLost = (event: Event) => { event.preventDefault(); this.stage.dispatchEvent(new Event("desk:unavailable")); };
  dispose() {
    this.stopped = true; cancelAnimationFrame(this.frame); this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.stage.removeEventListener("pointermove", this.pointerMove); this.stage.removeEventListener("pointerdown", this.pointerDown); this.stage.removeEventListener("pointerup", this.pointerUp); this.stage.removeEventListener("pointerleave", this.pointerLeave);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.contextLost);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
    this.composer.passes.forEach((pass) => pass.dispose()); this.composer.dispose();
    this.environment.dispose(); this.renderer.dispose();
    this.renderer.domElement.remove(); this.css.domElement.remove();
  }
}
