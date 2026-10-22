import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {paintSubject} from './subject-palette.mjs';
const el={style:{}};paintSubject(el,'pink','과목');assert.equal(el.style.backgroundColor,'#F5E0E9');paintSubject(el,'blue','과목');assert.equal(el.style.color,'#284F6C');paintSubject(el,undefined,'공통과학2');assert.equal(el.style.backgroundColor,'#DBEDDB');
const src=fs.readFileSync(new URL('./write.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'');
for(const ok of [true,false]){
 const nodes=new Map(),session=new Map();let destination=null;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:({subject:'과학',topic:'제목',due:'2026-10-25'})[id]||'',classList:{toggle(){}},replaceChildren(){},append(){},close(){}});return nodes.get(id);};
 const ctx=vm.createContext({document:{getElementById:node,createElement:()=>({})},window:{RIVER_CONFIG:{apiBase:'https://api.test'}},localStorage:{getItem:()=>''},sessionStorage:{setItem:(k,v)=>session.set(k,v)},location:{replace:v=>destination=v},previewSubjects:[],fetch:async()=>({ok:true,json:async()=>({ok})})});
 vm.runInContext(src,ctx);vm.runInContext("connected=true;token='test-code'",ctx);
 await node('write-form').onsubmit({preventDefault(){}});
 assert.equal(destination,ok?'./':null);if(ok)assert.equal(session.get('river-write-saved'),'1');else assert.match(node('write-result').textContent,/저장 결과/);
}
console.log('PASS subject palette, successful save returns, failed save stays');
