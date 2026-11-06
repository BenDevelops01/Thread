import{spawn}from'node:child_process';
const options={stdio:'inherit',env:process.env};
const api=spawn(process.execPath,['scripts/api-dev.mjs'],options);
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','web/vite.config.js','--host','127.0.0.1'],{...options,cwd:process.cwd()});
function end(){api.kill();web.kill();}process.on('SIGINT',()=>{end();process.exit(0)});process.on('SIGTERM',()=>{end();process.exit(0)});api.on('exit',()=>{web.kill()});web.on('exit',()=>{api.kill()});
