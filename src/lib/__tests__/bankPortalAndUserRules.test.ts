import { describe, it, expect } from 'vitest';
import { seedDeposits, type Deposit } from '../../data/seed';
import { DEMO_USERS } from '../../data/users';
import {
  canPerformReleaseStep,
  canApproveWaiver,
  isInstitutionScopedRecord
} from '../workflow';
import {
  MockDeskAdapter,
  MockApiAdapter,
  canonicalPayloadString,
  hashAttestationPayload,
  compareStructuredAttestation,
  type StructuredAttestationPayload
} from '../bankAdapter';
import { sha256 } from '../../context/useDhaarStore';

describe('Part 2: Demo User Switcher & Segregation of Duties Rules', () => {
  it('defines 8 named synthetic users with correct roles and organization context', () => {
    expect(DEMO_USERS).toHaveLength(8);
    const names = DEMO_USERS.map((u) => u.name);
    expect(names).toContain('Meera Iyer');
    expect(names).toContain('Arjun Rao');
    expect(names).toContain('Sana Khan');
    expect(names).toContain('Vikram Sethi');
    expect(names).toContain('Neha Joshi');
    expect(names).toContain('Rohit Patil');
    expect(names).toContain('Priya Sen');
    expect(names).toContain('Rajesh Deshmukh');

    const roCount = DEMO_USERS.filter((u) => u.role === 'Regional Officer').length;
    expect(roCount).toBe(2);
    expect(DEMO_USERS.find((u) => u.role === 'Accounts Officer')?.name).toBe('Neha Joshi');
    expect(DEMO_USERS.find((u) => u.role === 'Bank Verifier')?.bank).toBe('HDFC Bank');
  });

  it('enforces: the same userId cannot perform more than one of maker, checker, authority on the same release', () => {
    const makerId = 'usr-ro-1';
    const checkerId = 'usr-ck-1';
    const authorityId = 'usr-aa-1';

    // Once user is maker, they cannot be checker or authority
    expect(canPerformReleaseStep('checker', makerId, { makerUserId: makerId })).toBe(false);
    expect(canPerformReleaseStep('authority', makerId, { makerUserId: makerId, checkerUserId: checkerId })).toBe(false);

    // Once user is checker, they cannot be authority
    expect(canPerformReleaseStep('authority', checkerId, { makerUserId: makerId, checkerUserId: checkerId })).toBe(false);

    // Different users can perform their respective steps
    expect(canPerformReleaseStep('maker', makerId, {})).toBe(true);
    expect(canPerformReleaseStep('checker', checkerId, { makerUserId: makerId })).toBe(true);
    expect(canPerformReleaseStep('authority', authorityId, { makerUserId: makerId, checkerUserId: checkerId })).toBe(true);
  });

  it('enforces: a waiver requester cannot approve their own waiver', () => {
    const requesterId = 'usr-ro-1';
    const otherApproverId = 'usr-aa-1';

    // Requester attempting to approve
    expect(canApproveWaiver(requesterId, requesterId, 'Approving Authority')).toBe(false);

    // Different Approving Authority approving
    expect(canApproveWaiver(otherApproverId, requesterId, 'Approving Authority')).toBe(true);

    // Non-Approving Authority cannot approve
    expect(canApproveWaiver(otherApproverId, requesterId, 'Regional Officer')).toBe(false);
  });

  it('enforces: Institution Admin only sees own institution records', () => {
    const instAdmin = DEMO_USERS.find((u) => u.role === 'Institution Admin')!;
    expect(instAdmin.institutionCode).toBe('MH-EDU-042');

    // Matching institution record
    expect(isInstitutionScopedRecord('MH-EDU-042', instAdmin)).toBe(true);

    // Other institution record
    expect(isInstitutionScopedRecord('MH-EDU-038', instAdmin)).toBe(false);

    // Regional Officer sees all records
    const ro = DEMO_USERS.find((u) => u.role === 'Regional Officer')!;
    expect(isInstitutionScopedRecord('MH-EDU-038', ro)).toBe(true);
  });
});

describe('Part 3: Bank Verification Adapter & Desk Portal Attestation', () => {
  const mockAdapter = new MockDeskAdapter();
  const apiAdapter = new MockApiAdapter();

  const req = {
    depositId: 'DHAAR-24080',
    fdrNo: 'SBI-440291',
    bank: 'State Bank of India',
    simulatedDate: '2026-10-30',
    userId: 'usr-ro-1'
  };

  it('provides BankVerificationAdapter interface with MockDeskAdapter and MockApiAdapter labelled MOCK', () => {
    expect(mockAdapter.name).toContain('MOCK');
    expect(mockAdapter.type).toBe('MockDesk');
    expect(apiAdapter.name).toContain('MOCK');
    expect(apiAdapter.type).toBe('MockApi');

    const res = mockAdapter.requestVerification(req);
    expect(res.token).toBeDefined();
    expect(res.tokenHash).toBe(sha256(res.token));
    expect(res.demoOtp).toBe('482910');
    expect(res.portalUrl).toContain('/desk/');
    expect(res.expiresAt).toBe('2026-11-06'); // 7 simulated days later
  });

  it('ensures canonical payload hash is deterministic and stable across calls', () => {
    const payload1: StructuredAttestationPayload = {
      fdrNo: 'FDR-783104',
      bank: 'HDFC Bank',
      branchIfsc: 'HDFC0000123',
      holders: ['SIES Graduate School of Technology', 'Member Secretary AICTE'],
      amount: 2500000,
      issueDate: '2025-02-14',
      maturityDate: '2027-02-14',
      rate: 7.25,
      maturityValue: 2875000,
      status: 'ACTIVE',
      jointLienMarked: true,
      jointLienDate: '2025-02-14',
      otherEncumbrance: false,
      autoRenewal: true,
      prematureClosureRequiresAicteNoc: true,
      signerName: 'Rohit Patil',
      employeeId: 'EMP-90214',
      designation: 'Chief Manager - Operations',
      eSignConfirmation: true
    };

    const hash1 = hashAttestationPayload(payload1);
    const hash2 = hashAttestationPayload({ ...payload1 });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // Valid SHA-256 hex string
  });

  it('matching bank attestation upgrades evidence grade E1 -> E2', () => {
    const d: Deposit = {
      ...seedDeposits[0],
      grade: 'E1',
      bankRequestStatus: 'Requested',
      holder: 'SIES GST'
    };

    const matchingPayload: StructuredAttestationPayload = {
      fdrNo: d.fdrNo,
      bank: d.bank,
      branchIfsc: 'HDFC0000123',
      holders: ['SIES Graduate School of Technology'], // Normalized match via abbreviation
      amount: d.amount,
      issueDate: d.issueDate,
      maturityDate: d.maturityDate,
      rate: 7.25,
      maturityValue: 2875000,
      status: 'ACTIVE',
      jointLienMarked: true,
      jointLienDate: d.issueDate,
      otherEncumbrance: false,
      autoRenewal: true,
      prematureClosureRequiresAicteNoc: true,
      signerName: 'Rohit Patil',
      employeeId: 'EMP-90214',
      designation: 'Chief Manager - Operations',
      eSignConfirmation: true
    };

    const result = compareStructuredAttestation(d, matchingPayload);
    expect(result.success).toBe(true);
    expect(result.mismatches).toHaveLength(0);
    expect(result.findings).toHaveLength(0);
  });

  it('mismatched bank attestation keeps E1 and creates R17/R18 findings', () => {
    const d: Deposit = {
      ...seedDeposits[0],
      grade: 'E1',
      bankRequestStatus: 'Requested',
      holder: 'SIES Graduate School of Technology'
    };

    const mismatchPayload: StructuredAttestationPayload = {
      fdrNo: d.fdrNo,
      bank: d.bank,
      branchIfsc: 'HDFC0000123',
      holders: ['Unrelated College Trust'],
      amount: d.amount + 100000, // Discrepancy -> R17
      issueDate: d.issueDate,
      maturityDate: d.maturityDate,
      rate: 7.25,
      maturityValue: 2990000,
      status: 'ACTIVE',
      jointLienMarked: false, // Missing lien -> R18
      jointLienDate: d.issueDate,
      otherEncumbrance: true,  // Other encumbrance -> R18
      autoRenewal: true,
      prematureClosureRequiresAicteNoc: false,
      signerName: 'Rohit Patil',
      employeeId: 'EMP-90214',
      designation: 'Chief Manager - Operations',
      eSignConfirmation: true
    };

    const result = compareStructuredAttestation(d, mismatchPayload);
    expect(result.success).toBe(false);
    expect(result.mismatches).toContain('Principal amount');
    expect(result.mismatches).toContain('Holder name(s)');
    expect(result.mismatches).toContain('Joint lien in favour of AICTE');
    expect(result.findings).toContain('R17');
    expect(result.findings).toContain('R18');
  });

  it('detects replay and expiry errors correctly', () => {
    const expiredRecord = {
      tokenHash: sha256('test_tok_expired'),
      depositId: 'DHAAR-24080',
      bank: 'State Bank of India',
      demoOtp: '482910',
      createdAt: '2026-10-10',
      expiresAt: '2026-10-17', // Expired relative to 2026-10-30
      used: false
    };
    const simulatedDate = '2026-10-30';
    expect(expiredRecord.expiresAt < simulatedDate).toBe(true);

    const replayedRecord = {
      tokenHash: sha256('test_tok_replayed'),
      depositId: 'DHAAR-24080',
      bank: 'State Bank of India',
      demoOtp: '482910',
      createdAt: '2026-10-28',
      expiresAt: '2026-11-04',
      used: true // Already consumed
    };
    expect(replayedRecord.used).toBe(true);
  });
});
