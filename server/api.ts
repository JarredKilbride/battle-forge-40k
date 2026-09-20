import { createGame, publicGame, authenticate, join, apply, hash, ensure, GameError, type Stored } from './engine';
export interface Store { get(key:string):Promise<{data:Stored;etag:string}|null>; put(key:string,data:Stored,etag?:string):Promise<boolean> }
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function createHandler(store:Store){return async (req:Request)=>{
 try {
  ensure(req.method==='POST','Use POST.',405);
  const origin=req.headers.get('origin');ensure(!origin||origin===new URL(req.url).origin,'Cross-origin request rejected.',403);
  const raw=await req.text();ensure(raw.length<=16000,'Request too large.',413);let b;try{b=JSON.parse(raw);}catch{throw new GameError('Invalid JSON.');}
  ensure(b&&typeof b==='object','Invalid request.');const token=req.headers.get('authorization')?.replace(/^Bearer /,'');ensure(token&&/^[a-f0-9-]{36,80}$/i.test(token),'Missing device session.',401);
  if(b.op==='create'){
   const code=hash(token).slice(0,10).toUpperCase();let existing=await store.get(code);
   if(existing){const id=authenticate(existing.data,token);return json({game:publicGame(existing.data),playerId:id});}
   const game=createGame(code,b.name,token);const saved=await store.put(code,game);ensure(saved,'Room creation conflicted. Try again.',409);return json({game:publicGame(game),playerId:game.host});
  }
  ensure(typeof b.code==='string'&&/^[A-F0-9]{10}$/.test(b.code),'Enter the 10-character room code.');
  const found=await store.get(b.code);ensure(found,'Room not found. Check the code.',404);const game=found.data;ensure(game.expiresAt>Date.now(),'This room has expired. Create a new game.',410);
  if(b.op==='join'){const old=game.version;const id=join(game,b.name,token);if(game.version!==old)ensure(await store.put(b.code,game,found.etag),'Someone else joined. Try again.',409);return json({game:publicGame(game),playerId:id});}
  const id=authenticate(game,token);
  if(b.op==='read')return json({game:publicGame(game),playerId:id});
  ensure(b.op==='act','Unknown operation.');ensure(typeof b.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(b.requestId),'Invalid action identifier.');
  if(game.receipts.includes(`${id}:${b.requestId}`))return json({game:publicGame(game),playerId:id});
  ensure(b.version===game.version,'Game changed on the other phone. Updated; please try again.',409);ensure(b.action&&typeof b.action==='object','Missing action.');
  apply(game,id,b.action);game.receipts.push(`${id}:${b.requestId}`);game.receipts=game.receipts.slice(-256);
  ensure(await store.put(b.code,game,found.etag),'Another action arrived first. Updated; please try again.',409);
  return json({game:publicGame(game),playerId:id});
 } catch(e){if(e instanceof GameError)return json({error:e.message},e.status);console.error('Game operation failed',e instanceof Error?e.message:'unknown');return json({error:'Game service unavailable. Your saved game has not been cleared. Try again.'},503);}
};}
