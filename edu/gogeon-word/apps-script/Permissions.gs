const MARI_ACCESS_COLUMNS = {classic:'고전어휘',economy:'경제어휘',hanmun:'한문',gyodae:'교대면접'};
function mariPermissions_(id){
 const sheet=db_().getSheetByName('시트1'),rows=sheet.getDataRange().getValues(),headers=rows.shift().map(String);
 const idCol=headers.indexOf('아이디');const row=rows.find(r=>String(r[idCol]).trim()===id);
 if(!row)throw Error('다시 로그인하세요.');
 const result={};for(const app of Object.keys(MARI_ACCESS_COLUMNS)){const col=headers.indexOf(MARI_ACCESS_COLUMNS[app]);result[app]=col>=0&&row[col]===true;}
 return result;
}
function mariRequire_(id,app){if(!Object.prototype.hasOwnProperty.call(MARI_ACCESS_COLUMNS,app))throw Error('앱 설정을 확인하세요.');const permissions=mariPermissions_(id);if(!permissions[app])throw Error('이 앱의 이용 권한이 없습니다. 관리자에게 문의하세요.');return permissions;}
function mariPayload_(id,app){return app==='classic'?studentPayload_(id):app==='economy'?economyPayload_(id):app==='gyodae'?gyodaePayload_(id):{id};}
function mariSignIn(id,pin,remember,device,label,app){
 const auth=login(id,pin,remember,device,label);
 try{const permissions=mariRequire_(auth.id,app);return {...mariPayload_(auth.id,app),token:auth.token,permissions};}
 catch(error){logout(auth.token);throw error;}
}
function mariRestore(token,app){const {a}=session_(token,false);const permissions=mariRequire_(a.id,app);return {...mariPayload_(a.id,app),permissions};}
function mariCheck(token,app){const {a}=session_(token,false);mariRequire_(a.id,app);return true;}
function mariSave(token,event,app){const {a}=session_(token,false);mariRequire_(a.id,app);return app==='classic'?saveLearning(token,event):app==='economy'?saveEconomy(token,event):app==='gyodae'?{ok:true}:saveExam(token,event);}
function setupAppPermissions(){
 const sheet=db_().getSheetByName('시트1');if(!sheet)throw Error('회원 시트1이 없습니다.');
 const names=Object.values(MARI_ACCESS_COLUMNS);let headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
 for(const name of names){let col=headers.indexOf(name)+1;if(!col){col=headers.length+1;if(col>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),col-sheet.getMaxColumns());sheet.getRange(1,col).setValue(name);headers.push(name);}
 const n=sheet.getLastRow()-1;if(n>0){const range=sheet.getRange(2,col,n,1);const values=range.getValues().map(r=>[r[0]===true]);range.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());range.setValues(values);}}
 return Object.values(MARI_ACCESS_COLUMNS).join('·')+' 체크박스를 준비했습니다. 허용할 앱을 체크하세요.';
}

/* 교대 면접 연습(gyodae) 데이터 읽기
   데이터는 비공개 구글 시트에 있습니다. 이 파일에는 학생 데이터가 없습니다.
   스크립트 속성 GYODAE_SHEET_ID에 시트 ID를 넣어야 합니다.
   시트 탭: 설정, 질문, 활동카드, 기본답변 (탭 이름과 제목 줄을 바꾸지 마세요) */
const GYODAE_SOURCES = {'공식 2026':'g','공식 2026(정시)':'gj','작년 후기':'r','생기부 기반 예상':'i'};
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
 const keys={'이름':'name','면접':'exam','면접일':'date','면접일 표시':'dateLabel','안내':'notice','백업 파일 이름':'backupName'};
 for(const r of gyodaeRows_(book,'설정')){if(r['항목']==='답변 원칙'){if(r['값'])meta.rules.push(r['값']);}else if(keys[r['항목']])meta[keys[r['항목']]]=r['값'];}
 const questions=gyodaeRows_(book,'질문').filter(r=>r['번호']&&r['질문']).map(r=>({id:r['번호'],a:r['주제'],s:GYODAE_SOURCES[r['출처']]||'i',c:r['연결 카드'],q:r['질문'],ans:r['예상 답변'],tip:r['도움말']}));
 const cards=gyodaeRows_(book,'활동카드').filter(r=>r['번호']&&r['제목']).map(r=>({id:r['번호'],r:r['우선순위']||'B',t:r['제목'],p:r['학년·영역'],rec:r['생기부 기록'],fu:[r['꼬리질문1'],r['꼬리질문2'],r['꼬리질문3']].filter(Boolean),warn:r['주의']}));
 const core=gyodaeRows_(book,'기본답변').filter(r=>r['번호']&&r['제목']).map(r=>({id:r['번호'],t:r['제목'],q:String(r['관련 질문']||'').split(/[,\s]+/).filter(Boolean),d:r['예시 초안']}));
 if(!questions.length)throw Error('면접 질문이 비어 있습니다. 관리자에게 문의하세요.');
 return {meta,questions,cards,core};
}
function gyodaePayload_(id){return {id,data:gyodaeData_()};}
