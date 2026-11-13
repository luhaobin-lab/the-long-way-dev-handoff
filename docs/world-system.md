# Infinite road and landscape

`src/world/field.ts` is the authority for route geometry, terrain height, surface classification, and deterministic tree placement. `src/world/stream.ts` turns that field into a bounded Three.js scene. All dimensions are metres; forward travel increases `s` toward negative world Z. `s` is a longitudinal parameter, while the vehicle's odometer integrates actual movement.

## Generation

The road is the graph `(x(s), y(s), -s)`. Four independently seeded, quintic-interpolated noise scales produce broad bends and smaller steering changes. Smoothed regional elevation targets plus two slower noise scales produce elevation. Derivatives are calculated analytically, so the route supplies tangent, normal, grade, curvature and a right-hand lane basis. The strictly monotonic Z coordinate prevents self-intersections by construction. This is an independently written routing strategy, not Slow Roads source code; it trades loops and junctions for reliable endless forward travel.

Terrain is co-designed with this route. A four-iteration closest-point solve supplies the road's cross-section. Lane terrain shares exactly the route's elevation. A low shoulder blends into the surrounding land over 30 m. Beyond it, broad valley-width modulation, rolling hill differences, warped ridgelines and coarse mountain masses create several scales of landscape. The same height function supplies vehicle ground contact, near mesh vertices, distant terrain, grass maps and tree feet.

The field is stateless with respect to load order. Noise and tree identities depend on a world seed and global coordinates, so visiting a location again reconstructs it. JavaScript doubles retain simulation coordinates. Scene positions use a snapped floating origin; the renderer adds that origin back when evaluating fixed world patterns.

The expanded world uses a seeded deck of nine macro-regions: plains, forest, basin, coast, snow mountains, desert, volcano, icefield and town. Region centres are 6.2 km apart, with 1.6 km smooth transitions. The region affects terrain shape, tree density, road width, shoulders, climate and stable landmarks. The road half-width varies between roughly 3 and 4.7 m. Geometry, paint masks and driving contact all use the same `RoadSample.halfWidth`. See `expanded-world-architecture.md` for the rendering metadata contract and the distinction between project-authored algorithms and reference-game evidence.

## Bounded scene

- The near terrain keeps 137 circularly arranged 256 m chunks, each sampled on a 24-cell grid. Chunk edges use the same field samples. A finer ribbon along the road fills the corridor at its exact elevations.
- Road geometry retains 23 sections, each 128 m long. Adjacent sections share their endpoint sample.
- A distant 10.24 km heightfield uses 32 m spacing. Its inner hole overlaps the near terrain; it is lowered by 4 m to keep its coarse triangles under the detailed terrain. This overlap is an explicit approximation that must be inspected visually from new camera angles.
- A further 49.152 km heightfield, centred on a 2.048 km lattice, supplies real distant land to a radius of 24.576 km. Its coarser field is lowered by 16 m and overlaps the nearer field. Both sample the same deterministic terrain and biome data; the farthest field currently requires the worker path.
- A global 768-by-768 height/land lattice follows the vehicle. New coverage snaps to this same lattice rather than resampling a moving coordinate system.
- A module worker generates the height/land maps, crown shadows, and distant geometry and normals. Transferable buffers replace the old complete data atomically. A bounded row fallback handles worker failure.
- The near chunk queue is processed ahead of travel. Retired geometries and road materials are disposed. Shared surface materials and tree prototypes remain owned by their respective adapters.

## Corrected art direction

The live world uses the user-corrected [Painted Valley reference](https://patch.gg/blendi/painted-valley). Its actual `growTree`, leaf-spray texture, crown/core shader and bark shader form three broadleaf archetypes. Two new conifer shapes use the same shader family. These five archetypes are instanced in fifteen draw calls across all loaded groves. Trees occupy seeded clusters with biome-dependent density and open view corridors. Crown shadow ellipses are adapted from the source's bake and rebuilt with the current sun. `world.refreshLighting()` must be awaited after changing the hour.

The earlier Oil Paint experiment is not part of the live renderer. Road markings are flat painted ribbons; they are not thick oil dabs. Ground detail and distant tones come from Painted Valley's restrained meadow rendering.

## Evidence and limits

`npm test` includes seed reconstruction, different-seed variation, route properties over 101 km for each of seven seeds, exact lane-to-ground agreement, continuity at sampled tile edges, and vegetation exclusion. After the expanded-world implementation, all 21 tests passed; the measured worst grade in that numerical set was 4.2435%, and the tightest sampled turn radius was 269.67 m. These are numerical checks, not driving or visual-quality proof.

`node scripts/world-stream-test.mjs` launches real Chrome, regenerates locations at 240, 256, 512, 2048 and 101000 m, captures driver-seat frames, and records resource counters. It is a discontinuous seek test, not a 101 km continuous driving run. The first run preserved 137 terrain chunks and 23 road sections, completed all worker jobs and queues, and kept 34 allocated textures. It also recorded two 404 console errors; see its report rather than interpreting this run as an error-free integration pass. Later full-game reports may supersede that first run.

`npx tsx scripts/biome-visual-test.ts` captured every biome centre in the real Chrome renderer with the `wildflower` seed. `artifacts/biomes-v1/report.json` records nine destinations, cabin and exterior frames, three additional side views, zero browser errors and zero failed HTTP responses. Each settled destination retained 137 terrain chunks and 23 road chunks. This is a discontinuous seek test, not continuous travel or a visual-quality acceptance. The forest frame recorded 2,289 trees and about 7.63 million rendered triangles, so dense forest performance still needs actual real-time measurement.

Finite tests cannot prove every seed or unbounded numerical precision. The current routing remains within a broad north–south corridor, and the coarse/fine terrain overlap needs further camera-angle coverage. Frame-rate claims require the actual browser, hardware, resolution and duration from a real-time report; accelerated stepping and seek timings are not frame-rate measurements.
