import { initBtxScreen } from "@/components/btx/BtxInput";
import { initBtxNavigation } from "@/lib/terminal/navigation";
import { CONNECTION_LABELS, CONNECTION_STEPS, MODEM_PROFILES, parseModemSpeed, type ConnectionState } from "@/lib/terminal/connection";
import { TerminalAudio } from "@/lib/terminal/audio";
import type { DeskScene, DeskAction } from "./DeskScene";

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
  let state: ConnectionState = "idle";
  let speed = parseModemSpeed(read("btx-baud", "1200"));
  let scene: DeskScene | undefined;
  let focus = innerWidth / (innerHeight - 118) < 0.85;
  let sound = read("btx-sound", "true") === "true";
  let lamp = true;
  let flat = read("btx-flat", "false") === "true";
  let transferring = false;
  let shifted = false;
  let generation = 0;
  let sceneGeneration = 0;
  let sequenceTimer = 0;
  const audio = new TerminalAudio();
  audio.setEnabled(sound);
  const overlay = document.createElement("div");
  overlay.className = "screen-connection";
  overlay.innerHTML = '<div class="screen-welcome"><span class="screen-wordmark">Btx<span>●</span></span><span class="screen-service">B I L D S C H I R M T E X T</span><span class="screen-welcome-rule"></span><span class="screen-message" data-screen-message>Die Welt ist nur einen Anruf entfernt.</span><button type="button" data-screen-connect>VERBINDUNG AUFBAUEN <span>↵</span></button><span class="screen-small" data-screen-small>1200 bit/s · Empfang bereit</span></div>';
  screen.append(overlay);
  screen.setAttribute("aria-label", "BTX Bildschirm");
  const message = overlay.querySelector<HTMLElement>("[data-screen-message]")!;
  const screenButton = overlay.querySelector<HTMLButtonElement>("[data-screen-connect]")!;
  const screenSmall = overlay.querySelector<HTMLElement>("[data-screen-small]")!;

  function setState(next: ConnectionState) {
    state = next;
    document.documentElement.dataset.connection = next;
    root.dataset.connection = next;
    query("connection-status").textContent = CONNECTION_LABELS[next];
    overlay.hidden = next === "online";
    // A removed receiver preserves the already received page underneath the overlay.
    overlay.classList.toggle("screen-connection--paused", next === "paused");
    screen.classList.toggle("screen-off", next === "off");
    document.querySelector<HTMLElement>("[data-btx-grid]")!.inert = next !== "online";
    const busy = ["lifting", "dialing", "answering", "coupling"].includes(next);
    query("desk-connect").textContent = next === "online" ? "Auflegen" : next === "paused" ? "Fortsetzen" : busy ? "Abbrechen" : next === "off" ? "Einschalten" : "Verbinden";
    query("desk-skip").hidden = next === "online" || next === "off";
    query("desk-receiver").textContent = next === "online" ? "Hörer herausnehmen" : next === "paused" ? "Hörer einsetzen" : "Hörer abheben";
    query("desk-power").textContent = next === "off" ? "Terminal einschalten" : "Terminal ausschalten";
    query("desk-power").setAttribute("aria-pressed", String(next !== "off"));
    query("desk-hint").textContent = next === "online" ? "Seitennummer tippen · Enter · Bildschirm anklicken zum Näherkommen." : next === "paused" ? "Hörer einsetzen, um die Übertragung fortzusetzen." : busy ? "Ein kurzer Moment. Die Gegenstelle meldet sich gleich." : "Hörer abheben oder auf Verbinden klicken.";
    message.textContent = next === "idle" ? "Die Welt ist nur einen Anruf entfernt." : CONNECTION_LABELS[next];
    screenButton.textContent = next === "paused" ? "HÖRER EINSETZEN ↵" : busy ? "VERBINDUNG WIRD AUFGEBAUT …" : "VERBINDUNG AUFBAUEN ↵";
    screenButton.disabled = busy || next === "off";
    scene?.setConnection(next);
    if (next !== "online" && next !== "coupling") audio.stopCarrier();
    document.dispatchEvent(new Event("btx:connection"));
    if (next === "online" && settings.hidden && window.matchMedia("(pointer: fine)").matches) document.querySelector<HTMLInputElement>("[data-btx-nav-input]")?.focus({ preventScroll: true });
  }
  function stopSequence() { generation++; clearTimeout(sequenceTimer); audio.stop(); }
  async function unlock() {
    try { await audio.unlock(); } catch { query("desk-hint").textContent = "Audio ist nicht verfügbar. Die Verbindung funktioniert ohne Ton."; }
  }
  async function connect() {
    if (state === "off") { setState("idle"); return; }
    if (state === "online") { stopSequence(); setState("idle"); initBtxScreen(); return; }
    if (state === "paused") { const token = generation; await unlock(); if (token !== generation || state !== "paused") return; audio.click(); setState("online"); return; }
    if (state !== "idle") { stopSequence(); setState("idle"); return; }
    stopSequence();
    const token = generation;
    setState("lifting");
    await unlock();
    if (token !== generation) return;
    if (speed === "LINE") { setState("online"); return; }
    audio.click(0.6);
    const step = (index: number) => {
      if (token !== generation) return;
      const entry = CONNECTION_STEPS[index];
      if (!entry) return;
      const [next, duration] = entry;
      if (next === "online") audio.stopCarrier();
      setState(next);
      if (next === "lifting") audio.tone(425, 0.65);
      if (next === "dialing") audio.dial();
      if (next === "answering") audio.answer(speed);
      if (next === "coupling") { audio.click(0.5); audio.carrier(speed); }
      if (next === "online") { write("btx-visited", "true"); return; }
      sequenceTimer = window.setTimeout(() => step(index + 1), duration);
    };
    step(0);
  }
  async function skip() {
    stopSequence();
    const token = generation;
    await unlock();
    if (token !== generation) return;
    setState("online"); write("btx-visited", "true");
  }
  function setFocus(value: boolean) {
    focus = value; scene?.focus(value); root.classList.toggle("desk-focused", value);
    query("desk-view").textContent = value ? "Schreibtisch" : "Bildschirm";
    query("desk-view").setAttribute("aria-pressed", String(value));
  }
  function showSettings(value: boolean) {
    settings.hidden = !value; query("desk-settings").setAttribute("aria-expanded", String(value));
    if (value) query("settings-close").focus();
    else query("desk-settings").focus();
  }
  function receiver() {
    void unlock(); audio.click(0.5);
    if (state === "online") setState("paused");
    else if (state === "paused") setState("online");
    else if (state === "idle") void connect();
  }
  function power() {
    stopSequence(); setState(state === "off" ? "idle" : "off"); initBtxScreen();
  }
  function toggleLamp() { lamp = !lamp; scene?.setLamp(lamp); query<HTMLInputElement>("desk-lamp").checked = lamp; audio.click(); }
  function setSpeed() {
    const selected = document.querySelector<HTMLInputElement>("[data-btx-baud-option]:checked");
    speed = parseModemSpeed(selected?.value ?? "1200");
    query("connection-profile").textContent = MODEM_PROFILES[speed].name;
    screenSmall.textContent = speed === "LINE" ? "Direktverbindung · Ohne Wartezeit" : `${MODEM_PROFILES[speed].name} · Empfang bereit`;
    scene?.setSpeed(speed);
  }
  function physicalKey(key: string) {
    if (state !== "online") { if (key === "Enter") void connect(); return; }
    scene?.key(key); audio.click(0.16);
    if (key === "Shift") { shifted = !shifted; return; }
    const active = document.activeElement;
    const input = active instanceof HTMLInputElement && active.closest("[data-btx-grid]") ? active : document.querySelector<HTMLInputElement>("[data-btx-nav-input]");
    if (!input) return;
    if (key === "Enter") { input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); if (input.matches("[data-btx-nav-input]")) input.form?.requestSubmit(); return; }
    if (key === "Backspace") input.value = input.value.slice(0, -1);
    else if (input.type === "search" || /^\d$/.test(key)) input.value = (input.value + (shifted ? key.toUpperCase() : key.toLowerCase())).slice(0, input.maxLength);
    else { document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); return; }
    input.dispatchEvent(new Event("input", { bubbles: true })); input.focus();
  }
  function action(action: DeskAction) {
    void unlock();
    if (action.startsWith("key:")) { physicalKey(action.slice(4)); return; }
    if (action === "receiver") receiver();
    if (action === "dial") void connect();
    if (action === "power") power();
    if (action === "lamp") toggleLamp();
    if (action === "screen") setFocus(true);
    if (action === "speed" || action === "brightness") showSettings(true);
  }
  function fitGrid() {
    const grid = document.querySelector<HTMLElement>("[data-btx-grid]");
    if (grid) screen.style.setProperty("--grid-scale", String(720 / grid.offsetWidth));
  }
  function fitFlat() {
    root.style.setProperty("--flat-scale", String(Math.min(1.25, (innerWidth - 56) / 800, (innerHeight - 180) / 600)));
  }
  window.addEventListener("resize", () => { fitFlat(); setFocus(innerWidth / (innerHeight - 118) < 0.85); });
  fitFlat();
  async function setFlat(value: boolean) {
    const token = ++sceneGeneration;
    flat = value; write("btx-flat", String(value));
    if (value) {
      source.append(screen); scene?.dispose(); scene = undefined;
      root.classList.add("desk-flat"); query("desk-flat").textContent = "3D-Arbeitsplatz";
      query("desk-view").disabled = true; query("desk-view").textContent = "Bildschirm";
      return;
    }
    root.classList.remove("desk-flat"); query("desk-flat").textContent = "Ohne 3D"; query("desk-view").disabled = false;
    try {
      const { DeskScene } = await import("./DeskScene");
      if (flat || token !== sceneGeneration) return;
      scene = new DeskScene(stage, screen, action, query("desk-tooltip"));
      scene.setSpeed(speed); scene.setConnection(state); scene.setLamp(lamp); scene.focus(focus); scene.setTransfer(transferring);
    } catch (error) {
      console.warn("3D terminal unavailable; using the accessible screen view", error);
      stage.replaceChildren(); source.append(screen); scene = undefined;
      flat = true; root.classList.add("desk-flat"); query("desk-flat").textContent = "3D erneut versuchen";
      query("desk-view").disabled = true;
      query("desk-hint").textContent = "3D ist nicht verfügbar. Der Bildschirm bleibt vollständig bedienbar.";
    }
  }

  root.classList.add("terminal-ready");
  screenButton.addEventListener("click", () => void connect());
  query("desk-connect").addEventListener("click", () => void connect());
  query("desk-skip").addEventListener("click", () => void skip());
  query("desk-view").addEventListener("click", () => setFocus(!focus));
  query("desk-settings").addEventListener("click", () => showSettings(Boolean(settings.hidden)));
  query("settings-close").addEventListener("click", () => showSettings(false));
  query("desk-receiver").addEventListener("click", receiver);
  query("desk-power").addEventListener("click", power);
  query("desk-flat").addEventListener("click", () => void setFlat(!flat));
  query("desk-sound").textContent = sound ? "Ton an" : "Ton aus";
  query("desk-sound").setAttribute("aria-pressed", String(sound));
  query("desk-sound").addEventListener("click", () => { sound = !sound; audio.setEnabled(sound); write("btx-sound", String(sound)); query("desk-sound").textContent = sound ? "Ton an" : "Ton aus"; query("desk-sound").setAttribute("aria-pressed", String(sound)); void unlock(); });
  for (const [name, css, fallback] of [["brightness", "--crt-brightness", "1"], ["crt", "--crt-effect", "0.4"]]) {
    const input = query<HTMLInputElement>(`desk-${name}`);
    input.value = read(`btx-${name}`, fallback);
    screen.style.setProperty(css, input.value);
    input.addEventListener("input", () => { screen.style.setProperty(css, input.value); write(`btx-${name}`, input.value); });
  }
  query<HTMLInputElement>("desk-volume").value = read("btx-volume", "0.35");
  audio.setVolume(Number(query<HTMLInputElement>("desk-volume").value));
  query<HTMLInputElement>("desk-volume").addEventListener("input", (event) => { const value = (event.target as HTMLInputElement).value; audio.setVolume(Number(value)); write("btx-volume", value); });
  query("desk-lamp").addEventListener("change", toggleLamp);
  document.querySelector("[data-btx-baud-form]")?.addEventListener("change", (event) => {
    if (!(event.target as HTMLElement).matches("[data-btx-baud-option]")) return;
    const wasOnline = state === "online" || state === "paused";
    stopSequence(); setSpeed(); setState("idle");
    if (wasOnline) void connect();
  });
  document.querySelector("[data-btx-noise-enabled]")?.addEventListener("change", () => {
    if (transferring && state === "online") audio.carrier(speed, document.querySelector<HTMLInputElement>("[data-btx-noise-enabled]")!.checked);
  });
  screen.addEventListener("click", (event) => {
    if (state === "online" && !(event.target as Element).closest("a, button, input")) setFocus(true);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { if (!settings.hidden) showSettings(false); else setFocus(false); }
    if ((event.target as Element)?.closest(".terminal-settings")) return;
    if (event.key === "Enter" && state === "idle" && !(event.target as Element)?.closest("button")) { event.preventDefault(); void connect(); }
    if (event.isTrusted && state === "online" && event.key.length === 1 && !(event.target as Element)?.closest(".desk-actions")) { scene?.key(event.key); audio.click(0.13); }
  });
  document.addEventListener("btx:transfer", (event) => {
    transferring = (event as CustomEvent<boolean>).detail;
    root.dataset.transferring = String(transferring);
    scene?.setTransfer(transferring);
    if (transferring && state === "online") audio.carrier(speed, document.querySelector<HTMLInputElement>("[data-btx-noise-enabled]")?.checked);
    else if (state !== "coupling") audio.stopCarrier();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.stop();
    else if (transferring && state === "online") audio.carrier(speed);
  });
  window.addEventListener("pagehide", () => audio.stop());
  stage.addEventListener("desk:unavailable", () => void setFlat(true));
  initBtxNavigation(() => { initBtxScreen(); fitGrid(); document.querySelector<HTMLElement>("[data-btx-grid]")!.inert = state !== "online"; });
  setState("idle"); initBtxScreen(); setSpeed(); setFocus(focus);
  await document.fonts.ready; fitGrid();
  await setFlat(flat);
  root.dataset.ready = "true";
}
