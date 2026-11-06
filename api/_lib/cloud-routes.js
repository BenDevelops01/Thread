const tables=new Set(['agent_tasks','agent_connections','agent_subscriptions','agent_preferences','agent_premium_grants']);
const functions=new Set(['thread-auth','thread-connect','thread-redeem']);
export function allowedCloudRoute(path,method,query){
 if(typeof path!=='string'||path.includes('..')||path.includes('%')||path.includes('\\'))return false;
 const parts=path.split('/');
 if(parts[0]==='rest'&&parts[1]==='v1')return (parts.length===3&&tables.has(parts[2])&&['GET','HEAD','POST','PATCH','DELETE'].includes(method))||(parts.length===4&&parts[2]==='rpc'&&parts[3]==='thread_entitlement'&&method==='POST');
 if(parts[0]==='functions'&&parts[1]==='v1'&&parts.length===3)return functions.has(parts[2])&&method==='POST';
 if(path==='auth/v1/token')return method==='POST'&&query.get('grant_type')==='refresh_token';
 if(path==='auth/v1/user')return method==='GET';
 return path==='auth/v1/logout'&&method==='POST';
}
