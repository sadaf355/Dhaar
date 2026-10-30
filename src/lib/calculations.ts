import type { Deposit } from '../data/seed';
import { isAssured } from './assurance';
import { demoRulesConfig } from './rulesConfig';
export function daysToMaturity(maturityDate:string, simulatedDate:string):number {
 const a=new Date(`${simulatedDate}T00:00:00Z`).getTime(), b=new Date(`${maturityDate}T00:00:00Z`).getTime();
 if(!Number.isFinite(a)||!Number.isFinite(b)) return 0;
 return Math.ceil((b-a)/86400000);
}
export function isVerifiedHeld(d:Deposit, simulatedDate:string):boolean {
 return (d.grade==='E2'||d.grade==='E3') && d.lien && daysToMaturity(d.maturityDate,simulatedDate)>0 && d.status!=='Matured' && d.bankRequestStatus!=='Mismatch' && !d.finding && isAssured(d.lastAttestedDate,simulatedDate,demoRulesConfig.assuranceWindowDays);
}
export function verifiedHeldValue(deposits:Deposit[], simulatedDate:string):number { return deposits.filter(d=>isVerifiedHeld(d,simulatedDate)).reduce((s,d)=>s+d.amount,0); }
export function assuranceState(d:Deposit, simulatedDate:string, windowDays=180):'Assured'|'Stale'|'Unassured' {
 if(d.grade!=='E2'&&d.grade!=='E3') return 'Unassured';
 return isAssured(d.lastAttestedDate,simulatedDate,windowDays)?'Assured':'Stale';
}

export type MaturityAlertStage='T-180'|'T-90'|'T-60'|'T-30'|'T-7'|'T-0'|'Overdue';
export function maturityAlertStage(days:number):MaturityAlertStage|null {
 if(days<0)return 'Overdue';
 if(days===0)return 'T-0';
 if(days<=7)return 'T-7';
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
  assuranceState(d,simulatedDate,windowDays)==='Assured' && !d.finding && d.bankRequestStatus!=='Mismatch' && !d.releaseClosed;
}
