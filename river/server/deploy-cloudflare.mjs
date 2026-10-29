// Owner-only GitHub Actions deployment. Never prints or uploads remote settings.
import {mkdtemp,writeFile,rm,appendFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const WORKER='choi-river-notion';
export const DEVICE_CLASS='StudentWidgetDevices';
const BINDING='STUDENT_WIDGETS';
function need(ok,message){if(!ok)throw Error(message);}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function deploymentConfig(settings,schedules,subdomain,main){
 need(Array.isArray(settings.bindings),'현재 바인딩 목록을 확인하지 못해 중단합니다.');
 need(/^\d{4}-\d{2}-\d{2}$/.test(settings.compatibility_date||''),'현재 호환 날짜를 확인하지 못해 중단합니다.');
 const names=new Set(),kv=[],objects=[];
 for(const b of settings.bindings){
  need(typeof b.name==='string'&&!names.has(b.name),'중복되거나 잘못된 바인딩 이름입니다.');names.add(b.name);
  if(b.type==='kv_namespace'){need(/^[a-f0-9]{32}$/i.test(b.namespace_id||''),'기존 KV ID가 잘못되어 중단합니다.');kv.push({binding:b.name,id:b.namespace_id});}
  else if(b.type==='durable_object_namespace'){
   need(b.name===BINDING&&b.class_name===DEVICE_CLASS&&(!b.script_name||b.script_name===WORKER),'다른 Durable Object가 있어 자동 배포를 중단합니다.');objects.push({name:BINDING,class_name:DEVICE_CLASS});
  }else need(['plain_text','json','secret_text'].includes(b.type),'지원하지 않는 기존 바인딩이 있어 보존 확인 후 배포해야 합니다.');
 }
 need(kv.some(b=>b.binding==='RIVER_KV'),'기존 RIVER_KV가 없어 중단합니다. 새 KV를 만들지 않습니다.');
 need(!names.has(BINDING)||objects.length===1,'STUDENT_WIDGETS 이름이 다른 용도로 사용되고 있습니다.');
 for(const name of ['NOTION_TOKEN','RIVER_ACCESS_KEY'])need(names.has(name),name+'가 없어 배포를 중단합니다.');
 need(Array.isArray(schedules)&&schedules.every(x=>typeof x.cron==='string'),'현재 예약 실행 설정을 확인하지 못했습니다.');
 need(typeof subdomain.enabled==='boolean','현재 workers.dev 설정을 확인하지 못했습니다.');
 // keep_vars preserves dashboard plaintext/JSON variables; Wrangler retains secrets.
 const config={name:WORKER,main,compatibility_date:settings.compatibility_date,compatibility_flags:settings.compatibility_flags||[],keep_vars:true,workers_dev:subdomain.enabled,kv_namespaces:kv,durable_objects:{bindings:[{name:BINDING,class_name:DEVICE_CLASS}]},migrations:[{tag:'student-widgets-v1',new_sqlite_classes:[DEVICE_CLASS]}],triggers:{crons:[]}};
 if(typeof subdomain.previews_enabled==='boolean')config.preview_urls=subdomain.previews_enabled;
 for(const key of ['observability','logpush','limits','tail_consumers'])if(settings[key]!=null)config[key]=settings[key];
 // The settings API returns {} for default placement; Wrangler requires mode if present.
 const placement=settings.placement;
 if(placement!=null){
  need(typeof placement==='object'&&!Array.isArray(placement),'placement 설정 형식을 확인해 주세요.');
  if(Object.keys(placement).length){
   need(['smart','off'].includes(placement.mode),'placement 모드를 확인하지 못해 배포를 중단합니다.');
   config.placement=placement;
  }
 }
 return config;
}

export function verifyPreserved(before,after){
 const current=new Map(after.bindings.map(b=>[b.name,b]));
 for(const old of before.bindings){
  const got=current.get(old.name);need(got&&got.type===old.type,'배포 후 기존 바인딩의 누락 또는 종류 변경을 확인했습니다.');
  for(const field of ['namespace_id','text','json'])if(Object.hasOwn(old,field))need(same(old[field],got[field]),'배포 후 기존 연결 또는 변수 변경을 확인했습니다.');
 }
 const device=current.get(BINDING);need(device?.type==='durable_object_namespace'&&device.class_name===DEVICE_CLASS&&device.namespace_id,'배포 후 기기 관리 저장소 연결을 확인하지 못했습니다.');
 need(after.compatibility_date===before.compatibility_date,'호환 날짜가 변경됐습니다.');
 need(same(after.compatibility_flags||[],before.compatibility_flags||[]),'호환 플래그가 변경됐습니다.');
}

async function run(){
 const mode=process.argv[2]||'check';need(['check','deploy'].includes(mode),'실행 모드는 check 또는 deploy여야 합니다.');
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
 need(/^[a-f0-9]{32}$/i.test(account||''),'GitHub Secret CLOUDFLARE_ACCOUNT_ID를 등록해 주세요.');
 need(typeof token==='string'&&token.length>10,'GitHub Secret CLOUDFLARE_API_TOKEN을 등록해 주세요.');
 const root='https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+WORKER;
 async function get(suffix){const r=await fetch(root+suffix,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});let data;try{data=await r.json();}catch{throw Error('Cloudflare 응답을 확인하지 못했습니다.');}need(r.ok&&data.success,'Cloudflare 설정 조회 실패(HTTP '+r.status+'). 계정 ID와 토큰 권한을 확인해 주세요.');return data.result;}
 const before=await get('/settings'),schedules=(await get('/schedules')).schedules,subdomain=await get('/subdomain');
 const here=dirname(fileURLToPath(import.meta.url));
 const config=deploymentConfig(before,schedules,subdomain,join(here,'worker.mjs'));
 const directory=await mkdtemp(join(tmpdir(),'river-cloudflare-'));
 const filename=join(directory,'wrangler.json');
 try{
  await writeFile(filename,JSON.stringify(config),{mode:0o600});
  const latest=await get('/settings');need(digest(before)===digest(latest),'점검 중 서버 설정이 바뀌어 중단합니다. 다시 실행해 주세요.');
  const executable=process.env.WRANGLER_BIN;need(executable,'Wrangler 실행 경로가 없습니다. GitHub Actions에서 실행해 주세요.');
  const output=spawnSync(executable,['deploy','--config',filename,'--keep-vars',...(mode==='check'?['--dry-run']:[])],{encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});
  let log=(output.stdout||'')+(output.stderr||'');
  // Remote plaintext variables may contain credentials: redact values before output.
  for(const b of before.bindings){for(const value of [b.text,b.json&&JSON.stringify(b.json)])if(typeof value==='string'&&value.length>2)log=log.split(value).join('[REDACTED]');}
  log=log.split(token).join('[REDACTED]');console.log(log);
  need(!output.error&&output.status===0,'배포 도구 실행에 실패했습니다. 위 로그를 확인해 주세요.');
  if(mode==='deploy'){
   const after=await get('/settings');verifyPreserved(before,after);
   const nextSchedules=(await get('/schedules')).schedules;need(nextSchedules.length===0,'사용하지 않는 알림 예약이 남아 있습니다.');
   const nextSubdomain=await get('/subdomain');need(nextSubdomain.enabled===subdomain.enabled,'기존 workers.dev 설정이 달라졌습니다.');
  }
  const summary=mode==='deploy'?'서버 배포 및 STUDENT_WIDGETS 생성·연결 확인 완료. 기존 KV·변수·Secret 이름 보존·알림 예약 중지 확인. 다음 단계: 휴대폰 위젯 새로고침 후 노션 기기 수 확인.':'설정 보존 점검 및 빌드 점검 완료. 실제 서버는 변경하지 않았습니다. 다음 단계: Run workflow에서 deploy 선택.';
  console.log(summary);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'## CHOI RIVER 서버\n\n'+summary+'\n');
 }finally{await rm(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))run().catch(e=>{console.error(e.message);process.exitCode=1;});

