const MARI_ACCESS_COLUMNS = {classic:'고전어휘',economy:'경제어휘',hanmun:'한문',gyodae:'교대면접'};
function mariRequire_(account,app){if(!Object.prototype.hasOwnProperty.call(MARI_ACCESS_COLUMNS,app))throw Error('앱 설정을 확인하세요.');const a=typeof account==='string'?account_(account):account;if(!a)throw Error('다시 로그인하세요.');if(!a.permissions[app])throw Error('이 앱의 이용 권한이 없습니다. 관리자에게 문의하세요.');return a.permissions;}
function mariPayload_(id,app){return app==='classic'?studentPayload_(id):app==='economy'?economyPayload_(id):app==='gyodae'?gyodaePayload_(id):{id};}
// 로그인·자동 로그인·1분 확인·학습 저장 때마다 학생 탭의 접속 기록(VisitLog.gs)을 고칩니다.
function mariFirstLogin_(s){
 const cell=s.getRange('C2');
 if(!cell.getValue())cell.setValue(new Date()).setNumberFormat('yyyy-mm-dd HH:mm:ss');
}
function mariFinishLogin_(auth,app){
 if(auth.deviceLimit)return auth;
 try{
  const payload=auth.payload;
  lock_(()=>{visitRecord_(auth.a,auth.s,app,true,auth.layout);mariFirstLogin_(auth.s);});
  return {...payload,token:auth.token,permissions:auth.permissions};
 }catch(error){logout(auth.token);throw error;}
}
function mariSignIn(id,pin,remember,device,label,app){
 return mariFinishLogin_(login(id,pin,remember,device,label,null,app),app);
}
function mariReplaceDevice(id,pin,remember,device,label,app,generation){
 return mariFinishLogin_(login(id,pin,remember,device,label,generation,app),app);
}
function mariRestore(token,app,device,label){return lock_(()=>{
 const context=device&&label?deviceRefresh_(token,device,label):session_(token,false),{a,s,layout}=context;
 const permissions=mariRequire_(a,app),payload=mariPayload_(a.id,app);
 visitRecord_(a,s,app,true,layout);mariFirstLogin_(s);
 return {...payload,permissions};
});}
function mariCheck(token,app){return lock_(()=>{
 const {a,s,layout}=session_(token,true);mariRequire_(a,app);
 visitRecord_(a,s,app,false,layout);return true;
});}
function mariSave(token,event,app){return lock_(()=>{
 const {a,s,layout}=session_(token,false);mariRequire_(a,app);
 const result=app==='classic'?saveClassic_(a,event):app==='economy'?saveEconomy_(a,event):app==='gyodae'?{ok:true}:saveExam(token,event);
 visitRecord_(a,s,app,false,layout);return result;
});}
function setupAppPermissions(){
 const sheet=db_().getSheetByName('시트1');if(!sheet)throw Error('회원 시트1이 없습니다.');
 const names=Object.values(MARI_ACCESS_COLUMNS);let headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
 for(const name of names){let col=headers.indexOf(name)+1;if(!col){col=headers.length+1;if(col>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),col-sheet.getMaxColumns());sheet.getRange(1,col).setValue(name);headers.push(name);}
 const n=sheet.getLastRow()-1;if(n>0){const range=sheet.getRange(2,col,n,1);const values=range.getValues().map(r=>[r[0]===true]);range.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());range.setValues(values);}}
 return Object.values(MARI_ACCESS_COLUMNS).join('·')+' 체크박스를 준비했습니다. 허용할 앱을 체크하세요.';
}
