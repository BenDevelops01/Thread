import{defineConfig}from'vite';
import react from'@vitejs/plugin-react';
import{fileURLToPath}from'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),plugins:[react(),{name:'thread-app-route',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url?.split('?')[0]==='/app')req.url='/index.html'+(req.url.includes('?')?'?'+req.url.split('?')[1]:'');next()})}}],build:{outDir:'dist'},server:{host:'127.0.0.1',port:8746,proxy:{'/api':{target:'http://127.0.0.1:8747',changeOrigin:false}}}});
