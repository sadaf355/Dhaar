import type { Deposit } from '../data/seed';
import type { ReleaseCase } from '../context/useDhaarStore';

export type AlertStage = 'T-180' | 'T-90' | 'T-60' | 'T-30' | 'T-15' | 'T-7' | 'T-0' | '+1' | '+15';
export type AlertChannel = 'In-App' | 'Email' | 'SMS' | 'WhatsApp';
export type OutboxStatus = 'queued' | 'delivered' | 'failed';

export interface AlertStageConfig {
  stage: AlertStage;
  daysToMaturity: number; // e.g. 180, 90, 60, 30, 15, 7, 0, -1, -15
  isOverdue: boolean;
  recipients: string[];
  severity: 'Critical' | 'Warning' | 'Info';
  primaryChannel: AlertChannel;
  fallbackChannel?: AlertChannel;
}

export const DEFAULT_ALERT_LADDER: AlertStageConfig[] = [
  {
    stage: 'T-180',
    daysToMaturity: 180,
    isOverdue: false,
    recipients: ['Institution'],
    severity: 'Info',
    primaryChannel: 'Email',
    fallbackChannel: 'In-App'
  },
  {
    stage: 'T-90',
    daysToMaturity: 90,
    isOverdue: false,
    recipients: ['Institution'],
    severity: 'Info',
    primaryChannel: 'Email',
    fallbackChannel: 'In-App'
  },
  {
    stage: 'T-60',
    daysToMaturity: 60,
    isOverdue: false,
    recipients: ['Institution'],
    severity: 'Warning',
    primaryChannel: 'WhatsApp',
    fallbackChannel: 'Email'
  },
  {
    stage: 'T-30',
    daysToMaturity: 30,
    isOverdue: false,
    recipients: ['Institution', 'Regional Officer'],
    severity: 'Warning',
    primaryChannel: 'WhatsApp',
    fallbackChannel: 'SMS'
  },
  {
    stage: 'T-15',
    daysToMaturity: 15,
    isOverdue: false,
    recipients: ['Institution', 'Regional Officer'],
    severity: 'Warning',
    primaryChannel: 'SMS',
    fallbackChannel: 'Email'
  },
  {
    stage: 'T-7',
    daysToMaturity: 7,
    isOverdue: false,
    recipients: ['Institution', 'Regional Officer', 'Approving Authority'],
    severity: 'Critical',
    primaryChannel: 'SMS',
    fallbackChannel: 'WhatsApp'
  },
  {
    stage: 'T-0',
    daysToMaturity: 0,
    isOverdue: false,
    recipients: ['Institution', 'Regional Officer', 'Approving Authority'],
    severity: 'Critical',
    primaryChannel: 'SMS',
    fallbackChannel: 'In-App'
  },
  {
    stage: '+1',
    daysToMaturity: -1,
    isOverdue: true,
    recipients: ['Institution', 'Regional Officer', 'Approving Authority', 'Bureau Head'],
    severity: 'Critical',
    primaryChannel: 'SMS',
    fallbackChannel: 'Email'
  },
  {
    stage: '+15',
    daysToMaturity: -15,
    isOverdue: true,
    recipients: ['Institution', 'Regional Officer', 'Approving Authority', 'Bureau Head'],
    severity: 'Critical',
    primaryChannel: 'Email',
    fallbackChannel: 'In-App'
  }
];

export interface OutboxAlert {
  id: string;
  dedupeKey: string;
  depositId: string;
  fdrNo: string;
  institutionCode: string;
  institutionName: string;
  stage: AlertStage;
  daysRemaining: number;
  recipient: string;
  channel: AlertChannel;
  originalChannel: AlertChannel;
  status: OutboxStatus;
  attemptCount: number;
  content: string;
  generatedDate: string;
  deliveredAt?: string;
  fallbackReason?: string;
}

export interface SlaItem {
  id: string;
  name: string;
  referenceId: string;
  targetType: 'Bank Response' | 'Scrutiny' | 'Query Response' | 'Release Ageing';
  startedAt: string;
  dueAt: string;
  daysRemaining: number;
  breached: boolean;
  status: 'On track' | 'At risk' | 'Breached';
  escalatedTo?: string;
}

/**
 * Checks if current time is within quiet hours (e.g. 21:00 to 08:00 local time).
 */
export function isQuietHour(hour: number = new Date().getHours()): boolean {
  return hour >= 21 || hour < 8;
}

/**
 * Generates alert dedupe key: ${depositId}-${stage}-${recipient}-${channel}
 */
export function makeDedupeKey(depositId: string, stage: AlertStage, recipient: string, channel: AlertChannel): string {
  return `${depositId}:${stage}:${recipient.toLowerCase().replace(/\s+/g, '-')}:${channel}`;
}

/**
 * Maps days to maturity to active ladder stage.
 */
export function getActiveLadderStage(days: number): AlertStage | null {
  if (days <= -15) return '+15';
  if (days < 0) return '+1';
  if (days === 0) return 'T-0';
  if (days <= 7) return 'T-7';
  if (days <= 15) return 'T-15';
  if (days <= 30) return 'T-30';
  if (days <= 60) return 'T-60';
  if (days <= 90) return 'T-90';
  if (days <= 180) return 'T-180';
  return null;
}

/**
 * Deterministically generates alerts and Outbox items from current deposits and simulated date.
 */
export function generateOutboxAlerts(
  deposits: Deposit[],
  simulatedDate: string,
  ladder: AlertStageConfig[] = DEFAULT_ALERT_LADDER,
  quietHoursActive: boolean = false
): OutboxAlert[] {
  const alerts: OutboxAlert[] = [];
  const nowMs = Date.parse(`${simulatedDate}T00:00:00Z`);

  deposits.forEach(d => {
    if (d.status === 'Released' || !d.maturityDate) return;
    const matMs = Date.parse(`${d.maturityDate}T00:00:00Z`);
    const days = Math.round((matMs - nowMs) / 86400000);
    const stageName = getActiveLadderStage(days);
    if (!stageName) return;

    const stageCfg = ladder.find(s => s.stage === stageName);
    if (!stageCfg) return;

    stageCfg.recipients.forEach(recipient => {
      const channel = stageCfg.primaryChannel;
      const dedupeKey = makeDedupeKey(d.id, stageName, recipient, channel);

      // Deterministic channel simulation: e.g., WhatsApp to Approver occasionally fails to trigger fallback
      let status: OutboxStatus = quietHoursActive ? 'queued' : 'delivered';
      let effectiveChannel = channel;
      let fallbackReason: string | undefined = undefined;

      if (channel === 'WhatsApp' && recipient.includes('Authority')) {
        // Mock WhatsApp policy rejection -> triggers fallback to SMS
        status = 'failed';
        effectiveChannel = stageCfg.fallbackChannel || 'SMS';
        fallbackReason = 'Primary WhatsApp business delivery failure; automated fallback to SMS activated';
      }

      const content = days < 0
        ? `[AICTE URGENT] Deposit ${d.fdrNo} (${d.institution}) is OVERDUE by ${Math.abs(days)} day(s). Immediate renewal or forfeiture review mandated.`
        : days === 0
        ? `[AICTE ACTION TODAY] Deposit ${d.fdrNo} (${d.institution}) matures TODAY. Submit renewal or release documentation.`
        : `[AICTE NOTICE] Security deposit ${d.fdrNo} (${d.institution}) reaches maturity in ${days} day(s) (${d.maturityDate}). Stage: ${stageName}.`;

      alerts.push({
        id: `ALT-${d.id}-${stageName}-${recipient.replace(/\s+/g, '')}`,
        dedupeKey,
        depositId: d.id,
        fdrNo: d.fdrNo,
        institutionCode: d.institutionCode,
        institutionName: d.institution,
        stage: stageName,
        daysRemaining: days,
        recipient,
        channel: effectiveChannel,
        originalChannel: channel,
        status: quietHoursActive ? 'queued' : status,
        attemptCount: status === 'failed' ? 2 : 1,
        content,
        generatedDate: simulatedDate,
        deliveredAt: status === 'delivered' ? simulatedDate : undefined,
        fallbackReason
      });
    });
  });

  return alerts;
}

/**
 * Calculates SLA items for bank confirmations, scrutiny, queries, and release cases.
 */
export function calculateSlas(
  deposits: Deposit[],
  releaseCases: ReleaseCase[],
  simulatedDate: string
): SlaItem[] {
  const items: SlaItem[] = [];
  const nowMs = Date.parse(`${simulatedDate}T00:00:00Z`);

  // 1. Bank Confirmation SLA: 7 days from request
  deposits
    .filter(d => d.bankRequestStatus === 'Requested' && d.requestExpiresAt)
    .forEach(d => {
      const dueMs = Date.parse(`${d.requestExpiresAt}T00:00:00Z`);
      const daysLeft = Math.round((dueMs - nowMs) / 86400000);
      const breached = daysLeft < 0;
      items.push({
        id: `SLA-BANK-${d.id}`,
        name: `Bank Attestation SLA (7 Days) · ${d.bank}`,
        referenceId: d.id,
        targetType: 'Bank Response',
        startedAt: d.submitted,
        dueAt: d.requestExpiresAt!,
        daysRemaining: daysLeft,
        breached,
        status: breached ? 'Breached' : daysLeft <= 2 ? 'At risk' : 'On track',
        escalatedTo: breached ? 'Approving Authority & Zonal Desk' : undefined
      });
    });

  // 2. Scrutiny SLA: 5 days from intake
  deposits
    .filter(d => d.grade === 'E0' && d.status === 'Under review')
    .forEach(d => {
      const subMs = Date.parse(`${d.submitted}T00:00:00Z`);
      const dueMs = subMs + 5 * 86400000;
      const daysLeft = Math.round((dueMs - nowMs) / 86400000);
      const breached = daysLeft < 0;
      items.push({
        id: `SLA-SCRUTINY-${d.id}`,
        name: `Initial Scrutiny SLA (5 Days) · ${d.institution}`,
        referenceId: d.id,
        targetType: 'Scrutiny',
        startedAt: d.submitted,
        dueAt: new Date(dueMs).toISOString().split('T')[0],
        daysRemaining: daysLeft,
        breached,
        status: breached ? 'Breached' : daysLeft <= 1 ? 'At risk' : 'On track',
        escalatedTo: breached ? 'Regional Officer' : undefined
      });
    });

  // 3. Release Ageing SLA: 14 days maximum from request
  releaseCases
    .filter(c => c.stage !== 'Reconciled' && !c.hold)
    .forEach(c => {
      const startMs = Date.parse(`${c.updated}T00:00:00Z`);
      const dueMs = startMs + 14 * 86400000;
      const daysLeft = Math.round((dueMs - nowMs) / 86400000);
      const breached = daysLeft < 0;
      items.push({
        id: `SLA-RELEASE-${c.id}`,
        name: `Release Case Ageing SLA (14 Days) · Case ${c.id}`,
        referenceId: c.id,
        targetType: 'Release Ageing',
        startedAt: c.updated,
        dueAt: new Date(dueMs).toISOString().split('T')[0],
        daysRemaining: daysLeft,
        breached,
        status: breached ? 'Breached' : daysLeft <= 3 ? 'At risk' : 'On track',
        escalatedTo: breached ? 'Approving Authority & Finance Desk' : undefined
      });
    });

  return items;
}

/**
 * Builds a daily officer digest preview.
 */
export function buildDailyOfficerDigest(
  officerName: string,
  role: string,
  simulatedDate: string,
  outbox: OutboxAlert[],
  slas: SlaItem[]
): {
  headline: string;
  totalAlerts: number;
  criticalEscalations: number;
  breachedSlas: number;
  summaryItems: string[];
} {
  const criticalAlerts = outbox.filter(a => a.stage === '+1' || a.stage === '+15' || a.stage === 'T-0' || a.stage === 'T-7');
  const breached = slas.filter(s => s.breached);

  const summaryItems: string[] = [
    `${criticalAlerts.length} high-priority maturity escalations scheduled for today (${simulatedDate}).`,
    `${breached.length} operational SLAs are currently breached and escalated to supervisory review.`,
    `${outbox.filter(a => a.status === 'delivered').length} channel notifications successfully transmitted across WhatsApp, SMS, and Email.`
  ];

  return {
    headline: `Daily Executive Summary for ${officerName} (${role}) — ${simulatedDate}`,
    totalAlerts: outbox.length,
    criticalEscalations: criticalAlerts.length,
    breachedSlas: breached.length,
    summaryItems
  };
}
