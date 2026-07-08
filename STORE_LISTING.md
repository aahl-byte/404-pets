# Chrome Web Store listing

Copy-paste text for submitting **404 Pets** to the Chrome Web Store Developer
Dashboard. Fields map to the dashboard tabs noted below. Keep this in sync with
`manifest.json` (name, version, description) when things change.

## Store listing tab

**Detailed description** (min. 25 chars):

> **404 Pets** puts a cute little pixel cat on every page you visit — and it
> doesn't just sit there. It wanders along the bottom of the window, sits,
> blinks, and wags its tail. Wave your cursor nearby and it chases and pounces
> on it. It climbs the page too — jumping onto headings, images, and buttons,
> riding them as you scroll and pawing at them. Toss it a ball of yarn from the
> toolbar popup and it'll bat it around, or let it curl up for a nap with little
> 💤 bubbles. You can even pick the cat up and drag it around, or click it for a
> burst of hearts.
>
> Pick from three coats (orange tabby, gray, or black) and toggle the pet on or
> off anytime. Everything is drawn as pixel art in code — no image assets, no
> tracking, no accounts. The extension only uses the storage permission to
> remember your settings.

**Category:** Fun / Just for Fun
**Language:** English

**Screenshots required:** at least one 1280×800 or 640×400 image. Capture the
cat on a real page or on `demo/index.html`.

## Privacy practices tab

**Single purpose:**

> 404 Pets displays an animated pixel-art cat on web pages as a decorative
> companion. The cat wanders, chases the cursor, naps, plays with yarn, and
> climbs on page elements. That is the extension's sole purpose.

**Permission — `storage` — justification:**

> The `storage` permission saves the user's preferences — whether the pet is
> enabled, and the chosen coat color — using `chrome.storage.sync`, so settings
> persist and stay consistent across the user's tabs and devices. No browsing
> data or personal information is stored.

**Host permission — `<all_urls>` — justification:**

> The extension's purpose is to display the animated companion on whatever page
> the user is viewing, so it must run on all sites. The content script only
> injects a decorative, `pointer-events: none` overlay and reads element
> positions on the current page to let the cat climb on-page elements. It does
> not read, collect, or transmit page content or user data.

**Remote code:** Select **"No, I am not using remote code."** All animation is
drawn in code on a canvas; there are no external scripts, `eval`, `new
Function`, or network requests.

**Data usage:** Check that the extension does **not** collect or transmit user
data (true — the only stored data is local settings via `chrome.storage.sync`),
then certify compliance with the Developer Program Policies.

**Privacy policy URL:** point to a hosted copy of [`PRIVACY.md`](PRIVACY.md)
(e.g. its GitHub URL).

## Settings page (account-level)

- **Contact email:** enter a publisher contact email and complete the
  verification link Google emails you. Required before publishing.

## Build the upload artifact

```
make zip        # -> dist/404-pets-<version>.zip
```

Upload that zip on the **Package** tab. Bump `"version"` in `manifest.json`
before each subsequent update.
