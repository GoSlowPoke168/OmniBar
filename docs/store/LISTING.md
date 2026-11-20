# Chrome Web Store submission sheet

Copy each block into the matching field of the Developer Dashboard.

## Package

- Build: run `pwsh -File build.ps1` in the repo root, then upload `dist/omnibar.zip`.
- Before uploading, load `dist/omnibar` with **Load unpacked** once to confirm it runs.

## Store listing tab

**Name:** OmniBar (from the manifest)

**Summary** (from the manifest, 127 characters):
> A customizable sidebar that keeps your web apps and AI assistants one click away, working alongside you in Chrome's side panel.

**Description:**
> Keep your favorite web apps open beside your current tab. With OmniBar, you can take notes while you research, keep a tool handy, or ask an AI assistant for help without leaving your work.
>
> • Build your own app dock. Add sites by URL, rename them, and drag them into the order you want.
> • Keep your choice of AI chat within reach. Switch between ChatGPT, Claude, and Gemini while your work stays in view.
> • Summarize the page you’re on. Send the current tab’s link to your chosen chat app with a summary prompt.
> • Ask about the page. Start with its link already in the chat box, then add your own question.
> • Customize your setup. Choose a default app, set mobile or desktop view for each app, pick a theme, and change the sidebar shortcut.
>
> Your app list and settings stay on your device. AI page actions require your permission. OmniBar sends app hostnames to Google for icons and checks for sign-in errors locally. Some apps may require you to sign in separately.

**Category:** Functionality & UI
**Language:** English

**Graphics:**
- Store icon: comes from `icons/icon128.png` in the package (96×96 artwork with 16 px padding)
- Screenshots (1280×800) captured in Chrome: `docs/store/screenshot-1-chat-dark.png` (Ask about page with ChatGPT), `docs/store/screenshot-2-summarize-dark.png` (Summarize page with Claude), and `docs/store/screenshot-3-settings-dark.png` (Settings).
- Small promo tile (440×280): `docs/store/promo-440x280.png`
- Marquee promo tile (1400×560, optional): `docs/store/marquee-1400x560.png`
- YouTube video (optional): paste [the OmniBar demo URL](https://youtu.be/_A6NavuuatI) into the promotional video field.

## Privacy practices tab

**Single purpose description:**
> OmniBar is a side panel for using web apps the user chooses, such as AI assistants, notes or docs, beside the page they are viewing. Its page tools serve the same purpose: with the user's permission, they show which tab is open and, when the user clicks, share that tab's URL with the app open in the panel.

**Permission justifications** (one box each in the dashboard):

- **sidePanel:**
  > All of OmniBar's interface lives in Chrome's side panel: the app dock, the web app the user selects, Settings, and the page tools. The toolbar icon and the user's keyboard shortcut (Alt+Z by default) open and close the panel with sidePanel.open and sidePanel.close. Without this permission the extension has no interface.
- **storage:**
  > chrome.storage.local saves the user's app list (names, URLs, order and per-app layout), settings (default app and the current-page access choice) and cached app icons on the device, so the setup persists between sessions and icons appear instantly. chrome.storage.session remembers which windows have the panel open, so the toolbar icon and shortcut toggle it correctly after the service worker restarts. Nothing is synced or sent to a server.
- **declarativeNetRequest:**
  > Many web apps send X-Frame-Options or Content-Security-Policy headers that stop them from displaying inside another page, so they would appear blank or refused in the side panel. OmniBar adds one session rule that removes only these two response headers, and only for sub_frame requests with tabId -1 (TAB_ID_NONE), meaning requests not tied to a browser tab, which is how frames inside the side panel load. Regular browser tabs never match the rule and keep all their headers. The rule does not block, redirect or change any other traffic.
- **Host permission (<all_urls>):**
  > Users add web apps by URL and can choose any site, so access cannot be limited to a fixed list of domains. Host access is used to:
  > 1. Apply the header rule above so the user's chosen sites can load in the side panel.
  > 2. Run a helper content script that exits immediately unless it is inside OmniBar's side panel. There it inserts a prompt into the open app when the user clicks Summarize page or Ask about page, and checks the app's visible text on the device for known sign-in errors.
  > 3. Only after the user allows current-page access (changeable in Settings), read the active tab's URL and title to show which page those tools will use. Copy page link reads the URL only when clicked. OmniBar does not request the tabs permission.
  > 4. Detect when sign-in finishes in a sign-in window OmniBar opens at the user's request.
  > 5. Download app icons from Google's favicon service.
  > activeTab is not enough: side panel buttons don't grant it, and apps must load without a toolbar click.

**Remote code:**
> No, I am not using remote code.

Justification (if asked):
> All JavaScript ships in the package. The web apps users add are loaded from their own websites inside an iframe in the side panel; that content is isolated from extension APIs.

**Data usage** (check these):
- **Web history:** the active tab's URL and title, read only after the user allows current-page access, to show which page Summarize page and Ask about page will use; the URL is put in the open app's prompt only when the user clicks one of them. Copy page link reads the URL when clicked. OmniBar also reads the URL of a sign-in window it opens, to detect when sign-in finishes.
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
> 2. Click an app icon on the right to load it. Google Image Search is an example that does not require sign-in to test the launcher.
> 3. To test the page actions, open a regular web page in the main tab and a compatible chat app such as ChatGPT in OmniBar. Sign in to the chat app in a separate tab if prompted. Click Allow in the page access prompt, then click Summarize page to send the tab's address or Ask about page to prefill a prompt.
> 4. Click the pencil to reorder/remove apps, + to add one, and the gear for Settings.
> The header rule matches only subframes without a browser tab ID (`tabIds: [-1]`). Regular tabs keep their security headers.
