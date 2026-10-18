// Empty Web Push wakes the service worker; content is fetched over authenticated HTTPS.
const rpEnc=new TextEncoder();
function rpB64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function rpDecode(value){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function rpHash(value){return rpB64(await crypto.subtle.digest('SHA-256',rpEnc.encode(value)));}
async function rpJson(kv,key){const value=await kv.get(key);return value?JSON.parse(value):null;}
async function rpList(kv,prefix){const keys=[];let cursor;do{const r=await kv.list({prefix,limit:100,...(cursor?{cursor}:{})});keys.push(...r.keys);cursor=r.list_complete?null:r.cursor;if(keys.length>2000)throw Error('저장 항목이 너무 많습니다.');}while(cursor);return keys;}
async function rpNotion(env,path,method='GET',body){const r=await fetch('https://api.notion.com/v1/'+path,{method,headers:{Authorization:'Bearer '+env.NOTION_TOKEN,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('노션 연결을 확인해 주세요.');return r.json();}
async function rpPages(env,ds){const pages=[];let cursor;do{const r=await rpNotion(env,'data_sources/'+ds+'/query','POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});pages.push(...r.results.filter(p=>!p.archived&&!p.in_trash));cursor=r.has_more?r.next_cursor:null;}while(cursor);return pages;}
function rpJobs(school,academy,now){
 const jobs=[],day=86400000,text=a=>(a||[]).map(x=>x.plain_text??x.text?.content??'').join('');
 const add=(p,type,start,at,title,body,slot,until)=>{if(!Number.isFinite(at)||at>now||now-at>10*60000||at<Date.parse(p.created_time||0)||now>=until)return;jobs.push({id:p.id+':'+start+':'+slot,page:p.id,type,start,at,until,title,body,url:type==='academy'?'/river/academy.html':'/river/'});};
 for(const p of school){const a=p.properties,status=a['상태']?.status?.name,due=a['기한']?.date?.start;if(['완료','봉사완료'].includes(status)||!due)continue;const key=due.slice(0,10),mid=Date.parse(key+'T00:00:00+09:00');if(!Number.isFinite(mid))continue;for(const d of [7,2,1]){const at=mid-d*day+20*3600000;add(p,'school',due,at,(a['과목']?.multi_select||[]).map(x=>x.name).join(' · ')+' · D-'+d,text(a['주제']?.title)+(d===7?' — 이번 주말에 꼭 준비해 둬!':d===2?' — 이틀 남았어. 남은 부분을 준비하자.':' — 내일 마감이야. 제출할 것을 확인하자.'),'d'+d,Math.min(at+3600000,mid+day));}}
 for(const p of academy){const a=p.properties,start=a['수업일시']?.date?.start,status=a['출결']?.select?.name||'예정';if(status!=='예정'||!start||!start.includes('T'))continue;const n=Date.parse(start);if(!Number.isFinite(n))continue;const local=new Date(n+9*3600000).toISOString().slice(0,10),kind=a['학원']?.select?.name||'학원',label=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(n));const before=Date.parse(local+'T20:00:00+09:00')-day;add(p,'academy',start,before,kind+' · 내일 수업',label+' 수업이 있어. 미리 준비해 두자.','eve',Math.min(before+3600000,n));add(p,'academy',start,n-3600000,kind+' · 1시간 뒤 수업',label+' 수업이야. 준비하고 출발하자.','hour',n);}
 return jobs;
}
function rpEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&value.length<3000&&((u.hostname==='fcm.googleapis.com'&&/^\/(fcm\/send|wp)\//.test(u.pathname))||(u.hostname==='updates.push.services.mozilla.com'&&u.pathname.startsWith('/wpush/')));}catch{return false;}}
async function rpWake(record,keys,topic){if(!rpEndpoint(record.endpoint))throw Error('지원하지 않는 푸시 주소입니다.');const aud=new URL(record.endpoint).origin,h=rpB64(rpEnc.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),p=rpB64(rpEnc.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+3600,sub:'https://www.marihome.co.kr/river/'})));const key=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);const sig=rpB64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,rpEnc.encode(h+'.'+p)));return fetch(record.endpoint,{method:'POST',redirect:'error',headers:{Authorization:'vapid t='+h+'.'+p+'.'+sig+', k='+keys.publicKey,TTL:'600',Urgency:'high',Topic:topic},signal:AbortSignal.timeout(12000)});}
async function rpDeliver(env,record,job,keys){const kv=env.RIVER_KV,id=await rpHash(job.id),sent='sent:'+record.id+':'+id;if(await kv.get(sent))return 'skipped';await kv.put('notice:'+record.id+':'+id,JSON.stringify({...job,id}),{expirationTtl:3600});const r=await rpWake(record,keys,id.slice(0,32));if(r.status===404||r.status===410){await kv.delete('device:'+record.id);return 'expired';}if(!r.ok)throw Error('푸시 서비스 전송 실패 ('+r.status+')');await kv.put(sent,'1',{expirationTtl:32*86400});return 'accepted';}
async function rpDevice(request,env){const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return rpJson(env.RIVER_KV,'device:'+await rpHash(token));}
async function rpCurrent(env,job){if(job.type==='test')return true;const p=await rpNotion(env,'pages/'+job.page);if(p.archived||p.in_trash)return false;const ds=job.type==='academy'?(env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9'):env.SCHOOL_DATA_SOURCE_ID;if(p.parent?.type!=='data_source_id'||p.parent.data_source_id.replaceAll('-','')!==ds.replaceAll('-',''))return false;const a=p.properties;if(job.type==='academy')return (a['출결']?.select?.name||'예정')==='예정'&&a['수업일시']?.date?.start===job.start;return !['완료','봉사완료'].includes(a['상태']?.status?.name)&&a['기한']?.date?.start===job.start;}
async function rpPushRoute(request,env,reply){
 const path=new URL(request.url).pathname,kv=env.RIVER_KV;if(!kv)return reply({error:'Cloudflare에 RIVER_KV 바인딩을 연결해 주세요.'},503);
 if(path==='/push/inbox'||path==='/push/ack'){
  const device=await rpDevice(request,env);if(!device)return reply({error:'기기 알림 연결을 다시 설정해 주세요.'},401);
  if(path==='/push/inbox'&&request.method==='GET'){const keys=await rpList(kv,'notice:'+device.id+':'),items=[];for(const k of keys.slice(-20)){const j=await rpJson(kv,k.name);if(j&&Date.now()<j.until&&await rpCurrent(env,j))items.push(j);}return reply({items});}
  if(path==='/push/ack'&&request.method==='POST'){const raw=await request.text();if(raw.length>2000)return reply({error:'요청이 너무 깁니다.'},413);const body=JSON.parse(raw);if(!Array.isArray(body.ids)||body.ids.length>20||body.ids.some(x=>typeof x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(x)))return reply({error:'잘못된 요청입니다.'},400);for(const id of body.ids)await kv.delete('notice:'+device.id+':'+id);return reply({ok:true});}
  return reply({error:'지원하지 않는 요청입니다.'},405);
 }
 const auth=request.headers.get('Authorization')||'';if(!env.RIVER_ACCESS_KEY||!auth.startsWith('Bearer ')||!await same(auth.slice(7),env.RIVER_ACCESS_KEY))return reply({error:'사이트 접근 암호를 확인해 주세요.'},401);
 let keys=await rpJson(kv,'vapid:v1');
 if(path==='/push/config'&&request.method==='GET')return reply({ready:!!keys,publicKey:keys?.publicKey||null,lastRun:await rpJson(kv,'cron:last')});
 if(path==='/push/setup'&&request.method==='POST'){
  if(!keys){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);keys={publicKey:rpB64(await crypto.subtle.exportKey('raw',pair.publicKey)),privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey)};await kv.put('vapid:v1',JSON.stringify(keys));}
  return reply({ok:true,publicKey:keys.publicKey});
 }
 if(!keys)return reply({error:'먼저 알림 서버 준비 버튼을 눌러 주세요.'},503);
 if(!['/push/subscribe','/push/unsubscribe','/push/test'].includes(path)||request.method!=='POST')return reply({error:'요청을 찾지 못했습니다.'},404);
 const raw=await request.text();if(raw.length>7000)return reply({error:'요청이 너무 깁니다.'},413);const body=JSON.parse(raw);if(!/^[A-Za-z0-9_-]{43}$/.test(body.deviceToken||''))return reply({error:'기기 연결값이 올바르지 않아요.'},400);const id=await rpHash(body.deviceToken);
 if(path==='/push/subscribe'){
  if(!rpEndpoint(body.endpoint)||body.publicKey!==keys.publicKey)return reply({error:'지원하지 않는 기기이거나 알림 키가 변경됐어요. 다시 연결해 주세요.'},400);
  const all=await rpList(kv,'device:');if(!all.some(x=>x.name==='device:'+id)&&all.length>=10)return reply({error:'알림 기기는 최대 10대까지 연결할 수 있어요.'},400);
  await kv.put('device:'+id,JSON.stringify({id,endpoint:body.endpoint,enabledAt:Date.now()}));return reply({ok:true});
 }
 if(path==='/push/unsubscribe'){await kv.delete('device:'+id);return reply({ok:true});}
 const record=await rpJson(kv,'device:'+id);if(!record)return reply({error:'이 기기의 알림 받기를 먼저 켜 주세요.'},400);
 const now=Date.now();if(await kv.get('test:'+id))return reply({error:'테스트는 1분 뒤에 다시 할 수 있어요.'},429);
 const state=await rpDeliver(env,record,{id:crypto.randomUUID(),type:'test',at:now,until:now+10*60000,title:'CHOI RIVER · 알림 테스트',body:'강아, 알림이 잘 도착했어! 수업과 과제도 함께 챙겨보자.',url:'/river/notifications.html'},keys);await kv.put('test:'+id,'1',{expirationTtl:60});return reply({ok:state==='accepted',state});
}
async function rpScheduled(env){
 const kv=env.RIVER_KV;if(!kv)return;const started=Date.now();try{const keys=await rpJson(kv,'vapid:v1'),listed=await rpList(kv,'device:');if(!keys||!listed.length){await kv.put('cron:last',JSON.stringify({at:started,state:'waiting',accepted:0}));return;}
 const devices=(await Promise.all(listed.map(k=>rpJson(kv,k.name)))).filter(Boolean),[school,academy]=await Promise.all([rpPages(env,env.SCHOOL_DATA_SOURCE_ID),rpPages(env,env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9')]);const jobs=rpJobs(school,academy,started);let accepted=0;
 for(const device of devices)for(const job of jobs){if(job.at<device.enabledAt)continue;try{if(await rpDeliver(env,device,job,keys)==='accepted')accepted++;}catch{await kv.put('cron:last-error',JSON.stringify({at:Date.now(),error:'푸시 전송 실패'}),{expirationTtl:86400});}}
 await kv.put('cron:last',JSON.stringify({at:started,state:'ran',accepted}));
 }catch{await kv.put('cron:last',JSON.stringify({at:started,state:'error',error:'노션 또는 알림 서버 연결을 확인해 주세요.'}));}
}

// Deploy separately as a Cloudflare Worker. Secrets must be set in the server dashboard.
const normalized=id=>(id||'').replaceAll('-','');
async function same(a,b){const enc=new TextEncoder();const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(x)));const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
export default {async scheduled(event,env,ctx){ctx.waitUntil(rpScheduled(env));},async fetch(request,env){
 const origin=request.headers.get('Origin'), allowed=env.ALLOWED_ORIGIN||'https://www.marihome.co.kr';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&origin!==allowed)return reply({error:'허용되지 않은 주소입니다.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(new URL(request.url).pathname.startsWith('/push/')){try{return await rpPushRoute(request,env,reply);}catch{return reply({error:'알림 서버 요청에 실패했어요. 설정을 확인해 주세요.'},502);}}
 if(!env.NOTION_TOKEN||!env.RIVER_ACCESS_KEY||!env.SCHOOL_DATA_SOURCE_ID)return reply({error:'노션 연결 설정이 완료되지 않았습니다.'},503);
 const auth=request.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer ')||!await same(auth.slice(7),env.RIVER_ACCESS_KEY))return reply({error:'접근 암호를 확인해 주세요.'},401);
 async function notion(path,method='GET',body){const r=await fetch('https://api.notion.com/v1/'+path,{method,headers:{Authorization:'Bearer '+env.NOTION_TOKEN,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('노션 요청 실패');return r.json();}
 try{const path=new URL(request.url).pathname;

  // Academy lessons: each Notion page represents one lesson.
  if(path==='/academy'||path.startsWith('/academy/')){
   const ds=env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9';
   const rt=value=>(value||[]).map(x=>x.plain_text??x.text?.content??'').join('');
   const rich=value=>Array.from({length:Math.ceil(value.length/1900)},(_,i)=>({text:{content:value.slice(i*1900,(i+1)*1900)}}));
   const lesson=p=>{const a=p.properties;return {id:p.id,title:rt(a['수업명']?.title),kind:a['학원']?.select?.name||'',start:a['수업일시']?.date?.start||null,status:a['출결']?.select?.name||'예정',charge:!!a['회차 차감']?.checkbox,history:rt(a['변경 이력']?.rich_text),note:rt(a['메모']?.rich_text),updated:p.last_edited_time,url:p.url};};
   const validStart=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+09:00$/.test(s))return false;const n=Date.parse(s);return Number.isFinite(n)&&new Date(n+9*3600000).toISOString().slice(0,19)===s.slice(0,19);};
   if(path==='/academy'&&request.method==='GET'){
    const pages=[];let cursor;do{const d=await notion('data_sources/'+ds+'/query','POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});pages.push(...d.results);cursor=d.has_more?d.next_cursor:null;}while(cursor);
    return reply({items:pages.filter(p=>p.object==='page'&&!p.in_trash&&!p.archived).map(lesson)});
   }
   if(request.method!=='POST'&&request.method!=='PATCH')return reply({error:'지원하지 않는 요청입니다.'},405);
   const raw=await request.text();if(raw.length>12000)return reply({error:'입력 내용이 너무 깁니다.'},413);
   let input;try{input=JSON.parse(raw);}catch{return reply({error:'입력 형식을 확인해 주세요.'},400);}
   if(path==='/academy'&&request.method==='POST'){
    if(!['운동','과학'].includes(input.kind)||!validStart(input.start)||typeof input.note!=='string'||input.note.length>1000)return reply({error:'학원·날짜·시간을 확인해 주세요.'},400);
    const p=await notion('pages','POST',{parent:{type:'data_source_id',data_source_id:ds},properties:{'수업명':{title:[{text:{content:input.kind+' 수업'}}]},'학원':{select:{name:input.kind}},'수업일시':{date:{start:input.start}},'출결':{select:{name:'예정'}},'메모':{rich_text:rich(input.note)}}});
    return reply({ok:true,item:lesson(p)},201);
   }
   const m=path.match(/^\/academy\/([a-f0-9-]{32,36})$/i);
   if(!m||request.method!=='PATCH')return reply({error:'요청을 찾지 못했습니다.'},404);
   const p=await notion('pages/'+m[1]);
   if(p.archived||p.in_trash||p.parent?.type!=='data_source_id'||normalized(p.parent.data_source_id)!==normalized(ds))return reply({error:'학원 DB에 속한 수업이 아닙니다.'},403);
   if(!input.updated||input.updated!==p.last_edited_time)return reply({error:'다른 곳에서 변경된 수업입니다. 새로고침 후 다시 시도해 주세요.'},409);
   const old=lesson(p),props={};let entry='';
   if(input.action==='reschedule'){
    if(!validStart(input.start))return reply({error:'새 날짜와 시간을 확인해 주세요.'},400);
    if(input.start===old.start)return reply({ok:true,item:old});
    props['변경 전 일시']={date:old.start?{start:old.start}:null};
    props['수업일시']={date:{start:input.start}};
    // Moving an attended/absent lesson resets it to scheduled, avoiding duplicate counts.
    props['출결']={select:{name:'예정'}};props['회차 차감']={checkbox:false};
    entry='일정 변경: '+(old.start||'미정')+' → '+input.start+' / 이전 출결 '+old.status;
   }else if(input.action==='attendance'){
    if(!['예정','출석','결석'].includes(input.status)||typeof input.charge!=='boolean')return reply({error:'출결을 확인해 주세요.'},400);
    props['출결']={select:{name:input.status}};props['회차 차감']={checkbox:input.status==='결석'&&input.charge};
    entry='출결 변경: '+old.status+' → '+input.status+(input.status==='결석'?(input.charge?' (회차 차감)':' (차감 없음)'):'');
   }else return reply({error:'변경 내용을 확인해 주세요.'},400);
   const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date());
   const history=(old.history?old.history+'\n':'')+stamp+' '+entry;
   if(history.length>40000)return reply({error:'변경 이력이 길어 저장할 수 없어요. 노션에서 이력을 별도로 보관해 주세요.'},400);
   props['변경 이력']={rich_text:rich(history)};
   const updated=await notion('pages/'+m[1],'PATCH',{properties:props});return reply({ok:true,item:lesson(updated)});
  }

  if(path==='/options'&&request.method==='GET'){
   const source=await notion('data_sources/'+env.SCHOOL_DATA_SOURCE_ID);
   return reply({subjects:(source.properties?.['과목']?.multi_select?.options||[]).map(x=>x.name)});
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
   const pages=[];let cursor;do{const data=await notion(`data_sources/${env.SCHOOL_DATA_SOURCE_ID}/query`,'POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});pages.push(...data.results);cursor=data.has_more?data.next_cursor:null;}while(cursor);
   const items=pages.filter(p=>p.object==='page'&&!p.in_trash&&!p.archived).map(p=>{const a=p.properties;return {id:p.id,title:(a['주제']?.title||[]).map(x=>x.plain_text??x.text?.content??'').join('')||'제목 없음',subjects:(a['과목']?.multi_select||[]).map(x=>x.name),due:a['기한']?.date?.start||null,status:a['상태']?.status?.name||'',completedAt:a['완료일']?.date?.start||null,submission:a['제출처']?.select?.name||'',taskName:(a['과제명']?.rich_text||[]).map(x=>x.plain_text??x.text?.content??'').join(''),url:p.url};});return reply({items:items.filter(x=>!['완료','봉사완료'].includes(x.status)||Date.parse(x.completedAt)>=Date.now()-7*86400000)});
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
}};

