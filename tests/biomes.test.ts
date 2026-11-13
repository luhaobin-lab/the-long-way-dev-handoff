import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {WorldField} from '../src/world/field.ts';
import {BIOME_NAMES,BiomeSystem,REGION_LENGTH,biomeRender} from '../src/world/biomes.ts';
import {seedHash} from '../src/world/noise.ts';

test('each deterministic deck contains all nine biomes, without an adjacent deck repeat',()=>{
 for(const seed of ['wildflower','evergreen','copper','44','你好']){
  const b=new BiomeSystem(seedHash(seed));
  for(let block=-10;block<10;block++){
   const ids=Array.from({length:9},(_,i)=>b.region(block*9+i).id);assert.equal(new Set(ids).size,9);
   assert.notEqual(b.region(block*9-1).id,ids[0]);
  }
 }
});
test('macro and climate blends stay continuous, finite and normalized through boundaries',()=>{
 const f=new WorldField('wildflower');
 for(let s=-10000;s<100000;s+=37.7){
  const a=f.biomeAt(0,-s),b=f.biomeAt(0,-s-.001);assert.ok(Math.abs(a.weights.reduce((x,y)=>x+y,0)-1)<1e-12);
  for(let i=0;i<9;i++){assert.ok(a.weights[i]>=0&&a.weights[i]<=1);assert.ok(Math.abs(a.weights[i]-b.weights[i])<.00001);}
  for(const n of [a.coldness,a.aridity,a.permanentSnow,a.vegetation])assert.ok(Number.isFinite(n)&&n>=0&&n<=1);
 }
});
test('every biome has a reproducible reachable center and distinct physical morphology',()=>{
 const f=new WorldField('wildflower'),signature=[];
 for(const name of BIOME_NAMES){const r=f.findBiome(name),p=f.roadAt(r.centerS),b=f.biomeAt(p.position.x,p.position.z);assert.equal(b.id,r.id);assert.equal(f.findBiome(name).centerS,r.centerS);signature.push(Math.round(f.height(p.position.x+600,p.position.z)-p.position.y));}
 assert.ok(new Set(signature).size>=8,JSON.stringify(signature));
});
test('variable road width remains safe and lane/terrain agreement holds across all biome transitions',()=>{
 const f=new WorldField('evergreen');let low=10,high=0;
 for(let s=-1000;s<110000;s+=19.37){
  const r=f.roadAt(s);low=Math.min(low,r.halfWidth);high=Math.max(high,r.halfWidth);assert.ok(r.halfWidth>=2.95&&r.halfWidth<4.8);assert.ok(Math.abs(r.grade)<.08);
  for(const side of [-1,1]){const x=r.position.x+side*r.right.x*r.halfWidth,z=r.position.z+side*r.right.z*r.halfWidth;assert.ok(Math.abs(f.height(x,z)-r.position.y)<1e-7);}
 }
 assert.ok(high-low>1.2);
});
test('road and terrain derivatives do not jump at region and blend boundaries',()=>{
 const f=new WorldField('copper');
 for(let i=-2;i<20;i++)for(const offset of [0,2300,3100,3900]){
  const s=i*REGION_LENGTH+offset,a=f.roadAt(s-.001),b=f.roadAt(s+.001);assert.ok(Math.abs(a.position.y-b.position.y)<.001);assert.ok(Math.abs(a.grade-b.grade)<.00001);assert.ok(Math.abs(a.halfWidth-b.halfWidth)<.00001);
  const x=a.position.x+120,z=-s;assert.ok(Math.abs(f.height(x,z-.001)-f.height(x,z+.001))<.02);
 }
});
test('ocean-side coastline is genuinely below water and dry road stays above it',()=>{
 const f=new WorldField('wildflower'),r=f.findBiome('coast'),road=f.roadAt(r.centerS),x=road.position.x-road.right.x*r.side*600,z=road.position.z-road.right.z*r.side*600;
 assert.ok(f.height(x,z)<0);assert.equal(f.waterLevelAt(x,z),0);assert.ok(road.position.y>0);assert.equal(f.waterLevelAt(road.position.x,road.position.z),null);
});
test('fully blended render pairs cannot interpolate unrelated categorical biome IDs',()=>{
 const f=new WorldField('copper');for(let i=-10;i<20;i++){const r=f.roadAt(i*REGION_LENGTH),a=biomeRender(f.biomeAt(r.position.x,r.position.z-.1)),b=biomeRender(f.biomeAt(r.position.x,r.position.z+.1));assert.equal(a[0],a[1]);assert.equal(b[0],b[1]);assert.equal(a[0],b[0]);}
});
