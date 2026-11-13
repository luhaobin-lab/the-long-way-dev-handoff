# Slow Roads: source research and independent implementation boundary

Research date: 2026-11-13. Reference: [official playable web edition](https://slowroads.io/).

## Evidence and reuse decision

The official site identifies Anslo as the developer and displays a CC BY-NC-ND 4.0 notice. Its current FAQ includes an open-source question. No original source release with a license suitable for adapting the game was established during this investigation. **No Slow Roads browser bundle, third-party clone, asset, or application code is incorporated in this project.** Public technical explanations and observable behavior inform an independent implementation.

[Topograph's official press page](https://topograph.io/slowroads) identifies JavaScript, SvelteKit, and Three.js/WebGL, and emphasizes a custom procedural engine. [The official itch.io page](https://topographinteractive.itch.io/slow-roads) confirms endlessly generated routes, configurable seeds, and optional autodrive. These statements establish advertised behavior, not an exact algorithm or performance guarantee.

## Documented methods: original v1, not a claim about current v2

Primary technical source: [Anslo, “Slow Roads: tl;dr,” 22 October 2022](https://anslo.medium.com/slow-roads-tl-dr-a664ac6bce40).

The article describes a modified noise heightmap seeded through Alea. Road routing tests cross-slope and forward slope, advancing a non-self-intersecting midline in 10 m steps. Elevation receives nine-point smoothing; nearby segments are refined with quadratic curves at 1 m spacing. The implementation uses coarse far terrain plus denser grids along the road, with heights blended toward the road profile. Road geometry cycles through bounded 100 m sections. Vegetation uses sprites and instanced geometry. Geometry merging, object reuse, ahead-of-car generation, and restricted quality settings reduce work. Physics resolves wheel contacts separately, with simple distance-based wall collision. These details describe the original version; the author subsequently rewrote the engine, so current internal algorithms remain unverified.

## Proposed independent architecture

The following are design decisions for this project, not facts claimed about Slow Roads:

1. Keep the complete world reproducible from a seed plus world coordinates. Do not advance a mutable random generator when a chunk loads; load order must not change terrain or vegetation.
2. Represent one road as a smooth monotonic longitudinal curve. Limit derivative and curvature analytically. This guarantees no self-intersection and unrestricted forward travel, at the cost of not supporting loops or junctions.
3. Design the road elevation and the landscape together. Sample the same road profile in the road surface and terrain function. Flatten the road's immediate cross-section, then smoothly transition through a shoulder into the natural landscape. Do not simply drape a mesh onto unrelated terrain.
4. Use several spatial scales: broad valley composition, side ridges, rolling hill masses, and restrained local detail. Smoothly alternate open valley and enclosed roadside compositions over long distances. Keep mountains in the world coordinate system rather than attaching a static skyline to the camera.
5. Stream bounded chunk sets around the vehicle. Use exact shared border samples, world-coordinate vegetation seeds, level-dependent sampling, and skirts or shared coarse boundaries where tessellation levels meet.
6. Generate ahead of visibility; prioritize the route corridor. Dispose or reuse retired GPU geometries. Maintain diagnostic counters for chunks, vertices, draw calls, pending work, and frame-time percentiles.
7. Validate numerical continuity at boundaries and at large route distances, then separately inspect real rendered captures for visible cracks, repeated silhouettes, road burial, horizon changes, and motion instability. Numerical invariants alone do not establish visual quality.

## Explicit unknowns and comparison limits

- No current-v2 source implementation or source reuse permission was established.
- The precise current-v2 terrain formula, routing search/backtracking, seam treatment, LOD transition rules, worker scheduling, and memory budget are unknown.
- The 2022 article is useful architectural evidence, not proof that reproducing its outline reproduces the author's current engineering quality.
- Any target of 60 fps on an M5 Pro must be supported by measurements on that hardware; other machines and accelerated simulation tests cannot prove it.
- Observing short sequences cannot prove infinite-world correctness. Long-run and adversarial boundary tests must be reported with their actual distance, seeds, browser, resolution, and limitations.

## Direct browser observation attempt

A normal Chrome Playwright navigation to the official playable site on 2026-11-13 reached a Cloudflare “Performing security verification” page. The check was not bypassed. Therefore this research pass establishes the official pages and the author's technical explanation, but does not claim a successful live driving session or measured frame comparison against the current official game. The independent project must keep that reference-comparison limitation explicit.
