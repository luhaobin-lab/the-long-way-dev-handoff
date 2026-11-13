# Painted Valley renderer integration

The visual authority is **Blendi Painted Valley**, following the user's corrected reference. `src/render/ValleyPainter.ts` is the live adapter. It imports the actual MIT source under `src/render/vendor/painted-valley/`; the old Oil Paint adapter is archived outside `src/`.

## Application sequence

```ts
const painter = new ValleyPainter(renderer);
scene.add(painter.createSky().group);
await painter.ready(); // actual original cloud and panoramic mountain GPU bakes
painter.setWorldOrigin(origin.x, origin.z);
// WorldStream supplies same-grid height + road masks through setLandMaps.
const grass = painter.createGroundPaint();
scene.add(grass.group);
// On each frame:
grass.follow(camera.position.x, camera.position.z);
painter.update(camera, seconds);
painter.render(scene, camera);
```

`setLandMaps(height,land,localFirstX,localFirstZ,span,resolution)` expects first/last height samples at `origin` and `origin+span`, with `resolution` samples per axis. Source GLSL was adjusted to that texel-center convention. Land RGBA means asphalt, shoulder, richness and seeded tree shade. The adapter produces the original grass-growth map, broad slope map and tree-shade sampler from it. Map conversions run only on texture/version change.

`paintMesh(mesh,palette,options)` now applies the source cel-paint lighting and part-ID ink to procedural cabin surfaces. The previous options shape is accepted for integration compatibility; raised oil strokes are deliberately absent. Palettes are linear-light triples `{light,mid,shade}` or names from `palettes.ts`. It returns `{strokes,count,dispose}`; `strokes` is an invisible compatibility object and `count` is zero. Call dispose to release its owned material.

`terrainMaterial(kind)` is cached and painter-owned. World chunks dispose their geometries, not these shared materials. `createDabs(samples,kind)` is retained only for existing road-paint call sites and returns fixed, lit surface ribbons. It does not use the retired Oil Paint atlas. Source trees use the exported original `growTree` and tree shader functions directly, instanced by WorldStream.

`configureClimate({hour,seasonPhase,autoTime,dayLengthSeconds,yearLengthDays})`, `setHour(hour)` and `setSeason(nameOrPhase)` control the continuous calendar. `seasonPhase` runs from 0 to 1: spring 0, summer .25, autumn .5, winter .75. Defaults are an 18-minute day and eight game days per year. Daytime uses the actual source's elevation-keyed colors. The simplified solar path, twilight/night palettes, moon/stars and seasons are independently authored extensions. Continuous lighting redraws one source-cloud cubemap strip per frame; explicit changes redraw all faces and await GPU completion. WorldStream refreshes the tree-shadow map after a bounded sun-angle change.

`setBiomeMaps(biome,climate)` accepts same-extent RGBA maps: biome=(primary ID, secondary ID, blend×255, vegetation×255); climate=(coldness,aridity,permanent snow,water influence)×255. Near grass/flowers read these maps. Terrain carries `aBiome=(primary,secondary,blend)` and `aClimate=(coldness,aridity,permanentSnow)` at every near/far vertex. The vertex shader expands categorical IDs into nine weights before interpolation. Trees receive per-instance climate and their evergreen flag. This allows cold regions to retain snow without globally whitening hot desert.

`setVehicleLighting(position,direction,on)` binds the car's world-local headlight position/direction; `on` accepts a boolean or `'auto'`. The shader supplies a soft cone on ground, grass, flowers, trees and painted solid surfaces. This is not a shadow-casting or physically simulated pair of lamp projectors.

`resize()` is a no-op because the original frame fits every render target during render. `dispose()` releases renderer-owned targets, maps and shared materials; streamed geometry/cabin ownership remains with the corresponding systems.

## Actual bounded checks

`GAME_URL=http://127.0.0.1:5173 node scripts/valley-render-smoke-test.mjs` opens a real WebGL2 browser page and writes captures in `artifacts/valley-renderer/`. It is a renderer regression fixture, not a driving or visual acceptance test.

The checked source-backed renderer compiled without shader or runtime errors. A repeated frame at fixed time was byte-identical. A 512 m floating-origin shift with the same absolute view had mean absolute RGB error 0.00688 / 255 and 0.0091% of pixels differed by more than 8 (mostly edge/precision differences). The first test exposed one remaining local-coordinate grass-dab lookup; that was fixed and the test rerun. See `rebase-result.json` and actual images.

Integrated captures `integrated-01.png` and `integrated-02.png` demonstrate gray asphalt and reduced contour-mark strength; the earlier version's roads read too pale and its hill strokes were too repetitive. The source sky, trees and meadow remain the foundation.

`node scripts/climate-test.mjs` records the independently authored climate extension at summer/autumn/winter/spring noon, dawn, sunset and midnight using the actual source tree/grass/sky fixture. `artifacts/climate/climate-browser-report.json` reports zero runtime/shader errors. Its 15-second real-time continuous-light run at 2880 × 1800 measured 60.00 FPS and p95 16.8 ms on M1 Max; this is an isolated fixture, not full-game or sustained-drive evidence. The five pure calendar tests cover elapsed-time conservation, season normalization, solar horizon crossings, complete light-curve finiteness and paused/invalid input handling.

`node scripts/biome-blend-test.mjs` is an actual GPU regression for transition endpoints. Two geometries express the same plains-to-ice contribution, one using collapsed pure-biome pairs as WorldStream does. The old material incorrectly interpolated the numeric biome IDs and produced unrelated color bands. After decoding categorical IDs at vertices, all 3,588 compared RGB samples match exactly; zero runtime/shader errors. The actual before/after images are in `artifacts/biome-blend/`. A short Chrome keyboard acceleration/turn/coast run also loaded and rendered the integrated world without console errors; that bounded check does not establish long-drive quality.

A short **11-second / 129 m** real-time automatic drive at 2880 × 1800 drawing-buffer resolution, Chrome 157 on **ANGLE Metal Apple M1 Max**, measured 60.00 FPS, p95 frame time 16.7 ms and p99 16.8 ms. The renderer submitted 292 calls / 4.34 million triangles at the final sample. These numbers are in `retina-11s.json`; this is not evidence for a longer session or for MacBook M5 Pro. The two console resource errors in that capture were both missing favicon.ico, not shader or game errors.

## Deliberate remaining boundary

The source sky's distant mountains are a fixed angular atmospheric panorama. They do not acquire travel parallax and are not independently regenerated 3D mountains. The road, nearby terrain and foothills are streamed 3D world geometry. Exact visual fidelity, sustained long-drive stability and the requested M5 Pro hardware target require the final integrated evaluation rather than these bounded renderer fixtures.
