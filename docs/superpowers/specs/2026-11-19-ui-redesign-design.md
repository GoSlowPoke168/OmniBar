# OmniBar UI/UX Redesign — Design

Date: 2026-11-19. Branch: `sidebar-features`. Approved mockups: [`2026-11-19-ui-redesign-mockups/`](2026-11-19-ui-redesign-mockups/) (open `full-draft-v2.html` in a browser; the other two files show the options that were chosen from).

## Intent

OmniBar works, but its UI looks unconsidered: the system font at small sizes, dim grey text, a mix of text glyphs and drawn icons, and the two newest features (Summarize page / Ask about page) hidden as tiny unlabeled icons. The owner is about to publish to the Chrome Web Store and wants the whole extension to look deliberate, feel smooth, stay light, and look native inside Chrome's side panel.

## Goals

- One visual system applied to every surface: icon strip, top bar, app frame states, action bar, Settings, add/edit dialog, right-click menu, sign-in panel, blocked panel, loading, toasts, tooltips, edit mode, confirmations.
- Summarize page / Ask about page become obvious, labeled actions.
- Readable text: Geist font, slightly larger sizes, brighter secondary text.
- Light and dark themes, with an Appearance setting.
- Smooth, subtle motion; no flicker, no flash of the wrong theme.
- Stays light: no frameworks, no build step, small asset footprint.

## Non-goals

- No change to feature behavior (sign-in detection, frame bridge, Default Page, Alt+Z toggle, header stripping).
- No change to the icon strip's layout or position; it keeps its current look apart from new icons.
- No custom accent-color picker, onboarding tour, or new features beyond those listed here.
- No new extension permissions.

## Anti-goals (failure even if it "works")

- Anything that looks generic or "AI-made": emoji icons, gradients, shadows on everything, mixed icon sets.
- Anything that makes the sidebar feel heavier or slower: layout-thrashing animations, long transitions, large assets, idle CPU use.
- A flash of the wrong theme or unstyled content when the sidebar opens.
- Looking foreign next to Chrome's own UI.
- Any native, unstyled browser UI left visible (e.g. `confirm()`, default `title` tooltips, default select popup where avoidable).

## Constraints

- Manifest V3 extension page: no remote fonts or scripts; everything ships in the extension folder.
- Plain HTML/CSS/JS in the existing files (`sidebar.html`, `sidebar.css`, `sidebar.js`); no styling library, no React, no npm.
- Typical side panel widths are 320–600 px; every screen must work at 320 px.
- Target Chrome 155+ (owner runs 158).
- Element IDs used by `sidebar.js` may be renamed only if the JS is updated in the same change.
- Geist is SIL OFL 1.1; ship its license file with the font.

## Approaches considered

1. **Restyle the existing files (chosen).** Rewrite `sidebar.css` around theme tokens, add an inline SVG icon sprite, bundle Geist locally, small JS additions. Fits the project, zero dependencies, readable for store review.
2. **Rebuild with a UI framework (React + styling library).** Easier components and theming, but adds a build step and npm toolchain, compiled code for review, and a rewrite of working logic. Rejected by the owner ("not a fan of the React styling library").
3. **Use an off-the-shelf CSS kit** (e.g. a classless or utility CSS file). Fast, but imports someone else's look, which conflicts with "looks native in Chrome" and "nothing generic". Rejected.

## Decisions made with the owner

- **Top bar:** keep it compact with small icon-only buttons; redraw all icons as one consistent set.
- **Summarize / Ask:** move out of the top bar into a bottom **action bar** with two labeled buttons ("Summarize page" primary, "Ask about page" secondary), with a "Page: <title>" line above showing which tab will be used (mockup option A).
- **Font:** Geist.
- **Themes:** light mode added; Settings gets an **Appearance** control: System (default) / Light / Dark. It themes OmniBar only; embedded apps keep following Chrome.
- **Sheets:** Settings and dialogs cover only the content area; the icon strip stays visible (mockups 3–4).
- **Edit mode hint:** the content area shows "Editing apps" with drag/remove/pencil instructions (mockup 7).
- **Edit mode:** keep the existing pencil toggle (no "Done" button); the pencil shows an active state while editing.
- **Settings icon:** a proper toothed gear (not a sun-like icon).
- **Sign-in panel icon:** a clean "sign in" (arrow into door) icon in a soft accent circle; no emoji (mockup option C).
- **Approach:** restyle existing files; choose a good custom look, no styling library.

## Design

### Tokens

Define all colors, radii, sizes and durations as CSS custom properties on `:root`, with a dark and light set. No hard-coded colors elsewhere in the CSS.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#1f1f1f` | `#ffffff` | panel and dialog background |
| `--surface` | `#272727` | `#f3f4f6` | top bar, icon strip, action bar, inputs |
| `--raised` | `#323232` | `#ffffff` | buttons, menus, popovers |
| `--hover` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.05)` | hover fill |
| `--border` | `#3a3a3a` | `#e2e3e7` | dividers, outlines |
| `--text` | `#ececec` | `#1c1c1e` | primary text |
| `--text-2` | `#b4b4b8` | `#55565c` | secondary text, icons at rest |
| `--text-3` | `#8e8e93` | `#8a8b91` | captions, section labels |
| `--accent` | `#5b9cf6` | `#2f6fe4` | primary actions, active states, focus |
| `--on-accent` | `#0d1b2e` | `#ffffff` | text on accent |
| `--accent-soft` | `rgba(91,156,246,.16)` | `rgba(47,111,228,.10)` | active pencil, sign-in icon circle, focus ring |
| `--danger` | `#ff8a80` | `#d93025` | Remove, Reset, error toasts |

Dark values stay close to today's greys (which the owner likes and which sit well next to Chrome's dark side panel); the mockups' slightly different greys are superseded by this table. Other tokens: radius 6 px (small controls), 8 px (buttons, inputs), 12 px (dialogs); spacing steps 4/6/8/12/16/24 px; durations 120 ms (hover/press), 180 ms (open/close), 220 ms (toast).

**Theme switching:** `html[data-theme="light"|"dark"]`; "System" follows `prefers-color-scheme`. The setting themes OmniBar's own UI only *(owner's decision)*: embedded apps must keep following Chrome's mode, so the app iframe is pinned to the system color scheme (e.g. `color-scheme: normal` / not inheriting the forced scheme) and its placeholder background follows the system theme rather than a hard-coded white. The chosen mode is stored in `localStorage` and applied by a small `theme.js` loaded in `<head>` (extension CSP forbids inline scripts), so the correct theme is set before first paint.

### Typography

- Geist variable font, Latin subset, WOFF2, in `fonts/` with `OFL.txt`; fallback `system-ui`.
- Scale: 16 px/700 (dialog and panel titles), 14 px/600 (app name, emphasis), 13.5 px/400 (body, buttons, inputs), 12.5 px/400 (help text), 11 px/600 uppercase +0.07em (section labels).
- Sentence case everywhere ("Export apps", "Reset to defaults", "Add app").
- Every single-line label truncates with an ellipsis (app name, URL chip, page title); multi-line text wraps.

### Icons

- One inline SVG `<symbol>` sprite in `sidebar.html`, 24×24 viewBox, 1.7 px stroke, round caps/joins, `currentColor`. Lucide-style geometry (ISC licensed) is acceptable.
- Set: link, smartphone, monitor, external-link, side-window, refresh, close, sparkles (summarize), message-question (ask), plus, pencil, gear, lock, log-in (sign-in panel), download (export), upload (import), rotate-ccw (reset), check, x-circle (error), trash, chevron-down, shield-off (blocked panel).
- Replace every text glyph icon (↗ ❐ ↺ ✕ ✎ ＋ ⚙) and emoji (🔒 🔑).

### Screens

**Icon strip** — unchanged layout and favicon tiles. Footer buttons: plus, pencil, gear using the new icons at 32 px hit size. Pencil shows `--accent-soft` fill and `--accent` icon while edit mode is on. Edit mode keeps the existing wiggle and red remove badges; badges become 16 px circles with a drawn ×.

**Top bar** — app name (14/600) and URL chip (11.5, `--text-3`, lock icon). Buttons, left to right: copy page URL, mobile/desktop toggle (shows phone or monitor for the current mode, as today), divider, open in new tab, open in side window, refresh, close. 26 px buttons, `--text-2` at rest, `--hover` fill on hover. Summarize and Ask are removed from the top bar.

**Action bar** (new; replaces the two header buttons) — sits under the app frame whenever an app is open. Line 1: "Page: **<active tab title>**" (12 px, ellipsis). Line 2: two equal-width buttons, "Summarize page" (accent, sparkles icon) and "Ask about page" (secondary, message-question icon). The title updates when the user switches tabs or the tab navigates. On non-web pages (new tab, `chrome://`), the title reads "Page: none" and both buttons are disabled with tooltip "Open a regular web page first". Click behavior is unchanged from today.

**App frame states**
- Loading: accent spinner, shown only if loading takes longer than 150 ms (avoids a flash on fast loads).
- Sign-in panel: log-in icon in a 52 px `--accent-soft` circle, title "Sign in to <App>", the existing explanation, numbered steps, primary "Sign in", secondary "Refresh", and the existing small "Or open <App> in a new tab…" note. Text unchanged from today.
- Blocked panel ("Site blocked embedding"): same layout as the sign-in panel with a shield-off icon; primary "Open in new tab", secondary "Open in side window".
- Empty state (no app open): centered `--text-3` hint "Choose an app on the right to open it here."; if the user has no apps, the hint reads "Add an app with + to get started." *(Builder's-call-level addition; see below.)*
- Edit mode (entering it already closes the open app): the content area shows a centered title "Editing apps" (14/600) and "Drag icons to reorder. Tap × to remove. Click the pencil again when finished." (12.5, `--text-2`), per mockup 7. This replaces the empty-state hint while edit mode is on.

**Sheets (Settings, add/edit app, reset confirmation)** — per mockups 3 and 4, a sheet and its dim layer cover only the content area (everything left of the icon strip), even when no app is open; the strip stays visible and interactive. While a sheet is open, its opener (gear or plus) shows the active state (`--accent` icon). Strip behavior while a sheet is open *(Claude's call)*: clicking the opener again closes the sheet; clicking an app icon or the pencil closes the sheet first, then does its normal action.

**Settings** — title "Settings" + close. Sections, each with an 11 px uppercase label:
1. Appearance — segmented control System / Light / Dark.
2. Default page — select + help line "Opens automatically when the sidebar opens."
3. Apps — Export apps (download icon), Import apps (upload icon), Reset to defaults (danger, rotate icon).
4. Shortcut — the actual bound shortcut as `<kbd>` keys (read via `chrome.commands.getAll`, falling back to "Not set") + "opens / closes the sidebar" + "Change" link (opens the browser shortcuts page as today).
5. Footer line: "OmniBar <version>" from `chrome.runtime.getManifest()`.
The old "How to use" section is removed; its content moves into tooltips (below). The old "About: Web App Sidebar" label is removed.

**Reset confirmation** — replace `confirm()` with an OmniBar-styled dialog: title "Reset to defaults?", body "Your apps and their order will be replaced with the default list. This can't be undone.", buttons "Cancel" and "Reset" (danger).

**Add / edit app dialog** — title "Add app" or "Edit app"; fields "Name" and "Web address" with help "You can leave out https://"; buttons "Cancel" and "Add app" / "Save". The primary button is disabled until both fields have text; Enter submits; Escape cancels. Inputs show a 3 px `--accent-soft` focus ring.

**Right-click menu** — items with leading icons: Open in new tab, Open in side window, Sign in…, separator, Edit, Remove (danger). Kept inside the panel bounds (existing logic). Closes on Escape, outside click, or scroll.

**Toasts** — small pill, bottom-center above the action bar; inverted colors (`--text` background, `--bg` text); check icon for success, x-circle (danger color) for errors; visible 2.5 s.

**Tooltips** — one OmniBar tooltip style for app icons, top-bar buttons, strip footer buttons and disabled action buttons; replaces native `title` tooltips. 400 ms show delay, 120 ms fade, never clipped by the panel edge. Footer tooltips carry the old "How to use" hints: "Add app", "Edit apps — drag to reorder, × to remove", "Settings"; app icons: "<Name> — right-click for more".

**Focus and selection** — `:focus-visible` shows a 2 px accent outline (offset 2 px) on every interactive element; text selection uses `--accent-soft`. Scrollbars (strip, Settings) are thin and use `--border`.

### Motion

Subtle end of the range (this is a tool the user lives in).
- Hover/press: background and color over 120 ms ease-out; press scales buttons to 0.97.
- Dialogs, Settings, menu: fade + scale from 0.98 over 180 ms ease-out; overlay fades over 180 ms. Closing is 120 ms.
- Toast: slide up 8 px + fade over 220 ms.
- Only `opacity` and `transform` animate; no animating width, height, top or left.
- `prefers-reduced-motion: reduce` turns off scale/slide and the edit-mode wiggle (fades remain, shortened).

### Performance budget ("light")

- Added assets ≤ 100 KB total (font WOFF2 + sprite); no new JS files beyond an optional tiny `theme.js`.
- No timers or animations running while idle, except the edit-mode wiggle while edit mode is on.
- Page-title updates come from tab events, not polling.

## Left to the builder

- Exact Lucide-derived paths for each icon, and the Geist subset tooling.
- Whether to use Chrome's customizable `<select>` (`appearance: base-select`) for the Default page dropdown or a small custom listbox; either must match the tokens in both themes.
- Tooltip implementation (single positioned element vs CSS) as long as it never clips.
- How to verify visually: e.g. a local harness page that loads `sidebar.html` with a stubbed `chrome` object and screenshots each screen and state at 320 / 420 / 600 px in both themes, compared against the mockups.
- The empty-state hint (marked above) is a design addition by Claude, not something the owner asked for; keep it unless the owner objects.
