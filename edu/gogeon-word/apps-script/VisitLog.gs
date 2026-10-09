/* 접속 기록 (모든 앱 공통)
   학생 탭 아래쪽에 앱별·날짜별로 한 줄씩 남깁니다: 접속구분 | 날짜 | 접속시간 | 접속횟수 | 총 학습시간
   - 접속시간: 그날 그 앱에 마지막으로 들어온 시각
   - 접속횟수: 그날 그 앱에 들어온 횟수(자동 로그인 포함)
   - 총 학습시간: 앱을 열어 둔 시간의 합. 앱이 1분마다 보내는 확인 신호로 계산하고, 5분 넘게 끊긴 구간은 빼고 더합니다
   - 위쪽 줄을 지우거나 비우면 새 줄은 위쪽 빈 줄부터 채웁니다
   스크립트 속성은 쓰지 않습니다(마지막 확인 시각은 6시간 뒤 저절로 사라지는 임시 저장소에 둡니다). */
const VISIT_HEADERS = ['접속구분','날짜','접속시간','접속횟수','총 학습시간'];
const VISIT_LABELS = {classic:'고전어휘',economy:'경제어휘',hanmun:'한문',gyodae:'교대면접'};
const VISIT_GAP_MS = 5 * 60 * 1000;

function visitDay_(ms){return Utilities.formatDate(new Date(ms),'Asia/Seoul','yyyy-MM-dd');}
function visitTime_(ms){return Utilities.formatDate(new Date(ms),'Asia/Seoul','HH:mm:ss');}
function visitDuration_(ms){const t=Math.max(0,Math.round(ms/1000)),h=Math.floor(t/3600),m=Math.floor(t%3600/60),sec=t%60;return h+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
function visitParseDuration_(v){const m=String(v||'').match(/^(\d+):(\d{2}):(\d{2})$/);return m?((+m[1])*3600+(+m[2])*60+(+m[3]))*1000:0;}

// 예전 형식 학생 탭(기기 식별값이 E·F열, 날짜 칸에 단어 숫자)을 새 형식으로 한 번 바꿉니다. 이미 바뀐 탭은 그대로 둡니다.
function visitMigrateTab_(s){
 if(s.getRange('H4').getDisplayValue()==='등록 버전')return;
 if(s.getRange('F4').getDisplayValue()!=='등록 버전')return;
 const labels=s.getRange(1,1,Math.min(Math.max(s.getLastRow(),1),110),1).getDisplayValues();
 const dailyRow=labels.findIndex(r=>r[0]==='날짜'||r[0]==='접속구분')+1;
 if(dailyRow<10)throw Error('날짜 기록 헤더를 찾을 수 없습니다. 상단 행을 삭제하지 마세요.');
 const capacity=dailyRow-7;
 // 기기 식별값·등록 버전을 E:F에서 G:H로 옮깁니다(줄마다 G:H가 비어 있을 때만).
 const dev=s.getRange(5,5,capacity,4).getValues();
 dev.forEach((r,i)=>{if((r[0]||r[1])&&!r[2]&&!r[3]){r[2]=r[0];r[3]=r[1];}r[0]='';r[1]='';});
 s.getRange(5,5,capacity,4).setValues(dev);
 s.getRange('E4:H4').setValues([['','','기기 식별값','등록 버전']]).setBackground(null).setFontColor(null).setFontWeight(null);
 s.getRange('D1:D2').clearContent().setBackground(null).setFontColor(null).setFontWeight(null);
 // 예전 날짜 줄은 날짜와 시각만 남기고 '이전 기록'으로 표시합니다.
 const n=Math.max(0,s.getLastRow()-dailyRow);
 if(n){const old=s.getRange(dailyRow+1,1,n,6).getDisplayValues();
  const rows=old.map(r=>/^\d{4}-\d{2}-\d{2}$/.test(r[0])?['이전 기록',r[0],r[1],'','','']:r);
  s.getRange(dailyRow+1,1,n,6).setNumberFormat('@').setValues(rows);s.getRange(dailyRow+1,6,n,1).clearContent();}
 s.getRange(dailyRow,1,1,6).setValues([[...VISIT_HEADERS,'']]);
 s.getRange(dailyRow,1,1,5).setBackground('#1c555a').setFontColor('#ffffff').setFontWeight('bold');
 s.getRange(dailyRow,6).setBackground(null).setFontColor(null).setFontWeight(null);
 s.showColumns(5,2);s.hideColumns(7,2);
}

function visitRecord_(a,s,app,isNew){
 const label=VISIT_LABELS[app]||String(app);
 const layout=deviceLayout_(s,a),first=layout.dailyRow+1,n=Math.max(0,s.getLastRow()-layout.dailyRow);
 const rows=n?s.getRange(first,1,n,5).getDisplayValues():[];
 const cache=CacheService.getScriptCache(),key='visit:'+a.id+':'+app,last=Number(cache.get(key)||0);
 const now=Date.now(),day=visitDay_(now),stamp=visitTime_(now);
 const add=last&&now-last>0&&now-last<=VISIT_GAP_MS&&visitDay_(last)===day?now-last:0;
 const i=rows.findIndex(r=>r[0]===label&&r[1]===day);
 let row,values;
 if(i<0){const blank=rows.findIndex(r=>r.every(c=>String(c).trim()===''));row=blank<0?first+n:first+blank;values=[label,day,stamp,isNew?1:0,visitDuration_(add)];}
 else{const r=rows[i];row=first+i;values=[label,day,isNew?stamp:r[2],(Number(r[3])||0)+(isNew?1:0),visitDuration_(visitParseDuration_(r[4])+add)];}
 s.getRange(row,1,1,5).setNumberFormat('@').setValues([values.map(String)]);

 cache.put(key,String(now),21600);
}
function visitAfterLogin_(id,app){return lock_(()=>{const a=account_(id);if(a)visitRecord_(a,tab_(a),app,true);});}
