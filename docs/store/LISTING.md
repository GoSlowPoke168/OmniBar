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
> OmniBar lets users open web apps of their choice in Chrome's side panel, next to the page they are viewing, and optionally send the current page's address to the open app.

**Permission justifications:**

- **sidePanel:**
  > Shows OmniBar's app launcher and the selected web app in Chrome's side panel, which is the extension's core feature.
- **storage:**
  > Saves the user's app list, settings and app icons locally on the device so they persist between sessions.
- **declarativeNetRequest:**
  > Many websites send X-Frame-Options or Content-Security-Policy headers that stop them from displaying inside another page. OmniBar uses a session rule to remove those two headers from subframe requests without a browser tab ID, including requests from the side panel. This lets users open their chosen apps inside the panel. Regular tabs keep their response headers.
- **Host permission (<all_urls>):**
  > Users can add web apps by URL, so OmniBar needs access to sites they choose to open in the sidebar. Host access enables embedding and lets the sidebar helper insert prompts at the user’s request and check for known sign-in errors. It also gives OmniBar the active web page’s URL and title for the opt-in page actions, the URL for Copy page link when clicked, and the URL of a Claude sign-in window OmniBar opens to detect when it reaches the chat page.

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
