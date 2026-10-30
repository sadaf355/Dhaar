import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedDeposits, type Deposit } from '../data/seed';

export type FindingRecord={id:string;depositId:string;ruleId:string;title:string;severity:'Critical'|'High'|'Medium'|'Low';status:'Open'|'Resolved'|'Waiver pending approval'|'Waived';detail:string;waiverReason?:string;waiverRequestedBy?:string;waiverApprovedBy?:string;createdAt:string};
export type ReleaseCase={id:string;depositId:string;stage:'Requested'|'Maker checked'|'Checker approved'|'Authority approved'|'Bank acknowledged'|'Reconciled'|'On hold';hold:boolean;holdReason?:string;refundAccount:string;refundVerified:boolean;refundName?:string;expectedRefundName?:string;refundNameMatch?:boolean;maker?:string;checker?:string;approver?:string;noc:boolean;updated:string};
export type HoldRecord={id:string;scope:'Instrument'|'Institution';targetId:string;reason:string;status:'Active'|'Released';createdAt:string;createdBy:string;releasedAt?:string;releasedBy?:string};
export type AuditEvent={id:number;title:string;detail:string;time:string;kind:string;actor:string;hash:string;previousHash:string};
const initialReleaseCases:ReleaseCase[]=[{id:'REL-1007',depositId:'DHAAR-24076',stage:'Requested',hold:false,refundAccount:'•••• 4821',refundVerified:true,noc:false,updated:'2026-10-29'},{id:'REL-1006',depositId:'DHAAR-24080',stage:'On hold',hold:true,holdReason:'Demo dispute hold',refundAccount:'Not verified',refundVerified:false,noc:false,updated:'2026-10-28'}];

// Synchronous SHA-256 keeps the local event chain deterministic without asynchronous state races.
export function sha256(ascii:string):string {
 const math=Math, K:number[]=[];for(let n=2,c=0;c<64;n++){let prime=true;for(let d=2;d*d<=n;d++)if(n%d===0){prime=false;break}if(prime)K[c++]=Math.floor((math.cbrt(n)%1)*0x100000000)}
 const bytes=Array.from(new TextEncoder().encode(ascii));const words:number[]=[];const bitLen=bytes.length*8;for(let i=0;i<bytes.length;i++)words[i>>2]=(words[i>>2]||0)|(bytes[i]&255)<<(24-(i%4)*8);words[bitLen>>5]=(words[bitLen>>5]||0)|0x80<<(24-bitLen%32);words[((bitLen+64>>9)<<4)+15]=bitLen;
 const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const W=new Array(64);
 for(let j=0;j<words.length;j+=16){for(let i=0;i<16;i++)W[i]=words[j+i]|0;for(let i=16;i<64;i++){const x=W[i-15],y=W[i-2],s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3),s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10);W[i]=(W[i-16]+s0+W[i-7]+s1)|0}
 let [a,b,c,d,e,f,g,h]=H;for(let i=0;i<64;i++){const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)),ch=(e&f)^(~e&g),t1=(h+S1+ch+K[i]+W[i])|0,S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)),maj=(a&b)^(a&c)^(b&c),t2=(S0+maj)|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0}const vals=[a,b,c,d,e,f,g,h];for(let i=0;i<8;i++)H[i]=(H[i]+vals[i])|0}
 return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
const eventPayload=(e:Omit<AuditEvent,'hash'>)=>`${e.previousHash}|${e.id}|${e.title}|${e.detail}|${e.time}|${e.kind}|${e.actor}`;
const firstEventBase={id:1,title:'Workspace initialized',detail:'Synthetic DHAAR portfolio loaded',time:'10:00 AM',kind:'info',actor:'System',previousHash:'GENESIS'};
const initialEvents:AuditEvent[]=[{...firstEventBase,hash:sha256(eventPayload(firstEventBase))}];

type Store={deposits:Deposit[];addDeposit:(d:Deposit)=>void;updateDeposit:(id:string,patch:Partial<Deposit>)=>void;simulatedDate:string;setSimulatedDate:(date:string)=>void;resetDemo:()=>void;events:AuditEvent[];verifyAudit:()=>boolean;role:string;setRole:(role:string)=>void;addEvent:(title:string,detail:string,kind?:string)=>void;findings:FindingRecord[];addFinding:(f:FindingRecord)=>void;updateFinding:(id:string,patch:Partial<FindingRecord>)=>void;releaseCases:ReleaseCase[];upsertReleaseCase:(c:ReleaseCase)=>void;holds:HoldRecord[];upsertHold:(h:HoldRecord)=>void;theme:'light'|'dark';setTheme:(theme:'light'|'dark')=>void;}
export const useDhaarStore=create<Store>()(persist((set,get)=>({
 deposits:seedDeposits,addDeposit:(d)=>set(s=>({deposits:[d,...s.deposits]})),updateDeposit:(id,patch)=>set(s=>({deposits:s.deposits.map(d=>d.id===id?{...d,...patch}:d)})),
 simulatedDate:'2026-10-30',setSimulatedDate:(date)=>set({simulatedDate:date}),
 events:initialEvents,role:'Institution Admin',setRole:(role)=>set({role}),
 addEvent:(title,detail,kind='info')=>set(s=>{const id=Math.max(Date.now(),(s.events[0]?.id||0)+1),time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),previousHash=s.events[0]?.hash||'GENESIS',base={id,title,detail,time,kind,actor:s.role,previousHash},event={...base,hash:sha256(eventPayload(base))},all=[event,...s.events];return {events:all.slice(0,300)}}),
 verifyAudit:()=>{const rows=[...get().events].reverse();for(let i=0;i<rows.length;i++){const e=rows[i];if(i>0&&e.previousHash!==rows[i-1].hash)return false;if(e.hash!==sha256(eventPayload(e)))return false;}return true;},
 findings:[],addFinding:(f)=>set(s=>({findings:[f,...s.findings.filter(x=>x.id!==f.id)]})),updateFinding:(id,patch)=>set(s=>({findings:s.findings.map(f=>f.id===id?{...f,...patch}:f)})),
 releaseCases:initialReleaseCases,upsertReleaseCase:(c)=>set(s=>({releaseCases:[c,...s.releaseCases.filter(x=>x.id!==c.id)]})),
 holds:[{id:'HOLD-1001',scope:'Instrument',targetId:'DHAAR-24080',reason:'Demo dispute hold',status:'Active',createdAt:'2026-10-28',createdBy:'Regional Officer'}],
 upsertHold:(h)=>set(s=>({holds:[h,...s.holds.filter(x=>x.id!==h.id)]})),
 theme:'light',setTheme:(theme)=>set({theme}),
 resetDemo:()=>set({deposits:seedDeposits,simulatedDate:'2026-10-30',findings:[],releaseCases:initialReleaseCases,holds:[{id:'HOLD-1001',scope:'Instrument',targetId:'DHAAR-24080',reason:'Demo dispute hold',status:'Active',createdAt:'2026-10-28',createdBy:'Regional Officer'}],theme:'light',role:'Institution Admin',events:initialEvents})
}),{name:'dhaar-demo-v3',version:3,merge:(persisted,current)=>({...current,...(persisted as Partial<Store>)})}));
