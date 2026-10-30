import { describe, it, expect } from 'vitest';
import { seedDeposits } from '../../data/seed';
import { daysToMaturity, isVerifiedHeld, verifiedHeldValue, assuranceState } from '../calculations';
import { evaluateRules } from '../rules';
import { maturityAlertStage, isReleaseEligible } from '../calculations';
import { canRequestBankConfirmation, canRespondToBankRequest, compareBankResponse, nextGradeAfterBankResponse, canMakerCheck, canCheckerApprove, canAuthorityApprove, isReleaseBlocked } from '../workflow';
import { sha256, useDhaarStore } from '../../context/useDhaarStore';
const date='2026-10-30';
describe('DHAAR shared calculations',()=>{
 it('calculates days to maturity from simulated date',()=>expect(daysToMaturity('2026-11-09',date)).toBe(10));
 it('does not count E0/E1 as verified-held',()=>expect(seedDeposits.filter(d=>d.grade==='E0'||d.grade==='E1').every(d=>!isVerifiedHeld(d,date))).toBe(true));
 it('returns a number for verified-held amount',()=>expect(verifiedHeldValue(seedDeposits,date)).toBeGreaterThanOrEqual(0));
 it('marks old attestations stale',()=>expect(assuranceState({...seedDeposits[0],lastAttestedDate:'2025-01-01'},date)).toBe('Stale'));
});
describe('DHAAR rule evaluation',()=>{
 it('returns the 26-rule catalogue',()=>expect(evaluateRules(seedDeposits[0],{deposits:seedDeposits,simulatedDate:date})).toHaveLength(26));
 it('flags a duplicate bank + instrument reference',()=>{const d={...seedDeposits[0],id:'TEST-DUP'};expect(evaluateRules(d,{deposits:[...seedDeposits,d],simulatedDate:date}).find(r=>r.id==='R02')?.status).toBe('review')});
 it('blocks insufficient amount and short tenure',()=>{const d={...seedDeposits[0],amount:1,issueDate:'2026-10-01',maturityDate:'2026-10-10'};const r=evaluateRules(d,{deposits:[d],simulatedDate:date});expect(r.find(x=>x.id==='R06')?.status).toBe('review');expect(r.find(x=>x.id==='R07')?.status).toBe('review')});
});

describe('DHAAR workflow gates',()=>{
 const d={...seedDeposits[0],grade:'E1' as const,bankRequestStatus:'Requested' as const};
 it('allows only a Regional Officer to request a bank confirmation for E1',()=>{
  expect(canRequestBankConfirmation('Regional Officer','E1')).toBe(true);
  expect(canRequestBankConfirmation('Bank Verifier','E1')).toBe(false);
  expect(canRequestBankConfirmation('Regional Officer','E0')).toBe(false);
 });
 it('allows only Bank Verifier to respond to a live E1 request',()=>{
  expect(canRespondToBankRequest('Bank Verifier','E1','Requested',false)).toBe(true);
  expect(canRespondToBankRequest('Regional Officer','E1','Requested',false)).toBe(false);
  expect(canRespondToBankRequest('Bank Verifier','E1','Requested',true)).toBe(false);
  expect(canRespondToBankRequest('Bank Verifier','E2','Requested',false)).toBe(false);
 });
 it('rejects blank or varied bank response fields',()=>{
  expect(compareBankResponse(d,{amount:'',issueDate:'',maturityDate:'',holder:'',lien:false}).matches).toBe(false);
  expect(compareBankResponse(d,{amount:String(d.amount+1),issueDate:d.issueDate,maturityDate:d.maturityDate,holder:d.holder,lien:d.lien}).mismatches).toContain('Amount');
  expect(compareBankResponse(d,{amount:String(d.amount),issueDate:d.issueDate,maturityDate:d.maturityDate,holder:d.holder,lien:true}).matches).toBe(true);
  expect(nextGradeAfterBankResponse('E1',true)).toBe('E2');
  expect(nextGradeAfterBankResponse('E1',false)).toBe('E1');
  expect(nextGradeAfterBankResponse('E0',true)).toBe('E0');
 });
 it('enforces distinct maker, checker and authority roles',()=>{
  expect(canMakerCheck('Regional Officer','Checker')).toBe(true);
  expect(canMakerCheck('Institution Admin')).toBe(false);
  expect(canCheckerApprove('Checker','Regional Officer')).toBe(true);
  expect(canCheckerApprove('Checker','Checker')).toBe(false);
  expect(canAuthorityApprove('Approving Authority','Regional Officer','Checker')).toBe(true);
  expect(canAuthorityApprove('Approving Authority','Regional Officer','Approving Authority')).toBe(false);
 });
 it('blocks release unless E2/E3, lien, term completion and fresh attestation are present',()=>{
  const matured={...seedDeposits[0],maturityDate:'2026-10-01',lastAttestedDate:date,grade:'E2' as const};
  expect(isReleaseEligible(matured,date)).toBe(true);
  expect(isReleaseEligible({...matured,grade:'E1'},date)).toBe(false);
  expect(isReleaseEligible({...matured,lien:false},date)).toBe(false);
  expect(isReleaseEligible({...matured,lastAttestedDate:'2025-01-01'},date)).toBe(false);
  expect(isReleaseEligible({...matured,bankRequestStatus:'Mismatch'},date)).toBe(false);
  expect(isReleaseBlocked({eligible:true,caseHold:false,activeHoldCount:0,refundNameMatches:true,depositHoldCount:0})).toBe(false);
  expect(isReleaseBlocked({eligible:true,caseHold:false,activeHoldCount:1,refundNameMatches:true,depositHoldCount:0})).toBe(true);
  expect(isReleaseBlocked({eligible:true,caseHold:false,activeHoldCount:0,refundNameMatches:false,depositHoldCount:0})).toBe(true);
 });
});
describe('DHAAR audit and alert ladder',()=>{
 it('uses SHA-256 (standard abc test vector)',()=>expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
 it('calculates maturity notification stages from T-180 to overdue',()=>{
  expect(maturityAlertStage(180)).toBe('T-180');
  expect(maturityAlertStage(90)).toBe('T-90');
  expect(maturityAlertStage(60)).toBe('T-60');
  expect(maturityAlertStage(30)).toBe('T-30');
  expect(maturityAlertStage(7)).toBe('T-7');
  expect(maturityAlertStage(0)).toBe('T-0');
  expect(maturityAlertStage(-1)).toBe('Overdue');
  expect(maturityAlertStage(181)).toBe(null);
 });
});

describe('DHAAR audit actor and rolling cap',()=>{
 it('attributes events to the active role and verifies the latest 300-event SHA-256 chain',()=>{
  const store=useDhaarStore.getState();store.resetDemo();store.setRole('Regional Officer');
  store.addEvent('Actor check','Regional Officer action','info');
  expect(useDhaarStore.getState().events[0].actor).toBe('Regional Officer');
  for(let i=0;i<305;i++)useDhaarStore.getState().addEvent('Cap test',String(i),'info');
  expect(useDhaarStore.getState().events).toHaveLength(300);
  expect(useDhaarStore.getState().verifyAudit()).toBe(true);
  useDhaarStore.getState().resetDemo();
 });
});
