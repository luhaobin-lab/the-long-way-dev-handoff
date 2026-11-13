import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {ClimateClock,seasonWeights,solarPosition,climateLighting,climateSnapshot,DEFAULT_CLIMATE} from '../src/render/Climate.ts';

test('calendar wraps midnight and all four seasons without losing elapsed game time',()=>{
  const a=new ClimateClock({hour:23.75,seasonPhase:.99,dayLengthSeconds:120,yearLengthDays:4});
  const b=new ClimateClock({hour:23.75,seasonPhase:.99,dayLengthSeconds:120,yearLengthDays:4});
  a.advance(50);for(let i=0;i<500;i++)b.advance(.1);
  assert.equal(a.snapshot.day,1);assert.ok(a.snapshot.hour<24&&a.snapshot.hour>=0);
  assert.ok(Math.abs(a.snapshot.hour-b.snapshot.hour)<1e-9);assert.ok(Math.abs(a.snapshot.seasonPhase-b.snapshot.seasonPhase)<1e-9);
  const year=new ClimateClock({hour:12,seasonPhase:.25,dayLengthSeconds:60,yearLengthDays:8});year.advance(480);
  assert.equal(year.snapshot.day,8);assert.equal(year.snapshot.hour,12);assert.equal(year.snapshot.seasonPhase,.25);
});
test('all season blends are normalized and exact summer reproduces the unmodified summer weight',()=>{
  for(let p=-2;p<2;p+=.0037){const w=seasonWeights(p);assert.ok(w.every(x=>x>=0&&x<=1));assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-12);}
  assert.deepEqual(seasonWeights(.25),[0,1,0,0]);assert.deepEqual(seasonWeights(.75),[0,0,0,1]);
  assert.ok(Math.max(...seasonWeights(1-1e-7).map((x,i)=>Math.abs(x-seasonWeights(1e-7)[i])))<1e-10);
});
test('sun crosses the horizon, summer has longer daylight and winter shorter daylight',()=>{
  const summer=solarPosition(12,.25),winter=solarPosition(12,.75);
  assert.ok(summer.daylightHours>15);assert.ok(winter.daylightHours<9);
  assert.ok(summer.elevation>winter.elevation);assert.ok(solarPosition(0,.25).elevation<0);
  assert.ok(Math.abs(Math.hypot(...summer.direction)-1)<1e-12);
});
test('the complete day/night light curve stays finite and has no midnight or dawn step',()=>{
  for(const seasonPhase of [0,.25,.5,.75]){
    for(let hour=0;hour<24;hour+=.02){const snapshot=climateSnapshot({...DEFAULT_CLIMATE,hour,seasonPhase}),light=climateLighting(snapshot);for(const value of Object.values(light)){if(Array.isArray(value))assert.ok(value.every(Number.isFinite));else assert.ok(Number.isFinite(value));}}
    const a=climateLighting(climateSnapshot({...DEFAULT_CLIMATE,hour:23.99999,seasonPhase})),b=climateLighting(climateSnapshot({...DEFAULT_CLIMATE,hour:.00001,seasonPhase}));
    assert.ok(Math.max(...a.sunDir.map((x,i)=>Math.abs(x-b.sunDir[i])))<1e-5);assert.ok(Math.abs(a.night-b.night)<1e-5);
  }
  const noon=climateSnapshot({...DEFAULT_CLIMATE,hour:12}),night=climateSnapshot({...DEFAULT_CLIMATE,hour:0});
  assert.equal(noon.night,0);assert.equal(night.night,1);assert.ok(climateLighting(night).starIntensity>.9);
});
test('paused, invalid and backwards clock updates do not advance the world',()=>{
  const clock=new ClimateClock({autoTime:false});const start=clock.snapshot;clock.advance(60);assert.deepEqual(clock.snapshot,start);
  clock.configure({autoTime:true});const active=clock.snapshot;clock.advance(-1);clock.advance(Number.NaN);clock.advance(Infinity);assert.deepEqual(clock.snapshot,active);
});
