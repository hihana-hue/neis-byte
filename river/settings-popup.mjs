export function createSettings(request,hasToken){
 const $=id=>document.getElementById('notify-'+id);
 let busy=false;
 function status(){ $('result').textContent=hasToken()?'':'먼저 메인에서 일정을 불러와 주세요.'; }
 async function run(fn){
  if(busy)return;
  if(!hasToken()){status();return;}
  busy=true;$('widget-pair').disabled=true;$('widget-revoke').disabled=true;$('result').textContent='';
  try{await fn();}catch(e){$('result').textContent=e.message;}
  finally{busy=false;$('widget-pair').disabled=false;$('widget-revoke').disabled=false;}
 }
 const post=path=>request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 $('widget-pair').onclick=()=>run(async()=>{
  const d=await post('/widget/pairing');$('widget-code').textContent=d.code;
  $('widget-result').textContent='5분 안에 위젯 앱에 입력해 주세요.';
 });
 $('widget-revoke').onclick=()=>run(async()=>{
  await post('/widget/revoke');$('widget-code').textContent='';
  $('widget-result').textContent='위젯 연결을 모두 해제했어요.';
 });
 $('close').onclick=()=>$('dialog').close();
 return {async open(){if(!$('dialog').open)$('dialog').showModal();status();}};
}
