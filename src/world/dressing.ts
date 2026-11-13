/** Biome-specific, procedural foreground props. Shared materials use Painted Valley's light/fog helpers. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COMMON } from '../render/vendor/painted-valley/lib/glsl.js';
import { WorldField } from './field';
import { hash,smooth } from './noise';
import type {WorldObstacle} from './buildings';
interface PropResult{group:THREE.Group;colliders:WorldObstacle[];count:number}
export class BiomeDressing{
 private readonly materials=new Map<string,THREE.ShaderMaterial>();
 constructor(private readonly shared:any){
  this.addMaterial('stone',[.46,.50,.48],[.19,.26,.30]);this.addMaterial('sandstone',[.65,.43,.23],[.32,.23,.19]);this.addMaterial('basalt',[.18,.20,.23],[.065,.075,.09]);
  this.addMaterial('cactus',[.23,.38,.19],[.075,.18,.12]);this.addMaterial('ice',[.60,.83,.92],[.22,.44,.60]);this.addMaterial('metal',[.25,.27,.25],[.1,.14,.14]);this.addMaterial('paving',[.62,.57,.45],[.34,.38,.36]);this.addMaterial('lamp',[.95,.82,.51],[.38,.31,.18],[1,.62,.21]);
 }
 private addMaterial(name:string,light:number[],shade:number[],emission:number[]=[0,0,0]){
  const material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{...this.shared,uPropLight:{value:new THREE.Vector3(...light)},uPropShade:{value:new THREE.Vector3(...shade)},uPropGlow:{value:new THREE.Vector3(...emission)}},side:THREE.DoubleSide,vertexShader:`out vec3 vWorld;out vec3 vNormal;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`${COMMON}\nuniform vec3 uPropLight,uPropShade,uPropGlow;in vec3 vWorld,vNormal;layout(location=0)out vec4 outC;void main(){vec3 N=normalize(vNormal);float lit=smoothstep(.02,.15,dot(N,uSunDir));vec3 sky=mix(uSkyColor,vec3(dot(uSkyColor,vec3(.333))),.5)+.06;vec3 col=mix(uPropShade*sky,uPropLight*(uSunColor*.42+uSkyColor*.3),lit);col+=uPropLight*headlightColor()*headlightAt(vWorld,N);col+=uPropGlow*uNight*2.;outC=vec4(applyFog(col,vWorld),.8);}`});
  this.materials.set(name,material);
 }
 owns(material:THREE.Material){return [...this.materials.values()].includes(material as THREE.ShaderMaterial);}
 create(field:WorldField,cx:number,cz:number,tile=256):PropResult{
  const group=new THREE.Group(),colliders:WorldObstacle[]=[],parts=new Map<string,THREE.BufferGeometry[]>(),bx=cx*tile,bz=cz*tile;let count=0;
  const add=(kind:string,g:THREE.BufferGeometry,x:number,y:number,z:number,rotation=0)=>{g.rotateY(rotation).translate(x,y,z);if(!parts.has(kind))parts.set(kind,[]);parts.get(kind)!.push(g);};
  const step=31,minx=Math.floor(bx/step),maxx=Math.ceil((bx+tile)/step),minz=Math.floor(bz/step),maxz=Math.ceil((bz+tile)/step);
  for(let iz=minz;iz<=maxz;iz++)for(let ix=minx;ix<=maxx;ix++){
   const rand=(salt:number)=>hash(ix,iz,field.seed^salt),x=(ix+.15+rand(281)*.7)*step,z=(iz+.15+rand(283)*.7)*step;
   if(x<bx||x>=bx+tile||z<bz||z>=bz+tile)continue;
   const b=field.biomeAt(x,z),road=field.project(x,z),d=Math.abs(road.lateral);if(d<road.halfWidth+4||field.waterLevelAt(x,z)!==null)continue;
   const lx=x-bx,lz=z-bz,y=field.height(x,z),r=rand(293),scale=.7+rand(307)*2.2;
   if(b.weights[5]>.45&&r<.18){
    const h=2+rand(311)*3.8,rad=.16+rand(313)*.15;add('cactus',new THREE.CylinderGeometry(rad*.8,rad,h,8,3),lx,y+h*.5,lz);add('cactus',new THREE.SphereGeometry(rad*.82,8,4),lx,y+h,lz);
    for(const side of[-1,1]){const armY=h*(.35+rand(side+317)*.2),reach=.5+rand(side+331)*.55,armH=.7+rand(side+337)*1.2;add('cactus',new THREE.CylinderGeometry(rad*.57,rad*.7,reach,7).rotateZ(Math.PI/2),lx+side*reach*.5,y+armY,lz);add('cactus',new THREE.CylinderGeometry(rad*.52,rad*.6,armH,7),lx+side*reach,y+armY+armH*.5,lz);add('cactus',new THREE.SphereGeometry(rad*.53,7,4),lx+side*reach,y+armY+armH,lz);}colliders.push({x,z,radius:rad+.15});count++;
   }else if(b.weights[7]>.4&&r<.25){
    for(let k=0;k<3;k++){const h=(1.3+rand(347+k)*4)*scale*.65,g=new THREE.CylinderGeometry(.08,.45*scale,h,5,1).rotateZ((rand(353+k)-.5)*.5);add('ice',g,lx+(k-1)*.7*scale,y+h*.38,lz+(rand(359+k)-.5)*scale,rand(367+k)*6.28);}colliders.push({x,z,radius:scale*.8});count++;
   }else if(r<(b.weights[6]>.3?.34:b.weights[4]>.3?.18:.055)){
    const kind=b.weights[5]>.35?'sandstone':b.weights[6]>.35?'basalt':b.weights[7]>.3?'ice':'stone';
    const g=new THREE.IcosahedronGeometry(1,b.weights[6]>.3?0:1).scale(scale,scale*(.5+rand(373)*.6),scale*.75);add(kind,g,lx,y+scale*.22,lz,rand(379)*6.28);if(scale>1.3)colliders.push({x,z,radius:scale*.65});count++;
   }
  }
  // Town sidewalks and lamps follow the road frame; their footprint leaves both driving lanes clear.
  for(let index=Math.floor((-bz-tile-20)/28);index<=Math.ceil((-bz+20)/28);index++){
   const s=index*28,r=field.roadAt(s),b=field.biomeAt(r.position.x,r.position.z),region=field.regionAt(s),strength=b.weights[8]*(1-smooth(1000,1700,Math.abs(s-region.centerS)));if(strength<.45)continue;
   for(const side of[-1,1]){
    const u=side*(r.halfWidth+r.shoulderWidth+1.1),x=r.position.x+r.right.x*u,z=r.position.z+r.right.z*u;if(x<bx||x>=bx+tile||z<bz||z>=bz+tile)continue;
    const y=field.height(x,z),lx=x-bx,lz=z-bz;add('paving',new THREE.BoxGeometry(2.0,.12,28.4),lx,y+.04,lz,-r.heading);
    if(index%2===0){const poleU=side*.7;add('metal',new THREE.CylinderGeometry(.065,.085,4.5,7),lx+r.right.x*poleU,y+2.25,lz+r.right.z*poleU);add('metal',new THREE.BoxGeometry(.48,.13,.48),lx+r.right.x*poleU,y+4.5,lz+r.right.z*poleU);add('lamp',new THREE.BoxGeometry(.32,.3,.32),lx+r.right.x*poleU,y+4.28,lz+r.right.z*poleU);colliders.push({x:x+r.right.x*poleU,z:z+r.right.z*poleU,radius:.1});count++;}
   }
  }
  for(const[kind,geometries]of parts){const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(merged){merged.computeBoundingSphere();group.add(new THREE.Mesh(merged,this.materials.get(kind)!));}}
  return{group,colliders,count};
 }
 dispose(){this.materials.forEach(m=>m.dispose());this.materials.clear();}
}
