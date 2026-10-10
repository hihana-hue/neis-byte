'use strict';
const MARI_APP_ID='gyodae';
const $=id=>document.getElementById(id),bridge=$('serverBridge'),frame=$('app');const nonce=crypto.randomUUID(),requests=new Map();let accessVersion=0;let endpoint=null,endpointOrigin='',token='',busy=false;
function storageGet(store,k){try{return store.getItem(k)}catch{return null}}
let deviceId=storageGet(localStorage,'mari-device');if(!deviceId){deviceId=crypto.randomUUID();try{localStorage.setItem('mari-device',deviceId)}catch{}}
'use strict';
window.MariDevice = (() => {
 const ua=navigator.userAgent;
 const os=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/CrOS/.test(ua)?'ChromeOS':/Linux/.test(ua)?'Linux':'기타';
 const read=()=>{try{return localStorage.getItem('mari-device-kind')||''}catch{return ''}};
 let model='',select=null;
 const ready=(async()=>{
  try{if(navigator.userAgentData?.getHighEntropyValues){const info=await Promise.race([navigator.userAgentData.getHighEntropyValues(['model']),new Promise(resolve=>setTimeout(()=>resolve({}),500))]);model=String(info.model||'').replace(/[·\r\n]/g,' ').trim().slice(0,40);}}catch{}
  if(!model){const match=ua.match(/\b(SM-[A-Za-z0-9-]+)\b/);if(match)model=match[1];}
  if(!model){const form=document.getElementById('login'),label=document.createElement('label');label.textContent='기기 종류';label.style.display='block';select=document.createElement('select');select.id='deviceKind';select.required=true;select.style.cssText='box-sizing:border-box;width:100%;padding:10px;margin:8px 0;border:1px solid #b9cccc;border-radius:6px;background:white;color:#19383a';for(const value of ['','PC','모바일','태블릿']){const option=document.createElement('option');option.value=value;option.textContent=value||'사용 중인 기기를 선택해주세요';select.appendChild(option);}const old=read(),saved=old==='폰'?'모바일':old==='노트북'?'PC':old;select.value=['PC','모바일','태블릿'].includes(saved)?saved:'';select.onchange=()=>{try{localStorage.setItem('mari-device-kind',select.value)}catch{}};label.appendChild(select);form.insertBefore(label,form.querySelector('button'));}
 })();
 return {async label(){await ready;const name=model||select?.value;if(!name)throw Error('기기 종류를 선택해주세요.');const dims=[Math.round(screen.width),Math.round(screen.height)].sort((a,b)=>a-b);if(!dims[0]||!Number.isFinite(dims[1]))throw Error('화면 크기를 확인할 수 없습니다.');return name+' · '+os+' · '+dims.join('×');}};
})();

let deviceLabel='';
function rpc(method,args){if(!accessVersion){const legacy={mariSignIn:MARI_APP_ID==='economy'?'signInEconomy':'signIn',mariRestore:MARI_APP_ID==='economy'?'restoreEconomy':'restoreSession',mariCheck:'checkSession',mariSave:MARI_APP_ID==='classic'?'saveLearning':MARI_APP_ID==='economy'?'saveEconomy':'saveExam'};if(legacy[method]){method=legacy[method];args=method==='restoreSession'||method==='restoreEconomy'?args.slice(0,1):args.slice(0,-1);}}return new Promise((resolve,reject)=>{if(!endpoint){reject(Error('로그인 서버 연결 중입니다.'));return}const id=crypto.randomUUID(),timer=setTimeout(()=>{requests.delete(id);reject(Error('서버 응답이 늦습니다. 다시 시도하세요.'))},60000);requests.set(id,{resolve,reject,timer});endpoint.postMessage({channel:'mari-rpc',nonce,id,method,args},endpointOrigin);});}
function fail(error){document.body.classList.remove('authenticated');token='';$('loading').hidden=true;$('login').hidden=false;$('status').textContent=error.message||'연결 실패';frame.hidden=true;busy=false;}
function clearSession(){try{localStorage.removeItem('mari-session');sessionStorage.removeItem('mari-session')}catch{}}
async function showApp(r){const response=await fetch('./app.html',{cache:'no-store'});if(!response.ok)throw Error('학습 화면을 불러오지 못했습니다.');const html=await response.text();const bootstrap=JSON.stringify({MARI_ACCOUNT:r.id,MARI_COMPLETED:r.completed||[],MARI_DATA:r.data,MARI_COVERAGE:r.coverage}).replace(/</g,'\\u003c');frame.onload=()=>{document.body.classList.add('authenticated');$('loading').hidden=true;frame.hidden=false;};frame.srcdoc=html.replace('<head>','<head><script>Object.assign(window,'+bootstrap+');<\/script>');$('login').hidden=true;busy=false;}

function invalidSession(error){return /^(다시 로그인하세요\.|로그인이 만료되었습니다\.|관리자가 이 기기를 해제했습니다\.|관리자가 기기한도를 줄였습니다\.)$/.test(error.message||'');}
function handleAuthError(error){if(invalidSession(error))clearSession();fail(error);}
let restoreRetry=null;
function setRestoreRetry(show){
 if(!restoreRetry){restoreRetry=document.createElement('button');restoreRetry.type='button';restoreRetry.textContent='저장된 로그인으로 다시 시도';restoreRetry.style.cssText='display:block;margin:16px auto;padding:12px 18px';restoreRetry.onclick=()=>{if(!busy)restore();};$('login').after(restoreRetry);}
 restoreRetry.hidden=!show;restoreRetry.style.display=show?'block':'none';
}
async function restore(){
 const t=storageGet(localStorage,'mari-session')||storageGet(sessionStorage,'mari-session');
 setRestoreRetry(false);
 if(!t){$('loading').hidden=true;$('login').hidden=false;return}
 busy=true;token=t;$('login').hidden=true;$('loading').hidden=false;
 try{await showApp(await rpc('mariRestore',[token,MARI_APP_ID,deviceId,await window.MariDevice.label()]))}
 catch(error){handleAuthError(error);if(!invalidSession(error)){setRestoreRetry(true);$('status').textContent=(error.message||'연결 실패')+' 저장된 로그인은 유지됩니다.';}}
}
let pendingDeviceLogin=null,devicePanel=null;
async function acceptSignIn(r){
 if(r.deviceLimit){showDeviceLimit(r);return;}
 setRestoreRetry(false);if(devicePanel)devicePanel.hidden=true;pendingDeviceLogin=null;clearSession();token=r.token;
 try{($('remember').checked?localStorage:sessionStorage).setItem('mari-session',token)}catch{}
 $('pin').value='';await showApp(r);
}
function showDeviceLimit(r){
 busy=false;$('loading').hidden=true;$('login').hidden=true;
 if(!devicePanel){devicePanel=document.createElement('form');devicePanel.id='deviceChange';devicePanel.style.cssText='box-sizing:border-box;width:calc(100% - 30px);max-width:388px;margin:8vh auto;padding:24px;background:white;border-radius:12px';$('login').after(devicePanel);}
 devicePanel.replaceChildren();devicePanel.hidden=false;
 const title=document.createElement('h1');title.textContent='등록 기기를 변경해주세요';devicePanel.appendChild(title);
 const desc=document.createElement('p');desc.textContent='등록 한도 '+r.limit+'개에 도달했습니다. 해제할 기기를 선택해주세요.';devicePanel.appendChild(desc);
 for(const d of r.devices){const label=document.createElement('label');label.style.cssText='display:block;padding:12px 0;border-bottom:1px solid #e3eded';const radio=document.createElement('input');radio.type='radio';radio.name='oldDevice';radio.value=d.generation;radio.required=true;label.appendChild(radio);label.appendChild(document.createTextNode(' '+d.name));const last=document.createElement('small');last.style.cssText='display:block;margin:5px 0 0 24px;color:#587174';last.textContent='마지막 접속: '+d.lastSeen;label.appendChild(last);devicePanel.appendChild(label);}
 const note=document.createElement('p');note.style.cssText='font-size:12px;line-height:1.6;color:#587174';note.textContent='기기변경을 해도 같은 기기의 학습기록은 삭제 되지않습니다. 브라우저 데이터를 삭제하면 해당 브라우저에 저장된 기록은 사라질 수 있습니다.';devicePanel.appendChild(note);
 const status=document.createElement('p');status.setAttribute('role','status');status.style.color='#9d3125';devicePanel.appendChild(status);
 const submit=document.createElement('button');submit.textContent='이 기기 해제하고 현재 기기 등록';devicePanel.appendChild(submit);
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='취소';cancel.style.cssText='background:white;color:#17838c';cancel.onclick=()=>{if(busy)return;devicePanel.hidden=true;pendingDeviceLogin=null;$('login').hidden=false;};devicePanel.appendChild(cancel);
 devicePanel.onsubmit=async e=>{e.preventDefault();if(busy||!pendingDeviceLogin)return;const chosen=devicePanel.querySelector('input[name="oldDevice"]:checked');if(!chosen)return;busy=true;submit.disabled=true;cancel.disabled=true;status.textContent='기기를 변경하는 중…';
 try{await acceptSignIn(await rpc('mariReplaceDevice',[...pendingDeviceLogin,chosen.value]));}catch(error){if(devicePanel.hidden)fail(error);else status.textContent=error.message||'기기 변경 실패';}finally{busy=false;submit.disabled=false;cancel.disabled=false;}};
}
$('login').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('login').hidden=true;$('loading').hidden=false;try{deviceLabel=await window.MariDevice.label();pendingDeviceLogin=[$('id').value,$('pin').value,$('remember').checked,deviceId,deviceLabel,MARI_APP_ID];await acceptSignIn(await rpc('mariSignIn',pendingDeviceLogin));}catch(error){pendingDeviceLogin=null;fail(error)}};
function signOut(){setRestoreRetry(false);const previous=token;clearSession();token='';frame.srcdoc='';fail({message:'로그아웃되었습니다.'});rpc('signOut',[previous]).catch(()=>{});}
window.addEventListener('message',async e=>{const d=e.data;if(e.source===frame.contentWindow){if(!token)return;if(d?.channel==='mari-logout'){signOut();return}if(d?.channel==='mari-progress'){try{await rpc('mariSave',[token,d.event,MARI_APP_ID]);frame.contentWindow.postMessage({channel:'mari-ack',eventId:d.event.eventId},location.origin)}catch(error){if(invalidSession(error)||/이 앱의 이용 권한이 없습니다/.test(error.message))handleAuthError(error)} }return}
 const trusted=e.origin==='https://script.googleusercontent.com'||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(e.origin);if(!trusted||d?.nonce!==nonce)return;
 if(d.channel==='mari-bridge-ready'&&!endpoint){accessVersion=d.accessVersion===1?1:0;endpoint=e.source;endpointOrigin=e.origin;bridge.style.display='none';restore();return}
 if(e.source!==endpoint||d.channel!=='mari-rpc-result')return;const request=requests.get(d.id);if(!request)return;clearTimeout(request.timer);requests.delete(d.id);d.ok?request.resolve(d.result):request.reject(Error(d.error));});
setInterval(()=>{if(token)rpc('mariCheck',[token,MARI_APP_ID]).catch(error=>{if(invalidSession(error)||/이 앱의 이용 권한이 없습니다/.test(error.message))handleAuthError(error)})},60000);
if(typeof window.MARI_APP_URL==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(window.MARI_APP_URL)){bridge.src=window.MARI_APP_URL+'?nonce='+encodeURIComponent(nonce);}else fail(Error('서버 주소 설정이 필요합니다.'));

