(()=>{
 const loader=document.getElementById('loading'),canvas=document.getElementById('economyDance');
 if(!loader||!canvas)return;
 const ctx=canvas.getContext('2d'),video=document.createElement('video');
 video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.src='./loading-dancer-v2.mp4';
 let started=0,frame=0,active=false;
 function draw(now){
  if(!active)return;
  const count=1+Math.floor(((now-started)%20000)/2000),width=canvas.width/10;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(video.readyState>=2){const x=(canvas.width-width*count)/2;for(let i=0;i<count;i++)ctx.drawImage(video,x+i*width,0,width,canvas.height);}
  frame=requestAnimationFrame(draw);
 }
 function sync(){
  const show=!loader.hidden&&!document.hidden;
  if(show&&!active){active=true;started=performance.now();video.currentTime=0;video.play().catch(()=>{});frame=requestAnimationFrame(draw);}
  else if(!show&&active){active=false;cancelAnimationFrame(frame);video.pause();ctx.clearRect(0,0,canvas.width,canvas.height);}
 }
 new MutationObserver(sync).observe(loader,{attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',sync);sync();
})();
