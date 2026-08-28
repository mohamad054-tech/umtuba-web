# Brand Phase 2 — logo fidelity investigation

Central fail: `/welcome` stacked placement is correct, but the rendered mark does not match the approved Brand Board (star/orbit flatter than the premium master).

## Source assets (untouched)

| File | Size | Visual |
| --- | --- | --- |
| `brand/official-v3/png/logo_stacked_dark.png` | 2400×3000 RGB, 277518 B | Premium 3D tubular gold U, orbit over/behind bars, clear star |
| `brand/official-v3/png/logo_stacked_transparent.png` | 2400×3000 ARGB, 310170 B | Same premium lockup, alpha |
| `brand/official-v3/png/logo_stacked_light.png` | 2400×3000 RGB, 273318 B | Same lockup on white |
| `brand/official-v3/png/symbol_master.png` | 1600×1600 ARGB, 137189 B | Package symbol master (exact file) |
| `brand/official-v3/svg/logo_stacked_dark.svg` | 1800 B, viewBox 1200×1500 | Stroke-only U, simple 8-point star polygon, glow filter |
| `brand/official-v3/svg/symbol_master.svg` | 648 B, viewBox 1024×1024 | Stroke U + simple star polygon |

Public PNG hashes match `brand/official-v3/png` (SHA256 identical). Artwork was not traced, redrawn, or replaced.

## What `/welcome` was displaying

Hero uses `UmtubaBrandMark placement="stacked"` at `h-[min(14rem,42vw)] w-auto`. No object-fit crop, no CSS filter, no clip on the mark. Footer stacked mark is `h-24`.

Phase 2 commit `77c59c3` served the package **SVG** via `brandMarkSrc()`. The live page matched that SVG: flat stroke U, simple star, weak orbit. That is why the approved upper-right star/orbit did not match the Brand Board.

## Root cause

Not CSS clipping of the premium master. The page faithfully rendered the **simplified SVG companion** that ships in V3. The owner-approved visual identity is the **high-resolution PNG** stacked master.

`ROOT_CAUSE = WEB_RENDERING` (wrong master selected for on-page marks). SVG files left unmodified.

## Fix (rendering only)

`brandMarkSrc()` now returns exact PNG masters:

- stacked + dark → `logo_stacked_transparent.png` (gold lockup over dark UI; no baked black box)
- stacked + light → `logo_stacked_light.png`
- symbol → `symbol_master.png`

`UmtubaBrandMark` keeps `object-fit: contain` and `overflow: visible`. Page layout/classes unchanged. No artwork edits.
