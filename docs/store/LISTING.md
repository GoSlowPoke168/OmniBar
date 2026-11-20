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
> • Summarize page and Ask about page: send the current tab's address to the app you have open, in one click. OmniBar asks before reading the current page and shows which page will be used ("Page: …") above the buttons
> • Copy page link: click the link icon to copy the current tab’s address to your clipboard
> • Default page: open your favorite app automatically when the sidebar opens
> • Desktop or mobile layout per app
> • Light and dark themes that follow Chrome, or pick one
> • Keyboard shortcut (Alt+Z by default) to open and close the sidebar
> • Import and export your app list
>
> Privacy: your app list and settings stay on your device. OmniBar has no accounts, servers, analytics or ads. App websites receive your browser’s requests directly. OmniBar sends app hostnames to Google to fetch their icons and checks the embedded app locally for known sign-in errors. Some sites need you to sign in in a separate browser tab or window.
>
> Free and open source: https://github.com/GoSlowPoke168/OmniBar

**Category:** Productivity → Tools
**Language:** English

**Graphics:**
- Store icon: comes from `icons/icon128.png` in the package (96×96 artwork with 16 px padding)
- Screenshots (1280×800) captured in Chrome: `docs/store/screenshot-1-chat-dark.png` (Ask about page with ChatGPT), `docs/store/screenshot-2-summarize-dark.png` (Summarize page with Claude), and `docs/store/screenshot-3-settings-dark.png` (Settings).
- Small promo tile (440×280): `docs/store/promo-440x280.png`
- YouTube video (optional): paste [the OmniBar demo URL](https://youtu.be/_A6NavuuatI) into the promotional video field.

## Privacy practices tab

**Single purpose description:**
> OmniBar lets users open web apps of their choice in Chrome's side panel, next to the page they are viewing, and optionally send the current page's address to the open app.

**Permission justifications:**

- **sidePanel:**
  > Shows OmniBar's app launcher and the selected web app in Chrome's side panel, which is the extension's core feature.
- **storage:**
  > Saves the user's app list, settings and app icons locally on the device so they persist between sessions.
- **tabs:**
  > After the user allows current page access, reads the active tab’s address and title to show which page the page actions will use. When the user clicks Summarize page or Ask about page, puts the address in the open chat app’s prompt. Copy page link reads the active tab’s address when clicked, even with current page access off. The permission also lets OmniBar detect when a separate Claude sign-in window reaches the chat page.
- **declarativeNetRequest:**
  > Many websites send X-Frame-Options or Content-Security-Policy headers that stop them from displaying inside another page. OmniBar uses a session rule to remove those two headers from subframe requests without a browser tab ID, including requests from the side panel. This lets users open their chosen apps inside the panel. Regular tabs keep their response headers.
- **Host permission (<all_urls>):**
  > Users can add any website as an app, so OmniBar needs access to all sites to load them in the side panel, apply the header rule above, and run its helper content script inside them. The content script exits immediately unless the page is framed inside OmniBar's own side panel; there it only types a prompt into the app's chat box when the user clicks Summarize page or Ask about page, and checks for a few known sign-in error messages so OmniBar can show sign-in help. It does nothing in normal tabs.

**Remote code:**
> No, I am not using remote code.

Justification (if asked):
> All JavaScript ships in the package. The web apps users add are loaded from their own websites inside an iframe in the side panel; that content is isolated from extension APIs.

**Data usage** (check these):
- **Web history:** active tab address and title for the page actions after the user allows current page access. Copy page link reads the address at the user’s request. OmniBar also checks the address of a Claude sign-in window it opens to detect when the chat page loads.
- **Website content:** the visible text of the app open in the side panel is checked on the device for a few known sign-in error messages.

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
> 2. Click an app icon on the right to load it. Google Image Search is an example that does not require sign-in to test the launcher.
> 3. To test the page actions, open a regular web page in the main tab and a compatible chat app such as ChatGPT in OmniBar. Sign in to the chat app in a separate tab if prompted. Click Allow in the page access prompt, then click Summarize page to send the tab's address or Ask about page to prefill a prompt.
> 4. Click the pencil to reorder/remove apps, + to add one, and the gear for Settings.
> The header rule matches only subframes without a browser tab ID (`tabIds: [-1]`). Regular tabs keep their security headers.
