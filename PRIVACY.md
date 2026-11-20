# OmniBar Privacy Policy

_Last updated: November 20, 2026_

OmniBar is a free browser extension that lets you open your favorite web apps in the browser's side panel. It has no servers, no accounts, no analytics and no ads. The developer never receives any of your data.

## What OmniBar stores

All of this stays on your device, in your browser's extension storage. It is never sent to the developer.

- **Your app list:** each app's name and web address, its order, and whether you turned on desktop view for it.
- **Your settings:** your Default page, your Appearance choice (System, Light or Dark), and whether you allowed OmniBar to read the current page.
- **Your apps' icons**, saved after they're first downloaded so the sidebar opens quickly.
- **Which browser windows have the sidebar open**, so the keyboard shortcut can open and close it correctly. This is cleared when the browser closes.

## What OmniBar reads

- **Current page context.** After you click **Allow** on "Show the current page here?", OmniBar reads the active tab’s address and title to show the **Page** label. **Summarize page** submits a prompt containing the address to the open chat app. **Ask about page** puts the address into the app’s prompt box for you to complete and send. OmniBar keeps no saved history of these page addresses or titles. You can turn these features off in Settings → Current page.
- **Copy page link.** When you click this button, OmniBar reads the active tab’s address and copies it to your clipboard. This separate action works even when Current page is off.
- **Sign-in help.** OmniBar checks the sidebar app’s response status, hostname, and visible text for known sign-in errors. It watches for text changes for up to about 30 seconds after the app loads. If you open Claude in OmniBar’s separate sign-in window, OmniBar checks that window’s address to tell when Claude reaches its chat page. These checks happen on your device.

OmniBar does not read or change pages in your normal browser tabs.

## Who else receives data

- **Google's favicon service** (`www.google.com/s2/favicons`) receives app hostnames (for example, `chatgpt.com`) when OmniBar downloads or refreshes an icon. OmniBar typically refreshes cached icons after about a week. The icon request includes the app’s hostname and the requested icon size. See [Google's Privacy Policy](https://policies.google.com/privacy).
- **The websites you open through OmniBar** receive your browser’s requests directly, including when you open a separate sign-in window. Each site handles your interactions under its own privacy policy. This includes information you enter and any page address OmniBar puts into a chat app’s prompt box.

OmniBar does not sell or rent your data or use it for advertising. The developer does not receive or review your data.

## Permissions and why they're needed

- **Side panel (`sidePanel`):** to show OmniBar in the browser's side panel.
- **Storage (`storage`):** to save your app list and settings on your device.
- **Tabs (`tabs`):** to read the current tab’s address and title for the page actions, copy the address at your request, and detect when Claude reaches its chat page in the separate sign-in window.
- **Declarative Net Request (`declarativeNetRequest`):** many sites send headers that block them from appearing inside other pages. OmniBar uses a session rule to remove those headers from subframe requests without a browser tab ID, including requests from the side panel. Regular tabs keep their response headers.
- **Access to all websites:** your apps can be any website, so OmniBar needs access to load them in the side panel and to run its helper script inside them. The helper script only works inside OmniBar's side panel. It types the prompt when you click Summarize page or Ask about page, and checks for the sign-in messages described above.

## Deleting your data

Removing an app deletes it from your list. Uninstalling OmniBar deletes its browser storage. Files you export and data held by websites are managed separately.

## Chrome Web Store User Data Policy

OmniBar's use of information complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies), including its [Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use). OmniBar uses data to provide the features described above. The services listed under "Who else receives data" handle the information they receive under their own policies.

## Changes to this policy

If OmniBar starts handling data differently, this page will be updated before the change ships, and the date at the top will change.

## Contact

Questions or concerns: open an issue at [github.com/GoSlowPoke168/OmniBar/issues](https://github.com/GoSlowPoke168/OmniBar/issues).
