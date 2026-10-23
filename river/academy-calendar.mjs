const pad=n=>String(n).padStart(2,'0');
export function monthCells(year,month){
 const first=new Date(Date.UTC(year,month,1)),count=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 return [...Array(first.getUTCDay()).fill(null),...Array.from({length:count},(_,i)=>`${year}-${pad(month+1)}-${pad(i+1)}`)];
}
export function seoulDate(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function selectedLabel(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return '달력에서 날짜를 선택해 주세요';return new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date(date+'T00:00:00Z'));}
export function mountAcademyCalendar(input){
 const parent=input.parentElement,field=parent.parentElement;
 input.type='hidden';
 const box=document.createElement('div');box.className='academy-calendar';
 box.innerHTML='<div class="calendar-nav"><button type="button" data-prev aria-label="이전 달">‹</button><strong data-month aria-live="polite"></strong><button type="button" data-next aria-label="다음 달">›</button></div><div class="calendar-weekdays" aria-hidden="true"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="calendar-days" role="group" aria-label="수업 날짜 선택"></div><p class="calendar-selection" aria-live="polite"></p><label class="calendar-time"><span>시작 시간</span><input type="time" step="60" aria-label="수업 시작 시간" required></label>';
 field.append(box);
 const find=s=>box.querySelector(s),time=find('input'),grid=find('.calendar-days');
 let selected='',year,month,lastValue;
 function setValue(){input.value=selected&&time.value?selected+'T'+time.value:'';lastValue=input.value;input.dispatchEvent(new Event('input',{bubbles:true}));}
 function draw(){
  find('[data-month]').textContent=year+'년 '+(month+1)+'월';grid.replaceChildren();
  const today=seoulDate();
  for(const date of monthCells(year,month)){
   if(!date){const blank=document.createElement('span');grid.append(blank);continue;}
   const b=document.createElement('button');b.type='button';b.textContent=String(Number(date.slice(-2)));b.setAttribute('aria-label',selectedLabel(date));b.setAttribute('aria-pressed',String(date===selected));if(date===today)b.setAttribute('aria-current','date');
   b.onclick=()=>{selected=date;setValue();draw();};grid.append(b);
  }
  find('.calendar-selection').textContent=selectedLabel(selected);
 }
 find('[data-prev]').onclick=()=>{if(month===0){year--;month=11;}else month--;draw();};
 find('[data-next]').onclick=()=>{if(month===11){year++;month=0;}else month++;draw();};
 time.addEventListener('input',setValue);time.addEventListener('change',setValue);
 function refresh(){
  if(input.value!==lastValue){selected=input.value.slice(0,10);time.value=input.value.slice(11,16)||'19:00';const base=selected||seoulDate();year=Number(base.slice(0,4));month=Number(base.slice(5,7))-1;lastValue=input.value;draw();}
  time.disabled=input.disabled;time.required=!input.disabled;
 }
 refresh();return {refresh};
}
