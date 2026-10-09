'use strict';
const MARI_APP_ID='hanmun';
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
  if(!model){const form=document.getElementById('login'),label=document.createElement('label');label.textContent='기기 종류';label.style.display='block';select=document.createElement('select');select.id='deviceKind';select.required=true;select.style.cssText='box-sizing:border-box;width:100%;padding:10px;margin:8px 0;border:1px solid #b9cccc;border-radius:6px;background:white;color:#19383a';for(const value of ['','폰','PC','태블릿','노트북']){const option=document.createElement('option');option.value=value;option.textContent=value||'사용 중인 기기를 선택해주세요';select.appendChild(option);}const saved=read();select.value=['폰','PC','태블릿','노트북'].includes(saved)?saved:'';select.onchange=()=>{try{localStorage.setItem('mari-device-kind',select.value)}catch{}};label.appendChild(select);form.insertBefore(label,form.querySelector('button'));}
 })();
 return {async label(){await ready;const name=model||select?.value;if(!name)throw Error('기기 종류를 선택해주세요.');const dims=[Math.round(screen.width),Math.round(screen.height)].sort((a,b)=>a-b);if(!dims[0]||!Number.isFinite(dims[1]))throw Error('화면 크기를 확인할 수 없습니다.');return name+' · '+os+' · '+dims.join('×');}};
})();

let deviceLabel='';
function rpc(method,args){if(!accessVersion){const legacy={mariSignIn:MARI_APP_ID==='economy'?'signInEconomy':'signIn',mariRestore:MARI_APP_ID==='economy'?'restoreEconomy':'restoreSession',mariCheck:'checkSession',mariSave:MARI_APP_ID==='classic'?'saveLearning':MARI_APP_ID==='economy'?'saveEconomy':'saveExam'};if(legacy[method]){method=legacy[method];args=method==='restoreSession'||method==='restoreEconomy'?args.slice(0,1):args.slice(0,-1);}}return new Promise((resolve,reject)=>{if(!endpoint){reject(Error('로그인 서버 연결 중입니다.'));return}const id=crypto.randomUUID(),timer=setTimeout(()=>{requests.delete(id);reject(Error('서버 응답이 늦습니다. 다시 시도하세요.'))},60000);requests.set(id,{resolve,reject,timer});endpoint.postMessage({channel:'mari-rpc',nonce,id,method,args},endpointOrigin);});}
function fail(error){document.body.classList.remove('authenticated');token='';$('loading').hidden=true;$('login').hidden=false;$('status').textContent=error.message||'연결 실패';frame.hidden=true;busy=false;}
function clearSession(){try{localStorage.removeItem('mari-session');sessionStorage.removeItem('mari-session')}catch{}}

let examVisit='',examQueue=[],examSending=false,examFlushPromise=null;
try{examQueue=JSON.parse(sessionStorage.getItem('mari-exam-queue')||'[]')}catch{}
function persistExam(){try{sessionStorage.setItem('mari-exam-queue',JSON.stringify(examQueue))}catch{}}
function examStatus(msg){let el=$('examSync');if(!el){el=document.createElement('div');el.id='examSync';el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:6px;right:8px;z-index:4000;font:11px system-ui;color:#9d3125;background:white;padding:4px 8px;border-radius:4px';document.body.appendChild(el)}el.textContent=msg;el.hidden=!msg}
function flushExam(){if(examFlushPromise)return examFlushPromise;examFlushPromise=sendExamQueue().finally(()=>examFlushPromise=null);return examFlushPromise}
async function sendExamQueue(){if(examSending||!endpoint)return;examSending=true;try{while(examQueue.length){const item=examQueue[0];await rpc('mariSave',[item.token,item.event,MARI_APP_ID]);examQueue.shift();persistExam()}examStatus('')}catch(error){examStatus('학습 기록 전송 대기 중')}finally{examSending=false}}
function queueExam(type,extra={}){if(!token||!examVisit)return;examQueue.push({token,event:{...extra,type,visitId:examVisit,eventId:extra.eventId||crypto.randomUUID()}});persistExam();void flushExam()}
async function startExamVisit(){try{await rpc('examRecordingReady',[]);examVisit=crypto.randomUUID();queueExam('start')}catch{examStatus('학습 기록 서버 배포가 필요합니다')}}
window.addEventListener('pagehide',()=>queueExam('end'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')queueExam('pulse');else if(token)queueExam('pulse')});
setInterval(()=>{if(token)queueExam('pulse');else void flushExam()},60000);

async function showApp(r){startExamVisit();const response=await fetch('./app.html',{cache:'no-store'});if(!response.ok)throw Error('학습 화면을 불러오지 못했습니다.');const html=await response.text();const bootstrap=JSON.stringify({MARI_ACCOUNT:r.id}).replace(/</g,'\\u003c');frame.onload=()=>{document.body.classList.add('authenticated');$('loading').hidden=true;frame.hidden=false;};frame.srcdoc=html.replace('<head>','<head><script>Object.assign(window,'+bootstrap+');<\/script>');$('login').hidden=true;busy=false;}
async function restore(){const t=storageGet(localStorage,'mari-session')||storageGet(sessionStorage,'mari-session');if(!t){$('loading').hidden=true;$('login').hidden=false;return}token=t;try{await showApp(await rpc('mariRestore',[token,MARI_APP_ID,deviceId,await window.MariDevice.label()]))}catch(error){clearSession();fail(error)}}
$('login').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('login').hidden=true;$('loading').hidden=false;try{deviceLabel=await window.MariDevice.label();const r=await rpc('mariSignIn',[$('id').value,$('pin').value,$('remember').checked,deviceId,deviceLabel,MARI_APP_ID]);clearSession();token=r.token;try{($('remember').checked?localStorage:sessionStorage).setItem('mari-session',token)}catch{}$('pin').value='';await showApp(r)}catch(error){fail(error)}};
async function signOut(){queueExam('end');await flushExam();const previous=token;clearSession();token='';frame.srcdoc='';fail({message:'로그아웃되었습니다.'});rpc('signOut',[previous]).catch(()=>{});}
window.addEventListener('message',async e=>{const d=e.data;if(e.source===frame.contentWindow){if(!token)return;if(d?.channel==='mari-logout'){void signOut();return}if(d?.channel==='mari-exam'){const e=d.event;if(e&&['test-start','answer','override','finish','abort','writing'].includes(e.type))queueExam(e.type,e);return}return}
 const trusted=e.origin==='https://script.googleusercontent.com'||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(e.origin);if(!trusted||d?.nonce!==nonce)return;
 if(d.channel==='mari-bridge-ready'&&!endpoint){accessVersion=d.accessVersion===1?1:0;endpoint=e.source;endpointOrigin=e.origin;bridge.style.display='none';restore();return}
 if(e.source!==endpoint||d.channel!=='mari-rpc-result')return;const request=requests.get(d.id);if(!request)return;clearTimeout(request.timer);requests.delete(d.id);d.ok?request.resolve(d.result):request.reject(Error(d.error));});
setInterval(()=>{if(token)rpc('mariCheck',[token,MARI_APP_ID]).catch(error=>{if(/로그인|기기|만료|권한/.test(error.message))fail(error)})},60000);
if(typeof window.MARI_APP_URL==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(window.MARI_APP_URL)){bridge.src=window.MARI_APP_URL+'?nonce='+encodeURIComponent(nonce);}else fail(Error('서버 주소 설정이 필요합니다.'));
