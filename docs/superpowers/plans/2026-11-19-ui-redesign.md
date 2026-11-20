# OmniBar UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every OmniBar surface into one light/dark design system (Geist, one icon set, tokens, subtle motion) and add the bottom Summarize/Ask action bar, per the approved spec.

**Architecture:** Rewrite `sidebar.css` around CSS custom-property tokens switched by `html[data-theme]`; a new `theme.js` in `<head>` applies the stored theme before first paint. Icons come from one inline SVG `<symbol>` sprite in `sidebar.html`. Behavior stays in `sidebar.js`; new UI behavior (tooltips, action bar, sheets, confirm dialog) is added there. Verification uses a browser harness (stubbed `chrome` API + DOM check script) driven through Playwright.

**Tech Stack:** Plain HTML/CSS/JS (Manifest V3 side panel), Geist WOFF2 (OFL), Playwright MCP tools + `python -m http.server` for verification only.

**Spec:** `docs/superpowers/specs/2026-11-19-ui-redesign-design.md` (mockups: `docs/superpowers/specs/2026-11-19-ui-redesign-mockups/full-draft-v2.html`, sign-in icon = option C in `signin-icon-options.html`).

## Global Constraints

- No styling library, no framework, no npm, no build step; plain HTML/CSS/JS in the existing files.
- Manifest V3: no remote fonts or scripts; no inline `<script>`; no new permissions.
- Every screen must work at 320 px wide; target Chrome 155+.
- All colors, radii, durations come from the token table in the spec ("Tokens"); no hex colors outside the two token blocks in `sidebar.css`.
- Type scale exactly: 16/700 titles, 14/600 app name, 13.5/400 body, 12.5/400 help, 11/600 uppercase +0.07em labels. Sentence case for every label.
- Motion: 120 ms hover/press, 180 ms open (120 ms close), 220 ms toast; animate only `opacity`/`transform`; honor `prefers-reduced-motion`.
- Added assets ≤ 100 KB; nothing animating or polling while idle (edit-mode wiggle excepted).
- No feature behavior changes: sign-in detection, frame bridge, Default Page, desktop view, Alt+Z, header-stripping rules keep working as today.
- The Appearance setting themes OmniBar only; the app iframe keeps following Chrome (`color-scheme: light dark` on the iframe).
- Comments: none or one line explaining why (owner's CLAUDE.md, max 2 lines).

## Review Focus

1. **Long text at 320 px** (app name "Google Image Search", a 120-char page title, long URL chip): everything truncates with an ellipsis; no wrapping, overflow or overlap. → Task 5 check `longTextTruncates`.
2. **Theme flash:** stored theme "dark" with the system in light mode — the first painted frame is dark. → Task 2 check `themeBeforePaint`.
3. **Strip clicks while a sheet is open:** clicking an app icon or the pencil closes the sheet and then acts; Escape closes the topmost layer first (confirm > sheet > menu > edit mode > app). → Task 7 checks `sheetClosesOnStripClick`, `escapeOrder`.
4. **Non-web active tab:** with `chrome://newtab/` active the action bar shows "Page: none" and both buttons are disabled with a tooltip; switching to a web tab re-enables them without reopening the sidebar. → Task 5 check `actionBarNonWeb`.
5. **Keyboard only:** Tab reaches every button in the header, strip, action bar and sheets with a visible focus ring; Enter submits and Escape cancels the add/edit dialog. → Task 7 check `keyboardDialog`, Task 2 check `focusRingVisible`.

---

### Task 1: Verification harness

**Files:**
- Create: `test/chrome-stub.js`, `test/ui-checks.js`, `test/README.md`

**Interfaces:**
- Produces: `window.__stub` with `setActiveTab({url, title})`, `fireTabActivated()`, `fireTabUpdated(info)`, `storage` (in-memory object backing `chrome.storage.local`, seedable from the init script). System light/dark is not stubbed; use Playwright `emulateMedia({colorScheme})`. Pre-load state (e.g. `localStorage['omnibar-theme']`) is seeded in the same init script.
- Produces: `window.runUiChecks(names?: string[]) => Promise<{name: string, ok: boolean, detail?: string}[]>`; later tasks register checks with `window.uiCheck(name: string, fn: () => Promise<void> | void)` where `fn` throws on failure.

- [ ] **Step 1:** Write `test/chrome-stub.js` defining `window.chrome` before any page script, covering every API `sidebar.js`/`theme.js` call: `storage.local.get/set` (Promise, in-memory), `runtime.sendMessage` (answers `get-active-tab-url` with the stub's active tab; other types resolve `{status:'ok'}`), `runtime.getManifest()` → `{version:'1.0.0'}`, `runtime.getURL`, `commands.getAll()` → `[{name:'toggle-sidebar', shortcut:'Alt+Z'}]`, `tabs.create/query`, `tabs.onActivated/onUpdated/onRemoved.addListener/removeListener`, `windows.getCurrent/create/remove`, `windows.onRemoved.addListener/removeListener`.
- [ ] **Step 2:** Write `test/ui-checks.js` with `uiCheck`/`runUiChecks` and one baseline check `noConsoleErrors` (wrap `console.error` from load; fail if any call).
- [ ] **Step 3:** Write `test/README.md` (≤ 10 lines): run `python -m http.server 8765` from the repo root; in Playwright `addInitScript` with `test/chrome-stub.js`, navigate to `http://localhost:8765/sidebar.html?test`, inject `test/ui-checks.js`, call `runUiChecks()`; screenshot at widths 320/420/600 with `emulateMedia({colorScheme})`.
- [ ] **Step 4: Verify** — load today's `sidebar.html` through the harness; Expected: page renders the strip, `runUiChecks()` returns `noConsoleErrors: ok`. Save baseline screenshots to the scratchpad (not the repo).
- [ ] **Step 5: Commit** — `git add test && git commit -m "test: add browser harness for sidebar UI checks"`

### Task 2: Tokens, theme, typography, global states

**Files:**
- Create: `theme.js`, `fonts/Geist-Variable.woff2` (Latin subset), `fonts/OFL.txt`
- Modify: `sidebar.html` (`<head>`), `sidebar.css` (`:root` tokens, base rules, all existing color literals)

**Interfaces:**
- Produces: `theme.js` exposes `window.OmniTheme = { get(): 'system'|'light'|'dark', set(mode): void }`; it sets `document.documentElement.dataset.theme` to `'light'|'dark'` immediately (resolving `'system'` via `matchMedia('(prefers-color-scheme: dark)')`, updating on change). Storage key: `localStorage['omnibar-theme']`, default `'system'`.
- Produces: CSS tokens named exactly as the spec table (`--bg --surface --raised --hover --border --text --text-2 --text-3 --accent --on-accent --accent-soft --danger`) plus `--r-sm:6px --r-md:8px --r-lg:12px --t-fast:120ms --t-open:180ms --t-close:120ms --t-toast:220ms --ease:cubic-bezier(.2,0,0,1) --strip-w:48px`.

- [ ] **Step 1: Write failing checks** in `test/ui-checks.js`: `themeBeforePaint` (with `localStorage['omnibar-theme']='dark'` and light system scheme, `getComputedStyle(document.body).backgroundColor` read in a `DOMContentLoaded` listener equals rgb of `#1f1f1f`); `fontIsGeist` (`document.fonts.check('13.5px Geist')` true after `document.fonts.ready`); `noStrayColors` (fetch `sidebar.css`, strip the two token blocks, assert no `#hex`/`rgb(` literals remain); `focusRingVisible` (focus `#btn-settings` via keyboard-equivalent `.focus({focusVisible:true})`, outline width 2px); `iframePinnedScheme` (`getComputedStyle($('#app-frame')).colorScheme === 'light dark'`).
- [ ] **Step 2: Run** — Expected: all five FAIL.
- [ ] **Step 3:** Download Geist variable WOFF2 (Latin) from the Google Fonts css2 API response for `family=Geist:wght@100..900` and the OFL text from the vercel/geist-font repo; add `@font-face` (`font-display: block`, local `url(fonts/Geist-Variable.woff2)`).
- [ ] **Step 4:** Write `theme.js`; include it as the first `<script src="theme.js">` in `<head>` (not deferred).
- [ ] **Step 5:** Replace `sidebar.css` `:root` with the dark token block on `html[data-theme="dark"]` and light on `html[data-theme="light"]` (values from the spec table); set `color-scheme` per theme on `:root`, `#app-frame { color-scheme: light dark; background: Canvas; }`; replace every color literal in the file with tokens; add base type scale, `:focus-visible` (2px `--accent` outline, 2px offset), `::selection` (`--accent-soft`), thin themed scrollbars, and `@media (prefers-reduced-motion: reduce)` that zeroes transforms/animations and caps transitions at 80 ms.
- [ ] **Step 6: Run checks** — Expected: all PASS, `noConsoleErrors` still ok. Screenshot dark + light at 420 px.
- [ ] **Step 7: Commit** — `git add theme.js fonts sidebar.html sidebar.css test && git commit -m "feat(ui): theme tokens, Geist, light/dark with no flash"`

### Task 3: Icon sprite, top bar, strip footer

**Files:**
- Modify: `sidebar.html` (sprite, header buttons, strip footer, remove `#hdr-summarize`/`#hdr-ask` from header), `sidebar.css` (header, strip, edit-mode badge), `sidebar.js` (remove listeners for the two removed header buttons only; Task 5 re-adds them in the bar)

**Interfaces:**
- Produces: sprite symbol ids `i-link i-phone i-monitor i-ext i-win i-refresh i-x i-sparkle i-ask i-plus i-pen i-gear i-lock i-login i-download i-upload i-reset i-check i-xcircle i-trash i-chev i-shield-off`; markup pattern `<svg class="icon"><use href="#i-NAME"/></svg>` (24 viewBox, `stroke-width:1.7`, round caps, `currentColor`, 15 px in header/menus, 16 px in strip footer).
- Produces: `.is-active` class for footer buttons (pencil in edit mode; gear/plus while their sheet is open — used by Task 7).

- [ ] **Step 1: Failing checks:** `noGlyphIcons` (no element text in header, strip footer, ctx menu, blocked/sign-in panels consists solely of one of `↗ ❐ ↺ ✕ ✎ + ＋ ⚙ 🔒 🔑`); `headerButtonsOrder` (ids in order: `hdr-copyurl hdr-desktop hdr-newtab hdr-window hdr-refresh hdr-close`, each containing an `svg use`); `gearIsGear` (`#btn-settings use` href is `#i-gear`); `pencilActive` (after `toggleEditMode()`, `#btn-edit` has `.is-active`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3:** Add the sprite (Lucide-derived paths) at the top of `<body>`; rebuild header and footer buttons per spec "Top bar" and "Icon strip"; desktop toggle keeps two `<svg>`s switched by `.active` as today; remove-badge becomes a 16 px `--danger` circle with an `i-x` icon; keep the wiggle.
- [ ] **Step 4: Run checks** — Expected: PASS. Screenshot header + strip at 320 px both themes; compare with mockup screens 1–2.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): unified icon set for top bar and strip"`

### Task 4: Tooltips

**Files:**
- Modify: `sidebar.html` (add `<div id="tooltip" role="tooltip">`; convert every `title=` to `data-tip=`), `sidebar.css`, `sidebar.js` (tooltip controller; app icons use `data-tip` instead of `data-tooltip`)

**Interfaces:**
- Produces: any element with `data-tip="text"` gets the OmniBar tooltip; `setTip(el: Element, text: string): void` updates it (used by desktop toggle, action bar, opener buttons).

- [ ] **Step 1: Failing checks:** `noNativeTitles` (no `[title]` inside `#app` except the iframe); `tooltipShowsAfterDelay` (dispatch `pointerenter` on `#btn-add`; tooltip hidden at 300 ms, visible at 500 ms with text "Add app"); `tooltipStaysInside` (for `#hdr-close` and the bottom app icon, tooltip rect lies within `0..innerWidth` and `0..innerHeight`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3:** Implement one positioned `#tooltip` (fixed, `pointer-events:none`, 400 ms show delay, 120 ms opacity fade, prefers placement left of strip items / below header items, clamped to the viewport; hides on `pointerleave`, `pointerdown`, scroll, `keydown`). Copy: footer "Add app", "Edit apps — drag to reorder, × to remove", "Settings"; app icons "<Name> — right-click for more"; header buttons keep today's wording in sentence case; desktop toggle keeps its two-state text via `setTip`.
- [ ] **Step 4: Run checks** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): OmniBar tooltips replace native titles"`

### Task 5: Action bar

**Files:**
- Modify: `sidebar.html` (`#action-bar` inside `#content-panel` after the iframe: `#action-page` line + `#act-summarize`, `#act-ask`), `sidebar.css`, `sidebar.js`

**Interfaces:**
- Consumes: `sendPageToApp(buildPrompt, send)` (existing, unchanged), `setTip` (Task 4), `chrome.runtime.sendMessage({type:'get-active-tab-url'})` → `{url, title}` (existing).
- Produces: `refreshPageContext(): void` — re-queries the active tab and renders "Page: <title>" (fallback to hostname if no title) or "Page: none" for non-`http(s)` URLs, toggling `disabled` + tip "Open a regular web page first" on both buttons.

- [ ] **Step 1: Failing checks:** `actionBarShowsTitle` (stub tab `{url:'https://en.wikipedia.org/wiki/Garbage', title:'Garbage – Wikipedia'}`, open an app → `#action-page` text is "Page: Garbage – Wikipedia"); `actionBarNonWeb` (set stub tab to `chrome://newtab/`, `fireTabActivated()` → text "Page: none", both buttons `disabled`, tip text "Open a regular web page first"; set back to Wikipedia + `fireTabUpdated({status:'complete'})` → enabled); `longTextTruncates` (320 px viewport, 120-char title and app name "Google Image Search": `#action-page`, `#panel-app-name`, `#panel-url-text` each have `scrollWidth > clientWidth` and computed `text-overflow: ellipsis`, and no element's right edge exceeds the content panel); `summarizeStillSends` (click `#act-summarize` → stub sees a `postMessage` to the iframe with `type:'omnibar-insert'`, `send:true`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3:** Build the bar per spec "Action bar" (labels "Summarize page" with `i-sparkle`, primary; "Ask about page" with `i-ask`); call `refreshPageContext()` on `openApp`, `chrome.tabs.onActivated`, and `chrome.tabs.onUpdated` when `changeInfo.title || changeInfo.status === 'complete'` (events only, no polling); bar hidden while no app is open.
- [ ] **Step 4: Run checks** — Expected: PASS. Screenshot at 320/420/600 both themes vs mockup screen 1.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): bottom action bar for page prompts"`

### Task 6: Content-area states

**Files:**
- Modify: `sidebar.html` (`#signin-msg`, `#blocked-msg`, new `#empty-state`, new `#edit-hint`, spinner), `sidebar.css`, `sidebar.js` (`openApp`, `closePanel`, `toggleEditMode`, `renderStrip`)

**Interfaces:**
- Produces: `showContentState(state: 'app'|'empty'|'edit'): void` — one place that decides which of iframe / empty hint / edit hint is visible (sign-in and blocked panels still overlay the app as today).

- [ ] **Step 1: Failing checks:** `spinnerDelayed` (open an app; spinner hidden at 100 ms, visible at 250 ms if the frame hasn't loaded); `signinPanelIcon` (trigger `omnibar-signin-needed` message → `#signin-msg` contains `use[href="#i-login"]` inside a 52 px circle, no emoji, title "Sign in to <App>", text unchanged from today); `blockedPanelStyled` (blocked panel has `#i-shield-off`, primary button text "Open in new tab"); `emptyStateCopy` (no app open → "Choose an app on the right to open it here."; with `apps=[]` → "Add an app with + to get started."); `editHintShown` (enter edit mode → `#edit-hint` visible with "Editing apps" and the spec copy; empty-state hidden).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3:** Implement per spec "App frame states" and the edit-mode bullet; spinner shows via a 150 ms timer cleared on load; sign-in/blocked share one `.state-panel` layout (icon circle, 16/700 title, 13 px text, primary + secondary buttons, small note).
- [ ] **Step 4: Run checks** — Expected: PASS. Screenshot sign-in (light) and edit mode (dark) vs mockup screens 6–7.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): restyled loading, sign-in, blocked, empty and edit states"`

### Task 7: Sheets — Settings, add/edit, reset confirmation

**Files:**
- Modify: `sidebar.html` (move `#modal-overlay` and `#settings-overlay` into a `#sheet-layer` positioned over the content area only; add `#confirm-overlay`), `sidebar.css`, `sidebar.js` (`openModal`, `saveModal`, `openSettings`, `closeSettings`, `resetToDefaults`, Escape handler, strip click handlers)

**Interfaces:**
- Consumes: `OmniTheme.get/set` (Task 2), `.is-active` (Task 3), `setTip` (Task 4).
- Produces: `openSheet(id: 'settings'|'modal'|'confirm', opener?: Element): void`, `closeSheet(): void`, `confirmDialog({title, body, confirmLabel, danger}): Promise<boolean>`.

- [ ] **Step 1: Failing checks:** `sheetCoversContentOnly` (open Settings; `#sheet-layer` right edge equals `innerWidth - 48`, strip still receives clicks); `openerActive` (gear has `.is-active` while Settings is open, removed on close; same for plus with the add dialog); `sheetClosesOnStripClick` (Settings open, click an app icon → sheet closed and that app open; Settings open, click pencil → sheet closed and edit mode on; click gear again → closed); `escapeOrder` (confirm open over Settings: Escape closes confirm only, next Escape closes Settings; with a ctx menu open Escape closes the menu; then edit mode; then the app); `appearanceSwitch` (click "Dark" → `data-theme="dark"`, `localStorage['omnibar-theme']==='dark'`; "System" follows emulated scheme); `settingsContent` (sections in order Appearance, Default page, Apps, Shortcut; shortcut keys rendered from `commands.getAll` as `<kbd>Alt</kbd><kbd>Z</kbd>`; footer "OmniBar 1.0.0"; no "How to use" or "Web App Sidebar" text); `keyboardDialog` (open add dialog: primary "Add app" disabled until both fields filled; Enter in URL field saves; Escape cancels; edit dialog title "Edit app", primary "Save"); `resetUsesDialog` (`window.confirm` replaced with a throwing spy; clicking Reset opens `#confirm-overlay` with title "Reset to defaults?", body and danger "Reset" from the spec; Cancel leaves apps unchanged, Reset replaces them).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3:** Restructure overlays into `#sheet-layer` (`position:absolute; inset:0 var(--strip-w) 0 0` inside `#app`, which becomes `position:relative`), visible even when `#content-panel` is hidden; implement `openSheet/closeSheet/confirmDialog`; rebuild Settings per spec (segmented control, styled Default page select — `appearance: base-select` if it renders correctly at 320 px in both themes, else a native select styled to tokens with the popup left native and noted in the final report; Apps rows; Shortcut via `chrome.commands.getAll`; version via `chrome.runtime.getManifest().version`); rebuild add/edit dialog copy per spec. Enter/exit: fade + scale .98 over `--t-open`, close `--t-close`.
- [ ] **Step 4: Run checks** — Expected: PASS. Screenshot Settings (dark) and add dialog (light) vs mockup screens 3–4.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): sheets for settings, add/edit and reset confirmation"`

### Task 8: Context menu, toasts, final verification

**Files:**
- Modify: `sidebar.html` (`#ctx-menu` items with icons), `sidebar.css`, `sidebar.js` (`showToast`, ctx menu close-on-scroll)

**Interfaces:**
- Consumes: sprite (Task 3).
- Produces: `showToast(message: string, type: 'success'|'error'|'info'): void` (same signature as today).

- [ ] **Step 1: Failing checks:** `ctxMenuIcons` (items in order Open in new tab, Open in side window, Sign in…, separator, Edit, Remove; each with an icon; Remove uses `--danger`); `ctxMenuInBounds` (open on the bottom app icon at 320×480 → menu rect inside the viewport); `toastPill` (success toast has `#i-check`, error toast `#i-xcircle`, positioned above `#action-bar`, gone after 2.5 s + exit); `assetBudget` (sum of `fonts/*` + sprite markup bytes ≤ 100 KB); `idleQuiet` (no running `document.getAnimations()` 1 s after load with no edit mode).
- [ ] **Step 2: Run** — Expected: FAIL (except budget/idle if already satisfied).
- [ ] **Step 3:** Restyle the menu per mockup screen 5 (open 180 ms fade/scale, closes on Escape, outside click, scroll); toast per spec "Toasts" (slide up 8 px + fade, `--t-toast`).
- [ ] **Step 4: Full run** — all checks across Tasks 1–8 PASS; screenshots of every mockup screen's state at 320/420/600 in both themes, compared side by side with `full-draft-v2.html`; list any differences.
- [ ] **Step 5: Real-Chrome handoff checklist** (report to owner, not automated): reload the unpacked extension; open each default app; Alt+Z twice; switch Appearance System/Light/Dark with Chrome in each mode (apps must keep following Chrome); summarize a Wikipedia page; trigger sign-in panel (signed-out Claude); feel of motion (cannot be verified by screenshot).
- [ ] **Step 6: Commit** — `git commit -am "feat(ui): context menu and toasts; redesign complete"`
