/** Procedural tree shapes and shaders are the actual Painted Valley implementation (MIT, Patch 2026).
 * This adapter changes planting and batching only: the fixed original valley is replaced by seeded streamed groves.
 */
import * as THREE from 'three';
import { growTree, leafTexture, leafVertex, leafFragment, coreFragment, woodVertex, woodFragment } from '../render/vendor/painted-valley/valley/trees.js';
import type { TreeSpec } from './field';
import { hash } from './noise';

/** New conifer geometry, painted with the original leaf/core/bark shader family. */
function growPine(seed:number,wide=false):any{
  const height=wide?12:15,crown=wide?3.6:3.2,wood=new THREE.CylinderGeometry(.10,.29,height*.78,9,6).translate(0,height*.39,0),bark:number[]=[];
  const wuv=wood.attributes.uv;for(let i=0;i<wuv.count;i++)bark.push(wuv.getX(i),wuv.getY(i)*height*.78);wood.setAttribute('aBark',new THREE.Float32BufferAttribute(bark,2));
  const cp:number[]=[],cb:number[]=[],cr:number[]=[],lp:number[]=[],lu:number[]=[],lb:number[]=[],lr:number[]=[],li:number[]=[];
  for(let layer=0;layer<6;layer++){
    const y=1.4+layer*height*.127,r=crown*(1-layer*.145),h=height*.34;
    const cone=new THREE.ConeGeometry(r,h,17,2).translate(0,y+h*.5,0),g=cone.toNonIndexed(),p=g.attributes.position,n=g.attributes.normal;
    for(let i=0;i<p.count;i++){const ny=n.getY(i),tone=hash(layer,i,seed),wobble=1+.07*Math.sin(Math.atan2(p.getZ(i),p.getX(i))*7+layer);cp.push(p.getX(i)*wobble,p.getY(i),p.getZ(i)*wobble);cb.push(n.getX(i),ny,n.getZ(i));cr.push(tone,layer*.17,.55+.4*Math.max(0,ny),p.getY(i));}g.dispose();cone.dispose();
    for(let k=0;k<22;k++){
      const angle=k/22*Math.PI*2+layer*.37,rad=r*(.77+hash(k,layer,seed)*.22),at=new THREE.Vector3(Math.cos(angle)*rad,y+.2+hash(k,layer,seed^91)*h*.30,Math.sin(angle)*rad),N=new THREE.Vector3(Math.cos(angle),.28,Math.sin(angle)).normalize(),D=new THREE.Vector3(-Math.sin(angle),.18,Math.cos(angle)).normalize(),B=new THREE.Vector3().crossVectors(N,D).normalize(),first=lp.length/3,sz=.55+r*.12;
      for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const v=at.clone().addScaledVector(D,sx*sz).addScaledVector(B,sy*sz*.6);lp.push(v.x,v.y,v.z);lu.push(sx*.5+.5,sy*.5+.5);lb.push(N.x,N.y,N.z);lr.push(hash(k,layer,seed),layer*.17,.75,at.y);}li.push(first,first+1,first+2,first,first+2,first+3);
    }
  }
  const core=new THREE.BufferGeometry();core.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));core.setAttribute('aBall',new THREE.Float32BufferAttribute(cb,3));core.setAttribute('aRand',new THREE.Float32BufferAttribute(cr,4));
  const leaves=new THREE.BufferGeometry();leaves.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));leaves.setAttribute('uv',new THREE.Float32BufferAttribute(lu,2));leaves.setAttribute('aBall',new THREE.Float32BufferAttribute(lb,3));leaves.setAttribute('aRand',new THREE.Float32BufferAttribute(lr,4));leaves.setIndex(li);
  return{wood,core,leaves,crown,crownY:height*.56,height};
}

export class ValleyTreeBatches {
  readonly group = new THREE.Group();
  private readonly prototypes: any[];
  private readonly batches: { wood: THREE.InstancedMesh; core: THREE.InstancedMesh; leaves: THREE.InstancedMesh; climate:THREE.InstancedBufferAttribute }[];
  private readonly materials: THREE.ShaderMaterial[];
  private readonly texture: THREE.Texture;
  private readonly capacity = 2048;
  count = 0;
  constructor(shared: Record<string, THREE.IUniform>) {
    const configs = [
      { trunk: 2.6, girth: .42, crown: 5.6, rise: 8.2, limbs: 4, clump: 1.9, fill: 9, cards: 26, spray: 1.28 },
      { trunk: 3.3, girth: .36, crown: 4.6, rise: 9.6, limbs: 4, clump: 1.7, fill: 10, cards: 26, spray: 1.25 },
      { trunk: 2.2, girth: .5, crown: 6.6, rise: 7.2, limbs: 5, clump: 2.1, fill: 8, cards: 26, spray: 1.28 },
    ];
    this.prototypes = [...configs.map((c, i) => growTree([23,37,51][i], c)),growPine(97),growPine(109,true)];
    this.texture = leafTexture();
    this.materials=[];
    const makeMaterials=(evergreen:number)=>{
      const uniforms={...shared,tLeaf:{value:this.texture},uEvergreen:{value:evergreen}};
      const leaves=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:leafVertex,fragmentShader:leafFragment,uniforms,side:THREE.DoubleSide,alphaToCoverage:true});
      const wood=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:woodVertex,fragmentShader:woodFragment,uniforms});
      const core=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:leafVertex,fragmentShader:coreFragment,uniforms,side:THREE.DoubleSide,alphaToCoverage:true});
      this.materials.push(leaves,wood,core);return{leaves,wood,core};
    };
    const deciduous=makeMaterials(0),conifer=makeMaterials(1);
    this.batches=this.prototypes.map((p,k)=>{
      const m=k<3?deciduous:conifer,climate=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*3),3);climate.setUsage(THREE.DynamicDrawUsage);
      for(const g of[p.leaves,p.wood,p.core])g.setAttribute('aTreeClimate',climate);
      const b={leaves:new THREE.InstancedMesh(p.leaves,m.leaves,this.capacity),wood:new THREE.InstancedMesh(p.wood,m.wood,this.capacity),core:new THREE.InstancedMesh(p.core,m.core,this.capacity),climate};
      for(const mesh of[b.leaves,b.wood,b.core]){mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.group.add(mesh);}return b;
    });
    this.group.name = 'painted-valley-original-tree-batches';
  }
  setTrees(trees: TreeSpec[], origin: { x: number; z: number }): void {
    const counts = this.prototypes.map(()=>0), matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), pos = new THREE.Vector3(), scale = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
    for (const t of trees) {
      const k = t.kind, i = counts[k];
      if (i >= this.capacity) continue;
      const prototype = this.prototypes[k], s = t.height / prototype.height;
      pos.set(t.x - origin.x, t.y, t.z - origin.z); turn.setFromAxisAngle(up, t.seed); scale.set(s, s * (.94 + hash(Math.floor(t.x),Math.floor(t.z),1747) * .12), s);
      matrix.compose(pos, turn, scale);
      const batch=this.batches[k];for (const mesh of [batch.leaves,batch.wood,batch.core]) mesh.setMatrixAt(i, matrix);
      batch.climate.setXYZ(i,...t.climate);
      counts[k]++;
    }
    this.batches.forEach((batch,k) => { for (const mesh of [batch.leaves,batch.wood,batch.core]) { mesh.count = counts[k]; mesh.instanceMatrix.needsUpdate = true; } batch.climate.needsUpdate=true; });
    this.count = counts.reduce((a,b)=>a+b,0);
  }
  dispose(): void {
    this.group.removeFromParent(); this.prototypes.forEach(p => { p.wood.dispose(); p.core.dispose(); p.leaves.dispose(); }); this.materials.forEach(m=>m.dispose()); this.texture.dispose();
  }
}
