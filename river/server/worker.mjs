// Deploy separately as a Cloudflare Worker. Secrets must be set in the server dashboard.
const normalized=id=>(id||'').replaceAll('-','');
async function same(a,b){const enc=new TextEncoder();const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(x)));const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin'), allowed=env.ALLOWED_ORIGIN||'https://www.marihome.co.kr';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Methods':'GET, PATCH, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&origin!==allowed)return reply({error:'허용되지 않은 주소입니다.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!env.NOTION_TOKEN||!env.RIVER_ACCESS_KEY||!env.SCHOOL_DATA_SOURCE_ID)return reply({error:'노션 연결 설정이 완료되지 않았습니다.'},503);
 const auth=request.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer ')||!await same(auth.slice(7),env.RIVER_ACCESS_KEY))return reply({error:'접근 암호를 확인해 주세요.'},401);
 async function notion(path,method='GET',body){const r=await fetch('https://api.notion.com/v1/'+path,{method,headers:{Authorization:'Bearer '+env.NOTION_TOKEN,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('노션 요청 실패');return r.json();}
 try{const path=new URL(request.url).pathname;
  if(path==='/tasks'&&request.method==='GET'){
   const pages=[];let cursor;do{const data=await notion(`data_sources/${env.SCHOOL_DATA_SOURCE_ID}/query`,'POST',{page_size:100,filter:{and:[{property:'상태',status:{does_not_equal:'완료'}},{property:'상태',status:{does_not_equal:'봉사완료'}}]},...(cursor?{start_cursor:cursor}:{})});pages.push(...data.results);cursor=data.has_more?data.next_cursor:null;}while(cursor);
   const items=pages.filter(p=>p.object==='page'&&!p.in_trash&&!p.archived).map(p=>{const a=p.properties;return {id:p.id,title:(a['주제']?.title||[]).map(x=>x.plain_text??x.text?.content??'').join('')||'제목 없음',subjects:(a['과목']?.multi_select||[]).map(x=>x.name),due:a['기한']?.date?.start||null,status:a['상태']?.status?.name||'',url:p.url};});return reply({items});
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
