let sequence=0;const pending=new Map();
export const isNative=!!window.webkit?.messageHandlers?.thread;
window.__threadReply=({id,value,error})=>{const call=pending.get(id);if(!call)return;clearTimeout(call.timer);pending.delete(id);error?call.reject(new Error(error)):call.resolve(value)};
export function command(action,data={}){if(!isNative)return Promise.reject(new Error('This is a website preview. Download Thread to connect a provider.'));return new Promise((resolve,reject)=>{const id=String(++sequence);const timer=setTimeout(()=>{pending.delete(id);reject(new Error('The Mac app did not respond. Please retry.'))},130000);pending.set(id,{resolve,reject,timer});window.webkit.messageHandlers.thread.postMessage({id,action,data})})}
