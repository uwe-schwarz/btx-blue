import * as THREE from "three";
import { greyMap, normalMap } from "./kit";

export type Materials = ReturnType<typeof createMaterials>;

export function createMaterials(onLoad: () => void) {
  const loader = new THREE.TextureLoader();
  const load = (url: string, repeat: [number, number]) => {
    const texture = loader.load(url, onLoad);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.anisotropy = 8;
    return texture;
  };
  // Injection-moulded surfaces carry a fine matte grain; phone plastic is polished.
  const grain = normalMap(256, [48, 96, 160], 5.5, 11);
  grain.repeat.set(3, 3);
  const fineGrain = normalMap(256, [64, 128], 3, 17);
  fineGrain.repeat.set(6, 6);
  const wear = greyMap(256, [4, 9, 23], 0.78, 1, 23);
  const abs = load("/textures/aged-abs.jpg", [1.4, 1.4]);
  const walnut = load("/textures/walnut.jpg", [1.6, 1.1]);

  const plastic = (color: number, roughness: number, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, roughnessMap: wear, normalMap: grain, normalScale: new THREE.Vector2(0.18, 0.18), specularIntensity: 0.55, ...extra });

  return {
    textures: [grain, fineGrain, wear, abs, walnut],
    /** Warm "kieselgrau" housing ABS, lightly yellowed. */
    housing: plastic(0xd9cfb8, 0.5, { map: abs }),
    housingShade: plastic(0xb5ab95, 0.55, { map: abs }),
    /** Charcoal inner bezel and knobs. */
    charcoal: plastic(0x2a2c29, 0.46, { normalScale: new THREE.Vector2(0.1, 0.1) }),
    darkMask: plastic(0x1b1d1c, 0.7, { normalScale: new THREE.Vector2(0.08, 0.08) }),
    keyCap: plastic(0xe0d8c4, 0.42, { normalMap: fineGrain, normalScale: new THREE.Vector2(0.08, 0.08) }),
    keyMod: plastic(0x9d978a, 0.45, { normalMap: fineGrain, normalScale: new THREE.Vector2(0.08, 0.08) }),
    keyBlue: plastic(0x4b6178, 0.42, { normalMap: fineGrain, normalScale: new THREE.Vector2(0.08, 0.08) }),
    keyRed: plastic(0x9a4034, 0.42, { normalMap: fineGrain, normalScale: new THREE.Vector2(0.08, 0.08) }),
    keyPlate: plastic(0x3a3b36, 0.6),
    /** FeTAp 611 "farngrün", a glossy thermoplastic with soft reflections. */
    fern: new THREE.MeshPhysicalMaterial({ color: 0x4a6a45, roughness: 0.22, clearcoat: 0.55, clearcoatRoughness: 0.18, normalMap: fineGrain, normalScale: new THREE.Vector2(0.03, 0.03), specularIntensity: 0.8 }),
    fernDark: new THREE.MeshPhysicalMaterial({ color: 0x2f4630, roughness: 0.3, clearcoat: 0.4 }),
    couplerBody: plastic(0xe4decb, 0.45),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x131313, roughness: 0.82, sheen: 0.4, sheenColor: new THREE.Color(0x3a3a3a), sheenRoughness: 0.6 }),
    cord: new THREE.MeshPhysicalMaterial({ color: 0x3e5a3a, roughness: 0.35, clearcoat: 0.3 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.55 }),
    foam: new THREE.MeshStandardMaterial({ color: 0x3b3b39, roughness: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8d8d2, metalness: 1, roughness: 0.16 }),
    satin: new THREE.MeshStandardMaterial({ color: 0xcfcdc5, metalness: 0.75, roughness: 0.32 }),
    brass: new THREE.MeshPhysicalMaterial({ color: 0xb38a4c, metalness: 1, roughness: 0.28, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
    enamel: new THREE.MeshStandardMaterial({ color: 0xf1eadb, roughness: 0.35, side: THREE.BackSide }),
    acrylic: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, transmission: 0.92, thickness: 0.05, ior: 1.49, specularIntensity: 1, clearcoat: 1 }),
    wood: new THREE.MeshPhysicalMaterial({ map: walnut, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.32, normalMap: fineGrain, normalScale: new THREE.Vector2(0.05, 0.05) }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf2ecd9, roughness: 0.95 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.18, clearcoat: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: 0x050606, roughness: 0.9 }),
    led: (color: number) => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.25), emissive: color, emissiveIntensity: 0, roughness: 0.3 }),
  };
}
