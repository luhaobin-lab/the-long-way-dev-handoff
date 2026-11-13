# The Long Way — shared architecture

## Current art-direction correction (2026-11-13)

The user explicitly replaced Oil Paint with [Blendi Painted Valley](https://patch.gg/blendi/painted-valley), asking for its Ghibli-inspired animated-film background aesthetic. This correction overrides the original prompt's thick oil/impasto requirements. The active renderer must reuse the actual MIT Painted Valley source: restrained shared meadow palette, clear lit/shade shapes, rounded leaf masses, heaped cumulus, atmospheric mountains and subtle paint finish. **Oil Paint is now research history, not the visual acceptance target.** World generation, roads, cockpit and testing requirements remain active. The renderer implementation section below records the prior interface; it will be rewritten for the final Valley adapter.

Source gate passed on 2026-11-13 before implementation: original MIT Oil Paint repository and all seven renderer modules were inspected, Anslo's original terrain explanation was read, and actual Oil Paint browser frames and official ETS2 cockpit images were inspected. Slow Roads live navigation encountered Cloudflare; no challenge bypass or proprietary source reuse.

## Coordinates and ownership

- Units are metres and seconds. +Y up, +X right/east. Forward is -Z. Longitudinal route parameter `s` grows toward -Z. Heading is `atan2(tangent.x, -tangent.z)`; Three.js vehicle rotation Y is negative heading.
- Simulation uses double precision global coordinates. Rendering subtracts a snapped floating origin `{x,z}`. Stable geometry/paint identities use global coordinates and seed, never load order or camera position.
- `WorldField(seed)` is pure: `roadAt(s)`, `project(x,z)`, `height(x,z)` and terrain metadata. Roads and road-adapted terrain call this same field. Right-hand driving uses positive signed lateral offset, approximately 1.8 m.
- World/roads agent owns `src/world/`, world geometry and tree/rock batches, texture sampling, streaming diagnostics and numerical tests. Rendering agent owns `src/render/`, upstream shader adaptations, palette, sky, grass and ground rings. Primary owns vehicle/simulation/input, UI, integration and browser harness. Independent critic owns reference capture and review only.

## Render contract

`OilPainter(renderer)` owns shared uniforms and the original brush atlas, depth-tested world-space dab material, ground representative hierarchy and final canvas. `paintMesh(mesh,palette,options)` uses fixed barycentric surface anchors transformed by the mesh's world matrix. Static cabin pieces are merged by palette. Movable wheel remains a separate part.

World provides rolling floating-point height/land textures at a fixed global lattice. `setLandMaps(height,land,localLowerX,localLowerZ,span,resolution)` changes coverage but never resamples a fixed global point onto a different lattice. `shared.uWorldOrigin` maps local render coordinates to global identifiers. World generation is scheduled ahead of visible travel; retired buffers and materials must be disposed.

`createDabs(samples,kind)` accepts chunk-local samples and applies a model transform. World root positions chunk groups relative to the floating origin. Terrain underpainting is a low-detail safety surface; actual near and midground detail uses original Oil Paint dabs. Sky/clouds also use strokes. The original finish supplies weave/varnish; it does not generate the painter effect.

## Simulation and diagnostics

Fixed 1/120 s vehicle integration, clamped real-time accumulation, bicycle steering with speed-dependent steering limits, continuous ground contacts and damped pitch/roll/heave. Camera motion is independently limited. Automatic scenic driving is optional and uses the same physics steering/throttle, not camera teleportation.

Query parameters: `seed`, `s`, `test=1`, `autodrive=1`, `quality`. Test-only hooks expose reproducible seek, look, step and metrics. `render_game_to_text` describes current state; `advanceTime(ms)` provides bounded deterministic stepping. Extended accelerated traversal and real-time frame-rate measurement are distinct evidence.

## Evidence gates

1. Seed, height, route curvature/grade, seam and bounded-stream tests.
2. Actual Chrome WebGL2 startup with no shader/runtime errors; keyboard controls, reset, freelook, resize/fullscreen, pause and settings.
3. Fixed seed first-person/exterior screenshots, motion sequences and independent source-anonymized comparison where feasible.
4. Real-time performance with browser/device/pixel ratio recorded; long traversal with bounded GPU resources. Do not call deterministic stepping 60fps or a limited session infinite proof.

The original reference, baseline and refined candidates remain separate artifacts. Remaining discrepancies are reported, not hidden behind feature additions.
