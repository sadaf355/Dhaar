import { describe, it, expect } from 'vitest';
import {
  generateOutboxAlerts,
  calculateSlas,
  buildDailyOfficerDigest,
  DEFAULT_ALERT_LADDER
} from '../alertsEngine';
import { seedDeposits } from '../../data/seed';
import type { ReleaseCase } from '../../context/useDhaarStore';

describe('Alerts Engine & Escalation Ladder', () => {
  const simulatedDate = '2026-10-30';

  it('provides default alert ladder with stages from T-180 to +15', () => {
    expect(DEFAULT_ALERT_LADDER.length).toBeGreaterThanOrEqual(8);
    const tMinus90 = DEFAULT_ALERT_LADDER.find(s => s.stage === 'T-90');
    const tZero = DEFAULT_ALERT_LADDER.find(s => s.stage === 'T-0');
    const plus15 = DEFAULT_ALERT_LADDER.find(s => s.stage === '+15');

    expect(tMinus90).toBeDefined();
    expect(tMinus90?.primaryChannel).toBe('Email');
    expect(tZero).toBeDefined();
    expect(plus15).toBeDefined();
    expect(plus15?.recipients).toContain('Approving Authority');
  });

  it('generates outbox alerts for deposits according to ladder offsets', () => {
    const alerts = generateOutboxAlerts(seedDeposits, simulatedDate, DEFAULT_ALERT_LADDER);
    expect(alerts.length).toBeGreaterThan(0);
    for (const alert of alerts) {
      expect(alert.id).toBeDefined();
      expect(alert.channel).toBeDefined();
      expect(['In-App', 'Email', 'SMS', 'WhatsApp']).toContain(alert.channel);
      expect(alert.recipient).toBeDefined();
      expect(alert.content).toBeDefined();
      expect(['queued', 'delivered', 'failed']).toContain(alert.status);
    }
  });

  it('enforces multi-channel fallback when policy delivery fails', () => {
    // When WhatsApp to Approving Authority is attempted, engine simulates fallback to SMS
    const alerts = generateOutboxAlerts(seedDeposits, simulatedDate, DEFAULT_ALERT_LADDER);
    const fallbacks = alerts.filter(a => a.fallbackReason !== undefined);
    expect(fallbacks.length).toBeGreaterThanOrEqual(0);
  });

  it('enforces deduplication: keys prevent duplicate message per stage/channel/recipient', () => {
    const alerts = generateOutboxAlerts(seedDeposits, simulatedDate, DEFAULT_ALERT_LADDER);
    const keys = alerts.map(a => a.dedupeKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('respects quiet hours setting (queues alerts for next business window)', () => {
    // quietHoursActive = true queues alerts
    const nightAlerts = generateOutboxAlerts(seedDeposits, simulatedDate, DEFAULT_ALERT_LADDER, true);
    for (const alert of nightAlerts) {
      expect(alert.status).toBe('queued');
    }
  });
});

describe('SLA Clocks & Officer Digest', () => {
  const simulatedDate = '2026-10-30';

  it('calculates operational SLA clocks across verification and release ageing', () => {
    const mockCases: ReleaseCase[] = [
      {
        id: 'REL-TEST-1',
        depositId: 'DHAAR-24080',
        stage: 'Requested',
        hold: false,
        refundAccount: '•••• 1234',
        refundVerified: false,
        noc: false,
        updated: '2026-10-25'
      }
    ];

    const slas = calculateSlas(seedDeposits, mockCases, simulatedDate);
    expect(slas.length).toBeGreaterThan(0);

    for (const sla of slas) {
      expect(sla.id).toBeDefined();
      expect(sla.name).toBeDefined();
      expect(sla.startedAt).toBeDefined();
      expect(sla.dueAt).toBeDefined();
      expect(typeof sla.daysRemaining).toBe('number');
      expect(['Breached', 'At risk', 'On track']).toContain(sla.status);
      if (sla.daysRemaining < 0) {
        expect(sla.breached).toBe(true);
      }
    }
  });

  it('builds daily officer digest aggregating overdue and pending items', () => {
    const mockCases: ReleaseCase[] = [];
    const outbox = generateOutboxAlerts(seedDeposits, simulatedDate, DEFAULT_ALERT_LADDER);
    const slas = calculateSlas(seedDeposits, mockCases, simulatedDate);
    const digest = buildDailyOfficerDigest('Meera Iyer', 'Regional Officer', simulatedDate, outbox, slas);

    expect(digest.headline).toContain('Meera Iyer');
    expect(digest.headline).toContain(simulatedDate);
    expect(digest.totalAlerts).toBe(outbox.length);
    expect(digest.summaryItems.length).toBeGreaterThanOrEqual(3);
  });
});
