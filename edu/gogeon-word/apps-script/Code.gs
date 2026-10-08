const SHEET_ID=PropertiesService.getScriptProperties().getProperty('SHEET_ID');
function doGet(e){const nonce=String(e&&e.parameter&&e.parameter.nonce||'');if(!/^[a-zA-Z0-9-]{20,100}$/.test(nonce))return HtmlService.createHtmlOutput('학습 사이트에서 접속해주세요.');return HtmlService.createHtmlOutputFromFile('Bridge').setTitle('MariEdu authentication').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).setContent(HtmlService.createHtmlOutputFromFile('Bridge').getContent().replace('__BRIDGE_NONCE__',nonce));}

let requestBooks_={};
function book_(id){if(!requestBooks_[id])requestBooks_[id]=SpreadsheetApp.openById(id);return requestBooks_[id];}
function db_(){return book_(SHEET_ID);}
function lock_(fn){const l=LockService.getScriptLock();l.waitLock(20000);try{return fn();}finally{l.releaseLock();}}
function hash_(v){const p=PropertiesService.getScriptProperties();let key=p.getProperty('AUTH_SECRET');if(!key){key=Utilities.getUuid()+Utilities.getUuid();p.setProperty('AUTH_SECRET',key);}return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(v),key));}
function literal_(v){return /^[=+@-]/.test(String(v))?"'"+v:String(v);}
function account_(id){const s=db_().getSheetByName('시트1');const rows=s.getDataRange().getDisplayValues(),h=rows.shift(),i=h.indexOf('아이디'),p=h.indexOf('핀번호'),n=h.indexOf('사용자'),a=h.indexOf('활성'),limitCol=h.indexOf('기기한도');if(i<0||p<0)throw Error('아이디·핀번호 열이 없습니다.');const matches=rows.filter(r=>r[i].trim()===id);if(matches.length!==1)return null;const r=matches[0];if(a>=0&&['FALSE','false','아니오','비활성','0'].includes(r[a]))return null;const raw=limitCol>=0?String(r[limitCol]||'').trim():'';const limit=raw?Number(raw):3;if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('기기한도는 1~100의 정수로 입력하세요.');return {id,limit,name:n>=0?r[n]:'',pin:r[p],version:hash_(id+'\n'+r[p])};}
function tab_(a){if(!/^[A-Za-z0-9_.-]{1,70}$/.test(a.id))throw Error('아이디는 영문·숫자·밑줄·점·하이픈 70자 이내로 설정하세요.');const d=db_();let s=d.getSheetByName(a.id);
 if(!s){s=d.insertSheet(a.id);s.getRange('A1:C2').setValues([['아이디','사용자','최근 접속'],[a.id,literal_(a.name),'']]);s.getRange('A4:H4').setValues([['기기 이름','최초 등록','최근 접속','상태','','','기기 식별값','등록 버전']]);s.getRange('D5:D7').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['등록','해제'],true).setAllowInvalid(false).build());s.getRange('A10:E10').setValues([VISIT_HEADERS]);s.getRange('A1:C1').setBackground('#1c555a').setFontColor('#ffffff').setFontWeight('bold');s.getRange('A4:D4').setBackground('#17838c').setFontColor('#ffffff').setFontWeight('bold');s.getRange('A10:E10').setBackground('#1c555a').setFontColor('#ffffff').setFontWeight('bold');s.setFrozenRows(10);s.setColumnWidths(1,5,170);s.hideColumns(7,2);s.getRange('B5:C7').setNumberFormat('yyyy-mm-dd hh:mm:ss');s.getRange('C2').setNumberFormat('yyyy-mm-dd hh:mm:ss');}
 if(s.getRange('A2').getDisplayValue()!==a.id)throw Error('동명 탭 충돌: 관리자에게 문의하세요.');visitMigrateTab_(s);s.getRange('B2').setValue(literal_(a.name));return s;}
function today_(){return Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');}
function login(id,pin,remember,device,label){id=String(id||'').trim();pin=String(pin||'');if(!id||id.length>70||pin.length>100||!/^[a-zA-Z0-9-]{20,100}$/.test(device||''))throw Error('로그인 입력을 확인하세요.');return lock_(()=>{const cache=CacheService.getScriptCache(),key='fail:'+hash_(id),fails=Number(cache.get(key)||0);if(fails>=10)throw Error('15분 후 다시 시도하세요.');const a=account_(id);if(!a||hash_(a.pin)!==hash_(pin)){cache.put(key,String(fails+1),900);throw Error('아이디 또는 PIN이 일치하지 않습니다.');}cache.remove(key);const s=tab_(a),layout=deviceLayout_(s,a),rows=s.getRange(5,1,layout.capacity,8).getValues(),dh=hash_(device);const registered=rows.map((r,i)=>r[3]==='등록'?i:-1).filter(i=>i>=0);let slot=rows.findIndex(r=>r[6]===dh&&r[3]==='등록');const now=new Date();if(slot>=0&&registered.indexOf(slot)>=a.limit)throw Error('관리자가 기기한도를 줄였습니다. 기기 해제를 요청하세요.');if(slot<0){if(registered.length>=a.limit)throw Error('최대 '+a.limit+'개 기기가 등록되어 있습니다. 관리자에게 기기 해제를 요청하세요.');slot=rows.findIndex(r=>r[3]!=='등록');if(slot<0)throw Error('최대 '+a.limit+'개 기기가 등록되어 있습니다. 관리자에게 기기 해제를 요청하세요.');rows[slot]=[literal_(String(label||'브라우저').slice(0,80)),now,now,'등록','','',dh,Utilities.getUuid()];}else rows[slot][2]=now;s.getRange(5+slot,1,1,8).setValues([rows[slot]]);const token=Utilities.getUuid()+Utilities.getUuid(),p=PropertiesService.getScriptProperties();cleanSessions_();p.setProperty('session:'+hash_(token),JSON.stringify({id:a.id,device:dh,generation:rows[slot][7],version:a.version,expiry:Date.now()+(remember?30:1)*86400000}));s.getRange('C2').setValue(now);return {token,id:a.id};});}
function cleanSessions_(){const p=PropertiesService.getScriptProperties(),all=p.getProperties();for(const k of Object.keys(all)){if(k.startsWith('event:')&&Number(all[k])<Date.now())p.deleteProperty(k);if(k.startsWith('session:')){try{if(JSON.parse(all[k]).expiry<Date.now())p.deleteProperty(k);}catch{p.deleteProperty(k);}}}}
function session_(token,touch){if(typeof token!=='string'||token.length>100)throw Error('다시 로그인하세요.');const p=PropertiesService.getScriptProperties(),raw=p.getProperty('session:'+hash_(token));if(!raw)throw Error('다시 로그인하세요.');const v=JSON.parse(raw),a=account_(v.id);if(v.expiry<Date.now()||!a||a.version!==v.version)throw Error('로그인이 만료되었습니다.');const s=tab_(a),layout=deviceLayout_(s,a),rows=s.getRange(5,1,layout.capacity,8).getValues(),i=rows.findIndex(r=>r[3]==='등록'&&r[6]===v.device&&r[7]===v.generation);if(i<0)throw Error('관리자가 이 기기를 해제했습니다.');const registered=rows.map((r,j)=>r[3]==='등록'?j:-1).filter(j=>j>=0);if(registered.indexOf(i)>=a.limit)throw Error('관리자가 기기한도를 줄였습니다.');if(touch)s.getRange(5+i,3).setValue(new Date());return {a,s};}
function logout(token){PropertiesService.getScriptProperties().deleteProperty('session:'+hash_(String(token)));return true;}
function heartbeat(token){return lock_(()=>{const {a,s}=session_(token,true);visitRecord_(a,s,'classic',false);return true;});}
function recordProgress(token,event){return lock_(()=>{const {a}=session_(token,true);if(!event||!['answer','finish','progress'].includes(event.type)||!/^[a-zA-Z0-9-]{8,100}$/.test(event.eventId||''))throw Error('잘못된 기록');const valid=new Set(cardIds_());const ids=[...new Set((event.completed||[]).map(String))].filter(id=>valid.has(id));if(event.type==='answer'&&(!valid.has(String(event.cardId))||typeof event.correct!=='boolean'))throw Error('문항 오류');PropertiesService.getScriptProperties().setProperty('state:'+hash_(a.id),JSON.stringify(ids));return {ok:true};});}

function corpus_(){
 const id=PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');if(!id)throw Error('DATA_SHEET_ID 설정이 필요합니다.');
 const sheet=book_(id).getSheetByName('어휘자료');if(!sheet)throw Error('어휘자료 탭이 없습니다.');
 const rows=sheet.getRange(1,1,sheet.getLastRow(),13).getDisplayValues(),h=rows.shift(),get=(r,n)=>String(r[h.indexOf(n)]||'').trim();
 for(const name of ['어휘ID','단어','갈래','분류','뜻','원문 예문','현대어 풀이','작품명','교재','쪽수','주의','한자 설명','사용'])if(!h.includes(name))throw Error('어휘자료 헤더 누락: '+name);
 const data=[],seen=new Set(),groups=new Map();
 rows.forEach((r,index)=>{
  const word=get(r,'단어');if(!word||get(r,'사용')==='숨김')return;
  for(const name of ['뜻','갈래','작품명','원문 예문','현대어 풀이'])if(!get(r,name))throw Error('어휘자료 '+(index+2)+'행: '+name+' 입력이 필요합니다.');
  let cid=get(r,'어휘ID');if(!cid){cid='c_'+Utilities.getUuid().replace(/-/g,'');sheet.getRange(index+2,h.indexOf('어휘ID')+1).setNumberFormat('@').setValue(cid);}
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(cid)||seen.has(cid))throw Error('어휘ID 중복 또는 형식 오류: '+(index+2)+'행');seen.add(cid);
  let base={};try{base=JSON.parse(get(r,'원본 메타데이터')||'{}');}catch{throw Error('원본 메타데이터 오류: '+(index+2)+'행');}
  const title=get(r,'작품명'),books=[];const book=get(r,'교재');if(book.includes('수특')||book.includes('수능특강'))books.push('수능특강');if(book.includes('수완')||book.includes('수능완성'))books.push('수능완성 수록작');
  const page=get(r,'쪽수');if(page&&!/^[0-9]+$/.test(page))throw Error('쪽수는 검증된 숫자만 입력하세요: '+(index+2)+'행');
  const source='「'+title+'」'+(books.length&&page?' '+(books[0]==='수능특강'?'2027수특':'2027수완')+' '+page+'쪽':'');
  const d={...base,id:cid,word,genre:get(r,'갈래'),cat:get(r,'분류')||'기타',def:get(r,'뜻'),title,displayQuote:get(r,'원문 예문'),modernExplanation:get(r,'현대어 풀이'),caution:get(r,'주의'),catalogBooks:books,sources:books.map(b=>({book:b,title})),displaySource:source,displayCitation:{title},linkedWorks:[]};
  const hanja=get(r,'한자 설명');if(hanja===((base.hanjaExplanation||[]).map(x=>x.character+' '+x.meaning+' '+x.reading).join(' · ')))d.hanjaExplanation=base.hanjaExplanation||[];else d.hanjaExplanation=hanja?[{character:'',meaning:hanja,reading:''}]:[];
  for(const b of books){const t=title.split(' · ')[0].trim(),key=b+'|'+t;let w=groups.get(key);if(!w){w={id:'w_'+hash_(key).slice(0,16),title:t,book:b,genre:d.genre,cardCount:0};groups.set(key,w);}w.cardCount++;d.linkedWorks.push(w.id);}
  data.push(d);
 });
 return {data,allIds:rows.map(r=>get(r,'어휘ID')).filter(Boolean),coverage:{cardCount:data.length,works:[...groups.values()].filter(w=>w.book==='수능특강'),suwanWorks:[...groups.values()].filter(w=>w.book==='수능완성 수록작')}};
}

// One client RPC for PIN verification and the initial learning screen.
function cardIds_(){const id=PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');const s=book_(id).getSheetByName('어휘자료');if(!s)throw Error('어휘자료 탭이 없습니다.');return s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().flat().filter(Boolean):[];}

function deviceLayout_(s,a){
 const labels=s.getRange(1,1,Math.min(s.getLastRow(),110),1).getDisplayValues();let dailyRow=labels.findIndex(r=>r[0]==='접속구분'||r[0]==='날짜')+1;if(dailyRow<10)throw Error('날짜 기록 헤더를 찾을 수 없습니다. 상단 행을 삭제하지 마세요.');
 let capacity=dailyRow-7;
 if(capacity<a.limit){const extra=a.limit-capacity;s.insertRowsBefore(5+capacity,extra);capacity=a.limit;dailyRow+=extra;s.getRange(5,4,capacity,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['등록','해제'],true).setAllowInvalid(false).build());s.getRange(5,2,capacity,2).setNumberFormat('yyyy-mm-dd hh:mm:ss');s.setFrozenRows(dailyRow);}
 s.getRange('A3:B3').setValues([['기기한도',a.limit]]);return {capacity,dailyRow};
}

function studentPayload_(id){const c=corpus_();return {id,data:c.data,coverage:c.coverage,completed:JSON.parse(PropertiesService.getScriptProperties().getProperty('state:'+hash_(id))||'[]')};}
function signIn(id,pin,remember,device,label){const auth=login(id,pin,remember,device,label);visitAfterLogin_(auth.id,'classic');return {...studentPayload_(auth.id),token:auth.token};}
function restoreSession(token){return lock_(()=>{const {a,s}=session_(token,true);visitRecord_(a,s,'classic',true);return studentPayload_(a.id);});}
function saveLearning(token,event){return recordProgress(token,event);}
function signOut(token){return logout(token);}
function checkSession(token){return heartbeat(token);}


// Economy extension. Existing classical vocabulary functions remain unchanged.
function economyCorpus_(){
 const id=PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');if(!id)throw Error('DATA_SHEET_ID 설정이 필요합니다.');
 const sheet=book_(id).getSheetByName('경제어휘');if(!sheet)throw Error('경제어휘 탭이 없습니다.');
 const rows=sheet.getDataRange().getDisplayValues(),h=rows.shift(),get=(r,n)=>String(r[h.indexOf(n)]||'').trim();
 for(const n of ['어휘ID','단어','분류','뜻','뜻풀이','쪽수','사용'])if(!h.includes(n))throw Error('경제어휘 헤더 누락: '+n);
 const seen=new Set(),data=[];
 for(const r of rows){if(!get(r,'단어')||get(r,'사용')==='숨김')continue;const cid=get(r,'어휘ID');if(!/^e_[A-Za-z0-9_-]{1,75}$/.test(cid)||seen.has(cid))throw Error('경제 어휘ID 중복 또는 형식 오류');seen.add(cid);if(!get(r,'뜻'))throw Error('경제어휘 뜻을 입력하세요.');
 data.push({id:cid,word:get(r,'단어'),genre:get(r,'갈래')||'경제',cat:get(r,'분류')||'기타',def:get(r,'뜻'),title:get(r,'작품명')||'경제 전제지식',displayQuote:get(r,'원문 예문'),modernExplanation:get(r,'뜻풀이'),caution:get(r,'주의'),displaySource:get(r,'교재')+' · '+get(r,'쪽수'),displayCitation:{title:get(r,'작품명')},catalogBooks:['수능특강','수능완성 수록작'].filter(b=>get(r,'교재').includes(b==='수능특강'?'수능특강':'수능완성')),sources:['수능특강','수능완성 수록작'].filter(b=>get(r,'교재').includes(b==='수능특강'?'수능특강':'수능완성')).map(book=>({book,title:get(r,'작품명')||'경제 전제지식'})),linkedWorks:[],hanjaExplanation:get(r,'한자 설명')?[{character:'',meaning:get(r,'한자 설명'),reading:''}]:[]});}
 return {data,coverage:{cardCount:data.length,works:[],suwanWorks:[]}};
}
function economyPayload_(id){const c=economyCorpus_();return {id,data:c.data,coverage:c.coverage,completed:JSON.parse(PropertiesService.getScriptProperties().getProperty('economy:state:'+hash_(id))||'[]')};}
function signInEconomy(id,pin,remember,device,label){const auth=login(id,pin,remember,device,label);visitAfterLogin_(auth.id,'economy');return {...economyPayload_(auth.id),token:auth.token};}
function restoreEconomy(token){const {a}=session_(token,false);return economyPayload_(a.id);}
function saveEconomy(token,event){return lock_(()=>{
 const {a}=session_(token,false);if(!event||!['answer','finish','progress'].includes(event.type)||!/^[a-zA-Z0-9-]{8,100}$/.test(event.eventId||''))throw Error('잘못된 기록');
 const valid=new Set(economyCorpus_().data.map(d=>d.id)),ids=[...new Set((event.completed||[]).map(String))].filter(id=>valid.has(id));
 if(event.type==='answer'&&(!valid.has(String(event.cardId))||typeof event.correct!=='boolean'))throw Error('문항 오류');
 PropertiesService.getScriptProperties().setProperty('economy:state:'+hash_(a.id),JSON.stringify(ids));return {ok:true};
});}
