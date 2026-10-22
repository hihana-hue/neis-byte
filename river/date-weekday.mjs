export function weekday(value){
 const day=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return '';
 const date=new Date(day+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)return '';
 return new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',weekday:'long'}).format(date);
}
