# 404 Pets 🐈

A Chrome extension that puts a cute little pixel cat on every page you visit.
It's not just decoration — it plays with the page:

- **Wanders** along the bottom of the window, sits, blinks, wags its tail
- **Chases your cursor** when you wave it around nearby, and pounces on it
- **Climbs the page** — jumps up onto headings, images, and buttons, rides
  them while you scroll, and paws at them (they wiggle!)
- **Plays with yarn** — toss it a ball 🧶 from the popup and it bats it around
- **Naps** with little 💤 bubbles; wake it gently (hover) or rudely (shake
  the cursor at it)
- **Can be picked up** — drag it around and toss it; click it for hearts

## Install

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Visit any website — the cat shows up at the bottom of the page.

## Popup controls

Click the 404 Pets toolbar icon to:

- Toggle the pet on/off (synced across tabs via `chrome.storage.sync`)
- Pick a coat: orange tabby, gray, or black
- Toss a ball of yarn onto the current page

## Try it without installing

Open `demo/index.html` in a browser — the content script detects it isn't
running as an extension and just shows the pet.

## How it works

- **Manifest V3**, one content script (`content/pet.js`) + stylesheet, no
  background worker, only the `storage` permission.
- The cat is drawn each frame onto a 20×16 canvas upscaled 4× with
  `image-rendering: pixelated` — all sprites are code, no image assets.
- A small state machine (idle / walk / run / jump / on-platform / sleep /
  fall / dragged) drives behavior; platforms are real DOM elements found via
  `getBoundingClientRect`, re-measured every frame so the cat rides elements
  as the page scrolls.
- Everything lives in a `pointer-events: none` overlay (`#p404-root`) at
  maximum z-index; only the cat itself accepts the mouse, so the page stays
  fully usable.

## Project layout

```
manifest.json        MV3 manifest
content/pet.js       the pet: sprite renderer, physics, behavior state machine
content/pet.css      overlay, particles, wiggle animation
popup/               toolbar popup (toggle, coat color, yarn button)
icons/               generated pixel-cat icons (16/48/128)
demo/index.html      standalone preview page
```
