import {mountPicker} from './compact-picker.mjs?v=1';
import {fillSubmissionSelect} from './submission-select.mjs?v=1';
import {createWidgetDownload} from './widget-download.mjs?v=8';
import {paintSubject} from './subject-palette.mjs?v=2';
import {createSettings} from './settings-popup.mjs?v=6';
import {createAcademy} from './main-academy.mjs?v=55-subject-first';
import {groups,todayKey,weekBounds,dayNumber,complete,active,visibleStatus} from './model.mjs?v=2';
const $=id=>document.getElementById(id), base=(window.RIVER_CONFIG?.apiBase||'').replace(/\/$/,'');
let items=[], loaded=false, demo=false, selected='', token='', loading=false;
const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
const compact=n=>new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',month:'numeric',day:'numeric'}).format(new Date(n*86400000));
function toast(s){$('toast').textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').textContent='',4000);}
function setBrandTitle(value){const brand=document.querySelector('.brand');brand.replaceChildren();const match=value.match(/(Fighting|파이팅|화이팅)([!！\\s]*)$/iu);if(!match){brand.textContent=value;return;}brand.append(document.createTextNode(value.slice(0,match.index)),text('span',match[0],'brand-cheer'));}
const widgetDownload=createWidgetDownload(toast);
function refreshControl(connected){const b=$('connect');b.classList.toggle('icon-btn',connected);if(connected)b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg>';else b.textContent='연결하기';}
function subjectColor(s){return [...s].reduce((a,c)=>a+c.charCodeAt(0),0)%4;}
function message(s){$('message').textContent=s;}
function chips(){const all=[...new Set(items.flatMap(x=>x.subjects))].sort();$('chips').replaceChildren();for(const s of ['',...all]){const b=text('button',s||'전체 과목','chip'+(s===selected?' selected':''));b.setAttribute('aria-pressed',String(s===selected));b.onclick=()=>{selected=s;chips();render();};$('chips').append(b);}}

const authKey='river-student-access-v2';
function remembered(){try{const once=sessionStorage.getItem('river-return-code')||'';sessionStorage.removeItem('river-return-code');return once||localStorage.getItem(authKey)||'';}catch{return '';}}
function forget(){try{localStorage.removeItem(authKey);localStorage.removeItem('river-web-revision');}catch{}}
let reconnectWeb=false;
function webHeaders(){let revision='';try{revision=localStorage.getItem('river-web-revision')||'';}catch{}return {'X-River-Revision':revision,...(reconnectWeb?{'X-River-Reconnect':'true'}:{})};}
function saveRevision(data){if(data.webRevision!=null){try{localStorage.setItem('river-web-revision',data.webRevision);}catch{}reconnectWeb=false;}}
function remember(){try{if($('remember').checked)localStorage.setItem(authKey,token);else forget();}catch{}}
const displayStatus=s=>s==='시작전'?'시작 전':s||'상태 미정';
const academy=createAcademy(api,toast);
const notifications=createSettings(api,()=>Boolean(token));
function connectionSettings(connected){for(const id of ['school-add','academy-add']){const action=$(id);action.hidden=!connected;action.style.display=connected?'':'none';}if(!connected){widgetDownload.reset();setBrandTitle('나의 일정');}const button=$('notifications-open');button.hidden=connected;button.style.display=connected?'none':'';if(connected&&$('notify-dialog').open)$('notify-dialog').close();}
$('notifications-open').onclick=()=>{if(!loaded)notifications.open();};
if(new URL(location.href).searchParams.get('settings')==='notifications')notifications.open();
async function refreshSubmissionOptions(x){
 const select=$('detail-submission');select.disabled=true;select.setAttribute('aria-busy','true');
 const pending=document.createElement('option');pending.disabled=true;pending.textContent='노션 목록 불러오는 중…';select.append(pending);
 try{const data=await api('/options');if(!Array.isArray(data.submissions)||!data.submissions.length)throw Error('노션 제출처 목록을 불러오지 못했어요. 다시 열어 주세요.');if(detailItem===x&&$('detail').open)fillSubmissionSelect(select,data.submissions,select.value);}
 catch(error){if(detailItem===x&&$('detail').open){$('detail-error').textContent=error.message;$('detail-error').hidden=false;}pending.remove();}
 finally{if(detailItem===x){select.disabled=saving.has(x.id);select.removeAttribute('aria-busy');}}
}
const saving=new Set();let detailItem=null, draftStatus=null;
function safeNotionUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['app.notion.com','www.notion.so','notion.so'].includes(u.hostname)?u.href:null;}catch{return null;}}
function dueLabel(x){if(!x.due)return '기한 미정';const d=dayNumber(x.due)-dayNumber(todayKey());return `${compact(dayNumber(x.due))} · ${d<0?Math.abs(d)+'일 지남':d===0?'오늘 마감':'D−'+d}`;}
function reminder(x){if(demo)return '디자인 확인용 샘플이에요. 실제 일정은 노션 연결 후 표시됩니다.';if(!x.due)return '기한을 정하면 마감일까지 남은 시간을 확인할 수 있어.';const d=dayNumber(x.due)-dayNumber(todayKey());if(d<0)return '기한이 지났어. 제출 여부와 변경된 기한을 확인해 줘.';if(d===0)return '오늘 제출이야. 파일과 제출처를 마지막으로 확인해!';if(d===1)return '내일 제출이야. 제출할 파일과 제출처를 확인해!';if(d<=2)return '이틀 안에 제출이야. 남은 부분을 확인해!';return '다가오는 제출일을 확인하고 이번 주말에 준비해 둬!';}
function openDetail(x){detailItem=x;draftStatus=x.status;$('detail-date-input').value=x.due?.slice(0,10)||'';$('detail-date-form').hidden=true;$('detail-date-open').setAttribute('aria-expanded','false');$('detail-date-open').disabled=saving.has(x.id);$('detail-due').disabled=saving.has(x.id);$('detail-subject').textContent=x.subjects.join(' · ')||'일정';$('detail-title').textContent=x.title;$('detail-task').textContent=x.taskName||'';$('detail-task').hidden=!x.taskName;$('detail-due').textContent=dueLabel(x);fillSubmissionSelect($('detail-submission'),[],x.submission||'');if(!demo)void refreshSubmissionOptions(x);$('detail-reminder').textContent=reminder(x);$('detail-error').hidden=true;const link=safeNotionUrl(x.url);$('detail-notion').hidden=!link;if(link)$('detail-notion').href=link;else $('detail-notion').removeAttribute('href');for(const [id,status] of [['detail-start','시작전'],['detail-progress','진행 중'],['detail-second','진행 2차'],['detail-written','작성 완료'],['detail-done','완료']]){const b=$(id);b.disabled=saving.has(x.id);b.setAttribute('aria-pressed',String(displayStatus(x.status)===displayStatus(status)));}if(!$('detail').open)$('detail').showModal();}
function selectStatus(status){
 if(!detailItem||saving.has(detailItem.id))return;draftStatus=status;
 for(const [id,value] of [['detail-start','시작전'],['detail-progress','진행 중'],['detail-second','진행 2차'],['detail-written','작성 완료'],['detail-done','완료']])$(id).setAttribute('aria-pressed',String(displayStatus(value)===displayStatus(status)));
}
function cancelDetail(){if(detailItem&&saving.has(detailItem.id))return;$('detail').close();toast('취소되었습니다');}
function openDateEditor(){
 const x=detailItem;if(!x||saving.has(x.id))return;
 $('detail-date-form').hidden=false;$('detail-date-open').setAttribute('aria-expanded','true');$('detail-error').hidden=true;const input=$('detail-date-input');input.focus({preventScroll:true});
 datePicker.open();
}
const datePicker=mountPicker($('detail-date-input'),{title:'날짜 수정',date:true});
mountPicker($('detail-submission'),{title:'제출처 선택'});
$('detail-date-open').onclick=openDateEditor;$('detail-due').onclick=openDateEditor;
$('detail-date-cancel').onclick=cancelDetail;
$('detail-date-form').onsubmit=async e=>{
 e.preventDefault();const x=detailItem;if(!x||saving.has(x.id))return;
 const due=$('detail-date-input').value,from=x.due||null,dateChanged=due!==(from?.slice(0,10)||'');
 if(dateChanged&&(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(dayNumber(due))||new Date(dayNumber(due)*86400000).toISOString().slice(0,10)!==due)){$('detail-error').textContent='변경할 날짜를 선택해 주세요.';$('detail-error').hidden=false;return;}
 saving.add(x.id);$('detail-error').hidden=true;$('detail-date-save').textContent='저장 중…';
 const savedParts=[];const controls=['detail-submission','detail-date-input','detail-date-save','detail-date-cancel','detail-date-open','detail-due','detail-start','detail-progress','detail-second','detail-written','detail-done','detail-close'];for(const id of controls)$(id).disabled=true;render();
 try{
  if(dateChanged){
   const data=demo?{ok:true,id:x.id,due}:await api('/tasks/'+encodeURIComponent(x.id)+'/due',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({due,from})});
   if(!data.ok||data.id!==x.id||typeof data.due!=='string'||data.due.slice(0,10)!==due)throw Error('날짜 저장 결과를 확인하지 못했어요.');
   savedParts.push('날짜');x.due=data.due;const listed=items.find(item=>item.id===x.id);if(listed)listed.due=data.due;$('detail-due').textContent=dueLabel(x);
  }
  if(draftStatus!==x.status){
   if(!demo)await api('/tasks/'+encodeURIComponent(x.id)+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:draftStatus,from:x.status||''})});
   savedParts.push('상태');x.status=draftStatus;x.completedAt=complete(draftStatus)?new Date().toISOString():null;const listed=items.find(item=>item.id===x.id);if(listed)Object.assign(listed,{status:x.status,completedAt:x.completedAt});
  }
  const submission=$('detail-submission').value.trim();
  if(submission!==(x.submission||'')){
   if(!demo)await api('/tasks/'+encodeURIComponent(x.id)+'/submission',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({submission,from:x.submission||''})});
   savedParts.push('제출처');x.submission=submission;const listed=items.find(item=>item.id===x.id);if(listed)listed.submission=submission;
  }
  chips();render();if(detailItem?.id===x.id)$('detail').close();toast(demo?'샘플 변경 내용을 저장했어요.':'변경 내용을 저장했어요.');
 }catch(error){if(detailItem?.id===x.id){$('detail-error').textContent=(savedParts.length?savedParts.join('·')+' 저장 완료. 나머지는 저장하지 못했습니다. 다시 저장해 주세요. ':'')+error.message;$('detail-error').hidden=false;}}
 finally{saving.delete(x.id);$('detail-date-save').textContent='저장';for(const id of controls)$(id).disabled=false;render();}
};
function card(x,statusGroup=false){const el=text('article','','card'+(!complete(x.status)&&x.due&&dayNumber(x.due)<=dayNumber(todayKey())?' needs-attention':''));
 const body=text('div','','card-body'),heading=text('div','','card-heading'),tags=text('div','','tags');for(const subject of x.subjects){const tag=text('span',subject,'tag');paintSubject(tag,x.subjectColors?.[subject],subject);if(!tags.children.length)el.style.setProperty('--subject-line',tag.style.backgroundColor);tags.append(tag);}heading.append(tags);if(!complete(x.status)&&x.due&&dayNumber(x.due)<=dayNumber(todayKey()))heading.append(text('span','🔥','school-flame'));body.append(heading);
 const title=text('button',x.title,'title');title.type='button';title.onclick=()=>openDetail(x);body.append(title);
 const meta=text('div','','meta'),dateButton=text('button',dueLabel(x),'school-date-trigger'+(x.due&&dayNumber(x.due)<=dayNumber(todayKey())?' deadline':''));dateButton.type='button';dateButton.setAttribute('aria-label',x.title+' 날짜 수정');dateButton.disabled=saving.has(x.id);dateButton.onclick=()=>{openDetail(x);openDateEditor();};meta.append(dateButton);if(!statusGroup||!['시작전','진행 중'].includes(x.status))meta.append(text('span',displayStatus(x.status),'status'));heading.append(meta);el.append(body);return el;
}
function panel(target,title,rows,range='',overdue=false,statusGroup=false){const el=text('section','','panel'+(overdue?' overdue':'')+(statusGroup?' status-column':'')),head=text('h2',title);head.append(text('span',String(rows.length),'badge'));el.append(head);if(range)el.append(text('p',range,'range'));if(!loaded){}else if(!rows.length)el.append(text('div','해당하는 일정이 없어요.','empty'));else {const grid=text('div','','task-grid');for(const x of rows)grid.append(card(x,statusGroup));el.append(grid);}(typeof target==='string'?$(target):target).append(el);}
function completedList(rows){const el=text('section','','panel'),head=text('h2','최근 7일 완료');head.append(text('span',String(rows.length),'badge'));el.append(head);if(!rows.length)el.append(text('p','최근 완료한 일정이 없어요.','range'));for(const x of rows){const row=text('div','','completed-row'),body=text('div','','completed-body');const tags=text('div','','tags');for(const subject of x.subjects){const tag=text('span',subject,'tag');paintSubject(tag,x.subjectColors?.[subject],subject);tags.append(tag);}if(!x.subjects.length)tags.append(text('span','일정','tag'));const title=text('button',x.title,'title completed-title');title.type='button';title.onclick=()=>openDetail(x);body.append(tags,title);const b=text('button','완료 ✓','btn');b.setAttribute('aria-label',x.title+' 완료 상태 변경');b.onclick=()=>openDetail(x);row.append(body,b);el.append(row);}$('right').append(el);}
function render(){const shown=items.filter(x=>visibleStatus(x.status)&&(!selected||x.subjects.includes(selected))), g=groups(shown), w=weekBounds(todayKey());
 
 $('left').replaceChildren();$('right').replaceChildren();if(g.overdue.length)panel('left','기한 지난 미완료',g.overdue,'먼저 확인해 주세요.',true);panel('left','이번 주 할 일',g.thisWeek,`${compact(w.start)} — ${compact(w.end-1)} · 오늘부터 남은 일정`);panel('left','다음 주 할 일',g.nextWeek,`${compact(w.end)} — ${compact(w.nextEnd-1)}`);const statusColumns=text('div','','status-columns');statusColumns.setAttribute('role','group');statusColumns.setAttribute('aria-label','시작 전과 진행 중 일정');$('right').append(statusColumns);panel(statusColumns,'시작 전',g.planned,'',false,true);panel(statusColumns,'진행 중',g.active,'',false,true);if(g.undated.length)panel('right','기한을 정해주세요',g.undated);if(g.later.length)panel('left','그 이후 일정',g.later);completedList(shown.filter(x=>complete(x.status)&&Date.parse(x.completedAt||'')>=Date.now()-7*86400000).sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)));}
async function api(path,opts={}){const r=await fetch(base+path,{...opts,cache:'no-store',headers:{Authorization:'Bearer '+token,...webHeaders(),...opts.headers}});let data;try{data=await r.json();}catch{throw Error('일정 서버의 응답을 확인하지 못했어요.');}if(r.status===401){$('logout').click();}if(!r.ok){const error=Error(r.status===401?'연결코드를 확인해 주세요.':data.error||'저장하지 못했어요. 다시 시도해 주세요.');error.status=r.status;throw error;}saveRevision(data);return data;}
async function load(){if(loading||$('detail').open||$('academy-dialog').open)return;loading=true;$('connect').disabled=true;try{let data;try{data=await api('/dashboard');}catch(e){if(e.status!==404)throw e;data=await api('/tasks');}if(!Array.isArray(data.items))throw Error('일정 데이터 형식을 확인해 주세요.');if($('detail').open||$('academy-dialog').open)return;items=data.items.filter(x=>visibleStatus(x.status));loaded=true;demo=false;selected='';
 const expected=new URL(location.href).searchParams.get('student');
 if(expected&&expected.replaceAll('-','')!==(data.student?.id||'').replaceAll('-','')){items=[];loaded=false;forget();token='';academy.reset();chips();render();throw Error('이 위젯에 연결된 학생의 코드를 입력해 주세요.');}
 const studentName=data.student?.name?.trim(),commonTitle=data.student?.widgetTitle?.trim();setBrandTitle(commonTitle&&commonTitle!=='CHOI RIVER 포레버'&&commonTitle!==studentName+'의 일정'?commonTitle:studentName?studentName+' Fighting':'나의 일정');
 message('노션 연결됨');connectionSettings(true);
 const notionLink=$('student-notion');notionLink.hidden=!data.student?.schoolUrl;notionLink.style.display=data.student?.schoolUrl?'inline-flex':'none';if(data.student?.schoolUrl)notionLink.href=data.student.schoolUrl;$('logout').hidden=false;refreshControl(true);void widgetDownload.connect(data.student?.id||'legacy');$('connect').title='새로고침';$('connect').setAttribute('aria-label','새로고침');$('sync').textContent='최근 불러옴 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(new Date())+' · 월~일 기준';chips();render();await academy.load(data.academy);try{if(sessionStorage.getItem('river-write-saved')){sessionStorage.removeItem('river-write-saved');toast('노션에 저장했어요.');}}catch{}if($('notify-dialog').open)$('notify-dialog').close();const target=new URL(location.href).searchParams.get('task');if(target){const x=items.find(x=>x.id===target);if(x)openDetail(x);const u=new URL(location.href);u.searchParams.delete('task');history.replaceState(null,'',u);}}catch(e){message(e.message);throw e;}finally{loading=false;$('connect').disabled=false;}}
$('connect').onclick=()=>{if(!base){message('실제 일정 연결은 준비 중입니다. 노션 DB 바로가기는 지금 사용할 수 있어요.');return;}if(token){load().catch(e=>toast(e.message));return;}$('login').showModal();};
$('login-form').onsubmit=async e=>{e.preventDefault();reconnectWeb=true;token=$('password').value.trim();$('password').value='';$('login').close();try{await load();remember();}catch(e){token='';toast(e.message);}};$('cancel').onclick=()=>$('login').close();
$('logout').onclick=()=>{$('detail').close();detailItem=null;$('notify-dialog').close();academy.reset();connectionSettings(false);forget();token='';items=[];loaded=false;selected='';$('logout').hidden=true;$('student-notion').hidden=true;$('student-notion').style.display='none';$('student-notion').removeAttribute('href');refreshControl(false);$('connect').title='연결하기';$('connect').setAttribute('aria-label','일정 불러오기');message('학생코드를 연결하세요');chips();render();};
function showSamples(){demo=true;loaded=true;const w=weekBounds(todayKey()), key=n=>new Date(n*86400000).toISOString().slice(0,10);items=[{id:'sample-1',title:'에세이 초안 다듬기',subjects:['영어 · 샘플'],due:todayKey(),status:'진행 중',submission:'리로스쿨'},{id:'sample-2',title:'탐구 보고서 자료 정리',subjects:['과학 · 샘플'],due:key(w.end+2),status:'시작전',submission:'서면제출'},{id:'sample-3',title:'새로운 멜로디 스케치',subjects:['개인 · 샘플'],due:null,status:'진행 중'}];selected='';message('샘플 화면 · 노션 연결 전');chips();render();};
$('detail-close').onclick=cancelDetail;
$('detail').addEventListener('cancel',e=>{e.preventDefault();cancelDetail();});
$('detail-start').onclick=()=>selectStatus('시작전');
$('detail-progress').onclick=()=>selectStatus('진행 중');
$('detail-second').onclick=()=>selectStatus('진행 2차');
$('detail-written').onclick=()=>selectStatus('작성 완료');
$('detail-done').onclick=()=>selectStatus('완료');
$('detail').addEventListener('click',e=>{if(e.target!==$('detail'))return;const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cancelDetail();});
setInterval(()=>{if(loaded&&!document.querySelector('dialog[open]'))render();},60000);message('학생코드를 연결하세요');chips();render();
if(!base)showSamples();

if(base&&(token=remembered()))load().catch(e=>toast(e.message));





// Revalidate an open visible dashboard so a revoked connection clears its data.
setInterval(()=>{if(token&&loaded&&!document.hidden)load().catch(e=>toast(e.message));},300000);

