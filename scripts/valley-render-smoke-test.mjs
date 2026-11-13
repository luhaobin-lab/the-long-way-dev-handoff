/** Actual WebGL2 compiler, floating-origin and repeat-frame evidence; not a driving/visual acceptance test. */
import { launchBrowser } from './browser.mjs';
import fs from 'node:fs';
const out='artifacts/valley-renderer';fs.mkdirSync(out,{recursive:true});
const browser=await launchBrowser({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${process.env.GAME_URL??'http://127.0.0.1:5173'}/tests/valley-render-smoke.html`);
await page.waitForFunction(()=>window.smoke?.ready,null,{timeout:60000});
await page.screenshot({path:`${out}/smoke-03.png`});
await page.evaluate(()=>window.smoke.render());await page.screenshot({path:`${out}/repeat.png`});
const info=await page.evaluate(()=>({render:{...window.smoke.renderer.info.render},memory:{...window.smoke.renderer.info.memory},vendor:window.smoke.renderer.getContext().getParameter(7937)}));
await page.evaluate(()=>{
  const s=window.smoke;
  const x=512,z=-512;s.painter.setWorldOrigin(x,z);
  s.camera.position.x-=x;s.camera.position.z-=z;
  for(const object of s.scene.children)if(object!==s.ground.group&&object.name!=='Painted Valley original sky'){object.position.x-=x;object.position.z-=z;}
  s.painter.shared.uExtentMin.value.x-=x;s.painter.shared.uExtentMin.value.y-=z;s.render();
});
await page.screenshot({path:`${out}/rebased.png`});
fs.writeFileSync(`${out}/smoke-result.json`,JSON.stringify({errors,info,notes:['Repeated render uses same state and time','Rebased all scene objects/camera by512m X and-512m Z while absolute anchors remain unchanged','Image comparison is separate; this is not temporal motion testing']},null,2));
console.log(JSON.stringify({errors,info},null,2));await browser.close();if(errors.length)process.exitCode=1;
