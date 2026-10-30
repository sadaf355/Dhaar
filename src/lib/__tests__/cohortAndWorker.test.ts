import { describe, it, expect } from 'vitest';
import { generateDeterministicCohort, FAULT_CLASSES, REGIONS, BANKS } from '../cohortGenerator';
import { runBenchmark, FAULT_TO_RULES_MAP } from '../benchmarkEngine';

describe('Deterministic Cohort Generator & Benchmark Engine', () => {
  it('generates identical cohorts when given the same seed (PRNG determinism)', () => {
    const cohort1 = generateDeterministicCohort(1337);
    const cohort2 = generateDeterministicCohort(1337);

    expect(cohort1.institutions.length).toBe(cohort2.institutions.length);
    expect(cohort1.deposits.length).toBe(cohort2.deposits.length);
    expect(cohort1.deposits[0].id).toBe(cohort2.deposits[0].id);
    expect(cohort1.deposits[0].amount).toBe(cohort2.deposits[0].amount);
    expect(cohort1.deposits[100].fdrNo).toBe(cohort2.deposits[100].fdrNo);
  });

  it('produces ~1,000 institutions across 8 AICTE regions and ~1,800 instruments across 20 banks', () => {
    const cohort = generateDeterministicCohort(1337);

    // Expect ~1,000 institutions and ~1,800 instruments
    expect(cohort.institutions.length).toBe(1000);
    expect(cohort.deposits.length).toBeGreaterThanOrEqual(1750);
    expect(cohort.deposits.length).toBeLessThanOrEqual(1850);

    // Verify 8 AICTE regions represented
    const regions = new Set(cohort.institutions.map(i => i.region));
    expect(regions.size).toBe(REGIONS.length);
    expect(regions.size).toBe(8);

    // Verify 20 scheduled commercial banks represented
    const banks = new Set(cohort.deposits.map(d => d.bank));
    expect(banks.size).toBe(BANKS.length);
    expect(banks.size).toBe(20);
  });

  it('labels all 12 fault classes with positive occurrences', () => {
    const cohort = generateDeterministicCohort(1337);

    FAULT_CLASSES.forEach(fault => {
      const count = cohort.faultCounts[fault.id] || 0;
      expect(count, `Fault class ${fault.id} must have > 0 occurrences`).toBeGreaterThan(0);
    });

    const totalFaults = Object.values(cohort.faultCounts).reduce((a, b) => a + b, 0);
    expect(totalFaults).toBeGreaterThan(200);
  });

  it('evaluates rule engine over cohort and honestly reports recall for static undetectable faults', () => {
    const cohort = generateDeterministicCohort(1337);
    const benchmark = runBenchmark(cohort.deposits, '2026-10-30');

    expect(benchmark.totalInstruments).toBe(cohort.deposits.length);
    expect(benchmark.ruleMetrics.length).toBeGreaterThan(0);
    expect(benchmark.faultMetrics.length).toBe(12);

    // Honest recall tests:
    // silent_closure, release_during_hold, and refund_name_mismatch cannot be detected by static rules alone
    const silentClosureMetric = benchmark.faultMetrics.find(f => f.faultId === 'silent_closure');
    expect(silentClosureMetric).toBeDefined();
    expect(silentClosureMetric?.engineDetectable).toBe(false);
    expect(silentClosureMetric?.recallPercent).toBe(0);

    const releaseDuringHoldMetric = benchmark.faultMetrics.find(f => f.faultId === 'release_during_hold');
    expect(releaseDuringHoldMetric).toBeDefined();
    expect(releaseDuringHoldMetric?.engineDetectable).toBe(false);
    expect(releaseDuringHoldMetric?.recallPercent).toBe(0);

    const refundMismatchMetric = benchmark.faultMetrics.find(f => f.faultId === 'refund_name_mismatch');
    expect(refundMismatchMetric).toBeDefined();
    expect(refundMismatchMetric?.engineDetectable).toBe(false);
    expect(refundMismatchMetric?.recallPercent).toBe(0);

    // Detectable faults should have positive recall
    const shortTenureMetric = benchmark.faultMetrics.find(f => f.faultId === 'short_tenure');
    expect(shortTenureMetric?.engineDetectable).toBe(true);
    expect(shortTenureMetric?.recallPercent).toBeGreaterThan(50);

    const wrongIfscMetric = benchmark.faultMetrics.find(f => f.faultId === 'wrong_ifsc');
    expect(wrongIfscMetric?.engineDetectable).toBe(true);
    expect(wrongIfscMetric?.recallPercent).toBeGreaterThan(50);
  });
});
