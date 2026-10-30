import type { Deposit } from '../data/seed';
export type BankResponse = { amount:string; issueDate:string; maturityDate:string; holder:string; lien:boolean };
export function canRequestBankConfirmation(role:string, grade:Deposit['grade']):boolean { return role==='Regional Officer' && grade==='E1'; }
export function canRespondToBankRequest(role:string, grade:Deposit['grade'], status:string|undefined, expired:boolean):boolean { return role==='Bank Verifier' && grade==='E1' && status==='Requested' && !expired; }
export function compareBankResponse(declared:Deposit, response:BankResponse) {
 const checks=[
  {field:'Amount',match:response.amount.trim()!==''&&Number(response.amount)===declared.amount},
  {field:'Issue date',match:!!response.issueDate&&response.issueDate===declared.issueDate},
  {field:'Maturity date',match:!!response.maturityDate&&response.maturityDate===declared.maturityDate},
  {field:'Holder name(s)',match:!!response.holder.trim()&&response.holder.trim().toLowerCase()===declared.holder.trim().toLowerCase()},
  {field:'Lien / encumbrance',match:response.lien===declared.lien&&response.lien}
 ];
 return {matches:checks.every(c=>c.match),mismatches:checks.filter(c=>!c.match).map(c=>c.field)};
}
export function canMakerCheck(role:string, checker?:string):boolean { return role==='Regional Officer' && role!==checker; }
export function canCheckerApprove(role:string, maker?:string):boolean { return role==='Checker' && role!==maker; }
export function canAuthorityApprove(role:string, maker?:string, checker?:string):boolean { return role==='Approving Authority' && role!==maker && role!==checker; }

export function nextGradeAfterBankResponse(current:Deposit['grade'], matching:boolean):Deposit['grade'] {
 return current==='E1'&&matching?'E2':current;
}

export function isReleaseBlocked(input:{eligible:boolean;caseHold:boolean;activeHoldCount:number;refundNameMatches:boolean;depositHoldCount:number}):boolean {
 return !input.eligible||input.caseHold||input.activeHoldCount>0||!input.refundNameMatches||input.depositHoldCount>0;
}
