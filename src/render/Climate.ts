/**
 * Continuous world calendar and lighting extension for Painted Valley.
 * Daytime color mixes are sampled directly from the original MIT source. That source has no
 * morning/night or seasons: solar path, nocturnal colors and calendar below are authored here.
 * This is game time, not a real-location astronomical or weather service.
 */
import { sampleDayLight } from './vendor/painted-valley/valley/sky.js';
export const SEASONS = ['spring','summer','autumn','winter'] as const;
export type SeasonName = typeof SEASONS[number];
export type Vec3 = [number,number,number];
export type SeasonWeights = [number,number,number,number];
export interface ClimateConfig {
  hour:number;
  seasonPhase:number;
  day:number;
  autoTime:boolean;
  dayLengthSeconds:number;
  yearLengthDays:number;
}
export interface ClimateSnapshot extends ClimateConfig {
  season:SeasonName;
  seasonWeights:SeasonWeights;
  sunDirection:Vec3;
  moonDirection:Vec3;
  solarElevation:number;
  night:number;
  snowStrength:number;
  leafRetention:number;
  daylightHours:number;
}
export interface LightPalette {
  sun:Vec3;amb:Vec3;bounce:Vec3;zenith:Vec3;mid:Vec3;horizon:Vec3;glow:Vec3;fog:Vec3;fogSun:Vec3;
  cloudLit:Vec3;cloudMid:Vec3;cloudShade:Vec3;cloudUnder:Vec3;haze:number;exposure:number;
}
export interface ClimateLight extends LightPalette { sunDir:Vec3;moonDir:Vec3;moonColor:Vec3;night:number;starIntensity:number;sunVisibility:number; }
export const DEFAULT_CLIMATE:Readonly<ClimateConfig>={hour:15.5,seasonPhase:.25,day:0,autoTime:true,dayLengthSeconds:1080,yearLengthDays:8};
const TAU=Math.PI*2,DEG=Math.PI/180;
export const wrap=(v:number,period:number)=>((v%period)+period)%period;
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const mix3=(a:Vec3,b:Vec3,t:number):Vec3=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const mul3=(a:Vec3,k:number):Vec3=>[a[0]*k,a[1]*k,a[2]*k];
const normalize=(a:Vec3):Vec3=>{const l=Math.hypot(...a)||1;return[a[0]/l,a[1]/l,a[2]/l];};

/** Only adjacent seasons mix, with zero slope at their centers and no discontinuity at year wrap. */
export function seasonWeights(phase:number):SeasonWeights{
  const p=wrap(phase,1)*4,i=Math.floor(p),t=smooth(0,1,p-i),out:SeasonWeights=[0,0,0,0];out[i]=1-t;out[(i+1)%4]=t;return out;
}
/** Simplified diurnal sun, with a seasonal declination. +Y is up and the original valley opens toward -Z. */
export function solarPosition(hour:number,seasonPhase:number,latitudeDegrees=44):{direction:Vec3;elevation:number;daylightHours:number}{
  const latitude=latitudeDegrees*DEG,declination=23.44*DEG*Math.sin(wrap(seasonPhase,1)*TAU),angle=(wrap(hour,24)-12)*Math.PI/12;
  const east=-Math.cos(declination)*Math.sin(angle);
  const north=Math.cos(latitude)*Math.sin(declination)-Math.sin(latitude)*Math.cos(declination)*Math.cos(angle);
  const up=Math.sin(latitude)*Math.sin(declination)+Math.cos(latitude)*Math.cos(declination)*Math.cos(angle);
  // Rotate compass axes to keep the source's afternoon light on the left/front of the initial road.
  const direction=normalize([north,up,east]);
  const halfDay=Math.acos(clamp(-Math.tan(latitude)*Math.tan(declination),-1,1));
  return{direction,elevation:Math.asin(clamp(up,-1,1))/DEG,daylightHours:halfDay/Math.PI*24};
}
export function climateSnapshot(config:ClimateConfig):ClimateSnapshot{
  const weights=seasonWeights(config.seasonPhase),solar=solarPosition(config.hour,config.seasonPhase);
  const night=1-smooth(-8,2,solar.elevation);
  let dominant=0;for(let i=1;i<4;i++)if(weights[i]>weights[dominant])dominant=i;
  const moonDirection=normalize([-solar.direction[0]+.12,-solar.direction[1]+.04,-solar.direction[2]-.09]);
  return{...config,season:SEASONS[dominant],seasonWeights:weights,sunDirection:solar.direction,moonDirection,solarElevation:solar.elevation,night,snowStrength:weights[3],leafRetention:1-weights[3]*.96-weights[2]*.12,daylightHours:solar.daylightHours};
}

const NIGHT:LightPalette={
  sun:[.005,.008,.018],amb:[.026,.042,.083],bounce:[.006,.012,.018],zenith:[.0025,.007,.025],mid:[.009,.023,.057],horizon:[.035,.060,.105],glow:[.008,.014,.027],fog:[.026,.048,.083],fogSun:[.035,.055,.09],
  cloudLit:[.14,.19,.29],cloudMid:[.066,.095,.16],cloudShade:[.027,.042,.082],cloudUnder:[.018,.03,.065],haze:.00023,exposure:1.1,
};
const TWILIGHT:LightPalette={
  sun:[.10,.055,.035],amb:[.080,.085,.18],bounce:[.023,.021,.035],zenith:[.010,.028,.105],mid:[.105,.105,.22],horizon:[.63,.245,.18],glow:[.8,.29,.13],fog:[.19,.16,.25],fogSun:[.5,.23,.19],
  cloudLit:[.62,.35,.37],cloudMid:[.27,.21,.34],cloudShade:[.095,.090,.21],cloudUnder:[.055,.060,.15],haze:.00024,exposure:1.08,
};
const RGB_KEYS=['sun','amb','bounce','zenith','mid','horizon','glow','fog','fogSun','cloudLit','cloudMid','cloudShade','cloudUnder'] as const;
function mixPalette(a:LightPalette,b:LightPalette,t:number):LightPalette{
  const out={} as LightPalette;for(const key of RGB_KEYS)out[key]=mix3(a[key],b[key],t);out.haze=lerp(a.haze,b.haze,t);out.exposure=lerp(a.exposure,b.exposure,t);return out;
}
/** Preserve the source's daytime colors exactly; extend only below its lowest 2° authored sun elevation. */
export function climateLighting(snapshot:ClimateSnapshot):ClimateLight{
  const e=snapshot.solarElevation;const day=sampleDayLight(Math.max(2,e)) as unknown as LightPalette;
  let palette:LightPalette;
  if(e>=2)palette={...day};
  else if(e>=-4)palette=mixPalette(TWILIGHT,day,smooth(-4,2,e));
  else palette=mixPalette(NIGHT,TWILIGHT,smooth(-12,-4,e));
  // The low disk vanishes below the horizon; moonlight remains cool and does not overexpose the meadow.
  const moonAltitude=smooth(-.02,.24,snapshot.moonDirection[1]);
  const moonColor=mul3([.13,.18,.29],snapshot.night*moonAltitude);
  const moonlight=mul3(moonColor,.34);
  if(snapshot.night>.01)palette.amb=[palette.amb[0]+moonlight[0],palette.amb[1]+moonlight[1],palette.amb[2]+moonlight[2]];
  return{...palette,sunDir:[...snapshot.sunDirection],moonDir:[...snapshot.moonDirection],moonColor,night:snapshot.night,starIntensity:(1-smooth(-12,-3,e))*moonAltitude,sunVisibility:smooth(-.8,.6,e)};
}

export class ClimateClock {
  private value:ClimateConfig;
  constructor(config:Partial<ClimateConfig>={}){this.value={...DEFAULT_CLIMATE};this.configure(config);}
  get snapshot(){return climateSnapshot(this.value);}
  configure(config:Partial<ClimateConfig>){
    if(Number.isFinite(config.hour))this.value.hour=wrap(config.hour!,24);
    if(Number.isFinite(config.seasonPhase))this.value.seasonPhase=wrap(config.seasonPhase!,1);
    if(Number.isFinite(config.day))this.value.day=Math.max(0,config.day!);
    if(typeof config.autoTime==='boolean')this.value.autoTime=config.autoTime;
    if(Number.isFinite(config.dayLengthSeconds))this.value.dayLengthSeconds=clamp(config.dayLengthSeconds!,1,86400);
    if(Number.isFinite(config.yearLengthDays))this.value.yearLengthDays=clamp(config.yearLengthDays!,1,366);
    return this.snapshot;
  }
  setSeason(season:SeasonName|number){return this.configure({seasonPhase:typeof season==='number'?season:SEASONS.indexOf(season)/4});}
  advance(seconds:number){
    if(!this.value.autoTime||!Number.isFinite(seconds)||seconds<=0)return this.snapshot;
    const days=seconds/this.value.dayLengthSeconds;
    const hours=this.value.hour+days*24;
    this.value.day+=Math.floor(hours/24);
    this.value.hour=wrap(hours,24);
    this.value.seasonPhase=wrap(this.value.seasonPhase+days/this.value.yearLengthDays,1);
    return this.snapshot;
  }
}
