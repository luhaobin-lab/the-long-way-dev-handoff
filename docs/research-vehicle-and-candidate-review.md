# Vehicle reference and current candidate review

Date: 2026-11-13. Independent visual critic. This is an image-based assessment, not a model or runtime validation.

## Vehicle reference actually inspected

The supplied [Michael Isaak portfolio page](https://michaelisaak.com/the-mitchells-vs-the-machines) was opened, its embedded image URLs obtained, and only the five car-related plates downloaded. All five were opened and visually inspected. Source URLs, dimensions and SHA-256 are preserved in `references/vehicle/provenance.json`. The CDN served WebP bytes from `.jpg` URLs; equivalent PNG files were made without cropping or repainting for tool compatibility.

| Reference file | What it establishes |
|---|---|
| `references/vehicle/car01.png` | Hero exterior: long low ochre wagon, large glazed cabin, narrow pillars, roof rack, hood, wheel arches, metal trim and restrained age marks |
| `references/vehicle/car03.png` | Front cabin: broad horizontal instrument cluster, wheel/rim, ventilation, radio, door pockets, floor, seat edges and restrained trip belongings |
| `references/vehicle/car05.png` | Cabin rearward continuity: front seat backs, upholstery, rear door structure, handles, window and storage pockets |
| `references/vehicle/car08.png` | Multiple exterior angles of the same recognizable car, useful for checking greenhouse/body/axle consistency |
| `references/vehicle/car33f.png` | Artist's shape drawovers: large deliberate age-related deformation, controlled line weight and less high-frequency wiggle |

The portfolio page supplies visual references, not a licensed production asset pack. The new vehicle should be an original cute/cozy adaptation in the Painted Valley scene, with its own shapes, details and identity. Do not ship the reference images as model textures or copy film-specific marks as vehicle branding.

## Relevant visual deductions

The reference's character comes from a low, elongated body under an unusually open glass cabin, a warm material palette, tactile upholstery, and selective signs of use. It is not a tall unbroken camper box. Its large windows reveal the same interior from outside; the cabin belongs to the body rather than being a separate stage. The silhouette remains simple even with substantial detail.

The front-cabin illustration is a design plate looking downward from farther back than a driver's eye. It is useful for the layout and materials, not a correct driving camera by itself. In the game, the driver must see the road, with instruments readable below the normal forward sightline. The reference's clutter should be reduced and secured to the passenger-side/peripheral zones; it must not obstruct the central road corridor.

The source drawovers favor long, motivated curves and a few dents over random edge jitter. A soft/charming interpretation should retain this discipline. Uniform wobbly edges, dense dirt masks, or a noise shader on every part will not supply the intended character.

## Vehicle acceptance gates

These are project criteria, not measurements claimed from the film.

1. **One consistent design across reference views.** Front, side and rear orthographic sheets must agree on body length/width/height relationships, wheel centers and diameter, hood length, windshield rake, window segmentation, roof rack, door arrangement and trim. Multi-view generation is not automatically consistent; inspect it before modeling. Record the chosen dimensions and any intentional deviation.
2. **One consistent 3D vehicle inside and outside.** Exterior windows must coincide with interior openings; dashboard must fit below the windshield, seats must fit within body width and rear cabin depth, and the steering column must terminate in believable structure. Through exterior glazing, the visible dashboard/seat position should agree with interior captures. Rear-seat and side-look views must not reveal missing shell, disconnected panels or objects extending through bodywork.
3. **Readable default driver view.** Eye position must align with the driver seat and steering wheel. The wheel/rim must not cover speed readings at neutral steering or normal ±90-degree wheel animation. The speed readout must be legible at 1440 × 900 and at the intended Retina scale. Gauge numbers/ticks must not vanish under paint/outline passes. The forward road and horizon corridor must remain unobstructed.
4. **Roof and pillar restraint.** The roof should frame the view rather than consume a large blank region. Target only a narrow roof/header band in the normal forward camera; avoid the current nearly quarter-frame blank roof. A-pillars and mirrors stay toward peripheral vision, with no large placeholder plates hiding the landscape. Verify ±50-degree horizontal look and modest upward/downward look without camera clipping.
5. **Tactile but calm interior.** Rounded seat bolsters, seams, door handles, a glove compartment, vents and restrained travel objects create warmth. Primary shapes must survive at gameplay distance. Use material families coherently: painted metal, warm upholstery, quiet trim. Avoid flat disconnected rectangles and excessive hard black outlines on every edge.
6. **Recognizable exterior.** Hood, cabin greenhouse, side doors, four wheels/arches, front/rear light groups, bumpers and rear opening must read from front/side/rear and three-quarter views. The body should have designed curvature and silhouette transitions. A color-blocked rectangular box with accessories is insufficient.
7. **Actual integration evidence.** Inspect Blender model renders and the exported asset in the real Three.js renderer. Source modeling or a beautiful concept sheet alone is not final evidence. Show default cabin, side glance, rear cabin, front and rear three-quarter exterior, plus an animated steering frame pair and a hill-driving sequence. Report image/model disagreements rather than calling generation or successful export a fidelity pass.
8. **Motion and nighttime usability.** Seat-relative camera motion must be restrained. At night the speedometer must remain readable, while cabin highlights should not block the windshield view. Seasonal or biome changes must preserve the cabin's material identity. These remain untested until implemented and captured.

## Review of current real candidate captures

Inspected images:
- `artifacts/valley-v1/01-driver-seat.png` (2160 × 1350)
- `artifacts/valley-v1/04-exterior.png` (2160 × 1350)
- `artifacts/valley-renderer/integrated-02.png` (1440 × 900)

Compared visually against `references/visual/painted-valley-firstperson.png` and `painted-valley-meadow.png`. This comparison is not blind: filenames and source identity were known. Static captures cannot establish road continuity, vehicle handling, temporal stability or frame rate.

### P1 — instrument cluster is unreadable / absent

The binnacle behind the steering wheel is a blank dark rectangle in both driver captures. There is no visible speed value, needle or dial. The steering wheel is recognizable, but the requested basic driving instrument is not usable. Restore gauge rendering and test contrast, geometry placement and alpha/finish handling in the final browser frame. Include stationary and moving speeds, not just a texture export.

### P1 — roof and dashboard greatly narrow the scenery window

The central roof consumes roughly the upper quarter of the frame, and the dashboard/wheel occupy a large lower region. The result feels like looking through a horizontal band despite the wide scenery outside. This undermines the current landscape's strongest asset, its cloud and mountain view. Rework roof/header geometry and driver eye placement together with the new vehicle. Do not solve it solely by widening FOV and distorting the cabin. Recheck the default frame and hill crests.

### P1 — exterior vehicle is still a blockout

The rear exterior capture shows a large blank rectangular wall with a low color band, small wheels and a simple roof block. Rear windows, tail lights, rear opening and shaped body volume are missing. It does not meet the new vehicle reference's low, airy, characterful silhouette. The planned coherent Blender vehicle is necessary; adding more props to the current box would not address the primary proportion problem.

### P2 — mirrors visibly read as placeholders

Both mirrors in the forward captures are opaque gray rectangles. This is especially conspicuous because their rigid long arms draw the eye. Either provide a purposeful, subtle mirror treatment appropriate to the final camera or reduce their visual weight until actual rear visibility is implemented. Do not describe them as working mirrors based on their presence.

### P2 — hills display long repeated directional bands

The right hillside and parts of the left slope have long nearly parallel bright green streaks at large scale. These read as stretched procedural stripes instead of Painted Valley's composed masses. Reduce the uniform streak frequency/contrast, break direction in broad landform-related patches and make distant slopes quieter. Keep some local direction to imply terrain, but do not fill the entire hill with equal elongated marks.

### P2 — vegetation distribution lacks compositional hierarchy

The visible slopes use many similarly sized, fairly evenly dispersed trees; the near field has dense uniform grass. Compared to the reference, the scene lacks enough grouped groves, sparse clearings, clustered flowers and calm open patches. Vary density in broad coherent regions, mix crown size within groves, and reserve clean sightlines for the road and view reveals. More total trees or grass alone will not fix this.

### P2 — road shoulders are overly bright and uniform

The earlier capture's very pale road blends with cream shoulders. The integrated-02 darker pavement improves road readability, but both edges still form an equally bright constant-width ribbon. Muted shoulder coloring, soft vegetation transition and occasional restrained gravel/earth variation would help the road sit in the meadow. Keep the lane edges readable and avoid new speckle at distance.

### What is visibly progressing

The sky has the intended broad white/cool-blue cloud masses, the landscape uses bright summer greens and atmospheric distant layers, and the current road is clearly legible in integrated-02. These are visible improvements in direction, not acceptance of the entire world. The two later images differ in resolution and potentially state, so no numerical quality or performance comparison is claimed.

## Next review needed

Review the generated vehicle sheets for mutual consistency before detailed modeling. Then review actual final-model cabin and exterior frames, including gauges and roof clearance. After the requested season/day-night/multi-biome work, independently inspect the same fixed road locations at transitions, low sun and night; those systems have no evidence in the three current captures and remain pending.
