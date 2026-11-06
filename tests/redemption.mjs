import{createClient}from'@supabase/supabase-js';
import assert from'node:assert/strict';
import readline from'node:readline/promises';
const rl=readline.createInterface({input:process.stdin});const cfg=JSON.parse(await rl.question(''));rl.close();
const url=process.env.THREAD_SUPABASE_URL,key=process.env.THREAD_SUPABASE_PUBLIC_KEY;
async function login(id){const r=await fetch(url+'/functions/v1/thread-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'qa-'+id+'@example.invalid',password:cfg.password,action:'signin'})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});await client.auth.setSession(data.session);return{client,token:data.session.access_token,id};}
const users=await Promise.all([login(cfg.a),login(cfg.b)]);
const a=users[0].client,b=users[1].client;
for(const theme of['light','dark']){const saved=await a.from('agent_preferences').upsert({user_id:cfg.a,display_name:'QA preferences',theme,refresh_seconds:30});assert.equal(saved.error,null);assert.equal((await a.from('agent_preferences').select('theme').single()).data.theme,theme);}
assert.equal((await b.from('agent_preferences').select('*')).data.length,0);
assert.ok((await b.from('agent_preferences').upsert({user_id:cfg.a,display_name:'spoof'})).error);
assert.ok((await a.from('agent_premium_grants').insert({user_id:cfg.a,code_id:crypto.randomUUID()})).error);
assert.ok((await a.rpc('thread_redeem_access',{owner_id:cfg.a,digest:cfg.hash})).error);
async function redeem(user,code){const r=await fetch(url+'/functions/v1/thread-redeem',{method:'POST',headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+user.token}:{})},body:JSON.stringify({code})});return{status:r.status,data:await r.json()};}
assert.equal((await redeem(null,cfg.code)).status,401);
const results=await Promise.all(users.map(u=>redeem(u,cfg.code)));
assert.deepEqual(results.map(x=>x.status).sort(),[200,400]);const index=results.findIndex(x=>x.status===200),winner=users[index],loser=users[1-index];
const access=await winner.client.rpc('thread_entitlement');assert.equal(access.error,null);assert.equal(access.data.pro,true);assert.equal(access.data.source,'code');assert.equal((await loser.client.rpc('thread_entitlement')).data.pro,false);
assert.equal((await redeem(loser,cfg.code)).status,400);
for(let i=0;i<3;i++)assert.equal((await winner.client.from('agent_tasks').insert({user_id:winner.id,title:'Pro task '+i,agent:'QA',project:'Disposable QA'})).error,null);
for(let i=0;i<2;i++)assert.equal((await loser.client.from('agent_tasks').insert({user_id:loser.id,title:'Free task '+i,agent:'QA',project:'Disposable QA'})).error,null);
assert.ok((await loser.client.from('agent_tasks').insert({user_id:loser.id,title:'Blocked free task',agent:'QA',project:'Disposable QA'})).error);
const bad=await Promise.all(Array.from({length:10},()=>redeem(loser,'invalid')));assert.ok(bad.some(x=>x.status===429));
for(const u of users)await u.client.auth.signOut();
console.log('PASS: preference save/update/read and ownership; grant tamper rejection; service-only redemption; unauthenticated rejection; concurrent single-use redemption; real Pro task limits; replay rejection; redemption attempt limiter.');
