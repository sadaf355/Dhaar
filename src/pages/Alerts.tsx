import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, BellOff, CheckCircle2, ChevronDown, ChevronRight, Clock, Mail, MessageSquare, Phone, RefreshCw, Zap } from 'lucide-react';
import { useDhaarStore } from '../context/useDhaarStore';
import { generateOutboxAlerts, calculateSlas, buildDailyOfficerDigest, type OutboxAlert, type SlaItem } from '../lib/alertsEngine';
import { DEMO_USERS } from '../data/users';
import Badge from '../components/Badge';

const CHANNEL_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  'In-App': Bell,
  'Email': Mail,
  'SMS': Phone,
  'WhatsApp': MessageSquare
};

const STATUS_TONES: Record<string, 'green' | 'amber' | 'red' | 'neutral'> = {
  delivered: 'green',
  queued: 'amber',
  failed: 'red'
};

export default function Alerts() {
  const deposits = useDhaarStore(s => s.deposits);
  const releaseCases = useDhaarStore(s => s.releaseCases);
  const simulatedDate = useDhaarStore(s => s.simulatedDate);
  const alertLadder = useDhaarStore(s => s.alertLadder);
  const currentUserId = useDhaarStore(s => s.currentUserId);
  const role = useDhaarStore(s => s.role);
  const currentUser = DEMO_USERS.find(u => u.id === currentUserId) || DEMO_USERS[0];

  const [quietHours, setQuietHours] = useState(false);
  const [filterStage, setFilterStage] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterChannel, setFilterChannel] = useState('All');
  const [showDigest, setShowDigest] = useState(false);
  const [expandedSla, setExpandedSla] = useState<string | null>(null);

  const outbox = useMemo(() =>
    generateOutboxAlerts(deposits, simulatedDate, alertLadder, quietHours),
    [deposits, simulatedDate, alertLadder, quietHours]
  );

  const slas = useMemo(() =>
    calculateSlas(deposits, releaseCases, simulatedDate),
    [deposits, releaseCases, simulatedDate]
  );

  const digest = useMemo(() =>
    buildDailyOfficerDigest(currentUser.name, role, simulatedDate, outbox, slas),
    [currentUser, role, simulatedDate, outbox, slas]
  );

  const stages = ['All', 'T-180', 'T-90', 'T-60', 'T-30', 'T-15', 'T-7', 'T-0', '+1', '+15'];
  const statuses = ['All', 'delivered', 'queued', 'failed'];
  const channels = ['All', 'In-App', 'Email', 'SMS', 'WhatsApp'];

  const filtered = outbox.filter(a =>
    (filterStage === 'All' || a.stage === filterStage) &&
    (filterStatus === 'All' || a.status === filterStatus) &&
    (filterChannel === 'All' || a.channel === filterChannel)
  );

  const dedupedKeys = new Set<string>();
  const deduped = filtered.filter(a => {
    if (dedupedKeys.has(a.dedupeKey)) return false;
    dedupedKeys.add(a.dedupeKey);
    return true;
  });

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">COMPLIANCE MONITORING</div>
          <h1>Alerts &amp; Outbox</h1>
          <p className="page-subtitle">Configurable maturity ladder, simulated channel outbox with fallbacks, and SLA clocks. Alert generation is deterministic per simulated date.</p>
        </div>
        <Badge tone="amber">DEMO — Simulated channels</Badge>
      </div>

      {/* Daily Digest Toggle */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Daily Officer Digest Preview</h2>
            <p>{simulatedDate}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowDigest(!showDigest)}>
            {showDigest ? 'Collapse' : 'Expand'} Digest
          </button>
        </div>
        {showDigest && (
          <div className="digest-panel">
            <div className="digest-headline">{digest.headline}</div>
            <div className="digest-stats">
              <div className="digest-stat"><span className="digest-num">{digest.totalAlerts}</span><span>Total alerts</span></div>
              <div className="digest-stat critical"><span className="digest-num">{digest.criticalEscalations}</span><span>Critical escalations</span></div>
              <div className="digest-stat red"><span className="digest-num">{digest.breachedSlas}</span><span>Breached SLAs</span></div>
              <div className="digest-stat green"><span className="digest-num">{outbox.filter(a => a.status === 'delivered').length}</span><span>Delivered</span></div>
            </div>
            <ul className="digest-items">
              {digest.summaryItems.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* Controls */}
      <section className="panel">
        <div className="panel-head">
          <h2>Outbox Filters &amp; Controls</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label className="choice-card" style={{ padding: '6px 12px', gap: '6px' }}>
              <input type="checkbox" checked={quietHours} onChange={e => setQuietHours(e.target.checked)} />
              {quietHours ? <BellOff size={14} /> : <Bell size={14} />}
              <span>Quiet Hours Active</span>
            </label>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: '12px' }}>
          <label className="field">
            Stage
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)}>
              {stages.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            Status
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            Channel
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
              {channels.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <div className="alert-outbox-summary">
          <Badge tone="neutral">{outbox.length} total</Badge>
          <Badge tone="green">{outbox.filter(a => a.status === 'delivered').length} delivered</Badge>
          <Badge tone="amber">{outbox.filter(a => a.status === 'queued').length} queued</Badge>
          <Badge tone="red">{outbox.filter(a => a.status === 'failed').length} failed (fallback applied)</Badge>
        </div>
      </section>

      {/* Outbox Table */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Simulated Outbox</h2>
            <p>Showing {deduped.length} unique alerts (deduped by key). Fallback channel applied where primary failed.</p>
          </div>
        </div>
        <div className="rule-results">
          {deduped.length === 0 && (
            <div className="info-callout"><Bell size={17} /><p>No alerts match the selected filters for the current simulated date.</p></div>
          )}
          {deduped.map(a => {
            const ChannelIcon = CHANNEL_ICONS[a.channel] || Bell;
            return (
              <div key={a.id} className="alert-outbox-row">
                <div className={`rule-result-icon ${a.status === 'delivered' ? 'ok' : a.status === 'queued' ? 'amber' : 'issue'}`}>
                  <ChannelIcon size={15} />
                </div>
                <div className="alert-outbox-body">
                  <div className="alert-outbox-header">
                    <strong>{a.institutionName}</strong>
                    <Badge tone={a.daysRemaining < 0 ? 'red' : a.daysRemaining <= 7 ? 'amber' : 'neutral'}>{a.stage}</Badge>
                    <Badge tone={STATUS_TONES[a.status] || 'neutral'}>{a.status}</Badge>
                    {a.originalChannel !== a.channel && (
                      <Badge tone="amber">↩ Fallback from {a.originalChannel}</Badge>
                    )}
                  </div>
                  <span className="alert-outbox-content">{a.content}</span>
                  <div className="alert-meta">
                    <span>→ {a.recipient}</span>
                    <span>via {a.channel}</span>
                    <span>{a.daysRemaining >= 0 ? `${a.daysRemaining}d remaining` : `${Math.abs(a.daysRemaining)}d overdue`}</span>
                    {a.fallbackReason && <span className="muted-note">{a.fallbackReason}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SLA Clocks */}
      <section className="panel">
        <div className="panel-head">
          <div><h2>SLA Clocks</h2><p>Bank response (7d), Scrutiny (5d), Release Ageing (14d). Breached SLAs are auto-escalated.</p></div>
          <Clock size={20} />
        </div>
        {slas.length === 0 && <div className="info-callout"><CheckCircle2 size={17} /><p>No active SLA clocks for the current demo state.</p></div>}
        <div className="rule-results">
          {slas.map(sla => (
            <div key={sla.id} className="alert-outbox-row">
              <div className={`rule-result-icon ${sla.status === 'On track' ? 'ok' : 'issue'}`}>
                <Clock size={15} />
              </div>
              <div className="alert-outbox-body">
                <div className="alert-outbox-header">
                  <strong>{sla.name}</strong>
                  <Badge tone={sla.breached ? 'red' : sla.status === 'At risk' ? 'amber' : 'green'}>{sla.status}</Badge>
                </div>
                <div className="alert-meta">
                  <span>Reference: {sla.referenceId}</span>
                  <span>Due: {sla.dueAt}</span>
                  <span>{sla.daysRemaining >= 0 ? `${sla.daysRemaining}d remaining` : `${Math.abs(sla.daysRemaining)}d breached`}</span>
                  {sla.escalatedTo && <span className="badge badge-red">Escalated → {sla.escalatedTo}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ladder Preview */}
      <section className="panel">
        <div className="panel-head">
          <div><h2>Alert Ladder Configuration</h2><p>Active ladder stages and recipient widening. Edit in Settings → Alert Parameters.</p></div>
        </div>
        <div className="rule-results">
          {alertLadder.map(s => (
            <div key={s.stage} className="rule-result">
              <div className={`rule-result-icon ${s.isOverdue ? 'issue' : s.daysToMaturity <= 7 ? 'amber' : 'ok'}`}>
                <Zap size={15} />
              </div>
              <div className="rule-result-copy">
                <strong>{s.stage} ({s.daysToMaturity >= 0 ? `T-${s.daysToMaturity}` : `+${Math.abs(s.daysToMaturity)}d overdue`})</strong>
                <span>→ {s.recipients.join(', ')}</span>
                <small>Primary: {s.primaryChannel}{s.fallbackChannel ? ` · Fallback: ${s.fallbackChannel}` : ''} · {s.severity}</small>
              </div>
              <Badge tone={s.isOverdue ? 'red' : s.severity === 'Critical' ? 'amber' : 'neutral'}>{s.severity}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
