# SUNBURST vehicle sheet review — modeling constraints

2026-11-13. Inspected actual files `assets/vehicle/reference/wanderer-sunburst-exterior-three-views.png` and `wanderer-sunburst-interior-four-views.png`. This evaluates the generated design, not a completed 3D asset. The primary agent supplied the generation receipt; this critic inspected image content only.

## Keep this identity

- Low elongated family wagon; separate sloping hood, tall open greenhouse, near-vertical rear hatch. Avoid the old tall box camper silhouette.
- Honey ochre body, buttercream roof, warm red-orange hood; deep olive rubber/trim, brushed pale metal bumpers, ivory wheel centers, black tires.
- Broad gently rounded body planes, shallow imperfect curves, restrained age variation. No random high-frequency dents or edge jitter.
- Four side doors with recessed metal handles, black window seals/pillars, substantial rear quarter glazing, outlined wheel arches, horizontal side trim.
- Front: paired rectangular headlights each side, slim amber indicators, broad dark horizontal grille, small original leaf badge, pale bumper and two dark overriders.
- Rear: large clear hatch window with rear wiper, vertically stacked red/amber light groups, hatch handle/plate, bumper overriders and a small exhaust.
- Low roof rack with two longitudinal rails and crossbars; green and orange travel cases, folded red checked blanket, visible tan securing straps. Geometry, not flat cards.
- Interior: warm tan/wood dashboard, two cream circular main gauges in a dark inset binnacle, wood-rim three-spoke pale metal steering wheel and leaf hub.
- Compact radio, restrained vents/buttons, glovebox, manual gear lever, cupholder and green thermos. Map and leaf mug on passenger side below sightline.
- Two softly rounded cream/tan front seats with green/rust check center panels, piping and back pockets; matching rear bench and door cards. Real headrests, handles, armrests and floor depth.
- Thin roof/header framing, clear glass openings, rearview mirror with small pendant. Keep central forward road visibility dominant.

## Contradictions to resolve explicitly

1. **Drawing scale differs from labels.** In the side plate, body length/roof height are approximately mutually scaled, but the illustrated wheelbase and wheel diameters are larger than the stated 2.72 m and 0.64 m would predict. The 4.80 m arrow does not begin at the actual front bumper. Do not trace this sheet as an engineering blueprint. Canonical dimensions: length 4.80 m, body width 1.84 m, ground-to-body-roof height 1.67 m, wheelbase 2.72 m, tire diameter 0.64 m. Roof rack/luggage add height; the drawing's 1.67 m line excludes them. Record any changed dimensions.
2. **Steering side conflict.** The exterior front drawing places the visible wheel on image-left, which implies right-hand drive when facing the car. The interior views consistently show left-hand drive. Lock the final vehicle to LHD and correct the exterior rather than mirroring the cabin accidentally.
3. **Gauge design conflict.** The exterior detail inset suggests a different dark/single prominent dial arrangement; the interior has two cream analog faces. Make the interior sheet the gauge authority. Generated dial marks/numbers are inconsistent: create deliberate, readable real gauge artwork and live needle/readout behavior.
4. **Driver-view camera is not an engineering camera location.** Its steering wheel is far to the left of the frame; it resembles a centered/passenger-side presentation view. Place the actual game camera behind the driver's wheel and above the gauges. Preserve the sheet's open windshield, not its exact illustrated camera.
5. **Orthographic views contain illustrative perspective.** Visible top planes and size relationships are not strict orthographic measurements. Use a documented dimensioned model and render actual orthographic front/side/rear to verify consistency.

## Model gates before runtime acceptance

- Verify wheel centers and ground contact, front/rear overhangs, body dimensions, aperture positions and roof height from the actual Blender object, then show the same asset in front/side/rear views.
- Exterior glazing and interior openings must coincide. Seat, wheel, dashboard and rear bench must fit the same shell; no disconnected interior stage.
- Default camera: roof only a framing strip, instruments fully readable, wheel does not cover speed information, no glass opacity across road. Show actual browser capture at 1440 × 900.
- Free-look: ±50° horizontal and moderate up/down views expose real door/window/seat depth, without camera clipping or missing surfaces.
- Show matching front/rear three-quarter exterior, default driver, side look, and rear cabin captures. Compare major shapes and colors against both sheets; do not call successful export a fidelity pass.
- In motion, front wheels steer, steering wheel responds, gauges update, suspension/camera remain restrained. These are untested by the concept sheets.

Disposition: usable visual direction with the corrections above; not approved as a dimensional blueprint, not a completed-model fidelity pass.
