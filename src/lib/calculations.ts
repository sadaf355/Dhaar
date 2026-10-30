import type { Deposit } from '../data/seed';
import { isAssured } from './assurance';
import { demoRulesConfig } from './rulesConfig';
export function daysToMaturity(maturityDate:string, simulatedDate:string):number {
 const a=new Date(`${simulatedDate}T00:00:00Z`).getTime(), b=new Date(`${maturityDate}T00:00:00Z`).getTime();
 if(!Number.isFinite(a)||!Number.isFinite(b)) return 0;
 return Math.ceil((b-a)/86400000);
}

export function calculateRenewalGapDays(successorIssueDate: string | Date, predecessorMaturityDate: string | Date): number {
  const succ = typeof successorIssueDate === 'string' ? new Date(`${successorIssueDate}T00:00:00Z`).getTime() : successorIssueDate.getTime();
  const pred = typeof predecessorMaturityDate === 'string' ? new Date(`${predecessorMaturityDate}T00:00:00Z`).getTime() : predecessorMaturityDate.getTime();
  if (!Number.isFinite(succ) || !Number.isFinite(pred)) return 0;
  const rawDiffDays = Math.floor((succ - pred) / 86400000);
  return Math.max(0, rawDiffDays);
}

export function isDuplicate(d:Deposit, deposits:Deposit[]):boolean {
 return deposits.some(x =>
  x.id !== d.id &&
  x.bank.trim().toLowerCase() === d.bank.trim().toLowerCase() &&
  x.fdrNo.trim().toLowerCase() === d.fdrNo.trim().toLowerCase() &&
  (x.submitted < d.submitted || (x.submitted === d.submitted && x.id < d.id))
 );
}

export function isVerifiedHeld(d:Deposit, simulatedDate:string, deposits?:Deposit[]):boolean {
 return (d.grade==='E2'||d.grade==='E3') &&
  d.lien &&
  d.issueDate <= simulatedDate &&
  daysToMaturity(d.maturityDate,simulatedDate)>0 &&
  d.status!=='Matured' &&
  d.status!=='Released' &&
  d.bankRequestStatus!=='Mismatch' &&
  !d.finding &&
  isAssured(d.lastAttestedDate,simulatedDate,demoRulesConfig.assuranceWindowDays) &&
  (!deposits || !isDuplicate(d, deposits));
}

export function verifiedHeldValue(deposits:Deposit[], simulatedDate:string):number {
 return deposits.filter(d=>isVerifiedHeld(d,simulatedDate,deposits)).reduce((s,d)=>s+d.amount,0);
}

export function assuranceState(d:Deposit, simulatedDate:string, windowDays=180):'Assured'|'Stale'|'Unassured' {
 if(d.grade!=='E2'&&d.grade!=='E3') return 'Unassured';
 return isAssured(d.lastAttestedDate,simulatedDate,windowDays)?'Assured':'Stale';
}

export type MaturityAlertStage='T-180'|'T-90'|'T-60'|'T-30'|'T-15'|'T-7'|'T-0'|'Overdue';
export function maturityAlertStage(days:number):MaturityAlertStage|null {
 if(days<0)return 'Overdue';
 if(days===0)return 'T-0';
 if(days<=7)return 'T-7';
 if(days<=15)return 'T-15';
 if(days<=30)return 'T-30';
 if(days<=60)return 'T-60';
 if(days<=90)return 'T-90';
 if(days<=180)return 'T-180';
 return null;
}

export function maturityNotifications(deposits:Deposit[],simulatedDate:string){
 return deposits.map(d=>({id:`MAT-${d.id}`,depositId:d.id,institution:d.institution,maturityDate:d.maturityDate,days:daysToMaturity(d.maturityDate,simulatedDate),stage:maturityAlertStage(daysToMaturity(d.maturityDate,simulatedDate)),grade:d.grade})).filter(x=>x.stage!==null).sort((a,b)=>a.days-b.days);
}

export function isReleaseEligible(d:Deposit, simulatedDate:string, windowDays=180):boolean {
 return (d.grade==='E2'||d.grade==='E3') && d.lien && daysToMaturity(d.maturityDate,simulatedDate)<=0 &&
  assuranceState(d,simulatedDate,windowDays)==='Assured' && !d.finding && d.bankRequestStatus!=='Mismatch' && !d.releaseClosed && d.status!=='Released';
}

// B7: normalizeName and similarity (token set ratio)
export function normalizeName(name:string):string {
 if(!name) return '';
 let s = name.toLowerCase();
 // strip dots between letters in acronyms like s.i.e.s. or a.i.c.t.e.
 s = s.replace(/([a-z0-9])\.+(?=[a-z0-9])/g, '$1');
 // strip other punctuation
 s = s.replace(/[^a-z0-9\s]/g, ' ');
 // remove "the" as standalone word
 s = s.replace(/\bthe\b/g, ' ');
 // expand common abbreviations like GST
 const abbrevs: Record<string, string> = {
  gst: 'graduate school of technology',
  tech: 'technology',
  inst: 'institute',
  engg: 'engineering',
  eng: 'engineering',
  coll: 'college',
  univ: 'university',
  corp: 'corporation',
  ltd: 'limited',
  pvt: 'private'
 };
 for(const [abbr, full] of Object.entries(abbrevs)) {
  s = s.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
 }
 // collapse spaces
 return s.replace(/\s+/g, ' ').trim();
}

function levenshtein(a:string, b:string):number {
 const m=a.length, n=b.length;
 if(m===0) return n;
 if(n===0) return m;
 const dp:number[][] = Array.from({length:m+1}, ()=>new Array(n+1).fill(0));
 for(let i=0;i<=m;i++) dp[i][0]=i;
 for(let j=0;j<=n;j++) dp[0][j]=j;
 for(let i=1;i<=m;i++){
  for(let j=1;j<=n;j++){
   const cost = a[i-1]===b[j-1]?0:1;
   dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
  }
 }
 return dp[m][n];
}

function strSimilarity(s1:string, s2:string):number {
 if(s1===s2) return 1;
 const maxLen = Math.max(s1.length, s2.length);
 if(maxLen===0) return 1;
 return 1 - (levenshtein(s1, s2) / maxLen);
}

export function similarity(a:string, b:string):number {
 const normA = normalizeName(a);
 const normB = normalizeName(b);
 if(!normA && !normB) return 1;
 if(!normA || !normB) return 0;
 if(normA === normB) return 1;

 const setA = new Set(normA.split(' ').filter(Boolean));
 const setB = new Set(normB.split(' ').filter(Boolean));

 const intersect = new Set([...setA].filter(x => setB.has(x)));
 if(intersect.size === setA.size && intersect.size === setB.size) return 1;

 const s0 = [...intersect].sort().join(' ');
 const s1 = [...setA].sort().join(' ');
 const s2 = [...setB].sort().join(' ');

 // Token set ratio compares s0 with s1 and s2, and s1 with s2
 const scores = [
  strSimilarity(s0, s1),
  strSimilarity(s0, s2),
  strSimilarity(s1, s2)
 ];
 return Math.max(...scores);
}

export function holderNameMatchScore(declared:string, response:string): { status: 'Match'|'Review'|'Mismatch'; similarity: number } {
 const normA = normalizeName(declared);
 const normB = normalizeName(response);
 if(normA === normB && normA.length > 0) {
  return { status: 'Match', similarity: 1.0 };
 }
 const sim = similarity(declared, response);
 if(sim >= 0.9) return { status: 'Match', similarity: sim };
 if(sim >= 0.75) return { status: 'Review', similarity: sim };
 return { status: 'Mismatch', similarity: sim };
}

