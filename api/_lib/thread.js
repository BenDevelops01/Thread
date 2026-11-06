import crypto from 'node:crypto';
export const backendURL=process.env.THREAD_SUPABASE_URL;
export const publicKey=process.env.THREAD_SUPABASE_PUBLIC_KEY;
export const PRICE=process.env.THREAD_STRIPE_PRICE;
export const SITE=process.env.THREAD_SITE_ORIGIN;
export async function userFor(req){const token=req.headers.authorization;if(!token?.startsWith('Bearer ')||!backendURL||!publicKey)return null;const r=await fetch(backendURL+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:token},redirect:'error',signal:AbortSignal.timeout(10000)});return r.ok?r.json():null;}
export async function state(data){if(!process.env.THREAD_BACKEND_SECRET||!backendURL)throw Error('Billing unavailable');const payload=JSON.stringify({...data,timestamp:Date.now()});const signature=crypto.createHmac('sha256',process.env.THREAD_BACKEND_SECRET).update(payload).digest('hex');const r=await fetch(backendURL+'/functions/v1/thread-billing-state',{method:'POST',headers:{'Content-Type':'application/json','x-thread-signature':signature},body:payload,redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Billing unavailable');return r.json();}
