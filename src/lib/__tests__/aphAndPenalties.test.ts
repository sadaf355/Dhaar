import { describe, it, expect } from 'vitest';
import {
  INITIAL_APH_EDITIONS,
  computeInstitutionMetrics,
  simulateWhatIf,
  getCategoryForInstitution
} from '../aphParameters';
import { seedDeposits } from '../../data/seed';

describe('APH Parameters & Penalty Calculations', () => {
  const simulatedDate = '2026-10-30';
  const activeEdition = INITIAL_APH_EDITIONS.find(e => e.id === 'aph-2025-26')!;
  const priorEdition = INITIAL_APH_EDITIONS.find(e => e.id === 'aph-2024-25')!;

  it('labels all APH categories and penalty rules with demo labels and empty clause references', () => {
    for (const ed of INITIAL_APH_EDITIONS) {
      for (const cat of ed.categories) {
        expect(cat.demoLabel).toContain('DEMO');
        expect(cat.demoLabel).toContain('to be supplied by AICTE');
        expect(cat.clauseRef).toBe('');
      }
      for (const pen of ed.penalties) {
        expect(pen.demoLabel).toContain('DEMO');
        expect(pen.demoLabel).toContain('to be supplied by AICTE');
        expect(pen.clauseRef).toBe('');
      }
    }
  });

  it('computes institution metrics against active edition requirements', () => {
    const instCode = 'MH-EDU-042';
    const metrics = computeInstitutionMetrics(
      instCode,
      'Vivekanand Institute of Technology',
      seedDeposits,
      activeEdition,
      simulatedDate
    );

    expect(metrics.institutionCode).toBe(instCode);
    expect(metrics.requiredAmount).toBeGreaterThan(0);
    expect(metrics.verifiedHeldAmount).toBeGreaterThanOrEqual(0);
    expect(metrics.coverageGap).toBe(Math.max(0, metrics.requiredAmount - metrics.verifiedHeldAmount));
    expect(metrics.penaltyExposure).toBeGreaterThanOrEqual(0);

    for (const item of metrics.penaltyBreakdown) {
      expect(item.clauseRefNote).toContain('to be supplied by AICTE');
      expect(item.amount).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports edition switching reflecting different category requirements', () => {
    const instCode = 'MH-EDU-042';
    const metricsActive = computeInstitutionMetrics(
      instCode,
      'Vivekanand Institute of Technology',
      seedDeposits,
      activeEdition,
      simulatedDate
    );

    const metricsPrior = computeInstitutionMetrics(
      instCode,
      'Vivekanand Institute of Technology',
      seedDeposits,
      priorEdition,
      simulatedDate
    );

    // Active 2025-26 has ₹25 Lakhs requirement vs ₹20 Lakhs in prior 2024-25
    expect(metricsActive.requiredAmount).toBe(2500000);
    expect(metricsPrior.requiredAmount).toBe(2000000);
  });

  it('simulates what-if scenarios for intake changes and early closure deductions', () => {
    const instCode = 'MH-EDU-042';
    const currentMetrics = computeInstitutionMetrics(
      instCode,
      'Vivekanand Institute of Technology',
      seedDeposits,
      activeEdition,
      simulatedDate
    );

    // What-if: +20% intake increase and ₹5,00,000 early closure
    const result = simulateWhatIf(currentMetrics, activeEdition, {
      intakeChangePercent: 20,
      earlyClosureCount: 1,
      earlyClosureAmount: 500000
    });

    expect(result.simulatedRequired).toBe(Math.round(currentMetrics.requiredAmount * 1.2));
    expect(result.simulatedHeld).toBe(Math.max(0, currentMetrics.verifiedHeldAmount - 500000));
    expect(result.simulatedGap).toBe(Math.max(0, result.simulatedRequired - result.simulatedHeld));
    // Premature encashment penalty at 5% of ₹5,00,000 = ₹25,000
    expect(result.simulatedPenalty).toBe(currentMetrics.penaltyExposure + 25000);
  });
});
