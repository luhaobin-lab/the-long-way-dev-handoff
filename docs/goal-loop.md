# Historical delivery plan — user expansion, 2026-11-13

Current authority: `../AI接续开发需求.md`; current handoff status: `HANDOFF_STATUS.md`. This is a historical plan, not an active goal or final acceptance report.

Build one integrated, beautiful, endlessly generated first-person road-trip game in Three.js 0.186.1. Painted Valley is the current art authority. Make a cute, warm original station wagon based on the user's Michael Isaak reference, using actual SUNBURST reference generation followed by actual Blender MCP modelling, then import the complete model into the game. Add continuous full-day/night lighting, spring/summer/autumn/winter, and strongly distinct plains, forest, basin, coast, snowy mountains, desert, volcanic, icefield and town regions.

The prior Oil Paint direction is superseded. The provisional procedural van is not the final requested car.

## Active loops and required concrete outputs

1. **Vehicle identity:** inspect artist references → SUNBURST exterior sheet → SUNBURST interior sheet using same identity → independent consistency critique → exact model feature contract. Preserve actual model IDs and generation receipts.
2. **Blender vehicle:** build in isolated Blender through actual MCP → save `.blend` → render exterior, orthographic and seated interior views → compare to generated sheets → fix proportions and sight lines → export named, movable steering/wheels, full cabin GLB → validate structure and import in browser. No geometry-only success claim.
3. **World:** primary-source research → seeded macroregions and explicit transitions → co-designed roads/heightfield → terrain-specific silhouette/water/vegetation/settlement props → all-region real screenshots → repair unnatural road cuts, visible ends and repetitive patterns.
4. **Time/seasons:** actual source daytime plus documented dawn/night extension → seasonal environmental response by local biome → real screenshots at hour/season extremes and transitions → clear night driving and stable exposure → no blanket snow on hot desert.
5. **Integrated experience:** first-person driving, controls/reset/look, road width/gradient transitions, full car in engine, reference-critical review → extended real-time and accelerated traversal separately → frame-time/memory/temporal reports → refine defects.

## Deliverables

- Runnable `npm install && npm run dev`, production build and usable local preview.
- SUNBURST exterior/interior source images, exact prompts and verified receipts.
- Editable Blender car, GLB, model dimensions/parts manifest and actual Blender/browser comparison frames.
- Primary-source research/licensing, architecture, configurable biomes/climate and source adaptation notes.
- Numerical tests, Playwright drive/capture harness, all-biome/all-season evidence, independent criticism, measured performance with hardware/resolution.
- Explicit remaining limitations. M1 Max tests cannot certify M5 Pro. Static far panoramas cannot be called traversable mountains. Seek tests cannot be called uninterrupted travel.

## Current acceptance status

- Baseline game boots and drives in actual Chrome; Painted Valley source rendering integrated.
- Pure road/vehicle tests pass. Baseline has real screenshots and bounded streaming evidence.
- Baseline visual review rejected blank gauge, excessive ceiling, boxy provisional car and overly uniform terrain marks. These remain tracked until the new vehicle and refined environment are actually captured.
- SUNBURST exterior reference saved. Public model/provenance summary: `assets/vehicle/reference/generation-provenance.json`. First incorrectly parameterized call routed to Flare and is excluded.
- SUNBURST interior reference saved; the complete separate service receipt is not archived in the project. See public provenance summary for evidence limits.
- Dedicated local Blender MCP server on 127.0.0.1:9877 established; no unrelated Blender file loaded.

Keep iterating until these gates pass or a specific external limitation is evidenced. Report visible artifacts during work; do not replace delivery with process narration.
