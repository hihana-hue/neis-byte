import {StudentWidgetDevices} from './worker.mjs';
export function namespace(env){
 const objects=new Map();
 return {idFromName:x=>x,get(id){if(!objects.has(id)){const data=new Map();let queue=Promise.resolve();const ctx={storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>{data.set(k,structuredClone(v));}},blockConcurrencyWhile(fn){const task=queue.then(fn);queue=task.catch(()=>{});return task;}};objects.set(id,new StudentWidgetDevices(ctx,env));}return {fetch:(url,opts)=>objects.get(id).fetch(new Request(url,opts))};}};
}
