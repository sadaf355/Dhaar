import { useState } from 'react';
import { Activity, Clock3, Download, FileCheck2, ShieldCheck, BadgeCheck, XCircle, FileJson, ExternalLink, Hash, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDhaarStore } from '../context/useDhaarStore';
import { createAuditAnchorReceipt } from '../lib/merkleAudit';

export default function Audit() {
  const events = useDhaarStore(s => s.events);
  const verifyAudit = useDhaarStore(s => s.verifyAudit);
  const dailyDigests = useDhaarStore(s => s.dailyDigests);
  const simulatedDate = useDhaarStore(s => s.simulatedDate);

  const [verified, setVerified] = useState<boolean | null>(null);

  const exportLog = () => {
    const csv = [
      'Timestamp,ISO Timestamp,Simulated Date,Actor,User ID,Action,Details,Before Hash,After Hash,Previous Hash,Hash',
      ...events.map(e =>
        [
          e.time,
          e.isoTimestamp,
          e.simulatedDate,
          e.actor,
          e.userId,
          e.title,
          e.detail,
          e.beforeHash || '',
          e.afterHash || '',
          e.previousHash || '',
          e.hash || ''
        ]
          .map(x => `"${String(x).replaceAll('"', '""')}"`)
          .join(',')
      )
    ].join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `dhaar-audit-log-${simulatedDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAnchorReceipt = () => {
    const formattedEvents = events.map(e => ({
      id: String(e.id),
      action: e.title,
      details: e.detail,
      actorRole: e.actor,
      userId: e.userId,
      tone: e.kind === 'warning' || e.kind === 'success' ? e.kind : 'info',
      isoTimestamp: e.isoTimestamp,
      simulatedDate: e.simulatedDate,
      beforeHash: e.beforeHash,
      afterHash: e.afterHash,
      prevHash: e.previousHash,
      hash: e.hash
    }));

    const receipt = createAuditAnchorReceipt(formattedEvents as any, dailyDigests, simulatedDate);
    const jsonStr = JSON.stringify(receipt, null, 2);

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([jsonStr], { type: 'application/json' }));
    a.download = `dhaar-anchor-receipt-${simulatedDate}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">TRACEABILITY & MERKLE ANCHOR</div>
          <h1>Activity & audit</h1>
          <p className="page-subtitle">
            Locally persisted SHA-256 event chain with actor attribution, record mutation diff hashes, and daily Merkle roots.
          </p>
        </div>
        <div className="heading-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setVerified(verifyAudit())}>
            <ShieldCheck size={16} /> Verify hash chain
          </button>
          <button className="btn btn-secondary" onClick={downloadAnchorReceipt} title="Download offline cryptographic receipt">
            <FileJson size={16} /> Download Anchor Receipt (.json)
          </button>
          <Link to="/verify-audit" className="btn btn-secondary" title="Verify exported receipt offline">
            <ExternalLink size={16} /> Offline Verifier
          </Link>
          <button className="btn btn-primary" onClick={exportLog}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="notice-banner">
        <div className="notice-symbol">
          <Activity size={19} />
        </div>
        <div>
          <strong>Cryptographic Audit & Merkle Chain (Client-side Demo Prototype)</strong>
          <p>
            Each event captures the active user ID, role, simulated date, timestamp, and optional record state mutation hashes (beforeHash / afterHash).
            Every day's events are aggregated into a binary Merkle tree root.
            <strong> Note:</strong> Browser LocalStorage is a client-side prototype cache and not a Byzantine-fault-tolerant ledger. In production, DHAAR anchor receipts are anchored into an independent append-only transparency log.
          </p>
        </div>
      </div>

      {verified !== null && (
        <div className={`notice-banner ${verified ? '' : 'amber-banner'}`}>
          <div className="notice-symbol">{verified ? <BadgeCheck size={19} /> : <XCircle size={19} />}</div>
          <div>
            <strong>{verified ? 'Hash chain & Merkle roots verified' : 'Hash chain verification failed'}</strong>
            <p>
              {verified
                ? 'Every sequential stored event hash matches its previous-hash link and canonical payload.'
                : 'One or more event hashes, state diff hashes, or linkages do not match.'}
            </p>
          </div>
        </div>
      )}

      {/* Daily Merkle Digests Section */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">DAILY CRYPTOGRAPHIC COMPACTION</div>
            <h2>Daily Merkle Digest Roots</h2>
            <p>Cryptographic summary of all state-changing operations grouped by simulated date.</p>
          </div>
          <span className="badge badge-teal">{Object.keys(dailyDigests).length} days anchored</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Simulated Date</th>
                <th>Events in Day</th>
                <th>Daily Merkle Root (SHA-256)</th>
                <th>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(dailyDigests).map(d => (
                <tr key={d.date}>
                  <td><strong>{d.date}</strong></td>
                  <td>{d.eventCount} events</td>
                  <td>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                      {d.merkleRoot}
                    </code>
                  </td>
                  <td><span className="badge badge-green">Anchored</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Activity List with Extended State Hashes */}
      <section className="panel audit-panel">
        <div className="panel-head">
          <div>
            <h2>Recent activity</h2>
            <p>{events.length} events · newest first (rolling 300 window)</p>
          </div>
        </div>
        <div className="audit-list">
          {events.map(e => (
            <div className="audit-row" key={e.id}>
              <div className={`audit-icon ${e.kind}`}>
                {e.kind === 'success' ? <ShieldCheck size={17} /> : e.kind === 'warning' ? <Clock3 size={17} /> : <FileCheck2 size={17} />}
              </div>
              <div className="audit-copy">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong>{e.title}</strong>
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{e.actor}</span>
                  {e.userId && <small style={{ color: 'var(--text-muted)' }}>({e.userId})</small>}
                </div>
                <span>{e.detail}</span>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  <span>Prev: {(e.previousHash || '—').slice(0, 14)}…</span>
                  <span style={{ marginLeft: '12px' }}>Hash: {(e.hash || '—').slice(0, 14)}…</span>
                  {e.beforeHash && <span style={{ marginLeft: '12px', color: '#0d9488' }}>Before: {e.beforeHash.slice(0, 8)}…</span>}
                  {e.afterHash && <span style={{ marginLeft: '8px', color: '#16a34a' }}>After: {e.afterHash.slice(0, 8)}…</span>}
                </div>
              </div>
              <time style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                <div>{e.time}</div>
                <small>{e.simulatedDate}</small>
              </time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
