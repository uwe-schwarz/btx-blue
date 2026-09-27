# BTX desk

## Visual direction

The concept is `terminal-concept.png`: a warm, late-evening 1985 workspace in Cologne, walnut desk, ivory CRT terminal and keyboard, fern-green rotary telephone, acoustic coupler and brass desk lamp. Everything on the desk is real Three.js geometry; the concept image is not used as a backdrop. The wall, framed engraving of Cologne Cathedral, fern and night window come from a generated background plate. The existing Btx pages, URLs and search remain the content of the screen.

Period references the models follow:

- **Telephone:** Deutsche Bundespost FeTAp 611 in *farngrün*, modelled on a reference photo. A soft, strongly tapered trapezoid is lofted through rounded-rectangle sections, and the handset bridges the domed crown with its capsules hanging beside it. The *Nummernschalter* has a clear finger wheel over a black plate with bold white numerals and holes at the measured 25.8° pitch (1 at about one o'clock, 0 at five). The centre plate carries a numeral ring and the FEUER 112 / NOTRUF 110 strips, a black finger stop sits just past four o'clock, and there are cradle plungers and a black coiled cord.
- **Acoustic coupler:** Woerltronic *dataphon s 21 d* (27 × 8.5 × 5 cm). Cream housing with a ribbed bellows between two blocks, thick black rubber cups spaced for a FeTAp handset, and LEDs for power, carrier and data. V.21 and V.23 (Btx 1200/75).
- **Terminal:** a generic 14-inch Btx terminal with a curved PAL tube, charcoal inner mask, knurled brightness and contrast knobs and a mains rocker. The keyboard is German ISO QWERTZ with sculpted rows and a Btx block, where the blue `*` is the initiator and the red `#` the terminator.

Tokens: walnut, olive wall, ivory ABS (`#d9cfb8`), farngrün (`#4a6a45`), Btx blue (`#03177d`), amber lamp and cyan VFD readout (`#7df6d8`). UI copy is German.

## Architecture

- `TerminalDesk.astro`: progressive HTML shell, accessible controls and settings.
- `TerminalExperience.ts`: the call choreography (lift, dial, answer, couple, hang up), preferences, the terminal's local teletext screens, keyboard and back-channel keystrokes, and the flat fallback.
- `DeskScene.ts`: renderer, lights, post-processing (GTAO, bloom, film grade), adaptive quality, camera, handset tween, dial animation, LEDs and picking. It renders only while something changes.
- `scene/raster.ts`: paints the live 40×24 Btx DOM (reveal progress, hover, focused inputs, block cursor) into a canvas. The HTML screen stays in place over the tube, invisible but fully interactive and accessible.
- `scene/crt.ts`: the phosphor shader on a curved faceplate. It provides Gaussian beam scanlines that fade out before they alias, limited video bandwidth, halation, afterglow between pages, EHT static and degauss swirl at switch-on, and the vertical-then-horizontal collapse to a fading dot at switch-off. A reflective glass layer sits in front.
- `scene/monitor.ts`, `keyboard.ts`, `telephone.ts`, `coupler.ts`, `room.ts`, `cord.ts`: procedural models; `kit.ts` holds the geometry helpers and a skyline-packed decal atlas for every printed legend.
- `lib/terminal/dial.ts`: the FeTAp dial model (wind-up, governed return, pulse times), shared by animation and sound.
- `lib/terminal/modem.ts` + `modem-worklet.ts`: an 8N1 continuous-phase FSK transmitter running in an AudioWorklet. The page's own characters, one byte per screen cell, are modulated in step with the reveal, and each keystroke is sent on the 75 bit/s back channel.
- `lib/terminal/audio.ts`: Web Audio graph and synthesized sounds.
- `lib/terminal/local-screens.ts`: the decoder's own screens (idle, dialling, answer, carrier, carrier lost), including a sextant-mosaic logo and the call charge after hanging up.

**Navigation.** OrbitControls with damping and zoom-to-cursor: drag to look around, use the wheel or a pinch to zoom, right-drag or two fingers to pan, and double-click anything that is not a control to glide in. Limits keep the camera above the desk top and in front of the wall photo; side walls and a floor hide the void at extreme angles. The wheel also works over the invisible HTML screen, which forwards it to the canvas. Six framed views fly in with easing: Gesamt, Monitor, Bedienteil (knobs and mains switch), Tastatur (from above), Telefon and Koppler. Any drag hands the camera to the visitor ("free"). The console's Bildschirm/Schreibtisch toggle and the view chips mirror the current view. A framed view re-frames on resize, even mid-flight.

Portrait viewports start in the screen close-up. Reduced motion removes camera and handset interpolation and the character reveal. The HTML-only view is selectable and is used automatically when WebGL fails. All hardware functions have HTML controls or keyboard equivalents.

Quality adapts to the renderer. Software rasterisers (SwiftShader, llvmpipe) start on the low tier, and a median frame time above 42 ms steps down one tier (pixel ratio, MSAA, GTAO, bloom, shadow-map size, acrylic transmission). A dev-only `window.__desk.inspect(position, target)` pins the camera for close-ups.

## The call, second by second

| Step | Screen | Sound |
| --- | --- | --- |
| Lift the handset | "Hörer abgehoben" | Cradle plungers click, the loop closes, then the continuous 425 Hz *Wählton* (post-1979 Bundespost) at the ear. |
| Dial 0-1-9-1-0 | Digits appear as each pulse train ends | Finger-wheel ratchet on wind-up; the governor buzzes on return at 10 pulses/s. Each 60 ms loop break mutes the line and clicks in the earpiece. The dial tone stops at the first impulse. |
| Exchange | "Vermittlung schaltet durch" | Electromechanical selector clicks. |
| Ringing | "Freiton" | 425 Hz, 1 s on (4 s off). |
| Answer | "Hörer jetzt in den Akustikkoppler legen" | Far-end loop click, then the 2100 Hz answer tone (V.25). |
| Couple | "Datenträger erkannt" | Rubber thump; the tone is now muffled by the cups. The 1300 Hz V.23 carrier follows, then the coupler's 390 Hz back channel. |
| Online | The page arrives at 120 characters/s | The page's bytes as 1300/2100 Hz FSK, about 8 dB below the dial tone. Keystrokes chirp on the 390/450 Hz back channel. |
| Hang up | Duration, *Gebühreneinheiten* and DM | Cradle clack with the faint bell tinkle. Local call at 0,23 DM per unit, one unit per 8 min (weekdays 8–18 h) or 12 min. |

**Trägerton.** The steady carrier between characters (1300 Hz forward, 390 Hz back channel) can be switched off under *Einstellungen → Trägerton hörbar*. The modem then only sounds while bytes are on the wire, so page data and keystrokes stay audible. Every visit starts at 1200/75 bit/s; another rate chosen in the settings only lasts for the browser session.

Direct-connect modems (2400/9600) dial by DTMF, hand-shake through the modem's monitor speaker and then mute it (ATM1). The CRT adds a power-rocker clunk, the degaussing hum, EHT crackle, a faint 50 Hz hum and the 15.625 kHz line-output whine. The room has a short convolution reverb; key switches have separate press and release sounds.

The V.22bis and V.32 signals are labelled approximations. The app does not implement negotiation, equalisation, error correction or a CEPT decoder. Audio starts only from a user gesture and can be muted or adjusted.

References: [ITU V.21](https://www.itu.int/rec/T-REC-V.21/en), [ITU V.23](https://www.itu.int/rec/T-REC-V.23-198811-I/en), [ITU V.22bis](https://www.itu.int/rec/T-REC-V.22bis/en), [ITU V.32](https://www.itu.int/rec/T-REC-V.32/), [Wählton (de.wikipedia)](https://de.wikipedia.org/wiki/W%C3%A4hlton), [Dataphon s21d on Wikimedia Commons](https://commons.wikimedia.org/w/index.php?search=Dataphon+akustikkoppler&title=Special:MediaSearch&type=image), [FeTAp 611 on Wikimedia Commons](https://commons.wikimedia.org/w/index.php?search=FeTAp+611&title=Special:MediaSearch&type=image), [CSS3DRenderer](https://threejs.org/docs/pages/CSS3DRenderer.html).

## Generated assets

All images were generated with the built-in Imagegen tool, not the fallback API/CLI. JPEG conversion preserves the original PNGs in the Codex generated-image directory.

### Concept — `terminal-concept.png`

> Use case: historical-scene. Asset type: visual design concept for an interactive 3D browser experience, one complete primary desktop screen, landscape 1536x1024. A meticulously realistic 1985 West German home computer desk at night, intimate warm amber lamplight, dark muted olive wall and walnut desktop. Hero object a beige chunky rounded CRT Bildschirmtext terminal with blue 4:3 screen and teletext lettering, separate beige mechanical keyboard in foreground. To its right a beautiful fern-green rotary telephone with coiled cord and a black acoustic coupler with two rubber cups, receiver resting in the cups. Restrained objects: cream handwritten note, brass desk lamp on the left. Camera slightly above desk, nearly front-facing, terminal occupies left-center 60 percent with readable screen, telephone right, entire keyboard visible. True sophisticated physically based 3D rendering, rounded molded plastic bevels, subtle worn plastic, detailed telephone dial, soft contact shadows, fine walnut grain. Screen blue with sparse crisp white yellow cyan teletext. Bottom of frame a very minimal small cream control bar with three German buttons 'Verbinden', 'Bildschirm', 'Ton'. No marketing headers, no cards, no other UI. This scene must be implementable as actual runtime 3D geometry with interactive HTML screen, realistic but simple scene geometry, beautiful cinematic lighting without making objects too dark. No people, no logos, no floating objects. This is the design reference, not a background screenshot to substitute for interactive geometry.

### Walnut — `public/textures/walnut.jpg`

> Use case: photorealistic-natural. Asset type: seamless square PBR albedo texture for a real-time 3D walnut writing desk. Primary request: top-down orthographic scanned dark medium brown walnut wood veneer, fine horizontal wood grain with subtly flowing organic lines and a few small natural pores. Entire image is only wood, uniform neutral diffuse illumination, no highlights, no vignette, no cast shadows, no objects, no border, no text. Rich muted brown and warm tobacco brown with restrained contrast. Premium 1980s lightly used satin-finish desk material, microscopic scratches subtle, physically plausible. Tileable seamless edges, high resolution square. Not a scene or product photograph; a flat material color map to wrap onto 3D geometry.

### ABS — `public/textures/aged-abs.jpg`

> Use case: photorealistic-natural. Asset type: seamless PBR albedo texture for a vintage 1985 beige computer terminal molded ABS plastic case. Full frame flat scanned material, square, orthographic. Warm muted ivory beige plastic with extremely fine pebbled injection-molded surface, delicate uneven yellowing, tiny faint gray scratches, very slight age and dust caught in the grain. Mostly clean and cared for, realistic subtle microvariation, not dirty, no rust, no large stains. Neutral even diffuse illumination, no shadows or specular lighting baked in, no gradient, no vignette. Seamless tileable edges. Absolutely no objects, no text, no shapes, no frame, only uniform detailed vintage plastic material.

### Room background — `public/textures/room.jpg`

> Use case: historical-scene. Asset type: background wall plate for an interactive real-time 3D 1985 West German home office; the computer, telephone and desk are separate real 3D objects in front of this plate. Landscape 1536x1024. Photograph-like empty room backdrop, front-facing flat wall filling the image. Rich dark muted olive plaster wall, illuminated by warm amber desk light from lower left out of frame. Subtle realistic aged plaster texture with soft natural lighting falloff. Small antique dark walnut framed sepia engraving of Cologne cathedral high in the center-right. On far right, a narrow dark window with night-blue glass and faint blurred historic neighboring house windows, and a lush dark green fern plant reaching into the right third of frame with delicately lit leaves. Left half mostly empty textured wall behind the future large terminal. Lower edge dark and unobtrusive. Cinematic photographic realism, analog film warmth, high detail but quiet background, low key amber illumination, sophisticated intimate nostalgic room. No desk, no computer, no keyboard, no telephone, no lamp, no foreground objects, no people, no text, no branding, no UI. Not a full scene: only wall, framed artwork, far-right night window and fern. Must feel believable behind warm beige 3D computer equipment, soft shadows and no stark black voids.
