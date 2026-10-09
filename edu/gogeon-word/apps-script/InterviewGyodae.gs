/* 교대 면접 연습(gyodae) 데이터 읽기
   데이터는 비공개 구글 시트에 있습니다. 이 파일에는 학생 데이터가 없습니다.
   스크립트 속성 GYODAE_SHEET_ID에 시트 ID를 넣어야 합니다.
   시트 탭: 설정, 질문, 활동카드, 기본답변 (탭 이름과 제목 줄을 바꾸지 마세요) */
const GYODAE_SOURCES = {'공식 2026':'g','공식 2026(정시)':'gj','작년 후기':'r','기출 예제':'x','생기부 기반 예상':'i'};
function gyodaeRows_(book,name){
 const sheet=book.getSheetByName(name);if(!sheet)throw Error('면접 데이터 시트에 '+name+' 탭이 없습니다.');
 const values=sheet.getDataRange().getDisplayValues();const headers=(values.shift()||[]).map(h=>String(h).trim());
 return values.filter(r=>r.some(c=>String(c).trim()!=='')).map(r=>{const o={};headers.forEach((h,i)=>{o[h]=String(r[i]==null?'':r[i]).trim();});return o;});
}
function gyodaeData_(){
 const id=PropertiesService.getScriptProperties().getProperty('GYODAE_SHEET_ID');
 if(!id)throw Error('면접 데이터 시트 설정이 필요합니다. 관리자에게 문의하세요.');
 const book=SpreadsheetApp.openById(id);
 const meta={app:'gyodae',rules:[]};
 const keys={'이름':'name','면접':'exam','면접일':'date','면접일 표시':'dateLabel','안내':'notice','백업 파일 이름':'backupName','응원 문구':'cheer'};
 for(const r of gyodaeRows_(book,'설정')){if(r['항목']==='답변 원칙'){if(r['값'])meta.rules.push(r['값']);}else if(keys[r['항목']])meta[keys[r['항목']]]=r['값'];}
 const questions=gyodaeRows_(book,'질문').filter(r=>r['번호']&&r['질문']).map(r=>({id:r['번호'],a:r['주제'],s:GYODAE_SOURCES[r['출처']]||'i',c:r['연결 카드'],q:r['질문'],ans:r['예상 답변'],tip:r['도움말']}));
 const cards=gyodaeRows_(book,'활동카드').filter(r=>r['번호']&&r['제목']).map(r=>({id:r['번호'],r:r['우선순위']||'B',t:r['제목'],p:r['학년·영역'],rec:r['생기부 기록'],fu:[r['꼬리질문1'],r['꼬리질문2'],r['꼬리질문3']].filter(Boolean),warn:r['주의']}));
 const core=gyodaeRows_(book,'기본답변').filter(r=>r['번호']&&r['제목']).map(r=>({id:r['번호'],t:r['제목'],q:String(r['관련 질문']||'').split(/[,\s]+/).filter(Boolean),d:r['예시 초안']}));
 if(!questions.length)throw Error('면접 질문이 비어 있습니다. 관리자에게 문의하세요.');
 return {meta,questions,cards,core};
}
function gyodaePayload_(id){return {id,data:gyodaeData_()};}
/* 처음 한 번만: 설정 화면의 스크립트 속성 칸이 꽉 찼을 때 코드로 시트 ID를 저장합니다.
   아래 따옴표 안에 시트 ID를 넣고 setupGyodaeSheet를 실행하세요. (공개 저장소에는 ID를 넣지 마세요) */
function setupGyodaeSheet(){
 const id='';
 if(!id)throw Error('setupGyodaeSheet 안의 따옴표에 시트 ID를 넣고 다시 실행하세요.');
 const name=SpreadsheetApp.openById(id).getName();
 PropertiesService.getScriptProperties().setProperty('GYODAE_SHEET_ID',id);
 Logger.log('저장 완료: '+name+' 시트를 읽습니다. 질문 '+gyodaeData_().questions.length+'개');
}
