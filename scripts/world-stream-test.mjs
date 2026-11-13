import { launchBrowser } from './browser.mjs';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base=process.env.WORLD_TEST_URL||'http://127.0.0.1:5173',out=new URL('../artifacts/world-stream/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await launchBrowser({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1.5});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const runs=[];
try{
 await page.goto(`${base}/?test=1&seed=wildflower&quality=retina`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__roadtrip?.ready,{timeout:180000});
 await page.evaluate(()=>window.__roadtrip.start(false));
 for(const s of[240,256,512,2048,101000]){
  const begin=Date.now();await page.evaluate(async s=>{await window.__roadtrip.seek(s);window.__roadtrip.camera('driver');window.__roadtrip.look(0,0);window.__roadtrip.step(0)},s);
  const state=await page.evaluate(()=>window.__roadtrip.state()),metrics=await page.evaluate(()=>window.__roadtrip.metrics());
  await page.screenshot({path:fileURLToPath(new URL(`s-${s}.png`,out))});
  runs.push({s,loadMs:Date.now()-begin,state,metrics});
 }
 const checks=[{name:'worker completed sampling',pass:runs.every(r=>r.state.stream.samplerWorker&&r.state.stream.completedSamplingJobs>0)},{name:'bounded terrain tiles',pass:runs.every(r=>r.state.stream.terrainChunks<=137)},{name:'bounded road sections',pass:runs.every(r=>r.state.stream.roadChunks===23)},{name:'all capture coverage settled',pass:runs.every(r=>r.state.stream.pendingChunks===0&&r.state.stream.pendingVegetation===0&&!r.state.stream.mapBuilding&&!r.state.stream.farBuilding)},{name:'no console or shader errors',pass:errors.length===0}];
 await fs.writeFile(new URL('report.json',out),JSON.stringify({browser:`Chromium ${browser.version()}, ${process.platform} headless`,viewport:{width:1440,height:900,dpr:1.5},method:'Reproducible discontinuous seeks. This verifies regeneration and bounded resources, not continuous 101 km driving.',runs,checks,errors},null,2));console.log(JSON.stringify({checks,errors,runs:runs.map(r=>({s:r.s,loadMs:r.loadMs,stream:r.state.stream,metrics:r.metrics}))},null,2));
}finally{await browser.close();}
