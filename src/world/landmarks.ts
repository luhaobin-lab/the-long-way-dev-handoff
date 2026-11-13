import * as THREE from 'three';
import {COMMON} from '../render/vendor/painted-valley/lib/glsl.js';
import {WorldField} from './field';
import {REGION_LENGTH} from './biomes';
/** Regional volcanic flows share the exact height function and keep clear of the road corridor. */
export class RegionalLandmarks{
 readonly group=new THREE.Group();private readonly material:THREE.ShaderMaterial;private readonly regions=new Map<number,THREE.Group>();
 constructor(private readonly field:WorldField,shared:any){
  this.material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,side:THREE.DoubleSide,vertexShader:`out vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`${COMMON}\nin vec3 vWorld;layout(location=0)out vec4 outC;void main(){vec3 p=vWorld+uWorldOrigin;float crust=texture(tNoiseHi,p.xz/7.0+p.y*.013).r;float split=smoothstep(.42,.68,crust);vec3 lava=mix(vec3(.12,.035,.02),vec3(1.15,.21,.015),split);lava+=vec3(.75,.32,.025)*smoothstep(.75,.92,crust);lava*=.75+uNight*.55;outC=vec4(applyFog(lava,vWorld),.5);}`});
 }
 update(x:number,z:number,origin:{x:number;z:number}):void{
  const k=Math.round(-z/REGION_LENGTH),needed=new Set<number>();
  for(let i=k-2;i<=k+2;i++){
   const region=this.field.biomes.region(i);if(region.id!==6)continue;needed.add(i);
   if(!this.regions.has(i)){
    const feature=this.field.feature(region),group=new THREE.Group(),road=this.field.roadAt(region.centerS),toward=Math.atan2(road.position.z-feature.z,road.position.x-feature.x),pos:number[]=[],idx:number[]=[];
    for(let flow=0;flow<5;flow++){
     let previous=-1;const angle=toward+(flow-2)*.5;
     for(let row=0;row<=50;row++){
      const radius=155+row*18,turn=angle+Math.sin(row*.15+flow)*.1,width=3+Math.sin(row*.21+flow)*2+row*.09,x=feature.x+Math.cos(turn)*radius,z=feature.z+Math.sin(turn)*radius,p=this.field.project(x,z);
      if(Math.abs(p.lateral)<p.halfWidth+80){previous=-1;continue;}
      const first=pos.length/3;
      for(const side of[-1,1]){const xx=x-Math.sin(turn)*width*side,zz=z+Math.cos(turn)*width*side;pos.push(xx-feature.x,this.field.height(xx,zz)+.18,zz-feature.z);}
      if(previous>=0)idx.push(previous,previous+1,first,previous+1,first+1,first);previous=first;
     }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setIndex(idx);geometry.computeBoundingSphere();group.add(new THREE.Mesh(geometry,this.material));
    const pool=new THREE.Mesh(new THREE.CircleGeometry(150,56).rotateX(-Math.PI/2),this.material);pool.position.y=this.field.height(feature.x,feature.z)+2;group.add(pool);group.userData.anchor=feature;this.regions.set(i,group);this.group.add(group);
   }
  }
  for(const[i,group]of this.regions){if(!needed.has(i)){group.removeFromParent();group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});this.regions.delete(i);}else{const f=group.userData.anchor;group.position.set(f.x-origin.x,0,f.z-origin.z);}}
 }
 dispose(){this.group.removeFromParent();this.regions.forEach(g=>g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()}));this.regions.clear();this.material.dispose();}
}
