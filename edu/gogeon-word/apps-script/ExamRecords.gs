/* 한문(시험 준비) 접속 기록
   학생마다 하루에 한 줄만 남깁니다: 과목, 아이디, 사용자 이름, 날짜, 최근 접속시간, 나간시간, 하루 총 접속시간
   - 최근 접속시간: 그날 마지막으로 앱을 연 시각
   - 나간시간: 마지막으로 접속이 확인된 시각(1분마다 확인). 정상적으로 나가면 나간 시각, 창을 그냥 닫으면 마지막 확인 시각
   - 하루 총 접속시간: 그날 앱을 열어 둔 시간의 합. 5분 넘게 신호가 끊긴 구간은 더하지 않습니다
   - 윗줄을 지우거나 비우면 새 줄은 위쪽 빈 줄부터 채웁니다
   스크립트 속성은 쓰지 않습니다(접속 확인 정보는 6시간 뒤 저절로 사라지는 임시 저장소에 둡니다). */
const EXAM_SHEET_NAME = '시험학습기록';
const EXAM_HEADERS = ['과목','아이디','사용자 이름','날짜','최근 접속시간','나간시간','하루 총 접속시간'];
const EXAM_GAP_MS = 5 * 60 * 1000;

function examSheet_(){
 const book=db_();let s=book.getSheetByName(EXAM_SHEET_NAME);
 if(s&&s.getRange(1,1,1,EXAM_HEADERS.length).getDisplayValues()[0].join('|')!==EXAM_HEADERS.join('|')){
  // 예전 형식의 탭은 지우지 않고 이름만 바꿔 둡니다.
  let old=EXAM_SHEET_NAME+'_이전',i=2;while(book.getSheetByName(old))old=EXAM_SHEET_NAME+'_이전'+(i++);
  s.setName(old);s=null;
 }
 if(!s){s=book.insertSheet(EXAM_SHEET_NAME);s.getRange(1,1,1,EXAM_HEADERS.length).setValues([EXAM_HEADERS]).setFontWeight('bold');s.setFrozenRows(1);s.getRange('A:G').setNumberFormat('@');}
 return s;
}
function examTime_(v){return Utilities.formatDate(new Date(v),'Asia/Seoul','HH:mm:ss');}
function examDay_(v){return Utilities.formatDate(new Date(v),'Asia/Seoul','yyyy-MM-dd');}
function examDuration_(ms){const t=Math.max(0,Math.round(ms/1000)),h=Math.floor(t/3600),m=Math.floor(t%3600/60),sec=t%60;return h+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
function examParseDuration_(v){const m=String(v||'').match(/^(\d+):(\d{2}):(\d{2})$/);return m?((+m[1])*3600+(+m[2])*60+(+m[3]))*1000:0;}

function saveExam(token,e){return lock_(()=>{
 const {a}=session_(token,false);
 if(!e||!['start','pulse','end','test-start','answer','override','finish','abort','writing'].includes(e.type)||!/^[-a-zA-Z0-9]{8,100}$/.test(e.visitId||'')||!/^[-a-zA-Z0-9]{8,100}$/.test(e.eventId||''))throw Error('시험 기록 형식 오류');
 const cache=CacheService.getScriptCache(),ek='exe:'+e.eventId;
 if(cache.get(ek))return {ok:true};
 const now=Date.now(),day=examDay_(now),stamp=examTime_(now),vk='exv:'+e.visitId,last=Number(cache.get(vk)||0);
 const s=examSheet_(),n=Math.max(0,s.getLastRow()-1),rows=n?s.getRange(2,1,n,EXAM_HEADERS.length).getDisplayValues():[];
 let i=rows.findIndex(r=>r[0]==='한문'&&r[1]===String(a.id)&&r[3]===day);
 let row;
 if(i<0){
  const blank=rows.findIndex(r=>r.every(c=>String(c).trim()===''));
  row=blank<0?n+2:blank+2;
  s.getRange(row,1,1,EXAM_HEADERS.length).setNumberFormat('@').setValues([['한문',literal_(a.id),literal_(a.name||''),day,stamp,stamp,examDuration_(0)]]);
 }else{
  row=i+2;const r=rows[i];
  const add=last&&now-last>0&&now-last<=EXAM_GAP_MS&&examDay_(last)===day?now-last:0;
  const visitStart=e.type==='start'||!last;
  s.getRange(row,5,1,3).setNumberFormat('@').setValues([[visitStart?stamp:r[4],stamp,examDuration_(examParseDuration_(r[6])+add)]]);
 }
 cache.put(vk,String(now),21600);cache.put(ek,'1',21600);
 return {ok:true};
 });}

function examRecordingReady(){return {ok:true,version:2};}
