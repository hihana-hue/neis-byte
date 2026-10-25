import {mountAcademyCalendar} from './academy-calendar.mjs?v=1';
import {weekday} from './date-weekday.mjs?v=1';
import {toStart,localInput,lessonRounds} from './academy-model.mjs?v=4';
export function createAcademy(api,notify){
 const $=id=>document.getElementById(id),el=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
 let rows=[],current=null,mode='',busy=false,connected=false;
 const calendar=mountAcademyCalendar($('academy-date'));
 const updateWeekday=()=>{$('academy-weekday').textContent=weekday($('academy-date').value);calendar.refresh();};
 $('academy-date').addEventListener('input',updateWeekday);$('academy-date').addEventListener('change',updateWeekday);
 const kindLabel=k=>k==='운동'?'바디PT':String(k||'일정');
 function icon(kind){
  const span=el('span','','academy-icon'),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','16');svg.setAttribute('height','16');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
  path.setAttribute('d',kind==='과학'?'M9 3h6M10 3v7L5 19a1.4 1.4 0 0 0 1.2 2h11.6A1.4 1.4 0 0 0 19 19l-5-9V3M8 15h8':['운동','바디PT'].includes(kind)?'M3 8v8M6 6v12M18 6v12M21 8v8M6 12h12':kind==='교회'?'M12 2v7M9 5h6M4 13l8-5 8 5v9H4zM10 22v-6h4v6':'M5 4h14v17H5zM8 2v4M16 2v4M5 9h14');
  svg.append(path);span.append(svg);return span;
 }
 const label=s=>s?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(s)):'시간 미정';
 const seoulDay=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
 const pendingLabel=start=>{
  if(!start||!Number.isFinite(Date.parse(start)))return '◷ 예정';
  const day=seoulDay(start),today=seoulDay(Date.now());
  return day===today?'오늘':day<today?'확인 필요':'◷ 예정';
 };
 function render(){
  $('academy-rows').replaceChildren();
  const rounds=lessonRounds(rows);
  const pending=rows.filter(x=>x.status==='예정').sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  if(!pending.length)$('academy-rows').append(el('span',connected?'예정된 학원 수업 없음':'연결하면 학원 일정이 보여요.','academy-empty'));
  for(const x of pending){const b=el('button','','academy-line');b.type='button';b.classList.toggle('academy-today',!!x.start&&Number.isFinite(Date.parse(x.start))&&seoulDay(x.start)===seoulDay(Date.now()));b.disabled=busy;b.setAttribute('aria-label',kindLabel(x.kind)+' '+label(x.start)+' 출결 변경');
   b.append(icon(x.kind),el('strong',kindLabel(x.kind)),el('span',rounds.get(x.id)==='클리닉'?'(클)':rounds.get(x.id)||'','academy-round'),el('span',label(x.start),'academy-time'),el('span',pendingLabel(x.start),'academy-pending'));if(x.originalStart){const note=el('small',label(x.originalStart)+' 수업 보강');note.style.display='block';b.querySelector('.academy-time').append(note);}b.onclick=()=>open('status',x);$('academy-rows').append(b);}
 }
 function types(kind,selected='수업'){const values=['수업','클리닉'];$('academy-type').replaceChildren(...values.map(v=>{const o=el('option',v);o.value=v;return o;}));$('academy-type').value=values.includes(selected)?selected:'수업';}
 function open(action,x=null){
  if(busy)return;if(!connected){notify('먼저 일정을 불러와 주세요.');return;}
  current=x;mode=action;$('academy-error').textContent='';
  $('academy-dialog-title').textContent=action==='status'?'출석했나요?':action==='next'?'다음 수업을 등록할까요?':action==='change'?'보강 날짜 선택':action==='absent'?'결석으로 기록할까요?':'수업 등록';
  $('academy-current').textContent=x?kindLabel(x.kind)+' · '+(x.subtype||'수업')+' · '+label(x.start)+(x.originalStart?' · '+label(x.originalStart)+' 수업 보강':''):'';
  $('academy-status-actions').hidden=action!=='status';$('academy-save').hidden=action==='status';
  $('academy-kind-field').hidden=action!=='add';$('academy-date-field').hidden=['status','absent'].includes(action);$('academy-type-field').hidden=['status','absent'].includes(action);$('academy-charge-field').hidden=action!=='absent'||['클리닉','연습'].includes(x?.subtype);
  $('academy-charge').checked=false;$('academy-date-label').textContent=action==='next'?'다음 수업 날짜 · 시간':action==='change'?'보강 날짜 · 시간':'수업 날짜 · 시간';if(x?.kind&&!Array.from($('academy-kind').options).some(o=>o.value===x.kind)){const option=el('option',kindLabel(x.kind));option.value=x.kind;$('academy-kind').append(option);}$('academy-kind').value=x?.kind||'바디PT';types($('academy-kind').value,x?.subtype);
  const next=x?.start?new Date(Date.parse(x.start)+7*86400000).toISOString():null;
  $('academy-date').value=action==='next'?localInput(next):x?localInput(x.start):'';$('academy-date').required=!['status','absent'].includes(action);$('academy-date').disabled=['status','absent'].includes(action);updateWeekday();
  $('academy-save').textContent=action==='next'||action==='add'?'수업 등록하기':'확인';$('academy-cancel').title=action==='next'?'다음 수업을 등록하지 않고 닫기':'닫기';
  if(!$('academy-dialog').open)$('academy-dialog').showModal();
 }
 async function persist(path,body,success){
  if(busy)return;busy=true;for(const id of ['academy-save','academy-cancel','academy-attend','academy-change','academy-absent'])$(id).disabled=true;render();
  try{const d=await api(path,{method:mode==='add'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!d.ok||!d.item)throw Error('저장 결과를 확인하지 못했어요.');rows=rows.filter(x=>x.id!==d.item.id&&x.id!==d.next?.id);rows.push(d.item);if(d.next)rows.push(d.next);
   busy=false;success(d);
  }catch(err){$('academy-error').textContent=err.message;}
  finally{busy=false;for(const id of ['academy-save','academy-cancel','academy-attend','academy-change','academy-absent'])$(id).disabled=false;render();}
 }
 $('academy-kind').onchange=()=>types($('academy-kind').value);
 $('academy-add').onclick=()=>open('add');$('academy-cancel').onclick=()=>$('academy-dialog').close();$('academy-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('academy-change').onclick=()=>open('change',current);$('academy-absent').onclick=()=>open('absent',current);
 $('academy-attend').onclick=()=>{if(!current)return;return persist('/academy/'+encodeURIComponent(current.id),{action:'attendance',status:'출석',charge:false,updated:current.updated},d=>{notify('출석을 기록했어요.');open('next',d.item);});};
 $('academy-form').onsubmit=async e=>{
  e.preventDefault();if(busy||mode==='status')return;let start;try{if(mode!=='absent')start=toStart($('academy-date').value);}catch(err){$('academy-error').textContent=err.message;return;}
  const subtype=$('academy-type').value;
  const body=mode==='add'?{kind:$('academy-kind').value,start,subtype,note:''}:mode==='change'?{action:'reschedule',start,subtype,updated:current.updated}:mode==='absent'?{action:'attendance',status:'결석',charge:!['클리닉','연습'].includes(current.subtype)&&$('academy-charge').checked,updated:current.updated}:{action:'attendanceNext',nextStart:start,nextSubtype:subtype,updated:current.updated};
  await persist(mode==='add'?'/academy':'/academy/'+encodeURIComponent(current.id),body,d=>{$('academy-dialog').close();notify(mode==='next'?'다음 수업을 등록했어요.':'노션에 저장했어요.');});
 };
 setInterval(()=>{if(connected&&!busy)render();},60000);
 render();
 return {async load(){try{const d=await api('/academy');if(!Array.isArray(d.items))throw Error('학원 데이터를 확인해 주세요.');rows=d.items;connected=true;render();const id=new URL(location.href).searchParams.get('lesson');if(id){const x=rows.find(x=>x.id===id&&x.status==='예정');if(x)open('status',x);else notify('이미 출결을 처리했거나 변경된 수업이에요.');const u=new URL(location.href);u.searchParams.delete('lesson');history.replaceState(null,'',u);}}catch(e){$('academy-rows').replaceChildren(el('span',e.message,'academy-empty'));}},reset(){rows=[];connected=false;render();$('academy-dialog').close();}};
}


