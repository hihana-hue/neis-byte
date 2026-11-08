import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import worker from './worker.mjs';
const ds='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';let props;
globalThis.fetch=async(url,opts={})=>{const path=String(url).split('/v1/')[1];if(path==='data_sources/'+ds)return Response.json({properties:{일정구분:{select:{options:[{name:'학원 · 과학'}]}},'수강 회차':{type:'number'}}});if(path===`pages/${id}`)return Response.json({id,parent:{type:'data_source_id',data_source_id:ds},last_edited_time:'v1',properties:{'학원':{select:{name:'학원 · 과학'}},'수업 구분':{select:{name:'수업'}},'출결':{select:{name:'예정'}}}});assert.equal(path,'pages');props=JSON.parse(opts.body).properties;return Response.json({id,properties:props,last_edited_time:'v2'});};
const env={NOTION_TOKEN:'test',RIVER_ACCESS_KEY:'admin',SCHOOL_DATA_SOURCE_ID:'school',ACADEMY_DATA_SOURCE_ID:ds};
const r=await worker.fetch(new Request('https://api.test/academy',{method:'POST',headers:{Authorization:'Bearer admin'},body:JSON.stringify({schemaVersion:3,kind:'학원 · 과학',title:'과학 수업',subtype:'수업',start:'2026-11-15T18:00:00+09:00',note:'',packSize:4})}),env);
assert.equal(r.status,201,await r.clone().text());assert.deepEqual(props['수강 회차'],{number:4});assert.ok(!('묶음 원비' in props));assert.ok(!('원비 납부' in props));console.log('PASS create without tuition schema or payment fields; preserve lesson pack size');
