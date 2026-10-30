import type { Deposit } from '../data/seed';
import { evaluateRules, type RuleResult } from './rules';
import { FAULT_CLASSES, type FaultClassId } from './cohortGenerator';

export interface RulePerformanceMetric {
  ruleId: string;
  ruleName: string;
  severity: 'Critical' | 'Warning' | 'Info';
  testable: boolean;
  totalEvaluated: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  f1Score: number;
  detectionRatePercent: number;
}

export interface FaultClassPerformanceMetric {
  faultId: FaultClassId;
  name: string;
  description: string;
  totalInstances: number;
  detectedCount: number;
  recallPercent: number;
  engineDetectable: boolean;
  primaryRules: string[];
  explanation: string;
}

export interface BenchmarkReport {
  totalInstruments: number;
  totalRulesEvaluated: number;
  executionTimeMs: number;
  throughputInstrumentsPerSec: number;
  overallPrecision: number;
  overallRecall: number;
  ruleMetrics: RulePerformanceMetric[];
  faultMetrics: FaultClassPerformanceMetric[];
  completedAt: string;
}

// Maps fault classes to the primary rules designed to flag them
export const FAULT_TO_RULES_MAP: Record<FaultClassId, { rules: string[]; detectable: boolean; explanation: string }> = {
  altered_amount: {
    rules: ['R16', 'R04'],
    detectable: true,
    explanation: 'Detected by declared-vs-extracted field comparison (R16) and amount-in-words parser (R04).'
  },
  missing_joint_holder: {
    rules: ['R08', 'R18'],
    detectable: true,
    explanation: 'Detected by joint AICTE lien verification (R08) and lien declaration checks (R18).'
  },
  short_tenure: {
    rules: ['R06'],
    detectable: true,
    explanation: 'Detected by regulatory minimum tenure gate (R06) calculating elapsed calendar days.'
  },
  reused_document: {
    rules: ['R03'],
    detectable: true,
    explanation: 'Detected by cross-registry SHA-256 document hash collision indexing (R03).'
  },
  wrong_ifsc: {
    rules: ['R10'],
    detectable: true,
    explanation: 'Detected by standard IFSC regex, bank prefix matching, and mock branch directory (R10).'
  },
  tampered_pdf_metadata: {
    rules: ['R13'],
    detectable: true,
    explanation: 'Detected by PDF metadata inspection flagging Photoshop/Canva/Illustrator signatures (R13).'
  },
  name_mismatch: {
    rules: ['R09'],
    detectable: true,
    explanation: 'Detected by token-set-ratio fuzzy matching against approved trust master directory (R09).'
  },
  coverage_gap: {
    rules: ['R19'],
    detectable: true,
    explanation: 'Detected by instrument predecessor-successor lineage temporal gap analysis (R19).'
  },
  silent_closure: {
    rules: ['R21'],
    detectable: false,
    explanation: 'Honest limitation: Static rule engine cannot detect silent bank closure without live SFMS/CBS webhook (R21 unavailable).'
  },
  overdue_reattestation: {
    rules: ['R22'],
    detectable: true,
    explanation: 'Detected by periodic bank confirmation freshness expiration (> 180 days) (R22).'
  },
  release_during_hold: {
    rules: ['R25'],
    detectable: false,
    explanation: 'Honest limitation: Legal dispute holds are enforced on Release page workflow gates, not static document rule intake (R25 unavailable).'
  },
  refund_name_mismatch: {
    rules: ['R26'],
    detectable: false,
    explanation: 'Honest limitation: Refund bank account beneficiary name verification requires PFMS bank-account validation adapter (R26 unavailable).'
  }
};

/**
 * Runs the benchmark evaluation over a set of deposit instruments synchronously.
 */
export function runBenchmark(
  deposits: Deposit[],
  simulatedDate: string = '2026-10-30'
): BenchmarkReport {
  const startTime = performance.now();
  const ruleStats: Record<string, { tp: number; fp: number; tn: number; fn: number; rule: RuleResult }> = {};
  const faultDetections: Record<FaultClassId, { total: number; detected: number }> = {
    altered_amount: { total: 0, detected: 0 },
    missing_joint_holder: { total: 0, detected: 0 },
    short_tenure: { total: 0, detected: 0 },
    reused_document: { total: 0, detected: 0 },
    wrong_ifsc: { total: 0, detected: 0 },
    tampered_pdf_metadata: { total: 0, detected: 0 },
    name_mismatch: { total: 0, detected: 0 },
    coverage_gap: { total: 0, detected: 0 },
    silent_closure: { total: 0, detected: 0 },
    overdue_reattestation: { total: 0, detected: 0 },
    release_during_hold: { total: 0, detected: 0 },
    refund_name_mismatch: { total: 0, detected: 0 }
  };

  let totalRuleEvals = 0;

  for (const d of deposits) {
    const results = evaluateRules(d, { deposits, simulatedDate });
    totalRuleEvals += results.length;

    // Detect if this deposit has an assigned fault class based on finding or attributes
    const dFault = getDepositFaultClass(d);
    if (dFault && faultDetections[dFault]) {
      faultDetections[dFault].total++;
    }

    // Check which rules flagged this instrument
    const flaggedRuleIds = new Set<string>();

    for (const r of results) {
      if (!ruleStats[r.id]) {
        ruleStats[r.id] = { tp: 0, fp: 0, tn: 0, fn: 0, rule: r };
      }

      const isFlagged = r.status === 'review';
      if (isFlagged) {
        flaggedRuleIds.add(r.id);
      }

      // Check ground truth for this specific rule
      const expectedFault = isRuleExpectedToFlag(r.id, d, dFault);

      if (r.status === 'unavailable') {
        // Untestable rule
        if (expectedFault) {
          ruleStats[r.id].fn++;
        } else {
          ruleStats[r.id].tn++;
        }
      } else if (isFlagged && expectedFault) {
        ruleStats[r.id].tp++;
      } else if (isFlagged && !expectedFault) {
        ruleStats[r.id].fp++;
      } else if (!isFlagged && expectedFault) {
        ruleStats[r.id].fn++;
      } else {
        ruleStats[r.id].tn++;
      }
    }

    // Evaluate fault class detection: was any of its primary rules triggered?
    if (dFault && FAULT_TO_RULES_MAP[dFault]) {
      const { rules, detectable } = FAULT_TO_RULES_MAP[dFault];
      if (detectable && rules.some(rId => flaggedRuleIds.has(rId))) {
        faultDetections[dFault].detected++;
      }
    }
  }

  const endTime = performance.now();
  const executionTimeMs = Math.round(endTime - startTime);
  const throughputInstrumentsPerSec = Math.round((deposits.length / Math.max(executionTimeMs, 1)) * 1000);

  // Compute Rule Metrics
  const ruleMetrics: RulePerformanceMetric[] = Object.keys(ruleStats)
    .sort()
    .map(ruleId => {
      const s = ruleStats[ruleId];
      const total = s.tp + s.fp + s.tn + s.fn;
      const precision = s.tp + s.fp > 0 ? s.tp / (s.tp + s.fp) : s.tp > 0 ? 1 : 0;
      const recall = s.tp + s.fn > 0 ? s.tp / (s.tp + s.fn) : 0;
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      const detectionRatePercent = total > 0 ? Math.round(((s.tp + s.fp) / total) * 100) : 0;

      return {
        ruleId,
        ruleName: s.rule.name,
        severity: s.rule.severity,
        testable: s.rule.status !== 'unavailable',
        totalEvaluated: total,
        truePositives: s.tp,
        falsePositives: s.fp,
        trueNegatives: s.tn,
        falseNegatives: s.fn,
        precision: Math.round(precision * 1000) / 1000,
        recall: Math.round(recall * 1000) / 1000,
        f1Score: Math.round(f1Score * 1000) / 1000,
        detectionRatePercent
      };
    });

  // Compute Fault Class Metrics
  const faultMetrics: FaultClassPerformanceMetric[] = FAULT_CLASSES.map(f => {
    const stat = faultDetections[f.id] || { total: 0, detected: 0 };
    const cfg = FAULT_TO_RULES_MAP[f.id];
    const recallPercent = stat.total > 0 ? Math.round((stat.detected / stat.total) * 100) : 0;

    return {
      faultId: f.id,
      name: f.name,
      description: f.description,
      totalInstances: stat.total,
      detectedCount: stat.detected,
      recallPercent,
      engineDetectable: cfg.detectable,
      primaryRules: cfg.rules,
      explanation: cfg.explanation
    };
  });

  // Overall aggregates across testable rules
  const testableRules = ruleMetrics.filter(r => r.testable);
  const avgPrecision =
    testableRules.length > 0
      ? testableRules.reduce((acc, r) => acc + r.precision, 0) / testableRules.length
      : 0;
  const avgRecall =
    testableRules.length > 0
      ? testableRules.reduce((acc, r) => acc + r.recall, 0) / testableRules.length
      : 0;

  return {
    totalInstruments: deposits.length,
    totalRulesEvaluated: totalRuleEvals,
    executionTimeMs,
    throughputInstrumentsPerSec,
    overallPrecision: Math.round(avgPrecision * 1000) / 1000,
    overallRecall: Math.round(avgRecall * 1000) / 1000,
    ruleMetrics,
    faultMetrics,
    completedAt: new Date().toISOString()
  };
}

/**
 * Determines the labelled fault class of a deposit.
 */
function getDepositFaultClass(d: Deposit): FaultClassId | null {
  const f = d.finding?.toLowerCase() || '';

  if (f.includes('altered') || f.includes('declared amount exceeds') || f.includes('schedule')) return 'altered_amount';
  if (f.includes('joint lien endorsement to member secretary') || f.includes('joint lien confirmation missing') || (!d.lien && !f)) return 'missing_joint_holder';
  if (f.includes('shorter than the 10-year') || f.includes('short tenure')) return 'short_tenure';
  if (f.includes('collision detected') || f.includes('reused across another')) return 'reused_document';
  if (f.includes('ifsc prefix does not match') || f.includes('ifsc format')) return 'wrong_ifsc';
  if (f.includes('image manipulation software') || f.includes('photoshop')) return 'tampered_pdf_metadata';
  if (f.includes('unrelated trust') || f.includes('does not match approved institution trust')) return 'name_mismatch';
  if (f.includes('coverage gap detected') || (d.coverageGapDays !== undefined && d.coverageGapDays > 0)) return 'coverage_gap';
  if (f.includes('marked closed') || f.includes('prematurely encashed') || d.bankRequestStatus === 'Mismatch') return 'silent_closure';
  if (f.includes('periodic bank confirmation overdue') || f.includes('outside the illustrative 180-day')) return 'overdue_reattestation';
  if (f.includes('dispute hold') || (d.holds && d.holds.length > 0)) return 'release_during_hold';
  if (f.includes('target refund account name does not match') || (d.refundAccountName && d.expectedRefundName && d.refundAccountName !== d.expectedRefundName)) return 'refund_name_mismatch';

  return null;
}

/**
 * Checks whether rule rId is expected to flag deposit d based on ground truth.
 */
function isRuleExpectedToFlag(ruleId: string, d: Deposit, fault: FaultClassId | null): boolean {
  switch (ruleId) {
    case 'R03':
      return fault === 'reused_document';
    case 'R04':
    case 'R16':
      return fault === 'altered_amount';
    case 'R06':
      return fault === 'short_tenure';
    case 'R08':
    case 'R18':
      return fault === 'missing_joint_holder' || !d.lien;
    case 'R09':
      return fault === 'name_mismatch';
    case 'R10':
      return fault === 'wrong_ifsc';
    case 'R13':
      return fault === 'tampered_pdf_metadata';
    case 'R19':
      return fault === 'coverage_gap';
    case 'R21':
      return fault === 'silent_closure';
    case 'R22':
      return fault === 'overdue_reattestation';
    case 'R25':
      return fault === 'release_during_hold';
    case 'R26':
      return fault === 'refund_name_mismatch';
    default:
      return false;
  }
}
