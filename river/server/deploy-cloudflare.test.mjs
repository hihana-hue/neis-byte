import assert from 'node:assert/strict';
import {deploymentConfig,verifyPreserved} from './deploy-cloudflare.mjs';
const before={compatibility_date:'2026-10-17',compatibility_flags:[],observability:{enabled:true},bindings:[{type:'kv_namespace',name:'RIVER_KV',namespace_id:'a'.repeat(32)},{type:'secret_text',name:'NOTION_TOKEN'},{type:'secret_text',name:'RIVER_ACCESS_KEY'},{type:'plain_text',name:'STUDENT_REGISTRY_ID',text:'fixture-registry'},{type:'json',name:'EXAMPLE',json:{a:1}}]};
const clone=x=>structuredClone(x),config=deploymentConfig(before,[{cron:'*/5 * * * *'}],{enabled:true},'/test/worker.mjs');
assert.equal(config.keep_vars,true);assert.equal(config.vars,undefined);assert.equal(config.kv_namespaces[0].id,'a'.repeat(32));assert.equal(config.name,'choi-river-notion');assert.deepEqual(config.triggers.crons,[]);assert.equal(config.migrations[0].new_sqlite_classes[0],'StudentWidgetDevices');assert.deepEqual(config.observability,{enabled:true});
const after=clone(before);after.bindings.push({type:'durable_object_namespace',name:'STUDENT_WIDGETS',class_name:'StudentWidgetDevices',namespace_id:'new-fixture'});verifyPreserved(before,after);
const lost=clone(after);lost.bindings=lost.bindings.filter(x=>x.name!=='RIVER_KV');assert.throws(()=>verifyPreserved(before,lost));
const changed=clone(after);changed.bindings.find(x=>x.name==='RIVER_KV').namespace_id='b'.repeat(32);assert.throws(()=>verifyPreserved(before,changed));
const changedVar=clone(after);changedVar.bindings.find(x=>x.name==='STUDENT_REGISTRY_ID').text='different';assert.throws(()=>verifyPreserved(before,changedVar));
for(const extra of [{type:'r2_bucket',name:'OTHER'},{type:'plain_text',name:'STUDENT_WIDGETS',text:'wrong'},{type:'durable_object_namespace',name:'STUDENT_WIDGETS',class_name:'OtherClass'}]){const x=clone(before);x.bindings.push(extra);assert.throws(()=>deploymentConfig(x,[],{enabled:true},'/test/worker.mjs'));}
assert.doesNotThrow(()=>deploymentConfig(after,[],{enabled:true},'/test/worker.mjs'));
assert.throws(()=>deploymentConfig({...before,bindings:before.bindings.filter(x=>x.name!=='NOTION_TOKEN')},[],{enabled:true},'/test/worker.mjs'));
console.log('PASS deployment preserves KV/variables/secrets, adds SQLite migration, rejects conflicting or unsupported bindings.');

for(const placement of [undefined,null,{}])assert.equal(deploymentConfig({...before,placement},[],{enabled:true},'/test/worker.mjs').placement,undefined);
for(const mode of ['smart','off'])assert.deepEqual(deploymentConfig({...before,placement:{mode}},[],{enabled:true},'/test/worker.mjs').placement,{mode});
assert.throws(()=>deploymentConfig({...before,placement:{unexpected:true}},[],{enabled:true},'/test/worker.mjs'));
console.log('PASS default empty placement omitted; explicit placement preserved; unknown placement rejected.');

