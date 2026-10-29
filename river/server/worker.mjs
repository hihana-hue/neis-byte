function rpLessonRounds(items){
 const labels=new Map(),groups=new Map();
 const key=x=>x.kind==='운동'?'바디PT':x.kind;
 const regular=x=>!['클리닉','연습'].includes(x.subtype);
 const advances=x=>regular(x)&&((x.status==='출석'||(x.status==='결석'&&x.charge))||x.status==='예정');
 const ordered=[...items].sort((a,b)=>(a.originalStart||a.start||'').localeCompare(b.originalStart||b.start||'')||String(a.id).localeCompare(String(b.id)));
 for(const x of ordered){const k=key(x);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
 for(const [kind,rows] of groups){
  const size=({과학:4,바디PT:5})[kind],anchors=rows.filter(x=>x.roundAnchor);
  const invalid=anchors.length>1||(anchors.length===1&&(!advances(anchors[0])||!(anchors[0].originalStart||anchors[0].start)));
  const before=anchors.length===1?rows.slice(0,rows.indexOf(anchors[0])).filter(advances).length:0;
  let used=0;
  for(const x of rows){
   if(!regular(x)){labels.set(x.id,'클리닉');continue;}
   if(!size)continue;
   if(advances(x))used++;
   if(x.status==='예정')labels.set(x.id,invalid?'기준 확인':(((used-before-1)%size+size)%size+1)+'/'+size);
  }
 }
 return labels;
}

// Read-only widget credentials are distinct from the dashboard access password.
async function rpWidgetRoute(request,env,reply){
 const kv=env.RIVER_KV,path=new URL(request.url).pathname;
 if(!kv)return reply({error:'Cloudflare RIVER_KV 연결을 확인해 주세요.'},503);
 const bearer=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 async function input(){const raw=await request.text();if(raw.length>1000)throw Error('request too large');try{return JSON.parse(raw);}catch{return {};}}
 if(path==='/widget/pairing'||path==='/widget/revoke'){
  if(request.method!=='POST')return reply({error:'지원하지 않는 요청입니다.'},405);
  if(!env.RIVER_ACCESS_KEY||!await same(bearer,env.RIVER_ACCESS_KEY))return reply({error:'사이트 접근 암호를 확인해 주세요.'},401);
  if(path==='/widget/revoke'){for(const prefix of ['widget-device:','widget-pair:'])for(const key of await rpList(kv,prefix))await kv.delete(key.name);return reply({ok:true});}
  if((await rpList(kv,'widget-device:')).length>=10)return reply({error:'연결된 위젯 기기를 해제한 후 다시 연결해 주세요.'},400);
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',random=crypto.getRandomValues(new Uint8Array(12));
  const code=Array.from(random,x=>alphabet[x&31]).join(''),token=rpB64(crypto.getRandomValues(new Uint8Array(32))),expiresAt=Date.now()+5*60000;
  await kv.put('widget-pair:'+await rpHash(code),JSON.stringify({token,expiresAt}),{expirationTtl:300});
  return reply({ok:true,code:code.match(/.{4}/g).join('-'),expiresAt});
 }
 if(path==='/widget/pair'&&request.method==='POST'){
  const body=await input();
  if(body.mode==='student'){
   let student;try{student=await rpStudentLogin(env,body.code,request);}catch(e){return reply(rpStudentReply(e),503);}
   if(!student)return reply({error:'연결코드를 확인해 주세요. 활성화된 학생만 연결할 수 있어요.'},401);
   let token='',existing=null;
   if(typeof body.deviceToken==='string'&&/^[A-Za-z0-9_-]{43}$/.test(body.deviceToken)){
    const candidate=await rpJson(kv,'widget-device:'+await rpHash(body.deviceToken));
    if(candidate?.studentId===student.STUDENT.id&&candidate.codeHash===student.STUDENT_CODE_HASH){token=body.deviceToken;existing=candidate;}
   }
   if(!token)token=rpB64(crypto.getRandomValues(new Uint8Array(32)));
   let id=await rpHash(token);
   if(existing){const adopted=await rpWidgetGate(env,student.STUDENT.id,student.STUDENT_CODE_HASH,'feed',id,{legacy:existing});if(!adopted.ok){if(adopted.status!==401)return reply({error:adopted.error,code:adopted.code},adopted.status);token=rpB64(crypto.getRandomValues(new Uint8Array(32)));existing=null;}}
   id=await rpHash(token);
   const gate=await rpWidgetGate(env,student.STUDENT.id,student.STUDENT_CODE_HASH,'pair',id,{label:body.deviceName});
   if(!gate.ok)return reply({error:gate.error,code:gate.code},gate.status);
   return reply({ok:true,deviceToken:token,student:student.STUDENT});
  }
  const code=String(body.code||'').replaceAll('-','').replaceAll(' ','').toUpperCase();
  if(!/^[A-HJ-NP-Z2-9]{12}$/.test(code))return reply({error:'메인 대시보드에서 받은 위젯 연결 코드를 입력해 주세요.'},400);
  const key='widget-pair:'+await rpHash(code),pair=await rpJson(kv,key);
  if(!pair||Date.now()>pair.expiresAt)return reply({error:'코드가 없거나 만료됐어요. 대시보드에서 새 코드를 만들어 주세요.'},401);
  if((await rpList(kv,'widget-device:')).length>=10)return reply({error:'위젯 기기 수를 확인해 주세요.'},400);
  const id=await rpHash(pair.token);await kv.put('widget-device:'+id,JSON.stringify({id,scope:'widget:read',createdAt:Date.now()}));
  await kv.delete(key);return reply({ok:true,deviceToken:pair.token});
 }
 if(!/^[A-Za-z0-9_-]{43}$/.test(bearer))return reply({error:'위젯 연결 코드를 다시 등록해 주세요.'},401);
 const id=await rpHash(bearer),device=await rpJson(kv,'widget-device:'+id);
 if(!device||device.scope!=='widget:read')return reply({error:'해제된 위젯 연결입니다. 새 코드로 연결해 주세요.'},401);
 if(path==='/widget/disconnect'&&request.method==='POST'){if(device.studentId){const gate=await rpWidgetGate(env,device.studentId,device.codeHash,'disconnect',id);if(!gate.ok)return reply({error:gate.error},gate.status);}else await kv.delete('widget-device:'+id);return reply({ok:true});}
 if(device.studentId){const student=await rpStudentDevice(env,device);if(!student)return reply({error:'학생 연결이 중지되었거나 코드가 변경됐어요.'},401);env=student;const gate=await rpWidgetGate(env,device.studentId,device.codeHash,'feed',id,{legacy:device});if(!gate.ok)return reply({error:gate.error},gate.status);}
 if(path==='/widget/designs'&&request.method==='GET')return reply(await rpWidgetDesigns(env));
 if(path!=='/widget/feed'||request.method!=='GET')return reply({error:'위젯에서는 일정 조회만 할 수 있어요.'},405);
 if(!env.NOTION_TOKEN||!env.SCHOOL_DATA_SOURCE_ID)return reply({error:'노션 연결 설정을 확인해 주세요.'},503);
 const [sp,ap]=await Promise.all([rpPages(env,env.SCHOOL_DATA_SOURCE_ID),(env.STUDENT&&!env.ACADEMY_DATA_SOURCE_ID?Promise.resolve([]):rpPages(env,env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9'))]);
 const text=value=>(value||[]).map(x=>x.plain_text??x.text?.content??'').join('');
 const subjectColors=await rpSubjectColors(env);
 const school=sp.filter(p=>['시작전','진행 중','진행 2차','작성 완료'].includes(p.properties['상태']?.status?.name)).map(p=>{const a=p.properties;return {id:p.id,title:text(a['주제']?.title),subjects:(a['과목']?.multi_select||[]).map(x=>x.name),subjectColors:Object.fromEntries((a['과목']?.multi_select||[]).map(x=>[x.name,subjectColors[x.name]||x.color||'default'])),due:a['기한']?.date?.start||null,status:a['상태']?.status?.name};});
 const rounds=rpLessonRounds(ap.map(p=>{const a=p.properties;return {id:p.id,kind:a['학원']?.select?.name||'',subtype:a['수업 구분']?.select?.name||'수업',start:a['수업일시']?.date?.start||null,originalStart:a['최초 수업일']?.date?.start||null,status:a['출결']?.select?.name||'예정',charge:!!a['회차 차감']?.checkbox,roundAnchor:!!a['회차 기준']?.checkbox};}));
 const academy=ap.filter(p=>(p.properties['출결']?.select?.name||'예정')==='예정').map(p=>{const a=p.properties;return {id:p.id,kind:a['학원']?.select?.name||'',subtype:a['수업 구분']?.select?.name||'수업',start:a['수업일시']?.date?.start||null,originalStart:a['최초 수업일']?.date?.start||null,status:'예정',round:rounds.get(p.id)||''};});
 return reply({school,academy,student:env.STUDENT||null,academyConnected:!env.STUDENT||!!env.ACADEMY_DATA_SOURCE_ID});
}

function rpPushError(code,message){const e=new Error(message);e.pushCode=code;return e;}
async function rpPushStage(code,message,fn){try{return await fn();}catch(e){if(e?.pushCode)throw e;throw rpPushError(code,message);}}
function rpPushReplyError(e){return e?.pushCode?{error:e.message+' ['+e.pushCode+']',code:e.pushCode}:{error:'알림 서버 요청을 처리하지 못했어요. Cloudflare 설정을 확인해 주세요. [PUSH_INTERNAL]',code:'PUSH_INTERNAL'};}
// Empty Web Push wakes the service worker; content is fetched over authenticated HTTPS.
const rpEnc=new TextEncoder();
function rpB64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function rpDecode(value){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function rpHash(value){return rpB64(await crypto.subtle.digest('SHA-256',rpEnc.encode(value)));}
async function rpJson(kv,key){const value=await kv.get(key);return value?JSON.parse(value):null;}
async function rpList(kv,prefix){const keys=[];let cursor;do{const r=await kv.list({prefix,limit:100,...(cursor?{cursor}:{})});keys.push(...r.keys);cursor=r.list_complete?null:r.cursor;if(keys.length>2000)throw Error('저장 항목이 너무 많습니다.');}while(cursor);return keys;}
async function rpNotion(env,path,method='GET',body){const r=await fetch('https://api.notion.com/v1/'+path,{method,headers:{Authorization:'Bearer '+env.NOTION_TOKEN,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!r.ok){const e=Error('노션 연결을 확인해 주세요.');e.notionStatus=r.status;throw e;}return r.json();}
async function rpSubjectColors(env){
 try{const source=await rpNotion(env,'data_sources/'+env.SCHOOL_DATA_SOURCE_ID);return Object.fromEntries((source.properties?.['과목']?.multi_select?.options||[]).map(x=>[x.name,x.color||'default']));}catch{return {};}
}
async function rpPages(env,ds){const pages=[];let cursor;do{const r=await rpNotion(env,'data_sources/'+ds+'/query','POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});pages.push(...r.results.filter(p=>!p.archived&&!p.in_trash));cursor=r.has_more?r.next_cursor:null;}while(cursor);return pages;}


function rpStudentError(message,code){const e=Error(message);e.studentCode=code;return e;}
function rpStudentReply(e){return e?.studentCode?{error:e.message,code:e.studentCode}:{error:'학생 연결 서버의 설정을 확인해 주세요. [STUDENT_INTERNAL]',code:'STUDENT_INTERNAL'};}
async function rpStudentStage(stage,fn){
 try{return await fn();}catch(e){
  if(e?.studentCode)throw e;
  const status=e?.notionStatus;
  const reason=status===401?'서버의 Notion 토큰을 확인해 주세요.':status===403||status===404?'해당 DB에 기존 서버용 노션 연동을 추가해 주세요.':status===429?'노션 요청이 많습니다. 잠시 후 다시 연결해 주세요.':status===400?'DB 주소와 속성 이름을 확인해 주세요.':'서버 연결 설정을 확인해 주세요.';
  const code=stage+(status?'_'+status:'');throw rpStudentError(stage==='STUDENT_REGISTRY'?'학생 연결 관리표를 읽지 못했습니다. '+reason+' ['+code+']':stage==='STUDENT_SCHOOL'?'학교 DB를 읽지 못했습니다. '+reason+' ['+code+']':stage==='STUDENT_ACADEMY'?'학원 DB를 읽지 못했습니다. '+reason+' ['+code+']':'연결 저장소 RIVER_KV를 확인해 주세요. ['+code+']',code);
 }
}

const RP_STUDENTS='400215b9-b774-80a0-ae62-000b166c0655';
const rpText=value=>(value||[]).map(x=>x.plain_text??x.text?.content??'').join('');
function rpDbId(value){
 if(typeof value!=='string')throw Error('DB 링크를 확인해 주세요.');
 const u=new URL(value);if(u.protocol!=='https:'||!['app.notion.com','www.notion.so','notion.so'].includes(u.hostname))throw Error('노션 DB 링크가 아닙니다.');
 const match=u.pathname.match(/([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/?$/i);if(!match)throw Error('DB ID를 확인해 주세요.');return match[1];
}
async function rpStudentEnv(env,page){
 if(!page||page.archived||page.in_trash||normalized(page.parent?.data_source_id)!==normalized(env.STUDENT_REGISTRY_ID||RP_STUDENTS)||!page.properties?.['연결 활성화']?.checkbox)return null;
 const p=page.properties,school=p['학교 DB 링크']?.url,academy=p['학원 DB 링크']?.url;
 async function source(link,stage){return rpStudentStage(stage,async()=>{const db=await rpNotion(env,'databases/'+rpDbId(link));if(db.data_sources?.length!==1)throw rpStudentError('연결할 DB의 데이터 원본을 하나로 지정해 주세요. ['+stage+'_SOURCE]',stage+'_SOURCE');return db.data_sources[0].id;});}
 return {...env,SCHOOL_DATA_SOURCE_ID:await source(school,'STUDENT_SCHOOL'),ACADEMY_DATA_SOURCE_ID:academy?await source(academy,'STUDENT_ACADEMY'):'',STUDENT:{id:page.id,name:rpText(p['이름']?.title),schoolUrl:school,widgetTitle:rpText(p['위젯 제목']?.rich_text).trim()||rpText(p['이름']?.title).trim()+' Fighting'},STUDENT_CODE_HASH:await rpHash(rpText(p['연결코드']?.rich_text))};
}
async function rpStudentLogin(env,code,request){
 if(typeof code!=='string'||code.length<4||code.length>100||code!==code.trim())return null;
 const kv=env.RIVER_KV;if(!kv)throw rpStudentError('서버에 연결 저장소 RIVER_KV를 연결해 주세요. [STUDENT_KV]','STUDENT_KV');
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 if(!env.STUDENT_WIDGETS)throw rpStudentError('학생 연결 저장소 설정을 확인해 주세요. [STUDENT_KV]','STUDENT_KV');
 const rate=env.STUDENT_WIDGETS.get(env.STUDENT_WIDGETS.idFromName('rate:'+await rpHash(ip)));
 const allowed=await rate.fetch('https://student-widget.internal/',{method:'POST',body:JSON.stringify({action:'rate'})});
 if(!allowed.ok)return null;
 const failed=async()=>{await rate.fetch('https://student-widget.internal/',{method:'POST',body:JSON.stringify({action:'rate-failure'})});return null;};
 const d=await rpStudentStage('STUDENT_REGISTRY',()=>rpNotion(env,'data_sources/'+(env.STUDENT_REGISTRY_ID||RP_STUDENTS)+'/query','POST',{page_size:2,filter:{property:'연결코드',rich_text:{equals:code}}}));
 if(d.results?.length!==1)return failed();
 const e=await rpStudentEnv(env,d.results[0]);if(!e||!await same(e.STUDENT_CODE_HASH,await rpHash(code)))return failed();return e;
}
async function rpStudentDevice(env,device){
 const page=await rpNotion(env,'pages/'+device.studentId),e=await rpStudentEnv(env,page);
 return e&&await same(e.STUDENT_CODE_HASH,device.codeHash||'')?e:null;
}


const RP_DESIGN_SOURCE='407215b9-b774-8007-9b93-000bf88ea344';
const rpDesignPending=new Map();
async function rpWidgetDesigns(env){
 if(!env.STUDENT_WIDGETS)return rpReadWidgetDesigns(env);
 const stub=env.STUDENT_WIDGETS.get(env.STUDENT_WIDGETS.idFromName('widget-designs-v1'));
 const response=await stub.fetch('https://student-widget.internal/',{method:'POST',body:JSON.stringify({action:'designs'})});
 if(!response.ok)throw Error('디자인 연결 실패');return response.json();
}
async function rpReadWidgetDesigns(env){
 const key=env.NOTION_TOKEN+':'+(env.WIDGET_DESIGN_SOURCE_ID||RP_DESIGN_SOURCE);
 if(rpDesignPending.has(key))return rpDesignPending.get(key);
 const job=(async()=>{
  const pages=await rpPages(env,env.WIDGET_DESIGN_SOURCE_ID||RP_DESIGN_SOURCE);
  const colors={background:'전체 배경색',titleColor:'타이틀 글자색',academyBackground:'학원 패널 배경색',academyText:'학원 글자색',separator:'학원 세로선 색상',schoolBackground:'학교 일정 배경색',schoolText:'학교 일정 글자색',divider:'학교 일정 하단선 색상',today:'오늘 강조색'};
  const designs=pages.map(page=>{
   const p=page.properties,d={id:page.id,name:rpText(p['이름']?.title).trim(),titleBold:!!p['타이틀 굵게']?.checkbox,academyBold:!!p['학원 과목명 굵게']?.checkbox};
   for(const [key,label] of Object.entries(colors)){const value=rpText(p[label]?.rich_text).trim();if(/^#[0-9a-f]{6}$/i.test(value))d[key]=value.toUpperCase();else if(key==='schoolBackground'&&value==='없음')d[key]='none';}
   return d;
  }).filter(x=>x.name&&x.name.length<=100);
  return {schemaVersion:1,designs};
 })();
 rpDesignPending.set(key,job);try{return await job;}finally{rpDesignPending.delete(key);}
}

function rpJobs(school,academy,now){
 const jobs=[],day=86400000,text=a=>(a||[]).map(x=>x.plain_text??x.text?.content??'').join('');
 const add=(p,type,start,at,title,body,slot,until)=>{if(!Number.isFinite(at)||at>now||now-at>10*60000||at<Date.parse(p.created_time||0)||now>=until)return;jobs.push({id:p.id+':'+start+':'+slot,page:p.id,type,start,at,until,title,body,url:'/river/?'+(type==='academy'?'lesson=':'task=')+encodeURIComponent(p.id)});};
 for(const p of school){const a=p.properties,status=a['상태']?.status?.name,due=a['기한']?.date?.start;if(['완료','봉사완료'].includes(status)||!due)continue;const key=due.slice(0,10),mid=Date.parse(key+'T00:00:00+09:00');if(!Number.isFinite(mid))continue;for(const d of [7,2,1]){const at=mid-d*day+20*3600000;add(p,'school',due,at,(a['과목']?.multi_select||[]).map(x=>x.name).join(' · ')+' · D-'+d,text(a['주제']?.title)+(d===7?' — 이번 주말에 꼭 준비해 둬!':d===2?' — 이틀 남았어. 남은 부분을 준비하자.':' — 내일 마감이야. 제출할 것을 확인하자.'),'d'+d,Math.min(at+3600000,mid+day));}}
 for(const p of academy){const a=p.properties,start=a['수업일시']?.date?.start,status=a['출결']?.select?.name||'예정';if(status!=='예정'||!start||!start.includes('T'))continue;const n=Date.parse(start);if(!Number.isFinite(n))continue;const local=new Date(n+9*3600000).toISOString().slice(0,10),kind=a['학원']?.select?.name||'학원',label=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(n));const before=Date.parse(local+'T20:00:00+09:00')-day;add(p,'academy',start,before,kind+' · 내일 수업',label+' 수업이 있어. 미리 준비해 두자.','eve',Math.min(before+3600000,n));add(p,'academy',start,n-3600000,kind+' · 1시간 뒤 수업',label+' 수업이야. 준비하고 출발하자.','hour',n);}
 return jobs;
}
function rpEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&value.length<3000&&((u.hostname==='fcm.googleapis.com'&&/^\/(fcm\/send|wp)\//.test(u.pathname))||(u.hostname==='updates.push.services.mozilla.com'&&u.pathname.startsWith('/wpush/')));}catch{return false;}}
async function rpWake(record,keys,topic){
 if(!rpEndpoint(record.endpoint))throw rpPushError('PUSH_ENDPOINT','이 기기의 알림 주소를 확인하지 못했어요. 알림 끄기 후 다시 켜 주세요.');
 const aud=new URL(record.endpoint).origin,h=rpB64(rpEnc.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),p=rpB64(rpEnc.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+3600,sub:'https://www.marihome.co.kr/river/'})));
 const sig=await rpPushStage('PUSH_SIGN','서버의 알림 인증 키로 서명하지 못했어요.',async()=>{const key=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);return rpB64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,rpEnc.encode(h+'.'+p)));});
 return rpPushStage('PUSH_NETWORK','푸시 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',()=>fetch(record.endpoint,{method:'POST',body:'',redirect:'error',headers:{Authorization:'vapid t='+h+'.'+p+'.'+sig+', k='+keys.publicKey,TTL:'600',Urgency:'high',Topic:topic},signal:AbortSignal.timeout(12000)}));
}
async function rpDeliver(env,record,job,keys){
 const kv=env.RIVER_KV,id=await rpHash(job.id),sent='sent:'+record.id+':'+id;
 const previous=await rpPushStage('PUSH_STORAGE','알림 저장소 연결을 확인해 주세요.',()=>kv.get(sent));if(previous)return 'skipped';
 await rpPushStage('PUSH_QUEUE','알림 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',()=>kv.put('notice:'+record.id+':'+id,JSON.stringify({...job,id}),{expirationTtl:3600}));
 const r=await rpWake(record,keys,id.slice(0,32));
 if(r.status===404||r.status===410){await kv.delete('device:'+record.id);return 'expired';}
 if(!r.ok){
  const message=r.status===401||r.status===403?'푸시 서비스가 알림 인증을 거부했어요. 이 기기 알림을 끈 뒤 다시 켜 주세요.':r.status===429?'푸시 서비스 요청이 많아요. 잠시 후 다시 시도해 주세요.':'푸시 서비스가 전송을 거부했어요. HTTP '+r.status;
  let detail='';try{const response=(await r.text()).slice(0,4096);detail=['UnauthorizedRegistration','InvalidRegistration','NotRegistered','InvalidToken','InvalidAudience','InvalidSubject','BadJwtToken','VapidPkHashMismatch','InvalidPublicKey','InvalidVapidToken','MismatchSenderId','InvalidTtl','InvalidTopic'].find(code=>response.includes(code))||'';}catch{}
  throw rpPushError('PUSH_HTTP_'+r.status+(detail?'_'+detail:''),message);
 }
 // Once the provider accepts the wake-up, a bookkeeping error must not report a send failure.
 try{await kv.put(sent,'1',{expirationTtl:32*86400});}catch{}
 return 'accepted';
}
async function rpDevice(request,env){const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return rpJson(env.RIVER_KV,'device:'+await rpHash(token));}
async function rpCurrent(env,job){if(job.type==='test')return true;const p=await rpNotion(env,'pages/'+job.page);if(p.archived||p.in_trash)return false;const ds=job.type==='academy'?(env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9'):env.SCHOOL_DATA_SOURCE_ID;if(p.parent?.type!=='data_source_id'||p.parent.data_source_id.replaceAll('-','')!==ds.replaceAll('-',''))return false;const a=p.properties;if(job.type==='academy')return (a['출결']?.select?.name||'예정')==='예정'&&a['수업일시']?.date?.start===job.start;return !['완료','봉사완료'].includes(a['상태']?.status?.name)&&a['기한']?.date?.start===job.start;}
async function rpPushRoute(request,env,reply){
 const path=new URL(request.url).pathname,kv=env.RIVER_KV;if(!kv)return reply({error:'Cloudflare에 RIVER_KV 바인딩을 연결해 주세요.'},503);
 if(path==='/push/inbox'||path==='/push/ack'){
  const device=await rpDevice(request,env);if(!device)return reply({error:'기기 알림 연결을 다시 설정해 주세요.'},401);
  if(path==='/push/inbox'&&request.method==='GET'){const keys=await rpList(kv,'notice:'+device.id+':'),items=[];for(const k of keys.slice(-20)){const j=await rpJson(kv,k.name);if(j&&Date.now()<j.until&&await rpCurrent(env,j))items.push(j);}return reply({items});}
  if(path==='/push/ack'&&request.method==='POST'){const raw=await request.text();if(raw.length>2000)return reply({error:'요청이 너무 깁니다.'},413);const body=JSON.parse(raw);if(!Array.isArray(body.ids)||body.ids.length>20||body.ids.some(x=>typeof x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(x)))return reply({error:'잘못된 요청입니다.'},400);for(const id of body.ids)await kv.delete('notice:'+device.id+':'+id);if(body.ids.length){const receipt=JSON.stringify({at:Date.now(),ids:body.ids,count:body.ids.length});await kv.put('push:last-received',receipt);await kv.put('push:received:'+device.id,receipt,{expirationTtl:86400});}return reply({ok:true});}
  return reply({error:'지원하지 않는 요청입니다.'},405);
 }
 const auth=request.headers.get('Authorization')||'';if(!env.RIVER_ACCESS_KEY||!auth.startsWith('Bearer ')||!await same(auth.slice(7),env.RIVER_ACCESS_KEY))return reply({error:'사이트 접근 암호를 확인해 주세요.'},401);
 let keys=await rpPushStage('PUSH_STORAGE','알림 저장소의 인증 키를 읽지 못했어요.',()=>rpJson(kv,'vapid:v1'));
 if(path==='/push/config'&&request.method==='GET')return reply({ready:!!keys,publicKey:keys?.publicKey||null,lastRun:await rpJson(kv,'cron:last'),lastDelivery:await rpJson(kv,'push:last-delivery'),lastReceived:await rpJson(kv,'push:last-received')});
 if(path==='/push/setup'&&request.method==='POST'){
  if(!keys){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);keys={publicKey:rpB64(await crypto.subtle.exportKey('raw',pair.publicKey)),privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey)};await kv.put('vapid:v1',JSON.stringify(keys));}
  return reply({ok:true,publicKey:keys.publicKey});
 }
 if(!keys)return reply({error:'먼저 알림 서버 준비 버튼을 눌러 주세요.'},503);
 if(!['/push/subscribe','/push/unsubscribe','/push/test','/push/status'].includes(path)||request.method!=='POST')return reply({error:'요청을 찾지 못했습니다.'},404);
 const raw=await request.text();if(raw.length>7000)return reply({error:'요청이 너무 깁니다.'},413);const body=JSON.parse(raw);if(!/^[A-Za-z0-9_-]{43}$/.test(body.deviceToken||''))return reply({error:'기기 연결값이 올바르지 않아요.'},400);const id=await rpHash(body.deviceToken);
 if(path==='/push/subscribe'){
  if(!rpEndpoint(body.endpoint)||body.publicKey!==keys.publicKey)return reply({error:'지원하지 않는 기기이거나 알림 키가 변경됐어요. 다시 연결해 주세요.'},400);
  const all=await rpList(kv,'device:');if(!all.some(x=>x.name==='device:'+id)&&all.length>=10)return reply({error:'알림 기기는 최대 10대까지 연결할 수 있어요.'},400);
  await kv.put('device:'+id,JSON.stringify({id,endpoint:body.endpoint,enabledAt:Date.now()}));return reply({ok:true});
 }
 if(path==='/push/unsubscribe'){await kv.delete('device:'+id);return reply({ok:true});}
 const record=await rpJson(kv,'device:'+id);if(!record)return reply({error:'이 기기의 알림 받기를 먼저 켜 주세요.'},400);
 if(path==='/push/status')return reply({lastReceived:await rpJson(kv,'push:received:'+id)});
 const now=Date.now(),testId=crypto.randomUUID();if(await kv.get('test:'+id))return reply({error:'테스트는 1분 뒤에 다시 할 수 있어요.'},429);
 let state;try{state=await rpDeliver(env,record,{id:testId,type:'test',at:now,until:now+10*60000,title:'CHOI RIVER · 알림 테스트',body:'강아, 알림이 잘 도착했어! 수업과 과제도 함께 챙겨보자.',url:'/river/?settings=notifications'},keys);await kv.put('push:last-delivery',JSON.stringify({at:now,state}));}catch(e){try{await kv.put('push:last-delivery',JSON.stringify({at:now,state:'error',code:e.pushCode||'PUSH_INTERNAL'}));}catch{}throw e;}try{await kv.put('test:'+id,'1',{expirationTtl:60});}catch{}return reply({ok:state==='accepted',state,noticeId:await rpHash(testId)});
}
async function rpScheduled(env){
 if(env.PUSH_ENABLED!=='true')return; // Notifications are handled by Notion, not this app.
 const kv=env.RIVER_KV;if(!kv)return;const started=Date.now();try{const keys=await rpJson(kv,'vapid:v1'),listed=await rpList(kv,'device:');if(!keys||!listed.length){await kv.put('cron:last',JSON.stringify({at:started,state:'waiting',accepted:0}));return;}
 const devices=(await Promise.all(listed.map(k=>rpJson(kv,k.name)))).filter(Boolean),[school,academy]=await Promise.all([rpPages(env,env.SCHOOL_DATA_SOURCE_ID),rpPages(env,env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9')]);const jobs=rpJobs(school,academy,started);let accepted=0;
 for(const device of devices)for(const job of jobs){if(job.at<device.enabledAt)continue;try{if(await rpDeliver(env,device,job,keys)==='accepted')accepted++;}catch(e){await kv.put('cron:last-error',JSON.stringify({at:Date.now(),error:e?.pushCode||'PUSH_INTERNAL'}),{expirationTtl:86400});}}
 await kv.put('cron:last',JSON.stringify({at:started,state:'ran',accepted}));
 }catch{await kv.put('cron:last',JSON.stringify({at:started,state:'error',error:'노션 또는 알림 서버 연결을 확인해 주세요.'}));}
}

// Deploy separately as a Cloudflare Worker. Secrets must be set in the server dashboard.
const normalized=id=>(id||'').replaceAll('-','');
async function same(a,b){const enc=new TextEncoder();const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(x)));const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
const RP_INTERNAL=Symbol('river-authorized-scope');
async function rpFetch(request,env){
 const origin=request.headers.get('Origin'), allowed=env.ALLOWED_ORIGIN||'https://www.marihome.co.kr';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, X-River-Revision, X-River-Reconnect','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>new Response(JSON.stringify({...body,...(env.WEB_REVISION!=null?{webRevision:env.WEB_REVISION}:{})}),{status,headers});
 if(origin&&origin!==allowed)return reply({error:'허용되지 않은 주소입니다.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(new URL(request.url).pathname.startsWith('/widget/')){try{return await rpWidgetRoute(request,env,reply);}catch{return reply({error:'위젯 연결에 실패했어요. 잠시 후 다시 시도해 주세요.'},502);}}
 if(new URL(request.url).pathname.startsWith('/push/')){if(env.PUSH_ENABLED!=='true')return reply({error:'알림은 노션에서 사용합니다.'},410);try{return await rpPushRoute(request,env,reply);}catch(e){return reply(rpPushReplyError(e),502);}}
 if(!env.NOTION_TOKEN)return reply({error:'노션 연결 설정이 완료되지 않았습니다.'},503);
 const auth=request.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer '))return reply({error:'학생 연결코드를 입력해 주세요.'},401);
 if(!env[RP_INTERNAL]&&(!env.RIVER_ACCESS_KEY||!await same(auth.slice(7),env.RIVER_ACCESS_KEY))){
  try{const student=await rpStudentLogin(env,auth.slice(7),request);if(!student)return reply({error:'연결코드가 틀렸거나 연결이 중지된 학생입니다.'},401);const gate=await rpWidgetGate(env,student.STUDENT.id,student.STUDENT_CODE_HASH,'web',request.headers.get('X-River-Revision'),{reconnect:request.headers.get('X-River-Reconnect')==='true'});if(!gate.ok)return reply({error:gate.error},gate.status);env={...student,WEB_REVISION:gate.webRevision};}
  catch(e){return reply(rpStudentReply(e),503);}
 }
 if(!env.SCHOOL_DATA_SOURCE_ID)return reply({error:'학교 DB 링크를 설정해 주세요.'},503);
 async function notion(path,method='GET',body){const r=await fetch('https://api.notion.com/v1/'+path,{method,headers:{Authorization:'Bearer '+env.NOTION_TOKEN,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('노션 요청 실패');return r.json();}
 try{const path=new URL(request.url).pathname;
  if(path==='/dashboard'&&request.method==='GET'){
   const scoped={...env,[RP_INTERNAL]:true};
   const read=async path=>{const u=new URL(request.url);u.pathname=path;return rpFetch(new Request(u,{headers:request.headers}),scoped);};
   const school=await read('/tasks');if(!school.ok)return school;
   const academy=await read('/academy');if(!academy.ok)return academy;
   return reply({...await school.json(),academy:await academy.json()});
  }

  // Academy lessons: each Notion page represents one lesson.
  if(path==='/academy'||path.startsWith('/academy/')){
   if(env.STUDENT&&!env.ACADEMY_DATA_SOURCE_ID)return request.method==='GET'?reply({items:[]}):reply({error:'학원 DB가 연결되지 않았어요.'},403);
   const ds=env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9';
   const rt=value=>(value||[]).map(x=>x.plain_text??x.text?.content??'').join('');
   const rich=value=>Array.from({length:Math.ceil(value.length/1900)},(_,i)=>({text:{content:value.slice(i*1900,(i+1)*1900)}}));
   const lesson=p=>{const a=p.properties;return {id:p.id,title:rt(a['수업명']?.title),kind:a['학원']?.select?.name||'',subtype:a['수업 구분']?.select?.name||'수업',start:a['수업일시']?.date?.start||null,originalStart:a['최초 수업일']?.date?.start||null,status:a['출결']?.select?.name||'예정',charge:!!a['회차 차감']?.checkbox,roundAnchor:!!a['회차 기준']?.checkbox,history:rt(a['변경 이력']?.rich_text),note:rt(a['메모']?.rich_text),updated:p.last_edited_time,url:p.url};};
   const validSubtype=(kind,value)=>typeof kind==='string'&&!!kind.trim()&&['수업','클리닉'].includes(value);
   const validStart=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+09:00$/.test(s))return false;const n=Date.parse(s);return Number.isFinite(n)&&new Date(n+9*3600000).toISOString().slice(0,19)===s.slice(0,19);};
   if(path==='/academy'&&request.method==='GET'){
    const pages=[];let cursor;do{const d=await notion('data_sources/'+ds+'/query','POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});pages.push(...d.results);cursor=d.has_more?d.next_cursor:null;}while(cursor);
    const items=pages.filter(p=>p.object==='page'&&!p.in_trash&&!p.archived).map(lesson);
    let kinds=[...new Set(items.map(x=>x.kind).filter(Boolean))];try{const source=await notion('data_sources/'+ds);kinds=(source.properties?.['학원']?.select?.options||[]).map(x=>x.name);}catch{}
    return reply({items,kinds});
   }
   if(request.method!=='POST'&&request.method!=='PATCH')return reply({error:'지원하지 않는 요청입니다.'},405);
   const raw=await request.text();if(raw.length>12000)return reply({error:'입력 내용이 너무 깁니다.'},413);
   let input;try{input=JSON.parse(raw);}catch{return reply({error:'입력 형식을 확인해 주세요.'},400);}
   if(path==='/academy'&&request.method==='POST'){
    if(typeof input.kind!=='string'||!input.kind.trim()||!validStart(input.start)||typeof input.note!=='string'||input.note.length>1000)return reply({error:'학원·날짜·시간을 확인해 주세요.'},400);
    const source=await notion('data_sources/'+ds);
    if(!(source.properties?.['학원']?.select?.options||[]).some(x=>x.name===input.kind))return reply({error:'현재 노션에 등록된 학원·일정을 선택해 주세요. 새로고침 후 다시 시도해 주세요.'},400);
    const subtype=input.subtype||'수업';if(!validSubtype(input.kind,subtype))return reply({error:'학원에 맞는 수업 구분을 선택해 주세요.'},400);
    const p=await notion('pages','POST',{parent:{type:'data_source_id',data_source_id:ds},properties:{'수업명':{title:[{text:{content:input.kind+' 수업'}}]},'학원':{select:{name:input.kind}},'수업 구분':{select:{name:subtype}},'수업일시':{date:{start:input.start}},'출결':{select:{name:'예정'}},'메모':{rich_text:rich(input.note)}}});
    return reply({ok:true,item:lesson(p)},201);
   }
   const m=path.match(/^\/academy\/([a-f0-9-]{32,36})$/i);
   if(!m||request.method!=='PATCH')return reply({error:'요청을 찾지 못했습니다.'},404);
   const p=await notion('pages/'+m[1]);
   if(p.archived||p.in_trash||p.parent?.type!=='data_source_id'||normalized(p.parent.data_source_id)!==normalized(ds))return reply({error:'학원 DB에 속한 수업이 아닙니다.'},403);
   if(input.action==='attendanceNext'){
    const old=lesson(p),nextSubtype=input.nextSubtype||old.subtype||'수업';
    if(!validSubtype(old.kind,nextSubtype))return reply({error:'학원에 맞는 수업 구분을 선택해 주세요.'},400);
    if(!['예정','출석'].includes(old.status))return reply({error:'출결이 변경됐어요. 새로고침해 주세요.'},409);
    if(old.status!=='출석'&&(!input.updated||input.updated!==p.last_edited_time))return reply({error:'다른 곳에서 변경된 수업입니다. 새로고침 후 다시 시도해 주세요.'},409);
    if(input.nextStart!==null&&(!validStart(input.nextStart)||Date.parse(input.nextStart)<=Date.parse(old.start||'')))return reply({error:'다음 수업은 이번 수업 이후 날짜로 입력해 주세요.'},400);
    let next=null;
    if(input.nextStart!==null){
     const linked=await notion('data_sources/'+ds+'/query','POST',{page_size:100,filter:{property:'이전 수업 ID',rich_text:{equals:p.id}}});
     next=linked.results.find(x=>!x.archived&&!x.in_trash)||null;
     if(!next){
      // Reuse an already registered lesson at this exact time rather than duplicate it.
      const existing=await notion('data_sources/'+ds+'/query','POST',{page_size:100,filter:{and:[{property:'학원',select:{equals:old.kind}},{property:'수업 구분',select:{equals:nextSubtype}},{property:'수업일시',date:{equals:input.nextStart}}]}});
      next=existing.results.find(x=>!x.archived&&!x.in_trash&&x.id!==p.id&&x.properties?.['출결']?.select?.name==='예정')||null;
      if(next)next=await notion('pages/'+next.id,'PATCH',{properties:{'이전 수업 ID':{rich_text:rich(p.id)}}});
      else next=await notion('pages','POST',{parent:{type:'data_source_id',data_source_id:ds},properties:{'수업명':{title:[{text:{content:old.kind+' 수업'}}]},'학원':{select:{name:old.kind}},'수업 구분':{select:{name:nextSubtype}},'수업일시':{date:{start:input.nextStart}},'출결':{select:{name:'예정'}},'이전 수업 ID':{rich_text:rich(p.id)}}});
     }
    }
    if(old.status==='출석')return reply({ok:true,item:old,next:next?lesson(next):null});
    const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date());
    const history=(old.history?old.history+'\n':'')+stamp+' 출결 변경: '+old.status+' → 출석';
    if(history.length>40000)return reply({error:'변경 이력이 길어 저장할 수 없어요. 노션에서 확인해 주세요.'},400);
    const updated=await notion('pages/'+p.id,'PATCH',{properties:{'출결':{select:{name:'출석'}},'회차 차감':{checkbox:false},'변경 이력':{rich_text:rich(history)}}});
    return reply({ok:true,item:lesson(updated),next:next?lesson(next):null});
   }
   if(!input.updated||input.updated!==p.last_edited_time)return reply({error:'다른 곳에서 변경된 수업입니다. 새로고침 후 다시 시도해 주세요.'},409);
   const old=lesson(p),props={};let entry='';
   if(input.action==='reschedule'){
    if(!validStart(input.start))return reply({error:'새 날짜와 시간을 확인해 주세요.'},400);
    const subtype=input.subtype||old.subtype||'수업';if(!validSubtype(old.kind,subtype))return reply({error:'학원에 맞는 수업 구분을 선택해 주세요.'},400);
    if(input.start===old.start&&subtype===old.subtype)return reply({ok:true,item:old});
    props['수업 구분']={select:{name:subtype}};
    props['변경 전 일시']={date:old.start?{start:old.start}:null};
    props['수업일시']={date:{start:input.start}};
    // Keep the first lesson date, attendance and charge when moving the same lesson.
    if(!old.originalStart){
     const source=await notion('data_sources/'+ds);
     if(!source.properties?.['최초 수업일'])await notion('data_sources/'+ds,'PATCH',{properties:{'최초 수업일':{date:{}}}});
     else if(source.properties['최초 수업일'].type!=='date')return reply({error:'최초 수업일 속성을 날짜 형식으로 설정해 주세요.'},409);
     props['최초 수업일']={date:old.start?{start:old.start}:null};
    }
    const original=old.originalStart||old.start;
    if(original&&Number.isFinite(Date.parse(original))){
     const day=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',day:'numeric'}).format(new Date(original));
     const previous=(old.history||'').split('\n').filter(line=>line.includes(' 보강 날짜 변경: ')).length;
     const named=Number((old.title||'').match(/ 보강 (\d+)th$/)?.[1]||(/ 보강$/.test(old.title||'')?1:0));
     const number=Math.max(previous,named)+(input.start===old.start?0:1)||1;
     props['수업명']={title:[{text:{content:(old.kind==='운동'?'바디PT':old.kind)+' '+day+' 보강'+(number>1?' '+number+'th':'')}}]};
    }
    entry='보강 날짜 변경: '+(old.start||'미정')+' → '+input.start+' / 최초 수업 '+(old.originalStart||old.start||'미정')+' / 출결 유지 '+old.status;
   }else if(input.action==='attendance'){
    if(!['예정','출석','결석'].includes(input.status)||typeof input.charge!=='boolean')return reply({error:'출결을 확인해 주세요.'},400);
    props['출결']={select:{name:input.status}};props['회차 차감']={checkbox:input.status==='결석'&&input.charge&&!['클리닉','연습'].includes(old.subtype)};
    entry='출결 변경: '+old.status+' → '+input.status+(input.status==='결석'?(input.charge&&!['클리닉','연습'].includes(old.subtype)?' (회차 차감)':' (차감 없음)'):'');
   }else return reply({error:'변경 내용을 확인해 주세요.'},400);
   const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date());
   const history=(old.history?old.history+'\n':'')+stamp+' '+entry;
   if(history.length>40000)return reply({error:'변경 이력이 길어 저장할 수 없어요. 노션에서 이력을 별도로 보관해 주세요.'},400);
   props['변경 이력']={rich_text:rich(history)};
   const updated=await notion('pages/'+m[1],'PATCH',{properties:props});return reply({ok:true,item:lesson(updated)});
  }

  if(path==='/options'&&request.method==='GET'){
   const source=await notion('data_sources/'+env.SCHOOL_DATA_SOURCE_ID);
   return reply({student:env.STUDENT||null,subjects:(source.properties?.['과목']?.multi_select?.options||[]).map(x=>x.name)});
  }
  if(path==='/tasks'&&request.method==='POST'){
   if(Number(request.headers.get('Content-Length')||0)>4096)return reply({error:'입력 내용이 너무 깁니다.'},413);
   const raw=await request.text();if(raw.length>4096)return reply({error:'입력 내용이 너무 깁니다.'},413);
   let input;try{input=JSON.parse(raw);}catch{return reply({error:'입력 형식이 올바르지 않습니다.'},400);}
   const {subject,due}=input||{},title=typeof input?.title==='string'?input.title.trim():'';
   if(!title||title.length>200||typeof subject!=='string'||typeof due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due+'T00:00:00Z'))||new Date(due+'T00:00:00Z').toISOString().slice(0,10)!==due)return reply({error:'과목·마감일·주제를 확인해 주세요.'},400);
   const source=await notion('data_sources/'+env.SCHOOL_DATA_SOURCE_ID);
   if(!(source.properties?.['과목']?.multi_select?.options||[]).some(x=>x.name===subject))return reply({error:'현재 노션에 있는 과목을 선택해 주세요.'},400);
   const page=await notion('pages','POST',{parent:{type:'data_source_id',data_source_id:env.SCHOOL_DATA_SOURCE_ID},properties:{'주제':{title:[{text:{content:title}}]},'과목':{multi_select:[{name:subject}]},'기한':{date:{start:due}},'상태':{status:{name:'시작전'}}}});
   return reply({ok:true,id:page.id,url:page.url},201);
  }
  if(path==='/tasks'&&request.method==='GET'){
   const subjectColors=await rpSubjectColors(env);
   const pages=[];let cursor;do{const data=await notion(`data_sources/${env.SCHOOL_DATA_SOURCE_ID}/query`,'POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});pages.push(...data.results);cursor=data.has_more?data.next_cursor:null;}while(cursor);
   const items=pages.filter(p=>p.object==='page'&&!p.in_trash&&!p.archived).map(p=>{const a=p.properties;return {id:p.id,title:(a['주제']?.title||[]).map(x=>x.plain_text??x.text?.content??'').join('')||'제목 없음',subjects:(a['과목']?.multi_select||[]).map(x=>x.name),subjectColors:Object.fromEntries((a['과목']?.multi_select||[]).map(x=>[x.name,subjectColors[x.name]||x.color||'default'])),due:a['기한']?.date?.start||null,status:a['상태']?.status?.name||'',completedAt:a['완료일']?.date?.start||null,submission:a['제출처']?.select?.name||'',taskName:(a['과제명']?.rich_text||[]).map(x=>x.plain_text??x.text?.content??'').join(''),url:p.url};});return reply({student:env.STUDENT||null,items:items.filter(x=>['시작전','진행 중','진행 2차','작성 완료','봉사완료','완료'].includes(x.status)&&(!['완료','봉사완료'].includes(x.status)||Date.parse(x.completedAt)>=Date.now()-7*86400000))});
  }
  const statusMatch=path.match(/^\/tasks\/([a-f0-9-]{32,36})\/status$/i);
  if(statusMatch&&request.method==='PATCH'){
   const raw=await request.text();if(raw.length>1000)return reply({error:'요청이 너무 깁니다.'},413);
   let input;try{input=JSON.parse(raw);}catch{return reply({error:'변경 내용을 확인해 주세요.'},400);}
   if(!['시작전','진행 중','완료'].includes(input.status)||typeof input.from!=='string')return reply({error:'변경할 상태를 확인해 주세요.'},400);
   const page=await notion('pages/'+statusMatch[1]);
   if(page.archived||page.in_trash||page.parent?.type!=='data_source_id'||normalized(page.parent.data_source_id)!==normalized(env.SCHOOL_DATA_SOURCE_ID))return reply({error:'이 일정표에 속한 항목이 아닙니다.'},403);
   const current=page.properties?.['상태']?.status?.name||'';
   if(current!==input.from)return reply({error:'노션에서 상태가 변경됐어요. 새로고침 후 다시 선택해 주세요.'},409);
   const source=await notion('data_sources/'+env.SCHOOL_DATA_SOURCE_ID);
   if(!source.properties?.['완료일'])await notion('data_sources/'+env.SCHOOL_DATA_SOURCE_ID,'PATCH',{properties:{'완료일':{date:{}}}});
   else if(source.properties['완료일'].type!=='date')return reply({error:'노션의 완료일 속성을 날짜 형식으로 설정해 주세요.'},409);
   const completedAt=input.status==='완료'?new Date().toISOString():null;
   await notion('pages/'+statusMatch[1],'PATCH',{properties:{'상태':{status:{name:input.status}},'완료일':{date:completedAt?{start:completedAt}:null}}});return reply({ok:true,status:input.status,completedAt});
  }
  const match=path.match(/^\/tasks\/([a-f0-9-]{32,36})\/complete$/i);
  if(match&&request.method==='PATCH'){
   const page=await notion('pages/'+match[1]);
   if(page.archived||page.in_trash||page.parent?.type!=='data_source_id'||normalized(page.parent.data_source_id)!==normalized(env.SCHOOL_DATA_SOURCE_ID))return reply({error:'이 일정표에 속한 항목이 아닙니다.'},403);
   await notion('pages/'+match[1],'PATCH',{properties:{'상태':{status:{name:'완료'}}}});return reply({ok:true});
  }
  return reply({error:'요청을 찾지 못했습니다.'},404);
 }catch{return reply({error:'노션 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'},502);}
}
export default {scheduled(event,env,ctx){ctx.waitUntil(rpScheduled(env));},fetch:rpFetch};

/** One serialized device registry per student; no global KV list/count race. */
export class StudentWidgetDevices {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  return this.ctx.blockConcurrencyWhile(async()=>{
   const input=await request.json();
   if(input.action==='rate'||input.action==='rate-failure'){
    const minute=Math.floor(Date.now()/60000);let rate=await this.ctx.storage.get('rate');
    if(!rate||rate.minute!==minute)rate={minute,count:0};
    if(input.action==='rate-failure'){rate.count++;await this.ctx.storage.put('rate',rate);}
    return Response.json({ok:rate.count<20},{status:rate.count<20?200:429});
   }
   if(input.action==='designs'){
    const last=await this.ctx.storage.get('designs');
    if(last&&Date.now()-last.at<30000)return Response.json(last.data);
    try{const data=await rpReadWidgetDesigns(this.env);const next={at:Date.now(),data};await this.ctx.storage.put('designs',next);return Response.json(data);}
    catch(e){if(last)return Response.json({...last.data,stale:true});return Response.json({error:'노션 디자인 DB에 서버용 연결을 추가해 주세요.'},{status:503});}
   }
   const page=await rpNotion(this.env,'pages/'+input.studentId),p=page.properties||{};
   if(page.archived||page.in_trash||normalized(page.parent?.data_source_id)!==normalized(this.env.STUDENT_REGISTRY_ID||RP_STUDENTS)||!p['연결 활성화']?.checkbox)return Response.json({ok:false,error:'학생 연결이 중지됐어요.'},{status:401});
   const codeHash=await rpHash(rpText(p['연결코드']?.rich_text));
   if(!await same(codeHash,input.codeHash||''))return Response.json({ok:false,error:'학생 연결코드가 변경됐어요.'},{status:401});
   let s=await this.ctx.storage.get('registry')||{devices:[],blocked:0,revokedAt:0};
   const beforeState=JSON.stringify(s);
   const now=Date.now(),raw=p['허용 기기 수']?.number,limit=raw==null?3:raw;
   if(!Number.isInteger(limit)||limit<0||limit>100)return Response.json({ok:false,error:'허용 기기 수를 0~100의 정수로 설정해 주세요.'},{status:503});
   if(!s.imported){
    for(const key of await rpList(this.env.RIVER_KV,'widget-device:')){
     const d=await rpJson(this.env.RIVER_KV,key.name);
     if(d?.studentId===page.id&&d.codeHash===codeHash&&d.createdAt+90*86400000>now)s.devices.push({...d,label:d.label||'기존 Android 위젯',expiresAt:d.expiresAt||d.createdAt+90*86400000});
    }
    s.devices=[...new Map(s.devices.map(d=>[d.id,d])).values()];s.imported=true;
   }
   if(s.codeHash&&s.codeHash!==codeHash){s.devices=[];s.revokedAt=now;}
   s.codeHash=codeHash;s.devices=s.devices.filter(d=>d.expiresAt>now);
   let reset=false;
   if(p['위젯 연결 모두 해제']?.checkbox){s.devices=[];s.revokedAt=now;reset=true;}
   // Raising the limit resolves the alert; the blocked installation must retry.
   if(s.blockedAt&&limit>s.blockedLimit&&s.devices.length<limit)s.blockedAt=0;
   const found=s.devices.find(d=>d.id===input.id);
   let result={ok:true},status=200;
   if(reset){result={ok:false,error:'관리자가 위젯 연결을 해제했어요. 다시 연결해 주세요.'};status=401;}
   else if(input.action==='web'){
    if(!input.reconnect&&s.revokedAt&&String(input.id)!==String(s.revokedAt)){result={ok:false,error:'관리자가 연결을 해제했어요. 학생코드를 다시 입력해 주세요.'};status=401;}
   }
   else if(input.action==='pair'){
    if(!found){
     if(s.devices.length>=limit){s.blocked++;s.blockedAt=now;s.blockedLimit=limit;result={ok:false,error:'허용된 위젯 기기 수('+limit+'대)를 초과했어요. 관리자에게 문의해 주세요.',code:'WIDGET_DEVICE_LIMIT'};status=409;}
     else{
      const device={id:input.id,scope:'widget:read',studentId:page.id,codeHash,createdAt:now,expiresAt:now+90*86400000,managed:true,label:String(input.label||'Android 위젯').slice(0,80)};
      await this.env.RIVER_KV.put('widget-device:'+device.id,JSON.stringify(device),{expirationTtl:90*86400});
      s.devices.push(device);
     }
    }
   }else if(input.action==='disconnect'){s.devices=s.devices.filter(d=>d.id!==input.id);await this.env.RIVER_KV.delete('widget-device:'+input.id);}
   else if(input.action==='feed'){
    if(!found){
     // Only pre-management tokens may be adopted. Revoked tokens never re-admit.
     const legacy=input.legacy;
     if(legacy&&!legacy.managed&&legacy.createdAt>s.revokedAt&&legacy.codeHash===codeHash&&legacy.studentId===page.id){
      s.devices.push({...legacy,label:legacy.label||'기존 Android 위젯',expiresAt:legacy.expiresAt||legacy.createdAt+90*86400000});
     }else{result={ok:false,error:'해제된 위젯 연결이에요. 다시 연결해 주세요.'};status=401;}
    }
   }else return Response.json({error:'지원하지 않는 관리 요청입니다.'},{status:400});
   const warning=!!s.blockedAt||s.devices.length>limit;
   const properties={
    '연결 기기 수':{number:s.devices.length},
    '연결 상태':{select:{name:warning?'허용치 초과':'정상'}},
    '초과 시도 수':{number:s.blocked},
    '최근 초과 일시':{date:s.lastBlockedAt||s.blockedAt?{start:new Date(s.blockedAt||s.lastBlockedAt).toISOString()}:null},
    '연결 기기 목록':{rich_text:s.devices.map(d=>({text:{content:(d.label||'Android 위젯')+' · '+d.id.slice(-8)+' · '+new Date(d.createdAt).toISOString().slice(0,10)+'\n'}}))}
   };
   if(s.blockedAt)s.lastBlockedAt=s.blockedAt;
   if(reset)properties['위젯 연결 모두 해제']={checkbox:false};
   const signature=JSON.stringify(properties);
   // Persist the admission decision even when Notion telemetry temporarily fails.
   if(JSON.stringify(s)!==beforeState)await this.ctx.storage.put('registry',s);
   if(s.signature!==signature){
    try{await rpNotion(this.env,'pages/'+page.id,'PATCH',{properties});s.signature=signature;await this.ctx.storage.put('registry',s);}catch{result.managementPending=true;}
   }
   return Response.json({...result,count:s.devices.length,limit,webRevision:String(s.revokedAt||0)},{status});
  });
 }
}
async function rpWidgetGate(env,studentId,codeHash,action,id,extra={}){
 if(!env.STUDENT_WIDGETS)return {ok:false,status:503,error:'서버의 STUDENT_WIDGETS 연결 설정이 필요해요.'};
 const stub=env.STUDENT_WIDGETS.get(env.STUDENT_WIDGETS.idFromName(normalized(studentId)));
 const response=await stub.fetch('https://student-widget.internal/',{method:'POST',body:JSON.stringify({studentId,codeHash,action,id,...extra})});
 return {...await response.json(),status:response.status};
}

