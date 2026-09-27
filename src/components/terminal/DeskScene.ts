import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import type { ConnectionState, ModemSpeed } from "@/lib/terminal/connection";
import type { HandsetPlace } from "@/lib/terminal/audio";
import { dialRotation, type DialPlan } from "@/lib/terminal/dial";
import { DecalAtlas, V, place } from "./scene/kit";
import { createMaterials, type Materials } from "./scene/materials";
import { ScreenRaster } from "./scene/raster";
import { buildMonitor, RASTER } from "./scene/monitor";
import { buildKeyboard, type KeyboardKey } from "./scene/keyboard";
import { buildHandset, buildTelephone, CORD_JACK, CRADLE, HANDSET_CORD, PLUNGER_Y } from "./scene/telephone";
import { buildCoupler, buildDirectModem, SEATED } from "./scene/coupler";
import { buildDesk, buildLamp, buildNotepad, buildProps } from "./scene/room";
import { SpiralCord } from "./scene/cord";

export type DeskAction = "receiver" | "dial" | "power" | "brightness" | "lamp" | "speed" | "screen" | `key:${string}`;

const LAYOUT = {
  monitor: V(-1.1, 0, -0.9),
  keyboard: V(-1.1, 0, 2.4),
  phone: { position: V(3.8, 0, -1.25), rotation: -0.36 },
  coupler: { position: V(3.95, 0, 1.75), rotation: -0.22 },
  lamp: { position: V(-6.15, 0.66, -2.3), rotation: 0.12 },
  notepad: { position: V(-4.75, 0, 2.55), rotation: 0.2 },
};
const DESK_TARGET = V(0.45, 1.7, 0.2);
const LAMP_AIM = V(-2.6, 0, 1.6);
const BACKDROP_Z = -4.4;

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uResolution: { value: new THREE.Vector2(1, 1) } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uResolution; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 q = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
      color.rgb *= mix(0.62, 1.0, smoothstep(1.05, 0.28, length(q)));
      // Warm, slightly lifted blacks like 1980s colour negative film.
      color.rgb = color.rgb * vec3(1.02, 1.0, 0.96) + vec3(0.008, 0.006, 0.004);
      color.rgb += (hash(floor(vUv * uResolution)) - 0.5) * 0.022;
      gl_FragColor = color;
    }`,
};

/** Render quality tiers, from software rasterisers up to discrete GPUs. */
const QUALITY = [
  { ratio: 0.6, samples: 0, ao: false, bloom: false, shadow: 1024, transmission: false },
  { ratio: 1.25, samples: 2, ao: false, bloom: true, shadow: 1024, transmission: false },
  { ratio: 1.75, samples: 4, ao: true, bloom: true, shadow: 2048, transmission: true },
] as const;

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

export class DeskScene {
  private scene = new THREE.Scene();
  private htmlScene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer;
  private css = new CSS3DRenderer();
  private composer: EffectComposer;
  private ao: GTAOPass;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
  private screenObject: CSS3DObject;
  private raster: ScreenRaster;
  private atlas = new DecalAtlas(2048);
  private m: Materials;
  private monitor: ReturnType<typeof buildMonitor>;
  private keyboard: ReturnType<typeof buildKeyboard>;
  private phone: ReturnType<typeof buildTelephone>;
  private handset: THREE.Group;
  private coupler: ReturnType<typeof buildCoupler>;
  private modem: ReturnType<typeof buildDirectModem>;
  private lamp: ReturnType<typeof buildLamp>;
  private cord: SpiralCord;
  private backdrop: THREE.MeshBasicMaterial;
  private lampLight = new THREE.SpotLight(0xffb36b, 70, 0, 0.82, 0.85, 1.6);
  private bulbLight = new THREE.PointLight(0xffb060, 2.2, 2.4, 2);
  private screenLight: THREE.RectAreaLight;
  private environment?: THREE.WebGLRenderTarget;
  private clicks: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private parallax = new THREE.Vector2();
  private hovered?: THREE.Object3D;
  private screenWorld = new THREE.Vector3();
  private lookAt = DESK_TARGET.clone();
  private focused = false;
  private connection: ConnectionState = "idle";
  private acoustic = true;
  private speed: ModemSpeed = 1200;
  private transferring = false;
  private lampOn = true;
  private powered = true;
  private handsetPlace: HandsetPlace = "cradle";
  private tween?: { from: THREE.Vector3; fromQuaternion: THREE.Quaternion; to: HandsetPlace; start: number; duration: number; lift: number; resolve: () => void };
  private dialPlan?: { plan: DialPlan; start: number };
  private pressed = new Map<KeyboardKey, number>();
  private blinkUntil = 0;
  private dirty = true;
  private shadowsDirty = true;
  private frame = 0;
  private previousTime = 0;
  private stopped = false;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private resizeObserver: ResizeObserver;
  private down = { x: 0, y: 0 };
  private scheduled = false;
  private quality = QUALITY.length - 1;
  private frameTimes: number[] = [];
  private renderedPrevious = false;
  private settleFrames = 0;
  private handleVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(this.frame); this.scheduled = false; }
    else if (!this.stopped) { this.previousTime = performance.now(); this.kick(); }
  };

  constructor(private stage: HTMLElement, screen: HTMLElement, private onAction: (action: DeskAction) => void, private tooltip: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.className = "desk-webgl";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.css.domElement.className = "desk-html";
    // Focus must never scroll HTML independently of the WebGL screen bezel.
    this.css.domElement.style.overflow = "clip";
    stage.append(this.renderer.domElement, this.css.domElement);
    RectAreaLightUniformsLib.init();

    this.m = createMaterials(() => { this.dirty = true; this.kick(); });
    this.scene.background = new THREE.Color(0x0d0e0b);
    this.raster = new ScreenRaster(screen);
    this.raster.onChange = () => this.kick();
    screen.classList.add("crt-rendered");

    // Room, desk and every device.
    this.scene.add(buildDesk(this.m));
    const roomMap = new THREE.TextureLoader().load("/textures/room.jpg", () => { this.dirty = true; this.kick(); });
    roomMap.colorSpace = THREE.SRGBColorSpace;
    this.backdrop = new THREE.MeshBasicMaterial({ map: roomMap, toneMapped: false, fog: false });
    // The engraving hangs above the desk between terminal and phone; the window and fern sit to the right.
    place(this.scene, new THREE.Mesh(new THREE.PlaneGeometry(20, 13.33), this.backdrop), [0.3, 0.75, BACKDROP_Z]);
    const catcher = place(this.scene, new THREE.Mesh(new THREE.PlaneGeometry(20, 13.33), new THREE.ShadowMaterial({ opacity: 0.42 })), [0.3, 0.75, BACKDROP_Z + 0.05]);
    catcher.receiveShadow = true;

    this.monitor = buildMonitor(this.m, this.atlas, this.raster);
    place(this.scene, this.monitor.group, LAYOUT.monitor.toArray());
    this.keyboard = buildKeyboard(this.m, this.atlas);
    place(this.scene, this.keyboard.group, LAYOUT.keyboard.toArray());
    this.phone = buildTelephone(this.m, this.atlas);
    place(this.scene, this.phone.group, LAYOUT.phone.position.toArray(), [0, LAYOUT.phone.rotation, 0]);
    this.handset = buildHandset(this.m, this.atlas);
    this.scene.add(this.handset);
    this.coupler = buildCoupler(this.m, this.atlas);
    place(this.scene, this.coupler.group, LAYOUT.coupler.position.toArray(), [0, LAYOUT.coupler.rotation, 0]);
    this.modem = buildDirectModem(this.m, this.atlas);
    place(this.scene, this.modem.group, LAYOUT.coupler.position.toArray(), [0, LAYOUT.coupler.rotation, 0]);
    this.modem.group.visible = false;
    this.lamp = buildLamp(this.m);
    place(this.scene, this.lamp.group, LAYOUT.lamp.position.toArray(), [0, LAYOUT.lamp.rotation, 0]);
    this.scene.add(buildProps(this.m, this.atlas));
    const notepad = buildNotepad(this.m, this.atlas);
    place(this.scene, notepad, LAYOUT.notepad.position.toArray(), [0, LAYOUT.notepad.rotation, 0]);
    this.cord = new SpiralCord(this.m.cord);
    this.scene.add(this.cord.mesh);
    this.scene.updateMatrixWorld(true);
    this.aimLamp();

    // Lighting: a warm task lamp, the CRT's own blue glow and cold moonlight from the window.
    this.lampLight.castShadow = true;
    this.lampLight.shadow.mapSize.set(2048, 2048);
    this.lampLight.shadow.bias = -0.0004;
    this.lampLight.shadow.normalBias = 0.02;
    this.lampLight.shadow.radius = 5;
    this.lampLight.shadow.camera.near = 0.5;
    this.lampLight.shadow.camera.far = 30;
    this.scene.add(this.lampLight, this.lampLight.target, this.bulbLight);
    this.screenLight = new THREE.RectAreaLight(0x6a86ff, 4, RASTER.width, RASTER.height);
    this.monitor.tube.group.getWorldPosition(this.screenWorld);
    this.screenLight.position.copy(this.screenWorld).add(V(0, 0, 0.12));
    this.screenLight.lookAt(this.screenWorld.clone().add(V(0, -0.35, 5)));
    this.scene.add(this.screenLight);
    this.scene.add(new THREE.HemisphereLight(0x6d7a92, 0x2c1f14, 0.32));
    const moon = new THREE.DirectionalLight(0x8fa9dd, 0.55);
    moon.position.set(9, 7, -4);
    this.scene.add(moon);
    this.buildEnvironment();

    // Post-processing: ambient occlusion, bloom for phosphor and bulb, film grade.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new GTAOPass(this.scene, this.camera, 512, 512);
    this.ao.updateGtaoMaterial({ radius: 0.45, thickness: 0.9, samples: 12, distanceExponent: 1.5 });
    this.ao.blendIntensity = 0.85;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.34, 0.5, 0.95);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.setQuality(this.softwareRenderer() ? 0 : QUALITY.length - 1);

    // The HTML screen stays interactive, aligned with the phosphor raster.
    this.screenObject = new CSS3DObject(screen);
    this.screenObject.position.copy(this.screenWorld).add(V(0, 0, -0.035));
    this.screenObject.scale.setScalar(RASTER.width / 800);
    this.htmlScene.add(this.screenObject);

    this.interactive(this.monitor.power, "power", "Netzschalter");
    for (const knob of this.monitor.knobs) this.interactive(knob, "brightness", "Helligkeit und Kontrast");
    for (const key of this.keyboard.keys) this.interactive(key.group, `key:${key.key}`, keyTitle(key.key));
    this.interactive(this.handset, "receiver", "Hörer abheben / einlegen");
    this.interactive(this.phone.dial, "dial", "01910 wählen");
    this.interactive(this.coupler.group, "receiver", "Akustikkoppler Dataphon s21d");
    this.interactive(this.coupler.slider, "speed", "Übertragungsrate wählen");
    this.interactive(this.modem.group, "speed", "Modemprofil wählen");
    this.interactive(this.lamp.group, "lamp", "Schreibtischlampe schalten");
    this.interactive(this.monitor.tube.group, "screen", "Näher an den Bildschirm");

    this.camera.position.set(1.2, 6.5, 18);
    this.applyHandset("cradle");
    stage.addEventListener("pointermove", this.pointerMove);
    stage.addEventListener("pointerdown", this.pointerDown);
    stage.addEventListener("pointerup", this.pointerUp);
    stage.addEventListener("pointerleave", this.pointerLeave);
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.resize();
    this.kick();
  }

  private interactive(object: THREE.Object3D, action: DeskAction, title: string) {
    object.userData.action = action;
    object.userData.title = title;
    this.clicks.push(object);
  }

  private aimLamp() {
    const bulb = this.lamp.bulb.getWorldPosition(new THREE.Vector3());
    this.lampLight.position.copy(bulb);
    this.lampLight.target.position.copy(LAMP_AIM);
    this.bulbLight.position.copy(bulb);
  }

  /** Reflections for glass and glossy plastic: a dark room, the lamp's hot spot and the window. */
  private buildEnvironment() {
    const room = new THREE.Scene();
    const box = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x1d1e19).multiplyScalar(this.lampOn ? 1 : 0.35), side: THREE.BackSide }));
    room.add(box);
    if (this.lampOn) {
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb56a).multiplyScalar(14) }));
      glow.position.set(-5, 3.5, 1.5);
      room.add(glow);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6a5a3a).multiplyScalar(0.9) }));
      wall.position.set(-4, 3, -9.5);
      room.add(wall);
    }
    const window = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3e5a8c).multiplyScalar(1.2) }));
    window.position.set(9, 4, -6);
    window.lookAt(0, 3, 0);
    room.add(window);
    // The room behind the viewer, faintly lit: what the curved CRT glass mirrors back.
    const behind = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4a3b28).multiplyScalar(this.lampOn ? 0.55 : 0.12) }));
    behind.position.set(0, 3, 16);
    behind.lookAt(0, 3, 0);
    room.add(behind);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(this.lampOn ? 1.6 : 0.3) }));
    door.position.set(-7, 4, 15);
    door.lookAt(0, 3, 0);
    room.add(door);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment?.dispose();
    this.environment = pmrem.fromScene(room, 0.03);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    room.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } });
  }

  /** Requests a frame; never re-queues one that is already pending (that would starve the loop). */
  private kick() {
    this.dirty = true;
    if (this.stopped || document.hidden || this.scheduled) return;
    this.scheduled = true;
    this.frame = requestAnimationFrame(this.render);
  }

  setConnection(state: ConnectionState) {
    this.connection = state;
    this.keyboard.onlineLed.emissiveIntensity = state === "online" ? 2.2 : 0;
    this.kick();
  }

  setSpeed(speed: ModemSpeed) {
    this.speed = speed;
    this.acoustic = speed === 300 || speed === 1200;
    this.coupler.group.visible = this.acoustic;
    this.modem.group.visible = !this.acoustic && speed !== "LINE";
    this.coupler.slider.position.z = speed === 300 ? 0 : 0.1;
    this.shadowsDirty = true;
    this.kick();
  }

  setTransfer(active: boolean) { this.transferring = active; this.kick(); }
  /** Flickers the data LED briefly, e.g. for a keystroke on the back channel. */
  blink(milliseconds = 180) { this.blinkUntil = performance.now() + milliseconds; this.kick(); }

  setLamp(on: boolean) {
    this.lampOn = on;
    this.lampLight.intensity = on ? 70 : 0;
    this.bulbLight.intensity = on ? 2.2 : 0;
    this.lamp.bulbMaterial.emissiveIntensity = on ? 6 : 0;
    this.backdrop.color.set(on ? 0xffffff : 0x27304a);
    this.buildEnvironment();
    this.shadowsDirty = true;
    this.kick();
  }

  setPower(on: boolean, instant = false) {
    this.powered = on;
    this.monitor.tube.setPower(on, performance.now(), instant || this.reduced.matches);
    this.monitor.powerLed.emissiveIntensity = on ? 2.4 : 0;
    this.monitor.power.rotation.x = on ? -0.12 : 0.12;
    this.kick();
  }

  setBrightness(value: number) { this.monitor.tube.setBrightness(value); this.kick(); }
  setEffect(value: number) { this.monitor.tube.setEffect(value); this.kick(); }
  afterglow() { if (!this.reduced.matches) this.monitor.tube.afterglow(performance.now()); this.kick(); }
  focus(value: boolean) { this.focused = value; this.resize(); }

  dial(plan: DialPlan) {
    this.dialPlan = { plan, start: performance.now() };
    this.kick();
  }

  press(key: string, code?: string, down = true) {
    const name = key.length === 1 ? key.toLowerCase() : key;
    const matches = this.keyboard.keys.filter((entry) => entry.key.toLowerCase() === name.toLowerCase());
    const entry = matches.find((candidate) => code && candidate.code === code) ?? matches.find((candidate) => !candidate.code?.startsWith("Numpad")) ?? matches[0];
    if (!entry) return;
    if (down) this.pressed.set(entry, performance.now());
    else this.pressed.delete(entry);
    entry.group.position.y = entry.rest - (down ? 0.034 : 0);
    this.shadowsDirty = true;
    this.kick();
  }

  /** Clicks on the virtual keyboard press and release a key. */
  tap(key: string) {
    this.press(key, undefined, true);
    window.setTimeout(() => this.press(key, undefined, false), 110);
  }

  private pose(target: HandsetPlace) {
    if (target === "cradle") {
      return { position: this.phone.group.localToWorld(CRADLE.position.clone()), quaternion: this.phone.group.quaternion.clone() };
    }
    if (target === "coupler") {
      return { position: this.coupler.group.localToWorld(SEATED.clone()), quaternion: this.coupler.group.quaternion.clone() };
    }
    // At the listener's right ear, just outside the frame: earpiece up, capsule facing the head.
    const right = V(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = V(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const forward = V(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const position = this.camera.position.clone().addScaledVector(right, 1.5).addScaledVector(forward, 1.1).addScaledVector(up, -0.35);
    // Handset x runs mouthpiece → earpiece (up); its capsules face along -y, towards the head.
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(up, right, forward));
    return { position, quaternion };
  }

  private applyHandset(target: HandsetPlace) {
    const { position, quaternion } = this.pose(target);
    this.handset.position.copy(position);
    this.handset.quaternion.copy(quaternion);
    this.afterHandsetMove();
  }

  moveHandset(target: HandsetPlace, instant = false): Promise<void> {
    this.tween?.resolve();
    this.tween = undefined;
    const from = this.handsetPlace;
    this.handsetPlace = target;
    if (instant || this.reduced.matches) { this.applyHandset(target); this.kick(); return Promise.resolve(); }
    return new Promise((resolve) => {
      const far = from === "ear" || target === "ear";
      this.tween = {
        from: this.handset.position.clone(), fromQuaternion: this.handset.quaternion.clone(), to: target,
        start: performance.now(), duration: far ? 1050 : 900, lift: far ? 0.5 : 1.0, resolve,
      };
      this.kick();
    });
  }

  private updateHandset(now: number) {
    const tween = this.tween;
    if (!tween) {
      if (this.handsetPlace !== "ear") return false;
      const { position, quaternion } = this.pose("ear");
      if (position.distanceToSquared(this.handset.position) < 1e-8) return false;
      this.handset.position.copy(position); this.handset.quaternion.copy(quaternion);
      this.afterHandsetMove();
      return true;
    }
    const k = Math.min(1, (now - tween.start) / tween.duration);
    const e = easeInOut(k);
    const target = this.pose(tween.to);
    const up = V(0, tween.lift, 0);
    const p1 = tween.from.clone().add(up), p2 = target.position.clone().add(up.multiplyScalar(0.7));
    const s = 1 - e;
    this.handset.position.set(0, 0, 0)
      .addScaledVector(tween.from, s * s * s).addScaledVector(p1, 3 * s * s * e)
      .addScaledVector(p2, 3 * s * e * e).addScaledVector(target.position, e * e * e);
    // Rubber cups give a little as the handset settles.
    if (tween.to === "coupler" && k > 0.86) this.handset.position.y -= Math.sin(((k - 0.86) / 0.14) * Math.PI) * 0.03;
    this.handset.quaternion.slerpQuaternions(tween.fromQuaternion, target.quaternion, THREE.MathUtils.smoothstep(k, 0.08, 0.85));
    this.afterHandsetMove();
    if (k >= 1) { this.tween = undefined; tween.resolve(); }
    return true;
  }

  private afterHandsetMove() {
    this.handset.updateMatrixWorld(true);
    const start = this.handset.localToWorld(HANDSET_CORD.clone());
    const startOut = V(-1, -0.8, 0).applyQuaternion(this.handset.quaternion).normalize();
    const end = this.phone.group.localToWorld(CORD_JACK.clone());
    const endOut = V(-1, -0.4, 0.3).applyQuaternion(this.phone.group.quaternion).normalize();
    this.cord.update(start, startOut, end, endOut);
    const resting = this.handsetPlace === "cradle" && !this.tween;
    for (const plunger of this.phone.plungers) plunger.position.y = resting ? PLUNGER_Y.rest : PLUNGER_Y.raised;
    this.shadowsDirty = true;
  }

  private updateDial(now: number) {
    if (!this.dialPlan) return false;
    const t = (now - this.dialPlan.start) / 1000;
    this.phone.wheel.rotation.y = -dialRotation(this.dialPlan.plan, t);
    if (t > this.dialPlan.plan.duration) { this.dialPlan = undefined; this.phone.wheel.rotation.y = 0; }
    this.shadowsDirty = true;
    return true;
  }

  private updateLeds(now: number) {
    const online = this.connection === "online";
    const carrier = online || this.connection === "coupling";
    const active = (this.transferring && online) || now < this.blinkUntil;
    const flicker = active && !this.reduced.matches ? (Math.sin(now * 0.047) + Math.sin(now * 0.113) > 0 ? 3.2 : 0.3) : 0;
    this.coupler.leds.power.emissiveIntensity = this.powered ? 2 : 0;
    this.coupler.leds.carrier.emissiveIntensity = carrier && this.handsetPlace === "coupler" ? 2.4 : 0;
    this.coupler.leds.data.emissiveIntensity = flicker;
    const lit = [this.speed === 9600, false, carrier, ["dialing", "answering", "coupling", "online"].includes(this.connection), flicker > 1, now < this.blinkUntil, this.powered, true];
    this.modem.leds.forEach((led, index) => { led.emissiveIntensity = lit[index] ? 2.4 : 0; });
    return active;
  }

  /** Development aid: pin the camera to inspect a device up close. */
  inspect(position?: [number, number, number], target?: [number, number, number]) {
    this.inspection = position && target ? { position: V(...position), target: V(...target) } : undefined;
    this.kick();
  }
  private inspection?: { position: THREE.Vector3; target: THREE.Vector3 };

  private updateCamera(dt: number) {
    if (this.inspection) {
      this.camera.position.copy(this.inspection.position);
      this.lookAt.copy(this.inspection.target);
      this.camera.lookAt(this.lookAt);
      this.camera.updateMatrixWorld();
      return false;
    }
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.camera.aspect;
    let target: THREE.Vector3, position: THREE.Vector3;
    if (this.focused) {
      target = this.screenWorld.clone().add(V(0, 0.02, 0));
      const distance = Math.max(1.45 / tanHalf, 1.72 / (tanHalf * aspect));
      position = target.clone().add(V(0, 0.08, distance));
    } else {
      target = DESK_TARGET.clone();
      const distance = Math.max(3.3 / tanHalf, 6.5 / (tanHalf * aspect));
      position = target.clone().add(V(0.3 + this.parallax.x * 0.28, distance * 0.21 - this.parallax.y * 0.12, distance));
    }
    const smoothing = this.reduced.matches ? 1 : 1 - Math.exp(-dt * 4.2);
    const moving = this.camera.position.distanceToSquared(position) > 1e-6 || this.lookAt.distanceToSquared(target) > 1e-6;
    if (moving) { this.camera.position.lerp(position, smoothing); this.lookAt.lerp(target, smoothing); }
    else { this.camera.position.copy(position); this.lookAt.copy(target); }
    this.camera.lookAt(this.lookAt);
    this.camera.updateMatrixWorld();
    return moving;
  }

  private softwareRenderer() {
    const gl = this.renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  }

  /** Trades resolution and effects for frame rate; the scene, screen and sound stay identical. */
  private setQuality(level: number) {
    this.quality = level;
    const tier = QUALITY[level];
    const ratio = Math.min(devicePixelRatio, tier.ratio);
    this.renderer.setPixelRatio(ratio);
    this.composer.setPixelRatio(ratio);
    for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) { target.samples = tier.samples; target.dispose(); }
    this.bloom.enabled = tier.bloom;
    this.lampLight.shadow.mapSize.set(tier.shadow, tier.shadow);
    this.lampLight.shadow.map?.dispose();
    this.lampLight.shadow.map = null;
    Object.assign(this.m.acrylic, { transmission: tier.transmission ? 0.92 : 0, transparent: !tier.transmission, opacity: tier.transmission ? 1 : 0.32 });
    this.m.acrylic.needsUpdate = true;
    this.shadowsDirty = true;
    this.frameTimes = [];
    this.settleFrames = 20;
    this.resize();
  }

  /** Steps quality down when the median frame time stays above ~24 fps. */
  private measure(interval: number) {
    if (this.settleFrames > 0) { this.settleFrames--; return; }
    this.frameTimes.push(interval);
    if (this.frameTimes.length < 30) return;
    const median = [...this.frameTimes].sort((a, b) => a - b)[15];
    this.frameTimes = [];
    if (median > 42 && this.quality > 0) this.setQuality(this.quality - 1);
  }

  private resize() {
    const { width, height } = this.stage.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.css.setSize(width, height);
    this.ao.enabled = QUALITY[this.quality].ao && width > 720;
    this.bloom.resolution.set(width / 2, height / 2);
    const ratio = this.renderer.getPixelRatio();
    (this.grade.uniforms.uResolution.value as THREE.Vector2).set(width * ratio, height * ratio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  private render = (now: number) => {
    this.scheduled = false;
    if (this.stopped) return;
    const interval = now - this.previousTime;
    // Allow large steps so slow machines still settle the camera in a few frames.
    const dt = Math.min(0.25, interval / 1000 || 0.016);
    this.previousTime = now;
    let active = this.dirty;
    active = this.updateCamera(dt) || active;
    active = this.updateHandset(now) || active;
    active = this.updateDial(now) || active;
    active = this.monitor.tube.update(now) || active;
    active = this.updateLeds(now) || active;
    if (this.pressed.size) for (const [key, since] of this.pressed) if (now - since > 1500) { this.pressed.delete(key); key.group.position.y = key.rest; active = true; }
    // Keep ticking while a caret blinks or the page is being received.
    const waiting = this.raster.hasCaret || this.transferring || this.tween !== undefined || this.handsetPlace === "ear";
    if (active) {
      this.dirty = false;
      this.screenLight.intensity = 3.2 * this.monitor.tube.emission;
      if (this.shadowsDirty) { this.renderer.shadowMap.needsUpdate = true; this.shadowsDirty = false; }
      this.composer.render();
      this.css.render(this.htmlScene, this.camera);
      if (this.renderedPrevious) this.measure(interval);
    }
    this.renderedPrevious = active;
    if ((active || waiting) && !this.scheduled) { this.scheduled = true; this.frame = requestAnimationFrame(this.render); }
  };

  private pick(event: PointerEvent) {
    const rect = this.stage.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const hit of this.raycaster.intersectObjects(this.clicks, true)) {
      let visible = true, action: THREE.Object3D | undefined;
      for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
        if (!object.visible) visible = false;
        if (!action && object.userData.action) action = object;
      }
      if (visible && action) return action;
    }
    return undefined;
  }

  private pointerMove = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest(".btx-screen")) { this.tooltip.textContent = ""; return; }
    this.hovered = this.pick(event);
    this.parallax.copy(this.pointer);
    this.stage.style.cursor = this.hovered ? "pointer" : "default";
    this.tooltip.textContent = this.hovered?.userData.title ?? "";
    this.tooltip.style.left = `${Math.min(event.clientX + 16, innerWidth - 240)}px`;
    this.tooltip.style.top = `${event.clientY - 36}px`;
    if (!this.focused && !this.reduced.matches) this.kick();
  };
  private pointerDown = (event: PointerEvent) => { this.down = { x: event.clientX, y: event.clientY }; };
  private pointerUp = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest(".btx-screen") || Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 8) return;
    const object = this.pick(event);
    if (object) this.onAction(object.userData.action as DeskAction);
  };
  private pointerLeave = () => { this.tooltip.textContent = ""; this.parallax.set(0, 0); this.kick(); };
  private contextLost = (event: Event) => { event.preventDefault(); this.stage.dispatchEvent(new Event("desk:unavailable")); };

  dispose() {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    this.tween?.resolve();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.stage.removeEventListener("pointermove", this.pointerMove);
    this.stage.removeEventListener("pointerdown", this.pointerDown);
    this.stage.removeEventListener("pointerup", this.pointerUp);
    this.stage.removeEventListener("pointerleave", this.pointerLeave);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.contextLost);
    this.raster.dispose();
    this.screenObject.element.classList.remove("crt-rendered");
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    this.monitor.tube.dispose();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    for (const texture of this.m.textures) texture.dispose();
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.css.domElement.remove();
  }
}

function keyTitle(key: string) {
  const names: Record<string, string> = {
    "*": "Initiator  *", "#": "Terminator  #", Enter: "Datenfreigabe  ↵", Backspace: "Löschen", Home: "Startseite  #H",
    ArrowLeft: "Vorherige Seite", ArrowRight: "Nächste Seite", " ": "Leertaste", Shift: "Umschalten",
  };
  return names[key] ?? `Taste ${key.length === 1 ? key.toUpperCase() : key}`;
}
