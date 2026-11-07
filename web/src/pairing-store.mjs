import{bridgeAddress}from'./console-state.mjs';
const tabKey='thread-local-bridge-tab';const deviceKey=id=>'thread-local-bridge-device:'+id;
function valid(raw,userId){try{const p=JSON.parse(raw||'null');if(p?.userId!==userId||!userId||typeof p.key!=='string'||!p.key.trim())return null;bridgeAddress(p.endpoint);return p}catch{return null}}
export function readPairing(userId,device,tab){for(const[store,key,remember]of[[device,deviceKey(userId),true],[tab,tabKey,false]]){try{const p=valid(store.getItem(key),userId);if(p)return{...p,remember}}catch{}}return null}
export function savePairing(pairing,remember,device,tab){const p={userId:pairing.userId,endpoint:bridgeAddress(pairing.endpoint),key:pairing.key.trim()};if(!valid(JSON.stringify(p),p.userId))throw Error('Invalid pairing');try{tab.setItem(tabKey,JSON.stringify(p))}catch{}try{if(remember){device.setItem(deviceKey(p.userId),JSON.stringify(p));return true}device.removeItem(deviceKey(p.userId))}catch{}return false}
export function forgetPairing(userId,device,tab){try{device.removeItem(deviceKey(userId))}catch{}try{const p=JSON.parse(tab.getItem(tabKey)||'null');if(p?.userId===userId)tab.removeItem(tabKey)}catch{}}
export function clearTabPairing(userId,tab){try{const p=JSON.parse(tab.getItem(tabKey)||'null');if(p?.userId===userId)tab.removeItem(tabKey)}catch{}}
