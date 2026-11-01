import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from './worker.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ds='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const env={NOTION_TOKEN:'test',RIVER_ACCESS_KEY:'admin',SCHOOL_DATA_SOURCE_ID:'school',ACADEMY_DATA_SOURCE_ID:ds};
let p,writes=[],reads=0;
const prop=(name)=>({select:{name}});
function page(category='학원'){return {id,object:'page',parent:{type:'data_source_id',data_source_id:ds},last_edited_time:'v1',properties:{'일정명':{title:[{text:{content:'과학 수업'}}]},'과목·모임명':prop('과학'),'일정 분류':prop(category),'수업 구분':prop('수업'),'일정일시':{date:{start:'2026-11-01T18:00:00+09:00'}},'출결':prop('예정'),'회차 기준':{checkbox:true},'변경 이력':{rich_text:[]}}};}
globalThis.fetch=async(url,opts={})=>{reads++;const path=String(url).split('/v1/')[1];if(path==='data_sources/'+ds)return Response.json({id:ds,properties:{'일정명':{title:{}},'과목·모임명':{select:{options:[]}},'일정일시':{date:{}},'일정 분류':{select:{options:[]}}}});if(path==='pages'){const body=JSON.parse(opts.body);writes.push(body);return Response.json({...page('약속'),properties:body.properties});}assert.equal(path,'pages/'+id);if(opts.method==='PATCH'){const b=JSON.parse(opts.body);writes.push(b);Object.assign(p.properties,b.properties);}return Response.json(p);};
async function call(body,path='/academy/'+id,method='PATCH'){const r=await worker.fetch(new Request('https://api.test'+path,{method,headers:{Authorization:'Bearer admin'},body:JSON.stringify(body)}),env);assert.ok(r.ok,await r.clone().text());return (await r.json()).item;}
p=page();let x=await call({action:'reschedule',start:'2026-11-01T20:00:00+09:00',updated:'v1'});assert.deepEqual(Object.keys(writes[0].properties),['일정일시']);assert.equal(reads,2);assert.equal(x.start,'2026-11-01T20:00:00+09:00');assert.equal(x.title,'과학 수업');assert.equal(x.roundAnchor,true);assert.equal(x.originalStart,null);assert.equal(x.history,'');
p=page('교회');writes=[];await call({action:'reschedule',start:'2026-11-02T20:00:00+09:00',updated:'v1'});assert.deepEqual(Object.keys(writes[0].properties),['일정일시']);
writes=[];x=await call({kind:'친구',title:'저녁 약속',category:'약속',subtype:'수업',start:'2026-11-03T19:00:00+09:00',note:''},'/academy','POST');assert.equal(x.title,'저녁 약속');assert.equal(x.category,'약속');assert.equal(writes[0].properties['과목·모임명'].select.name,'친구');assert.equal(writes[0].properties['일정 분류'].select.name,'약속');assert.ok(!('수업명'in writes[0].properties));
p=page('약속');writes=[];x=await call({action:'attendance',status:'완료',charge:false,updated:'v1'});assert.equal(x.status,'완료');assert.equal(writes[0].properties['회차 차감'].checkbox,false);
console.log('PASS renamed schema read/write, same-day time-only two requests, personal title/category, no makeup for church, personal completion');
