import {monthCells,seoulDate} from './academy-calendar.mjs';
let active=null;
const el=(tag,cls,value)=>{const n=document.createElement(tag);n.className=cls;if(value)n.textContent=value;return n;};
export function mountPicker(input,{title,date=false}={}){
 const trigger=el('button','compact-picker-trigger');trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');
 input.hidden=true;if(date){input.type='hidden';input.required=false;}else input.required=false;
 input.after(trigger);
 const dialog=el('dialog','compact-picker'),head=el('div','compact-picker-head'),heading=el('h2','',title),close=el('button','compact-picker-close','×');close.type='button';close.setAttribute('aria-label','선택창 닫기');head.append(heading,close);
 const body=el('div','compact-picker-body');dialog.append(head,body);document.body.append(dialog);dialog.setAttribute('aria-label',title);
 const label=()=>date?(input.value?input.value.replaceAll('-','. '):'날짜 선택'):(input.selectedOptions[0]?.textContent||'선택');
 function refresh(){trigger.textContent=label();trigger.disabled=input.disabled;trigger.setAttribute('aria-label',title+' · '+label());}
 function finish(value){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));refresh();dialog.close();trigger.focus({preventScroll:true});}
 function drawOptions(){body.replaceChildren();body.className='compact-picker-body compact-picker-options';const buttons=[];
 for(const option of input.options){const b=el('button','compact-picker-option',option.textContent);b.type='button';b.disabled=option.disabled;b.setAttribute('aria-pressed',String(option.value===input.value));b.onclick=()=>finish(option.value);buttons.push(b);body.append(b);}
 body.onkeydown=e=>{const i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();let n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[n]?.focus();}};
 }
 let year,month;
 function drawCalendar(){body.replaceChildren();body.className='compact-picker-body';
 const nav=el('div','compact-picker-month'),prev=el('button','','‹'),next=el('button','','›'),name=el('strong','',year+'년 '+(month+1)+'월');prev.type=next.type='button';prev.setAttribute('aria-label','이전 달');next.setAttribute('aria-label','다음 달');
 prev.onclick=()=>{month--;if(month<0){month=11;year--;}drawCalendar();};next.onclick=()=>{month++;if(month>11){month=0;year++;}drawCalendar();};nav.append(prev,name,next);body.append(nav);
 const week=el('div','compact-picker-grid compact-picker-week');for(const day of ['일','월','화','수','목','금','토'])week.append(el('span','',day));body.append(week);
 const grid=el('div','compact-picker-grid');for(const value of monthCells(year,month)){if(!value){grid.append(el('span',''));continue;}const b=el('button','compact-picker-day',String(Number(value.slice(-2))));b.type='button';b.setAttribute('aria-label',value);b.setAttribute('aria-pressed',String(value===input.value));if(value===seoulDate())b.setAttribute('aria-current','date');b.onclick=()=>finish(value);grid.append(b);}body.append(grid);
 const today=el('button','compact-picker-today','오늘');today.type='button';today.onclick=()=>finish(seoulDate());body.append(today);
 }
 function open(){if(input.disabled)return;if(active?.open)active.close();active=dialog;if(date){const value=input.value||seoulDate();year=Number(value.slice(0,4));month=Number(value.slice(5,7))-1;drawCalendar();}else drawOptions();dialog.showModal();trigger.setAttribute('aria-expanded','true');body.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});}
 trigger.onclick=open;close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 new input.ownerDocument.defaultView.MutationObserver(refresh).observe(input,{childList:true,subtree:true,attributes:true});input.addEventListener('change',refresh);refresh();return {open,refresh};
}
