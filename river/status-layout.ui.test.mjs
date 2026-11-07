import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'),{url:'https://test.invalid/river/'});
for(const key of ['window','document','Event','location','history','localStorage','sessionStorage','MutationObserver'])globalThis[key]=dom.window[key];
globalThis.setInterval=()=>0;globalThis.setTimeout=()=>0;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
const pickerDates=[];dom.window.HTMLInputElement.prototype.showPicker=function(){pickerDates.push(this.value);};
window.RIVER_CONFIG={apiBase:'https://api.test'};sessionStorage.setItem('river-return-code','test-code');
const id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',record={id,title:'날짜 변경 검증 보고서',subjects:['과학'],due:'2026-11-05',status:'진행 중',url:'https://app.notion.com/p/'+id.replaceAll('-','')};
const writes=[];let fail=false;
globalThis.fetch=async(url,options={})=>{
 const path=String(url);
 if(path.endsWith('/options'))return Response.json({subjects:['과학'],submissions:['리로스쿨','패들렛','서면제출']});
 if(path.endsWith('/dashboard'))return Response.json({student:{id:'test-student',name:'학생'},items:[record,{...record,id:'planned',title:'아주 긴 일정 제목도 생략하지 않고 보여 주는 과학 탐구 보고서',status:'시작전'},{...record,id:'second',title:'두 번째 검토',status:'진행 2차'},{...record,id:'written',title:'제출 확인',status:'작성 완료'}],academy:{items:[],kinds:['과학']}});
 if(path.includes('widget-release.json'))return Response.json({ready:false});
 if(path.endsWith('/tasks/'+id+'/submission')){writes.push({path,body:JSON.parse(options.body)});return Response.json({ok:true});}
 if(path.endsWith('/tasks/'+id+'/status')){writes.push({path,body:JSON.parse(options.body)});return Response.json({ok:true});}
 if(path.endsWith('/tasks/'+id+'/due')){assert.equal(options.method,'PATCH');const body=JSON.parse(options.body);writes.push({path,body});if(fail)return Response.json({error:'저장 실패 테스트'},{status:502});return Response.json({ok:true,id,due:body.due});}
 throw Error('Unexpected request '+path);
};
await import('./app.mjs');const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};await flush();
const columns=[...document.querySelectorAll('.status-column')];
assert.equal(columns.length,2);
assert.match(columns[0].querySelector('h3').textContent,/시작 전/);
assert.match(columns[1].querySelector('h3').textContent,/진행 중/);
assert.equal(columns[0].querySelectorAll('.status').length,0);
assert.deepEqual([...columns[1].querySelectorAll('.status')].map(x=>x.textContent).sort(),['작성 완료','진행 2차'].sort());
assert.ok(document.querySelector('#left .status'));
columns[0].querySelector('.title').click();assert.equal(document.getElementById('detail').open,true);assert.match(document.getElementById('detail-title').textContent,/아주 긴 일정/);assert.equal(document.getElementById('detail-start').getAttribute('aria-pressed'),'true');
await flush();assert.equal(writes.length,0);
console.log('PASS status groups omit redundant labels, preserve sub-statuses and dates, and open the original schedule without writes');dom.window.close();
