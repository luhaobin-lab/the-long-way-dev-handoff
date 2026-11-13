import { WorldWater } from './water';
import { VillageFactory,type WorldObstacle } from './buildings';
import { BiomeDressing } from './dressing';
import { RegionalLandmarks } from './landmarks';
import { biomeRender } from './biomes';
import * as THREE from 'three';
import type { PaletteName } from '../render/palettes';
import { ROAD_HALF_WIDTH, SHOULDER_WIDTH, WorldField, type TreeSpec, type RoadSample } from './field';
import { hash, mix, noise2, smooth } from './noise';
import { ValleyTreeBatches } from './trees';
import { bakeTreeShadows } from './shadows';

export interface FloatingOrigin { x: number; z: number }
export interface DabSample {
  pos: [number, number, number]; normal?: [number, number, number]; dir?: [number, number, number];
  size: [number, number]; seed: number; palette?: number; lie?: boolean; shade?: number;
}
export interface WorldPainter {
  readonly shared: any;
  readonly sky:any;
  terrainMaterial(kind?: PaletteName): THREE.Material;
  createDabs(samples: DabSample[], kind: PaletteName): THREE.Mesh;
  setBiomeMaps(biome:THREE.DataTexture,climate:THREE.DataTexture):void;
  setLandMaps(height: THREE.DataTexture, land: THREE.DataTexture, x: number, z: number, span: number, resolution: number): void;
}
interface Chunk { key: string; cx: number; cz: number; group: THREE.Group; vegetation: boolean; treeCount: number; dabCount: number; trees: TreeSpec[];colliders:WorldObstacle[];buildings:number;props:number }
interface RoadChunk { key: number; group: THREE.Group; dabCount: number }
const TILE = 256, RES = 24, RADIUS = 6, TREE_RADIUS = 3;
const ROAD_CHUNK = 128, ROAD_BEHIND = 4, ROAD_AHEAD = 18;
const MAP_RES = 768, MAP_SPAN = 768, MAP_STEP = MAP_SPAN / (MAP_RES - 1), MAP_SNAP = MAP_STEP * 96;
const LEAF_BUDGET = 8;
const FAR_SPAN = 10240, FAR_RES = 320, FAR_SNAP = 512;

/** Bounded streaming adapter. The pure field is the only authority for road, mesh, paint maps and vehicle contact. */
export class WorldStream {
  readonly group = new THREE.Group();
  readonly roadGroup = new THREE.Group();
  private readonly chunks = new Map<string, Chunk>();
  private readonly roads = new Map<number, RoadChunk>();
  private pending: { cx: number; cz: number; priority: number }[] = [];
  private vegetationPending: Chunk[] = [];
  private farMesh: THREE.Mesh | null = null;
  private farBuild: { x: number; z: number; row: number; positions: Float32Array;biomes:Float32Array;climates:Float32Array } | null = null;
  private farBase = { x: Infinity, z: Infinity };
  private farKey = '';
  private horizonMesh:THREE.Mesh|null=null;private horizonBase={x:0,z:0};private horizonKey='';private horizonBuilding=false;private horizonJob=0;
  private origin: FloatingOrigin = { x: 0, z: 0 };
  private centerKey = '';
  private roadCenter = Number.NaN;
  private totalGenerated = 0;
  private totalDisposed = 0;
  private maxGenerationMs = 0;
  private readonly terrainMat: THREE.Material;
  private readonly roadMat: THREE.Material;
  private readonly shoulderMat: THREE.Material;
  private readonly barkMat: THREE.Material;
  private readonly rockMat: THREE.Material;
  private readonly treeBatches: ValleyTreeBatches;
  private readonly water:WorldWater;
  private readonly village:VillageFactory;
  private readonly dressing:BiomeDressing;
  private readonly landmarks:RegionalLandmarks;
  private treesDirty = false;
  private heightTex: THREE.DataTexture;
  private landTex: THREE.DataTexture;
  private biomeTex:THREE.DataTexture;
  private climateTex:THREE.DataTexture;
  private mapSun:number[]=[0,1,0];
  private requestedSun:number[]=[0,1,0];
  private mapBase = { x: 0, z: 0 };
  private mapReady = false;
  private mapBuild: { x: number; z: number; row: number; heights: Float32Array; land: Uint8Array;biome:Uint8Array;climate:Uint8Array } | null = null;
  private lastPlayer = { x: 0, z: 0 };
  private disposed = false;
  private sampler: Worker | null = null;
  private jobId = 0;
  private landJob = 0;
  private farJob = 0;
  private completedJobs = 0;
  constructor(private readonly scene: THREE.Scene, readonly field: WorldField, private readonly painter: WorldPainter) {
    this.group.name = 'bounded-world-terrain'; this.roadGroup.name = 'continuous-road';
    this.scene.add(this.group, this.roadGroup);
    this.terrainMat = painter.terrainMaterial('grass'); this.roadMat = painter.terrainMaterial('asphalt');
    this.shoulderMat = painter.terrainMaterial('shoulder'); this.barkMat = painter.terrainMaterial('bark'); this.rockMat = painter.terrainMaterial('rock');
    this.treeBatches = new ValleyTreeBatches(painter.shared); this.scene.add(this.treeBatches.group);
    this.water=new WorldWater(field,painter);this.group.add(this.water.group);this.village=new VillageFactory(painter.shared);this.dressing=new BiomeDressing(painter.shared);this.landmarks=new RegionalLandmarks(field,painter.shared);this.group.add(this.landmarks.group);
    this.heightTex = this.heightTexture(new Float32Array(MAP_RES * MAP_RES));
    this.landTex = this.landTexture(new Uint8Array(MAP_RES * MAP_RES * 4));
    this.biomeTex=this.landTexture(new Uint8Array(MAP_RES*MAP_RES*4));this.biomeTex.minFilter=this.biomeTex.magFilter=THREE.NearestFilter;this.climateTex=this.landTexture(new Uint8Array(MAP_RES*MAP_RES*4));
    if(typeof Worker!=='undefined'){
      try {
        this.sampler=new Worker(new URL('./land-worker.ts',import.meta.url),{type:'module'});
        this.sampler.onmessage=({data})=>{
          if(this.disposed)return;
          if(data.kind==='land'&&data.id===this.landJob)this.commitMap(data.x,data.z,data.heights,data.land,data.biome,data.climate);
          else if(data.kind==='far'&&data.id===this.farJob)this.commitFar(data.x,data.z,data.positions,data.normals,data.indices.subarray(0,data.indexCount),data.biomes,data.climates);
          else if(data.kind==='horizon'&&data.id===this.horizonJob)this.commitFar(data.x,data.z,data.positions,data.normals,data.indices.subarray(0,data.indexCount),data.biomes,data.climates,true);
          this.completedJobs++;
        };
        this.sampler.onerror=event=>{event.preventDefault();this.sampler?.terminate();this.sampler=null;this.horizonBuilding=false;this.horizonKey='';console.warn('World sampler fell back to bounded main-thread rows.');};
      }catch{this.sampler=null;}
    }
  }
  private heightTexture(data: Float32Array): THREE.DataTexture {
    const tex = new THREE.DataTexture(data as any, MAP_RES, MAP_RES, THREE.RedFormat, THREE.FloatType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true; return tex;
  }
  private landTexture(data: Uint8Array): THREE.DataTexture {
    const tex = new THREE.DataTexture(data as any, MAP_RES, MAP_RES, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true; return tex;
  }
  /** Warmup prepares a complete horizon, yielding so the loading presentation and browser remain responsive. */
  async warmup(x: number, z: number, origin: FloatingOrigin, onProgress?: (p: number) => void): Promise<void> {
    this.lastPlayer={x,z};this.resetSamplingJobs();
    this.plan(x, z, origin);
    this.startMap(x, z);
    while (this.mapBuild) { if(!this.sampler)this.buildMapRows(64); onProgress?.(.25 * (this.mapBuild?.row ?? MAP_RES) / MAP_RES); await new Promise<void>(r => setTimeout(r, 0)); }
    const total = this.pending.length;
    while (this.pending.length) {
      const item = this.pending.shift()!; this.addTerrain(item.cx, item.cz, x, z);
      onProgress?.(.25 + .6 * (1 - this.pending.length / total));
      if (this.pending.length % 3 === 0) await new Promise<void>(r => setTimeout(r, 0));
    }
    this.updateRoads(-z, true);
    this.planFar(x,z);this.planHorizon(x,z);
    while(this.horizonBuilding){await new Promise<void>(r=>setTimeout(r,4));}
    while(this.farBuild){if(!this.sampler)this.buildFarRows(24);await new Promise<void>(r=>setTimeout(r,0));}
    while(this.vegetationPending.length){const c=this.vegetationPending.shift()!;if(this.chunks.has(c.key))this.addVegetation(c);await new Promise<void>(r=>setTimeout(r,0));}
    this.refreshTrees();this.water.update(x,z,origin);this.landmarks.update(x,z,origin); onProgress?.(1); this.rebase(origin);
  }
  private resetSamplingJobs():void{this.mapBuild=null;this.landJob=0;this.mapReady=false;this.farBuild=null;this.farJob=0;this.farKey='';this.horizonJob=0;this.horizonKey='';this.horizonBuilding=false;}
  /** Explicit seek is used by reproducible tests; it constructs the destination before capturing it. */
  async seek(x: number, z: number, origin: FloatingOrigin): Promise<void> { await this.warmup(x, z, origin); }
  update(player: { x: number; z: number; s?: number }, origin: FloatingOrigin, budgetMs = 4): void {
    if (this.disposed) return;
    const start = performance.now(); this.lastPlayer = player;
    this.plan(player.x, player.z, origin);this.water.update(player.x,player.z,origin);this.landmarks.update(player.x,player.z,origin);
    this.updateRoads(player.s ?? -player.z, false);
    if (!this.mapBuild && (!this.mapReady || Math.abs(player.x - this.mapBase.x - MAP_SPAN / 2) > 92 || Math.abs(player.z - this.mapBase.z - MAP_SPAN / 2) > 92)) this.startMap(player.x, player.z);
    if(!this.mapBuild&&this.mapReady){const sun=this.sunVector();if(sun[0]*this.mapSun[0]+sun[1]*this.mapSun[1]+sun[2]*this.mapSun[2]<.99756)this.startMap(player.x,player.z,true);}
    if (this.mapBuild&&!this.sampler) this.buildMapRows(3);
    this.planFar(player.x,player.z);this.planHorizon(player.x,player.z);
    if(this.farBuild&&!this.sampler && performance.now()-start<budgetMs*.7)this.buildFarRows(2);
    if (this.pending.length && performance.now() - start < budgetMs) { const item = this.pending.shift()!; this.addTerrain(item.cx, item.cz, player.x, player.z); }
    else if(this.vegetationPending.length && performance.now()-start<budgetMs){const c=this.vegetationPending.shift()!;if(this.chunks.has(c.key))this.addVegetation(c);}
    if(this.treesDirty)this.refreshTrees();
    this.maxGenerationMs = Math.max(this.maxGenerationMs, performance.now() - start);
  }
  private plan(x: number, z: number, origin: FloatingOrigin): void {
    this.rebase(origin);
    const cx = Math.floor(x / TILE), cz = Math.floor(z / TILE), key = `${cx},${cz}`;
    if (key === this.centerKey) return;
    this.centerKey = key;
    const needed = new Set<string>(); this.pending = []; this.vegetationPending = [];
    for (let dz = -RADIUS; dz <= RADIUS; dz++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      if (Math.hypot(dx, dz) > RADIUS + .5) continue;
      const a = cx + dx, b = cz + dz, k = `${a},${b}`; needed.add(k);
      if (!this.chunks.has(k)) this.pending.push({ cx: a, cz: b, priority: Math.hypot(dx, dz) + (dz > 0 ? .35 : 0) });
    }
    this.pending.sort((a, b) => a.priority - b.priority);
    for (const [k, c] of this.chunks) {
      if (!needed.has(k)) { this.disposeGroup(c.group); this.chunks.delete(k); this.totalDisposed++; this.treesDirty=true; }
      else if (!c.vegetation && Math.hypot(c.cx - cx, c.cz - cz) < TREE_RADIUS + .6) this.vegetationPending.push(c);
    }
  }
  private rebase(origin: FloatingOrigin): void {
    if (origin.x === this.origin.x && origin.z === this.origin.z && this.mapReady) return;
    this.origin = { ...origin };
    for (const c of this.chunks.values()) c.group.position.set(c.cx * TILE - origin.x, 0, c.cz * TILE - origin.z);
    for (const [key, c] of this.roads) c.group.position.set(-origin.x, 0, -key * ROAD_CHUNK - origin.z);
    if(this.farMesh)this.farMesh.position.set(this.farBase.x-origin.x,0,this.farBase.z-origin.z);
    if(this.horizonMesh)this.horizonMesh.position.set(this.horizonBase.x-origin.x,0,this.horizonBase.z-origin.z);
    this.treesDirty=true;this.refreshTrees();
    this.publishMap();
  }
  private publishMap(): void {
    if (!this.mapReady) return;
    this.painter.setBiomeMaps(this.biomeTex,this.climateTex);
    this.painter.setLandMaps(this.heightTex, this.landTex, this.mapBase.x - this.origin.x, this.mapBase.z - this.origin.z, MAP_SPAN, MAP_RES);
  }
  private startMap(x: number, z: number,force=false): void {
    // Snap to a GLOBAL integer lattice: moving coverage does not shift a single painted sample.
    const bx = Math.floor((x - MAP_SPAN / 2) / MAP_SNAP) * MAP_SNAP, bz = Math.floor((z - MAP_SPAN / 2) / MAP_SNAP) * MAP_SNAP;
    if (!force&&this.mapReady && bx === this.mapBase.x && bz === this.mapBase.z) return;
    this.mapBuild = { x: bx, z: bz, row: 0, heights: new Float32Array(MAP_RES * MAP_RES), land: new Uint8Array(MAP_RES * MAP_RES * 4),biome:new Uint8Array(MAP_RES*MAP_RES*4),climate:new Uint8Array(MAP_RES*MAP_RES*4) };
    this.requestedSun=this.sunVector();
    if(this.sampler){this.landJob=++this.jobId;this.sampler.postMessage({id:this.landJob,kind:'land',seed:this.field.seedName,x:bx,z:bz,span:MAP_SPAN,resolution:MAP_RES,sun:this.requestedSun});}
  }
  private buildMapRows(rows: number): void {
    const b = this.mapBuild; if (!b) return;
    const end = Math.min(MAP_RES, b.row + rows);
    for (let j = b.row; j < end; j++) {
      const z = b.z + j * MAP_STEP, center = this.field.roadAt(-z);
      for (let i = 0; i < MAP_RES; i++) {
        const x = b.x + i * MAP_STEP, k = j * MAP_RES + i;
        const bm=this.field.biomeAt(x,z);b.heights[k] = this.field.height(x, z,bm);
        const br=biomeRender(bm);b.biome[k*4]=br[0];b.biome[k*4+1]=br[1];b.biome[k*4+2]=Math.round(bm.mix*255);b.biome[k*4+3]=Math.round(bm.vegetation*255);b.climate[k*4]=Math.round(bm.coldness*255);b.climate[k*4+1]=Math.round(bm.aridity*255);b.climate[k*4+2]=Math.round(bm.permanentSnow*255);b.climate[k*4+3]=Math.round(bm.water*255);
        const approx = Math.abs((x - center.position.x) * center.right.x);
        const p=approx<12?this.field.project(x,z):null,d=p?Math.abs(p.lateral):approx,w=p?.halfWidth??center.halfWidth,shoulder=p?.shoulderWidth??center.shoulderWidth;
        b.land[k * 4] = Math.round(255 * (1 - smooth(w - .15, w + .15, d)));
        b.land[k * 4 + 1] = Math.round(255 * (1 - smooth(w + .6, w + shoulder + .65, d)));
        b.land[k * 4 + 2] = Math.round(255 * this.field.richness(x, z));
        b.land[k * 4 + 3] = 0;
      }
    }
    b.row = end;
    if (end === MAP_RES) { bakeTreeShadows(this.field,b.land,b.x,b.z,MAP_SPAN,MAP_RES,this.sunVector());this.commitMap(b.x,b.z,b.heights,b.land,b.biome,b.climate); }
  }
  private sunVector():number[]{const shared=this.painter.shared,s=shared.uNight?.value>.5&&shared.uMoonDir?shared.uMoonDir.value:shared.uSunDir.value;return[s.x,s.y,s.z];}
  async refreshLighting():Promise<void>{
    this.mapBuild=null;this.landJob=0;this.startMap(this.lastPlayer.x,this.lastPlayer.z,true);
    while(this.mapBuild){if(!this.sampler)this.buildMapRows(16);await new Promise<void>(r=>setTimeout(r,8));}
  }
  private commitMap(x:number,z:number,heights:Float32Array,land:Uint8Array,biome:Uint8Array,climate:Uint8Array):void{
    const oldH=this.heightTex,oldL=this.landTex,oldB=this.biomeTex,oldC=this.climateTex;
    this.biomeTex=this.landTexture(biome);this.biomeTex.minFilter=this.biomeTex.magFilter=THREE.NearestFilter;this.climateTex=this.landTexture(climate);this.mapSun=[...this.requestedSun];
    this.heightTex=this.heightTexture(heights);this.landTex=this.landTexture(land);this.mapBase={x,z};this.mapReady=true;this.mapBuild=null;
    this.publishMap();oldH.dispose();oldL.dispose();oldB.dispose();oldC.dispose();
  }
  private planFar(x:number,z:number):void{
    const bx=Math.floor(x/FAR_SNAP)*FAR_SNAP-FAR_SPAN/2,bz=Math.floor(z/FAR_SNAP)*FAR_SNAP-FAR_SPAN/2,key=`${bx},${bz}`;
    if(key===this.farKey||this.farBuild)return;
    this.farKey=key;this.farBuild={x:bx,z:bz,row:0,positions:new Float32Array((FAR_RES+1)*(FAR_RES+1)*3),biomes:new Float32Array((FAR_RES+1)*(FAR_RES+1)*3),climates:new Float32Array((FAR_RES+1)*(FAR_RES+1)*3)};
    if(this.sampler){this.farJob=++this.jobId;this.sampler.postMessage({id:this.farJob,kind:'far',seed:this.field.seedName,x:bx,z:bz,span:FAR_SPAN,resolution:FAR_RES});}
  }
  private planHorizon(x:number,z:number):void{
    const span=49152,bx=Math.floor(x/2048)*2048-span/2,bz=Math.floor(z/2048)*2048-span/2,key=`${bx},${bz}`;
    if(key===this.horizonKey||this.horizonBuilding||!this.sampler)return;
    this.horizonKey=key;this.horizonBuilding=true;this.horizonJob=++this.jobId;this.sampler.postMessage({id:this.horizonJob,kind:'horizon',seed:this.field.seedName,x:bx,z:bz,span,resolution:256,hole:3400,depression:16});
  }
  private buildFarRows(rows:number):void{
    const b=this.farBuild;if(!b)return;const end=Math.min(FAR_RES+1,b.row+rows),step=FAR_SPAN/FAR_RES;
    for(let j=b.row;j<end;j++)for(let i=0;i<=FAR_RES;i++){const lx=i*step,lz=j*step,k=(j*(FAR_RES+1)+i)*3;b.positions[k]=lx;const bm=this.field.biomeAt(b.x+lx,b.z+lz);b.positions[k+1]=this.field.height(b.x+lx,b.z+lz,bm)-4;b.positions[k+2]=lz;b.biomes.set(biomeRender(bm),k);b.climates[k]=bm.coldness;b.climates[k+1]=bm.aridity;b.climates[k+2]=bm.permanentSnow;}
    b.row=end;if(end!==FAR_RES+1)return;
    const indices:number[]=[];
    for(let j=0;j<FAR_RES;j++)for(let i=0;i<FAR_RES;i++){
      // Near terrain supplies the inner disk. Overlap is buried slightly below the true field.
      if(Math.hypot((i+.5)*step-FAR_SPAN/2,(j+.5)*step-FAR_SPAN/2)<900)continue;
      const a=j*(FAR_RES+1)+i,c=a+FAR_RES+1;indices.push(a,c,a+1,a+1,c,c+1);
    }
    this.commitFar(b.x,b.z,b.positions,null,new Uint32Array(indices),b.biomes,b.climates);
  }
  private commitFar(x:number,z:number,positions:Float32Array,normals:Float32Array|null,indices:Uint32Array,biomes:Float32Array,climates:Float32Array,horizon=false):void{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.setAttribute('aBiome',new THREE.BufferAttribute(biomes,3));geometry.setAttribute('aClimate',new THREE.BufferAttribute(climates,3));
    if(normals)geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));else geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,this.terrainMat);mesh.name=horizon?'ultra-distant-24km-terrain':'distant-continuous-mountain-field';mesh.position.set(x-this.origin.x,0,z-this.origin.z);
    if(horizon){if(this.horizonMesh){this.horizonMesh.removeFromParent();this.horizonMesh.geometry.dispose();}this.horizonMesh=mesh;this.horizonBase={x,z};this.horizonBuilding=false;}
    else{if(this.farMesh){this.farMesh.removeFromParent();this.farMesh.geometry.dispose();}this.farMesh=mesh;this.farBase={x,z};this.farBuild=null;}
    this.group.add(mesh);
  }
  private addTerrain(cx: number, cz: number, px: number, pz: number): void {
    const key = `${cx},${cz}`; if (this.chunks.has(key)) return;
    const group = new THREE.Group(); group.name = `terrain-${key}`; group.position.set(cx * TILE - this.origin.x, 0, cz * TILE - this.origin.z);
    const positions: number[] = [], normals: number[] = [], indices: number[] = [],biomes:number[]=[],climates:number[]=[];
    for (let j = 0; j <= RES; j++) for (let i = 0; i <= RES; i++) {
      const lx = i / RES * TILE, lz = j / RES * TILE, x = cx * TILE + lx, z = cz * TILE + lz;
      const p = this.field.project(x, z), d = Math.abs(p.lateral), depression = .12 + .42 * (1 - smooth(19, 29, d));
      const bm=this.field.biomeAt(x,z);positions.push(lx, this.field.height(x, z,bm) - depression, lz);biomes.push(...biomeRender(bm));climates.push(bm.coldness,bm.aridity,bm.permanentSnow);
      const n = this.field.normal(x, z, 2); normals.push(n.x, n.y, n.z);
      if (i < RES && j < RES) { const a = j * (RES + 1) + i, c = a + RES + 1; indices.push(a, c, a + 1, a + 1, c, c + 1); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setIndex(indices);geometry.setAttribute('aBiome',new THREE.Float32BufferAttribute(biomes,3));geometry.setAttribute('aClimate',new THREE.Float32BufferAttribute(climates,3)); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, this.terrainMat); mesh.name = 'terrain-underpainting'; group.add(mesh);
    const chunk: Chunk = { key, cx, cz, group, vegetation: false, treeCount: 0, dabCount: 0, trees: [],colliders:[],buildings:0,props:0 };
    this.chunks.set(key, chunk); this.group.add(group); this.totalGenerated++;
    if (Math.hypot(cx - Math.floor(px / TILE), cz - Math.floor(pz / TILE)) < TREE_RADIUS + .6) this.vegetationPending.push(chunk);
  }
  private addVegetation(chunk: Chunk): void {
    if(chunk.vegetation)return;chunk.vegetation=true;
    const bx=chunk.cx*TILE,bz=chunk.cz*TILE;
    const minx=Math.floor(bx/22)-1,maxx=Math.ceil((bx+TILE)/22),minz=Math.floor(bz/22)-1,maxz=Math.ceil((bz+TILE)/22);
    for(let iz=minz;iz<=maxz;iz++)for(let ix=minx;ix<=maxx;ix++){
      const tree=this.field.treeAt(ix,iz);if(tree&&tree.x>=bx&&tree.x<bx+TILE&&tree.z>=bz&&tree.z<bz+TILE)chunk.trees.push(tree);
    }
    chunk.treeCount=chunk.trees.length;this.treesDirty=true;
    const village=this.village.create(this.field,chunk.cx,chunk.cz),props=this.dressing.create(this.field,chunk.cx,chunk.cz);
    chunk.group.add(village.group,props.group);chunk.colliders.push(...village.colliders,...props.colliders);chunk.buildings=village.count;chunk.props=props.count;
  }
  private refreshTrees():void{
    const trees:TreeSpec[]=[];for(const c of this.chunks.values())trees.push(...c.trees);
    this.treeBatches.setTrees(trees,this.origin);this.treesDirty=false;
  }
  private updateRoads(s: number, all: boolean): void {
    const current = Math.floor(s / ROAD_CHUNK);
    if (current === this.roadCenter && !all) return;
    this.roadCenter = current;
    const needed = new Set<number>();
    for (let i = current - ROAD_BEHIND; i <= current + ROAD_AHEAD; i++) { needed.add(i); if (!this.roads.has(i)) this.addRoad(i); }
    for (const [i, r] of this.roads) if (!needed.has(i)) { this.disposeGroup(r.group); this.roads.delete(i); }
  }
  private addRoad(key: number): void {
    const group = new THREE.Group(); group.name = `road-${key}`; group.position.set(-this.origin.x, 0, -key * ROAD_CHUNK - this.origin.z);
    const base = key * ROAD_CHUNK, steps = 64;
    const ribbon = (bandAt:(road:RoadSample)=>number[], mat: THREE.Material, offset: number) => {
      const pos: number[] = [], normals: number[] = [], index: number[] = [],biomes:number[]=[],climates:number[]=[];
      const count=bandAt(this.field.roadAt(base)).length;
      for (let j = 0; j <= steps; j++) {
        const road = this.field.roadAt(base + j / steps * ROAD_CHUNK);
        for (const u of bandAt(road)) { const x = road.position.x + road.right.x * u, z = road.position.z + road.right.z * u; const bm=this.field.biomeAt(x,z);pos.push(x, this.field.height(x, z,bm) + offset, z + base);biomes.push(...biomeRender(bm));climates.push(bm.coldness,bm.aridity,bm.permanentSnow); const n = this.field.normal(x, z, .45); normals.push(n.x, n.y, n.z); }
      }
      for (let j = 0; j < steps; j++) for (let i = 0; i < count - 1; i++) { const a = j * count + i, b = a + count; index.push(a, a + 1, b, a + 1, b + 1, b); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geo.setIndex(index);geo.setAttribute('aBiome',new THREE.Float32BufferAttribute(biomes,3));geo.setAttribute('aClimate',new THREE.Float32BufferAttribute(climates,3)); geo.computeBoundingSphere(); group.add(new THREE.Mesh(geo, mat));
    };
    ribbon(r=>[-26, -18, -12, -r.halfWidth-r.shoulderWidth-2, -r.halfWidth-r.shoulderWidth], this.terrainMat, -.035); ribbon(r=>[r.halfWidth+r.shoulderWidth,r.halfWidth+r.shoulderWidth+2,12,18,26], this.terrainMat, -.035);
    ribbon(r=>[-r.halfWidth-r.shoulderWidth,-r.halfWidth-.5,-r.halfWidth,r.halfWidth,r.halfWidth+.5,r.halfWidth+r.shoulderWidth], this.shoulderMat, .01);
    ribbon(r=>[-r.halfWidth,-r.halfWidth*.5,0,r.halfWidth*.5,r.halfWidth], this.roadMat, .035);
    const stripes: DabSample[] = [];
    const add = (out: DabSample[], s: number, lateral: number, w: number, h: number, seed: number, lift: number) => {
      const p = this.field.roadAt(s); out.push({ pos: [p.position.x + p.right.x * lateral, p.position.y + lift, p.position.z + p.right.z * lateral + base], normal: [p.normal.x, p.normal.y, p.normal.z], dir: [p.tangent.x, p.tangent.y, p.tangent.z], size: [w, h], seed, lie: true });
    };
    for (let row = Math.ceil(base / .7); row < Math.ceil((base + ROAD_CHUNK) / .7); row++) {
      const s = row * .7, r = hash(row, 0, this.field.seed ^ 2203);
      const width=this.field.roadAt(s).halfWidth-.25;add(stripes, s, -width, .09, .95, r * 5000, .08); add(stripes, s, width, .09, .95, r * 5000 + 5, .08);
      if (((s % 12) + 12) % 12 < 4.5) add(stripes, s, 0, .12, .94, r * 5000 + 10, .082);
    }
    group.add(this.painter.createDabs(stripes, 'cream'));
    this.roadGroup.add(group); this.roads.set(key, { key, group, dabCount: stripes.length });
  }
  getObstacles(x: number, z: number, radius = 8): WorldObstacle[] { const obstacles:WorldObstacle[]=this.field.treesIn(x,z,radius);for(const c of this.chunks.values())for(const o of c.colliders)if(Math.hypot(o.x-x,o.z-z)<radius+o.radius)obstacles.push(o);return obstacles; }
  diagnostics(): Record<string, number | string | boolean | object> {
    let trees = 0, dabs = 0,buildings=0,props=0; for (const c of this.chunks.values()) { trees += c.treeCount; dabs += c.dabCount;buildings+=c.buildings;props+=c.props; } for (const r of this.roads.values()) dabs += r.dabCount;
    return { terrainChunks: this.chunks.size, farHorizon:!!this.farMesh,ultraHorizon:!!this.horizonMesh,horizonRadius:24576, farBuildRow:this.farBuild?.row??-1, pendingVegetation:this.vegetationPending.length, roadChunks: this.roads.size, pendingChunks: this.pending.length, trees, renderedTrees:this.treeBatches.count, roadPaintMarks: dabs,buildings,props,biome:this.field.biomeAt(this.lastPlayer.x,this.lastPlayer.z).name, generatedChunks: this.totalGenerated, retiredChunks: this.totalDisposed, mapReady: this.mapReady, mapBuilding:!!this.mapBuild,farBuilding:!!this.farBuild||this.horizonBuilding, samplerWorker:!!this.sampler,completedSamplingJobs:this.completedJobs, mapBuildRow: this.mapBuild?.row ?? -1, mapResolution: MAP_RES, mapBounds: { ...this.mapBase, span: MAP_SPAN }, origin: { ...this.origin }, maxGenerationMs: Math.round(this.maxGenerationMs * 100) / 100 };
  }
  private disposeGroup(group: THREE.Group): void {
    group.removeFromParent(); group.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; for (const mat of materials) if (![this.terrainMat, this.roadMat, this.shoulderMat, this.barkMat, this.rockMat,this.village.material].includes(mat)&&!this.dressing.owns(mat)) mat.dispose(); } });
  }
  dispose(): void {
    this.disposed = true;this.sampler?.terminate(); for (const c of this.chunks.values()) this.disposeGroup(c.group); for (const c of this.roads.values()) this.disposeGroup(c.group); this.chunks.clear(); this.roads.clear(); this.group.removeFromParent(); this.roadGroup.removeFromParent(); this.farMesh?.geometry.dispose();this.horizonMesh?.geometry.dispose(); this.heightTex.dispose(); this.landTex.dispose();this.biomeTex.dispose();this.climateTex.dispose(); this.treeBatches.dispose();this.water.dispose();this.village.dispose();this.dressing.dispose();this.landmarks.dispose();
  }
}
