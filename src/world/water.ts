/** Actual Painted Valley tarn shader, adapted to streamed coasts and deterministic basin lakes. MIT, Patch 2026. */
import * as THREE from 'three';
import { waterVertex,waterFragment } from '../render/vendor/painted-valley/valley/water.js';
import { WorldField } from './field';
import { REGION_LENGTH } from './biomes';
interface WaterPainter { shared:any;sky:any }
export class WorldWater {
 readonly group=new THREE.Group();private readonly ocean:THREE.Mesh;private lakes=new Map<number,THREE.Mesh>();private key='';private readonly material:THREE.ShaderMaterial;
 constructor(private readonly field:WorldField,private readonly painter:WaterPainter){
  const u=painter.sky.uniforms;
  const fragment=waterFragment.replace('float depth = vWorld.y - groundAt(xz);',`vec2 euv=extentUv(xz);float inside=step(0.0,euv.x)*step(euv.x,1.0)*step(0.0,euv.y)*step(euv.y,1.0);float depth=mix(20.0,vWorld.y-groundAt(xz),inside);`)
   .replace('vec2 flow = uWind.xy * uTime;','vec2 flow = uWind.xy * uTime; vec2 stableXZ=xz+uWorldOrigin.xz;')
   .replace('(xz - flow * 0.22)','(stableXZ - flow * 0.22)').replace('(xz.yx + flow * 0.31)','(stableXZ.yx + flow * 0.31)');
  const uniforms={...painter.shared,uZenith:u.uZenith,uMid:u.uMid,uHorizon:u.uHorizon,uGlow:u.uGlow,tClouds:u.tClouds,uTarn:{value:new THREE.Vector4(0,0,1e7,1e7)},uAlong:{value:new THREE.Vector2(0,-1)}};
  this.material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:waterVertex,fragmentShader:fragment,uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  const geometry=new THREE.PlaneGeometry(42000,42000).rotateX(-Math.PI/2);this.ocean=new THREE.Mesh(geometry,this.material);this.ocean.name='continuous-ocean-sea-level';this.ocean.renderOrder=5;this.group.add(this.ocean);
 }
 update(x:number,z:number,origin:{x:number;z:number}):void{
  this.ocean.position.set(Math.floor(x/1024)*1024-origin.x,0,Math.floor(z/1024)*1024-origin.z);
  const k=Math.round(-z/REGION_LENGTH),key=`${k}`;
  if(key!==this.key){this.key=key;const needed=new Set<number>();
   for(let i=k-2;i<=k+2;i++){const r=this.field.biomes.region(i);if(r.id!==2)continue;needed.add(i);if(this.lakes.has(i))continue;
    const f=this.field.feature(r),material=this.material.clone();material.uniforms={...this.material.uniforms,uTarn:{value:new THREE.Vector4(f.x-origin.x,f.z-origin.z,f.radius,f.length)}};
    const geometry=new THREE.PlaneGeometry(f.radius*2.65,f.length*2.65).rotateX(-Math.PI/2),mesh=new THREE.Mesh(geometry,material);mesh.userData.feature=f;mesh.name=`basin-lake-${i}`;mesh.position.set(f.x-origin.x,f.water,f.z-origin.z);mesh.renderOrder=5;this.lakes.set(i,mesh);this.group.add(mesh);
   }
   for(const[i,mesh]of this.lakes)if(!needed.has(i)){mesh.removeFromParent();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();this.lakes.delete(i);}
  }
  for(const mesh of this.lakes.values()){const f=mesh.userData.feature;mesh.position.set(f.x-origin.x,f.water,f.z-origin.z);(mesh.material as THREE.ShaderMaterial).uniforms.uTarn.value.set(f.x-origin.x,f.z-origin.z,f.radius,f.length);}
 }
 dispose(){this.group.removeFromParent();this.ocean.geometry.dispose();this.material.dispose();for(const mesh of this.lakes.values()){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.lakes.clear();}
}
