import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from './worker.mjs';
import {lessonRounds} from '../academy-model.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ds='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
let p={id,object:'page',last_edited_time:'v1',parent:{type:'data_source_id',data_source_id:ds},properties:{'학원':{select:{name:'과학'}},'수업 구분':{select:{name:'수업'}},'수업일시':{date:{start:'2026-10-25T18:00:00+09:00'}},'출결':{select:{name:'출석'}},'회차 차감':{checkbox:true}}};
globalThis.fetch=async(url,opts={})=>{const path=String(url).split('/v1/')[1];if(path==='data_sources/'+ds)return Response.json({properties:{'최초 수업일':{type:'date'}}});assert.equal(path,'pages/'+id);if(opts.method==='PATCH'){Object.assign(p.properties,JSON.parse(opts.body).properties);p.last_edited_time+='x';}return Response.json(p);};
const env={NOTION_TOKEN:'test',RIVER_ACCESS_KEY:'admin',SCHOOL_DATA_SOURCE_ID:'school',ACADEMY_DATA_SOURCE_ID:ds};
async function move(start){const r=await worker.fetch(new Request('https://api.test/academy/'+id,{method:'PATCH',headers:{Authorization:'Bearer admin'},body:JSON.stringify({action:'reschedule',start,updated:p.last_edited_time})}),env);assert.equal(r.status,200);return (await r.json()).item;}
let x=await move('2026-10-27T18:00:00+09:00');assert.equal(x.originalStart,'2026-10-25T18:00:00+09:00');assert.equal(x.status,'출석');assert.equal(x.charge,true);assert.equal(x.title,'과학 25일 보강');
x=await move('2026-10-29T18:00:00+09:00');assert.equal(x.originalStart,'2026-10-25T18:00:00+09:00');assert.match(x.history,/2026-10-27/);assert.match(x.history,/2026-10-29/);assert.equal(x.title,'과학 25일 보강 2th');
const unchanged=await move('2026-10-29T18:00:00+09:00');assert.equal(unchanged.title,'과학 25일 보강 2th');
x=await move('2026-10-30T18:00:00+09:00');assert.equal(x.title,'과학 25일 보강 3th');
const rows=[2,14,18].map(d=>({id:String(d),kind:'과학',status:'출석',start:`2026-10-${String(d).padStart(2,'0')}T19:00:00+09:00`}));
rows.push({...x,status:'예정'}, {id:'next',kind:'과학',status:'예정',start:'2026-10-28T18:00:00+09:00'}, {id:'clinic',kind:'과학',subtype:'클리닉',status:'출석',start:'2026-10-22T19:00:00+09:00'});
assert.equal(lessonRounds(rows).get(id),'4/4');assert.equal(lessonRounds(rows).get('next'),'1/4');
console.log('PASS repeated makeup preserves original date, attendance, charge, history and round order');
