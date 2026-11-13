# Painted Valley — current visual authority

Updated 2026-11-13 after the user's explicit reference correction. The visual target is [Blendi's Painted Valley](https://patch.gg/blendi/painted-valley), described by the user as the intended Ghibli aesthetic. This replaces Oil Paint as the visual acceptance basis. Thick impasto, world-dab-only rendering, and the absence of a finish pass are no longer requirements. Slow Roads remains the procedural-engineering reference; ETS2 remains the cabin reference.

## What was actually viewed

The public Patch page and its README were read in Chrome. The live [demo](https://01a1cd64361b77aabb85b391ef0c6f09-production.patchusercontent.com/) was run until loading finished, then captured at 1440 × 900 using real Chrome/WebGL. The scene was switched to noon, first person, moved forward for five seconds, then changed to golden hour. No page errors were reported. All four relevant rendered images were opened and visually inspected.

| File under references/visual | State and evidential use |
|---|---|
| painted-valley-default.png | Initial third-person hilltop view; frame composition, canopy, valley and cloud silhouette |
| painted-valley-noon.png | Noon lighting from starting view |
| painted-valley-firstperson.png | First-person eye height; no figure obscuring meadow or horizon |
| painted-valley-meadow.png | Five-second forward walk; nearest meadow, flower groups, tree masses and valley |
| painted-valley-golden.png | Same reached position with golden-hour palette; warm/cool color separation |
| painted-valley-page.png | Page provenance only; embedded demo was still loading, not visual evidence |

Exact URLs, file hashes, and capture metadata are in `references/visual/painted-valley-provenance.json`. `capture-painted-valley-ready.mjs` records the browser capture procedure. These are reference images, not game textures.

The original repository's `shots/*.jpg` were initially Git LFS pointer text rather than images (131 bytes each). They were not treated as viewed screenshots. The real browser captures above are the current visual evidence.

## Observed visual language

The scene reads first as bright summer air and large composed color areas. A saturated green meadow recedes through dark tree lines, lighter rolling hills and pale mountain faces. The sky contains very large piled cloud silhouettes, with white rims and broad cool blue shaded volumes. Cloud details are concentrated on edges and broad internal forms; there is no equal-frequency cloud noise everywhere.

Near grass has explicit long tapered blades and a few separated flower patches. Far grass resolves into continuous painted color rather than a dense field of sharp dots. Tree crowns are rounded masses with a limited family of green tones; the nearest leaves are small angular shapes, while mid-distance crowns group into large light/shade patches. Mountains show angular rock planes and atmospheric color loss, separated from the near hills by a cloud bank. The overall depth order stays very legible.

The village and windmill are warm, sparse landmarks against green. They establish scale and a destination without filling every open area. Houses are not mandatory for this driving game's one-biome brief, but the scenery still needs comparable scale cues, open areas and deliberate focal hierarchy.

The character uses clean cel tones and an outline. It is visibly different from the painted background, confirming that coherent art direction does not mean every object must use identical surface marks. For the camper, clean simplified forms and restrained painted shading are appropriate; chunky oil relief would depart from the corrected target.

## Source facts and independent design decisions

The README says its near landscape, far panorama, cloud treatment and shared palette are authored together; the small Kuwahara finish is part of the source pipeline. Therefore a generic blur or heavy filter over unrelated geometry is insufficient, but rejecting a finish pass merely because it is screen-space would also be incorrect.

The source demo is a bounded valley and reports a single RTX 4090/1080p performance test. It does not establish an infinite-world algorithm or M5 Pro Retina performance. Our highway streaming, terrain integration, moving long-distance horizon behavior, and camper rendering are new work that need their own evidence.

The current project's desired near-ground adaptation is a continuous readable road bordered by rich close grass, then simpler fields and hills. Keep the road slightly quieter than the meadow so it guides the eye without becoming a featureless gray slab. This is a design deduction, not an original Painted Valley rule.

## Current visual failure gates

| Priority | Failure visible in a candidate | Actionable correction |
|---|---|---|
| P1 | Sky reads as flat wash or smooth spheres; clouds have no strong grouped silhouette | Restore the source's piled cloud shapes and restrained white/cool-shade separation |
| P1 | Terrain is generic noisy green lumps, with equally sharp texture at all distances | Reduce high-frequency distant detail, unify meadow/grass palette, separate near/mid/far masses |
| P1 | Trees resemble plastic balls, scattered sticks, or dark blobs without crown structure | Use grouped crown masses, limited tones, and scale-appropriate foliage detail |
| P1 | Horizon ends, mountains slide with camera translation, or distant layers detach from terrain | Verify persistent world placement, scale and haze transitions across long travel |
| P1 | Road looks detached, floats, cuts through slopes, or abruptly ends | Joint road/terrain shaping and real boundary drive tests |
| P1 | Thick Oil Paint relief or confetti strokes dominate the new scene | Remove the superseded impasto treatment; match clean Painted Valley tones and marks |
| P1 | Cabin fills the frame or looks like a flat overlay instead of a seat inside a vehicle | Lower visual mass, maintain off-center eye placement, clear forward corridor and side-window depth |
| P2 | Every field/tree patch has equal density, eliminating scenic pauses | Alternate open meadows, grouped tree edges and distant views; keep the road as leading line |
| P2 | Finish smears dashboard labels, road edges or flowers into unstable blobs | Respect crisp-surface masking, reduce finish radius/strength, inspect moving frames |
| P2 | Frequent grass/trees pop, grass sparkles, or fine texture crawls | Fade or simplify before subpixel detail; inspect boundary and motion sequences |
| P2 | Heavy dark shadows or gray desaturation remove the reference's bright summer atmosphere | Rebalance chosen light/shade colors and atmospheric perspective |

A screenshot can identify these problems but cannot prove they are absent over a whole drive.

## Retained cabin and technical acceptance

The ETS2 official forward and side cabin images already inspected remain valid. The camera should sit behind and above the wheel, off-center in the cabin, with readable instruments beyond the rim, real A-pillars, a side window and door volume. Keep the windshield scenery dominant and the central road/horizon unobstructed. The suggested ≥60% exterior visibility is a project criterion rather than a measured ETS2 law. Avoid large opaque panes, strong reflections, and floating wheel geometry.

Driving stability needs input tests and frame sequences: gradual steering, suspension-related motion below the horizon-lock camera, controlled hill pitch, and no rapid camera shake. Static images do not establish these properties. SCS horizon-lock and smooth re-centering documentation remain relevant and are linked in `research-cabin-and-visual-rubric.md`.

Slow Roads gameplay access was blocked by Cloudflare in this environment. Do not claim a live technical side-by-side match. Use documented original-author methods and our own measured road continuity, grade/curvature bounds, terrain seams, streaming/memory plateau, deterministic seeds and long-route tests. Test hardware here is M1 Max; M5 Pro/Retina 60 fps remains a separate target unless measured there.

## Anonymous review procedure

Capture candidate and reference scenes at the same viewport, comparable noon lighting, ground-level first-person or scenery-only camera, and comparable near/mid/far content. Use anonymous file labels and hide code/material descriptions. For camper comparisons, assess the exterior region independently from cabin composition so the original walker scene is not penalized for lacking a vehicle. Identify concrete defects before revealing provenance. A reviewer already familiar with the reference cannot be fully blind; label this as an anonymous comparison with source familiarity, not an independent double-blind result.

Review a default drive, a valley opening, a tree-lined curve, a crest, side free-look, and external road-terrain inspection. Motion review must include still-camera repetition, gentle turning, forward travel, LOD transition, chunk transition and an extended route. Archive raw frames and state; do not substitute generated mockups for captures.
