import { clamp, hash, mix, noise1, noise2, smooth } from './noise';
export const BIOME_NAMES = ['plains','forest','basin','coast','snowmountain','desert','volcano','icefield','town'] as const;
export type BiomeName = typeof BIOME_NAMES[number];
export const BIOME_LABELS = ['The open plains','Whispering forest','The wide basin','The coastal road','The high passes','Amber dunes','The volcanic highlands','The blue icefields','A town along the way'] as const;
export const REGION_LENGTH = 6200;
export const BIOME_TRANSITION = 1600;
export interface BiomeDefinition { halfWidth:number; shoulder:number; cold:number; arid:number; snow:number; grass:number; trees:number; elevation:number; }
export const BIOMES:readonly BiomeDefinition[]=[
  {halfWidth:4.25,shoulder:1.25,cold:.42,arid:.12,snow:0,grass:1,trees:.15,elevation:35},
  {halfWidth:3.35,shoulder:1.05,cold:.55,arid:.08,snow:0,grass:.74,trees:.78,elevation:85},
  {halfWidth:3.95,shoulder:1.3,cold:.4,arid:.13,snow:0,grass:.88,trees:.22,elevation:30},
  {halfWidth:3.3,shoulder:1.1,cold:.13,arid:.24,snow:0,grass:.57,trees:.11,elevation:24},
  {halfWidth:3.05,shoulder:.95,cold:.96,arid:.28,snow:.78,grass:.16,trees:.09,elevation:310},
  {halfWidth:4.05,shoulder:1.4,cold:.04,arid:1,snow:0,grass:.015,trees:0,elevation:65},
  {halfWidth:3.45,shoulder:1.1,cold:.12,arid:.94,snow:0,grass:.008,trees:0,elevation:160},
  {halfWidth:3.55,shoulder:1.25,cold:1,arid:.44,snow:.98,grass:0,trees:0,elevation:155},
  {halfWidth:4.55,shoulder:1.6,cold:.39,arid:.17,snow:0,grass:.32,trees:.055,elevation:48},
];
export interface Region { index:number; id:number; name:BiomeName; centerS:number; seed:number; side:number; elevation:number }
export interface BiomeSample {
  id:number; name:BiomeName; label:string; primary:number; secondary:number; mix:number; weights:number[];
  regionA:Region; regionB:Region; coldness:number; aridity:number; permanentSnow:number; vegetation:number; treeDensity:number; water:number;
}
const mod=(x:number,n:number)=>((x%n)+n)%n;
const quintic=(t:number)=>t*t*t*(t*(t*6-15)+10);
const qd=(t:number)=>30*t*t*(t-1)*(t-1);
const qdd=(t:number)=>60*t*(2*t*t-3*t+1);
/** Region order is a seeded shuffle deck. The previous deck's last entry is unchanged by boundary swaps. */
export class BiomeSystem {
  private readonly decks=new Map<number,number[]>();
  private readonly regions=new Map<number,Region>();
  constructor(readonly seed:number){}
  private rawDeck(block:number):number[]{
    const values=BIOME_NAMES.map((_,i)=>i);
    for(let i=values.length-1;i>0;i--){const j=Math.floor(hash(block,i,this.seed^0x6c01)* (i+1));[values[i],values[j]]=[values[j],values[i]];}
    return values;
  }
  private deck(block:number):number[]{
    const cached=this.decks.get(block);if(cached)return cached;
    const values=this.rawDeck(block),previousLast=this.rawDeck(block-1)[8];
    if(values[0]===previousLast)[values[0],values[1]]=[values[1],values[0]];
    if(this.decks.size>=96)this.decks.clear();this.decks.set(block,values);return values;
  }
  region(index:number):Region{
    const cached=this.regions.get(index);if(cached)return cached;
    const id=this.deck(Math.floor(index/9))[mod(index,9)],r=hash(index,81,this.seed^0x7313);
    const result={index,id,name:BIOME_NAMES[id],centerS:index*REGION_LENGTH,seed:hash(index,19,this.seed^0x6f11)*100000,side:hash(index,61,this.seed^0x5771)<.5?-1:1,elevation:BIOMES[id].elevation*(.88+r*.24)};
    if(this.regions.size>=128)this.regions.clear();this.regions.set(index,result);return result;
  }
  atS(s:number):BiomeSample{
    const k=Math.floor(s/REGION_LENGTH),u=(s-k*REGION_LENGTH)/REGION_LENGTH;
    const band=BIOME_TRANSITION/REGION_LENGTH,t=quintic(clamp((u-(.5-band*.5))/band)),a=this.region(k),b=this.region(k+1),d=BIOMES[a.id],e=BIOMES[b.id],weights=Array(9).fill(0);weights[a.id]+=1-t;weights[b.id]+=t;
    const id=t<.5?a.id:b.id;
    return{id,name:BIOME_NAMES[id],label:BIOME_LABELS[id],primary:a.id,secondary:b.id,mix:t,weights,regionA:a,regionB:b,coldness:mix(d.cold,e.cold,t),aridity:mix(d.arid,e.arid,t),permanentSnow:mix(d.snow,e.snow,t),vegetation:mix(d.grass,e.grass,t),treeDensity:mix(d.trees,e.trees,t),water:weights[3]+weights[2]*.45};
  }
  at(x:number,z:number):BiomeSample{
    const warp=noise2(x/1900+17,z/2300-21,this.seed^0x1791)*180;
    return this.atS(-z+warp);
  }
  elevation(s:number):[number,number,number]{
    const k=Math.floor(s/REGION_LENGTH),t=(s-k*REGION_LENGTH)/REGION_LENGTH;
    const height=(i:number)=>this.region(i-1).elevation*.25+this.region(i).elevation*.5+this.region(i+1).elevation*.25;
    const a=height(k),b=height(k+1);
    return[mix(a,b,quintic(t)),(b-a)*qd(t)/REGION_LENGTH,(b-a)*qdd(t)/(REGION_LENGTH*REGION_LENGTH)];
  }
  roadWidth(s:number):number{
    const b=this.atS(s),w=mix(BIOMES[b.primary].halfWidth,BIOMES[b.secondary].halfWidth,b.mix);
    return Math.max(2.95,w+noise1(s/1300+71,this.seed^0x4431)*.14);
  }
  shoulder(s:number):number{const b=this.atS(s);return mix(BIOMES[b.primary].shoulder,BIOMES[b.secondary].shoulder,b.mix);}
  find(name:BiomeName,afterS=0):Region{
    const first=Math.ceil(afterS/REGION_LENGTH);for(let i=first;i<first+19;i++){const r=this.region(i);if(r.name===name)return r;}throw new Error(`Biome deck did not contain ${name}`);
  }
}
/** Collapse fully blended pairs before vertex interpolation so deck bookkeeping never makes a false biome. */
export function biomeRender(b:BiomeSample):[number,number,number]{
  return b.mix<=0?[b.primary,b.primary,0]:b.mix>=1?[b.secondary,b.secondary,1]:[b.primary,b.secondary,b.mix];
}
