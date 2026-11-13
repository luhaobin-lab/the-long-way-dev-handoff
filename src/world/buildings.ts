/** Streamed settlements built from Painted Valley's original procedural building shapes and shaders. */
import * as THREE from 'three';
import { shell,SHAPES,WALLS,ROOFS,buildingVertex,buildingFragment } from '../render/vendor/painted-valley/valley/village.js';
import { WorldField } from './field';
import { REGION_LENGTH } from './biomes';
import { hash,smooth } from './noise';
export interface WorldObstacle {x:number;z:number;radius:number}
export interface StructureResult {group:THREE.Group;colliders:WorldObstacle[];count:number}
interface Lot{x:number;y:number;z:number;turn:number;scale:number;shape:string;seed:number;wall:number[];roof:number[]}
export class VillageFactory{
 readonly material:THREE.ShaderMaterial;private readonly prototypes=new Map<string,THREE.BufferGeometry>();
 constructor(shared:any){
  const vertex=buildingVertex.replace('fract(m[3].x * 0.37 + m[3].z * 0.71)','fract((m[3].x+uWorldOrigin.x)*.37+(m[3].z+uWorldOrigin.z)*.71)');
  const fragment=buildingFragment.replace('vec3 L = normalize(uSunDir - normalize(vec3(vWorld.x, 0.0, vWorld.z)) * 0.75);','vec3 L=uSunDir;')
   .replace('float shadeOnly = 1.0;','float shadeOnly = 1.0;float warmWindow=0.0;')
   .replace('paint = mix(paint, vColor * 0.95, bars * pane * has);','paint = mix(paint, vColor * 0.95, bars * pane * has);warmWindow=pane*has*(1.0-bars)*step(.15,fract(seed*7.7+bay*.37+storey*.61));')
   .replace('vec3 col = paint * mix(sky, sun, lit) * shadeOnly;',`paint=mix(paint,vec3(.84,.9,.95),climateSnow(sampleClimate(vWorld.xz))*smoothstep(.12,.5,N.y));vec3 col=paint*mix(sky,sun,lit)*shadeOnly;col+=paint*headlightColor()*headlightAt(vWorld,N);col+=vec3(1.,.48,.12)*warmWindow*uNight*1.35;`);
  this.material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:fragment,uniforms:shared,side:THREE.DoubleSide});
  for(const[name,shape]of Object.entries(SHAPES) as any){const m=shell();shape.make(m);this.prototypes.set(name,m.build());}
 }
 create(field:WorldField,cx:number,cz:number,tile=256):StructureResult{
  const group=new THREE.Group(),colliders:WorldObstacle[]=[],lots:Lot[]=[],bx=cx*tile,bz=cz*tile;
  const s0=-bz-tile-80,s1=-bz+80;
  for(let index=Math.floor(s0/42);index<=Math.ceil(s1/42);index++){
   const s=index*42+hash(index,31,field.seed^5567)*11,road=field.roadAt(s),b=field.biomeAt(road.position.x,road.position.z),region=field.regionAt(s);
   const settlement=b.weights[8]*(1-smooth(950,1750,Math.abs(s-region.centerS)));if(settlement<.35)continue;
   for(const side of[-1,1]){
    const rand=(salt:number)=>hash(index,side*71+salt,field.seed^5581);if(rand(3)>settlement*.94)continue;
    const scale=.75+rand(7)*.45,u=side*(road.halfWidth+9+rand(11)*5),x=road.position.x+road.right.x*u,z=road.position.z+road.right.z*u;
    if(x<bx||x>=bx+tile||z<bz||z>=bz+tile)continue;
    const roll=rand(13),shape=roll<.42?'cottage':roll<.68?'house':roll<.81?'wing':roll<.93?'long':'tall';
    lots.push({x:x-bx,y:field.height(x,z)+.1,z:z-bz,turn:-road.heading+(side>0?-Math.PI/2:Math.PI/2),scale,shape,seed:rand(17),wall:WALLS[Math.floor(rand(19)*WALLS.length)],roof:ROOFS[Math.floor(rand(23)*ROOFS.length)]});
    colliders.push({x,z,radius:SHAPES[shape].reach*scale*.72});
   }
  }
  // One recognizable tower marks the center, set back far enough to keep the driving sightline open.
  const region=field.regionAt(-(bz+tile*.5));if(region.id===8){const r=field.roadAt(region.centerS+55),u=r.halfWidth+44,x=r.position.x+r.right.x*u,z=r.position.z+r.right.z*u;
   if(x>=bx&&x<bx+tile&&z>=bz&&z<bz+tile){lots.push({x:x-bx,y:field.height(x,z),z:z-bz,turn:-r.heading,scale:1,shape:'church',seed:region.seed,wall:WALLS[1],roof:ROOFS[3]});colliders.push({x,z,radius:8});}
  }
  for(const[shape,prototype]of this.prototypes){const mine=lots.filter(l=>l.shape===shape);if(!mine.length)continue;const geo=prototype.clone(),roof=new Float32Array(mine.length*3),wall=new Float32Array(mine.length*3),mesh=new THREE.InstancedMesh(geo,this.material,mine.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
   mine.forEach((lot,i)=>{q.setFromAxisAngle(up,lot.turn);matrix.compose(new THREE.Vector3(lot.x,lot.y,lot.z),q,new THREE.Vector3(lot.scale,lot.scale,lot.scale));mesh.setMatrixAt(i,matrix);roof.set(lot.roof,i*3);wall.set(lot.wall,i*3);});geo.setAttribute('aRoof',new THREE.InstancedBufferAttribute(roof,3));geo.setAttribute('aWall',new THREE.InstancedBufferAttribute(wall,3));mesh.computeBoundingSphere();group.add(mesh);
  }
  return{group,colliders,count:lots.length};
 }
 dispose(){this.material.dispose();this.prototypes.forEach(g=>g.dispose());this.prototypes.clear();}
}
