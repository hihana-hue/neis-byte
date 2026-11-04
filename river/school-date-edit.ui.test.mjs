import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'),{url:'https://test.invalid/river/'});
for(const key of ['window','document','Event','location','history','localStorage','sessionStorage'])globalThis[key]=dom.window[key];
globalThis.setInterval=()=>0;globalThis.setTimeout=()=>0;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
window.RIVER_CONFIG={apiBase:'https://api.test'};sessionStorage.setItem('river-return-code','test-code');
const id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',record={id,title:'날짜 변경 검증 보고서',subjects:['과학'],due:'2026-11-05',status:'진행 중',url:'https://app.notion.com/p/'+id.replaceAll('-','')};
const writes=[];let fail=false;
globalThis.fetch=async(url,options={})=>{
 const path=String(url);
 if(path.endsWith('/dashboard'))return Response.json({student:{id:'test-student',name:'학생'},items:[record],academy:{items:[],kinds:['과학']}});
 if(path.includes('widget-release.json'))return Response.json({ready:false});
 if(path.endsWith('/tasks/'+id+'/due')){assert.equal(options.method,'PATCH');const body=JSON.parse(options.body);writes.push({path,body});if(fail)return Response.json({error:'저장 실패 테스트'},{status:502});return Response.json({ok:true,id,due:body.due});}
 throw Error('Unexpected request '+path);
};
await import('./app.mjs');const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};await flush();
const $=id=>document.getElementById(id);
let date=document.querySelector('.card .school-date-trigger');assert.ok(date,'existing dates must be clickable');date.click();assert.equal($('detail').open,true);assert.equal($('detail-date-form').hidden,false);assert.equal($('detail-date-input').value,'2026-11-05');
$('detail-date-input').value='2026-11-07';await $('detail-date-form').onsubmit({preventDefault(){}});assert.equal(writes.length,1);assert.deepEqual(writes[0].body,{due:'2026-11-07',from:'2026-11-05'});assert.equal($('detail-title').textContent,record.title);assert.match($('detail-due').textContent,/11/);assert.equal($('detail-date-form').hidden,true);assert.equal($('detail-status').textContent,'진행 중');
$('detail-date-open').click();assert.equal($('detail-date-input').value,'2026-11-07');$('detail-date-input').value='2026-11-09';$('detail-date-cancel').click();assert.equal(writes.length,1);assert.equal($('detail-date-form').hidden,true);
$('detail-date-open').click();assert.equal($('detail-date-input').value,'2026-11-07');fail=true;$('detail-date-input').value='2026-11-08';await $('detail-date-form').onsubmit({preventDefault(){}});assert.equal($('detail-date-form').hidden,false);assert.equal($('detail-date-input').value,'2026-11-08');assert.match($('detail-error').textContent,/保存|저장 실패/);assert.equal($('detail-date-save').disabled,false);
fail=false;await $('detail-date-form').onsubmit({preventDefault(){}});assert.equal(writes.at(-1).body.from,'2026-11-07');assert.equal($('detail-date-form').hidden,true);
console.log('PASS web existing-date click/edit/save/cancel/failure retry, original ID and original date retained, title/status preserved, no create request');dom.window.close();
