import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react(),{name:'thread-app-route',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url?.split('?')[0]==='/app')req.url='/index.html'+(req.url.includes('?')?'?'+req.url.split('?')[1]:'');next()})}}],build:{outDir:'dist'},server:{host:'127.0.0.1',port:8746}});
