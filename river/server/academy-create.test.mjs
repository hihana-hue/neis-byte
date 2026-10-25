import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import worker from './worker.mjs';
const ds='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';let writes=0;
globalThis.fetch=async(url,opts={})=>{const path=String(url).split('/v1/')[1];if(path==='data_sources/'+ds)return Response.json({properties:{학원:{select:{options:[{name:'교회'},{name:'과학'}]}}}});if(path==='data_sources/'+ds+'/query')return Response.json({results:[]});assert.equal(path,'pages');assert.equal(opts.method,'POST');const body=JSON.parse(opts.body);writes++;assert.equal(body.properties.학원.select.name,'교회');return Response.json({id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',properties:body.properties,last_edited_time:'v1'});};
const env={NOTION_TOKEN:'test',RIVER_ACCESS_KEY:'admin',SCHOOL_DATA_SOURCE_ID:'school',ACADEMY_DATA_SOURCE_ID:ds};
async function call(kind){return worker.fetch(new Request('https://api.test/academy',{method:'POST',headers:{Authorization:'Bearer admin'},body:JSON.stringify({kind,subtype:'수업',start:'2026-10-26T19:00:00+09:00',note:''})}),env);}
let r=await call('교회');assert.equal(r.status,201);assert.equal((await r.json()).item.kind,'교회');assert.equal(writes,1);
r=await call('미등록');assert.equal(r.status,400);assert.equal(writes,1);
r=await worker.fetch(new Request('https://api.test/academy',{headers:{Authorization:'Bearer admin'}}),env);assert.deepEqual((await r.json()).kinds,['교회','과학']);
console.log('PASS Notion-defined church POST, unknown option rejected, option list returned');
