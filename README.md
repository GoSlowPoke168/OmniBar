# OmniBar

A customizable sidebar extension for Chromium-based browsers like Google Chrome, Microsoft Edge, Brave, and Opera / Opera GX that allows you to dock your favorite web applications directly into the browser's side panel. 

Created as a replacement for the Microsoft Edge sidebar since Microsoft removed it for no reason...

![OmniBar Demonstration](assets/demo.png)

## Features

- **Customizable App Dock:** Add, edit, remove, and reorder your favorite web apps via a sleek, drag-and-drop interface.
- **Global Toggle Shortcut:** Quickly open and close the sidebar using a customizable keyboard shortcut (default: `Alt+Z`).
- **Contextual Copy Utilities:** Includes a one-click header utility to instantly copy the active tab's URL to your clipboard for easy pasting into docked AI tools.
- **Saved Preferences:** Your custom list of web apps is automatically saved to local storage, ensuring your custom setup remains intact even after restarting the browser.

## How to Use

- Click an icon to open it in the sidebar
- Right-click an icon to edit, remove, or open elsewhere
- Click ✎ to enter edit mode & drag to reorder
- Click + to add a new app

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

This extension is intended to be loaded as an unpacked extension in Developer Mode for now. In the future, there are plans to publish it to the browser extension stores.

### General Steps

1. **Download the code:** Download the latest release `.zip` file from the Releases page (or clone the repository) and extract it to a folder on your computer.
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

To allow external websites to load inside the sidebar's `<iframe>` context, this extension utilizes the `declarativeNetRequest` API to modify HTTP response headers. However, some websites might not connect and load due to client-side bot-mitigation techniques (such as Cloudflare Turnstile), which block rendering within an iframe.

## TODO

- [ ] Add a page button to extract context from the current page

## Support the Project
If you find this plugin useful, please leave a star on GitHub or consider supporting its development!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/T5T725W4FX)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

[![GitHub License](https://img.shields.io/github/license/goslowpoke168/OmniBar?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1zY2FsZSI+PHBhdGggZD0ibTE2IDE2IDMtOCAzIDhjLS44Ny42NS0xLjkyIDEtMyAxcy0yLjEzLS4zNS0zLTFaIi8+PHBhdGggZD0ibTIgMTYgMy04IDMgOGMtLjg3LjY1LTEuOTIgMS0zIDFzLTIuMTMtLjM1LTMtMVoiLz48cGF0aCBkPSJNNyAyMWgxMCIvPjxwYXRoIGQ9Ik0xMiAzdjE4Ii8+PHBhdGggZD0iTTMgN2gyYzIgMCA1LTEgNy0yIDIgMSA1IDIgNyAyaDIiLz48L3N2Zz4=)](https://github.com/GoSlowPoke168/OmniBar/blob/master/LICENSE)
