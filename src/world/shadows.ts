/** Streamed form of Painted Valley's tree-crown shadow bake (MIT, Patch 2026).
 * Coordinates and silhouettes are deterministic; sunlight changes are rebuilt explicitly.
 */
import { WorldField } from './field';
import { smooth } from './noise';
export function bakeTreeShadows(field: WorldField, land: Uint8Array, x0: number, z0: number, span: number, n: number, sun: readonly number[]): void {
  const flat = Math.hypot(sun[0],sun[2]) || .001, sx = sun[0]/flat, sz = sun[2]/flat, slope = flat/Math.max(sun[1],.12), step = span/(n-1), margin = 140;
  const minx = Math.floor((x0-margin)/22), maxx = Math.ceil((x0+span+margin)/22), minz = Math.floor((z0-margin)/22), maxz = Math.ceil((z0+span+margin)/22);
  for(let iz=minz;iz<=maxz;iz++)for(let ix=minx;ix<=maxx;ix++){
    const t=field.treeAt(ix,iz);if(!t)continue;
    const r=t.crown*1.02,long=Math.hypot(r,t.height*.28*slope),cx=t.x-sx*t.height*.56*slope,cz=t.z-sz*t.height*.56*slope,reach=long+2;
    const i0=Math.max(0,Math.floor((cx-reach-x0)/step)),i1=Math.min(n-1,Math.ceil((cx+reach-x0)/step)),j0=Math.max(0,Math.floor((cz-reach-z0)/step)),j1=Math.min(n-1,Math.ceil((cz+reach-z0)/step));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const dx=x0+i*step-cx,dz=z0+j*step-cz,al=(dx*sx+dz*sz)/long,ac=(-dx*sz+dz*sx)/r,d=Math.hypot(al,ac);if(d>=1.08)continue;
      const angle=Math.atan2(ac,al),edge=.9+.09*Math.sin(angle*5+t.x)+.06*Math.sin(angle*9+t.z),v=Math.round(255*(1-smooth(edge-.16,edge+.04,d))),k=(i+j*n)*4+3;
      if(v>land[k])land[k]=v;
    }
  }
}
