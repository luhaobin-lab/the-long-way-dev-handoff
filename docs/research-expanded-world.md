# Expanded road-trip references: source audit

Researched 2026-11-13 before implementing the expanded biome world. These references guide experience and production methods; no proprietary source, unpacked bundle, third-party clone, model, or texture from these games is used.

## The Long Drive

The [official Steam page](https://store.steampowered.com/app/1017180/The_Long_Drive/) describes a randomly generated, almost endless desert, driving freedom, and reachable distant mountains. Its Early Access text also mentions a 5000 km road, but Steam warns that this section may be outdated. It does not establish a current terrain formula, chunk size, biome algorithm, or source-code license.

The developer's [official announcements](https://steamcommunity.com/app/1017180/announcements/) distinguish restarting with the same seed from starting with a new seed. The November 2024 test notes describe seed-related placement fixes, buildings placed beside main roads, side roads, and away from roads, plus terrain/object scale and road-seam fixes. These are useful evidence of deterministic placement and spatial placement rules, not an implementation specification.

**Project application:** generate a fresh default seed for a new journey, retain explicit seed replay, make distant terrain real reachable geometry, and place scenery through deterministic road-relative rules. The specific algorithms below are ours.

## Pacific Drive

In the [Unreal Engine interview with Ironwood's developers](https://www.unrealengine.com/developer-interviews/pacific-drive-is-a-run-based-driving-survival-game-with-an-ever-changing-mysterious-landscape), the team explicitly explains that its run structure avoids continuous open-world streaming and enormous contiguous landscapes. Its first-person vehicle, route planning, environmental contrast, and garage ritual serve the player's attachment to the car. Therefore Pacific Drive is **not evidence for an infinite streaming architecture**.

The [official GDC 2025 session overview by Karl Kohlman and Kendall Wix](https://gdcvault.com/play/1035387/Twisting-Terrain-and-Populating-Forests) describes a Houdini Engine/Unreal production pipeline: refining terrain sculpts, generating landscape layers, controlled biome blending, incorporating road splines while modifying terrain, and scattering foliage using those data. This establishes a useful dependency order. The full proprietary tools and runtime implementation were not obtained or reused.

**Project application:** region identity determines landform, road treatment, vegetation, and landmarks together; road integration edits the surrounding land; transitions blend those data coherently. Preserve one continuous route rather than borrowing Pacific Drive's run boundaries.

## Outbound

The [official Steam page](https://store.steampowered.com/app/2681030/Outbound/) describes a colorful camper-van exploration game with diverse biomes and landmarks. It establishes the experience, not procedural generation internals.

In the [Unity interview with studio founder Tobias Schnackenberg](https://unity.com/blog/square-glade-games-outbound-community-choice-award), the developer explains the mobile-base focus, low-pressure play, limited real-time lighting, strong ambient light, and a consistent palette. The [Epic Games interview with Square Glade's founders](https://store.epicgames.com/news/inside-outbound-with-vanlife-true-believers-researchers-and-cozy-game-dev-square-glade) connects the concept to their real camper trips and community testing. Neither page provides a reusable procedural-world algorithm or an open-source game release.

**Project application:** scenery should invite a relaxed drive, with readable silhouettes, warm vehicle identity, and recognizable landmarks. Keep the user-selected Painted Valley rendering foundation; do not replace it with Outbound's URP pipeline or claim that Outbound is generated using our methods.

## Independent implementation contract

The expanded system will use seeded macro-regions with long smooth transitions. Each region changes terrain morphology, flora, road width, and climate metadata rather than merely tinting the same grass valley. Basins, coast, alpine snow, desert, plains, forest, volcanic land, icefields and towns are project-authored biomes.

The existing continuous route/terrain field and bounded streaming engine remain. New regional elevation targets are smoothed and analytically differentiated so grade stays drivable. Nearby and distant meshes sample the same region-weighted height function. Ocean/lake levels and town lots derive from stable regional anchors. Seasonal and day/night changes alter appearance and atmosphere while leaving geometry and road identity stable.

No exact algorithm for The Long Drive or Outbound was verified. Pacific Drive's documented procedural authoring pipeline is distinct from runtime endless generation. All numerical constants, region ordering, terrain formulas, climate channels, road constraints and acceptance tests in this project are explicitly our own design.
