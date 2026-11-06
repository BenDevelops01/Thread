import crypto from 'node:crypto';
export const backendURL='https://kytcrsxywqrxcqpembpp.supabase.co';
const publicKey='sb_publishable_dFVdUIaRzIlfF1OzKOGR4A_nMh9ihU_';
export async function userFor(req){const token=req.headers.authorization;if(!token?.startsWith('Bearer '))return null;const r=await fetch(backendURL+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:token}});return r.ok?r.json():null;}
export async function state(data){if(!process.env.THREAD_BACKEND_SECRET)throw Error('Billing unavailable');const payload=JSON.stringify({...data,timestamp:Date.now()});const signature=crypto.createHmac('sha256',process.env.THREAD_BACKEND_SECRET).update(payload).digest('hex');const r=await fetch(backendURL+'/functions/v1/thread-billing-state',{method:'POST',headers:{'Content-Type':'application/json','x-thread-signature':signature},body:payload});if(!r.ok)throw Error('Billing unavailable');return r.json();}
export const PRICE='price_1UYjphL9PeXTq9CWPw0a6VAa';
export const SITE='https://trythread.xyz';
