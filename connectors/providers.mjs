export const PROVIDERS = [
 {id:'lmstudio',name:'LM Studio',local:true}, {id:'ollama',name:'Ollama',local:true},
 {id:'openai',name:'OpenAI',env:'OPENAI_API_KEY'}, {id:'anthropic',name:'Anthropic',env:'ANTHROPIC_API_KEY'}, {id:'gemini',name:'Google Gemini',env:'GEMINI_API_KEY'}
];
export function localBase(value,fallback){const url=new URL(value||fallback);if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/v1')throw Error('Local model servers must use a loopback HTTP address ending in /v1.');return url.href.replace(/\/$/,'');}
export function providerConfig(id,env){
 if(id==='lmstudio')return{base:localBase(env.LM_STUDIO_BASE_URL,'http://127.0.0.1:1234/v1'),headers:env.LM_STUDIO_API_TOKEN?{Authorization:'Bearer '+env.LM_STUDIO_API_TOKEN}:{}};
 if(id==='ollama')return{base:localBase(env.OLLAMA_BASE_URL,'http://127.0.0.1:11434/v1'),headers:{}};
 if(id==='openai'&&env.OPENAI_API_KEY)return{base:'https://api.openai.com/v1',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY}};
 if(id==='anthropic'&&env.ANTHROPIC_API_KEY)return{base:'https://api.anthropic.com/v1',headers:{'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'}};
 if(id==='gemini'&&env.GEMINI_API_KEY)return{base:'https://generativelanguage.googleapis.com/v1beta',headers:{'x-goog-api-key':env.GEMINI_API_KEY}};
 throw Error('This provider is not configured in the bridge environment.');
}
export async function listModels(id,env,fetcher=fetch){const c=providerConfig(id,env);const r=await fetcher(c.base+'/models',{headers:c.headers,signal:AbortSignal.timeout(10000),redirect:'error'});if(!r.ok)throw Error('The model server rejected the request. Check its server status and credentials.');const d=await r.json();const models=id==='gemini'?(d.models||[]).filter(x=>x.supportedGenerationMethods?.includes('generateContent')).map(x=>({id:x.name.replace(/^models\//,''),name:x.displayName||x.name})):(d.data||[]).map(x=>({id:x.id,name:x.display_name||x.id}));return models.filter(x=>typeof x.id==='string').slice(0,200);}
export async function generate(id,model,prompt,env,signal,fetcher=fetch){
 if(typeof model!=='string'||!model||model.length>200||typeof prompt!=='string'||!prompt.trim()||prompt.length>12000)throw Error('Choose a model and enter a prompt up to 12,000 characters.');
 const c=providerConfig(id,env);let path='/chat/completions',body={model,messages:[{role:'user',content:prompt}],stream:false};
 if(id==='openai')body.max_completion_tokens=1024;else body.max_tokens=1024;
 if(id==='anthropic'){path='/messages';body={model,max_tokens:1024,messages:[{role:'user',content:prompt}]};}
 if(id==='gemini'){path='/models/'+encodeURIComponent(model.replace(/^models\//,''))+':generateContent';body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1024}};}
 const r=await fetcher(c.base+path,{method:'POST',headers:{...c.headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'});
 if(!r.ok)throw Error(`The provider returned HTTP ${r.status}. Check the selected model and provider setup.`);
 const d=await r.json();const text=id==='anthropic'?(d.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n'):id==='gemini'?(d.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join(''):d.choices?.[0]?.message?.content;
 if(typeof text!=='string'||!text.trim())throw Error('The model returned no text. Try another text model.');return text.slice(0,64000);
}
