import type { Deposit } from '../data/seed';
import { isDuplicate, isVerifiedHeld } from './calculations';
import { isAssured } from './assurance';

export interface AphCategoryRequirement {
  id: string;
  categoryName: string;
  programmeType: string;
  requiredAmount: number; // In INR
  requiredTenureDays: number;
  demoLabel: string; // 'DEMO - to be supplied by AICTE'
  clauseRef: string; // empty string with 'to be supplied by AICTE' note
}

export type PenaltyRuleType = 'lateCreationWindow' | 'prematureEncashment' | 'custom';

export interface PenaltyRuleConfig {
  id: string;
  type: PenaltyRuleType;
  name: string;
  percent?: number;
  fixedAmount?: number;
  deadlineDays?: number; // E.g. 30 days after approval
  condition: string;
  demoLabel: string; // 'DEMO - to be supplied by AICTE'
  clauseRef: string; // empty string
}

export interface AphEdition {
  id: string;
  editionName: string; // E.g. 'APH 2025-26'
  effectiveFrom: string; // E.g. '2025-04-01'
  description: string;
  categories: AphCategoryRequirement[];
  penalties: PenaltyRuleConfig[];
}

export const INITIAL_APH_EDITIONS: AphEdition[] = [
  {
    id: 'aph-2025-26',
    editionName: 'APH 2025-26',
    effectiveFrom: '2025-04-01',
    description: 'Approval Process Handbook Edition 2025-26 (Active baseline)',
    categories: [
      {
        id: 'cat-eng-deg',
        categoryName: 'Technical Degree (Engineering & Technology)',
        programmeType: 'Undergraduate / Postgraduate Engineering',
        requiredAmount: 2500000,
        requiredTenureDays: 3650, // 10 years
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'cat-eng-dip',
        categoryName: 'Technical Diploma (Polytechnic)',
        programmeType: 'Engineering Diploma',
        requiredAmount: 1500000,
        requiredTenureDays: 3650,
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'cat-mgmt',
        categoryName: 'Management (MBA / PGDM)',
        programmeType: 'Management Degree / Diploma',
        requiredAmount: 2000000,
        requiredTenureDays: 3650,
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'cat-pharm',
        categoryName: 'Pharmacy (B.Pharm / M.Pharm)',
        programmeType: 'Pharmacy Degree',
        requiredAmount: 2200000,
        requiredTenureDays: 3650,
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'cat-arch',
        categoryName: 'Architecture & Town Planning (B.Arch)',
        programmeType: 'Architecture',
        requiredAmount: 1800000,
        requiredTenureDays: 3650,
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      }
    ],
    penalties: [
      {
        id: 'pen-late-create',
        type: 'lateCreationWindow',
        name: 'Late Creation Window Surcharge',
        percent: 2.0,
        deadlineDays: 30,
        condition: 'Security deposit created or renewed >30 days after regulatory deadline',
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'pen-premature',
        type: 'prematureEncashment',
        name: 'Premature Encashment Deduction',
        percent: 5.0,
        condition: 'Closure or encashment requested prior to approved regulatory tenure',
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'pen-lien-gap',
        type: 'custom',
        name: 'Unconfirmed Joint Lien Remediation Charge',
        fixedAmount: 50000,
        condition: 'Failure to confirm AICTE joint lien endorsement within 90 days',
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      }
    ]
  },
  {
    id: 'aph-2024-25',
    editionName: 'APH 2024-25',
    effectiveFrom: '2024-04-01',
    description: 'Approval Process Handbook Edition 2024-25 (Prior edition)',
    categories: [
      {
        id: 'cat-eng-deg-prev',
        categoryName: 'Technical Degree (Engineering & Technology)',
        programmeType: 'Undergraduate / Postgraduate Engineering',
        requiredAmount: 2000000,
        requiredTenureDays: 3650,
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'cat-eng-dip-prev',
        categoryName: 'Technical Diploma (Polytechnic)',
        programmeType: 'Engineering Diploma',
        requiredAmount: 1200000,
        requiredTenureDays: 3650,
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'cat-mgmt-prev',
        categoryName: 'Management (MBA / PGDM)',
        programmeType: 'Management Degree / Diploma',
        requiredAmount: 1500000,
        requiredTenureDays: 3650,
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      }
    ],
    penalties: [
      {
        id: 'pen-late-prev',
        type: 'lateCreationWindow',
        name: 'Late Deposit Creation Fee',
        percent: 1.5,
        deadlineDays: 45,
        condition: 'Security deposit created >45 days post approval',
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      },
      {
        id: 'pen-premature-prev',
        type: 'prematureEncashment',
        name: 'Early Encashment Fee',
        percent: 4.0,
        condition: 'Release requested prior to full tenure',
        demoLabel: 'DEMO - to be supplied by AICTE',
        clauseRef: ''
      }
    ]
  }
];

export interface PenaltyBreakdownItem {
  ruleId: string;
  name: string;
  type: PenaltyRuleType;
  amount: number;
  basis: string;
  clauseRefNote: string;
}

export interface InstitutionAphMetrics {
  institutionCode: string;
  institutionName: string;
  category: AphCategoryRequirement;
  requiredAmount: number;
  verifiedHeldAmount: number;
  coverageGap: number;
  tenureRemainingDays: number;
  nextDeadline: string | null;
  penaltyExposure: number;
  penaltyBreakdown: PenaltyBreakdownItem[];
  eligibleForReleaseCount: number;
}

/**
 * Maps an institution code to an appropriate category in the active APH edition.
 */
export function getCategoryForInstitution(
  institutionCode: string,
  edition: AphEdition
): AphCategoryRequirement {
  if (institutionCode === 'MH-EDU-055') {
    // Polytechnic
    const dip = edition.categories.find(c => c.id.includes('dip') || c.categoryName.includes('Diploma'));
    if (dip) return dip;
  }
  return edition.categories[0];
}

/**
 * Computes institution APH metrics based on active edition parameters and current simulated date.
 */
export function computeInstitutionMetrics(
  institutionCode: string,
  institutionName: string,
  allDeposits: Deposit[],
  edition: AphEdition,
  simulatedDate: string
): InstitutionAphMetrics {
  const category = getCategoryForInstitution(institutionCode, edition);
  const instDeposits = allDeposits.filter(d => d.institutionCode === institutionCode);

  // Verified-held: dedupe duplicates, E2+ only, assured, issueDate <= simulatedDate, status !== 'Released'
  const verifiedDeposits = instDeposits.filter(d => {
    if (isDuplicate(d, allDeposits)) return false;
    if (d.status === 'Released') return false;
    if (!isVerifiedHeld(d, simulatedDate, allDeposits)) return false;
    if (!isAssured(d.lastAttestedDate, simulatedDate)) return false;
    return true;
  });

  const verifiedHeldAmount = verifiedDeposits.reduce((acc, d) => acc + d.amount, 0);
  const requiredAmount = category.requiredAmount;
  const coverageGap = Math.max(0, requiredAmount - verifiedHeldAmount);

  // Tenure remaining and next upcoming deadline
  let minDaysRemaining = Infinity;
  let nextDeadline: string | null = null;
  const nowMs = Date.parse(`${simulatedDate}T00:00:00Z`);

  instDeposits.forEach(d => {
    if (d.status !== 'Released' && d.maturityDate) {
      const matMs = Date.parse(`${d.maturityDate}T00:00:00Z`);
      const days = Math.round((matMs - nowMs) / 86400000);
      if (days < minDaysRemaining) {
        minDaysRemaining = days;
        nextDeadline = d.maturityDate;
      }
    }
  });

  const tenureRemainingDays = minDaysRemaining === Infinity ? 0 : Math.max(0, minDaysRemaining);

  // Penalty exposure calculation & breakdown
  const penaltyBreakdown: PenaltyBreakdownItem[] = [];
  let totalPenalty = 0;

  edition.penalties.forEach(p => {
    if (p.type === 'lateCreationWindow' && p.percent) {
      // If coverage gap exists or deposit created after deadline
      if (coverageGap > 0) {
        const amt = Math.round((coverageGap * p.percent) / 100);
        penaltyBreakdown.push({
          ruleId: p.id,
          name: p.name,
          type: p.type,
          amount: amt,
          basis: `${p.percent}% on coverage gap ₹${coverageGap.toLocaleString('en-IN')}`,
          clauseRefNote: 'Clause reference to be supplied by AICTE'
        });
        totalPenalty += amt;
      }
    } else if (p.type === 'custom' && p.fixedAmount) {
      // Unconfirmed lien charge if any active deposit lacks joint lien
      const unconfirmedLien = instDeposits.some(d => !d.lien && d.status !== 'Released');
      if (unconfirmedLien) {
        penaltyBreakdown.push({
          ruleId: p.id,
          name: p.name,
          type: p.type,
          amount: p.fixedAmount,
          basis: `Fixed charge for unconfirmed lien endorsement on active deposit`,
          clauseRefNote: 'Clause reference to be supplied by AICTE'
        });
        totalPenalty += p.fixedAmount;
      }
    }
  });

  return {
    institutionCode,
    institutionName,
    category,
    requiredAmount,
    verifiedHeldAmount,
    coverageGap,
    tenureRemainingDays,
    nextDeadline,
    penaltyExposure: totalPenalty,
    penaltyBreakdown,
    eligibleForReleaseCount: instDeposits.filter(
      d => d.grade === 'E2' && d.lien && d.maturityDate <= simulatedDate && d.status !== 'Released'
    ).length
  };
}

/**
 * What-If Simulator for policy modeling.
 */
export interface WhatIfScenarioInput {
  intakeChangePercent: number; // e.g. +20% or -10%
  earlyClosureCount: number; // number of deposits closed prematurely
  earlyClosureAmount: number; // INR
}

export function simulateWhatIf(
  currentMetrics: InstitutionAphMetrics,
  edition: AphEdition,
  input: WhatIfScenarioInput
): {
  simulatedRequired: number;
  simulatedHeld: number;
  simulatedGap: number;
  simulatedPenalty: number;
  deltaGap: number;
} {
  const multiplier = 1 + input.intakeChangePercent / 100;
  const simulatedRequired = Math.round(currentMetrics.requiredAmount * multiplier);
  const simulatedHeld = Math.max(0, currentMetrics.verifiedHeldAmount - input.earlyClosureAmount);
  const simulatedGap = Math.max(0, simulatedRequired - simulatedHeld);

  // Premature encashment penalty
  const prematureRule = edition.penalties.find(p => p.type === 'prematureEncashment');
  const prematurePenalty =
    prematureRule && prematureRule.percent && input.earlyClosureAmount > 0
      ? Math.round((input.earlyClosureAmount * prematureRule.percent) / 100)
      : 0;

  const simulatedPenalty = currentMetrics.penaltyExposure + prematurePenalty;
  const deltaGap = simulatedGap - currentMetrics.coverageGap;

  return {
    simulatedRequired,
    simulatedHeld,
    simulatedGap,
    simulatedPenalty,
    deltaGap
  };
}
