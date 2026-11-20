# Chrome Web Store submission sheet

Copy each block into the matching field of the Developer Dashboard.

## Package

- Build: run `pwsh -File build.ps1` in the repo root, then upload `dist/omnibar.zip`.
- Before uploading, load `dist/omnibar` with **Load unpacked** once to confirm it runs.

## Store listing tab

**Name:** OmniBar (from the manifest)

**Summary** (from the manifest, 95 characters):
> A customizable sidebar that keeps your favorite web apps one click away in Chrome's side panel.

**Description:**
> OmniBar docks the web apps you use most in Chrome's side panel, so they sit next to whatever page you're reading.
>
> • Add any web app — AI assistants, notes, docs, chat, music — and open it with one click
> • Reorder, edit or remove apps; open any app in a new tab or a separate side window instead
> • Summarize page and Ask about page: send the current tab's address to the app you have open, in one click. OmniBar shows which page will be used ("Page: …") above the buttons
> • Default page: open your favorite app automatically when the sidebar opens
> • Desktop or mobile layout per app
> • Light and dark themes that follow Chrome, or pick one
> • Keyboard shortcut (Alt+Z by default) to open and close the sidebar
> • Import and export your app list
>
> Privacy: your app list and settings stay on your device. OmniBar has no accounts, servers, analytics or ads. Apps you open load directly from their own websites. Some sites need you to sign in once in a normal tab before they work in the sidebar; OmniBar shows simple steps when that happens.
>
> Free and open source: https://github.com/GoSlowPoke168/OmniBar

**Category:** Productivity → Tools
**Language:** English

**Graphics:**
- Store icon: comes from `icons/icon128.png` in the package (96×96 artwork with 16 px padding)
- Screenshots (1280×800): `docs/store/screenshot-1-chat-dark.png`, `docs/store/screenshot-2-summarize-light.png`, `docs/store/screenshot-3-settings-light.png`
- Small promo tile (440×280): `docs/store/promo-440x280.png`

## Privacy practices tab

**Single purpose description:**
> OmniBar lets users open web apps of their choice in Chrome's side panel, next to the page they are viewing, and optionally send the current page's address to the open app.

**Permission justifications:**

- **sidePanel:**
  > Shows OmniBar's app launcher and the selected web app in Chrome's side panel, which is the extension's core feature.
- **storage:**
  > Saves the user's app list, settings and app icons locally on the device so they persist between sessions.
- **tabs:**
  > Reads the active tab's address and title to show "Page: …" in the action bar and, only when the user clicks Summarize page or Ask about page, to insert that address into the open app. Also used to open apps in a new tab or window on request.
- **declarativeNetRequest:**
  > Many websites send X-Frame-Options or Content-Security-Policy headers that stop them from displaying inside another page. OmniBar uses a session rule, limited to requests that don't belong to a browser tab (OmniBar's side panel), to remove those two headers so the user's chosen apps can display in the side panel. Normal browser tabs are not affected.
- **Host permission (<all_urls>):**
  > Users can add any website as an app, so OmniBar needs access to all sites to load them in the side panel, apply the header rule above, and run its helper content script inside them. The content script exits immediately unless the page is framed inside OmniBar's own side panel; there it only types a prompt into the app's chat box when the user clicks Summarize page or Ask about page, and checks for a few known sign-in error messages so OmniBar can show sign-in help. It does nothing in normal tabs.

**Remote code:**
> No, I am not using remote code.

Justification (if asked):
> All JavaScript ships in the package. The web apps users add are loaded from their own websites inside an iframe in the side panel; that content is isolated from extension APIs.

**Data usage** (check these):
- **Web history:** the active tab's address and title, used to show "Page: …" and sent only to the user's chosen app when they click Summarize page or Ask about page.
- **Website content:** the visible text of the app open in the side panel is checked on the device for a few known sign-in error messages. Nothing is stored or sent.

Leave all other data types unchecked.

Certify all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:**
> https://github.com/GoSlowPoke168/OmniBar/blob/main/PRIVACY.md

## Distribution tab

- Payments: Free
- Visibility: Public (or Unlisted for a quiet first release)
- Regions: All regions

## Notes for the reviewer (Test instructions field, if shown)

> 1. Click the OmniBar toolbar icon (or press Alt+Z) to open the side panel.
> 2. Click any app icon on the right (e.g. Google Image Search needs no sign-in) to load it in the panel.
> 3. Open any normal web page in the tab, then click Summarize page to send that page's address to the open app.
> 4. Click the pencil to reorder/remove apps, + to add one, and the gear for Settings.
> Header removal only applies inside OmniBar's side panel (session rule scoped to tabIds [-1]); normal tabs keep their security headers.
