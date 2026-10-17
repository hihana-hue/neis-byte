export const complete = s => ['완료', '봉사완료'].includes(s);
export const active = s => ['진행 중', '진행 2차', '작성 완료'].includes(s);
export const planned = s => ['시작전', '3.픽-예정'].includes(s);
export function todayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const get = type => parts.find(p=>p.type===type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function dayNumber(key) { return Date.parse(key.slice(0,10)+'T00:00:00Z')/86400000; }
export function weekBounds(key) {
  const d=dayNumber(key), weekday=new Date(d*86400000).getUTCDay();
  const start=d-((weekday+6)%7); return { start, end:start+7, nextEnd:start+14 };
}
export function groups(items, key=todayKey()) {
  const rows=items.filter(x=>!complete(x.status)).slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.title.localeCompare(b.title));
  const today=dayNumber(key), w=weekBounds(key);
  const date=x=>x.due?dayNumber(x.due):NaN;
  return { overdue:rows.filter(x=>date(x)<today), thisWeek:rows.filter(x=>date(x)>=today&&date(x)<w.end), nextWeek:rows.filter(x=>date(x)>=w.end&&date(x)<w.nextEnd), active:rows.filter(x=>active(x.status)), planned:rows.filter(x=>planned(x.status)), undated:rows.filter(x=>!x.due), later:rows.filter(x=>date(x)>=w.nextEnd) };
}
