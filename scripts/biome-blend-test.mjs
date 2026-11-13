/** Actual GPU regression: equivalent biome weights must produce the same pixels at collapsed pair endpoints. */
import {launchBrowser} from './browser.mjs';
import fs from 'node:fs';
const out='artifacts/biome-blend',base=process.env.GAME_URL??'http://127.0.0.1:5173';fs.mkdirSync(out,{recursive:true});
const browser=await launchBrowser({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:640}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
 await page.goto(`${base}/tests/biome-blend-fixture.html`);await page.waitForFunction(()=>window.biomeBlendFixture?.ready);
 const comparison=await page.evaluate(()=>{
  const f=window.biomeBlendFixture;f.render();const gl=f.renderer.getContext(),pixels=new Uint8Array(1280*640*4);
  gl.readPixels(0,0,1280,640,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let maximumDifference=0,sum=0,samples=0;
  for(let x=42;x<1238;x++)for(let channel=0;channel<3;channel++){
   const difference=Math.abs(pixels[(168*1280+x)*4+channel]-pixels[(472*1280+x)*4+channel]);
   maximumDifference=Math.max(maximumDifference,difference);sum+=difference;samples++;
  }
  return{maximumDifference,meanDifference:sum/samples,samples};
 });
 await page.screenshot({path:`${out}/after.png`});
 const result={method:'Actual GPU material, two equivalent endpoint encodings; spatial paint disabled only to isolate categorical blending.',comparison,errors,passed:comparison.maximumDifference<=1&&!errors.length};
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}finally{await browser.close();}
