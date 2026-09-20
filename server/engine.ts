import { randomInt, randomUUID, createHash } from 'node:crypto';
import { phases, type Game, type Board, type Profile, type Action, type Dice, type Attack } from '../src/types';
export class GameError extends Error { constructor(message:string, public status=400){super(message);} }
export function ensure(value:unknown,message:string,status=400):asserts value { if(!value)throw new GameError(message,status); }
export function integer(value:unknown,min:number,max:number){ensure(typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max,`Enter a whole number from ${min} to ${max}.`);return value;}
export function nameOf(value:unknown){ensure(typeof value==='string'&&value.trim().length>0&&value.trim().length<=40,'Enter a name (1–40 characters).');return value.trim();}
export const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
export type Stored = Game & { secrets: Record<string,string>; previous: Board|null; receipts:string[] };
export function publicGame(s:Stored):Game {const {secrets,previous,receipts,...g}=s;return {...g,canUndo:!!previous};}
export function snapshot(g:Game):Board {return structuredClone({status:g.status,players:g.players,order:g.order,turn:g.turn,round:g.round,phase:g.phase,checks:g.checks,attack:g.attack});}
export function createGame(code:string,name:string,token:string):Stored {const id=randomUUID(); return {code,host:id,version:0,status:'lobby',players:[{id,name:nameOf(name),cp:0,vp:0}],order:[id],turn:0,round:1,phase:0,checks:[],attack:null,history:[],undo:null,canUndo:false,expiresAt:Date.now()+7*86400000,secrets:{[id]:hash(token)},previous:null,receipts:[]};}
export function authenticate(g:Stored,token:string){const id=Object.keys(g.secrets).find(id=>g.secrets[id]===hash(token));ensure(id,'This device is not a player in this game.',403);return id;}
export function join(g:Stored,name:string,token:string){const found=Object.keys(g.secrets).find(id=>g.secrets[id]===hash(token));if(found)return found;ensure(g.status==='lobby'&&g.players.length<2,'This room is full or the battle has already started.',409);const id=randomUUID();g.players.push({id,name:nameOf(name),cp:0,vp:0});g.order.push(id);g.secrets[id]=hash(token);g.version++;return id;}
export function woundTarget(s:number,t:number){return s>=2*t?2:s>t?3:s===t?4:2*s<=t?6:5;}
function profileOf(value:unknown):Profile {ensure(value&&typeof value==='object','Choose a weapon profile.');const p=value as Profile;const out:Profile={name:nameOf(p.name), attacks:integer(p.attacks,1,200),hit:integer(p.hit,2,6),strength:integer(p.strength,1,30),toughness:integer(p.toughness,1,30),ap:integer(p.ap,-6,0),save:integer(p.save,2,7),invuln:integer(p.invuln,0,6),damage:integer(p.damage,1,20),lethal:!!p.lethal,sustained:!!p.sustained,devastating:!!p.devastating,reroll:!!p.reroll};ensure(out.invuln!==1,'Invulnerable saves are 2+ to 6+, or none.');return out;}
function dice(count:number,a:Action,rng:()=>number):number[]{ensure(a.mode==='digital'||a.mode==='physical','Choose digital or physical dice.');if(a.mode==='physical'){ensure(Array.isArray(a.faces)&&a.faces.length===count,`Enter exactly ${count} dice results.`);return a.faces.map(v=>integer(v,1,6));}return Array.from({length:count},rng);}
function rollAttack(at:Attack,a:Action,rng:()=>number):Dice {
 let count=0,target=0;const stage=at.stage;
 if(stage==='hits'){count=at.profile.attacks;target=at.profile.hit;}
 else if(stage==='wounds'){count=at.hits-at.auto;target=woundTarget(at.profile.strength,at.profile.toughness);}
 else {ensure(stage==='saves','No dice are needed for this step.');count=at.wounds;target=at.profile.save-at.profile.ap;if(at.profile.invuln)target=Math.min(target,at.profile.invuln);}
 let faces=dice(count,a,rng);const originals=[...faces];if(stage==='hits'&&at.profile.reroll&&a.mode==='digital')faces=faces.map(v=>v===1?rng():v);
 if(stage==='hits'){const crit=faces.filter(v=>v===6).length;at.hits=faces.filter(v=>v>=target).length+(at.profile.sustained?crit:0);at.auto=at.profile.lethal?crit:0;at.stage='wounds';}
 else if(stage==='wounds'){at.dev=at.profile.devastating?faces.filter(v=>v===6).length:0;at.wounds=at.auto+faces.filter(v=>v>=target).length-at.dev;at.stage='saves';}
 else {at.failed=faces.filter(v=>v===1||v<target).length;at.damage=(at.failed+at.dev)*at.profile.damage;at.stage='damage';}
 const result:Dice={faces,originals,target,label:stage,mode:String(a.mode)};at.dice.push(result);return result;
}
export function apply(g:Stored,id:string,a:Action,rng=()=>randomInt(1,7)) {
 ensure(g.players.some(p=>p.id===id),'Not a player.',403);const who=g.players.find(p=>p.id===id)!;let text='',roll:Dice|undefined;
 if(a.type==='undo-request'){ensure(g.previous&&!g.undo,'There is no action to undo.');g.undo={by:id,label:g.history.at(-1)?.text||'last action'};g.version++;return;}
 if(a.type==='undo-answer'){ensure(g.undo&&g.undo.by!==id,'The other player must answer.',403);ensure(typeof a.accept==='boolean','Choose accept or reject.');if(a.accept){ensure(g.previous,'Nothing to restore.');Object.assign(g,structuredClone(g.previous));text=`${who.name} approved undo. Previous game state restored.`;g.previous=null;}else text=`${who.name} declined undo.`;g.undo=null;}
 else {
 ensure(!g.undo,'Answer the undo request first.',409);ensure(g.status!=='ended','This game has ended.');const previous=snapshot(g);
 switch(a.type){
 case 'start':ensure(id===g.host&&g.status==='lobby'&&g.players.length===2,'Both players must join; only the host can start.',403);ensure(g.order.includes(String(a.first)),'Choose the first player.');g.order=[String(a.first),...g.order.filter(x=>x!==a.first)];g.status='battle';text=`Battle started. ${g.players.find(p=>p.id===a.first)!.name} goes first.`;break;
 case 'check':ensure(g.status==='battle'&&id===g.order[g.turn],'The active player controls the checklist.',403);ensure(typeof a.key==='string'&&a.key.length<60,'Invalid checklist item.');g.checks=g.checks.includes(a.key)?g.checks.filter(x=>x!==a.key):[...g.checks,a.key];text=`${who.name} updated the ${phases[g.phase]} checklist.`;break;
 case 'next':ensure(g.status==='battle'&&id===g.order[g.turn],'Only the active player can finish the phase.',403);ensure(!g.attack||g.attack.stage==='done','Finish the current attack first.');g.attack=null;g.checks=[];g.phase++;if(g.phase===phases.length){g.phase=0;g.turn++;if(g.turn===g.order.length){g.turn=0;g.round++;}}text=`Round ${g.round}: ${g.players.find(p=>p.id===g.order[g.turn])!.name}, ${phases[g.phase]} phase.`;break;
 case 'score':ensure(g.status==='battle','Start the battle first.');ensure(a.stat==='cp'||a.stat==='vp','Unknown score.');who[a.stat]=integer(a.value,0,999);text=`${who.name}: ${a.stat.toUpperCase()} set to ${a.value}.`;break;
 case 'attack':ensure(g.status==='battle'&&(g.phase===2||g.phase===4),'Use attacks during Shooting or Fight.');ensure(g.phase===4||id===g.order[g.turn],'Only the active player shoots.',403);ensure(!g.attack||g.attack.stage==='done','Finish the current attack first.');g.attack={attacker:id,defender:g.players.find(p=>p.id!==id)!.id,profile:profileOf(a.profile),stage:'hits',dice:[],hits:0,auto:0,wounds:0,dev:0,failed:0,damage:0};text=`${who.name} attacks with ${g.attack.profile.name}.`;break;
 case 'roll':ensure(g.attack,'Start an attack first.');ensure(id===(g.attack.stage==='saves'?g.attack.defender:g.attack.attacker),'Waiting for the other player to roll.',403);roll=rollAttack(g.attack,a,rng);text=`${who.name} rolled ${roll.faces.length} ${roll.label} dice (${roll.mode}).`;break;
 case 'damage':ensure(g.attack?.stage==='damage'&&id===g.attack.defender,'The defending player must apply damage.',403);g.attack.stage='done';text=`${who.name} acknowledged ${g.attack.damage} potential damage. Allocate per attack on the tabletop; excess does not carry between models.`;break;
 case 'note':ensure(g.status==='battle','Start the battle first.');ensure(typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=300,'Notes must be 1–300 characters.');text=`${who.name}: ${a.text.trim()}`;break;
 case 'end':ensure(id===g.host&&g.status==='battle','Only the host can end a battle.',403);ensure(!g.attack||g.attack.stage==='done','Finish the attack before ending the battle.');g.status='ended';text=`${who.name} ended the battle.`;break;
 default:throw new GameError('Unknown action.');
 }g.previous=previous;
 }
 g.version++;g.history.push({id:randomUUID(),at:new Date().toISOString(),text,...(roll?{dice:roll}:{})});g.history=g.history.slice(-250);
}
