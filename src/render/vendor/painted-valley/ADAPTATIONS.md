# Painted Valley runtime provenance and adaptations

Original project: https://patch.gg/blendi/painted-valley
Original repository: https://git.patch.gg/blendi/painted-valley.git
Frozen revision: e523a37e6c86df433a960a46702b09776e73a0e2
Code license: MIT, Copyright (c) 2026 Patch. Full LICENSE and LICENCE-NOTES are beside this file.
The unmodified source and SHA-256 module hashes remain in references/painted-valley-original and references/painted-valley-source-manifest.json.

Actual imported source features:

- lib/glsl.js: original meadowGreen/meadowLight, meadowTint, paintGround, contour strokes, fog and cloud/tree shade functions.
- lib/blades.js: original four-ring blade geometry and vertex/fragment shaders.
- lib/frame.js: original scene target, bloom, weighted Kuwahara finish, part-ID ink and final painter tone curve.
- valley/sky.js, clouds.js, backdrop.js: original light keys, sky, sphere-heap cumulus cubemap, baked multi-channel mountain/foothill panorama.
- valley/strokes.js: original procedural surface-paint texture.
- valley/trees.js: original seeded branching generator, leaf spray texture, canopy/core/bark materials, exposed for independent streamed planting.

Changes made in this runtime copy:

1. lib/glsl.js: added uWorldOrigin. extentUv now aligns the project's rolling map's first/last samples with texel centers (source map was centered differently). Spatial noise lookups in gust, cloud shade and meadow paint use absolute coordinates so their identities survive rendering origin shifts. Height texture sampling remains the original explicit bilinear method.
2. lib/blades.js: added optional ringConfig to choose density and geometry scale without changing its shape/shading/fade architecture. Cell seeds use global coordinates. follow subtracts the floating origin and refreshes when the origin changes. All stroke/noise lookups remain global. Rendering quality starts with wider cell spacing than the walking demo because this is a driving camera.
3. valley/trees.js: exported growTree, leafTexture and original shader strings. COMMON imports directly from lib/glsl instead of importing unused interactive-field code. Canopy texture noise uses global coordinates. Planting/streaming is authored separately in src/world/.
4. valley/sky.js: COMMON imports directly from lib/glsl. The original daytime color keys are exported as `sampleDayLight`. `applyClimate` accepts the independently authored calendar/solar direction and twilight/night palettes while retaining the original cloud and backdrop lighting path. Direction-space stars, a moon disk, seasonal backdrop pigments and local desert/volcanic/icefield backdrop pigments are new work.
5. valley/world.js: HERO changed from [0.6,0.8] to [0,-1] so the original sky composition faces the initial road direction. This is a rotation of its composition, not new terrain generation.
6. clouds.js, backdrop.js, frame.js: added explicit dispose methods for owned GPU resources. Clouds additionally expose a bounded refresh queue: continuous light changes redraw one cubemap strip per rendered frame, while explicit hour/season changes draw all faces and await GPU completion. The source's baked sphere-heap cloud shape is retained, with no per-frame screen-space volume raymarch.
7. lib/glsl.js: added a shared climate sampler, seasonal meadow/foliage palettes, local climate snow, deciduous leaf retention, and a soft headlight cone. These are authored project extensions, not original Painted Valley features. `Climate.ts` supplies a continuous four-season calendar and simplified seasonal solar path, preserving source day palettes above the source's lowest authored sun elevation.
8. lib/blades.js and lib/flowers.js: near plants read the streamed biome vegetation/climate maps. Cold/permanent snow reduces grass and flowers; flowers also follow spring/summer weights. Grass and flowers receive the new headlight contribution. No season change rebuilds blade geometry.
9. valley/trees.js: canopy, core and bark shaders accept per-instance `aTreeClimate`; `uEvergreen` separates pines from deciduous crowns. Seasonal pigments, gradual deciduous leaf removal, local snow and headlights are added around the retained source lighting and canopy shading. The world adapter owns planting and evergreen classification.

ValleyPainter.ts is the application adapter. It binds shared source uniforms, creates original sky/frame, converts the road map to source grass growth/shade maps, uses source meadow functions on streamed terrain, and adapts the source wanderer's two-tone/ink approach for the vehicle. Generic source-dab compatibility calls are flat painted road ribbons, not the retired Oil Paint brush atlas. `biomePaint.ts` adds nine original regional ground pigments. Categorical biome pairs are decoded into nine contribution weights in the vertex shader; only those continuous weights are interpolated so no unrelated biome colors appear inside a transition triangle.

The sky panorama is a fixed angular atmospheric painting and has no travel parallax. The foreground/near hills and road are independently streamed 3D geometry. This limitation must be reported rather than described as an infinite geometric mountain range.

No Sonniss recordings, stock characters, proprietary Patch integration helper or unlicensed models are included in the runtime bundle.
