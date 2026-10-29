import assert from 'node:assert/strict';
import {lessonRounds} from './academy-model.mjs';
const row=(id,kind,status,subtype='수업',charge=false)=>({id,kind,status,subtype,charge,start:'2026-10-'+String(id).padStart(2,'0')+'T10:00:00+09:00'});
const rows=[row(1,'과학','출석'),row(2,'과학','결석'),row(3,'과학','결석','수업',true),row(4,'과학','예정','클리닉'),row(5,'과학','예정'),row(6,'과학','예정'),row(7,'과학','예정'),row(8,'운동','출석'),row(9,'바디PT','예정')];
const labels=lessonRounds(rows.reverse());
assert.equal(labels.get(4),'클리닉');
assert.equal(labels.get(5),'3/4');
assert.equal(labels.get(6),'4/4');
assert.equal(labels.get(7),'1/4');
assert.equal(labels.get(9),'2/5');
assert.equal(labels.has(2),false);
console.log('Academy round tests passed');

