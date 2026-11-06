export const tabs=new Set(['runs','launch','approvals','logs','connect','settings','billing']);
export function tabFromSearch(search){const value=new URLSearchParams(search).get('tab');return value==='connections'?'connect':tabs.has(value)?value:'runs'}
export const providerNames={lmstudio:'LM Studio',ollama:'Ollama',openai:'OpenAI',anthropic:'Anthropic',gemini:'Google Gemini',codex:'Codex',claude:'Claude Code'};
export function bridgeAddress(value){const u=new URL(value);if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.pathname!=='/'||u.username||u.password||u.search||u.hash)throw Error('Use a local bridge address, such as http://127.0.0.1:8787.');return u.origin}
export async function bridgeRequest(endpoint,key,route,options={},fetcher=fetch){
 if(!key.trim())throw Error('Pair your bridge in Connections first.');
 let response;try{response=await fetcher(bridgeAddress(endpoint)+route,{...options,headers:{Authorization:'Bearer '+key.trim(),'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)})}catch(e){if(e.name==='TimeoutError'||e.name==='AbortError')throw Error('The bridge did not respond. Check that it is running, then reconnect.');throw Error('Cannot reach the local bridge. Start it on this computer and allow local-network access if your browser asks.');}
 const data=await response.json().catch(()=>({}));if(response.status===401)throw Error('Pairing key expired or incorrect. Paste the current key from your bridge terminal in Connections.');if(!response.ok)throw Error(data.error||(response.status===404?'This bridge is out of date. Update the Thread checkout and restart it.':'The bridge could not complete that request.'));return data;
}

export function modelFailure(provider,error){const message=error?.message||'Unable to load models.';if(['lmstudio','ollama'].includes(provider)&&/fetch failed|failed to fetch|ECONNREFUSED|rejected the request/i.test(message))return providerNames[provider]+" server is not responding. Start its local API server, load a text model, then click Refresh models.";return message}
