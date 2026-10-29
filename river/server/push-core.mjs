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
async function rpNotion(env,path,method='GET',body){const r=await fetch('https://api.notion.com/v1/'+path,{method,headers:{Authorization:'Bearer '+env.NOTION_TOKEN,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('노션 연결을 확인해 주세요.');return r.json();}
async function rpPages(env,ds){const pages=[];let cursor;do{const r=await rpNotion(env,'data_sources/'+ds+'/query','POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});pages.push(...r.results.filter(p=>!p.archived&&!p.in_trash));cursor=r.has_more?r.next_cursor:null;}while(cursor);return pages;}
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
  throw rpPushError('PUSH_HTTP_'+r.status,message);
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
  if(path==='/push/ack'&&request.method==='POST'){const raw=await request.text();if(raw.length>2000)return reply({error:'요청이 너무 깁니다.'},413);const body=JSON.parse(raw);if(!Array.isArray(body.ids)||body.ids.length>20||body.ids.some(x=>typeof x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(x)))return reply({error:'잘못된 요청입니다.'},400);for(const id of body.ids)await kv.delete('notice:'+device.id+':'+id);return reply({ok:true});}
  return reply({error:'지원하지 않는 요청입니다.'},405);
 }
 const auth=request.headers.get('Authorization')||'';if(!env.RIVER_ACCESS_KEY||!auth.startsWith('Bearer ')||!await same(auth.slice(7),env.RIVER_ACCESS_KEY))return reply({error:'사이트 접근 암호를 확인해 주세요.'},401);
 let keys=await rpPushStage('PUSH_STORAGE','알림 저장소의 인증 키를 읽지 못했어요.',()=>rpJson(kv,'vapid:v1'));
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
 const state=await rpDeliver(env,record,{id:crypto.randomUUID(),type:'test',at:now,until:now+10*60000,title:'CHOI RIVER · 알림 테스트',body:'강아, 알림이 잘 도착했어! 수업과 과제도 함께 챙겨보자.',url:'/river/?settings=notifications'},keys);try{await kv.put('test:'+id,'1',{expirationTtl:60});}catch{}return reply({ok:state==='accepted',state});
}
async function rpScheduled(env){
 const kv=env.RIVER_KV;if(!kv)return;const started=Date.now();try{const keys=await rpJson(kv,'vapid:v1'),listed=await rpList(kv,'device:');if(!keys||!listed.length){await kv.put('cron:last',JSON.stringify({at:started,state:'waiting',accepted:0}));return;}
 const devices=(await Promise.all(listed.map(k=>rpJson(kv,k.name)))).filter(Boolean),[school,academy]=await Promise.all([rpPages(env,env.SCHOOL_DATA_SOURCE_ID),rpPages(env,env.ACADEMY_DATA_SOURCE_ID||'3fd215b9-b774-806e-9ed3-000b1b1df0f9')]);const jobs=rpJobs(school,academy,started);let accepted=0;
 for(const device of devices)for(const job of jobs){if(job.at<device.enabledAt)continue;try{if(await rpDeliver(env,device,job,keys)==='accepted')accepted++;}catch{await kv.put('cron:last-error',JSON.stringify({at:Date.now(),error:'푸시 전송 실패'}),{expirationTtl:86400});}}
 await kv.put('cron:last',JSON.stringify({at:started,state:'ran',accepted}));
 }catch{await kv.put('cron:last',JSON.stringify({at:started,state:'error',error:'노션 또는 알림 서버 연결을 확인해 주세요.'}));}
}

