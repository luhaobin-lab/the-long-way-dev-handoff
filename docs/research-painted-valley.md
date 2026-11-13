# Painted Valley source audit — corrected visual authority

The user corrected the visual reference to [Blendi Painted Valley](https://patch.gg/blendi/painted-valley). This supersedes Oil Paint as the final rendering authority. The earlier oil-paint work is retained as historical source provenance and diagnostic evidence, not the approved live art direction.

## Retrieved source and permission

The official page's codeRepository and clone metadata point to `https://git.patch.gg/blendi/painted-valley.git`. That public repository was cloned directly into `references/painted-valley-original`, revision `e523a37e6c86df433a960a46702b09776e73a0e2`. The actual `LICENSE` is MIT, Copyright (c) 2026 Patch. `LICENCE-NOTES.md` identifies valley/lib code as MIT and included generated art as CC0. Source is Three.js 0.186.1 and WebGL2. SHA-256 module manifest is retained separately.

No third-party clone, proprietary bundle or guessed technique was used. Git-LFS JPG pointer files in `shots/` are not pictures and are not visual evidence; comparison uses actual live browser captures from the original demo.

## This reference is a different renderer

Painted Valley intentionally avoids noise at every scale and thick raised strokes everywhere. It uses clean flat color masses, few chosen tones, restrained slope-following grass strokes, rounded leafy crowns, very distant matte-painted mountains, huge cumulus heaps, and a light Kuwahara finish. The original README explicitly includes that finish. Therefore the corrected target should not continue Oil Paint's impasto-card material everywhere.

Source areas read: README, LICENSE, LICENCE-NOTES, `src/valley/main.js`, `world.js`, `sky.js`, `clouds.js`, `backdrop.js`, `trees.js`, `floor.js`, `strokes.js`; `src/lib/index.js`, `glsl.js`, `ground.js`, `blades.js`, `frame.js`. Adaptations below retain their source functions and shaders.

## Exact implementation findings

- `src/lib/glsl.js`: `meadowGreen` and `meadowLight` share the actual grass palette across near blades, ground and distance. `paintGround` uses procedural brush-dab texture near the player and explicitly fades fine detail by roughly 110 m. `landStrokes` follows terrain contours with derivative-aware widths. `heroPaint` uses a fixed original overlook to shape distant dabs; it cannot be naively attached to a moving car without swimming.
- `src/lib/blades.js`: deterministic world-cell grass, four rings of instanced geometry, thinning and widening with distance. Each blade has a random fade threshold. World IDs must remain global when rendering origin is shifted.
- `src/valley/strokes.js`: procedural seamless dab texture made with Canvas2D; it is surface paint detail, not a downloaded asset.
- `src/valley/trees.js`: seeded branching trunks, clumps on an uneven crown, dark inner leaf masses plus a leaf-spray texture. Sprays are oriented around each clump's surface and lit by the clump normal, not arbitrary billboards. Light/yellow-green crowns have blue-green shade. Actual source generator/shaders can be exposed for independently planted streamed trees.
- `src/valley/clouds.js`: cumulus heaps are sphere-based signed distance volumes with billowing 3D noise. Ray marching is performed into a cubemap, then each frame samples that map. Author intentionally keeps clouds still; rebaking changes their light.
- `src/valley/backdrop.js` and `sky.js`: the source's distant land is baked as a panoramic multi-texture painting of light pigment, shade pigment, illumination, haze and cloud bank. Sky mixes those channels with the selected hour. This is an atmospheric backdrop attached to viewing direction, not traversable 3D terrain.
- `src/lib/frame.js`: HDR+MSAA scene target, optional bloom, weighted four-quadrant Kuwahara selection (soft weighting avoids hard switching), alpha-based exclusions, small part-ID ink edges and final painter tone curve/sRGB conversion. Sky and far detail are explicitly allowed to bypass finishing. This pass refines the authored source materials; it is not a substitute for their palette/form.

## Infinite-road adaptation

Keep the existing pure seeded world field, deterministic road/terrain integration, streaming and floating origin. Replace the renderer facade with `ValleyPainter`, preserving mesh/material and map APIs. Bind the original valley's shared-light uniforms, meadow shader functions, procedural strokes, actual tree generator/shaders, cloud bake, backdrop and finish. Keep CPU/GPU road height agreement. Convert the project's road/shoulder map to the source grass growth map and keep texture-grid alignment unchanged across origin shifts.

The original reference is a bounded valley, not an infinite generator. Our near terrain and road remain independently generated. Using the original panoramic mountains as distant scenery is a deliberate limitation: they are a fixed angular atmospheric painting and do not have traversal parallax. Streamed 3D foothills provide nearby land. Do not describe the panorama as infinitely generated geometry.

## License exclusions and evidence limits

The demo's five Sonniss ambient recordings are explicitly absent from the public repository and cannot be redistributed as files. We will not copy them from the live demo. Source-generated sky/clouds/trees need no paid asset. The original character, Rapier and ambientCG assets are not required for our procedural vehicle.

Source reuse and shader compilation do not establish visual fidelity or 60fps. Actual screenshots, camera-motion sequences and hardware-specific performance remain required. The reference author only measured an RTX 4090 at 1080p.

## Primary references

- [Original project and README](https://patch.gg/blendi/painted-valley)
- [Original files](https://patch.gg/blendi/painted-valley/files)
- [License](https://patch.gg/blendi/painted-valley/files/LICENSE)
- [Licence notes](https://patch.gg/blendi/painted-valley/files/LICENCE-NOTES.md)
- [Live original demo](https://01a1cd64361b77aabb85b391ef0c6f09-production.patchusercontent.com/)
