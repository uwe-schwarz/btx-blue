import { initBtxScreen, readBaudPreference } from "@/components/btx/BtxInput";
import { initBtxNavigation } from "@/lib/terminal/navigation";
import { BUSY_STATES, CONNECTION_LABELS, MODEM_PROFILES, UNIT_PRICE_DM, callUnits, formatDm, formatDuration, parseModemSpeed, type ConnectionState } from "@/lib/terminal/connection";
import { TerminalAudio, type HandsetPlace } from "@/lib/terminal/audio";
import { BTX_NUMBER, digitsDialed, planDial } from "@/lib/terminal/dial";
import { localScreen, type LocalScreenInfo, type ScreenRow } from "@/lib/terminal/local-screens";
import { pageBytes } from "@/lib/terminal/modem";
import type { DeskScene, DeskAction, DeskView } from "./DeskScene";

export async function initTerminal() {
  const rootElement = document.querySelector<HTMLElement>("[data-terminal]");
  const screenElement = document.querySelector<HTMLElement>(".btx-screen");
  if (!rootElement || !screenElement || rootElement.dataset.initialized) return;
  const root = rootElement, screen = screenElement;
  root.dataset.initialized = "true";
  const stage = root.querySelector<HTMLElement>("[data-desk-stage]")!;
  const source = root.querySelector<HTMLElement>("[data-terminal-source]")!;
  const settings = root.querySelector<HTMLElement>("#terminal-settings")!;
  const query = <T extends HTMLElement = HTMLButtonElement>(name: string) => root.querySelector<T>(`[data-${name}]`)!;
  const settingsPanel = document.querySelector<HTMLElement>(".btx-settings-panel");
  if (settingsPanel) query("settings-slot").append(settingsPanel);
  const read = (key: string, fallback: string) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ } };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let state: ConnectionState = "idle";
  let speed = parseModemSpeed(String(readBaudPreference()));
  let scene: DeskScene | undefined;
  let portrait = innerWidth / (innerHeight - 118) < 0.85;
  let focus = portrait;
  let view: DeskView | "free" = focus ? "screen" : "desk";
  let sound = read("btx-sound", "true") === "true";
  let lamp = true;
  let flat = read("btx-flat", "false") === "true";
  let transferring = false;
  let shifted = false;
  let token = 0;
  let sceneGeneration = 0;
  let handset: HandsetPlace = "cradle";
  let connectedAt = 0;
  let dialed = "";
  let line = "";
  let summary: LocalScreenInfo["summary"];
  const timers = new Set<number>();
  const audio = new TerminalAudio();
  audio.setEnabled(sound);
  if (import.meta.env.DEV) Object.assign(window, { __audio: audio });
  const acoustic = () => speed === 300 || speed === 1200;

  // The terminal's own teletext screens, rendered like any Btx page (40×24) above the received page.
  const overlay = document.createElement("div");
  overlay.className = "screen-connection";
  const localGrid = document.createElement("div");
  localGrid.className = "btx-grid screen-local";
  localGrid.dataset.localGrid = "";
  overlay.append(localGrid);
  screen.append(overlay);
  screen.setAttribute("aria-label", "BTX Bildschirm");

  function rowElement(row: ScreenRow) {
    const element = row.action ? document.createElement("button") : document.createElement("div");
    element.className = `btx-line${row.double ? " btx-line--double" : ""}${row.action ? " screen-local-action" : ""}`;
    if (element instanceof HTMLButtonElement) {
      element.type = "button";
      element.dataset.screenConnect = "";
      element.addEventListener("click", () => void connect());
    }
    if (row.decorative) element.setAttribute("aria-hidden", "true");
    for (const segment of row.segments) {
      const span = document.createElement("span");
      span.className = `tone-${segment.tone ?? "white"}${segment.background ? ` bg-${segment.background}` : ""}`;
      span.textContent = segment.text;
      element.append(span);
    }
    if (!row.segments.length) element.textContent = " ";
    return element;
  }
  function renderLocal() {
    const info: LocalScreenInfo = { state, profile: MODEM_PROFILES[speed].name, acoustic: acoustic(), speed, dialed, line, summary };
    const focused = document.activeElement?.closest("[data-screen-connect]") !== null && localGrid.contains(document.activeElement);
    localGrid.replaceChildren(...localScreen(info).map(rowElement));
    if (focused) localGrid.querySelector<HTMLElement>("[data-screen-connect]")?.focus({ preventScroll: true });
  }

  function later(milliseconds: number, callback: () => void) {
    const timer = window.setTimeout(() => { timers.delete(timer); callback(); }, milliseconds);
    timers.add(timer);
  }
  function wait(milliseconds: number, generation: number) {
    return new Promise<boolean>((resolve) => later(milliseconds, () => resolve(generation === token)));
  }
  function cancelTimers() { for (const timer of timers) clearTimeout(timer); timers.clear(); }

  function setState(next: ConnectionState) {
    state = next;
    document.documentElement.dataset.connection = next;
    root.dataset.connection = next;
    query("connection-status").textContent = next === "dialing" && dialed ? `Wähle ${BTX_NUMBER.slice(0, dialed.length)}${"·".repeat(BTX_NUMBER.length - dialed.length)}` : CONNECTION_LABELS[next];
    overlay.hidden = next === "online";
    screen.classList.toggle("screen-off", next === "off");
    document.querySelector<HTMLElement>("[data-btx-grid]")!.inert = next !== "online";
    const busy = BUSY_STATES.has(next);
    query("desk-connect").textContent = next === "online" ? "Auflegen" : next === "paused" ? "Fortsetzen" : busy ? "Abbrechen" : next === "off" ? "Einschalten" : "Verbinden";
    query("desk-skip").hidden = next === "online" || next === "off";
    query("desk-receiver").textContent = next === "online" ? "Hörer herausnehmen" : next === "paused" ? "Hörer einsetzen" : "Hörer abheben";
    query("desk-power").textContent = next === "off" ? "Terminal einschalten" : "Terminal ausschalten";
    query("desk-power").setAttribute("aria-pressed", String(next !== "off"));
    query("desk-hint").textContent = next === "online"
      ? "Seitennummer tippen · ↵ · Bildschirm anklicken zum Näherkommen."
      : next === "paused" ? "Hörer wieder in den Akustikkoppler legen, um fortzufahren."
      : next === "answering" ? "Pfeifton! Der Hörer kommt jetzt in den Akustikkoppler."
      : busy ? "Einen Moment – die Btx-Zentrale wird angewählt."
      : next === "off" ? "Netzschalter am Terminal drücken."
      : "Hörer abheben oder auf Verbinden klicken.";
    scene?.setConnection(next);
    renderLocal();
    document.dispatchEvent(new Event("btx:connection"));
    if (next === "online" && settings.hidden && window.matchMedia("(pointer: fine)").matches) document.querySelector<HTMLInputElement>("[data-btx-nav-input]")?.focus({ preventScroll: true });
  }

  async function unlock() {
    const first = !audio.ready;
    try {
      await audio.unlock();
      if (first) { audio.setSpeed(speed); audio.setVolume(Number(query<HTMLInputElement>("desk-volume").value)); if (state !== "off") audio.ambience(true); }
    } catch {
      query("desk-hint").textContent = "Audio ist nicht verfügbar. Die Verbindung funktioniert ohne Ton.";
    }
  }

  async function moveHandset(place: HandsetPlace, instant = false) {
    handset = place;
    await scene?.moveHandset(place, instant);
  }

  /** Lift, dial 01910 on the rotary dial, wait for the answer whistle, then couple the handset. */
  async function acousticCall(generation: number) {
    dialed = ""; line = "Wählton 425 Hz";
    setState("lifting");
    audio.liftHandset();
    audio.setHandset("ear", 0.35);
    await moveHandset("ear");
    if (!await wait(reduced.matches ? 300 : 650, generation)) return;
    const plan = planDial(BTX_NUMBER);
    line = "Impulswahl · 10 Imp./s";
    setState("dialing");
    scene?.dial(plan);
    audio.dial(plan);
    for (const step of plan.steps) later(step.returnEnd * 1000, () => {
      if (generation !== token) return;
      dialed = digitsDialed(plan, step.returnEnd + 0.001);
      setState("dialing");
    });
    if (!await wait(plan.duration * 1000, generation)) return;
    audio.exchange();
    line = "Vermittlung schaltet durch";
    renderLocal();
    if (!await wait(750, generation)) return;
    audio.ring();
    line = "Freiton";
    renderLocal();
    if (!await wait(2300, generation)) return;
    line = "";
    setState("answering");
    audio.answer(3.1);
    if (!await wait(1050, generation)) return;
    await moveHandset("coupler");
    if (generation !== token) return;
    audio.couplerSeated();
    audio.setHandset("coupler");
    setState("coupling");
    // The carrier follows the answer tone; the coupler starts its 390 Hz back channel.
    audio.carrier(true, reduced.matches ? 0 : 1.45);
    if (!await wait(reduced.matches ? 400 : 2500, generation)) return;
    goOnline();
  }

  /** A direct-connect modem dials by tone and handshakes through its monitor speaker. */
  async function modemCall(generation: number) {
    dialed = ""; line = "Mehrfrequenzwahl";
    setState("dialing");
    const duration = audio.modemDial(BTX_NUMBER);
    [...BTX_NUMBER].forEach((_, index) => later((1.0 + index * 0.14 + 0.07) * 1000, () => { if (generation === token) { dialed = BTX_NUMBER.slice(0, index + 1); setState("dialing"); } }));
    if (!await wait(duration * 1000 + 300, generation)) return;
    audio.ring(); line = "Freiton"; renderLocal();
    if (!await wait(2000, generation)) return;
    setState("answering");
    audio.answer(2.3);
    if (!await wait(2700, generation)) return;
    setState("coupling");
    audio.carrier(true);
    if (!await wait(2200, generation)) return;
    audio.muteSpeaker();
    goOnline();
  }

  function goOnline() {
    connectedAt = Date.now();
    summary = undefined;
    write("btx-visited", "true");
    setState("online");
  }

  async function connect() {
    if (state === "off") { await togglePower(); return; }
    if (state === "online") { await hangUp(); return; }
    if (state === "paused") { await reinsert(); return; }
    if (BUSY_STATES.has(state)) { await cancel(); return; }
    const generation = ++token;
    await unlock();
    if (generation !== token) return;
    if (speed === "LINE") { goOnline(); return; }
    if (acoustic()) await acousticCall(generation);
    else await modemCall(generation);
  }

  /** "Direkt verbinden": skip the call ceremony but leave the devices in a consistent state. */
  async function skip() {
    const generation = ++token;
    cancelTimers();
    audio.stop();
    if (acoustic()) void moveHandset("coupler", true);
    // The screen is usable at once; the line sound follows as soon as audio is unlocked.
    goOnline();
    await unlock();
    if (generation !== token || state !== "online" || speed === "LINE") return;
    audio.setLine(true);
    if (acoustic()) audio.setHandset("coupler");
    audio.carrier(true);
    // Bytes sent before the modem worklet existed were lost; queue what is still to come.
    if (transferring) audio.transmit(remainingPage());
  }

  async function cancel() {
    const generation = ++token;
    cancelTimers();
    audio.stop();
    setState("idle");
    if (handset !== "cradle") await moveHandset("cradle");
    if (generation === token) audio.hangUp();
  }

  async function hangUp() {
    const generation = ++token;
    cancelTimers();
    const seconds = (Date.now() - connectedAt) / 1000;
    if (speed !== "LINE") {
      const units = callUnits(seconds, new Date(connectedAt));
      summary = { duration: formatDuration(seconds), units, charge: formatDm(units * UNIT_PRICE_DM) };
    }
    audio.carrier(false);
    setState("idle");
    initBtxScreen();
    if (handset !== "cradle") await moveHandset("cradle");
    if (generation === token || state === "idle") audio.hangUp();
  }

  async function reinsert() {
    const generation = ++token;
    await unlock();
    await moveHandset("coupler");
    if (generation !== token || state !== "paused") return;
    audio.couplerSeated();
    audio.setHandset("coupler");
    audio.carrier(true, 0, 0.3);
    setState("online");
  }

  async function receiver() {
    await unlock();
    if (state === "online") {
      token++;
      if (!acoustic()) { await hangUp(); return; }
      // Lifting the handset out of the cups interrupts the carrier; the page stays on screen.
      setState("paused");
      audio.setHandset("ear", 0.5);
      await moveHandset("ear");
    } else if (state === "paused") await reinsert();
    else if (state === "idle") await connect();
    else if (BUSY_STATES.has(state)) await cancel();
  }

  async function togglePower() {
    await unlock();
    if (state === "off") {
      scene?.setPower(true);
      audio.crtOn();
      setState("idle");
      return;
    }
    if (state !== "idle") await cancel();
    token++;
    scene?.setPower(false);
    audio.crtOff();
    setState("off");
    initBtxScreen();
  }

  function toggleLamp() {
    lamp = !lamp;
    scene?.setLamp(lamp);
    query<HTMLInputElement>("desk-lamp").checked = lamp;
    void unlock().then(() => audio.lamp());
  }

  function setSpeed() {
    const selected = document.querySelector<HTMLInputElement>("[data-btx-baud-option]:checked");
    speed = parseModemSpeed(selected?.value ?? "1200");
    query("connection-profile").textContent = MODEM_PROFILES[speed].name;
    audio.setSpeed(speed);
    scene?.setSpeed(speed);
    renderLocal();
  }

  function sendKey(key: string) {
    if (state !== "online" || !acoustic()) return;
    audio.sendKey(key);
    scene?.blink(10 / 75 * 1000 + 60);
  }

  /** Clicks on the 3D keyboard behave like typing on the real one. */
  function physicalKey(key: string) {
    void unlock().then(() => { audio.key(key, true); window.setTimeout(() => audio.key(key, false), 95); });
    scene?.tap(key);
    if (state !== "online") { if (key === "Enter") void connect(); return; }
    if (key === "Shift" || key === "CapsLock") { shifted = !shifted; return; }
    if (key.length === 1 || key === "Enter") sendKey(key);
    const active = document.activeElement;
    const input = active instanceof HTMLInputElement && active.closest("[data-btx-grid]") ? active : document.querySelector<HTMLInputElement>("[data-btx-nav-input]");
    if (!input) return;
    if (key === "Enter") { input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); if (input.matches("[data-btx-nav-input]")) input.form?.requestSubmit(); return; }
    if (key === "Backspace") input.value = input.value.slice(0, -1);
    else if (key.length === 1 && (input.type === "search" || /^\d$/.test(key))) input.value = (input.value + (shifted ? key.toUpperCase() : key.toLowerCase())).slice(0, input.maxLength);
    else { document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); return; }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  function action(name: DeskAction) {
    if (name.startsWith("key:")) { physicalKey(name.slice(4)); return; }
    if (name === "receiver") void receiver();
    if (name === "dial") void (state === "idle" ? connect() : undefined);
    if (name === "power") void togglePower();
    if (name === "lamp") toggleLamp();
    if (name === "screen") setFocus(true);
    if (name === "speed" || name === "brightness") showSettings(true);
  }

  /** Mirrors the camera's framed view in the console toggle and the view chips. */
  function syncView(next: DeskView | "free") {
    view = next;
    focus = next === "screen";
    root.classList.toggle("desk-focused", focus);
    query("desk-view").textContent = focus ? "Schreibtisch" : "Bildschirm";
    query("desk-view").setAttribute("aria-pressed", String(focus));
    for (const chip of root.querySelectorAll<HTMLButtonElement>("[data-desk-goto]")) chip.setAttribute("aria-pressed", String(chip.dataset.deskGoto === next));
  }
  function goTo(next: DeskView) {
    scene?.flyTo(next);
    syncView(next);
  }
  function setFocus(value: boolean) { goTo(value ? "screen" : "desk"); }
  const navHint = query<HTMLElement>("desk-navhint");
  let navHintTimer: number | undefined;
  function hideNavHint() {
    window.clearTimeout(navHintTimer);
    navHintTimer = undefined;
    if (navHint.hidden) return;
    navHint.hidden = true;
    write("btx-nav-hint", "seen");
  }
  function showSettings(value: boolean) {
    settings.hidden = !value;
    query("desk-settings").setAttribute("aria-expanded", String(value));
    if (value) query("settings-close").focus();
    else query("desk-settings").focus();
  }
  function fitGrid() {
    const grid = document.querySelector<HTMLElement>("[data-btx-grid]");
    if (grid) screen.style.setProperty("--grid-scale", String(720 / grid.offsetWidth));
  }
  function fitFlat() {
    root.style.setProperty("--flat-scale", String(Math.min(1.25, (innerWidth - 56) / 800, (innerHeight - 180) / 600)));
  }

  /** Bytes still to be received for the current page, one per screen cell. */
  function remainingPage() {
    const grid = document.querySelector<HTMLElement>("[data-btx-grid]");
    if (!grid) return [];
    const text = Array.from(grid.children, (row) => (row.textContent ?? "").replace(/\s+$/u, "").padEnd(40).slice(0, 40)).join("");
    const revealed = grid.classList.contains("btx-grid--revealing")
      ? (Number.parseFloat(grid.style.getPropertyValue("--btx-reveal-row")) || 0) * 40 + (Number.parseFloat(grid.style.getPropertyValue("--btx-reveal-col")) || 0)
      : 0;
    return pageBytes(text.slice(revealed));
  }

  async function setFlat(value: boolean) {
    const generation = ++sceneGeneration;
    flat = value;
    write("btx-flat", String(value));
    if (value) {
      window.clearTimeout(navHintTimer);
      navHintTimer = undefined;
      source.append(screen);
      scene?.dispose();
      scene = undefined;
      root.classList.add("desk-flat");
      query("desk-flat").textContent = "3D-Arbeitsplatz";
      query("desk-view").disabled = true;
      query("desk-view").textContent = "Bildschirm";
      return;
    }
    root.classList.remove("desk-flat");
    query("desk-flat").textContent = "Ohne 3D";
    query("desk-view").disabled = false;
    try {
      const { DeskScene } = await import("./DeskScene");
      if (flat || generation !== sceneGeneration) return;
      scene = new DeskScene(stage, screen, action, query("desk-tooltip"));
      if (import.meta.env.DEV) Object.assign(window, { __desk: scene });
      scene.setSpeed(speed);
      scene.setConnection(state);
      scene.setLamp(lamp);
      scene.setPower(state !== "off", true);
      scene.onView = syncView;
      if (view !== "desk" && view !== "free") scene.flyTo(view);
      if (read("btx-nav-hint", "") !== "seen") {
        if (window.matchMedia("(pointer: coarse)").matches) navHint.textContent = "Wischen: umsehen · Zwei Finger: zoomen und verschieben";
        navHint.hidden = false;
        navHintTimer = window.setTimeout(hideNavHint, 14000);
      }
      scene.setTransfer(transferring);
      scene.setBrightness(Number(query<HTMLInputElement>("desk-brightness").value));
      scene.setEffect(Number(query<HTMLInputElement>("desk-crt").value));
      await scene.moveHandset(handset, true);
    } catch (error) {
      console.warn("3D terminal unavailable; using the accessible screen view", error);
      stage.replaceChildren();
      source.append(screen);
      scene = undefined;
      flat = true;
      root.classList.add("desk-flat");
      query("desk-flat").textContent = "3D erneut versuchen";
      query("desk-view").disabled = true;
      query("desk-hint").textContent = "3D ist nicht verfügbar. Der Bildschirm bleibt vollständig bedienbar.";
    }
  }

  root.classList.add("terminal-ready");
  query("desk-connect").addEventListener("click", () => void connect());
  query("desk-skip").addEventListener("click", () => void skip());
  query("desk-view").addEventListener("click", () => setFocus(!focus));
  query("desk-settings").addEventListener("click", () => showSettings(Boolean(settings.hidden)));
  query("settings-close").addEventListener("click", () => showSettings(false));
  query("desk-receiver").addEventListener("click", () => void receiver());
  query("desk-power").addEventListener("click", () => void togglePower());
  query("desk-flat").addEventListener("click", () => void setFlat(!flat));
  const syncSound = () => {
    query("desk-sound").textContent = sound ? "Ton an" : "Ton aus";
    query("desk-sound").setAttribute("aria-pressed", String(sound));
  };
  syncSound();
  query("desk-sound").addEventListener("click", () => { sound = !sound; audio.setEnabled(sound); write("btx-sound", String(sound)); syncSound(); void unlock(); });
  for (const [name, fallback, apply] of [
    ["brightness", "1", (value: number) => { screen.style.setProperty("--crt-brightness", String(value)); scene?.setBrightness(value); }],
    ["crt", "0.4", (value: number) => { screen.style.setProperty("--crt-effect", String(value)); scene?.setEffect(value); }],
  ] as const) {
    const input = query<HTMLInputElement>(`desk-${name}`);
    input.value = read(`btx-${name}`, fallback);
    apply(Number(input.value));
    input.addEventListener("input", () => { apply(Number(input.value)); write(`btx-${name}`, input.value); });
  }
  query<HTMLInputElement>("desk-volume").value = read("btx-volume", "0.35");
  audio.setVolume(Number(query<HTMLInputElement>("desk-volume").value));
  query<HTMLInputElement>("desk-volume").addEventListener("input", (event) => {
    const value = (event.target as HTMLInputElement).value;
    audio.setVolume(Number(value));
    write("btx-volume", value);
  });
  query("desk-lamp").addEventListener("change", toggleLamp);
  const carrierToggle = query<HTMLInputElement>("desk-carrier");
  carrierToggle.checked = read("btx-carrier-tone", "true") === "true";
  audio.setCarrierTone(carrierToggle.checked);
  carrierToggle.addEventListener("change", () => { audio.setCarrierTone(carrierToggle.checked); write("btx-carrier-tone", String(carrierToggle.checked)); });
  document.querySelector("[data-btx-baud-form]")?.addEventListener("change", (event) => {
    if (!(event.target as HTMLElement).matches("[data-btx-baud-option]")) return;
    const wasOnline = state === "online" || state === "paused";
    token++;
    cancelTimers();
    audio.stop();
    setSpeed();
    if (state !== "off") setState("idle");
    void moveHandset("cradle", true);
    if (wasOnline) void connect();
  });
  const noiseToggle = document.querySelector<HTMLInputElement>("[data-btx-noise-enabled]");
  const noiseLevel = document.querySelector<HTMLInputElement>("[data-btx-noise-level]");
  const syncNoise = () => audio.setLineNoise(noiseToggle?.checked ? Number(noiseLevel?.value ?? 2) / 10 : 0);
  noiseToggle?.addEventListener("change", syncNoise);
  noiseLevel?.addEventListener("input", syncNoise);
  screen.addEventListener("click", (event) => {
    if (!(event.target as Element).closest("a, button, input")) scene?.focusScreenIfFar();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { if (!settings.hidden) showSettings(false); else setFocus(false); }
    if ((event.target as Element)?.closest(".terminal-settings")) return;
    if (event.key === "Enter" && state === "idle" && !(event.target as Element)?.closest("button")) { event.preventDefault(); void connect(); }
    if (!event.isTrusted || (event.target as Element)?.closest(".desk-actions")) return;
    scene?.press(event.key, event.code, true);
    if (!event.repeat) { void unlock().then(() => audio.key(event.key, true)); if (event.key.length === 1 || event.key === "Enter") sendKey(event.key); }
  });
  document.addEventListener("keyup", (event) => {
    if (!event.isTrusted || (event.target as Element)?.closest(".terminal-settings, .desk-actions")) return;
    scene?.press(event.key, event.code, false);
    audio.key(event.key, false);
  });
  document.addEventListener("btx:transfer", (event) => {
    transferring = (event as CustomEvent<boolean>).detail;
    root.dataset.transferring = String(transferring);
    scene?.setTransfer(transferring);
    if (transferring && state === "online") audio.transmit(remainingPage());
    else audio.idle();
  });
  document.addEventListener("btx:page", () => scene?.afterglow());
  document.addEventListener("visibilitychange", () => { void (document.hidden ? audio.suspend() : audio.resume()); });
  // Only a switch between portrait and landscape changes the view; free navigation survives resizing.
  window.addEventListener("resize", () => {
    fitFlat();
    const next = innerWidth / (innerHeight - 118) < 0.85;
    if (next !== portrait) { portrait = next; setFocus(portrait); }
  });
  for (const chip of root.querySelectorAll<HTMLButtonElement>("[data-desk-goto]")) chip.addEventListener("click", () => goTo(chip.dataset.deskGoto as DeskView));
  stage.addEventListener("desk:navigate", hideNavHint);
  stage.addEventListener("desk:unavailable", () => void setFlat(true));
  initBtxNavigation(() => {
    initBtxScreen();
    fitGrid();
    document.querySelector<HTMLElement>("[data-btx-grid]")!.inert = state !== "online";
  });
  fitFlat();
  setState("idle");
  initBtxScreen();
  syncNoise();
  setSpeed();
  setFocus(focus);
  await document.fonts.ready;
  fitGrid();
  await setFlat(flat);
  root.dataset.ready = "true";
}
