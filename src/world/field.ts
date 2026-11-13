import { clamp, hash, mix, noise1, noise1D, noise2, seedHash, smooth } from './noise';
import { BiomeSystem, BIOMES, REGION_LENGTH, type BiomeName, type BiomeSample, type Region } from './biomes';

export interface Vec3 { x: number; y: number; z: number }
export interface RoadSample {
  s: number; position: Vec3; tangent: Vec3; right: Vec3; normal: Vec3;
  heading: number; grade: number; curvature: number; halfWidth: number; shoulderWidth:number;
}
export interface RoadProjection extends RoadSample { lateral: number; distance: number }
export interface TerrainInfo { height: number; richness: number; shoulder: number; asphalt: number; openness: number; slope: number }
export interface TreeSpec { x: number; y: number; z: number; radius: number; height: number; crown: number; seed: number; kind: number; climate:[number,number,number] }
export const ROAD_HALF_WIDTH = 3.8;
export const SHOULDER_WIDTH = 1.65;

/**
 * Independent, road-and-landscape co-designed field, informed by Anslo's public v1 writeup.
 * s grows toward -Z. Road projection is analytic; terrain blending queries that same route.
 * The road is a graph x(s), z=-s: it cannot self-intersect, even after arbitrarily many chunks.
 * No previous chunk is needed to reconstruct a location. Longitudinal s is not odometer distance.
 */
export class WorldField {
  readonly seed: number;
  readonly seedName: string;
  private readonly phase: number;
  readonly biomes:BiomeSystem;
  private readonly rowCache=new Map<number,{center:RoadSample;hillCenter:number}>();
  constructor(seed: string | number = 'wildflower') {
    this.seedName = String(seed); this.seed = seedHash(seed); this.phase = hash(17, 53, this.seed) * 200; this.biomes=new BiomeSystem(this.seed);
  }
  private routeX(s: number): [number, number, number] {
    const layers = [[580, 8000, 7], [240, 2100, 11], [98, 760, 29], [22, 320, 47]];
    let x = 0, d = 0, dd = 0;
    for (const [a, scale, salt] of layers) {
      const n = noise1D(s / scale + this.phase + salt * .37, this.seed ^ salt);
      x += a * n[0]; d += a * n[1] / scale; dd += a * n[2] / (scale * scale);
    }
    return [x, d, dd];
  }
  private routeY(s: number): [number, number] {
    const regional=this.biomes.elevation(s),a=noise1D(s/2600+this.phase,this.seed^131),b=noise1D(s/950+this.phase+13.27,this.seed^257);
    return[regional[0]+4*a[0]+5*b[0],regional[1]+4*a[1]/2600+5*b[1]/950];
  }
  roadAt(s: number): RoadSample {
    const [x, dx, ddx] = this.routeX(s), [y, dy] = this.routeY(s), planar = Math.hypot(dx, 1), len = Math.hypot(dx, dy, 1);
    const right = { x: 1 / planar, y: 0, z: dx / planar };
    const tangent = { x: dx / len, y: dy / len, z: -1 / len };
    // right cross tangent points upward.
    const normal = { x: -right.z * tangent.y, y: right.z * tangent.x - right.x * tangent.z, z: right.x * tangent.y };
    return { s, position: { x, y, z: -s }, tangent, right, normal, heading: Math.atan2(dx, 1), grade: dy / planar, curvature: ddx / (planar * planar * planar), halfWidth: this.biomes.roadWidth(s),shoulderWidth:this.biomes.shoulder(s) };
  }
  /** Closest point in the XZ plane. Newton solve starts at the monotonic world-Z parameter. */
  project(x: number, z: number): RoadProjection {
    let s = -z;
    for (let k = 0; k < 4; k++) {
      const [cx, dx, ddx] = this.routeX(s), f = (cx - x) * dx + (s + z), df = 1 + dx * dx + (cx - x) * ddx;
      s -= clamp(f / Math.max(.35, df), -110, 110);
    }
    const road = this.roadAt(s), ax = x - road.position.x, az = z - road.position.z;
    const lateral = ax * road.right.x + az * road.right.z;
    return { ...road, lateral, distance: Math.hypot(ax, az) };
  }
  biomeAt(x:number,z:number):BiomeSample{return this.biomes.at(x,z);}
  regionAt(s:number):Region{return this.biomes.region(Math.round(s/REGION_LENGTH));}
  findBiome(name:BiomeName,afterS=0):Region{return this.biomes.find(name,afterS);}
  openness(s: number): number {
    const b=this.biomes.atS(s),values=[.95,.12,.85,.9,.45,.99,.8,.98,.62];
    return clamp(mix(values[b.primary],values[b.secondary],b.mix)+noise1(s/2300+this.phase+61.29,this.seed^919)*.15);
  }
  private row(z:number):{center:RoadSample;hillCenter:number}{
    const hit=this.rowCache.get(z);if(hit)return hit;
    const center=this.roadAt(-z),hillCenter=noise2(center.position.x/310,z/420,this.seed^61)*16+noise2(center.position.x/105+19,z/180-28,this.seed^73)*4.5;
    const value={center,hillCenter};if(this.rowCache.size>=32)this.rowCache.clear();this.rowCache.set(z,value);return value;
  }
  /** Stable regional landmark anchors. These never follow the camera or depend on load order. */
  feature(region:Region):{x:number;z:number;water:number;radius:number;length:number}{
    const at=this.roadAt(region.centerS+(region.id===6?1450:0)),offset=region.id===6?1050:region.id===2?350:900;
    return{x:at.position.x+at.right.x*offset*region.side,z:at.position.z+at.right.z*offset*region.side,water:at.position.y-19,radius:region.id===2?270:1550,length:region.id===2?1050:1550};
  }
  private terrainShape(id:number,region:Region,x:number,z:number,center:RoadSample,d:number,hill:number):number{
    const abs=Math.abs(d),large=noise2(x/810+1.4,z/950-9.8,this.seed^71),ridge=1-Math.abs(noise2(x/430+37.7,z/610+11.6,this.seed^47));
    const base=center.position.y;
    if(id===0)return base+hill*.65+smooth(650,1450,abs)*(70+100*(large+1));
    if(id===1)return base+hill*1.6+smooth(180,1050,abs)*(100+180*(large+1)+80*ridge);
    if(id===2){
      const f=this.feature(region),lake=Math.hypot((x-f.x)/f.radius,(z-f.z)/f.length),bowl=-17*smooth(55,170,abs)+smooth(350,1250,abs)*(220+170*(large+1));
      const natural=base+hill*.5+bowl;return mix(natural,Math.min(natural,f.water-13+lake*lake*4),1-smooth(.72,1.25,lake));
    }
    if(id===3){
      const inland=d*region.side,coast=base+hill*.8+smooth(90,1100,inland)*(110+240*(large+1));
      return mix(coast,-13+noise2(x/180,z/240,this.seed^119)*3,smooth(28,175,-inland));
    }
    if(id===4){
      const serrated=Math.pow(clamp(ridge),2.4),peaks=380+560*serrated+240*(large+1);
      return base+hill*1.2+smooth(95,1250,abs)*peaks+noise2(x/95,z/130,this.seed^113)*12*smooth(90,500,abs);
    }
    if(id===5){
      const dune=noise2(x/190+21,z/370-37,this.seed^227)*22+Math.sin(x/82+noise2(x/430,z/530,this.seed^229)*3)*5;
      const mesa=smooth(.25,.62,noise2(x/700+51,z/890-7,this.seed^233))*smooth(280,900,abs)*(100+120*(large+1));
      return base+dune+mesa;
    }
    if(id===6){
      const f=this.feature(region),r=Math.hypot(x-f.x,z-f.z),cone=Math.pow(Math.max(0,1-r/1800),1.75)*1280,crater=Math.exp(-r*r/(190*190))*440;
      const foot=Math.hypot(center.position.x-f.x,z-f.z),reference=Math.pow(Math.max(0,1-foot/1800),1.75)*1280-Math.exp(-foot*foot/(190*190))*440;
      return base+cone-crater-reference*.45+hill*.6+smooth(90,850,abs)*ridge*85;
    }
    if(id===7){
      const ice=noise2(x/420,z/570,this.seed^311)*5+Math.pow(Math.max(0,noise2(x/160+27,z/350-51,this.seed^313)),3)*23;
      return base+ice+smooth(700,1900,abs)*(160+480*ridge*ridge);
    }
    return base+hill*.15+smooth(650,1450,abs)*(80+140*(large+1));
  }
  /** Global height, shared by driving, road, scenery and distant geometry. */
  height(x: number, z: number, knownBiome?:BiomeSample): number {
    const row=this.row(z),center=row.center,approximateLateral=(x-center.position.x)*center.right.x;
    const nearest=Math.abs(approximateLateral)<62?this.project(x,z):null,r=nearest??center,d=nearest?Math.abs(nearest.lateral):Math.abs(approximateLateral);
    if(d<=r.halfWidth)return r.position.y;
    const hill=noise2(x/310,z/420,this.seed^61)*16+noise2(x/105+19,z/180-28,this.seed^73)*4.5-row.hillCenter;
    const b=knownBiome??this.biomeAt(x,z),a=this.terrainShape(b.primary,b.regionA,x,z,center,approximateLateral,hill),other=b.mix>0?this.terrainShape(b.secondary,b.regionB,x,z,center,approximateLateral,hill):a;
    const natural=mix(a,other,b.mix),shoulder=r.position.y-.11*smooth(r.halfWidth,r.halfWidth+r.shoulderWidth,d);
    return mix(shoulder,natural,smooth(r.halfWidth+r.shoulderWidth,32,d));
  }
  waterLevelAt(x:number,z:number):number|null{
    const b=this.biomeAt(x,z);if(b.weights[3]>.3&&this.height(x,z)<-.2)return 0;
    for(const region of [b.regionA,b.regionB])if(region.id===2){const f=this.feature(region),d=Math.hypot((x-f.x)/f.radius,(z-f.z)/f.length);if(d<1.08&&this.height(x,z)<f.water-.1)return f.water;}
    return null;
  }
  normal(x: number, z: number, e = .65): Vec3 {
    const dx = this.height(x + e, z) - this.height(x - e, z), dz = this.height(x, z + e) - this.height(x, z - e), len = Math.hypot(dx, 2 * e, dz);
    return { x: -dx / len, y: 2 * e / len, z: -dz / len };
  }
  richness(x: number, z: number): number { return clamp(.52 + .3 * noise2(x / 100 + 3.1, z / 140 - 1.4, this.seed ^ 821) + .16 * noise2(x / 24, z / 31, this.seed ^ 823)); }
  surface(x: number, z: number): TerrainInfo {
    const p = this.project(x, z), d = Math.abs(p.lateral), n = this.normal(x, z);
    return { height: this.height(x, z), richness: this.richness(x, z), asphalt: 1 - smooth(p.halfWidth - .1, p.halfWidth + .1, d), shoulder: 1 - smooth(p.halfWidth + .6, p.halfWidth + p.shoulderWidth + .6, d), openness: this.openness(-z), slope: Math.acos(n.y) };
  }
  /** Stateless vegetation on a global 22 m lattice, with groves and open view corridors. */
  treeAt(ix: number, iz: number): TreeSpec | null {
    const h = (salt: number) => hash(ix, iz, this.seed ^ salt);
    const x = (ix + .14 + h(101) * .72) * 22, z = (iz + .14 + h(103) * .72) * 22;
    const p = this.project(x, z), d = Math.abs(p.lateral);
    if (d < 9.5 || d > 830) return null;
    const grove = noise2(x / 135 + 31, z / 195 - 11, this.seed ^ 421);
    const biome=this.biomeAt(x,z);if(biome.treeDensity<.008||this.waterLevelAt(x,z)!==null)return null;
    if(biome.weights[8]>.4&&d<55)return null;
    const chance = clamp((.025 + .95*smooth(-.12,.68,grove))*biome.treeDensity*2.25);
    if (h(107) > chance || this.normal(x, z, 3).y < .76) return null;
    const tall = mix(8.5, 17, Math.pow(h(109), .8));
    const evergreen=h(139)<clamp(biome.weights[1]*.65+biome.weights[4]*.96);const kind=evergreen?(h(137)<.5?3:4):Math.min(2,Math.floor(h(137)*3));
    return { x, z, y: this.height(x, z), height: tall, radius: .22 + h(113) * .34, crown: tall * [5.6/10.8,4.6/12.9,6.6/9.4,.23,.28][kind], seed: h(131) * 10000, kind,climate:[biome.coldness,biome.aridity,biome.permanentSnow] };
  }
  treesIn(x: number, z: number, radius: number): TreeSpec[] {
    const trees: TreeSpec[] = [], minx = Math.floor((x - radius) / 22), maxx = Math.ceil((x + radius) / 22), minz = Math.floor((z - radius) / 22), maxz = Math.ceil((z + radius) / 22);
    for (let iz = minz; iz <= maxz; iz++) for (let ix = minx; ix <= maxx; ix++) { const t = this.treeAt(ix, iz); if (t && Math.hypot(t.x - x, t.z - z) < radius) trees.push(t); }
    return trees;
  }
}
