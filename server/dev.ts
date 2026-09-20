import { createServer } from 'node:http';
import { createServer as createVite } from 'vite';
import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import { createHandler, type Store } from './api';
import type { Stored } from './engine';
await mkdir('.local-games',{recursive:true});
let queue:Promise<unknown>=Promise.resolve();
const store:Store={
 async get(key){try{return JSON.parse(await readFile(`.local-games/${key}.json`,'utf8')) as {data:Stored;etag:string};}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}},
 async put(key,data,etag){const task=queue.then(async()=>{const old=await store.get(key);if(etag?old?.etag!==etag:!!old)return false;const next={data,etag:crypto.randomUUID()};await writeFile(`.local-games/${key}.tmp`,JSON.stringify(next));await rename(`.local-games/${key}.tmp`,`.local-games/${key}.json`);return true;});queue=task.catch(()=>{});return task;}
};
const handler=createHandler(store);const vite=await createVite({server:{middlewareMode:true},appType:'spa'});
createServer(async(req,res)=>{if(req.url?.split('?')[0]!=='/api/game'){vite.middlewares(req,res);return;}
 try{let body='';for await(const chunk of req){body+=chunk; if(body.length>16000){res.writeHead(413);res.end();return;}}
 const r=await handler(new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers as Record<string,string>,...(req.method==='POST'?{body}:{})}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());}catch{res.writeHead(500);res.end('Server error');}
}).listen(Number(process.env.PORT||5173),'0.0.0.0',()=>console.log('Battle Forge ready on port '+(process.env.PORT||5173)));
