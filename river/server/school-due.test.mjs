import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from './worker.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ds='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
let page,writes=[],creates=0;
const make=()=>({id,object:'page',parent:{type:'data_source_id',data_source_id:ds},properties:{'주제':{title:[{plain_text:'보고서'}]},'과목':{multi_select:[{name:'과학'}]},'상태':{status:{name:'진행 중'}},'완료일':{date:null},'기한':{date:{start:'2026-11-05',end:null,time_zone:null}}}});
globalThis.fetch=async(url,options={})=>{
 const path=String(url).split('/v1/')[1];
 if(path==='pages'&&options.method==='POST'){creates++;throw Error('Must not create a copy');}
 assert.equal(path,'pages/'+id);
 if(options.method==='PATCH'){const body=JSON.parse(options.body);writes.push(body);Object.assign(page.properties,body.properties);}
 return Response.json(page);
};
const env={NOTION_TOKEN:'test',RIVER_ACCESS_KEY:'test-admin',SCHOOL_DATA_SOURCE_ID:ds};
const call=(body,auth='test-admin')=>worker.fetch(new Request('https://test.invalid/tasks/'+id+'/due',{method:'PATCH',headers:{Authorization:'Bearer '+auth},body:typeof body==='string'?body:JSON.stringify(body)}),env);
page=make();const before=structuredClone(page.properties);let r=await call({due:'2026-11-07',from:'2026-11-05',title:'ignored',status:'완료'});assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,id,due:'2026-11-07'});assert.equal(creates,0);assert.equal(writes.length,1);assert.deepEqual(Object.keys(writes[0].properties),['기한']);for(const key of ['주제','과목','상태','완료일'])assert.deepEqual(page.properties[key],before[key]);
writes=[];r=await call({due:'2026-11-09',from:'2026-11-05'});assert.equal(r.status,409);assert.equal(writes.length,0);
r=await call({due:'2026-11-07',from:'2026-11-07'});assert.equal(r.status,200);assert.equal((await r.json()).unchanged,true);assert.equal(writes.length,0);
for(const due of ['',null,'bad','2026-02-30','2026-13-01','2026-11-07T18:00:00+09:00']){r=await call({due,from:'2026-11-07'});assert.equal(r.status,400);}
for(const body of ['null','[]','{','"bad"',JSON.stringify({due:'2026-11-07'})]){r=await call(body);assert.equal(r.status,400);}
r=await call('x'.repeat(1001));assert.equal(r.status,413);assert.equal(writes.length,0);
page=make();page.parent.data_source_id='cccccccc-cccc-cccc-cccc-cccccccccccc';r=await call({due:'2026-11-07',from:'2026-11-05'});assert.equal(r.status,403);assert.equal(writes.length,0);
page=make();page.archived=true;r=await call({due:'2026-11-07',from:'2026-11-05'});assert.equal(r.status,403);
page=make();page.properties['기한'].date=null;r=await call({due:'2026-11-07',from:null});assert.equal(r.status,200);assert.equal(page.properties['기한'].date.start,'2026-11-07');
page=make();page.properties['기한'].date={start:'2026-11-05T18:00:00+09:00',end:'2026-11-10T18:00:00+09:00',time_zone:null};writes=[];r=await call({due:'2026-11-07',from:'2026-11-05T18:00:00+09:00'});assert.equal(r.status,200);assert.equal(page.properties['기한'].date.start,'2026-11-07T18:00:00+09:00');assert.equal(page.properties['기한'].date.end,'2026-11-10T18:00:00+09:00');assert.equal(writes.length,1);
r=await call({due:'2026-11-11',from:'2026-11-07T18:00:00+09:00'});assert.equal(r.status,400);assert.equal(writes.length,1);assert.equal(creates,0);
console.log('PASS school date PATCH: same page, only due property, no copies, stale/invalid/foreign/archived rejection, undated and preserved date time/range');
