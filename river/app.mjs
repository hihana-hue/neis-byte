import {createWidgetDownload} from './widget-download.mjs?v=1';
import {paintSubject} from './subject-palette.mjs?v=2';
import {createSettings} from './settings-popup.mjs?v=4';
import {createAcademy} from './main-academy.mjs?v=23';
import {groups,todayKey,weekBounds,dayNumber,complete,active,visibleStatus} from './model.mjs?v=2';
const $=id=>document.getElementById(id), base=(window.RIVER_CONFIG?.apiBase||'').replace(/\/$/,'');
let items=[], loaded=false, demo=false, selected='', token='', loading=false;
const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
const compact=n=>new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',month:'numeric',day:'numeric'}).format(new Date(n*86400000));
function toast(s){$('toast').textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').textContent='',4000);}
const widgetDownload=createWidgetDownload(toast);
function refreshControl(connected){const b=$('connect');b.classList.toggle('icon-btn',connected);if(connected)b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg>';else b.textContent='연결하기';}
function subjectColor(s){return [...s].reduce((a,c)=>a+c.charCodeAt(0),0)%4;}
function message(s){$('message').textContent=s;}
function chips(){const all=[...new Set(items.flatMap(x=>x.subjects))].sort();$('chips').replaceChildren();for(const s of ['',...all]){const b=text('button',s||'전체 과목','chip'+(s===selected?' selected':''));b.setAttribute('aria-pressed',String(s===selected));b.onclick=()=>{selected=s;chips();render();};$('chips').append(b);}}

const authKey='river-student-access-v2';
function remembered(){try{const once=sessionStorage.getItem('river-return-code')||'';sessionStorage.removeItem('river-return-code');return once||localStorage.getItem(authKey)||'';}catch{return '';}}
function forget(){try{localStorage.removeItem(authKey);}catch{}}
function remember(){try{if($('remember').checked)localStorage.setItem(authKey,token);else forget();}catch{}}
const displayStatus=s=>s==='시작전'?'시작 전':s||'상태 미정';
const academy=createAcademy(api,toast);
const notifications=createSettings(api,()=>Boolean(token));
function connectionSettings(connected){if(!connected)widgetDownload.reset();const button=$('notifications-open');button.hidden=connected;button.style.display=connected?'none':'';if(connected&&$('notify-dialog').open)$('notify-dialog').close();}
$('notifications-open').onclick=()=>{if(!loaded)notifications.open();};
if(new URL(location.href).searchParams.get('settings')==='notifications')notifications.open();
const saving=new Set();let detailItem=null;
function safeNotionUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['app.notion.com','www.notion.so','notion.so'].includes(u.hostname)?u.href:null;}catch{return null;}}
function dueLabel(x){if(!x.due)return '기한 미정';const d=dayNumber(x.due)-dayNumber(todayKey());return `${compact(dayNumber(x.due))} · ${d<0?Math.abs(d)+'일 지남':d===0?'오늘 마감':'D−'+d}`;}
function reminder(x){if(demo)return '디자인 확인용 샘플이에요. 실제 일정은 노션 연결 후 표시됩니다.';if(!x.due)return '기한을 정하면 마감일까지 남은 시간을 확인할 수 있어.';const d=dayNumber(x.due)-dayNumber(todayKey());if(d<0)return '기한이 지났어. 제출 여부와 변경된 기한을 확인해 줘.';if(d===0)return '오늘 제출이야. 파일과 제출처를 마지막으로 확인해!';if(d===1)return '내일 제출이야. 제출할 파일과 제출처를 확인해!';if(d<=2)return '이틀 안에 제출이야. 남은 부분을 확인해!';return '다가오는 제출일을 확인하고 이번 주말에 준비해 둬!';}
function openDetail(x){detailItem=x;$('detail-subject').textContent=x.subjects.join(' · ')||'일정';$('detail-title').textContent=x.title;$('detail-task').textContent=x.taskName||'';$('detail-task').hidden=!x.taskName;$('detail-due').textContent=dueLabel(x);$('detail-status').textContent=displayStatus(x.status);$('detail-submission').textContent=x.submission||'미지정';$('detail-reminder').textContent=reminder(x);$('detail-error').hidden=true;const link=safeNotionUrl(x.url);$('detail-notion').hidden=!link;if(link)$('detail-notion').href=link;else $('detail-notion').removeAttribute('href');for(const [id,status] of [['detail-start','시작전'],['detail-progress','진행 중'],['detail-done','완료']]){const b=$(id);b.disabled=saving.has(x.id);b.setAttribute('aria-pressed',String(displayStatus(x.status)===displayStatus(status)));}if(!$('detail').open)$('detail').showModal();}
async function saveStatus(status){
 const x=detailItem;if(!x||saving.has(x.id))return;
 saving.add(x.id);for(const id of ['detail-start','detail-progress','detail-done'])$(id).disabled=true;
 $('detail-error').hidden=true;render();
 try{
  if(!demo){
   // Persist all three transitions through the same status endpoint.
   await api('/tasks/'+encodeURIComponent(x.id)+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,from:x.status||''})});
  }
  x.status=status;x.completedAt=complete(status)?new Date().toISOString():null;
  if(detailItem?.id===x.id)$('detail').close();
  chips();render();toast(demo?'샘플 상태를 변경했어요.':status+' 상태로 노션에 저장했어요.');
 }catch(e){const error=$('detail-error');error.textContent=e.message;error.hidden=false;}
 finally{saving.delete(x.id);for(const id of ['detail-start','detail-progress','detail-done'])$(id).disabled=false;render();}
}
function card(x){const el=text('article','','card'),b=text('button','✓','done');
 b.title='상태 변경';b.setAttribute('aria-label',x.title+' 상태 변경');b.disabled=saving.has(x.id);b.onclick=()=>openDetail(x);
 const body=text('div','','card-body'),heading=text('div','','card-heading'),tags=text('div','','tags');for(const subject of x.subjects){const tag=text('span',subject,'tag');paintSubject(tag,x.subjectColors?.[subject],subject);tags.append(tag);}heading.append(tags);body.append(heading);
 const title=text('button',x.title,'title');title.type='button';title.onclick=()=>openDetail(x);body.append(title);
 const meta=text('div','','meta');meta.append(text('span',dueLabel(x),x.due&&dayNumber(x.due)<=dayNumber(todayKey())?'deadline':''),text('span',displayStatus(x.status),'status'));heading.append(meta);el.append(b,body);return el;
}
function panel(target,title,rows,range='',overdue=false){const el=text('section','','panel'+(overdue?' overdue':'')),head=text('h2',title);head.append(text('span',String(rows.length),'badge'));el.append(head);if(range)el.append(text('p',range,'range'));if(!loaded)el.append(text('div','노션을 연결하면 여기에 일정이 나타나요.','empty'));else if(!rows.length)el.append(text('div','해당하는 일정이 없어요.','empty'));else {const grid=text('div','','task-grid');for(const x of rows)grid.append(card(x));el.append(grid);}$(target).append(el);}
function completedList(rows){const el=text('section','','panel'),head=text('h2','최근 7일 완료');head.append(text('span',String(rows.length),'badge'));el.append(head);if(!rows.length)el.append(text('p','최근 완료한 일정이 없어요.','range'));for(const x of rows){const row=text('div','','completed-row'),body=text('div','','completed-body');body.append(text('span',x.subjects.join(' · ')||'일정','completed-subject'),text('span',x.title,'completed-title'));const b=text('button','완료 ✓','btn');b.setAttribute('aria-label',x.title+' 완료 상태 변경');b.onclick=()=>openDetail(x);row.append(body,b);el.append(row);}$('right').append(el);}
function render(){const shown=items.filter(x=>visibleStatus(x.status)&&(!selected||x.subjects.includes(selected))), g=groups(shown), w=weekBounds(todayKey());
 
 $('left').replaceChildren();$('right').replaceChildren();if(g.overdue.length)panel('left','기한 지난 미완료',g.overdue,'먼저 확인해 주세요.',true);panel('left','이번 주 할 일',g.thisWeek,`${compact(w.start)} — ${compact(w.end-1)} · 오늘부터 남은 일정`);panel('left','다음 주 할 일',g.nextWeek,`${compact(w.end)} — ${compact(w.nextEnd-1)}`);panel('right','진행 중',g.active,'작성 완료는 제출 확인 전까지 표시합니다.');panel('right','시작 전',g.planned);if(g.undated.length)panel('right','기한을 정해주세요',g.undated);if(g.later.length)panel('left','그 이후 일정',g.later);completedList(shown.filter(x=>complete(x.status)&&Date.parse(x.completedAt||'')>=Date.now()-7*86400000).sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)));}
async function api(path,opts={}){const r=await fetch(base+path,{...opts,cache:'no-store',headers:{Authorization:'Bearer '+token,...opts.headers}});let data;try{data=await r.json();}catch{throw Error('일정 서버의 응답을 확인하지 못했어요.');}if(r.status===401){forget();token='';connectionSettings(false);}if(!r.ok)throw Error(r.status===401?'연결코드를 확인해 주세요.':data.error||'저장하지 못했어요. 다시 시도해 주세요.');return data;}
async function load(){if(loading)return;loading=true;$('connect').disabled=true;try{const data=await api('/tasks');if(!Array.isArray(data.items))throw Error('일정 데이터 형식을 확인해 주세요.');items=data.items.filter(x=>visibleStatus(x.status));loaded=true;demo=false;selected='';
 const expected=new URL(location.href).searchParams.get('student');
 if(expected&&expected.replaceAll('-','')!==(data.student?.id||'').replaceAll('-','')){items=[];loaded=false;forget();token='';academy.reset();chips();render();throw Error('이 위젯에 연결된 학생의 코드를 입력해 주세요.');}
 message(data.student?.name?data.student.name+' · 노션 연결됨':'노션 연결됨');connectionSettings(true);
 const notionLink=$('student-notion');notionLink.hidden=!data.student?.schoolUrl;notionLink.style.display=data.student?.schoolUrl?'inline-flex':'none';if(data.student?.schoolUrl)notionLink.href=data.student.schoolUrl;$('logout').hidden=false;refreshControl(true);void widgetDownload.connect(data.student?.id||'legacy');$('connect').title='새로고침';$('connect').setAttribute('aria-label','새로고침');$('sync').textContent='최근 불러옴 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(new Date())+' · 월~일 기준';chips();render();await academy.load();try{if(sessionStorage.getItem('river-write-saved')){sessionStorage.removeItem('river-write-saved');toast('노션에 저장했어요.');}}catch{}if($('notify-dialog').open)$('notify-dialog').close();const target=new URL(location.href).searchParams.get('task');if(target){const x=items.find(x=>x.id===target);if(x)openDetail(x);const u=new URL(location.href);u.searchParams.delete('task');history.replaceState(null,'',u);}}catch(e){message(e.message);throw e;}finally{loading=false;$('connect').disabled=false;}}
$('connect').onclick=()=>{if(!base){message('실제 일정 연결은 준비 중입니다. 노션 DB 바로가기는 지금 사용할 수 있어요.');return;}if(token){load().catch(e=>toast(e.message));return;}$('login').showModal();};
$('login-form').onsubmit=async e=>{e.preventDefault();token=$('password').value.trim();$('password').value='';$('login').close();try{await load();remember();}catch(e){token='';toast(e.message);}};$('cancel').onclick=()=>$('login').close();
$('logout').onclick=()=>{$('detail').close();detailItem=null;$('notify-dialog').close();academy.reset();connectionSettings(false);forget();token='';items=[];loaded=false;selected='';$('logout').hidden=true;$('student-notion').hidden=true;$('student-notion').style.display='none';$('student-notion').removeAttribute('href');refreshControl(false);$('connect').title='연결하기';$('connect').setAttribute('aria-label','일정 불러오기');message('일정 화면을 잠갔어요. 다시 열려면 학생 연결코드를 입력해 주세요.');chips();render();};
function showSamples(){demo=true;loaded=true;const w=weekBounds(todayKey()), key=n=>new Date(n*86400000).toISOString().slice(0,10);items=[{id:'sample-1',title:'에세이 초안 다듬기',subjects:['영어 · 샘플'],due:todayKey(),status:'진행 중',submission:'리로스쿨'},{id:'sample-2',title:'탐구 보고서 자료 정리',subjects:['과학 · 샘플'],due:key(w.end+2),status:'시작전',submission:'서면제출'},{id:'sample-3',title:'새로운 멜로디 스케치',subjects:['개인 · 샘플'],due:null,status:'진행 중'}];selected='';message('샘플 화면 · 노션 연결 전');chips();render();};
$('detail-close').onclick=()=>$('detail').close();
$('detail-start').onclick=()=>saveStatus('시작전');
$('detail-progress').onclick=()=>saveStatus('진행 중');
$('detail-done').onclick=()=>saveStatus('완료');
$('detail').addEventListener('click',e=>{if(e.target!==$('detail'))return;const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();});
setInterval(()=>{if(loaded)render();},60000);message('연결하기를 눌러 학생 연결코드를 입력해 주세요.');chips();render();
if(!base)showSamples();

if(base&&(token=remembered()))load().catch(e=>toast(e.message));




