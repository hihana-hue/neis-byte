'use strict';
const $=id=>document.getElementById(id),bridge=$('serverBridge'),frame=$('app');const nonce=crypto.randomUUID(),requests=new Map();let endpoint=null,endpointOrigin='',token='',busy=false;
function storageGet(store,k){try{return store.getItem(k)}catch{return null}}
let deviceId=storageGet(localStorage,'mari-device');if(!deviceId){deviceId=crypto.randomUUID();try{localStorage.setItem('mari-device',deviceId)}catch{}}
const ua=navigator.userAgent,deviceLabel=(/iPad/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'iPad':/iPhone/.test(ua)?'iPhone':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':'Mac / PC')+' · '+(/Edg/.test(ua)?'Edge':/Firefox/.test(ua)?'Firefox':/Chrome/.test(ua)?'Chrome':'Safari / 기타');
function rpc(method,args){return new Promise((resolve,reject)=>{if(!endpoint){reject(Error('로그인 서버 연결 중입니다.'));return}const id=crypto.randomUUID(),timer=setTimeout(()=>{requests.delete(id);reject(Error('서버 응답이 늦습니다. 다시 시도하세요.'))},60000);requests.set(id,{resolve,reject,timer});endpoint.postMessage({channel:'mari-rpc',nonce,id,method,args},endpointOrigin);});}
function fail(error){document.body.classList.remove('authenticated');token='';$('loading').hidden=true;$('login').hidden=false;$('status').textContent=error.message||'연결 실패';frame.hidden=true;busy=false;}
function clearSession(){try{localStorage.removeItem('mari-session');sessionStorage.removeItem('mari-session')}catch{}}

let examVisit='',examQueue=[],examSending=false;
try{examQueue=JSON.parse(sessionStorage.getItem('mari-exam-queue')||'[]')}catch{}
function persistExam(){try{sessionStorage.setItem('mari-exam-queue',JSON.stringify(examQueue))}catch{}}
function examStatus(msg){let el=$('examSync');if(!el){el=document.createElement('div');el.id='examSync';el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:6px;right:8px;z-index:4000;font:11px system-ui;color:#9d3125;background:white;padding:4px 8px;border-radius:4px';document.body.appendChild(el)}el.textContent=msg;el.hidden=!msg}
async function flushExam(){if(examSending||!endpoint)return;examSending=true;try{while(examQueue.length){const item=examQueue[0];await rpc('saveExam',[item.token,item.event]);examQueue.shift();persistExam()}examStatus('')}catch(error){examStatus('학습 기록 전송 대기 중')}finally{examSending=false}}
function queueExam(type,extra={}){if(!token||!examVisit)return;examQueue.push({token,event:{...extra,type,visitId:examVisit,eventId:extra.eventId||crypto.randomUUID()}});persistExam();void flushExam()}
function startExamVisit(){if(window.MARI_EXAM_RECORDING!==true)return;examVisit=crypto.randomUUID();queueExam('start')}
window.addEventListener('pagehide',()=>queueExam('end'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')queueExam('pulse');else if(token)queueExam('pulse')});
setInterval(()=>{if(token)queueExam('pulse');else void flushExam()},60000);

async function showApp(r){startExamVisit();const response=await fetch('./app.html',{cache:'no-store'});if(!response.ok)throw Error('학습 화면을 불러오지 못했습니다.');const html=await response.text();const bootstrap=JSON.stringify({MARI_ACCOUNT:r.id}).replace(/</g,'\\u003c');frame.onload=()=>{document.body.classList.add('authenticated');$('loading').hidden=true;frame.hidden=false;};frame.srcdoc=html.replace('<head>','<head><script>Object.assign(window,'+bootstrap+');<\/script>');$('login').hidden=true;busy=false;}
async function restore(){const t=storageGet(localStorage,'mari-session')||storageGet(sessionStorage,'mari-session');if(!t){$('loading').hidden=true;$('login').hidden=false;return}token=t;try{await showApp(await rpc('restoreSession',[token]))}catch(error){clearSession();fail(error)}}
$('login').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('login').hidden=true;$('loading').hidden=false;try{const r=await rpc('signIn',[$('id').value,$('pin').value,$('remember').checked,deviceId,deviceLabel]);clearSession();token=r.token;try{($('remember').checked?localStorage:sessionStorage).setItem('mari-session',token)}catch{}$('pin').value='';await showApp(r)}catch(error){fail(error)}};
async function signOut(){queueExam('end');await flushExam();const previous=token;clearSession();token='';frame.srcdoc='';fail({message:'로그아웃되었습니다.'});rpc('signOut',[previous]).catch(()=>{});}
window.addEventListener('message',async e=>{const d=e.data;if(e.source===frame.contentWindow){if(!token)return;if(d?.channel==='mari-logout'){void signOut();return}if(d?.channel==='mari-exam'){const e=d.event;if(e&&['test-start','answer','override','finish','abort','writing'].includes(e.type))queueExam(e.type,e);return}return}
 const trusted=e.origin==='https://script.googleusercontent.com'||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(e.origin);if(!trusted||d?.nonce!==nonce)return;
 if(d.channel==='mari-bridge-ready'&&!endpoint){endpoint=e.source;endpointOrigin=e.origin;bridge.style.display='none';restore();return}
 if(e.source!==endpoint||d.channel!=='mari-rpc-result')return;const request=requests.get(d.id);if(!request)return;clearTimeout(request.timer);requests.delete(d.id);d.ok?request.resolve(d.result):request.reject(Error(d.error));});
setInterval(()=>{if(token)rpc('checkSession',[token]).catch(error=>{if(/로그인|기기|만료/.test(error.message))fail(error)})},60000);
if(typeof window.MARI_APP_URL==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(window.MARI_APP_URL)){bridge.src=window.MARI_APP_URL+'?nonce='+encodeURIComponent(nonce);}else fail(Error('서버 주소 설정이 필요합니다.'));
