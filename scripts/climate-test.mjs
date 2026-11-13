/** Real-browser climate fixtures and a bounded continuous-light performance run. */
import {launchBrowser} from './browser.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base=process.env.GAME_URL??'http://127.0.0.1:5173',out='artifacts/climate';fs.mkdirSync(out,{recursive:true});
const browser=await launchBrowser({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});const errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),location:m.location()})});page.on('pageerror',e=>errors.push({message:e.message}));
await page.goto(`${base}/tests/climate-fixture.html`);await page.waitForFunction(()=>window.climateFixture?.ready,null,{timeout:120000});
await page.evaluate(()=>{const s=window.climateFixture;s.renderer.setPixelRatio(2);s.renderer.setSize(1440,900);s.render();});
const states=[];
for(const [name,hour,seasonPhase]of[['summer',13,.25],['autumn',13,.5],['winter',13,.75],['spring',13,0],['dawn',5,.25],['sunset',19.5,.25],['night',0,.25]]){
 await page.evaluate(async({hour,seasonPhase})=>{const s=window.climateFixture;await s.painter.configureClimate({hour,seasonPhase,autoTime:false});s.render();},{hour,seasonPhase});
 await page.screenshot({path:`${out}/trees-${name}-02.png`});states.push(await page.evaluate(()=>window.climateFixture.painter.climate));
}
const performance=await page.evaluate(async()=>{
 const s=window.climateFixture;s.renderer.setPixelRatio(2);s.renderer.setSize(1440,900);await s.painter.configureClimate({hour:15.5,seasonPhase:.25,autoTime:true,dayLengthSeconds:1080});
 const frames=[],submit=[];let start=0,previous=0,count=0;
 await new Promise(resolve=>{function tick(now){if(!start)start=now;const began=performance.now();s.render((now-start)/1000);const elapsed=performance.now()-began;if(count>90){frames.push(now-previous);submit.push(elapsed)}previous=now;count++;if(now-start<15000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick)});
 const sort=a=>[...a].sort((x,y)=>x-y),p=(a,n)=>sort(a)[Math.min(a.length-1,Math.floor(a.length*n))],gl=s.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 return{measurement:'15-second real-time requestAnimationFrame in isolated source tree/grass/sky fixture; not full-game driving',frames:count,sampleCount:frames.length,fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),frameMs:{p50:p(frames,.5),p95:p(frames,.95),p99:p(frames,.99)},submitMs:{p50:p(submit,.5),p95:p(submit,.95)},drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),draw:{...s.renderer.info.render},memory:{...s.renderer.info.memory},climate:s.painter.climate,cloudPendingStrips:s.painter.skyParts.clouds.pendingStrips};
});
const hashes={};for(const file of ['src/render/Climate.ts','src/render/ValleyPainter.ts','src/render/vendor/painted-valley/valley/sky.js','src/render/vendor/painted-valley/lib/glsl.js'])hashes[file]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(`${out}/climate-browser-report.json`,JSON.stringify({errors,states,performance,hashes},null,2));console.log(JSON.stringify({errors,performance},null,2));await browser.close();if(errors.length)process.exitCode=1;
