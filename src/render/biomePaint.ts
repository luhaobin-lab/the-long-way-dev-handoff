/** Authored terrain pigments for the expanded road biomes, lit by the original Painted Valley light model. */
// Class IDs cannot be interpolated: [plains, plains, 0] -> [plains, ice, .1] would
// otherwise pass through unrelated forest/desert/volcano IDs inside one triangle.
// Decode the pair at vertices and interpolate only continuous contribution weights.
export const BIOME_WEIGHTS_VERTEX = /*glsl*/`
out vec3 vBiomeWeights0;out vec3 vBiomeWeights1;out vec3 vBiomeWeights2;
vec3 biomeTriplet(float id, float base) {
  return vec3(1.0)-step(vec3(0.5),abs(vec3(id)-vec3(base,base+1.0,base+2.0)));
}
void writeBiomeWeights(vec3 pair) {
  float t=clamp(pair.z,0.0,1.0);
  vBiomeWeights0=mix(biomeTriplet(pair.x,0.0),biomeTriplet(pair.y,0.0),t);
  vBiomeWeights1=mix(biomeTriplet(pair.x,3.0),biomeTriplet(pair.y,3.0),t);
  vBiomeWeights2=mix(biomeTriplet(pair.x,6.0),biomeTriplet(pair.y,6.0),t);
}
`;
export const BIOME_PAINT = /*glsl*/`
in vec3 vBiomeWeights0;in vec3 vBiomeWeights1;in vec3 vBiomeWeights2;
vec3 biomePigment(float kind, vec3 meadow, float tone, vec3 normal, vec3 world) {
  if (kind < .5) return meadow;
  if (kind < 1.5) return meadow * vec3(.83,.94,.91);
  if (kind < 2.5) return meadow * vec3(.93,1.015,.92);
  if (kind < 3.5) {
    float shore = 1.0 - smoothstep(2.0,10.0,world.y);
    vec3 sand = mix(vec3(.37,.35,.24),vec3(.74,.68,.45),smoothstep(.15,.85,tone));
    return mix(meadow * vec3(1.07,1.0,.87),sand,shore);
  }
  if (kind < 4.5) {
    float rock = 1.0 - smoothstep(.45,.82,normal.y);
    vec3 stone = mix(vec3(.25,.31,.34),vec3(.52,.59,.62),smoothstep(.15,.85,tone));
    return mix(meadow * vec3(.73,.88,.93),stone,rock);
  }
  if (kind < 5.5) {
    vec3 sand = mix(vec3(.42,.255,.13),vec3(.88,.66,.34),smoothstep(.12,.9,tone));
    float broad = texture(tNoiseHi,(world.xz+uWorldOrigin.xz)/420.0).r;
    return sand * mix(vec3(.92,.95,1.03),vec3(1.04,.98,.87),broad);
  }
  if (kind < 6.5) {
    float layers = texture(tStrokes,vec2((world.x+uWorldOrigin.x+world.z+uWorldOrigin.z)/85.0,world.y/35.0)).r;
    return mix(vec3(.065,.075,.085),vec3(.20,.17,.15),smoothstep(.22,.9,tone)) * (.93+.14*layers);
  }
  if (kind < 7.5) return mix(vec3(.39,.61,.72),vec3(.78,.91,.97),smoothstep(.15,.85,tone));
  return meadow * vec3(.94,.96,.86);
}
vec3 blendBiomePigments(vec3 meadow, float tone, vec3 normal, vec3 world) {
  vec3 result=meadow*vBiomeWeights0.x;
  if(vBiomeWeights0.y>0.0)result+=biomePigment(1.0,meadow,tone,normal,world)*vBiomeWeights0.y;
  if(vBiomeWeights0.z>0.0)result+=biomePigment(2.0,meadow,tone,normal,world)*vBiomeWeights0.z;
  if(vBiomeWeights1.x>0.0)result+=biomePigment(3.0,meadow,tone,normal,world)*vBiomeWeights1.x;
  if(vBiomeWeights1.y>0.0)result+=biomePigment(4.0,meadow,tone,normal,world)*vBiomeWeights1.y;
  if(vBiomeWeights1.z>0.0)result+=biomePigment(5.0,meadow,tone,normal,world)*vBiomeWeights1.z;
  if(vBiomeWeights2.x>0.0)result+=biomePigment(6.0,meadow,tone,normal,world)*vBiomeWeights2.x;
  if(vBiomeWeights2.y>0.0)result+=biomePigment(7.0,meadow,tone,normal,world)*vBiomeWeights2.y;
  if(vBiomeWeights2.z>0.0)result+=biomePigment(8.0,meadow,tone,normal,world)*vBiomeWeights2.z;
  return result;
}
`;
