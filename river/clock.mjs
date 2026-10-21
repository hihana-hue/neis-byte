// Local display only: no network requests or Notion synchronization.
const clock=document.getElementById('local-clock');
const formatter=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'2-digit',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
let timer;
function tick(){
 if(!clock)return;
 const now=new Date(),p=Object.fromEntries(formatter.formatToParts(now).map(x=>[x.type,x.value]));
 clock.textContent=p.year+'.'+p.month+'.'+p.day+' ('+p.weekday+') '+p.hour+':'+p.minute+':'+p.second;
 clock.dateTime=now.toISOString();
}
function resume(){
 clearInterval(timer);
 if(document.hidden)return;
 tick();timer=setInterval(tick,1000);
}
document.addEventListener('visibilitychange',resume);
window.addEventListener('pagehide',()=>clearInterval(timer));
window.addEventListener('pageshow',resume);
resume();
