import {createNotifications} from './notification-popup.mjs?v=1';
import {createAcademy} from './main-academy.mjs?v=4';
import {groups,todayKey,weekBounds,dayNumber,complete,active} from './model.mjs';
const $=id=>document.getElementById(id), base=(window.RIVER_CONFIG?.apiBase||'').replace(/\/$/,'');
let items=[], loaded=false, demo=false, selected='', token='', loading=false;
const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
const compact=n=>new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',month:'numeric',day:'numeric'}).format(new Date(n*86400000));
function toast(s){$('toast').textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').textContent='',4000);}
function subjectColor(s){return [...s].reduce((a,c)=>a+c.charCodeAt(0),0)%4;}
function message(s){$('message').textContent=s;}
function chips(){const all=[...new Set(items.flatMap(x=>x.subjects))].sort();$('chips').replaceChildren();for(const s of ['',...all]){const b=text('button',s||'전체 과목','chip'+(s===selected?' selected':''));b.setAttribute('aria-pressed',String(s===selected));b.onclick=()=>{selected=s;chips();render();};$('chips').append(b);}}

const authKey='river-access-v1';
function remembered(){try{return localStorage.getItem(authKey)||'';}catch{return '';}}
function forget(){try{localStorage.removeItem(authKey);}catch{}}
function remember(){try{if($('remember').checked)localStorage.setItem(authKey,token);else forget();}catch{}}
const displayStatus=s=>complete(s)?'완료':active(s)?'진행 중':'시작 전';
const academy=createAcademy(api,toast);
const notifications=createNotifications(api,()=>Boolean(token));
$('notifications-open').onclick=()=>notifications.open();
if(new URL(location.href).searchParams.get('settings')==='notifications')notifications.open();
const saving=new Set();let detailItem=null;
function safeNotionUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['app.notion.com','www.notion.so','notion.so'].includes(u.hostname)?u.href:null;}catch{return null;}}
function dueLabel(x){if(!x.due)return '기한 미정';const d=dayNumber(x.due)-dayNumber(todayKey());return `${compact(dayNumber(x.due))} · ${d<0?Math.abs(d)+'일 지남':d===0?'오늘 마감':'D−'+d}`;}
function reminder(x){if(demo)return '디자인 확인용 샘플이에요. 실제 일정은 노션 연결 후 표시됩니다.';if(!x.due)return '기한을 정하면 마감일까지 남은 시간을 확인할 수 있어.';const d=dayNumber(x.due)-dayNumber(todayKey());if(d<0)return '기한이 지났어. 제출 여부와 변경된 기한을 확인해 줘.';if(d===0)return '오늘 제출이야. 파일과 제출처를 마지막으로 확인해!';if(d===1)return '내일 제출이야. 제출할 파일과 제출처를 확인해!';if(d<=2)return '이틀 안에 제출이야. 남은 부분을 확인해!';return '다가오는 제출일을 확인하고 이번 주말에 준비해 둬!';}
function openDetail(x){detailItem=x;$('detail-subject').textContent=x.subjects.join(' · ')||'일정';$('detail-title').textContent=x.title;$('detail-task').textContent=x.taskName||'';$('detail-task').hidden=!x.taskName;$('detail-due').textContent=dueLabel(x);$('detail-status').textContent=displayStatus(x.status);$('detail-submission').textContent=x.submission||'미지정';$('detail-reminder').textContent=reminder(x);$('detail-error').hidden=true;const link=safeNotionUrl(x.url);$('detail-notion').hidden=!link;if(link)$('detail-notion').href=link;else $('detail-notion').removeAttribute('href');for(const [id,status] of [['detail-start','시작전'],['detail-progress','진행 중'],['detail-done','완료']]){const b=$(id);b.disabled=saving.has(x.id);b.setAttribute('aria-pressed',String(displayStatus(x.status)===displayStatus(status)));}if(!$('detail').open)$('detail').showModal();}
let statusItem=null;
function chooseStatus(x){
 if(saving.has(x.id))return;
 statusItem=x;
 $('status-title').textContent='상태를 선택해 주세요';
 $('status-description').textContent=x.title+' · 현재 '+displayStatus(x.status);
 $('status-progress').hidden=false;
 $('status-error').hidden=true;
 $('status-start').disabled=false;$('status-progress').disabled=false;$('status-done').disabled=false;$('status-cancel').disabled=false;
 if(!$('status-dialog').open)$('status-dialog').showModal();
}
async function saveStatus(status,source='picker'){
 const x=source==='detail'?detailItem:statusItem;if(!x||saving.has(x.id))return;
 saving.add(x.id);for(const id of ['detail-start','detail-progress','detail-done'])$(id).disabled=true;$('status-start').disabled=true;$('status-progress').disabled=true;$('status-done').disabled=true;$('status-cancel').disabled=true;
 $('status-error').hidden=true;$('detail-error').hidden=true;render();
 try{
  if(!demo){
   // Persist all three transitions through the same status endpoint.
   await api('/tasks/'+encodeURIComponent(x.id)+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,from:x.status||''})});
  }
  x.status=status;x.completedAt=complete(status)?new Date().toISOString():null;
  $('status-dialog').close();if(detailItem?.id===x.id)$('detail').close();
  chips();render();toast(demo?'샘플 상태를 변경했어요.':status+' 상태로 노션에 저장했어요.');
 }catch(e){const error=$(source==='detail'?'detail-error':'status-error');error.textContent=e.message;error.hidden=false;}
 finally{saving.delete(x.id);for(const id of ['detail-start','detail-progress','detail-done'])$(id).disabled=false;$('status-start').disabled=false;$('status-progress').disabled=false;$('status-done').disabled=false;$('status-cancel').disabled=false;render();}
}
function card(x){const el=text('article','','card'),b=text('button','✓','done');
 b.title='상태 변경';b.setAttribute('aria-label',x.title+' 상태 변경');b.disabled=saving.has(x.id);b.onclick=()=>chooseStatus(x);
 const body=text('div','','card-body'),tags=text('div','','tags');for(const subject of x.subjects)tags.append(text('span',subject,'tag'));body.append(tags);
 const title=text('button',x.title,'title');title.type='button';title.onclick=()=>openDetail(x);body.append(title);
 const meta=text('div','','meta');meta.append(text('span',dueLabel(x),x.due&&dayNumber(x.due)<=dayNumber(todayKey())?'deadline':''),text('span',displayStatus(x.status),'status'));body.append(meta);el.append(b,body);return el;
}
function panel(target,title,rows,range='',overdue=false){const el=text('section','','panel'+(overdue?' overdue':'')),head=text('h2',title);head.append(text('span',String(rows.length),'badge'));el.append(head);if(range)el.append(text('p',range,'range'));if(!loaded)el.append(text('div','노션을 연결하면 여기에 일정이 나타나요.','empty'));else if(!rows.length)el.append(text('div','해당하는 일정이 없어요.','empty'));else {const grid=text('div','','task-grid');for(const x of rows)grid.append(card(x));el.append(grid);}$(target).append(el);}
function completedList(rows){const el=text('section','','panel'),head=text('h2','최근 7일 완료');head.append(text('span',String(rows.length),'badge'));el.append(head);if(!rows.length)el.append(text('p','최근 완료한 일정이 없어요.','range'));for(const x of rows){const row=text('div','','completed-row'),body=text('div','','completed-body');body.append(text('span',x.subjects.join(' · ')||'일정','completed-subject'),text('span',x.title,'completed-title'));const b=text('button','완료 ✓','btn');b.setAttribute('aria-label',x.title+' 완료 상태 변경');b.onclick=()=>chooseStatus(x);row.append(body,b);el.append(row);}$('right').append(el);}
function render(){const shown=items.filter(x=>!selected||x.subjects.includes(selected)), g=groups(shown), w=weekBounds(todayKey());
 
 $('left').replaceChildren();$('right').replaceChildren();if(g.overdue.length)panel('left','기한 지난 미완료',g.overdue,'먼저 확인해 주세요.',true);panel('left','이번 주 할 일',g.thisWeek,`${compact(w.start)} — ${compact(w.end-1)} · 오늘부터 남은 일정`);panel('left','다음 주 할 일',g.nextWeek,`${compact(w.end)} — ${compact(w.nextEnd-1)}`);panel('right','진행 중',g.active,'작성 완료는 제출 확인 전까지 표시합니다.');panel('right','시작 예정',g.planned);if(g.undated.length)panel('right','기한을 정해주세요',g.undated);if(g.later.length)panel('left','그 이후 일정',g.later);completedList(shown.filter(x=>complete(x.status)&&Date.parse(x.completedAt||'')>=Date.now()-7*86400000).sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)));}
async function api(path,opts={}){const r=await fetch(base+path,{...opts,cache:'no-store',headers:{Authorization:'Bearer '+token,...opts.headers}});let data;try{data=await r.json();}catch{throw Error('일정 서버의 응답을 확인하지 못했어요.');}if(r.status===401){forget();token='';}if(!r.ok)throw Error(r.status===401?'접근 암호를 확인해 주세요.':data.error||'저장하지 못했어요. 다시 시도해 주세요.');return data;}
async function load(){if(loading)return;loading=true;$('connect').disabled=true;try{const data=await api('/tasks');if(!Array.isArray(data.items))throw Error('일정 데이터 형식을 확인해 주세요.');items=data.items;loaded=true;demo=false;selected='';message('노션 연결됨');$('logout').hidden=false;$('connect').textContent='새로고침';$('sync').textContent='최근 불러옴 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(new Date())+' · 월~일 기준';chips();render();await academy.load();if($('notify-dialog').open)await notifications.open();const target=new URL(location.href).searchParams.get('task');if(target){const x=items.find(x=>x.id===target);if(x)openDetail(x);const u=new URL(location.href);u.searchParams.delete('task');history.replaceState(null,'',u);}}catch(e){message(e.message);throw e;}finally{loading=false;$('connect').disabled=false;}}
$('connect').onclick=()=>{if(!base){message('실제 일정 연결은 준비 중입니다. 노션 DB 바로가기는 지금 사용할 수 있어요.');return;}if(token){load().catch(e=>toast(e.message));return;}$('login').showModal();};
$('login-form').onsubmit=async e=>{e.preventDefault();token=$('password').value;$('password').value='';$('login').close();try{await load();remember();}catch(e){token='';toast(e.message);}};$('cancel').onclick=()=>$('login').close();
$('logout').onclick=()=>{$('detail').close();detailItem=null;$('notify-dialog').close();academy.reset();forget();token='';items=[];loaded=false;selected='';$('logout').hidden=true;$('connect').textContent='불러오기';message('일정 화면을 잠갔어요. 다시 열려면 접근 암호를 입력해 주세요.');chips();render();};
function showSamples(){demo=true;loaded=true;const w=weekBounds(todayKey()), key=n=>new Date(n*86400000).toISOString().slice(0,10);items=[{id:'sample-1',title:'에세이 초안 다듬기',subjects:['영어 · 샘플'],due:todayKey(),status:'진행 중',submission:'리로스쿨'},{id:'sample-2',title:'탐구 보고서 자료 정리',subjects:['과학 · 샘플'],due:key(w.end+2),status:'시작전',submission:'서면제출'},{id:'sample-3',title:'새로운 멜로디 스케치',subjects:['개인 · 샘플'],due:null,status:'진행 중'}];selected='';message('샘플 화면 · 노션 연결 전');chips();render();};
$('detail-close').onclick=()=>$('detail').close();
$('detail-start').onclick=()=>saveStatus('시작전','detail');
$('detail-progress').onclick=()=>saveStatus('진행 중','detail');
$('detail-done').onclick=()=>saveStatus('완료','detail');
$('status-start').onclick=()=>saveStatus('시작전');
$('status-progress').onclick=()=>saveStatus('진행 중');
$('status-done').onclick=()=>saveStatus('완료');
$('status-cancel').onclick=()=>$('status-dialog').close();
$('status-dialog').addEventListener('cancel',e=>{if(statusItem&&saving.has(statusItem.id))e.preventDefault();});
$('detail').addEventListener('click',e=>{if(e.target!==$('detail'))return;const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();});
setInterval(()=>{if(loaded)render();},60000);chips();render();
if(!base)showSamples();

if(base&&(token=remembered()))load().catch(e=>toast(e.message));
