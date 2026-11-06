import{createClient}from'@supabase/supabase-js';
import Stripe from 'stripe';
import assert from 'node:assert/strict';
let input='';for await(const chunk of process.stdin)input+=chunk;const cfg=JSON.parse(input);
const base=process.env.THREAD_SUPABASE_URL,key=process.env.THREAD_SUPABASE_PUBLIC_KEY;
const clients=[];
for(const id of[cfg.a,cfg.b]){const r=await fetch(base+'/functions/v1/thread-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'qa-'+id+'@example.invalid',password:cfg.password,action:'signin'})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));const client=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});assert.equal((await client.auth.setSession(data.session)).error,null);clients.push(client);}
const[a,b]=clients;const row={user_id:cfg.a,title:'QA webhook flow',agent:'QA agent',project:'Disposable QA',status:'working'};
const first=await a.from('agent_tasks').insert(row).select().single();assert.equal(first.error,null);const id=first.data.id;
assert.equal((await a.from('agent_tasks').insert({...row,title:'Second allowed task'})).error,null);
assert.ok((await a.from('agent_tasks').insert({...row,title:'Third blocked task'})).error);
assert.equal((await b.from('agent_tasks').select('*')).data.length,0);
assert.ok((await b.from('agent_subscriptions').insert({user_id:cfg.b,status:'active'})).error);
assert.ok((await b.from('agent_tasks').insert({...row,title:'Ownership spoof'})).error);
const session=(await a.auth.getSession()).data.session;
async function invoke(name,data){const r=await fetch(base+'/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(data)});return{status:r.status,data:await r.json()};}
const conn=await invoke('thread-connect',{name:'Disposable QA'});assert.equal(conn.status,200);assert.ok(conn.data.token);
assert.equal((await invoke('thread-connect',{name:'Over quota'})).status,409);
const list=await a.from('agent_connections').select('id,name');assert.equal(list.error,null);assert.ok((await a.from('agent_connections').select('token_hash')).error);
const send=()=>fetch(base+'/functions/v1/thread-events',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+conn.data.token},body:JSON.stringify({task_id:id,status:'attention',detail:'End-to-end webhook update verified'})});
assert.equal((await send()).status,200);assert.equal((await a.from('agent_tasks').select('status').eq('id',id).single()).data.status,'attention');
assert.equal((await a.from('agent_connections').update({revoked_at:new Date().toISOString()}).eq('id',list.data[0].id)).error,null);assert.equal((await send()).status,401);
const bad=await fetch(process.env.THREAD_SITE_ORIGIN+'/api/stripe-webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,400);
const payload=JSON.stringify({id:'evt_thread_qa',type:'customer.subscription.updated',created:Math.floor(Date.now()/1000),data:{object:{customer:'cus_thread_qa_nonexistent'}}});const sig=Stripe.webhooks.generateTestHeaderString({payload,secret:cfg.webhookSecret});const good=await fetch(process.env.THREAD_SITE_ORIGIN+'/api/stripe-webhook',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':sig},body:payload});assert.equal(good.status,200);
for(const c of clients)await c.auth.signOut();
console.log('PASS: sign-in; owner isolation; task and connection quotas; subscription tamper rejection; webhook update; token revocation; invalid Stripe signature rejection; valid Stripe signature accepted.');
