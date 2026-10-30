import { describe, it, expect } from 'vitest';
import {
  computeEmpiricalMeasures,
  computeImpactComparison,
  DEFAULT_BASELINE_ASSUMPTIONS
} from '../empiricalMetrics';
import type { Deposit } from '../../data/seed';
import type { AuditEvent } from '../../context/useDhaarStore';

describe('Empirical Process Metrics & Baseline Assumptions', () => {
  const mockDeposits: Deposit[] = [
    {
      id: 'DHAAR-1',
      institution: 'College A',
      institutionCode: 'MH-EDU-1',
      bank: 'HDFC Bank',
      fdrNo: 'FDR-001',
      amount: 1000000,
      issueDate: '2026-10-01',
      maturityDate: '2028-10-01',
      submitted: '2026-10-05',
      lastAttestedDate: '2026-10-08',
      grade: 'E2',
      bankRequestStatus: 'Attested',
      status: 'Active',
      lien: true,
      holder: 'College A',
      purpose: 'Security deposit'
    },
    {
      id: 'DHAAR-2',
      institution: 'College B',
      institutionCode: 'MH-EDU-2',
      bank: 'State Bank of India',
      fdrNo: 'FDR-002',
      amount: 1500000,
      issueDate: '2026-10-01',
      maturityDate: '2026-11-20', // ~21 days to maturity from 2026-10-30
      submitted: '2026-10-02',
      lastAttestedDate: '2026-10-07',
      grade: 'E2',
      bankRequestStatus: 'Attested',
      status: 'Active',
      lien: true,
      holder: 'College B',
      purpose: 'Security deposit',
      predecessorId: 'DHAAR-OLD',
      coverageGapDays: 5 // Has coverage gap
    },
    {
      id: 'DHAAR-3',
      institution: 'College C',
      institutionCode: 'MH-EDU-3',
      bank: 'ICICI Bank',
      fdrNo: 'FDR-003',
      amount: 2000000,
      issueDate: '2026-10-01',
      maturityDate: '2028-10-01',
      submitted: '2026-10-01',
      grade: 'E0',
      status: 'Under review',
      lien: true,
      holder: 'College C',
      purpose: 'Security deposit'
    }
  ];

  const mockEvents: AuditEvent[] = [
    {
      id: 1,
      title: 'Review submitted',
      detail: 'DHAAR-1 reviewed by RO',
      time: '2026-10-06 10:00:00',
      isoTimestamp: '2026-10-06T10:00:00.000Z',
      simulatedDate: '2026-10-06',
      kind: 'info',
      actor: 'Regional Officer',
      userId: 'usr-ro-1',
      hash: 'h1',
      previousHash: 'GENESIS'
    },
    {
      id: 2,
      title: 'Checker approved',
      detail: 'DHAAR-1 checker approved',
      time: '2026-10-07 11:00:00',
      isoTimestamp: '2026-10-07T11:00:00.000Z',
      simulatedDate: '2026-10-07',
      kind: 'info',
      actor: 'Checker',
      userId: 'usr-ch-1',
      hash: 'h2',
      previousHash: 'h1'
    }
  ];

  it('computes turnaround days from submission to E2 bank attestation', () => {
    const empirical = computeEmpiricalMeasures(mockDeposits, mockEvents, '2026-10-30');

    // DHAAR-1: 2026-10-05 to 2026-10-08 = 3 days
    // DHAAR-2: 2026-10-02 to 2026-10-07 = 5 days
    // Avg = (3 + 5) / 2 = 4 days
    expect(empirical.turnaroundSampleCount).toBe(2);
    expect(empirical.turnaroundDaysAverage).toBe(4);
    expect(empirical.turnaroundDaysMedian).toBe(5);
  });

  it('computes advance notice days at first alert', () => {
    const empirical = computeEmpiricalMeasures(mockDeposits, mockEvents, '2026-10-30');

    // DHAAR-2 matures on 2026-11-20 (21 days from 2026-10-30)
    expect(empirical.advanceNoticeSampleCount).toBe(1);
    expect(empirical.advanceNoticeDaysAverage).toBe(21);
  });

  it('computes coverage gap rate across predecessors', () => {
    const empirical = computeEmpiricalMeasures(mockDeposits, mockEvents, '2026-10-30');

    // 1 deposit with predecessor (DHAAR-2), and it has coverageGapDays > 0 -> 100%
    expect(empirical.coverageGapTotalAnalyzed).toBe(1);
    expect(empirical.coverageGapRatePercent).toBe(100);
  });

  it('computes officer touches per case from event logs', () => {
    const empirical = computeEmpiricalMeasures(mockDeposits, mockEvents, '2026-10-30');

    // 2 officer events (Regional Officer and Checker) both touching DHAAR-1
    expect(empirical.totalOfficerTouches).toBe(2);
    expect(empirical.uniqueCasesCount).toBe(1);
    expect(empirical.officerTouchesPerCase).toBe(2);
  });

  it('computes comparative impact against baseline assumptions', () => {
    const empirical = computeEmpiricalMeasures(mockDeposits, mockEvents, '2026-10-30');
    const comparison = computeImpactComparison(empirical, DEFAULT_BASELINE_ASSUMPTIONS);

    // Baseline manual turnaround: 45 days. Empirical: 4.0 days
    expect(comparison.daysSavedPerCase).toBe(41);
    expect(comparison.turnaroundSpeedupFactor).toBe(11.3); // 45 / 4 = 11.25 -> 11.3
    // Savings: (3200 - 200) * 12000 = 36,000,000 INR
    expect(comparison.annualSavingsInr).toBe(36000000);
    // Hours saved: (6.0 - (2 touches * 0.25h)) * 12000 = 5.5 * 12000 = 66,000 hours
    expect(comparison.hoursSavedAnnually).toBe(66000);
  });
});
