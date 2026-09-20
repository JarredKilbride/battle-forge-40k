import type { Game, Session, Action } from './types';
export async function request(token:string,body:Record<string,unknown>):Promise<{game:Game;playerId:string}>{
 const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 let data;try{data=await r.json();}catch{throw new Error('Game server is not running. Use npm run dev locally or deploy the complete project to Netlify.');}
 if(!r.ok)throw Object.assign(new Error(data.error||'Unable to update game.'),{status:r.status});return data;
}
export const readGame=(s:Session)=>request(s.token,{op:'read',code:s.code});
export const sendAction=(s:Session,version:number,action:Action,requestId:string)=>request(s.token,{op:'act',code:s.code,version,action,requestId});
export function load<T>(key:string,fallback:T):T {try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
export function save(key:string,data:unknown){localStorage.setItem(key,JSON.stringify(data));}
