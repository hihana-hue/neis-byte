export const packSize={운동:5,바디PT:5,과학:4};
export function counted(x){if((x.category&&x.category!=='학원')||['클리닉','연습'].includes(x.subtype))return 0;return x.status==='출석'||(x.status==='결석'&&x.charge)?1:0;}
export function totals(items,kind){const rows=items.filter(x=>x.kind===kind),used=rows.reduce((a,x)=>a+counted(x),0),size=packSize[kind];return {used,size,finished:Math.floor(used/size),current:used===0?0:(used%size||size)};}
export function toStart(local){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('날짜와 시간을 입력해 주세요.');const value=local+':00+09:00',n=Date.parse(value);if(!Number.isFinite(n)||new Date(n+32400000).toISOString().slice(0,16)!==local)throw Error('올바른 날짜와 시간을 입력해 주세요.');return value;}
export function localInput(start){if(!start)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(start))return start+'T';const n=Date.parse(start);return Number.isFinite(n)?new Date(n+32400000).toISOString().slice(0,16):'';}

// Upcoming lessons show the expected position in their prepaid pack.
// Completed/charged lessons advance the count; clinics never advance it.
export function lessonRounds(items){
 const labels=new Map(),groups=new Map();
 const key=x=>x.kind==='운동'?'바디PT':x.kind;
 const regular=x=>(!x.category||x.category==='학원')&&!['클리닉','연습'].includes(x.subtype);
 const advances=x=>regular(x)&&(counted(x)||x.status==='예정');
 const ordered=[...items].sort((a,b)=>(a.originalStart||a.start||'').localeCompare(b.originalStart||b.start||'')||String(a.id).localeCompare(String(b.id)));
 for(const x of ordered){const k=key(x);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
 for(const [kind,rows] of groups){
  const fallbackSize=packSize[kind],anchors=rows.filter(x=>x.roundAnchor&&(!x.category||x.category==='학원'));
  const invalid=anchors.length>1||(anchors.length===1&&(!advances(anchors[0])||!(anchors[0].originalStart||anchors[0].start)));
  const before=anchors.length===1?rows.slice(0,rows.indexOf(anchors[0])).filter(advances).length:0;
  let used=0;
  for(const x of rows){
   if(x.category&&x.category!=='학원')continue;
   if(!regular(x)){labels.set(x.id,'클리닉');continue;}
   if(advances(x))used++;
   const size=Number.isInteger(x.packSize)&&x.packSize>0?x.packSize:fallbackSize;if(!size)continue;
   if(x.status==='예정')labels.set(x.id,invalid?'기준 확인':(((used-before-1)%size+size)%size+1)+'/'+size);
  }
 }
 return labels;
}


export function scheduleCategory(kind){const tagged=String(kind).match(/^(학원|교회|약속|기타) · .+$/);if(tagged)return tagged[1];if(['과학','바디PT','운동','수학','국어','영어','학원'].includes(kind))return '학원';if(/^(TEEN|교회)$/i.test(kind))return '교회';return kind==='약속'?'약속':'기타';}
export function scheduleKindLabel(kind){return String(kind||'').replace(/^(학원|교회|약속|기타) · /,'').replace(/^운동$/,'바디PT');}
export function scheduleTitle(x){return String(x.title||'').trim()||scheduleKindLabel(x.kind)||'일정명 없음';}
