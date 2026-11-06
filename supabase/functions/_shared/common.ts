import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
export const admin=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
// The browser uses the same-origin application proxy; direct cross-origin access is not enabled.
export const cors=(_req:Request)=>({});
export const reply=(req:Request,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('')}
export async function identity(req:Request){const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!bearer)return null;const{data,error}=await admin().auth.getUser(bearer);return error?null:data.user}
export async function body(req:Request){const raw=await req.text();if(raw.length>12000)throw Error('Request too large');return JSON.parse(raw)}
