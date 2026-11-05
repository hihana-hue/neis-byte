import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'),{url:'https://test.invalid/river/'});
for(const key of ['window','document','Event','location','history','localStorage','sessionStorage'])globalThis[key]=dom.window[key];
globalThis.setInterval=()=>0;globalThis.setTimeout=()=>0;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
const pickerDates=[];dom.window.HTMLInputElement.prototype.showPicker=function(){pickerDates.push(this.value);};
window.RIVER_CONFIG={apiBase:'https://api.test'};sessionStorage.setItem('river-return-code','test-code');
const id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',record={id,title:'날짜 변경 검증 보고서',subjects:['과학'],due:'2026-11-05',status:'진행 중',url:'https://app.notion.com/p/'+id.replaceAll('-','')};
const writes=[];let fail=false;
globalThis.fetch=async(url,options={})=>{
 const path=String(url);
 if(path.endsWith('/dashboard'))return Response.json({student:{id:'test-student',name:'학생'},items:[record],academy:{items:[],kinds:['과학']}});
 if(path.includes('widget-release.json'))return Response.json({ready:false});
 if(path.endsWith('/tasks/'+id+'/status')){writes.push({path,body:JSON.parse(options.body)});return Response.json({ok:true});}
 if(path.endsWith('/tasks/'+id+'/due')){assert.equal(options.method,'PATCH');const body=JSON.parse(options.body);writes.push({path,body});if(fail)return Response.json({error:'저장 실패 테스트'},{status:502});return Response.json({ok:true,id,due:body.due});}
 throw Error('Unexpected request '+path);
};
await import('./app.mjs');const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};await flush();
const $=id=>document.getElementById(id);
const open=()=>document.querySelector('.card .school-date-trigger').click();
open();assert.equal($('detail').open,true);assert.equal(pickerDates.at(-1),'2026-11-05');
assert.ok($('detail-status').contains($('detail-progress')));
$('detail-start').click();$('detail-date-input').value='2026-11-07';assert.equal(writes.length,0);
$('detail-date-cancel').click();assert.equal($('detail').open,false);assert.equal($('toast').textContent,'취소되었습니다');assert.equal(writes.length,0);
open();assert.equal($('detail-date-input').value,'2026-11-05');assert.equal($('detail-progress').getAttribute('aria-pressed'),'true');
$('detail-second').click();assert.equal(writes.length,0);$('detail-written').click();$('detail-date-input').value='2026-11-07';await $('detail-date-form').onsubmit({preventDefault(){}});
assert.equal(writes.length,2);assert.deepEqual(writes[0].body,{due:'2026-11-07',from:'2026-11-05'});assert.deepEqual(writes[1].body,{status:'작성 완료',from:'진행 중'});assert.equal($('detail').open,false);
// Reopen from the completed list and verify failure keeps the draft available.
document.querySelector('.card .title').click();$('detail-date-open').click();$('detail-date-input').value='2026-11-08';fail=true;
await $('detail-date-form').onsubmit({preventDefault(){}});assert.equal($('detail').open,true);assert.match($('detail-error').textContent,/저장 실패/);assert.equal($('detail-date-save').disabled,false);
fail=false;await $('detail-date-form').onsubmit({preventDefault(){}});assert.equal(writes.at(-1).body.from,'2026-11-07');assert.equal($('detail').open,false);
console.log('PASS staged date/status, cancellation without writes, combined save and close, failure retry on original record');dom.window.close();
