import http from'node:http';
import cloud from'../api/cloud.js';
import events from'../api/events.js';
import billing from'../api/billing.js';
import webhook from'../api/stripe-webhook.js';
const handlers={'/api/cloud':cloud,'/api/events':events,'/api/billing':billing,'/api/stripe-webhook':webhook};
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');let name=url.pathname;req.query=Object.fromEntries(url.searchParams);if(name.startsWith('/api/cloud/')){req.query.path=name.slice('/api/cloud/'.length);name='/api/cloud';}const handler=handlers[name];if(!handler){res.writeHead(404);return res.end();}res.status=n=>(res.statusCode=n,res);res.json=data=>(res.setHeader('Content-Type','application/json'),res.end(JSON.stringify(data)));try{if(req.method!=='GET'&&name!=='/api/stripe-webhook'){let raw='';for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>2000000)return res.status(413).json({error:'Request too large'});}req.body=raw?JSON.parse(raw):{};}await handler(req,res);}catch{return res.status(500).json({error:'Local API request failed'});}}).listen(8747,'127.0.0.1',()=>console.log('Thread API dev server: loopback port 8747'));
