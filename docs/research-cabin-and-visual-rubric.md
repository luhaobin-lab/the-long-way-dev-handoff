> SUPERSEDED VISUAL TARGET: The user replaced Oil Paint with Painted Valley. Oil Paint requirements below are historical only and must not be used for acceptance. See `research-painted-valley-visual-rubric.md`. ETS2 cabin evidence and access limitations remain valid.

# Independent visual research and acceptance rubric

Research date: 2026-11-13. Role: visual critic only. No implementation edits or rendering success claims.

## Evidence inspected

- Blendi, [Oil Paint](https://patch.gg/blendi/oil-paint), live public [demo](https://01a1c846540d77d9862c2911c05bbae2-production.patchusercontent.com/). Actual Chrome/WebGL screenshots at 1440 × 900: `references/visual/oil-aurora.png`, `oil-autumn.png`, and `oil-autumn-walk.png`. These were opened and visually inspected, not inferred from README. `capture-oil.mjs` reproduces navigation and captures.
- [ETS2 official Steam page](https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/), official screenshots 3, 34, 39 from its public app details API. Full 1920 × 1080 images inspected: `references/visual/ets2-cabin-3.jpg`, `ets2-cabin-34.jpg`, `ets2-cabin-39.jpg`. Exact URLs and hashes are in `references/visual/provenance.json`.
- SCS [1.44 Open Beta](https://blog.scssoft.com/2022/04/euro-truck-simulator-2-144-open-beta.html) documents an interior camera horizon-lock factor. SCS [1.53 Open Beta](https://blog.scssoft.com/2024/10/euro-truck-simulator-2-153-update-open.html) documents smooth camera re-centering with speed and delay options. These support stabilizing the view while allowing the cabin to move.
- SCS [Iberia gameplay preview](https://blog.scssoft.com/2021/01/iberia-gameplay-preview.html) is an official first-person gameplay footage source; playback access status is recorded separately below.
- [Slow Roads](https://slowroads.io/) returned a Cloudflare verification page in automated Chrome. `references/visual/slowroads-initial.png` records this. It is not a gameplay screenshot. Do not claim an observed side-by-side Slow Roads driving test from this attempt.

## Oil Paint: visible properties, separate from source mechanics

The live autumn scene has visibly thick dabs, irregular edges, fine lengthwise bristle grooves, and raked highlights on raised edges. Trunk dabs predominantly run vertically, foliage strokes follow leaf/branch directions, and ground dabs lie in the surface plane. Large and small strokes coexist; distant foliage is coarser and less contrasted. Shadows retain chromatic variation; neighboring dabs do not merely share one uniformly darkened base color. The aurora scene retains these marks even in dark blue snow shadows.

These observations are consistent with the source README's world-pinned dab system. They do not alone prove temporal stability. Two walking screenshots show view-dependent perspective and coherent material language, but continuous motion/registered frame sequences are still needed to evaluate flicker.

A grassland adaptation need not copy autumn orange or the original forest composition. It must preserve paint as the visible surface: stroke direction, irregular coverage, colored mixtures, relief, and stable placement.

## Cabin: visible properties and design deductions

The official forward cabin screenshot places a large steering wheel in the lower part of the frame, instruments immediately beyond its rim, a substantial dashboard to the right, and a visible left A-pillar and side window. Camera placement is perceptibly behind the wheel, above the instrument cluster, and off the cabin's centerline. Side-look screenshots reveal window depth, door armrest, mirrors, seat, and rear cab volume. This spatial structure is what makes the camera feel seated inside a vehicle.

For this camper, use a smaller and simpler wheel/dashboard while retaining the driver offset, glazing outline, and readable instruments. The forward road and vanishing point must remain unobstructed. The bright exterior is the main visual field. Avoid opaque glass, strong glare, oversized window pillars, an entire flat HUD standing in for the 3D dashboard, or a wheel floating without a column. Suggested visibility threshold (project criterion, not an ETS2 rule): at least 60% of the default image should show the exterior through windows; the central horizon and road lookahead corridor must remain clear.

## Critic protocol

For each iteration, capture fixed seed, distance, camera, viewport, quality setting, and build identifier. Archive state and raw images. Review:

1. Default driver view, left/right free-look, uphill crest and downhill valley, 70 km/h curve, exterior terrain inspection.
2. Near ground / tree / dashboard closeups, middle-distance foliage, mountain horizon, cloud/sky.
3. Static fixed camera repeat, gentle turn, forward movement, near chunk boundary and LOD threshold.
4. Extended travel with road continuity, horizon continuity, memory plateau and frame-time data.

Blind visual review should use anonymous labels and conceal implementation/file names. Match environment subject and apparent scale where possible. Original forest versus new open grassland is only a technique comparison; do not turn composition differences into a renderer score. A reviewer familiar with reference imagery cannot be truly source-blind; disclose this limitation. A separate screenshot-only player test must not receive DOM, source, debug state, road solver, or strategy answers.

## Failure gates and actionable owners

| Gate | Fail condition visible to player | Required evidence / subsystem |
|---|---|---|
| Paint | Smooth plastic surfaces, uniform polygon faces, screen-space smudging, or noise with no directional dabs | Near/mid/far crops; renderer |
| Relief | Marks read as flat dots, giant paper confetti, or alpha cards | Closeups under light; brush thickness and stroke shape |
| Cohesion | Cabin, road, or sky look like conventional Three.js beside painted vegetation | Full cabin and exterior views; material coverage |
| Stability | Strokes crawl when head turns, random dabs respawn, large view-dependent sorting swaps | Frame sequence around a fixed landmark; anchor/depth/LOD |
| Road | Visible gaps, ground penetrating pavement, sharp grade changes, buried shoulders | Multi-seed drive and exterior crest views; routing/terrain integration |
| World | Horizon cutoff, obvious square tiles, repetitive hump waves, trees marching in grids | Long distance + varied locations; world composition/streaming |
| Cabin | Wheel blocks road, view feels roof-mounted, flat dashboard, clipped objects on free look | Default + ±50° look; cabin/camera |
| Driving | Input oscillation, instant yaw, high-frequency roll, camera fully glued to suspension | Real input drive and frame sequence; physics/camera |
| Performance | Claimed 60 fps based only on average or unrelated machine | Hardware identity, viewport/DPR, p50/p95/p99 frame ms and memory over time |

No gate is passed merely because a build compiles or an automated route finishes. Report exact remaining defects and distinguish source reuse, technical functionality, visual resemblance, motion quality, and target-hardware performance.

## Playback and hardware limitations

The official SCS [Iberia gameplay video](https://www.youtube.com/watch?v=Jzsd6m4BHXg) was opened in Chrome. YouTube presented “Sign in to confirm you’re not a bot”; no gameplay was played or analyzed, and this was not bypassed. The cabin findings above are based on the three inspected official screenshots plus SCS camera documentation. Do not claim an observed video-motion comparison.

The implementation test host is reported by the primary agent as Apple M1 Max. Any runtime measurements taken here must identify this host. They cannot certify the requested MacBook M5 Pro / Retina / 60 fps target.
