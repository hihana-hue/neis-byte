import assert from 'node:assert/strict';
import {groups,todayKey,dayNumber} from './model.mjs';
for(const today of ['2026-11-08','2026-11-09','2026-12-28','2028-02-25']){
 const date=n=>new Date((dayNumber(today)+n)*86400000).toISOString().slice(0,10);
 const items=Array.from({length:18},(_,i)=>({id:i-1,title:'일정',due:date(i-1),status:'시작전'}));items.push({id:'complete',title:'완료',due:today,status:'완료'},{id:'undated',title:'날짜 미정',due:null,status:'진행 중'});
 const g=groups(items,today),ids=k=>g[k].map(x=>x.id);
 assert.deepEqual(ids('overdue'),[-1]);assert.deepEqual(ids('thisWeek'),[0,1,2,3,4,5,6,7]);assert.deepEqual(ids('nextWeek'),[8,9,10,11,12,13,14]);assert.deepEqual(ids('later'),[15,16]);assert.deepEqual(ids('undated'),['undated']);
}
assert.equal(todayKey(new Date('2026-11-08T15:00:00Z')),'2026-11-09');
console.log('PASS rolling today/+7/+14 inclusive bounds, overdue exclusion, month/year/leap-day rollover and Korea midnight');
