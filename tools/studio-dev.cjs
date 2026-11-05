'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {handler,preview}=require('../server/studio.cjs');
const root=path.resolve(__dirname,'../public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain'};
async function start(port=0){const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://'+req.headers.host);if(url.pathname.startsWith('/api/')){let data='';for await(const chunk of req){data+=chunk;if(data.length>32000){res.statusCode=413;res.end();return;}}req.body=data;await(url.pathname==='/api/studio'?handler:preview)(req,res);return;}let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.statusCode=400;res.end();return;}let file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;file=path.join(root,'404.html');}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(port,'127.0.0.1',r));return {server,url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};}
if(require.main===module)start(Number(process.env.PORT)||4174).then(s=>console.log('Shine Studio: '+s.url+'/studio/?demo=1'));
module.exports={start};
