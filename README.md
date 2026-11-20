# OmniBar

A customizable sidebar extension for Chromium-based browsers like Google Chrome, Microsoft Edge, Brave, and Opera / Opera GX that allows you to dock your favorite web applications directly into the browser's side panel. 

Created as a replacement for the Microsoft Edge sidebar since Microsoft removed it for no reason...

[Watch the OmniBar demo on YouTube (1:14)](https://youtu.be/_A6NavuuatI)

## Features

- **App dock.** Add, edit, remove, and reorder web apps. Icons slide into place as you drag. Open apps in the sidebar, a new tab, or a separate side window.
- **Page actions.** **Summarize page** sends a prompt with the current tab’s URL to a compatible chat app. **Ask about page** fills in the page URL so you can add your question before sending. OmniBar asks before reading the current tab and shows which page it will use.
- **Default page and loading indicator.** Open a chosen app automatically with the sidebar. The app strip and controls are available while the page loads.
- **Theme and layout.** Follow the browser theme or choose light or dark mode. Switch between mobile and desktop layouts per app.
- **Keyboard shortcut.** Press `Alt+Z` to toggle the sidebar, or change the shortcut in your browser.
- **Sign-in help.** If the embedded app asks you to sign in, OmniBar can open its sign-in page in a separate window.
- **Local settings.** OmniBar saves your app list and preferences on your device. Export or import your app list from Settings.

## How to Use

- Click an icon to open it in the sidebar
- Right-click an icon to open it elsewhere, sign in, edit, or remove it
- Click the pencil to enter edit mode, then drag to reorder
- Click + to add a new app and the gear for Settings
- Use **Summarize page** or **Ask about page** at the bottom of the sidebar to send the current page to the open app

## Compatibility

| Browser | Support Status |
| :--- | :--- |
| **Google Chrome** | ![Chrome Supported](https://img.shields.io/badge/Supported-success?style=flat-square&logo=googlechrome&logoColor=white) |
| **Microsoft Edge** | ![Edge Supported](https://img.shields.io/badge/Supported-success?style=flat-square) |
| **Brave** | ![Brave Supported](https://img.shields.io/badge/Supported-success?style=flat-square&logo=brave&logoColor=white) |
| **Opera / Opera GX** | ![Opera Supported](https://img.shields.io/badge/Supported-success?style=flat-square&logo=opera&logoColor=white) |
| **Mozilla Firefox** | ![Firefox Planned](https://img.shields.io/badge/Planned-orange?style=flat-square&logo=firefox&logoColor=white) |

*Note: This extension relies on the Manifest V3 `sidePanel` API. Browsers lacking support for this specific API (like Mozilla Firefox) cannot run the extension currently, though Firefox support is planned for the future.*

## Installation

A Chrome Web Store listing is on the way. Until then, load OmniBar as an unpacked extension in Developer Mode.

### General Steps

1. **Download OmniBar.** Get `omnibar.zip` from the [latest GitHub release](https://github.com/GoSlowPoke168/OmniBar/releases/latest) and extract it.
2. Open your browser and navigate to the Extensions page (see the [Browser-Specific Links](#browser-specific-links) below).
3. Enable **Developer mode**.
4. Click the **Load unpacked** button.
5. Select the extracted folder containing this extension's source code.
6. (Optional) Configure the keyboard shortcut by navigating to the Shortcuts page.

### Browser-Specific Links

| Browser | Extensions Page | Shortcuts Page |
| :--- | :--- | :--- |
| **Google Chrome** | `chrome://extensions/` | `chrome://extensions/shortcuts` |
| **Microsoft Edge** | `edge://extensions/` | `edge://extensions/shortcuts` |
| **Brave** | `brave://extensions/` | `brave://extensions/shortcuts` |
| **Opera / Opera GX** | `opera://extensions/` | `opera://extensions/shortcuts` |


## Technical Notes

OmniBar uses the `declarativeNetRequest` API to help external websites load in its sidebar iframe. Its session rule removes frame-blocking response headers from subframe requests without a browser tab ID, including requests from the side panel. Regular tabs keep their response headers. Some websites can still block embedded access.

### Known issue with Claude

Claude’s sign-in flow can fail inside the sidebar. If that happens, right-click Claude’s icon and choose **Sign in…**, or sign in to `claude.ai` in a regular browser tab. Return to OmniBar and click **Refresh** if Claude stays on the sign-in screen.

## Privacy

OmniBar has no servers, accounts, analytics, or ads. See the [Privacy Policy](PRIVACY.md).

## Support the Project
If you find this plugin useful, please leave a star on GitHub or consider supporting its development!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/T5T725W4FX)

## License

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue?style=for-the-badge&logo=gnu&logoColor=white)](LICENSE)
