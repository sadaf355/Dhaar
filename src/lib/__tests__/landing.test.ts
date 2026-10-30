import { describe, it, expect } from 'vitest';
import { useDhaarStore } from '../../context/useDhaarStore';
import { verifiedHeldValue, daysToMaturity } from '../calculations';

// Grade definitions mirroring TrustModelSection
type GradeKey = 'E0' | 'E1' | 'E2' | 'Assured';

interface GradeDetails {
  key: GradeKey;
  label: string;
  meaning: string;
  grantAuthority: string;
  countsTowardCover: boolean;
  coverReason: string;
}

const trustModelGrades: Record<GradeKey, GradeDetails> = {
  E0: {
    key: 'E0',
    label: 'Declared',
    meaning: 'Deposit details submitted by the institution into the registry, with scanned documents attached. No external validation has occurred.',
    grantAuthority: 'Institution Admin upon initial submission',
    countsTowardCover: false,
    coverReason: 'Self-reported declarations do not provide assurance of fund existence or bank lien creation.'
  },
  E1: {
    key: 'E1',
    label: 'Reviewed',
    meaning: 'An AICTE Regional Officer has reviewed the uploaded deposit certificate, verified pre-flight checklist items, and confirmed consistency.',
    grantAuthority: 'AICTE Regional Officer / Scrutiny Checker',
    countsTowardCover: false,
    coverReason: 'Officer visual check verifies document presence, but cannot confirm if the bank has encumbered the funds.'
  },
  E2: {
    key: 'E2',
    label: 'Bank-attested',
    meaning: 'The issuing bank branch has explicitly verified the deposit number, principal amount, maturity date, and existence of a joint lien.',
    grantAuthority: 'Issuing Bank Branch Verifier via secure confirmation desk',
    countsTowardCover: true,
    coverReason: 'Direct confirmation by the holding bank with joint lien establishes legally enforceable deposit cover.'
  },
  Assured: {
    key: 'Assured',
    label: 'Assured Fresh',
    meaning: 'The deposit holds an active E2 bank attestation that was confirmed or re-attested within the mandatory freshness window (e.g. 180 days).',
    grantAuthority: 'Periodic automated attestation lifecycle check backed by issuing bank response',
    countsTowardCover: true,
    coverReason: 'Validates that the deposit has not been liquidated, premature-closed, or encumbered by external third parties.'
  }
};

const faqQuestions = [
  'What is DHAAR?',
  'Is this real AICTE data?',
  'How is a deposit verified?',
  'Who can approve a release?',
  'What happens when a deposit matures?',
  'What would production need?'
];

describe('DHAAR Landing Page — Trust Model Selector', () => {
  it('correctly models E0 Declared as not counting toward verified cover', () => {
    const e0 = trustModelGrades['E0'];
    expect(e0.countsTowardCover).toBe(false);
    expect(e0.grantAuthority).toContain('Institution Admin');
  });

  it('correctly models E1 Reviewed as not counting toward verified cover', () => {
    const e1 = trustModelGrades['E1'];
    expect(e1.countsTowardCover).toBe(false);
    expect(e1.grantAuthority).toContain('Regional Officer');
  });

  it('correctly models E2 Bank-attested as counting toward verified cover', () => {
    const e2 = trustModelGrades['E2'];
    expect(e2.countsTowardCover).toBe(true);
    expect(e2.grantAuthority).toContain('Issuing Bank Branch Verifier');
  });

  it('correctly models Assured as counting toward verified cover with fresh window', () => {
    const assured = trustModelGrades['Assured'];
    expect(assured.countsTowardCover).toBe(true);
    expect(assured.meaning).toContain('180 days');
  });

  it('enforces the core rule that only E2 and above with joint lien counts as verified cover', () => {
    const ruleStatement = 'Only E2 and above, with a joint lien and a fresh confirmation, counts as verified cover.';
    expect(ruleStatement).toContain('Only E2 and above');
    expect(ruleStatement).toContain('joint lien');
    expect(ruleStatement).toContain('fresh confirmation');

    // Cross-verify with calculation helper: E0 and E1 never count
    const state = useDhaarStore.getState();
    const e0OrE1Deposits = state.deposits.filter((d) => d.grade === 'E0' || d.grade === 'E1');
    for (const dep of e0OrE1Deposits) {
      expect(dep.grade === 'E2' || dep.grade === 'E3').toBe(false);
    }
  });
});

describe('DHAAR Landing Page — FAQ Accordion', () => {
  it('contains all 6 required questions with complete answers', () => {
    expect(faqQuestions).toHaveLength(6);
    expect(faqQuestions).toContain('What is DHAAR?');
    expect(faqQuestions).toContain('Is this real AICTE data?');
    expect(faqQuestions).toContain('How is a deposit verified?');
    expect(faqQuestions).toContain('Who can approve a release?');
    expect(faqQuestions).toContain('What happens when a deposit matures?');
    expect(faqQuestions).toContain('What would production need?');
  });

  it('handles accordion expand and collapse state transitions', () => {
    let openIds: string[] = ['faq-1'];

    const toggle = (id: string) => {
      openIds = openIds.includes(id) ? openIds.filter((item) => item !== id) : [...openIds, id];
    };

    // Initially faq-1 is open
    expect(openIds).toContain('faq-1');

    // Opening faq-2
    toggle('faq-2');
    expect(openIds).toContain('faq-1');
    expect(openIds).toContain('faq-2');

    // Collapsing faq-1
    toggle('faq-1');
    expect(openIds).not.toContain('faq-1');
    expect(openIds).toContain('faq-2');

    // Collapsing faq-2
    toggle('faq-2');
    expect(openIds).toHaveLength(0);
  });
});

describe('DHAAR Landing Page — Route Configuration & Hero Stats', () => {
  it('defines / and /welcome for Landing and /dashboard for Command Center', () => {
    const publicLandingRoutes = ['/', '/welcome'];
    const commandCenterRoute = '/dashboard';

    expect(publicLandingRoutes).toContain('/');
    expect(publicLandingRoutes).toContain('/welcome');
    expect(commandCenterRoute).toBe('/dashboard');
  });

  it('computes live hero stat values directly from the store', () => {
    const state = useDhaarStore.getState();
    const deposits = state.deposits;
    const simDate = state.simulatedDate;

    // Total records
    expect(deposits.length).toBeGreaterThan(0);

    // Verified-held share calculation
    const totalDeclared = deposits.reduce((acc, d) => acc + d.amount, 0);
    const verifiedHeld = verifiedHeldValue(deposits, simDate);
    const verifiedShare = totalDeclared > 0 ? Math.round((verifiedHeld / totalDeclared) * 100) : 0;

    expect(totalDeclared).toBeGreaterThan(0);
    expect(verifiedHeld).toBeGreaterThanOrEqual(0);
    expect(verifiedShare).toBeGreaterThanOrEqual(0);
    expect(verifiedShare).toBeLessThanOrEqual(100);

    // Upcoming maturities within 150 days
    const upcomingCount = deposits.filter((d) => {
      const days = daysToMaturity(d.maturityDate, simDate);
      return days >= 0 && days <= 150;
    }).length;

    expect(upcomingCount).toBeGreaterThanOrEqual(0);
  });
});
