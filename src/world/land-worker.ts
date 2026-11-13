import { biomeRender } from './biomes';
/** Bounded field sampling off the render thread. Results are transferred, never copied each frame. */
import { ROAD_HALF_WIDTH, SHOULDER_WIDTH, WorldField } from './field';
import { smooth } from './noise';
import { bakeTreeShadows } from './shadows';

interface Job { id: number; kind: 'land' | 'far' | 'horizon'; seed: string; x: number; z: number; span: number; resolution: number; sun?: number[];hole?:number;depression?:number }
let previousSeed = '', field = new WorldField();
const scope = self as unknown as { onmessage: ((event: MessageEvent<Job>) => void) | null; postMessage(message: unknown, transfer: Transferable[]): void };
scope.onmessage = ({ data: job }) => {
  if (job.seed !== previousSeed) { field = new WorldField(job.seed); previousSeed = job.seed; }
  if (job.kind === 'land') {
    const n = job.resolution, step = job.span / (n - 1), heights = new Float32Array(n * n), land = new Uint8Array(n * n * 4),biome = new Uint8Array(n*n*4),climate=new Uint8Array(n*n*4);
    for (let j = 0; j < n; j++) {
      const z = job.z + j * step, center = field.roadAt(-z);
      for (let i = 0; i < n; i++) {
        const x = job.x + i * step, k = j * n + i,b=field.biomeAt(x,z); heights[k] = field.height(x,z,b);
        const br=biomeRender(b);biome[k*4]=br[0];biome[k*4+1]=br[1];biome[k*4+2]=Math.round(b.mix*255);biome[k*4+3]=Math.round(b.vegetation*255);climate[k*4]=Math.round(b.coldness*255);climate[k*4+1]=Math.round(b.aridity*255);climate[k*4+2]=Math.round(b.permanentSnow*255);climate[k*4+3]=Math.round(b.water*255);
        const approx = Math.abs((x - center.position.x) * center.right.x),p=approx<12?field.project(x,z):null,d=p?Math.abs(p.lateral):approx,w=p?.halfWidth??center.halfWidth,shoulder=p?.shoulderWidth??center.shoulderWidth;
        land[k*4] = Math.round(255 * (1-smooth(w-.15,w+.15,d)));
        land[k*4+1] = Math.round(255 * (1-smooth(w+.6,w+shoulder+.65,d)));
        land[k*4+2] = Math.round(255 * field.richness(x,z)); land[k*4+3] = 0;
      }
    }
    bakeTreeShadows(field,land,job.x,job.z,job.span,n,job.sun??[-.6,.7,-.3]);
    scope.postMessage({ id: job.id, kind: job.kind, x: job.x, z: job.z, heights, land,biome,climate }, [heights.buffer,land.buffer,biome.buffer,climate.buffer]);
  } else {
    const cells = job.resolution, n = cells + 1, step = job.span / cells, positions = new Float32Array(n*n*3), normals = new Float32Array(n*n*3), indices = new Uint32Array(cells*cells*6),biomes=new Float32Array(n*n*3),climates=new Float32Array(n*n*3);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=(j*n+i)*3,lx=i*step,lz=j*step;positions[k]=lx;const b=field.biomeAt(job.x+lx,job.z+lz);positions[k+1]=field.height(job.x+lx,job.z+lz,b)-(job.depression??4);positions[k+2]=lz;biomes.set(biomeRender(b),k);climates[k]=b.coldness;climates[k+1]=b.aridity;climates[k+2]=b.permanentSnow;}
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const k=(j*n+i)*3,il=Math.max(0,i-1),ir=Math.min(cells,i+1),jt=Math.max(0,j-1),jb=Math.min(cells,j+1);
      const dx=(positions[(j*n+ir)*3+1]-positions[(j*n+il)*3+1])/((ir-il)*step),dz=(positions[(jb*n+i)*3+1]-positions[(jt*n+i)*3+1])/((jb-jt)*step),len=Math.hypot(dx,1,dz);
      normals[k]=-dx/len;normals[k+1]=1/len;normals[k+2]=-dz/len;
    }
    let count=0;
    for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
      if(Math.hypot((i+.5)*step-job.span/2,(j+.5)*step-job.span/2)<(job.hole??900))continue;
      const a=j*n+i,c=a+n;indices[count++]=a;indices[count++]=c;indices[count++]=a+1;indices[count++]=a+1;indices[count++]=c;indices[count++]=c+1;
    }
    scope.postMessage({ id:job.id,kind:job.kind,x:job.x,z:job.z,positions,normals,indices,biomes,climates,indexCount:count },[positions.buffer,normals.buffer,indices.buffer,biomes.buffer,climates.buffer]);
  }
};
