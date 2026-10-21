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
  const d=await post('/widget/pairing');$('widget-code').textContent=d.code;$('widget-copy').disabled=!d.code;$('widget-copy').textContent='복사';
  $('widget-result').textContent='5분 안에 위젯 앱에 입력해 주세요.';
 });
 $('widget-revoke').onclick=()=>run(async()=>{
  await post('/widget/revoke');$('widget-code').textContent='';$('widget-copy').disabled=true;$('widget-copy').textContent='복사';
  $('widget-result').textContent='위젯 연결을 모두 해제했어요.';
 });
 $('widget-copy').onclick=async()=>{
  const code=$('widget-code').textContent.trim();if(!code)return;
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(code);
   else {
    const input=document.createElement('textarea');input.value=code;input.style.position='fixed';input.style.opacity='0';$('dialog').append(input);input.select();let ok;try{ok=document.execCommand('copy');}finally{input.remove();}if(!ok)throw Error('copy');
   }
   $('widget-copy').textContent='복사됨';$('widget-result').textContent='연결 코드를 복사했어요. 위젯 앱에 붙여넣어 주세요.';
  }catch(e){$('widget-result').textContent='자동 복사가 제한됐어요. 코드를 길게 눌러 복사해 주세요.';}
 };
 $('close').onclick=()=>$('dialog').close();
 return {async open(){if(!$('dialog').open)$('dialog').showModal();status();}};
}
