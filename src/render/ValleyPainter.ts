/**
 * The Long Way's streaming adapter for Blendi/Patch Painted Valley.
 * Actual source sky/cloud bake, mountain painting, meadow palette/marks, grass blades,
 * tree shaders and the final painter pass are retained under MIT (c) 2026 Patch.
 * The earlier Oil Paint renderer is not imported by this live adapter.
 */
import * as THREE from 'three';
import { COMMON } from './vendor/painted-valley/lib/glsl.js';
import { smoothNoiseTexture,whiteNoiseTexture } from './vendor/painted-valley/lib/noise.js';
import { createFrame } from './vendor/painted-valley/lib/frame.js';
import { createBlades,RINGS } from './vendor/painted-valley/lib/blades.js';
import { createFlowers } from './vendor/painted-valley/lib/flowers.js';
import { createSky as sourceSky,createSkyParts } from './vendor/painted-valley/valley/sky.js';
import { createStrokes } from './vendor/painted-valley/valley/strokes.js';
import { PALETTES,PALETTE_NAMES,type Palette,type PaletteName } from './palettes';
import { ClimateClock,climateLighting,type ClimateConfig,type SeasonName } from './Climate';
import { BIOME_PAINT,BIOME_WEIGHTS_VERTEX } from './biomePaint';
export type { Palette,PaletteName } from './palettes';
export interface DabSample {pos:readonly[number,number,number];normal?:readonly[number,number,number];dir?:readonly[number,number,number];size:readonly[number,number];seed:number;palette?:number|PaletteName;lie?:boolean;base?:boolean;shade?:number;}
export interface DabOptions {minPx?:[number,number];maxPx?:[number,number];order?:number;fadeStart?:number;fadeEnd?:number;}
export interface MeshPaintOptions {stroke?:[number,number];density?:number;grain?:THREE.Vector3;seed?:number;maxCount?:number;}
export interface PaintedMesh {strokes:THREE.Mesh;count:number;dispose():void;}
const blank=(r:number,g=0,b=0,a=255)=>{const t=new THREE.DataTexture(new Uint8Array([r,g,b,a]),1,1);t.needsUpdate=true;return t;};
const paintUniforms=(paint:PaletteName|Palette)=>{const p=typeof paint==='string'?PALETTES[paint]:paint;return{uLit:{value:new THREE.Vector3(...p.light)},uHalf:{value:new THREE.Vector3(...p.mid)},uShade:{value:new THREE.Vector3(...p.shade)}};};
const SURFACE_VERTEX=/*glsl*/`
in vec3 aBiome;in vec3 aClimate;out vec3 vClimate;
${BIOME_WEIGHTS_VERTEX}
out vec3 vWorld;out vec3 vNormal;out vec3 vLocal;
void main(){writeBiomeWeights(aBiome);vClimate=aClimate;vLocal=position;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}
`;
const LIGHT=/*glsl*/`
uniform vec3 uLit,uHalf,uShade;uniform float uInk;
vec3 celPaint(vec3 n,vec3 world){
  // The original wanderer's two chosen paint tones and short terminator, adapted for a solid cabin.
  float lit=smoothstep(0.0,.045,dot(n,uSunDir)+.06);
  vec3 sun=uSunColor*.42+uSkyColor*.3;
  float grey=dot(uSkyColor,vec3(.333));
  vec3 sky=mix(uSkyColor,vec3(grey),.8)*1.15+.2;
  return mix(uShade*sky,uLit*sun,lit) + uLit * headlightColor() * headlightAt(world,n) * .72;
}
`;

export class ValleyPainter {
  readonly shared:any;
  readonly field:any;
  readonly frame:any;
  readonly sky:any;
  readonly skyParts:any;
  private renderer:THREE.WebGLRenderer;
  private materials=new Map<string,THREE.ShaderMaterial>();
  private textures=new Set<THREE.Texture>();
  private grass:any[]=[];
  private skyGroup=new THREE.Group();
  private readyPromise:Promise<void>|null=null;
  private time=0;
  private calendar=new ClimateClock();
  private climateApplied=false;
  private cloudClock=0;
  private vehicleLightSet=false;
  private headlights:boolean|'auto'='auto';
  private biomeTexture:THREE.DataTexture|null=null;
  private climateTexture:THREE.DataTexture|null=null;
  private biomeEye=new THREE.Vector3(Infinity,Infinity,Infinity);
  private inkCounter=0;
  private convertedVersion=-1;
  private convertedSource:THREE.DataTexture|null=null;
  private growthTexture:THREE.DataTexture|null=null;
  private slopeTexture:THREE.DataTexture|null=null;
  private shadeTexture:THREE.DataTexture|null=null;
  private nearHeight:((x:number,z:number)=>number)|null=null;
  constructor(renderer:THREE.WebGLRenderer){
    this.renderer=renderer;renderer.autoClear=true;renderer.info.autoReset=false;renderer.toneMapping=THREE.NoToneMapping;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    const h=new THREE.DataTexture(new Float32Array([0]),1,1,THREE.RedFormat,THREE.FloatType);h.needsUpdate=true;
    this.shared={
      uTime:{value:0},uWorldOrigin:{value:new THREE.Vector3()},uPixel:{value:.001},
      uSeasonWeights:{value:new THREE.Vector4(0,1,0,0)},uNight:{value:0},uSnowStrength:{value:0},uSunElevation:{value:45},uSolarDir:{value:new THREE.Vector3(-.6,.7,-.3).normalize()},uMoonDir:{value:new THREE.Vector3(.6,-.7,.3).normalize()},uMoonColor:{value:new THREE.Color()},uStarIntensity:{value:0},uSunVisibility:{value:1},
      tBiome:{value:blank(0,0,0,255)},tClimate:{value:blank(128,25,0,0)},uClimateFallback:{value:new THREE.Vector3(.5,.1,0)},uBackdropClimate:{value:new THREE.Vector3(.5,.1,0)},uBackdropBiome:{value:new THREE.Vector3()},
      uHeadlightPosition:{value:new THREE.Vector3()},uHeadlightDirection:{value:new THREE.Vector3(0,-.03,-1)},uHeadlightStrength:{value:0},uWind:{value:new THREE.Vector4(.8,.6,1.8,.55)},uWindScroll:{value:new THREE.Vector2()},
      uExtentMin:{value:new THREE.Vector2(-256,-256)},uExtentInv:{value:1/512},uHeightRes:{value:1},
      uStateMin:{value:new THREE.Vector2(-1,-1)},uStateInv:{value:.5},tHeight:{value:h},tMap:{value:blank(35,255,0,0)},tRoadLand:{value:blank(0,0,128,0)},
      tState:{value:blank(128,128,255,0)},tFire:{value:blank(0,0,0,0)},tGlow:{value:blank(0,0,0,0)},
      tNoise:{value:smoothNoiseTexture(256,40)},tNoiseHi:{value:smoothNoiseTexture(256,40,true)},tWhite:{value:whiteNoiseTexture(256,23)},
      uSunDir:{value:new THREE.Vector3(-.6,.7,-.3).normalize()},uSunColor:{value:new THREE.Color(2.7,2.55,2.2)},uSkyColor:{value:new THREE.Color(.3,.47,.82)},uBounceColor:{value:new THREE.Color(.1,.16,.05)},
      uFogColor:{value:new THREE.Color(.4,.67,.85)},uFogSunColor:{value:new THREE.Color(.66,.78,.9)},uFogDensity:{value:.00017},uFireColor:{value:new THREE.Color(0,0,0)},uCamPos:{value:new THREE.Vector3()},
      uPushers:{value:Array.from({length:6},()=>new THREE.Vector4(0,0,0,0))},uCloudShade:{value:.15},tShade:{value:blank(0,0,0,255)},tFloor:{value:blank(0,0,0,0)},tStrokes:{value:createStrokes(renderer)},tSlope:{value:blank(128,128,0,255)},
      uHeroEye:{value:new THREE.Vector3(0,60,0)},uFloor:{value:new THREE.Vector4(0,-1,0,0)},uFloorInv:{value:0},uLamp:{value:new THREE.Vector4(0,0,0,0)},uWalker:{value:new THREE.Vector4(0,0,0,0)},
    };
    this.shared.uHazeDensity=this.shared.uFogDensity;
    for(const u of Object.values(this.shared) as any[])if(u.value?.isTexture)this.textures.add(u.value);
    this.field={uniforms:this.shared,renderer,state:{burning:0,fireBox:{x0:0,z0:0,x1:-1,z1:0,y0:0,y1:0}},heightAt:(x:number,z:number)=>this.heightAt(x,z),setLight:(l:any)=>{
      for(const [key,uniform]of Object.entries({sunDir:'uSunDir',sunColor:'uSunColor',skyColor:'uSkyColor',bounceColor:'uBounceColor',fogColor:'uFogColor',fogSunColor:'uFogSunColor'}))if(l[key])this.shared[uniform].value.copy(l[key]);
      if(l.fogDensity!==undefined)this.shared.uFogDensity.value=l.fogDensity;if(l.cloudShade!==undefined)this.shared.uCloudShade.value=l.cloudShade;
    }};
    // The source's static cubemap and multi-channel mountain painting. No per-frame volume ray marching.
    this.skyParts=createSkyParts(renderer,{cloudSize:1024,cloudSteps:150,liveClouds:false,backdropWidth:4096});
    this.sky=sourceSky(renderer,this.field,{parts:this.skyParts});this.skyGroup.name='Painted Valley original sky';this.skyGroup.add(this.sky.mesh);
    this.frame=createFrame(renderer,this.field,{samples:4,bloom:.075,exposure:1});this.frame.paint=2;
  }
  get hour(){return this.calendar.snapshot.hour;}
  get climate(){return this.calendar.snapshot;}
  async ready(){
    if(!this.readyPromise)this.readyPromise=(async()=>{await Promise.all([this.skyParts.clouds.compile(),this.skyParts.backdrop.compile()]);this.skyParts.backdrop.paint();this.applyClimate(true);await this.gpuDone();})();
    return this.readyPromise;
  }
  private async gpuDone(){
    const gl=this.renderer.getContext() as WebGL2RenderingContext;const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();if(!sync)return;
    await new Promise<void>(resolve=>{const poll=()=>{const status=gl.clientWaitSync(sync,0,0);if(status===gl.TIMEOUT_EXPIRED)setTimeout(poll,16);else{gl.deleteSync(sync);resolve();}};poll();});
  }
  async configureClimate(config:Partial<ClimateConfig>,options:{immediate?:boolean}={}){await this.ready();this.calendar.configure(config);this.applyClimate(options.immediate!==false);if(options.immediate!==false)await this.gpuDone();return this.climate;}
  async setHour(hour:number){return this.configureClimate({hour});}
  async setSeason(season:SeasonName|number){await this.ready();this.calendar.setSeason(season);this.applyClimate(true);await this.gpuDone();return this.climate;}
  private applyClimate(immediate:boolean){
    const state=this.calendar.snapshot,light=climateLighting(state);
    const key=new THREE.Vector3(...light.sunDir).multiplyScalar(1-light.night).addScaledVector(new THREE.Vector3(...light.moonDir),light.night);
    if(key.lengthSq()<.01)key.set(0,1,0);key.normalize();
    this.shared.uSeasonWeights.value.fromArray(state.seasonWeights);this.shared.uNight.value=light.night;this.shared.uSnowStrength.value=state.snowStrength;this.shared.uSunElevation.value=state.solarElevation;
    this.shared.uSolarDir.value.fromArray(light.sunDir);this.shared.uMoonDir.value.fromArray(light.moonDir);this.shared.uMoonColor.value.setRGB(...light.moonColor);this.shared.uStarIntensity.value=light.starIntensity;this.shared.uSunVisibility.value=light.sunVisibility;
    this.sky.applyClimate({...light,keyDir:key.toArray(),hour:state.hour,elevation:state.solarElevation},immediate);
    this.frame.exposure=light.exposure;this.climateApplied=true;
  }
  setVehicleLighting(position:THREE.Vector3,direction:THREE.Vector3,on:boolean|'auto'='auto'){
    this.shared.uHeadlightPosition.value.copy(position);this.shared.uHeadlightDirection.value.copy(direction).normalize();this.headlights=on;this.vehicleLightSet=true;
    this.shared.uHeadlightStrength.value=on==='auto'?this.climate.night:on?1:0;
  }
  setBiomeMaps(biome:THREE.DataTexture,climate:THREE.DataTexture){
    this.biomeTexture=biome;this.climateTexture=climate;this.shared.tBiome.value=biome;this.shared.tClimate.value=climate;
  }
  private updateLocalClimate(camera:THREE.Camera,dt:number){
    if(!this.biomeTexture||!this.climateTexture)return;
    const n=this.biomeTexture.image.width,origin=this.shared.uExtentMin.value,inv=this.shared.uExtentInv.value;
    const x=THREE.MathUtils.clamp(Math.round((camera.position.x-origin.x)*inv*(n-1)),0,n-1),z=THREE.MathUtils.clamp(Math.round((camera.position.z-origin.y)*inv*(n-1)),0,n-1),k=(x+z*n)*4;
    const biomes=this.biomeTexture.image.data as Uint8Array,climate=this.climateTexture.image.data as Uint8Array;
    const target=new THREE.Vector3(climate[k]/255,climate[k+1]/255,climate[k+2]/255);
    this.shared.uClimateFallback.value.copy(target);
    const snap=this.biomeEye.distanceToSquared(camera.position)>300*300||dt<=0;
    this.shared.uBackdropClimate.value.lerp(target,snap?1:1-Math.exp(-dt*.8));
    this.shared.uBackdropBiome.value.set(biomes[k],biomes[k+1],biomes[k+2]/255);this.biomeEye.copy(camera.position);
  }
  createSky(_seed=515){return{group:this.skyGroup,dispose:()=>{this.skyGroup.removeFromParent();}};}
  setWorldOrigin(x:number,z:number){this.shared.uWorldOrigin.value.set(x,0,z);this.shared.uHeroEye.value.set(-x,60,-z);}
  /** Exact contact-height callback in LOCAL render coordinates, optional for grass tile bounds. */
  setHeightSampler(fn:(x:number,z:number)=>number){this.nearHeight=fn;}
  setLandMaps(height:THREE.DataTexture,land:THREE.DataTexture,originX:number,originZ:number,span:number,resolution:number){
    this.shared.tHeight.value=height;this.shared.tRoadLand.value=land;this.shared.uExtentMin.value.set(originX,originZ);this.shared.uExtentInv.value=1/span;this.shared.uHeightRes.value=resolution;
    if(this.convertedSource===land&&this.convertedVersion===land.version)return;
    this.convertedSource=land;this.convertedVersion=land.version;
    const src=land.image.data as Uint8Array;const h=height.image.data as Float32Array;
    const pixels=new Uint8Array(resolution*resolution*4);
    const shadePixels=new Uint8Array(resolution*resolution);
    for(let i=0;i<resolution*resolution;i++){
      const k=i*4;shadePixels[i]=src[k+3];pixels[k]=30;pixels[k+1]=Math.round((1-src[k]/255)*(1-src[k+1]/255*.92)*(185+src[k+2]*.274));pixels[k+2]=0;pixels[k+3]=Math.round(pixels[k+1]*.19);
    }
    if(!this.growthTexture||this.growthTexture.image.width!==resolution){this.growthTexture?.dispose();this.growthTexture=new THREE.DataTexture(pixels,resolution,resolution);this.growthTexture.minFilter=this.growthTexture.magFilter=THREE.LinearFilter;}else this.growthTexture.image.data=pixels;
    this.growthTexture.needsUpdate=true;this.shared.tMap.value=this.growthTexture;
    if(!this.shadeTexture||this.shadeTexture.image.width!==resolution){this.shadeTexture?.dispose();this.shadeTexture=new THREE.DataTexture(shadePixels,resolution,resolution,THREE.RedFormat);this.shadeTexture.minFilter=this.shadeTexture.magFilter=THREE.LinearFilter;}else this.shadeTexture.image.data=shadePixels;
    this.shadeTexture.needsUpdate=true;this.shared.tShade.value=this.shadeTexture;
    // A deliberately broad slope, matching the source's 24m neighbourhood. No per-bump noisy shading.
    const n=128,slopes=new Uint8Array(n*n*2),stride=span/(resolution-1),jump=Math.max(1,Math.round(24/stride));
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      const ix=Math.round(x/(n-1)*(resolution-1)),iz=Math.round(z/(n-1)*(resolution-1));
      const x0=Math.max(0,ix-jump),x1=Math.min(resolution-1,ix+jump),z0=Math.max(0,iz-jump),z1=Math.min(resolution-1,iz+jump);
      const sx=(h[x1+iz*resolution]-h[x0+iz*resolution])/((x1-x0)*stride),sz=(h[ix+z1*resolution]-h[ix+z0*resolution])/((z1-z0)*stride);
      slopes[(x+z*n)*2]=Math.round(255*THREE.MathUtils.clamp(.5+sx*2,0,1));slopes[(x+z*n)*2+1]=Math.round(255*THREE.MathUtils.clamp(.5+sz*2,0,1));
    }
    if(!this.slopeTexture){this.slopeTexture=new THREE.DataTexture(slopes,n,n,THREE.RGFormat);this.slopeTexture.minFilter=this.slopeTexture.magFilter=THREE.LinearFilter;this.slopeTexture.unpackAlignment=1;}else this.slopeTexture.image.data=slopes;
    this.slopeTexture.needsUpdate=true;this.shared.tSlope.value=this.slopeTexture;
  }
  private heightAt(x:number,z:number){
    if(this.nearHeight)return this.nearHeight(x,z);
    const texture=this.shared.tHeight.value as THREE.DataTexture,n=texture.image.width,values=texture.image.data as Float32Array;if(n<2)return 0;
    const origin=this.shared.uExtentMin.value,span=1/this.shared.uExtentInv.value;
    const px=THREE.MathUtils.clamp((x-origin.x)/span*(n-1),0,n-1.001),pz=THREE.MathUtils.clamp((z-origin.y)/span*(n-1),0,n-1.001),ix=Math.floor(px),iz=Math.floor(pz),tx=px-ix,tz=pz-iz;
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(values[ix+iz*n],values[ix+1+iz*n],tx),THREE.MathUtils.lerp(values[ix+(iz+1)*n],values[ix+1+(iz+1)*n],tx),tz);
  }
  createGroundPaint(){
    // Source blade shaders, limited geometry density for a moving first-person view. Keep the same four
    // fade bands and shape progression; broad surface paint comes from the source meadow functions.
    const ringConfig=RINGS.map((r:any,i:number)=>({...r,cell:[.085,.15,.34,1.0][i]}));
    const blades=(createBlades as any)(this.shared,{height:.46,density:.62,seed:3,ringConfig},(x:number,z:number)=>this.heightAt(x,z));blades.init();
    const flowers=createFlowers(this.shared,{height:.44,seed:3},(x:number,z:number)=>this.heightAt(x,z));
    const group=new THREE.Group();group.name='Seasonal source meadow';group.add(blades.group,flowers.group);this.grass.push({blades,flowers,group});
    return {group,follow:(x:number,z:number)=>{blades.follow(x,z);flowers.follow(x,z);},dispose:()=>{group.removeFromParent();for(const r of blades.rings){r.geometry.dispose();r.material.dispose();}flowers.dispose();this.grass=this.grass.filter(x=>x.group!==group);}};
  }
  terrainMaterial(kind:PaletteName='grass'){
    let material=this.materials.get(kind);if(material)return material;
    material=kind==='grass'?this.meadowMaterial():this.surfaceMaterial(kind,false);this.attributeDefaults(material);this.materials.set(kind,material);return material;
  }
  private meadowMaterial(){
    return new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:this.shared,vertexShader:SURFACE_VERTEX,side:THREE.DoubleSide,fragmentShader:/*glsl*/`
      ${COMMON}\n${BIOME_PAINT}\nuniform sampler2D tRoadLand;in vec3 vWorld;in vec3 vNormal;in vec3 vLocal;in vec3 vClimate;layout(location=0)out vec4 outC;
      void main(){
        float dist=distance(vWorld,uCamPos);vec3 N=normalize(vNormal);float rel=slopeRel(N);
        float cloud=cloudAt(vWorld.xz);
        float tone=.6+(rel-.5)*mix(.6,.4,smoothstep(150.,450.,dist));
        vec3 g=meadowGreen(tone);
        g=paintGround(g,vWorld.xz,dist,0.);
        float sx=strokeCoord(vWorld);g=mix(g,landStrokes(g,vWorld.xz,dist,sx,fwidth(sx)),.32);
        float sy=strokeCoord2(vWorld.xz);g=mix(g,landStrokes(g,vWorld.xz,dist,sy,fwidth(sy)),.22);
        g=seasonalMeadow(g,tone,vClimate);
        g=blendBiomePigments(g,tone,N,vWorld);
        float snow=climateSnow(vClimate)*smoothstep(.2,.75,N.y);
        g=mix(g,snowPaint(tone),snow);
        vec3 c=g*meadowLight(cloud*slopeSun(rel))+g*headlightColor()*headlightAt(vWorld,N);
        vec2 uv=extentUv(vWorld.xz);if(all(greaterThan(uv,vec2(0.)))&&all(lessThan(uv,vec2(1.)))){
          vec4 road=texture(tRoadLand,uv);vec3 earth=vec3(.37,.34,.20)*(uSunColor*.35+uSkyColor*.45);
          earth=mix(earth,snowPaint(tone)*meadowLight(cloud),snow*.7);
          c=mix(c,earth,road.g*.85);vec3 asphalt=vec3(.20,.25,.25)*(uSunColor*.32+uSkyColor*.38)+vec3(.20,.25,.25)*headlightColor()*headlightAt(vWorld,N);c=mix(c,asphalt,road.r);
        }
        outC=vec4(applyFog(c,vWorld),mix(1.,.4,smoothstep(120.,200.,dist)));
      }`});
  }
  private attributeDefaults(material:THREE.ShaderMaterial){
    Object.assign(material.defaultAttributeValues,{aBiome:[0,0,0],aClimate:[.5,.1,0]});return material;
  }
  private surfaceMaterial(palette:PaletteName|Palette,ink:boolean){
    const id=ink ? .04+(this.inkCounter++%7)*.025 : .8;
    return this.attributeDefaults(new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{...this.shared,...paintUniforms(palette),uInk:{value:id}},vertexShader:SURFACE_VERTEX,side:THREE.DoubleSide,fragmentShader:/*glsl*/`
      ${COMMON}\n${LIGHT}\nin vec3 vWorld;in vec3 vNormal;in vec3 vLocal;layout(location=0)out vec4 outC;
      void main(){vec3 N=normalize(vNormal);if(dot(N,uCamPos-vWorld)<0.)N=-N;vec3 c=celPaint(N,vWorld);outC=vec4(applyFog(c,vWorld),uInk);}`}));
  }
  /** Solid cabin surfaces use the reference's cel paint and limited part-ID ink, not raised oil dabs. */
  paintMesh(mesh:THREE.Mesh,palette:PaletteName|Palette='cream',_options:MeshPaintOptions={}):PaintedMesh{
    const original=mesh.material,material=this.surfaceMaterial(palette,true);mesh.material=material;
    const strokes=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());strokes.visible=false;
    return{strokes,count:0,dispose(){mesh.material=original;material.dispose();strokes.geometry.dispose();(strokes.material as THREE.Material).dispose();}};
  }
  /** Compatibility surface marks (road paint): flat, fixed ribbons with the valley's lighting. */
  createDabs(samples:ReadonlyArray<DabSample>,kind:PaletteName|Palette='white',options:DabOptions={}){
    const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
    const N=new THREE.Vector3(),D=new THREE.Vector3(),B=new THREE.Vector3(),P=new THREE.Vector3();
    for(const sample of samples){
      P.fromArray(sample.pos);N.fromArray(sample.normal??[0,1,0]).normalize();D.fromArray(sample.dir??[0,0,-1]);D.addScaledVector(N,-D.dot(N)).normalize();if(D.lengthSq()<.001)D.set(0,0,-1);B.crossVectors(N,D).normalize();
      const first=positions.length/3;for(const[x,y]of[[-1,-1],[1,-1],[1,1],[-1,1]]){positions.push(P.x+B.x*x*sample.size[0]*.5+D.x*y*sample.size[1]*.5+N.x*.012,P.y+B.y*x*sample.size[0]*.5+D.y*y*sample.size[1]*.5+N.y*.012,P.z+B.z*x*sample.size[0]*.5+D.z*y*sample.size[1]*.5+N.z*.012);normals.push(N.x,N.y,N.z);uvs.push(x*.5+.5,y*.5+.5);}indices.push(first,first+1,first+2,first,first+2,first+3);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,this.surfaceMaterial(kind,false));mesh.renderOrder=options.order??2;return mesh;
  }
  update(camera:THREE.PerspectiveCamera,time:number){
    // Include the source cloud-strip pass in frame statistics, before the world/final pass.
    this.renderer.info.reset();
    const elapsed=Math.max(0,time-this.time),dt=Math.min(.1,elapsed);this.time=time;this.calendar.advance(elapsed);this.shared.uTime.value=time;this.shared.uWindScroll.value.set(time*.8*.98,time*.6*.98);camera.getWorldPosition(this.shared.uCamPos.value);
    this.cloudClock+=elapsed;if(!this.climateApplied||this.cloudClock>=.25){this.applyClimate(false);this.cloudClock=0;}
    this.updateLocalClimate(camera,dt);
    for(const meadow of this.grass)meadow.flowers.group.visible=this.climate.seasonWeights[0]+this.climate.seasonWeights[1]>.025;
    if(!this.vehicleLightSet){this.shared.uHeadlightPosition.value.copy(camera.position).y-=.75;camera.getWorldDirection(this.shared.uHeadlightDirection.value);}
    this.shared.uHeadlightStrength.value=this.headlights==='auto'?this.climate.night:this.headlights?1:0;
    this.sky.update(dt,camera);this.frame.exposure=this.sky.exposure;
  }
  render(scene:THREE.Scene,camera:THREE.Camera){this.frame.render(scene,camera);}
  resize(){/* Original frame.render fits all render targets to the current drawing buffer. */}
  dispose(){this.materials.forEach(m=>m.dispose());this.materials.clear();this.growthTexture?.dispose();this.slopeTexture?.dispose();this.shadeTexture?.dispose();this.textures.forEach(t=>t.dispose());this.frame.dispose();this.skyParts.clouds.dispose();this.skyParts.backdrop.dispose();this.sky.mesh.geometry.dispose();this.sky.mesh.material.dispose();}
}
export default ValleyPainter;
