const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async()=>{
  const mode=process.argv[2]; const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file://'+__dirname+'/index.html'); await p.evaluate(()=>document.fonts.ready);
  if(mode==='preview'){ for(const t of process.argv.slice(3)){ await p.evaluate(t=>render(t),+t); await p.screenshot({path:'prev_'+t+'.png'}); } await b.close(); return; }
  const fps=30,T=+process.argv[3]||34; const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','17','-preset','medium','silent.mp4'],{stdio:['pipe','inherit','inherit']});
  for(let i=0;i<fps*T;i++){ await p.evaluate(t=>render(t),i/fps); const buf=await p.screenshot({type:'jpeg',quality:95}); if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r)); }
  ff.stdin.end(); await new Promise(r=>ff.on('close',r)); await b.close();
})();
