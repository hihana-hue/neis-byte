export const packSize={운동:5,바디PT:5,과학:4};
export function counted(x){if(['클리닉','연습'].includes(x.subtype))return 0;return x.status==='출석'||(x.status==='결석'&&x.charge)?1:0;}
export function totals(items,kind){const rows=items.filter(x=>x.kind===kind),used=rows.reduce((a,x)=>a+counted(x),0),size=packSize[kind];return {used,size,finished:Math.floor(used/size),current:used===0?0:(used%size||size)};}
export function toStart(local){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('날짜와 시간을 입력해 주세요.');const value=local+':00+09:00',n=Date.parse(value);if(!Number.isFinite(n)||new Date(n+32400000).toISOString().slice(0,16)!==local)throw Error('올바른 날짜와 시간을 입력해 주세요.');return value;}
export function localInput(start){if(!start)return '';const n=Date.parse(start);return Number.isFinite(n)?new Date(n+32400000).toISOString().slice(0,16):'';}
