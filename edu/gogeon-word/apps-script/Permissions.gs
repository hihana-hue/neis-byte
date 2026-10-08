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
// 로그인·자동 로그인·1분 확인·학습 저장 때마다 학생 탭의 접속 기록(VisitLog.gs)을 고칩니다.
function mariSignIn(id,pin,remember,device,label,app){
 const auth=login(id,pin,remember,device,label);
 try{const permissions=mariRequire_(auth.id,app);visitAfterLogin_(auth.id,app);return {...mariPayload_(auth.id,app),token:auth.token,permissions};}
 catch(error){logout(auth.token);throw error;}
}
function mariRestore(token,app){const {a,s}=session_(token,false);const permissions=mariRequire_(a.id,app);lock_(()=>visitRecord_(a,s,app,true));return {...mariPayload_(a.id,app),permissions};}
function mariCheck(token,app){const {a,s}=session_(token,false);mariRequire_(a.id,app);lock_(()=>visitRecord_(a,s,app,false));return true;}
function mariSave(token,event,app){const {a,s}=session_(token,false);mariRequire_(a.id,app);const result=app==='classic'?saveLearning(token,event):app==='economy'?saveEconomy(token,event):app==='gyodae'?{ok:true}:saveExam(token,event);lock_(()=>visitRecord_(a,s,app,false));return result;}
function setupAppPermissions(){
 const sheet=db_().getSheetByName('시트1');if(!sheet)throw Error('회원 시트1이 없습니다.');
 const names=Object.values(MARI_ACCESS_COLUMNS);let headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
 for(const name of names){let col=headers.indexOf(name)+1;if(!col){col=headers.length+1;if(col>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),col-sheet.getMaxColumns());sheet.getRange(1,col).setValue(name);headers.push(name);}
 const n=sheet.getLastRow()-1;if(n>0){const range=sheet.getRange(2,col,n,1);const values=range.getValues().map(r=>[r[0]===true]);range.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());range.setValues(values);}}
 return Object.values(MARI_ACCESS_COLUMNS).join('·')+' 체크박스를 준비했습니다. 허용할 앱을 체크하세요.';
}
