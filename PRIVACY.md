# OmniBar Privacy Policy

_Last updated: November 19, 2026_

OmniBar is a free browser extension that lets you open your favorite web apps in the browser's side panel. It has no servers, no accounts, no analytics and no ads. The developer never receives any of your data.

## What OmniBar stores

All of this stays on your device, in your browser's extension storage. It is never sent to the developer.

- **Your app list:** each app's name and web address, its order, and whether you turned on desktop view for it.
- **Your settings:** your Default page and your Appearance choice (System, Light or Dark).
- **Which browser windows have the sidebar open**, so the keyboard shortcut can open and close it correctly. This is cleared when the browser closes.

## What OmniBar reads

- **The current tab's web address and title.** OmniBar reads these to show "Page: …" above the Summarize page and Ask about page buttons. The address is only used when you act:
  - **Summarize page** and **Ask about page** type the address into the app open in the sidebar. That app then receives it, the same as if you had typed it yourself.
  - **Copy page link** copies the address to your clipboard.
- **Text shown by the app in the sidebar.** For about 30 seconds after an app loads, OmniBar checks the app's visible text for a few known error messages (for example, when a site needs you to sign in in a separate tab), so it can show sign-in help. This check happens on your device and nothing is saved or sent.

OmniBar does not read or change pages in your normal browser tabs.

## Who else receives data

- **Google's favicon service** (`www.google.com/s2/favicons`) receives the domain of each app in your list (for example, `chatgpt.com`) so OmniBar can show its icon. No other information is sent. See [Google's Privacy Policy](https://policies.google.com/privacy).
- **The websites you open in the sidebar** load directly from those sites, just like in a normal tab, and handle your data under their own privacy policies. This includes anything you type into them and any page address you send with Summarize page or Ask about page.

OmniBar does not sell, rent or share your data with anyone else, does not use it for advertising, and no person reads it.

## Permissions and why they're needed

- **Side panel (`sidePanel`):** to show OmniBar in the browser's side panel.
- **Storage (`storage`):** to save your app list and settings on your device.
- **Tabs (`tabs`):** to read the current tab's address and title for the action bar, and to open apps in a new tab or window when you ask.
- **Declarative Net Request (`declarativeNetRequest`):** many sites send headers that block them from appearing inside other pages. OmniBar removes those headers only for pages loaded inside its own side panel, so your apps can display there. Your normal tabs are not affected.
- **Access to all websites:** your apps can be any website, so OmniBar needs access to load them in the side panel and to run its helper script inside them. The helper script only works inside OmniBar's side panel. It types the prompt when you click Summarize page or Ask about page, and checks for the sign-in messages described above.

## Deleting your data

Removing an app deletes it from your list. Uninstalling OmniBar deletes everything it stored.

## Chrome Web Store User Data Policy

OmniBar's use of information complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies), including its [Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use). Data is used only to provide OmniBar's features described above, is never transferred except as described in "Who else receives data", is never used for advertising, and is never read by people.

## Changes to this policy

If OmniBar starts handling data differently, this page will be updated before the change ships, and the date at the top will change.

## Contact

Questions or concerns: open an issue at [github.com/GoSlowPoke168/OmniBar/issues](https://github.com/GoSlowPoke168/OmniBar/issues).
