# Oil Paint source audit

Retrieved 2026-11-13. Primary source: [Blendi Oil Paint on Patch](https://patch.gg/blendi/oil-paint). The public page explicitly links `https://git.patch.gg/blendi/oil-paint.git` through its SoftwareSourceCode metadata and clone instructions. Cloned that repository, not a third-party clone or minified browser bundle. Frozen revision `804c65fa3a6c6fcdc732ed1bde450fd140cfb4e9`, release 1.1.3 (commit subject: both scenes fill the screen when made fullscreen while loading).

## License and compatibility

The actual repository includes `LICENSE` with MIT License, Copyright (c) 2026 Patch; `LICENCE-NOTES.md` explicitly lists `src/oilpaint/`, `src/world/`, and `src/night/` as MIT code. Demo-generated art and shots are CC0 1.0. Its MakeHuman/Quaternius figure assets are CC0, but our procedural vehicle does not need them. Vendored Rapier is Apache-2.0; that is distinct from the painter modules. `lib/patch-block.js` is a Patch integration helper with its own source statement, so we do not need or ship it in our application.

Original files and notices are retained at `references/oil-paint-original`; SHA-256 of the eight renderer modules is in `references/oil-paint-source-manifest.json`. Shipping adaptations must carry Patch's complete MIT notice.

Actual `package.json`: `three: 0.186.1`, `vite: 8.3.5`, `playwright-core: ^1.64.1`; WebGL2, GLSL3. The painter is not a WebGPU node material. The README explicitly says the renderer owns every material and its render target; it cannot simply filter a finished conventional scene.

## Read source and architecture

- `src/oilpaint/brush.js`: generates a 512 × 512 mipmapped atlas of 8 distinct loaded-bristle marks. R stores thickness, G coverage, B a slowly varying second pigment. Procedural ragged boundaries, dry bristles, raised edges, and start/end asymmetry.
- `src/oilpaint/dabs.js`: four-vertex instanced cards; user-defined GLSL `makeDab` sets world position, 3D stroke direction, size, two pigment colors, persistent seed, and surface mode. Default cards face the eye while their center stays pinned. Ground mode (`lie=1`) lies on a supplied normal and uses a persistent physical lift for overlap ordering. A small projected minimum thickness avoids razor-thin edge-on strokes. Pixel bounds simplify distant marks. Fragment stage samples the atlas and rakes light over height gradients for impasto; this is not a screen-space painter filter.
- `src/oilpaint/common.js`: shared uniforms, texture-based terrain heights and land masks, deterministic hash, directional wind, three palette mixes, hue/value variation, mist and sunward air colors, static depth-map shade, moving shadow glaze. Colors are selected as final paint colors with no normal lighting tone map; renderer output is LinearSRGBColorSpace.
- `src/oilpaint/ground.js`: nested ground grids with deterministic representative descendants. A parent selects one of four children recursively; nonrepresentatives grow in continuously as the camera approaches. Every mark remains the same finest world cell. `follow` moves coverage without moving marks. Fixed depth layers avoid camera-sort crawling. Original ground example has 6 levels × 192² × 3 instances; grass has 4 × 96² × 6.
- `src/oilpaint/pins.js`: area-weighted triangle selection, then selects a triangle vertex for each pin (not barycentric sampling); animated meshes transform pinned positions, normal offsets, and directions each frame. Useful for dense skinned figures. Procedural cabin geometry should instead use the original `src/night/kit.js` scatter method or an adapted barycentric surface sampler to prevent all pins clustering at box corners.
- `src/oilpaint/shade.js`: one static orthographic depth render plus a small per-frame dynamic shadow. Must be adapted for streamed scenery: the original still-world map is baked once and is finite. Distinct static dab-level color selection versus soft per-pixel dynamic glaze avoids flickering as a moving shadow edge crosses marks.
- `src/oilpaint/finish.js`: 4× MSAA world target and depth, optional 22-step sun shafts, subtle canvas weave and varnish. It does not create the brushstrokes; those already exist as world geometry. Disable shafts for the initial open landscape and measure their cost before enabling. Preserve the finish rather than replacing core painting with a filter.
- `src/night/kit.js`: procedural architectural kit with actual underpainting faces and area-scattered, surface-flat strokes along grain, integrated holes and panel courses. Suitable design reference for cabin materials. Original vertices are treated as world positions, so moving vehicle adaptation must explicitly apply a model transform in shader or transform pin buffers.
- `src/world/floor.js`, `src/world/land.js`: read to understand ground and grass integration. Height map is 1025² over a fixed 512 m square, unsuitable unchanged for an infinite road. Terrain CPU physics and GPU sampling share the same map. A low underpainting mesh sits 4 cm below marks.

## Adaptation plan

Retain all eight modules unchanged in source archive and copy the painter implementation into a separately attributed runtime vendor directory. Extend shared height/land sampling for a rolling world map, or feed chunk-local surface samples into the actual original dab shader. Use original atlas, impasto fragment stage, three-pigment shading, pinned mark placement and stable ring/representative concept. Terrain, asphalt, shoulders, leaves, cloud forms and vehicle surfaces need explicit paint families, directions and stroke scales. Do not assume basic MeshStandardMaterial plus final finish is equivalent.

Streaming ownership stays outside the painter: world seed/road coordinates deterministically produce geometry and stroke anchors; unloading disposes associated buffers/materials. Render coordinates must be rebased or kept local at long travel distances, while stable world IDs remain the random seed basis. Avoid view-sorted transparent paint cards.

## Evidence limits

Source inspection establishes implementation and license, not matching appearance, stable 60 fps on MacBook M5 Pro, or temporal stability in our moving vehicle. The README's ~4.5–4.6 ms measurements were made on RTX 4090 at 1080p, and cannot be transferred to this hardware. Our visual and performance claims require browser-rendered screenshots, moving sequences, and measured frame times.

## Primary links

- [Project and README](https://patch.gg/blendi/oil-paint)
- [Files browser](https://patch.gg/blendi/oil-paint/files)
- [License](https://patch.gg/blendi/oil-paint/files/LICENSE)
- [Licence notes](https://patch.gg/blendi/oil-paint/files/LICENCE-NOTES.md)
- [Actual renderer modules](https://patch.gg/blendi/oil-paint/files/src/oilpaint)
- [Live original demo](https://01a1c846540d77d9862c2911c05bbae2-production.patchusercontent.com/)
