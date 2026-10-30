import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedDeposits, type Deposit } from '../data/seed';
import { DEMO_USERS, type DemoUser, type DemoRole } from '../data/users';
import { INITIAL_APH_EDITIONS, type AphEdition } from '../lib/aphParameters';
import { DEFAULT_ALERT_LADDER, type AlertStageConfig } from '../lib/alertsEngine';
import { SEED_EXTRACTIONS, type SimulatedExtraction } from '../lib/simulatedExtraction';
import { generateDeterministicCohort } from '../lib/cohortGenerator';
import { DEFAULT_BASELINE_ASSUMPTIONS, type BaselineAssumptions } from '../lib/empiricalMetrics';
import { sha256, computeDailyMerkleDigests, type DailyDigest } from '../lib/merkleAudit';
export { sha256 };

export type FindingRecord = {
  id: string;
  depositId: string;
  ruleId: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Resolved' | 'Waiver pending approval' | 'Waived';
  detail: string;
  waiverReason?: string;
  waiverRequestedBy?: string;
  waiverRequestedByUserId?: string;
  waiverApprovedBy?: string;
  waiverApprovedByUserId?: string;
  createdAt: string;
  userId?: string;
};

export type ReleaseStage =
  | 'Requested'
  | 'Maker checked'
  | 'Checker approved'
  | 'Authority approved'
  | 'Bank acknowledged'
  | 'Reconciled'
  | 'On hold';

export type ReleaseCase = {
  id: string;
  depositId: string;
  stage: ReleaseStage;
  hold: boolean;
  holdReason?: string;
  refundAccount: string;
  refundVerified: boolean;
  refundName?: string;
  expectedRefundName?: string;
  refundNameMatch?: boolean;
  maker?: string;
  makerUserId?: string;
  checker?: string;
  checkerUserId?: string;
  approver?: string;
  approverUserId?: string;
  reconciledByUserId?: string;
  noc: boolean;
  nocCode?: string;
  nocIssuedAt?: string;
  bankAckRef?: string;
  bankAckDate?: string;
  bankAckBy?: string;
  bankAckByUserId?: string;
  refundUtr?: string;
  refundDate?: string;
  refundAmount?: number;
  refundPenaltyDeducted?: number;
  refundReconciled?: boolean;
  closedAt?: string;
  updated: string;
  userId?: string;
};

export type HoldRecord = {
  id: string;
  scope: 'Instrument' | 'Institution';
  targetId: string;
  reason: string;
  status: 'Active' | 'Released';
  createdAt: string;
  createdBy: string;
  createdByUserId?: string;
  releasedAt?: string;
  releasedBy?: string;
  releasedByUserId?: string;
};

export type AuditEvent = {
  id: number;
  title: string;
  detail: string;
  time: string;
  isoTimestamp: string;
  simulatedDate: string;
  kind: string;
  actor: string;
  userId: string;
  beforeHash?: string;
  afterHash?: string;
  hash: string;
  previousHash: string;
};

export interface BankVerificationTokenRecord {
  tokenHash: string;      // SHA-256 of raw single-use token
  depositId: string;
  bank: string;
  demoOtp: string;        // E.g. "482910"
  createdAt: string;
  expiresAt: string;      // 7 simulated days from creation
  used: boolean;
  usedAt?: string;
  rawTokenForDemo?: string; // Stored only for copyable demo link convenience in frontend demo
}

const initialReleaseCases: ReleaseCase[] = [
  {
    id: 'REL-1007',
    depositId: 'DHAAR-24076',
    stage: 'Requested',
    hold: false,
    refundAccount: '•••• 4821',
    refundVerified: true,
    refundName: 'Western Regional Technical Institute',
    expectedRefundName: 'Western Regional Technical Institute',
    refundNameMatch: true,
    noc: false,
    updated: '2026-10-29'
  },
  {
    id: 'REL-1006',
    depositId: 'DHAAR-24080',
    stage: 'On hold',
    hold: true,
    holdReason: 'Demo dispute hold',
    refundAccount: 'Not verified',
    refundVerified: false,
    refundName: 'North Valley Institute',
    expectedRefundName: 'North Valley Institute of Technology',
    refundNameMatch: false,
    noc: false,
    updated: '2026-10-28'
  }
];



export function recordHash(record: any): string {
  if (!record) return 'NONE';
  const clean = JSON.stringify(record, Object.keys(record).sort());
  return sha256(clean).toLowerCase();
}

// B5: Extended with beforeHash and afterHash while preserving backward compatibility
export const eventPayload = (e: Omit<AuditEvent, 'hash'>) => {
  const parts = [
    e.previousHash,
    e.id,
    e.title,
    e.detail,
    e.time,
    e.isoTimestamp,
    e.simulatedDate,
    e.kind,
    e.actor,
    e.userId || ''
  ];
  if (e.beforeHash !== undefined || e.afterHash !== undefined) {
    parts.push(e.beforeHash || 'NONE', e.afterHash || 'NONE');
  }
  return parts.join('|');
};

const firstEventBase = {
  id: 1,
  title: 'Workspace initialized',
  detail: 'Synthetic DHAAR portfolio loaded',
  time: '10:00 AM',
  isoTimestamp: '2026-10-30T10:00:00.000Z',
  simulatedDate: '2026-10-30',
  kind: 'info',
  actor: 'System',
  userId: 'system',
  previousHash: 'GENESIS'
};

const initialEvents: AuditEvent[] = [{ ...firstEventBase, hash: sha256(eventPayload(firstEventBase)) }];

const initialDailyDigests = computeDailyMerkleDigests([
  {
    id: '1',
    action: firstEventBase.title,
    details: firstEventBase.detail,
    actorRole: firstEventBase.actor,
    userId: firstEventBase.userId,
    tone: 'info',
    isoTimestamp: firstEventBase.isoTimestamp,
    simulatedDate: firstEventBase.simulatedDate,
    prevHash: firstEventBase.previousHash,
    hash: initialEvents[0].hash
  }
]);

type Store = {
  deposits: Deposit[];
  addDeposit: (d: Deposit) => void;
  updateDeposit: (id: string, patch: Partial<Deposit>) => void;
  simulatedDate: string;
  setSimulatedDate: (date: string) => void;
  resetDemo: () => void;
  events: AuditEvent[];
  verifyAudit: () => boolean;
  role: string;
  setRole: (role: string) => void;
  currentUserId: string;
  setCurrentUser: (userId: string) => void;
  addEvent: (title: string, detail: string, kind?: string, beforeHash?: string, afterHash?: string) => void;
  // Cohort generator
  isCohortLoaded: boolean;
  cohortMeta?: { institutionsCount: number; instrumentsCount: number; generatedAt: string; seedUsed: number };
  loadCohort: (seed?: number) => void;
  unloadCohort: () => void;
  // Daily Merkle digests
  dailyDigests: Record<string, DailyDigest>;
  // Baseline assumptions
  baselineAssumptions: BaselineAssumptions;
  updateBaselineAssumptions: (patch: Partial<BaselineAssumptions>) => void;
  findings: FindingRecord[];
  addFinding: (f: FindingRecord) => void;
  updateFinding: (id: string, patch: Partial<FindingRecord>) => void;
  releaseCases: ReleaseCase[];
  upsertReleaseCase: (c: ReleaseCase) => void;
  holds: HoldRecord[];
  upsertHold: (h: HoldRecord) => void;
  bankTokens: BankVerificationTokenRecord[];
  addBankToken: (t: BankVerificationTokenRecord) => void;
  markBankTokenUsed: (tokenHash: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  // APH Parameters
  aphEditions: AphEdition[];
  activeEditionId: string;
  setActiveEdition: (id: string) => void;
  upsertAphEdition: (edition: AphEdition) => void;
  // Alert ladder config
  alertLadder: AlertStageConfig[];
  setAlertLadder: (ladder: AlertStageConfig[]) => void;
  // Extraction field confirmations: { [depositId]: { [fieldName]: confirmed } }
  extractionConfirmations: Record<string, Record<string, boolean>>;
  confirmExtractionField: (depositId: string, fieldName: string, confirmed: boolean) => void;
  resetExtractionConfirmations: (depositId: string) => void;
};

export const useDhaarStore = create<Store>()(
  persist(
    (set, get) => ({
      deposits: seedDeposits,
      addDeposit: (d) => {
        // Enforce: Initial submission is always E0 declared
        const safeDeposit: Deposit = {
          ...d,
          grade: 'E0',
          bankRequestStatus: d.bankRequestStatus === 'Requested' ? 'Requested' : 'Not requested'
        };
        set((s) => ({ deposits: [safeDeposit, ...s.deposits] }));
      },
      updateDeposit: (id, patch) => {
        const s = get();
        const role = s.role;
        const target = s.deposits.find((d) => d.id === id);
        if (!target) return;

        // Security check: Grade promotion restrictions
        if (patch.grade !== undefined && patch.grade !== target.grade) {
          if (patch.grade === 'E1') {
            if (role !== 'Regional Officer') {
              throw new Error(`Unauthorized: Role '${role}' cannot promote deposit to E1. Only Regional Officer is allowed.`);
            }
          } else if (patch.grade === 'E2') {
            if (role !== 'Bank Verifier') {
              throw new Error(`Unauthorized: Role '${role}' cannot promote deposit to E2. Only Bank Verifier is allowed.`);
            }
            if (target.grade !== 'E1') {
              throw new Error(`Unauthorized: Cannot promote to E2 from '${target.grade}'. Deposit must be in E1 Reviewed status.`);
            }
            const lienConfirmed = patch.bankLien !== undefined ? patch.bankLien : (target.lien || target.bankLien);
            if (!lienConfirmed) {
              throw new Error(`Unauthorized: Cannot promote deposit to E2 without an active joint lien.`);
            }
          } else if (patch.grade === 'E3') {
            throw new Error(`Unauthorized: Manual promotion to E3 is not permitted.`);
          }
        }

        // Security check: Marking deposit Released
        if (patch.status === 'Released' && target.status !== 'Released') {
          if (role !== 'Approving Authority') {
            throw new Error(`Unauthorized: Role '${role}' cannot mark deposit as Released. Only Approving Authority is allowed.`);
          }
        }

        set((state) => ({
          deposits: state.deposits.map((d) => (d.id === id ? { ...d, ...patch } : d))
        }));
      },
      simulatedDate: '2026-10-30',
      setSimulatedDate: (date) => set({ simulatedDate: date }),
      events: initialEvents,
      currentUserId: 'usr-ia-1',
      role: 'Institution Admin',
      setCurrentUser: (userId) => {
        const u = DEMO_USERS.find((x) => x.id === userId);
        if (u) {
          set({ currentUserId: u.id, role: u.role });
        }
      },
      setRole: (role) => {
        const u = DEMO_USERS.find((x) => x.role === role);
        set({ role, currentUserId: u ? u.id : get().currentUserId });
      },
      addEvent: (title, detail, kind = 'info', beforeHash, afterHash) =>
        set((s) => {
          const id = Math.max(Date.now(), (s.events[0]?.id || 0) + 1);
          const now = new Date();
          const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isoTimestamp = now.toISOString();
          const simulatedDate = s.simulatedDate;
          const previousHash = s.events[0]?.hash || 'GENESIS';
          const actor = s.role;
          const userId = s.currentUserId || 'system';

          const base = {
            id,
            title,
            detail,
            time,
            isoTimestamp,
            simulatedDate,
            kind,
            actor,
            userId,
            beforeHash,
            afterHash,
            previousHash
          };
          const event = { ...base, hash: sha256(eventPayload(base)) };
          const all = [event, ...s.events].slice(0, 300);
          const digests = computeDailyMerkleDigests(
            all.map((x) => ({
              id: String(x.id),
              action: x.title,
              details: x.detail,
              actorRole: x.actor,
              userId: x.userId,
              tone: x.kind === 'warning' || x.kind === 'success' ? x.kind : 'info',
              isoTimestamp: x.isoTimestamp,
              simulatedDate: x.simulatedDate,
              beforeHash: x.beforeHash,
              afterHash: x.afterHash,
              prevHash: x.previousHash,
              hash: x.hash
            }))
          );
          return { events: all, dailyDigests: digests };
        }),
      isCohortLoaded: false,
      cohortMeta: undefined,
      loadCohort: (seed = 1337) => {
        const cohort = generateDeterministicCohort(seed);
        set({
          deposits: cohort.deposits,
          isCohortLoaded: true,
          cohortMeta: {
            institutionsCount: cohort.institutions.length,
            instrumentsCount: cohort.deposits.length,
            generatedAt: cohort.generatedAt,
            seedUsed: cohort.seedUsed
          }
        });
        get().addEvent('Synthetic cohort loaded', `Loaded ${cohort.deposits.length} instruments across ${cohort.institutions.length} institutions (seed: ${seed})`, 'info');
      },
      unloadCohort: () => {
        set({
          deposits: seedDeposits,
          isCohortLoaded: false,
          cohortMeta: undefined
        });
        get().addEvent('Cohort unloaded', 'Reverted to default seed deposit dataset', 'info');
      },
      dailyDigests: initialDailyDigests,
      baselineAssumptions: DEFAULT_BASELINE_ASSUMPTIONS,
      updateBaselineAssumptions: (patch) =>
        set((s) => ({
          baselineAssumptions: { ...s.baselineAssumptions, ...patch }
        })),
      verifyAudit: () => {
        const rows = [...get().events].reverse();
        for (let i = 0; i < rows.length; i++) {
          const e = rows[i];
          if (i > 0 && e.previousHash !== rows[i - 1].hash) return false;
          if (e.hash !== sha256(eventPayload(e))) return false;
        }
        return true;
      },
      findings: [],
      addFinding: (f) =>
        set((s) => ({
          findings: [
            { ...f, userId: f.userId || s.currentUserId },
            ...s.findings.filter((x) => x.id !== f.id)
          ]
        })),
      updateFinding: (id, patch) => {
        const s = get();
        const role = s.role;
        const currentUserId = s.currentUserId;
        const target = s.findings.find((f) => f.id === id);

        if (target && patch.status !== undefined && patch.status !== target.status) {
          if (patch.status === 'Waiver pending approval') {
            if (role !== 'Regional Officer' && role !== 'Checker') {
              throw new Error(`Unauthorized: Role '${role}' cannot request finding waiver.`);
            }
          } else if (patch.status === 'Waived') {
            if (role !== 'Approving Authority') {
              throw new Error(`Unauthorized: Role '${role}' cannot approve finding waiver. Only Approving Authority is allowed.`);
            }
            const approverId = patch.waiverApprovedByUserId || currentUserId;
            if (target.waiverRequestedByUserId && (target.waiverRequestedByUserId === approverId || target.waiverRequestedByUserId === currentUserId)) {
              throw new Error(`Unauthorized: Waiver requester cannot approve their own waiver request.`);
            }
          } else if (patch.status === 'Resolved') {
            if (!['Regional Officer', 'Approving Authority', 'Checker'].includes(role)) {
              throw new Error(`Unauthorized: Role '${role}' cannot resolve finding.`);
            }
          }
        }

        set((state) => ({
          findings: state.findings.map((f) => (f.id === id ? { ...f, ...patch } : f))
        }));
      },
      releaseCases: initialReleaseCases,
      upsertReleaseCase: (c) => {
        const s = get();
        const role = s.role;
        const currentUserId = s.currentUserId;
        const existing = s.releaseCases.find((x) => x.id === c.id);

        // 1. Refund account verification
        if (c.refundVerified && (!existing || !existing.refundVerified)) {
          if (role !== 'Accounts Officer') {
            throw new Error(`Unauthorized: Role '${role}' cannot verify refund accounts. Only Accounts Officer is allowed.`);
          }
        }

        // 2. Case hold manipulation
        if (existing) {
          if (c.hold && !existing.hold) {
            if (role !== 'Regional Officer' && role !== 'Approving Authority') {
              throw new Error(`Unauthorized: Role '${role}' cannot place release on hold.`);
            }
          } else if (!c.hold && existing.hold) {
            if (role !== 'Approving Authority') {
              throw new Error(`Unauthorized: Role '${role}' cannot clear release hold. Only Approving Authority is allowed.`);
            }
          }
        }

        // 3. Stage progression gating
        if (c.stage !== existing?.stage) {
          if (c.stage === 'Maker checked') {
            if (role !== 'Regional Officer') {
              throw new Error(`Unauthorized: Role '${role}' cannot complete maker check.`);
            }
          } else if (c.stage === 'Checker approved') {
            if (role !== 'Checker') {
              throw new Error(`Unauthorized: Role '${role}' cannot approve release as Checker.`);
            }
            const checkerId = c.checkerUserId || currentUserId;
            if (existing?.makerUserId && (existing.makerUserId === checkerId || existing.makerUserId === currentUserId)) {
              throw new Error(`Unauthorized: Maker user '${existing.makerUserId}' cannot act as Checker on the same release.`);
            }
          } else if (c.stage === 'Authority approved') {
            if (role !== 'Approving Authority') {
              throw new Error(`Unauthorized: Role '${role}' cannot grant competent authority approval.`);
            }
            const authId = c.approverUserId || currentUserId;
            if (existing?.makerUserId && (existing.makerUserId === authId || existing.makerUserId === currentUserId)) {
              throw new Error(`Unauthorized: Maker user cannot grant authority approval.`);
            }
            if (existing?.checkerUserId && (existing.checkerUserId === authId || existing.checkerUserId === currentUserId)) {
              throw new Error(`Unauthorized: Checker user cannot grant authority approval.`);
            }
            if (c.hold) {
              throw new Error(`Unauthorized: Cannot grant authority approval while release is on hold.`);
            }
            if (c.refundNameMatch === false) {
              throw new Error(`Unauthorized: Cannot grant authority approval with refund name mismatch.`);
            }
          } else if (c.stage === 'Bank acknowledged') {
            if (role !== 'Bank Verifier') {
              throw new Error(`Unauthorized: Role '${role}' cannot record bank acknowledgement.`);
            }
          } else if (c.stage === 'Reconciled') {
            if (role !== 'Approving Authority') {
              throw new Error(`Unauthorized: Role '${role}' cannot reconcile release.`);
            }
            const recId = c.reconciledByUserId || c.approverUserId || currentUserId;
            if (existing?.makerUserId && (existing.makerUserId === recId || existing.makerUserId === currentUserId)) {
              throw new Error(`Unauthorized: Maker user cannot reconcile release.`);
            }
            if (existing?.checkerUserId && (existing.checkerUserId === recId || existing.checkerUserId === currentUserId)) {
              throw new Error(`Unauthorized: Checker user cannot reconcile release.`);
            }
            if (!c.refundVerified) {
              throw new Error(`Unauthorized: Cannot reconcile release without verified refund account.`);
            }
            if (c.hold) {
              throw new Error(`Unauthorized: Cannot reconcile release while on hold.`);
            }
          }
        }

        set((state) => ({
          releaseCases: [
            { ...c, userId: c.userId || state.currentUserId },
            ...state.releaseCases.filter((x) => x.id !== c.id)
          ]
        }));
      },
      holds: [
        {
          id: 'HOLD-1001',
          scope: 'Instrument',
          targetId: 'DHAAR-24080',
          reason: 'Demo dispute hold',
          status: 'Active',
          createdAt: '2026-10-28',
          createdBy: 'Regional Officer',
          createdByUserId: 'usr-ro-1'
        }
      ],
      upsertHold: (h) => {
        const s = get();
        const role = s.role;
        if (h.status === 'Released') {
          if (role !== 'Approving Authority') {
            throw new Error(`Unauthorized: Role '${role}' cannot release a hold. Only Approving Authority is allowed.`);
          }
        } else if (h.status === 'Active') {
          if (role !== 'Regional Officer' && role !== 'Approving Authority') {
            throw new Error(`Unauthorized: Role '${role}' cannot create a hold. Only Regional Officer or Approving Authority is allowed.`);
          }
        }

        set((state) => ({
          holds: [
            { ...h, createdByUserId: h.createdByUserId || state.currentUserId },
            ...state.holds.filter((x) => x.id !== h.id)
          ]
        }));
      },
      bankTokens: [],
      addBankToken: (t) =>
        set((s) => ({
          bankTokens: [t, ...s.bankTokens.filter((x) => x.tokenHash !== t.tokenHash)]
        })),
      markBankTokenUsed: (tokenHash) =>
        set((s) => ({
          bankTokens: s.bankTokens.map((t) =>
            t.tokenHash === tokenHash
              ? { ...t, used: true, usedAt: s.simulatedDate }
              : t
          )
        })),
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      // APH Parameters
      aphEditions: INITIAL_APH_EDITIONS,
      activeEditionId: 'aph-2025-26',
      setActiveEdition: (id) => set({ activeEditionId: id }),
      upsertAphEdition: (edition) =>
        set((s) => ({
          aphEditions: [
            edition,
            ...s.aphEditions.filter((e) => e.id !== edition.id)
          ]
        })),
      // Alert ladder config
      alertLadder: DEFAULT_ALERT_LADDER,
      setAlertLadder: (ladder) => set({ alertLadder: ladder }),
      // Extraction field confirmations
      extractionConfirmations: {},
      confirmExtractionField: (depositId, fieldName, confirmed) =>
        set((s) => ({
          extractionConfirmations: {
            ...s.extractionConfirmations,
            [depositId]: {
              ...(s.extractionConfirmations[depositId] || {}),
              [fieldName]: confirmed
            }
          }
        })),
      resetExtractionConfirmations: (depositId) =>
        set((s) => {
          const next = { ...s.extractionConfirmations };
          delete next[depositId];
          return { extractionConfirmations: next };
        }),
      resetDemo: () =>
        set({
          deposits: seedDeposits,
          simulatedDate: '2026-10-30',
          findings: [],
          releaseCases: initialReleaseCases,
          holds: [
            {
              id: 'HOLD-1001',
              scope: 'Instrument',
              targetId: 'DHAAR-24080',
              reason: 'Demo dispute hold',
              status: 'Active',
              createdAt: '2026-10-28',
              createdBy: 'Regional Officer',
              createdByUserId: 'usr-ro-1'
            }
          ],
          bankTokens: [],
          theme: 'light',
          currentUserId: 'usr-ia-1',
          role: 'Institution Admin',
          events: initialEvents,
          aphEditions: INITIAL_APH_EDITIONS,
          activeEditionId: 'aph-2025-26',
          alertLadder: DEFAULT_ALERT_LADDER,
          extractionConfirmations: {},
          isCohortLoaded: false,
          cohortMeta: undefined,
          dailyDigests: initialDailyDigests,
          baselineAssumptions: DEFAULT_BASELINE_ASSUMPTIONS
        })
    }),
    {
      name: 'dhaar-demo-v6',
      version: 6,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;
        if (version < 4 && Array.isArray(persistedState.events)) {
          let prevHash = 'GENESIS';
          const migratedEvents = [...persistedState.events].reverse().map((e: any, idx: number) => {
            const iso = e.isoTimestamp || new Date('2026-10-30T10:00:00Z').toISOString();
            const sDate = e.simulatedDate || '2026-10-30';
            const uId = e.userId || 'system';
            const base = { ...e, isoTimestamp: iso, simulatedDate: sDate, userId: uId, previousHash: idx === 0 ? 'GENESIS' : prevHash };
            const hash = sha256(eventPayload(base));
            prevHash = hash;
            return { ...base, hash };
          }).reverse();
          persistedState.events = migratedEvents;
        }
        if (version < 5) {
          if (!persistedState.aphEditions) persistedState.aphEditions = INITIAL_APH_EDITIONS;
          if (!persistedState.activeEditionId) persistedState.activeEditionId = 'aph-2025-26';
          if (!persistedState.alertLadder) persistedState.alertLadder = DEFAULT_ALERT_LADDER;
          if (!persistedState.extractionConfirmations) persistedState.extractionConfirmations = {};
        }
        if (version < 6) {
          persistedState.isCohortLoaded = false;
          persistedState.dailyDigests = initialDailyDigests;
          persistedState.baselineAssumptions = DEFAULT_BASELINE_ASSUMPTIONS;
        }
        return persistedState;
      },
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<Store>) })
    }
  )
);

if (typeof window !== 'undefined') {
  (window as any).useDhaarStore = useDhaarStore;
}
