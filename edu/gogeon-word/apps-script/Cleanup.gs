/* 스크립트 속성 정리 (모든 앱 공통)
   지우는 것: 지난 날짜의 일일 학습 기록(day:…, economy:day:… 처럼 날짜로 끝나는 것),
             기한이 지난 중복 방지 표시(event:…), 만료된 로그인(session:…)
   지우지 않는 것: 완료 카드(state:…), AUTH_SECRET, 시트 ID 등 나머지 전부
   일일 기록은 학생 시트에도 날짜별로 남아 있으므로 속성에서 지워도 기록은 사라지지 않습니다.
   previewCleanup: 지울 개수만 보여 줌 / cleanupOldRecords: 실제로 지움 */
const CLEANUP_KEEP_DAYS = 14;

function cleanupTargets_(){
 const all=PropertiesService.getScriptProperties().getProperties(),now=Date.now();
 const cutoff=Utilities.formatDate(new Date(now-CLEANUP_KEEP_DAYS*86400000),'Asia/Seoul','yyyy-MM-dd');
 const keys=[],count={day:0,event:0,session:0},left=Object.keys(all).length;
 for(const k of Object.keys(all)){
  const v=all[k];
  const d=k.match(/^(?:[a-z]+:)?day:[^:]+:(\d{4}-\d{2}-\d{2})$/);
  if(d){if(d[1]<cutoff){keys.push(k);count.day++;}continue;}
  if(/^(?:[a-z]+:)?event:/.test(k)){if(/^\d+$/.test(v)&&Number(v)<now){keys.push(k);count.event++;}continue;}
  if(/^(?:[a-z]+:)?session:/.test(k)){let e=null;try{e=JSON.parse(v).expiry;}catch(err){}if(typeof e==='number'&&e<now){keys.push(k);count.session++;}}
 }
 return {keys,count,total:left};
}

function previewCleanup(){
 const t=cleanupTargets_();
 Logger.log('전체 속성 '+t.total+'개 중 지울 대상 '+t.keys.length+'개 (지난 일일 기록 '+t.count.day+', 기한 지난 표시 '+t.count.event+', 만료 로그인 '+t.count.session+'). '+CLEANUP_KEEP_DAYS+'일 이내 기록은 남깁니다.');
}

function cleanupOldRecords(){
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const p=PropertiesService.getScriptProperties(),t=cleanupTargets_();
  t.keys.forEach(k=>p.deleteProperty(k));
  Logger.log('정리 완료: '+t.keys.length+'개 삭제 (지난 일일 기록 '+t.count.day+', 기한 지난 표시 '+t.count.event+', 만료 로그인 '+t.count.session+'). 남은 속성 '+(t.total-t.keys.length)+'개');
 }finally{lock.releaseLock();}
}
