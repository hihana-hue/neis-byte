import {mountAcademyCalendar} from './academy-calendar.mjs?v=3';
import {weekday} from './date-weekday.mjs?v=1';
import {toStart,localInput,lessonRounds,packSize,scheduleCategory,scheduleKindLabel,scheduleTitle} from './academy-model.mjs?v=7';
export function createAcademy(api,notify){
 const $=id=>document.getElementById(id),el=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
 let rows=[],current=null,mode='',busy=false,connected=false,expanded=false,opening=false,connectionEpoch=0;
 const category=x=>x.category||scheduleCategory(x.kind),name=scheduleTitle,kindLabel=scheduleKindLabel;
 const categoryFilter=el('select','','personal-filter');categoryFilter.setAttribute('aria-label','개인 일정구분');const allOption=el('option','전체');allOption.value='__all';categoryFilter.append(allOption);$('message').before(categoryFilter);categoryFilter.hidden=true;categoryFilter.onchange=()=>{expanded=false;render();};
 const moreButton=el('button','more...','academy-more');moreButton.type='button';moreButton.hidden=true;moreButton.setAttribute('aria-controls','academy-rows');$('academy-rows').after(moreButton);moreButton.onclick=()=>{expanded=!expanded;render();};
 const calendar=mountAcademyCalendar($('academy-date'));
 const updateWeekday=()=>{$('academy-weekday').textContent=weekday($('academy-date').value);calendar.refresh();};
 $('academy-date').addEventListener('input',updateWeekday);$('academy-date').addEventListener('change',updateWeekday);
 function icon(kind){
  const span=el('span','','academy-icon'),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','16');svg.setAttribute('height','16');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
  path.setAttribute('d',kind==='과학'?'M9 3h6M10 3v7L5 19a1.4 1.4 0 0 0 1.2 2h11.6A1.4 1.4 0 0 0 19 19l-5-9V3M8 15h8':['운동','바디PT'].includes(kind)?'M3 8v8M6 6v12M18 6v12M21 8v8M6 12h12':String(kind).trim().toUpperCase()==='TEEN'?'M12 3v18M6 9h12':kind==='교회'?'M12 2v7M9 5h6M4 13l8-5 8 5v9H4zM10 22v-6h4v6':'M5 4h14v17H5zM8 2v4M16 2v4M5 9h14');
  svg.append(path);span.append(svg);return span;
 }

 const label=s=>!s?'날짜 미정':s.length===10?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short'}).format(new Date(s))+' · 시간 미정':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(s));
 const seoulDay=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
 const money=n=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(n)+'원';
 function courseText(x){return x.packSize&&x.fee!=null?x.packSize+'회 · '+money(x.fee)+' · 1회 '+money(x.fee/x.packSize)+(x.paid?' · 납부':' · 미납'):'회차·원비 미설정';}
 function render(){
  $('academy-rows').replaceChildren();categoryFilter.hidden=!connected;const rounds=lessonRounds(rows);
  const pending=rows.filter(x=>x.status==='예정'&&(categoryFilter.value==='__all'||x.kind===categoryFilter.value)).sort((a,b)=>(a.start||'9999').localeCompare(b.start||'9999'));
  if(connected&&!pending.length)$('academy-rows').append(el('span','예정된 개인 일정 없음','academy-empty'));
  moreButton.hidden=!connected||pending.length<=4;moreButton.textContent=expanded?'접기':'more...';moreButton.setAttribute('aria-expanded',String(expanded));moreButton.disabled=busy;
  for(const x of (expanded?pending:pending.slice(0,4))){const b=el('button','','academy-line');b.type='button';const attention=!!x.start&&Number.isFinite(Date.parse(x.start))&&seoulDay(x.start)<=seoulDay(Date.now());b.classList.toggle('academy-today',attention);b.disabled=busy;b.setAttribute('aria-label',name(x)+' '+label(x.start)+' 일정 확인');if(attention)b.append(el('span','🔥','personal-flame'));
   b.append(icon(kindLabel(x.kind)),el('strong',name(x)),el('span',rounds.get(x.id)==='클리닉'?'(클)':rounds.get(x.id)||'','academy-round'),el('span',label(x.start),'academy-time'));if(x.originalStart&&category(x)==='학원'&&seoulDay(x.originalStart)!==seoulDay(x.start)){const note=el('small','원 수업 : '+label(x.originalStart));note.style.display='block';b.querySelector('.academy-time').append(note);}b.onclick=()=>open('status',x);$('academy-rows').append(b);}
 }
 function updateKinds(kinds){
  const select=$('academy-kind'),previous=select.value,filterValue=categoryFilter.value,values=[...new Set((Array.isArray(kinds)?kinds:rows.map(x=>x.kind)).filter(Boolean))];
  select.replaceChildren(...values.map(k=>{const o=el('option',k);o.value=k;return o;}));
  const add=el('option','＋ 새 학원');add.value='__new_academy';select.append(add);
  select.value=values.includes(previous)?previous:values.includes('약속')?'약속':values.find(k=>scheduleCategory(k)!=='학원')||values[0]||'__new_academy';
  const all=el('option','전체');all.value='__all';categoryFilter.replaceChildren(all,...values.map(k=>{const o=el('option',k);o.value=k;return o;}));categoryFilter.value=values.includes(filterValue)?filterValue:'__all';
 }
 const selectedKind=()=>$('academy-kind').value==='__new_academy'?'학원 · '+$('academy-new-kind').value.trim():$('academy-kind').value;
 function defaults(kind){const known=rows.filter(x=>x.kind===kind&&x.packSize&&x.fee!=null).sort((a,b)=>(b.start||'').localeCompare(a.start||''))[0];return known||{packSize:packSize[kind]||null,fee:null,paid:false};}
 function fillCourse(x){$('academy-pack').value=x?.packSize||'';$('academy-fee').value=x?.fee??'';$('academy-paid').checked=!!x?.paid;estimate();}
 function estimate(){const n=Number($('academy-pack').value),fee=Number($('academy-fee').value);$('academy-fee-preview').textContent=$('academy-pack').value&&$('academy-fee').value&&n>0?'1회 '+money(fee/n):'';}
 function configure(){const adding=mode==='add',regular=adding?($('academy-kind').value==='__new_academy'||scheduleCategory(selectedKind())==='학원'):category(current||{kind:'약속'})==='학원';const editable=adding||mode==='next',billing=regular&&(mode==='course'||(editable&&$('academy-type').value==='수업'));
  $('academy-title-field').hidden=!editable||regular;$('academy-title').disabled=$('academy-title-field').hidden;$('academy-title').required=editable&&!regular;
  $('academy-new-kind-field').hidden=!adding||$('academy-kind').value!=='__new_academy';$('academy-new-kind').required=!$('academy-new-kind-field').hidden;$('academy-new-kind').disabled=$('academy-new-kind-field').hidden;
  $('academy-type-field').hidden=!regular||!editable;$('academy-type').disabled=$('academy-type-field').hidden;
  $('academy-billing').hidden=!billing;for(const id of ['academy-pack','academy-fee','academy-paid'])$(id).disabled=!billing;for(const id of ['academy-pack','academy-fee'])$(id).required=billing;
  $('academy-course-settings').hidden=mode!=='status'||!regular;$('academy-course-summary').hidden=mode!=='status'||!regular;if(regular&&current)$('academy-course-summary').textContent=courseText(current);
 }
 function open(action,x=null){if(busy)return;if(!connected){notify('먼저 학생코드를 연결해 주세요.');return;}current=x;mode=action;$('academy-error').textContent='';
  const regular=x&&category(x)==='학원';$('academy-dialog-title').textContent=action==='status'?(regular?'출석했나요?':'완료했나요?'):action==='next'?'다음 수업 등록':action==='change'?'일정 날짜 변경':action==='absent'?(regular?'결석으로 기록할까요?':'취소로 기록할까요?'):action==='course'?'회차·원비 설정':'일정 등록';
  $('academy-attend').textContent=regular?'완료 · 출석':'완료';$('academy-absent').textContent=regular?'결석':'취소';
  $('academy-current').replaceChildren();if(x){$('academy-current').append(el('span',name(x),'academy-current-kind'),el('span',label(x.start),'academy-current-date'));if(x.originalStart&&seoulDay(x.originalStart)!==seoulDay(x.start))$('academy-current').append(el('span','원 수업 : '+label(x.originalStart),'academy-original-date'));}
  $('academy-status-actions').hidden=action!=='status';$('academy-save').hidden=action==='status';$('academy-kind-field').hidden=action!=='add';$('academy-title-field').hidden=!['add','next'].includes(action);$('academy-title').disabled=$('academy-title-field').hidden;$('academy-title').required=!$('academy-title-field').hidden;
  if(action==='add'){$('academy-title').value='';$('academy-new-kind').value='';}else if(action==='next')$('academy-title').value=kindLabel(x.kind);
  $('academy-type').value=['수업','클리닉'].includes(x?.subtype)?x.subtype:'수업';
  fillCourse(action==='course'?x:action==='next'?{...defaults(x.kind),paid:false}:defaults(selectedKind()));
  const dated=['add','next','change'].includes(action);$('academy-date-field').hidden=!dated;$('academy-date').disabled=!dated;$('academy-date').required=dated;$('academy-date-label').textContent=action==='next'?'다음 수업 날짜 · 시간':'날짜 · 시간';
  const next=x?.start&&x.start.includes('T')?new Date(Date.parse(x.start)+7*86400000).toISOString():null;$('academy-date').value=action==='next'?localInput(next):action==='change'?localInput(x.start):'';updateWeekday();
  $('academy-charge-field').hidden=action!=='absent'||!regular||['클리닉','연습'].includes(x?.subtype);$('academy-charge').checked=false;$('academy-save').textContent=action==='add'||action==='next'?'저장':'확인';configure();if(!$('academy-dialog').open)$('academy-dialog').showModal();
 }
 async function persist(path,body,success){if(busy)return;busy=true;$('academy-error').textContent='';for(const id of ['academy-save','academy-cancel','academy-attend','academy-change','academy-absent','academy-course-settings'])$(id).disabled=true;render();
  try{const d=await api(path,{method:mode==='add'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!d.ok||!d.item)throw Error('저장 결과를 확인하지 못했어요.');rows=rows.filter(x=>x.id!==d.item.id&&x.id!==d.next?.id);rows.push(d.item);if(d.next)rows.push(d.next);busy=false;success(d);}catch(err){$('academy-error').textContent=err.message;notify('저장하지 못했어요. '+err.message);}finally{busy=false;for(const id of ['academy-save','academy-cancel','academy-attend','academy-change','academy-absent','academy-course-settings'])$(id).disabled=false;render();}
 }
 $('academy-kind').onchange=()=>{fillCourse(defaults(selectedKind()));configure();};$('academy-type').onchange=configure;$('academy-pack').oninput=estimate;$('academy-fee').oninput=estimate;
 $('academy-add').onclick=async()=>{
  if(busy||opening)return;if(!connected){notify('먼저 학생코드를 연결해 주세요.');return;}
  const epoch=connectionEpoch;opening=true;$('academy-add').disabled=true;
  try{const d=await api('/academy');if(!connected||epoch!==connectionEpoch)return;if(!Array.isArray(d.items)||!Array.isArray(d.kinds))throw Error('노션 일정구분을 확인하지 못했어요.');rows=d.items;updateKinds(d.kinds);render();open('add');}
  catch(e){notify('노션 최신 일정구분을 불러오지 못했어요. '+e.message);}
  finally{opening=false;$('academy-add').disabled=false;}
 };$('academy-cancel').onclick=()=>$('academy-dialog').close();$('academy-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});$('academy-change').onclick=()=>open('change',current);$('academy-absent').onclick=()=>open('absent',current);$('academy-course-settings').onclick=()=>open('course',current);
 $('academy-attend').onclick=()=>{if(!current)return;return persist('/academy/'+encodeURIComponent(current.id),{action:'attendance',status:category(current)==='학원'?'출석':'완료',charge:false,updated:current.updated},d=>{if(category(d.item)==='학원'){notify('출석을 기록했어요.');open('next',d.item);}else{$('academy-dialog').close();notify('완료로 기록했어요.');}});};
 $('academy-form').onsubmit=async e=>{e.preventDefault();if(busy||mode==='status')return;try{
   let start;if(['add','change','next'].includes(mode))start=toStart($('academy-date').value);
   const subtype=$('academy-type').value,settings={};if(!$('academy-billing').hidden){if(!$('academy-pack').value||!$('academy-fee').value)throw Error('수강 회차와 묶음 원비를 입력해 주세요.');settings.packSize=Number($('academy-pack').value);settings.fee=Number($('academy-fee').value);settings.paid=$('academy-paid').checked;if(!Number.isInteger(settings.packSize)||settings.packSize<1||settings.packSize>1000||!Number.isInteger(settings.fee)||settings.fee<0||settings.fee>100000000)throw Error('회차·원비 입력값을 확인해 주세요.');}
   const regular=mode==='next'||$('academy-kind').value==='__new_academy'||scheduleCategory(selectedKind())==='학원',title=regular?kindLabel(mode==='next'?current.kind:selectedKind())+' '+subtype:$('academy-title').value.trim();
   if(['add','next'].includes(mode)&&!regular&&!title)throw Error('일정명을 입력해 주세요.');if(mode==='add'&&$('academy-kind').value==='__new_academy'&&!$('academy-new-kind').value.trim())throw Error('학원 이름을 입력해 주세요.');
   const body=mode==='add'?{schemaVersion:2,kind:selectedKind(),title,start,subtype,note:'',...settings}:mode==='next'?{schemaVersion:2,action:'attendanceNext',nextStart:start,nextSubtype:subtype,title,updated:current.updated,...settings}:mode==='course'?{action:'courseSettings',updated:current.updated,...settings}:mode==='change'?{action:'reschedule',start,updated:current.updated}:{action:'attendance',status:category(current)==='학원'?'결석':'취소',charge:!$('academy-charge-field').hidden&&$('academy-charge').checked,updated:current.updated};
   await persist(mode==='add'?'/academy':'/academy/'+encodeURIComponent(current.id),body,()=>{$('academy-dialog').close();notify('노션에 저장했어요.');});
  }catch(err){$('academy-error').textContent=err.message;}
 };
 setInterval(()=>{if(connected&&!busy)render();},60000);render();
 return {async load(prefetched){try{const d=prefetched||await api('/academy');if(!Array.isArray(d.items))throw Error('개인 일정 데이터를 확인해 주세요.');rows=d.items;updateKinds(d.kinds);connected=true;render();const id=new URL(location.href).searchParams.get('lesson');if(id){const x=rows.find(x=>x.id===id&&x.status==='예정');if(x)open('status',x);else notify('이미 처리되거나 변경된 일정이에요.');const u=new URL(location.href);u.searchParams.delete('lesson');history.replaceState(null,'',u);}}catch(e){moreButton.hidden=true;$('academy-rows').replaceChildren(el('span',e.message,'academy-empty'));}},reset(){connectionEpoch++;rows=[];connected=false;expanded=false;render();$('academy-dialog').close();}};
}
