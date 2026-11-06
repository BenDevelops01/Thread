import { admin, reply, body, hash, identity } from '../_shared/common.ts';
Deno.serve(async req => {
 if(req.method==='OPTIONS')return reply(req,{});
 if(req.method!=='POST')return reply(req,{error:'Method not allowed'},405);
 try {
  const user=await identity(req);if(!user)return reply(req,{error:'Sign in to redeem an access code.'},401);
  const db=admin(),salt=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim();
  const keys=[await hash(salt+':redeem-user:'+user.id),await hash(salt+':redeem-ip:'+ip)].sort();
  const {data:allowed,error:limitError}=await db.rpc('thread_take_auth_attempt',{keys});
  if(limitError)return reply(req,{error:'Redemption is temporarily unavailable.'},503);
  if(!allowed)return reply(req,{error:'Too many attempts. Try again in 15 minutes.'},429);
  const input=await body(req);const code=typeof input.code==='string'?input.code.trim():'';
  if(!/^THREAD-[A-Za-z0-9_-]{43}$/.test(code))return reply(req,{error:'This code is invalid, expired or already redeemed.'},400);
  const {data,error}=await db.rpc('thread_redeem_access',{owner_id:user.id,digest:await hash(code)});
  if(error)return reply(req,{error:'Redemption is temporarily unavailable.'},503);
  return reply(req,data,data?.ok?200:400);
 }catch{return reply(req,{error:'Unable to redeem this code.'},400);}
});
