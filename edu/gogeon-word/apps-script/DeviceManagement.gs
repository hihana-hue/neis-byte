// 기기명·운영체제·화면 크기를 표시하고, 세 항목이 같으면 같은 기기로 인정합니다.
function deviceIdentity_(label){
 const p=String(label||'').trim().split(/\s*·\s*/),size=p[2]&&p[2].match(/^(\d{1,6})[×x](\d{1,6})$/);
 if(p.length!==3||!p[0]||p[0].length>40||/^[=+@-]/.test(p[0])||!['Android','Windows','iOS','macOS','ChromeOS','Linux','기타'].includes(p[1])||!size)return null;
 const dims=[+size[1],+size[2]].sort((a,b)=>a-b);if(!dims[0])return null;
 const name=p[0]==='폰'?'모바일':p[0]==='노트북'?'PC':p[0];
 return {name,label:[name,p[1],dims.join('×')].join(' · '),generic:['PC','모바일','태블릿'].includes(name)};
}
function deviceTitle_(label,date){return deviceIdentity_(label)?.label||String(label||'기기');}
function deviceSlot_(rows,hash,identity){
 if(!identity)return -1;
 const same=rows.findIndex(r=>r[3]==='등록'&&deviceIdentity_(r[8]||r[0])?.label===identity.label);
 if(same>=0)return same;
 // 상세 정보가 없는 예전 등록만 기존 브라우저 식별값으로 복구합니다.
 return rows.findIndex(r=>r[3]==='등록'&&!deviceIdentity_(r[8]||r[0])&&deviceHashes_(r[6]).includes(hash));
}
function deviceMigrateHeader_(s){
 if(s.getRange('I4').getDisplayValue()==='기기 판별 정보')return;
 const labels=s.getRange(1,1,Math.min(s.getLastRow(),110),1).getDisplayValues(),dailyRow=labels.findIndex(r=>r[0]==='접속구분'||r[0]==='날짜')+1;
 if(dailyRow<10)throw Error('접속 기록 헤더를 찾을 수 없습니다.');
 const rows=s.getRange(5,1,dailyRow-7,9).getValues();
 rows.forEach(r=>{if(r[0]&&!r[8]){r[8]=r[0];r[0]=deviceTitle_(r[8],r[1]);}});
 s.getRange(5,1,rows.length,9).setValues(rows);
 if(s.getRange('C1').getDisplayValue()!=='최초등록일'){
  s.getRange('C1').setValue('최초등록일');s.getRange('C2').clearContent();
 }
 s.getRange('C2').setNumberFormat('yyyy-mm-dd HH:mm:ss');s.getRange('A3:B3').setValues([['기기변경 횟수',0]]);
 s.getRange('I4').setValue('기기 판별 정보');s.hideColumns(7,3);
}
function deviceLimitResult_(a,rows){return {deviceLimit:true,id:a.id,limit:a.limit,devices:rows.filter(r=>r[3]==='등록').map(r=>({generation:String(r[7]),name:deviceTitle_(r[8]||r[0],r[1]),lastSeen:r[2] instanceof Date?Utilities.formatDate(r[2],'Asia/Seoul','yyyy-MM-dd HH:mm'):'확인 불가'}))};}
function login(id,pin,remember,device,label,replaceGeneration,app){
 id=String(id||'').trim();pin=String(pin||'');const identity=deviceIdentity_(label);
 if(!id||id.length>70||pin.length>100||!/^[a-zA-Z0-9-]{20,100}$/.test(device||'')||!identity)throw Error('로그인 입력과 기기 종류를 확인하세요.');
 return lock_(()=>{
  const cache=CacheService.getScriptCache(),key='fail:'+hash_(id),fails=Number(cache.get(key)||0);if(fails>=10)throw Error('15분 후 다시 시도하세요.');
  const a=account_(id);if(!a||hash_(a.pin)!==hash_(pin)){cache.put(key,String(fails+1),900);throw Error('아이디 또는 PIN이 일치하지 않습니다.');}cache.remove(key);
  const permissions=app?mariRequire_(a,app):null;if(!app&&replaceGeneration)throw Error('앱 설정을 확인하세요.');
  const payload=app?mariPayload_(a.id,app):null;
  const s=tab_(a,true),layout=deviceLayout_(s,a),rows=s.getRange(5,1,layout.capacity,9).getValues(),dh=hash_(device),registered=rows.map((r,i)=>r[3]==='등록'?i:-1).filter(i=>i>=0);
  let slot=deviceSlot_(rows,dh,identity),changed=false;const now=new Date();
  if(slot>=0&&registered.indexOf(slot)>=a.limit)throw Error('관리자가 기기한도를 줄였습니다. 관리자에게 문의하세요.');
  if(slot<0){
   if(registered.length>=a.limit){
    if(!replaceGeneration)return deviceLimitResult_(a,rows);
    // 한도를 낮춘 상태에서는 한 대 교체로 해결할 수 없으므로 기록을 바꾸지 않습니다.
    if(registered.length>a.limit)throw Error('현재 등록 수보다 한도가 작습니다. 관리자에게 문의하세요.');
    slot=rows.findIndex(r=>r[3]==='등록'&&r[7]===replaceGeneration);if(slot<0)return deviceLimitResult_(a,rows);changed=true;
   }else slot=rows.findIndex(r=>r[3]!=='등록');
   if(slot<0)throw Error('기기 등록 공간을 확인하세요.');
   rows[slot]=[deviceTitle_(identity.label,now),now,now,'등록','','',dh,Utilities.getUuid(),identity.label];
  }else{rows[slot][2]=now;rows[slot][8]=identity.label;rows[slot][0]=deviceTitle_(identity.label,rows[slot][1]);rows[slot][6]=[...new Set([...deviceHashes_(rows[slot][6]),dh])].join(' ');}
  s.getRange(5+slot,1,1,9).setValues([rows[slot]]);if(changed)s.getRange('B3').setValue((Number(s.getRange('B3').getValues()[0][0])||0)+1);
  const token=Utilities.getUuid()+Utilities.getUuid(),p=PropertiesService.getScriptProperties();cleanSessions_();p.setProperty('session:'+hash_(token),JSON.stringify({id:a.id,device:dh,generation:rows[slot][7],version:a.version,expiry:Date.now()+(remember?30:1)*86400000}));
  return {token,id:a.id,permissions,a,s,layout,payload};
 });
}
function deviceRefresh_(token,device,label){
 const context=session_(token,false),{a,s,layout,rows,v}=context,identity=deviceIdentity_(label);if(!identity)throw Error('기기 종류를 선택하고 다시 로그인하세요.');
 const slot=deviceSlot_(rows,hash_(device),identity);
 if(slot<0||!deviceHashes_(rows[slot][6]).includes(v.device)||rows[slot][7]!==v.generation)throw Error('다시 로그인하세요.');
 s.getRange(5+slot,1).setValue(deviceTitle_(identity.label,rows[slot][1]));s.getRange(5+slot,9).setValue(identity.label);s.getRange(5+slot,3).setValue(new Date());return context;
}
function deviceMemberLink_(id,tab){
 const book=db_(),s=book.getSheetByName('시트1'),rows=s.getDataRange().getDisplayValues(),h=rows.shift(),col=h.indexOf('아이디');if(col<0)return;
 const i=rows.findIndex(r=>r[col].trim()===id);if(i<0)return;
 const url=book.getUrl()+'#gid='+tab.getSheetId();s.getRange(i+2,col+1).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(id).setLinkUrl(url).build());
}
// 기존 회원 탭만 정리합니다. 아직 로그인하지 않은 회원 탭은 만들지 않습니다.
function setupDeviceManagement(){return lock_(()=>{
 const book=db_(),members=book.getSheetByName('시트1'),rows=members.getDataRange().getDisplayValues(),headers=rows.shift(),col=headers.indexOf('아이디');
 if(col<0)throw Error('아이디 열이 없습니다.');
 let count=0;
 rows.forEach(r=>{
  const id=String(r[col]||'').trim(),tab=id&&book.getSheetByName(id);
  if(!tab||tab.getRange('A2').getDisplayValue()!==id)return;
  visitMigrateTab_(tab);deviceMigrateHeader_(tab);
  const labels=tab.getRange(1,1,Math.min(tab.getLastRow(),110),1).getDisplayValues(),dailyRow=labels.findIndex(r=>r[0]==='접속구분'||r[0]==='날짜')+1;
  if(dailyRow<10)throw Error('접속 기록 헤더를 찾을 수 없습니다.');
  const devices=tab.getRange(5,1,dailyRow-7,9).getValues();
  devices.forEach((d,i)=>{const identity=deviceIdentity_(d[8]||d[0]);if(identity&&d[0]!==identity.label)tab.getRange(5+i,1).setValue(identity.label);});
  tab.getRange('C2').setNumberFormat('yyyy-mm-dd HH:mm:ss');
  deviceMemberLink_(id,tab);count++;
 });
 return count+'개 기존 회원 탭과 아이디 링크를 정리했습니다.';
});}
