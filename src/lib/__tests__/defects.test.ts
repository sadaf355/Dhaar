import { describe, it, expect } from 'vitest';
import { seedDeposits, type Deposit } from '../../data/seed';
import {
  isVerifiedHeld,
  verifiedHeldValue,
  maturityAlertStage,
  isDuplicate,
  normalizeName,
  similarity,
  holderNameMatchScore
} from '../calculations';
import {
  canRequestBankConfirmation,
  canToggleCaseHold,
  canVerifyRefund
} from '../workflow';
import { sha256, useDhaarStore } from '../../context/useDhaarStore';

describe('B1: BankDesk request re-issue after expiry', () => {
  it('allows Regional Officer to send request when expired and resets to Requested', () => {
    expect(canRequestBankConfirmation('Regional Officer', 'E1', true, 'Requested')).toBe(true);
    // Non-expired requested should not allow re-request
    expect(canRequestBankConfirmation('Regional Officer', 'E1', false, 'Requested')).toBe(false);
  });
});

describe('B2: Release case-hold and refund-verified gating', () => {
  it('gates case-hold: Regional Officer or Approving Authority can hold; only Approving Authority can clear', () => {
    // Setting hold:
    expect(canToggleCaseHold('Regional Officer', false, true)).toBe(true);
    expect(canToggleCaseHold('Approving Authority', false, true)).toBe(true);
    expect(canToggleCaseHold('Checker', false, true)).toBe(false);
    expect(canToggleCaseHold('Accounts Officer', false, true)).toBe(false);

    // Clearing hold:
    expect(canToggleCaseHold('Approving Authority', true, false)).toBe(true);
    expect(canToggleCaseHold('Regional Officer', true, false)).toBe(false);
    expect(canToggleCaseHold('Checker', true, false)).toBe(false);
  });

  it('gates refund-verified checkbox to Accounts Officer only', () => {
    expect(canVerifyRefund('Accounts Officer')).toBe(true);
    expect(canVerifyRefund('Regional Officer')).toBe(false);
    expect(canVerifyRefund('Approving Authority')).toBe(false);
    expect(canVerifyRefund('Checker')).toBe(false);
  });
});

describe('B4: isVerifiedHeld and isDuplicate exclusion', () => {
  const d1: Deposit = {
    ...seedDeposits[0],
    id: 'DEP-ORIG',
    bank: 'HDFC Bank',
    fdrNo: 'FDR-DUP-1',
    submitted: '2026-10-01',
    grade: 'E2',
    lien: true,
    status: 'Active',
    lastAttestedDate: '2026-10-15',
    issueDate: '2025-01-01',
    maturityDate: '2027-01-01'
  };
  const d2: Deposit = {
    ...d1,
    id: 'DEP-DUP',
    submitted: '2026-10-05' // Later submission
  };

  it('identifies duplicate records and keeps only the earliest submitted', () => {
    const list = [d1, d2];
    expect(isDuplicate(d1, list)).toBe(false);
    expect(isDuplicate(d2, list)).toBe(true);
  });

  it('excludes duplicate records from isVerifiedHeld and verifiedHeldValue', () => {
    const list = [d1, d2];
    expect(isVerifiedHeld(d1, '2026-10-30', list)).toBe(true);
    expect(isVerifiedHeld(d2, '2026-10-30', list)).toBe(false);
    expect(verifiedHeldValue(list, '2026-10-30')).toBe(d1.amount);
  });
});

describe('B5: Audit events with isoTimestamp and simulatedDate', () => {
  it('includes isoTimestamp and simulatedDate in hash payload and validates chain', () => {
    const store = useDhaarStore.getState();
    store.resetDemo();
    store.setSimulatedDate('2026-11-01');
    store.addEvent('Test Event', 'Checking timestamps', 'info');
    const latest = useDhaarStore.getState().events[0];
    expect(latest.isoTimestamp).toBeDefined();
    expect(latest.simulatedDate).toBe('2026-11-01');
    expect(useDhaarStore.getState().verifyAudit()).toBe(true);
  });
});

describe('B6: Released status', () => {
  it('recognizes Released status on deposit and excludes it from verifiedHeld', () => {
    const releasedDep: Deposit = {
      ...seedDeposits[0],
      grade: 'E2',
      lien: true,
      status: 'Released',
      lastAttestedDate: '2026-10-15',
      issueDate: '2025-01-01',
      maturityDate: '2027-01-01'
    };
    expect(isVerifiedHeld(releasedDep, '2026-10-30')).toBe(false);
  });
});

describe('B7: normalizeName and similarity score', () => {
  it('normalizes names by lowercasing, stripping punctuation, expanding GST, removing the, collapsing spaces', () => {
    expect(normalizeName('The S.I.E.S. GST College!')).toBe('sies graduate school of technology college');
  });

  it('computes similarity and holder match status', () => {
    const exact = holderNameMatchScore('SIES Graduate School of Technology', 'sies graduate school of technology');
    expect(exact.status).toBe('Match');
    expect(exact.similarity).toBeGreaterThanOrEqual(0.9);

    const abbrev = holderNameMatchScore('SIES Graduate School of Technology', 'SIES GST');
    expect(abbrev.status).toBe('Match');

    const review = holderNameMatchScore('SIES Graduate School of Technology', 'SIES School of Technology');
    expect(['Match', 'Review']).toContain(review.status);
    expect(review.similarity).toBeGreaterThanOrEqual(0.75);
  });
});

describe('B9: T-15 alert stage', () => {
  it('includes T-15 in maturityAlertStage', () => {
    expect(maturityAlertStage(15)).toBe('T-15');
    expect(maturityAlertStage(8)).toBe('T-15');
    expect(maturityAlertStage(7)).toBe('T-7');
    expect(maturityAlertStage(30)).toBe('T-30');
  });
});

describe('B10: isVerifiedHeld requires issueDate <= simulatedDate', () => {
  it('excludes future-dated issueDate from isVerifiedHeld', () => {
    const futureDeposit: Deposit = {
      ...seedDeposits[0],
      grade: 'E2',
      lien: true,
      status: 'Active',
      lastAttestedDate: '2026-10-15',
      issueDate: '2026-11-05', // After simulated date 2026-10-30
      maturityDate: '2027-11-05'
    };
    expect(isVerifiedHeld(futureDeposit, '2026-10-30')).toBe(false);
  });
});
