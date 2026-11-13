import {launchBrowser} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {WorldField} from '../src/world/field';
import {BIOME_NAMES} from '../src/world/biomes';
const seed=process.env.BIOME_TEST_SEED??'wildflower',base=process.env.WORLD_TEST_URL??'http://127.0.0.1:5173',out=path.resolve(process.env.BIOME_TEST_OUT??'artifacts/biomes-v1'),field=new WorldField(seed);
await fs.mkdir(out,{recursive:true});
const browser=await launchBrowser({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1.25});
const errors:any[]=[],responses:any[]=[],frames:any[]=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()})});
try{
 await page.goto(`${base}/?test=1&seed=${seed}&quality=retina`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>(window as any).__roadtrip?.ready,{timeout:180000});
 await page.evaluate(()=>(window as any).__roadtrip.start(false));
 for(const name of BIOME_NAMES){
  const region=field.findBiome(name),begin=Date.now();await page.evaluate(async s=>{await (window as any).__roadtrip.seek(s);(window as any).__roadtrip.camera('cabin');(window as any).__roadtrip.look(0,0);},region.centerS);
  await page.screenshot({path:path.join(out,`${name}-cabin.png`)});
  await page.evaluate(()=>(window as any).__roadtrip.camera('exterior'));await page.screenshot({path:path.join(out,`${name}-exterior.png`)});
  if(name==='coast'||name==='basin'||name==='volcano'){await page.evaluate(side=>{(window as any).__roadtrip.camera('cabin');(window as any).__roadtrip.look(side*.65,0);},name==='coast'?-region.side:region.side);await page.screenshot({path:path.join(out,`${name}-vista.png`)});}
  const state=await page.evaluate(()=>(window as any).__roadtrip.state()),metrics=await page.evaluate(()=>(window as any).__roadtrip.metrics());frames.push({name,region,loadMs:Date.now()-begin,state,metrics});console.log(`${name}:s=${region.centerS} trees=${state.stream.trees} props=${state.stream.props} buildings=${state.stream.buildings} textures=${metrics.memory.textures}`);
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({seed,method:'Fixed-seed discontinuous biome-center seeks. These are actual browser frames, not continuous-travel or framerate proof.',frames,errors,responses},null,2));console.log(JSON.stringify({frames:frames.length,errors,responses}));
}finally{await browser.close();}
