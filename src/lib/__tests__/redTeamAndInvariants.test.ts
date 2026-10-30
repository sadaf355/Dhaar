import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { useDhaarStore, sha256, eventPayload, type AuditEvent } from '../../context/useDhaarStore';
import { seedDeposits, type Deposit } from '../../data/seed';
import {
  isVerifiedHeld,
  verifiedHeldValue,
  daysToMaturity,
  maturityAlertStage,
  isDuplicate,
  assuranceState,
  calculateRenewalGapDays
} from '../calculations';
import {
  canPerformReleaseStep,
  canApproveWaiver,
  canRequestBankConfirmation,
  canRespondToBankRequest,
  compareBankResponse,
  nextGradeAfterBankResponse,
  isReleaseBlocked
} from '../workflow';

describe('Red-Team Authorization & Store Security Defenses', () => {
  it('prevents disallowed roles (Institution Admin, Auditor) from promoting deposit to E1', () => {
    const store = useDhaarStore.getState();
    store.setRole('Institution Admin');
    const target = store.deposits.find((d) => d.grade === 'E0') || store.deposits[0];

    expect(() => {
      store.updateDeposit(target.id, { grade: 'E1' });
    }).toThrow(/unauthorized/i);

    store.setRole('Auditor');
    expect(() => {
      store.updateDeposit(target.id, { grade: 'E1' });
    }).toThrow(/unauthorized/i);
  });

  it('allows Regional Officer to promote deposit from E0 to E1', () => {
    const store = useDhaarStore.getState();
    store.setRole('Regional Officer');
    const target = useDhaarStore.getState().deposits.find((d) => d.grade === 'E0')!;

    store.updateDeposit(target.id, { grade: 'E1', status: 'Under review' });
    const updated = useDhaarStore.getState().deposits.find((d) => d.id === target.id);
    expect(updated?.grade).toBe('E1');
  });

  it('prevents non-Bank Verifier (RO, Institution Admin, Auditor) from promoting deposit to E2', () => {
    const store = useDhaarStore.getState();
    store.setRole('Regional Officer');
    const target = store.deposits.find((d) => d.grade === 'E1') || store.deposits[0];

    expect(() => {
      store.updateDeposit(target.id, { grade: 'E2' });
    }).toThrow(/unauthorized/i);

    store.setRole('Institution Admin');
    expect(() => {
      store.updateDeposit(target.id, { grade: 'E2' });
    }).toThrow(/unauthorized/i);
  });

  it('allows Bank Verifier to promote E1 deposit to E2 only when joint lien is present', () => {
    const store = useDhaarStore.getState();
    store.setRole('Bank Verifier');

    // Deposit without lien:
    const noLienDeposit = useDhaarStore.getState().deposits.find((d) => d.grade === 'E1' && !d.lien);
    if (noLienDeposit) {
      expect(() => {
        store.updateDeposit(noLienDeposit.id, { grade: 'E2', bankLien: false });
      }).toThrow(/joint lien/i);
    }

    // Deposit with lien:
    const lienDeposit = useDhaarStore.getState().deposits.find((d) => d.grade === 'E1' && d.lien);
    if (lienDeposit) {
      store.updateDeposit(lienDeposit.id, { grade: 'E2', bankRequestStatus: 'Attested', bankLien: true });
      const updated = useDhaarStore.getState().deposits.find((d) => d.id === lienDeposit.id);
      expect(updated?.grade).toBe('E2');
    }
  });

  it('enforces: addDeposit always forces grade E0 on intake', () => {
    const store = useDhaarStore.getState();
    const maliciousDeposit: Deposit = {
      ...seedDeposits[0],
      id: 'MALICIOUS-INJECTED-1',
      grade: 'E2',
      status: 'Active'
    };

    store.addDeposit(maliciousDeposit);
    const stored = useDhaarStore.getState().deposits.find((d) => d.id === 'MALICIOUS-INJECTED-1');
    expect(stored?.grade).toBe('E0');
  });

  it('prevents disallowed roles from creating active holds', () => {
    const store = useDhaarStore.getState();
    store.setRole('Institution Admin');

    expect(() => {
      store.upsertHold({
        id: 'HOLD-ILLEGAL-1',
        scope: 'Instrument',
        targetId: 'DHAAR-24080',
        reason: 'Malicious dispute hold',
        status: 'Active',
        createdAt: '2026-10-30',
        createdBy: 'Institution Admin'
      });
    }).toThrow(/unauthorized/i);
  });

  it('prevents non-Approving Authority roles from releasing a hold', () => {
    const store = useDhaarStore.getState();
    store.setRole('Regional Officer');

    expect(() => {
      store.upsertHold({
        id: 'HOLD-1001',
        scope: 'Instrument',
        targetId: 'DHAAR-24080',
        reason: 'Hold release attempt',
        status: 'Released',
        createdAt: '2026-10-28',
        createdBy: 'Regional Officer'
      });
    }).toThrow(/unauthorized.*only approving authority/i);

    // Approving Authority can release:
    store.setRole('Approving Authority');
    store.upsertHold({
      id: 'HOLD-1001',
      scope: 'Instrument',
      targetId: 'DHAAR-24080',
      reason: 'Hold released by AA',
      status: 'Released',
      createdAt: '2026-10-28',
      createdBy: 'Regional Officer',
      releasedBy: 'Approving Authority'
    });
    const h = useDhaarStore.getState().holds.find((x) => x.id === 'HOLD-1001');
    expect(h?.status).toBe('Released');
  });

  it('prevents non-Accounts Officer roles from setting refundVerified to true', () => {
    const store = useDhaarStore.getState();
    store.setRole('Regional Officer');

    expect(() => {
      store.upsertReleaseCase({
        id: 'REL-1006',
        depositId: 'DHAAR-24080',
        stage: 'Requested',
        hold: false,
        refundAccount: 'SBI-99124',
        refundVerified: true,
        noc: false,
        updated: '2026-10-30'
      });
    }).toThrow(/unauthorized.*accounts officer/i);
  });

  it('prevents maker user from approving release as Checker', () => {
    const store = useDhaarStore.getState();
    store.setCurrentUser('usr-ro-1');

    // Create a release case where usr-ro-1 is maker
    const testCase = {
      id: 'REL-SOD-TEST',
      depositId: 'DHAAR-24076',
      stage: 'Requested' as const,
      hold: false,
      refundAccount: '•••• 1234',
      refundVerified: false,
      makerUserId: 'usr-ro-1',
      noc: false,
      updated: '2026-10-30'
    };
    store.upsertReleaseCase(testCase);

    // Same user acts as Checker and tries to approve
    useDhaarStore.setState({ role: 'Checker', currentUserId: 'usr-ro-1' });
    expect(() => {
      useDhaarStore.getState().upsertReleaseCase({
        ...testCase,
        stage: 'Checker approved',
        checkerUserId: 'usr-ro-1'
      });
    }).toThrow(/cannot act as checker/i);
  });

  it('prevents waiver requester from approving their own critical finding waiver', () => {
    useDhaarStore.setState({ role: 'Regional Officer', currentUserId: 'usr-ro-1' });

    const finding = {
      id: 'F-SELF-WAIVER-TEST',
      depositId: 'DHAAR-24080',
      ruleId: 'R04',
      title: 'Amount discrepancy',
      severity: 'Critical' as const,
      status: 'Waiver pending approval' as const,
      detail: 'Test finding',
      waiverRequestedBy: 'Regional Officer',
      waiverRequestedByUserId: 'usr-ro-1',
      createdAt: '2026-10-30'
    };
    useDhaarStore.getState().addFinding(finding);

    // If same user usr-ro-1 switches to Approving Authority and attempts self-approval
    useDhaarStore.setState({ role: 'Approving Authority', currentUserId: 'usr-ro-1' });
    expect(() => {
      useDhaarStore.getState().updateFinding('F-SELF-WAIVER-TEST', { status: 'Waived', waiverApprovedByUserId: 'usr-ro-1' });
    }).toThrow(/requester cannot approve/i);
  });
});

describe('Property-Style Fast-Check Tests (Invariants 1 to 7)', () => {
  // Invariant 1: Grade never reaches E2 without an attested matching bank response
  it('Property 1: Grade never reaches E2 without an attested matching bank response', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'E0' | 'E1' | 'E2' | 'E3'>('E0', 'E1', 'E2', 'E3'),
        fc.boolean(),
        fc.boolean(),
        fc.constantFrom(
          'Institution Admin',
          'Regional Officer',
          'Checker',
          'Approving Authority',
          'Accounts Officer',
          'Bank Verifier',
          'Auditor'
        ),
        (initialGrade, lienDeclared, fieldsMatch, role) => {
          const canReachE2 = canRespondToBankRequest(role, initialGrade, 'Requested', false) && fieldsMatch && lienDeclared;
          const nextGrade = nextGradeAfterBankResponse(initialGrade, fieldsMatch && lienDeclared);

          if (!canReachE2) {
            // Cannot reach E2
            expect(nextGrade === 'E2' && role === 'Bank Verifier' && initialGrade === 'E1' && lienDeclared).toBe(false);
          } else {
            // Reaches E2 only when initial was E1, role is Bank Verifier, lien is true, and fields matched
            expect(nextGrade).toBe('E2');
            expect(initialGrade).toBe('E1');
            expect(role).toBe('Bank Verifier');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Invariant 2: verifiedHeldValue never includes E0/E1, stale, duplicate, matured, mismatched or finding-flagged records
  it('Property 2: verifiedHeldValue never includes E0/E1, stale, duplicate, matured, mismatched or finding-flagged records', () => {
    const depositArbitrary = fc.record({
      id: fc.uuid(),
      institution: fc.string(),
      institutionCode: fc.constantFrom('INST-A', 'INST-B', 'INST-C'),
      bank: fc.constantFrom('HDFC Bank', 'State Bank of India', 'ICICI Bank'),
      fdrNo: fc.constantFrom('FDR-001', 'FDR-002', 'FDR-003'),
      amount: fc.integer({ min: 100000, max: 10000000 }),
      issueDate: fc.constantFrom('2025-01-01', '2026-01-01', '2026-12-01'), // past and future issue dates
      maturityDate: fc.constantFrom('2026-05-01', '2026-11-01', '2027-05-01'), // past and future maturity dates
      purpose: fc.constant('Security Deposit'),
      grade: fc.constantFrom<'E0' | 'E1' | 'E2' | 'E3'>('E0', 'E1', 'E2', 'E3'),
      status: fc.constantFrom<'Active' | 'Under review' | 'Attention required' | 'Matured' | 'Replaced' | 'Released'>('Active', 'Under review', 'Attention required', 'Matured', 'Replaced', 'Released'),
      lien: fc.boolean(),
      holder: fc.string(),
      submitted: fc.constantFrom('2026-01-01', '2026-02-01', '2026-03-01'),
      finding: fc.option(fc.string(), { nil: undefined }),
      bankRequestStatus: fc.constantFrom<'Not requested' | 'Requested' | 'Attested' | 'Mismatch'>('Not requested', 'Requested', 'Attested', 'Mismatch'),
      lastAttestedDate: fc.constantFrom('2025-01-01', '2026-09-01', '2026-10-15')
    });

    fc.assert(
      fc.property(fc.array(depositArbitrary, { minLength: 1, maxLength: 20 }), (deposits) => {
        const simDate = '2026-10-30';
        const heldValue = verifiedHeldValue(deposits, simDate);

        let manualSum = 0;
        for (const d of deposits) {
          const verified = isVerifiedHeld(d, simDate, deposits);
          if (verified) {
            // Assert all strict invariant conditions
            expect(d.grade === 'E2' || d.grade === 'E3').toBe(true);
            expect(d.status !== 'Matured' && d.status !== 'Released').toBe(true);
            expect(d.lien).toBe(true);
            expect(!d.finding).toBe(true);
            expect(d.bankRequestStatus).not.toBe('Mismatch');
            expect(d.issueDate <= simDate).toBe(true);
            expect(d.maturityDate >= simDate).toBe(true);
            expect(assuranceState(d, simDate)).toBe('Assured');
            expect(isDuplicate(d, deposits)).toBe(false);
            manualSum += d.amount;
          }
        }

        expect(heldValue).toBe(manualSum);
      }),
      { numRuns: 60 }
    );
  });

  // Invariant 3: Release cannot progress with any active hold or name mismatch
  it('Property 3: Release cannot progress with any active hold or name mismatch', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // eligible
        fc.boolean(), // caseHold
        fc.integer({ min: 0, max: 5 }), // activeHoldCount
        fc.boolean(), // refundNameMatches
        fc.integer({ min: 0, max: 3 }), // depositHoldCount
        (eligible, caseHold, activeHoldCount, refundNameMatches, depositHoldCount) => {
          const blocked = isReleaseBlocked({
            eligible,
            caseHold,
            activeHoldCount,
            refundNameMatches,
            depositHoldCount
          });

          if (caseHold || activeHoldCount > 0 || depositHoldCount > 0 || !refundNameMatches || !eligible) {
            expect(blocked).toBe(true);
          } else {
            expect(blocked).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Invariant 4: The same user cannot hold two of maker/checker/authority on one release
  it('Property 4: The same user cannot hold two of maker/checker/authority on one release', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (uMaker, uChecker, uAuthority) => {
          // Checker check
          const checkerCanPerform = canPerformReleaseStep('checker', uChecker, { makerUserId: uMaker });
          if (uMaker === uChecker) {
            expect(checkerCanPerform).toBe(false);
          } else {
            expect(checkerCanPerform).toBe(true);
          }

          // Authority check
          const authorityCanPerform = canPerformReleaseStep('authority', uAuthority, {
            makerUserId: uMaker,
            checkerUserId: uChecker
          });
          if (uAuthority === uMaker || uAuthority === uChecker) {
            expect(authorityCanPerform).toBe(false);
          } else {
            expect(authorityCanPerform).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Invariant 5: Gap days are never negative
  it('Property 5: Renewal gap days are never negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1577836800000, max: 1893456000000 }).map((t) => new Date(t)),
        fc.integer({ min: 1577836800000, max: 1893456000000 }).map((t) => new Date(t)),
        (successorIssueDate, predecessorMaturityDate) => {
          const gapDays = calculateRenewalGapDays(successorIssueDate, predecessorMaturityDate);

          expect(gapDays).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(gapDays)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Invariant 6: The audit chain verifies after any sequence of actions and fails after any single-field mutation
  it('Property 6: The audit chain verifies after any sequence of actions and fails after any single-field mutation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 20 }),
            detail: fc.string({ minLength: 1, maxLength: 40 }),
            kind: fc.constantFrom('info', 'success', 'warning'),
            actor: fc.constantFrom('Regional Officer', 'Checker', 'Approving Authority', 'Bank Verifier'),
            userId: fc.constantFrom('usr-1', 'usr-2', 'usr-3')
          }),
          { minLength: 2, maxLength: 15 }
        ),
        (eventInputs) => {
          // Construct a valid chain
          const chain: AuditEvent[] = [];
          let prevHash = 'GENESIS';

          for (let i = 0; i < eventInputs.length; i++) {
            const inp = eventInputs[i];
            const base = {
              id: i + 1,
              title: inp.title,
              detail: inp.detail,
              time: '12:00 PM',
              isoTimestamp: `2026-10-30T12:00:0${i}.000Z`,
              simulatedDate: '2026-10-30',
              kind: inp.kind,
              actor: inp.actor,
              userId: inp.userId,
              previousHash: prevHash
            };
            const hash = sha256(eventPayload(base));
            const evt: AuditEvent = { ...base, hash };
            chain.push(evt);
            prevHash = hash;
          }

          // Invariant 6A: untouched chain verifies true
          const verifyChain = (events: AuditEvent[]): boolean => {
            for (let i = 0; i < events.length; i++) {
              const e = events[i];
              if (i === 0) {
                if (e.previousHash !== 'GENESIS') return false;
              } else {
                if (e.previousHash !== events[i - 1].hash) return false;
              }
              if (e.hash !== sha256(eventPayload(e))) return false;
            }
            return true;
          };

          expect(verifyChain(chain)).toBe(true);

          // Invariant 6B: Any single-field mutation causes verification to fail
          const mutatedChain = JSON.parse(JSON.stringify(chain)) as AuditEvent[];
          const targetIndex = Math.floor(Math.random() * mutatedChain.length);
          mutatedChain[targetIndex].detail = mutatedChain[targetIndex].detail + '_TAMPERED';

          expect(verifyChain(mutatedChain)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Invariant 7: Alert stage is monotonic as days decrease
  it('Property 7: Alert urgency stage is monotonic as days to maturity decrease', () => {
    const stageRank: Record<string, number> = {
      'None': 0,
      'T-180': 1,
      'T-90': 2,
      'T-60': 3,
      'T-30': 4,
      'T-15': 5,
      'T-7': 6,
      'T-0': 7,
      'Overdue': 8
    };

    fc.assert(
      fc.property(
        fc.integer({ min: -60, max: 365 }),
        fc.integer({ min: -60, max: 365 }),
        (daysA, daysB) => {
          const stageA = maturityAlertStage(daysA);
          const stageB = maturityAlertStage(daysB);

          const rankA = stageA ? stageRank[stageA] : -1;
          const rankB = stageB ? stageRank[stageB] : -1;

          // If daysA < daysB (closer to or past maturity), rankA must be >= rankB
          if (daysA < daysB) {
            expect(rankA).toBeGreaterThanOrEqual(rankB);
          } else if (daysA > daysB) {
            expect(rankB).toBeGreaterThanOrEqual(rankA);
          } else {
            expect(rankA).toBe(rankB);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
