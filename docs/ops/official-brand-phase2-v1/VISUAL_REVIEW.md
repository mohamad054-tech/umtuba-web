# Visual review evidence — official brand Phase 2

Local preview: `http://127.0.0.1:3028` (not deployed).

On-page marks now serve the approved high-resolution PNG masters (`brandMarkSrc`). Package SVGs remain in SoT untouched.

| File | Placement |
| --- | --- |
| `screenshots/welcome-desktop-dark.png` | Earlier SVG-served landing (pre-fidelity fix) |
| `screenshots/fidelity/` | SVG-vs-PNG investigation stills |
| `screenshots/support-compact-symbol-dark.png` | Compact symbol on dark support chrome |
| `screenshots/games-header-symbol-compact.png` | Compact symbol in AppTopNav (page title text unchanged) |
| `screenshots/lockup-stacked-light.png` | Exact light stacked master on white |

Auth login preview fail-closed without local AUTH env. AuthShell stacked mark is implemented; not captured in this preview.

Live `/welcome` after rebuild: hero img `logo_stacked_transparent.png` 2400×3000 at 179×224, no CSS filter/clip. Served bytes SHA256-match the disk master.
