# Expanded world architecture

This design follows the new user scope and the primary-source audit in `research-expanded-world.md`. The live art direction remains Painted Valley. All algorithms and constants below are independent project decisions.

## Macro-regions and reproducibility

Every 6.2 km longitudinal region receives a biome from a seeded shuffled deck of all nine biomes. Each deck shuffles independently; a boundary swap prevents adjacent identical regions. A 1.6 km transition blends adjacent region descriptions with a quintic curve. World-coordinate warping bends environmental boundaries without changing road continuity. Explicit seeds reproduce the same region order, land, road and objects; the app creates a fresh seed when none is supplied.

`WorldField.biomeAt(x,z)` returns primary/secondary IDs, blend, climate and vegetation density. `regionAt(s)` exposes a deterministic regional anchor and feature seed. `findBiome(id, afterS)` supplies reproducible test destinations; it does not teleport normal players automatically.

## Morphology before color

| Biome | Distinct terrain and placement | Road treatment |
| --- | --- | --- |
| Plains | Broad open fields, low rolling hills, scattered groves | Wider relaxed two-lane route |
| Forest | Closer folded hills, dense broadleaf/conifer stands | Narrower bends and shaded sightlines |
| Basin | Low central bowls, raised rims, stable lake anchors | Road follows the dry lip above the basin |
| Coast | One-sided sea, cliffs and coves, actual water geometry | Road above sea level beside the coastal slope |
| Snow mountains | Tall ridgelines, paired peaks and elevated passes | Narrow gradual climb/descent, permanent high snow |
| Desert | Dunes, eroded mesas, cactus and sparse scrub | Open sunlit route with variable shoulders |
| Volcano | Large cones/craters, basalt ground, distant lava channels | Route remains outside scenic crater/lava features |
| Icefield | Low glacial plain, broken blue ice ridges, snowy distant mass | Clear continuous road through the frozen terrain |
| Town | Flattened roadside lots, cottages, shops, lamps and sidewalks | Widens through the settlement, remains one route |

The road remains a monotonic global curve, with broader long-distance wandering and biome-dependent cross-section. Regional target elevations are smoothed across neighbors before interpolation; this bounds grade while allowing mountain passes and coastal descents. Every road ribbon, shoulder, terrain deformation, collision query and paint mask uses `RoadSample.halfWidth`, never an unrelated fixed width.

## Rendering and climate contract

The renderer and world use IDs: 0 plains, 1 forest, 2 basin, 3 coast, 4 snow mountains, 5 desert, 6 volcano, 7 icefield, 8 town.

- Rolling `tBiome` RGBA bytes: primary ID, secondary ID, blend × 255, vegetation × 255. Nearest filtering preserves categorical IDs.
- Rolling `tClimate` RGBA bytes: coldness, aridity, permanent snow and water influence, each × 255.
- Near/far terrain and road geometry carry `aBiome = (primary, secondary, blend)` and `aClimate = (coldness, aridity, permanentSnow)` vertex attributes. Distant terrain never depends on clamped near-map edges.
- Instanced trees carry `aTreeClimate`; conifer materials set `uEvergreen = 1`, broadleaves set it to zero.
- Seasonal snow combines local coldness and permanent snow with the calendar. Desert/coast appearance must not become universally snowy because the global season changed.
- The geometry does not rebuild every frame for seasons or time. Sun-dependent crown shadows refresh asynchronously after a bounded angular change; old valid data stays visible during the bake.

## Milestones and acceptance

1. Pure biome weights, region ordering, route width/grade and transition continuity tests.
2. All nine terrain morphologies in the same bounded stream, with near/far climate attributes and deterministic water anchors.
3. Forest/pines, desert plants, volcanic/ice detail and actual town structures, with road-clearance and bounded-resource checks.
4. Real driver-seat and exterior captures for every biome and several transitions. Record image paths and defects; numerical tests do not establish visual success.
5. Continuous driving across region, road, tile and origin boundaries, plus real-time performance and seasonal/day/night visual checks. Seek tests remain separately labeled.

The existing runnable engine is preserved during each change. Source archives and earlier evidence remain separate from the expanded candidate.
