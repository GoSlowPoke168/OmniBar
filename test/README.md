# UI checks

1. Build the Chromium edition with `python3 build.py --browser chromium`. Extract the ZIP into a temporary directory and copy the repo’s `test/` folder into it. From that directory run `python3 -m http.server 8765`.
2. In Playwright, add `test/chrome-stub.js` as an init script, then open `http://localhost:8765/sidebar.html`.
3. Add `test/ui-checks.js` as a script tag and run `await runUiChecks()`; every entry should be `ok: true`.
4. To check the no-flash theme, seed `localStorage['omnibar-theme']` in the init script and emulate the opposite system scheme.
5. Screenshot at widths 320 / 420 / 600 in light and dark and compare with `docs/superpowers/specs/2026-11-19-ui-redesign-mockups/full-draft-v2.html`.
