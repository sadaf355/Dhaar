import type { Deposit } from '../data/seed';
import { holderNameMatchScore } from './calculations';

export type BankResponse = {
 amount:string;
 issueDate:string;
 maturityDate:string;
 holder:string;
 lien:boolean;
 holderDiscrepancyAccepted?:boolean;
 holderDiscrepancyReason?:string;
};

export function canRequestBankConfirmation(role:string, grade:Deposit['grade'], isExpired=false, status?:string):boolean {
 if(role !== 'Regional Officer' || grade !== 'E1') return false;
 if(status === 'Attested') return false;
 if(status === 'Requested') return isExpired;
 return true;
}

export function canRespondToBankRequest(role:string, grade:Deposit['grade'], status:string|undefined, expired:boolean):boolean {
 return role==='Bank Verifier' && grade==='E1' && status==='Requested' && !expired;
}

export function compareBankResponse(declared:Deposit, response:BankResponse) {
 const holderCheck = holderNameMatchScore(declared.holder, response.holder);
 const holderValid = holderCheck.status === 'Match' || (holderCheck.status === 'Review' && !!response.holderDiscrepancyAccepted);

 const checks=[
  {field:'Amount',match:response.amount.trim()!==''&&Number(response.amount)===declared.amount},
  {field:'Issue date',match:!!response.issueDate&&response.issueDate===declared.issueDate},
  {field:'Maturity date',match:!!response.maturityDate&&response.maturityDate===declared.maturityDate},
  {field:'Holder name(s)',match:!!response.holder.trim() && holderValid, holderStatus: holderCheck.status, holderSimilarity: holderCheck.similarity},
  {field:'Lien / encumbrance',match:response.lien===declared.lien&&response.lien}
 ];
 return {
  matches:checks.every(c=>c.match),
  mismatches:checks.filter(c=>!c.match).map(c=>c.field),
  holderStatus: holderCheck.status,
  holderSimilarity: holderCheck.similarity
 };
}

export function canMakerCheck(role:string, checker?:string):boolean { return role==='Regional Officer' && role!==checker; }
export function canCheckerApprove(role:string, maker?:string):boolean { return role==='Checker' && role!==maker; }
export function canAuthorityApprove(role:string, maker?:string, checker?:string):boolean { return role==='Approving Authority' && role!==maker && role!==checker; }

// B2: Release case-hold and refund-verified gating
export function canToggleCaseHold(role:string, currentHold:boolean, newHold:boolean):boolean {
 if(newHold === true) {
  // Regional Officer or Approving Authority can set hold
  return role === 'Regional Officer' || role === 'Approving Authority';
 } else {
  // Only Approving Authority may clear
  return role === 'Approving Authority';
 }
}

export function canVerifyRefund(role:string):boolean {
 return role === 'Accounts Officer';
}

export function nextGradeAfterBankResponse(current:Deposit['grade'], matching:boolean):Deposit['grade'] {
 return current==='E1'&&matching?'E2':current;
}

export function isReleaseBlocked(input:{eligible:boolean;caseHold:boolean;activeHoldCount:number;refundNameMatches:boolean;depositHoldCount:number}):boolean {
 return !input.eligible||input.caseHold||input.activeHoldCount>0||!input.refundNameMatches||input.depositHoldCount>0;
}

// User segregation of duties helpers
export function canPerformReleaseStep(
 step: 'maker' | 'checker' | 'authority',
 currentUserId: string,
 existing: { makerUserId?: string; checkerUserId?: string; approverUserId?: string }
): boolean {
 if(!currentUserId) return false;
 if (step === 'maker') {
  return currentUserId !== existing.checkerUserId && currentUserId !== existing.approverUserId;
 }
 if (step === 'checker') {
  return currentUserId !== existing.makerUserId && currentUserId !== existing.approverUserId;
 }
 if (step === 'authority') {
  return currentUserId !== existing.makerUserId && currentUserId !== existing.checkerUserId;
 }
 return false;
}

export function canApproveWaiver(
 approverUserId: string,
 waiverRequestedByUserId?: string,
 role?: string
): boolean {
 if (role && role !== 'Approving Authority') return false;
 if (!waiverRequestedByUserId) return true;
 return approverUserId !== waiverRequestedByUserId;
}

export function isInstitutionScopedRecord(
 recordInstitutionCode: string,
 user: { role: string; institutionCode?: string }
): boolean {
 if (user.role === 'Institution Admin') {
  return !!user.institutionCode && recordInstitutionCode === user.institutionCode;
 }
 return true;
}


