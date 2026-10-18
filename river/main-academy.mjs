import {toStart,localInput} from './academy-model.mjs';
export function createAcademy(api,notify){
 const $=id=>document.getElementById(id),el=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
 let rows=[],current=null,mode='',busy=false,connected=false;
 const label=s=>s?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(s)):'시간 미정';
 function render(){
  $('academy-rows').replaceChildren();
  const pending=rows.filter(x=>x.status==='예정').sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  if(!pending.length)$('academy-rows').append(el('p',connected?'예정된 수업이 없어요.':'연결하면 학원 일정이 보여요.','range'));
  for(const x of pending){const row=el('div','','academy-inline-row'),body=el('div','','academy-inline-body');body.append(el('strong',x.kind),el('span',label(x.start)));if(x.start&&Date.parse(x.start)<Date.now())body.append(el('small','출석 확인 필요'));row.append(body);const buttons=el('div','','academy-inline-buttons');
   for(const [title,action] of [['출석','attend'],['변경','change'],['결석','absent']]){const b=el('button',title,'btn');b.disabled=busy;b.onclick=()=>open(action,x);buttons.append(b);}row.append(buttons);$('academy-rows').append(row);}
 }
 function open(action,x=null){
  if(busy)return;if(!connected){notify('먼저 일정을 불러와 주세요.');return;}
  current=x;mode=action;$('academy-error').textContent='';
  $('academy-dialog-title').textContent=action==='attend'?'출석했나요? 다음 수업도 등록할까요?':action==='change'?'수업 날짜 변경':action==='absent'?'결석으로 기록할까요?':'수업 등록';
  $('academy-current').textContent=x?x.kind+' · '+label(x.start):'';
  $('academy-kind-field').hidden=action!=='add';$('academy-date-field').hidden=action==='absent';$('academy-next-field').hidden=action!=='attend';$('academy-charge-field').hidden=action!=='absent';
  $('academy-next').checked=true;$('academy-charge').checked=false;$('academy-date-label').textContent=action==='attend'?'다음 수업 날짜 · 시간':'수업 날짜 · 시간';
  const next=x?.start?new Date(Date.parse(x.start)+7*86400000).toISOString():null;
  $('academy-date').value=action==='attend'?localInput(next):x?localInput(x.start):'';$('academy-date').required=action!=='absent';$('academy-date').disabled=action==='absent';
  $('academy-save').textContent=action==='attend'?'출석 확인 · 다음 수업 저장':'확인';$('academy-dialog').showModal();
 }
 $('academy-next').onchange=()=>{$('academy-date').required=$('academy-next').checked;$('academy-date').disabled=!$('academy-next').checked;$('academy-save').textContent=$('academy-next').checked?'출석 확인 · 다음 수업 저장':'출석 확인';};
 $('academy-add').onclick=()=>open('add');$('academy-cancel').onclick=()=>$('academy-dialog').close();$('academy-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('academy-form').onsubmit=async e=>{
  e.preventDefault();if(busy)return;let start;try{if(mode!=='absent'&&(mode!=='attend'||$('academy-next').checked))start=toStart($('academy-date').value);}catch(err){$('academy-error').textContent=err.message;return;}
  busy=true;$('academy-save').disabled=true;$('academy-cancel').disabled=true;render();
  try{
   const body=mode==='add'?{kind:$('academy-kind').value,start,note:''}:mode==='change'?{action:'reschedule',start,updated:current.updated}:mode==='absent'?{action:'attendance',status:'결석',charge:$('academy-charge').checked,updated:current.updated}:{action:'attendanceNext',nextStart:start||null,updated:current.updated};
   const d=await api(mode==='add'?'/academy':'/academy/'+encodeURIComponent(current.id),{method:mode==='add'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!d.ok||!d.item)throw Error('저장 결과를 확인하지 못했어요.');
   rows=rows.filter(x=>x.id!==d.item.id&&x.id!==d.next?.id);rows.push(d.item);if(d.next)rows.push(d.next);
   $('academy-dialog').close();notify(mode==='attend'?'출석을 기록했어요.'+(d.next?' 다음 수업도 등록했어요.':''):'노션에 저장했어요.');
  }catch(err){$('academy-error').textContent=err.message;}finally{busy=false;$('academy-save').disabled=false;$('academy-cancel').disabled=false;render();}
 };
 render();return {async load(){try{const d=await api('/academy');if(!Array.isArray(d.items))throw Error('학원 데이터를 확인해 주세요.');rows=d.items;connected=true;render();}catch(e){$('academy-rows').replaceChildren(el('p',e.message,'range'));}},reset(){rows=[];connected=false;render();}};
}
