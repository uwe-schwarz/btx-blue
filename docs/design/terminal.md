# BTX desk

## Visual direction

The concept is `terminal-concept.png`: a warm, late-evening 1985 workspace, walnut desk, ivory CRT and keyboard, fern-green rotary telephone, black acoustic coupler and brass desk lamp. The implementation is real Three.js geometry; the concept image is not used as a backdrop. The existing BTX pages, typography, URLs and search remain the content of the screen. The wall, framed city engraving, fern and distant window use a generated background plate behind the real geometry. There is exactly one movable receiver, correcting the duplicate receiver in the concept.

Tokens: walnut brown, olive wall (`#4f5040`), ivory controls (`#e4d7b9`), fern-green phone (`#355137`), blue phosphor (`#03177d`), amber lamp. Desk controls use Arial; physical legends use small canvas decals; the display retains Bedstead/Unscii. UI copy remains German, consistent with the existing site.

## Architecture

- `TerminalDesk.astro`: progressive HTML shell, accessible controls and settings.
- `TerminalExperience.ts`: connection lifecycle, preferences, audio, camera controls and fallback.
- `DeskScene.ts`: procedural meshes, material maps, lighting, shadow/AO passes, pointer raycasting and CSS3D screen alignment.
- `navigation.ts`: cancelable same-origin page requests; replaces the grid and metadata while preserving scene, connection and audio context. Ordinary links remain usable without JavaScript.
- `BtxInput.ts`: existing search and keyboard navigation, now with abortable listeners and pausable character reveal.
- `audio.ts`: Web Audio synthesis. No microphone, external service, account or network modem connection is involved.

A camera close-up keeps the 40-column, 24-row display readable. Portrait viewports start in close-up, with an optional desk view. The HTML-only screen view is manually selectable and is also used when WebGL initialization or context availability fails. Reduced motion removes camera interpolation and character reveal. All hardware functions have HTML controls or keyboard equivalents.

The scene is loaded dynamically. Textures are local JPEGs derived from the generated PNG originals. Labels use resolution-appropriate small textures. Render work stops while idle or hidden; ambient occlusion is disabled below 721 px. Geometries, materials, textures, render targets and listeners are disposed when leaving 3D mode.

## Audio fidelity

- V.21 receiving channel: 1650/1850 Hz FSK at 300 symbols/s.
- V.23 receiving channel: 1300/2100 Hz FSK at 1200 symbols/s. The historical 75 bit/s reverse channel is identified in the profile; this is not a complete V.23 protocol implementation.
- V.22bis: 600-symbol/s QAM-like signal on a 2400 Hz carrier.
- V.32: 2400-symbol/s QAM-like signal on an 1800 Hz carrier.

The V.22bis and V.32 training sequences are explicitly labeled approximations in the UI. Generated data tones illustrate the standards; the app does not implement framing, negotiation, equalization, error correction or a CEPT modem stack. Dialing uses a 425 Hz German dial tone and 10 impulse clicks per second. Audio starts only from a user gesture and can be muted or adjusted.

References: [ITU V.21](https://www.itu.int/rec/T-REC-V.21/en), [ITU V.23](https://www.itu.int/rec/T-REC-V.23-198811-I/en), [ITU V.22bis](https://www.itu.int/rec/T-REC-V.22bis/en), [ITU V.32](https://www.itu.int/rec/T-REC-V.32/), [CSS3DRenderer](https://threejs.org/docs/pages/CSS3DRenderer.html).

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
