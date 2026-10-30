import { useMemo, useState, useEffect } from 'react';
import { Download, Filter, Search, SlidersHorizontal, ArrowUpRight, FilePlus2, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDhaarStore } from '../context/useDhaarStore';
import { DEMO_USERS } from '../data/users';
import { money } from '../lib/format';
import type { Deposit } from '../data/seed';
import Badge from '../components/Badge';
import VirtualTable, { type Column } from '../components/VirtualTable';
import { exportToCsv } from '../lib/csvExport';

export default function Registry() {
  const allDeposits = useDhaarStore(s => s.deposits);
  const currentUserId = useDhaarStore(s => s.currentUserId);
  const currentUser = DEMO_USERS.find(u => u.id === currentUserId);

  // Institution Admin only sees own institution's records
  const deposits = useMemo(() => {
    if (currentUser?.role === 'Institution Admin' && currentUser.institutionCode) {
      return allDeposits.filter(d => d.institutionCode === currentUser.institutionCode);
    }
    return allDeposits;
  }, [allDeposits, currentUser]);

  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('search') || '');
  const [grade, setGrade] = useState('All evidence');
  const [status, setStatus] = useState('All statuses');
  const [detail, setDetail] = useState<Deposit | null>(null);

  useEffect(() => {
    const initial = searchParams.get('search');
    if (initial !== null) setQ(initial);
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      deposits.filter(
        d =>
          `${d.id} ${d.institution} ${d.fdrNo} ${d.bank}`.toLowerCase().includes(q.toLowerCase()) &&
          (grade === 'All evidence' || d.grade === grade) &&
          (status === 'All statuses' || d.status === status)
      ),
    [deposits, q, grade, status]
  );

  const download = () => {
    const headers = ['ID', 'Institution', 'Bank', 'FDR No', 'Amount', 'Issue Date', 'Maturity Date', 'Evidence', 'Status'];
    const rows = filtered.map(d => [
      d.id,
      d.institution,
      d.bank,
      d.fdrNo,
      d.amount,
      d.issueDate,
      d.maturityDate,
      d.grade,
      d.status
    ]);
    exportToCsv('dhaar-deposit-registry', headers, rows);
  };

  const columns: Column<Deposit>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Instrument ID',
        width: '160px',
        render: d => (
          <div>
            <strong className="instrument-id">{d.id}</strong>
            <small style={{ display: 'block', color: 'var(--text-muted)' }}>{d.fdrNo}</small>
          </div>
        )
      },
      {
        key: 'institution',
        header: 'Institution / Bank',
        render: d => (
          <div>
            <strong className="table-primary" style={{ display: 'block' }}>{d.institution}</strong>
            <small style={{ color: 'var(--text-muted)' }}>{d.bank} {d.region ? `· ${d.region}` : ''}</small>
          </div>
        )
      },
      {
        key: 'amount',
        header: 'Declared Amount',
        width: '150px',
        render: d => <span className="amount-cell" style={{ fontWeight: 600 }}>{money(d.amount)}</span>
      },
      {
        key: 'dates',
        header: 'Issue → Maturity',
        width: '190px',
        render: d => (
          <div>
            <span className="date-range">{d.issueDate} <span style={{ opacity: 0.6 }}>→</span></span>
            <small style={{ display: 'block', color: 'var(--text-muted)' }}>{d.maturityDate}</small>
          </div>
        )
      },
      {
        key: 'grade',
        header: 'Evidence',
        width: '100px',
        render: d => (
          <Badge tone={d.grade === 'E2' || d.grade === 'E3' ? 'green' : d.grade === 'E1' ? 'blue' : 'neutral'}>
            {d.grade}
          </Badge>
        )
      },
      {
        key: 'status',
        header: 'Lifecycle Status',
        width: '180px',
        render: d => (
          <div>
            <Badge
              tone={
                d.status === 'Active'
                  ? 'green'
                  : d.status === 'Released'
                  ? 'teal'
                  : d.status === 'Matured'
                  ? 'red'
                  : d.status === 'Under review'
                  ? 'blue'
                  : d.status === 'Replaced'
                  ? 'neutral'
                  : 'amber'
              }
            >
              {d.status}
            </Badge>
            {d.finding && (
              <small className="finding-line" style={{ display: 'block', marginTop: '2px', color: '#b45309' }}>
                {d.finding}
              </small>
            )}
          </div>
        )
      },
      {
        key: 'action',
        header: '',
        width: '60px',
        align: 'right',
        render: d => (
          <button className="icon-button row-action" title="View record details" onClick={() => setDetail(d)}>
            <ArrowUpRight size={16} />
          </button>
        )
      }
    ],
    []
  );

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">RECORDS & EVIDENCE</div>
          <h1>Deposit registry</h1>
          <p className="page-subtitle">A unified register of declared instruments, evidence status, and lifecycle dates.</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" onClick={download}>
            <Download size={16} /> Export CSV
          </button>
          <Link to="/submit" className="btn btn-primary">
            <FilePlus2 size={16} /> Add instrument
          </Link>
        </div>
      </div>

      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <div className="registry-search">
            <Search size={16} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search ID, institution, bank or FDR number"
              aria-label="Search registry"
            />
          </div>
          <div className="filter-control">
            <Filter size={15} />
            <select value={grade} onChange={e => setGrade(e.target.value)} aria-label="Filter by evidence grade">
              <option>All evidence</option>
              <option>E0</option>
              <option>E1</option>
              <option>E2</option>
              <option>E3</option>
            </select>
          </div>
          <div className="filter-control">
            <SlidersHorizontal size={15} />
            <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by lifecycle status">
              <option>All statuses</option>
              <option>Active</option>
              <option>Under review</option>
              <option>Attention required</option>
              <option>Matured</option>
              <option>Replaced</option>
              <option>Released</option>
            </select>
          </div>
          <span className="result-count">{filtered.length.toLocaleString('en-IN')} records</span>
        </div>

        {/* Virtualized Table for high scalability */}
        <VirtualTable
          data={filtered}
          columns={columns}
          rowHeight={52}
          viewportHeight={560}
          keyExtractor={d => d.id}
          onRowClick={d => setDetail(d)}
        />

        <div className="table-summary" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>Showing {filtered.length.toLocaleString('en-IN')} of {deposits.length.toLocaleString('en-IN')} instruments</span>
          <span>Virtualised rendering active · Keyboard accessible grid (↑↓ Enter)</span>
        </div>
      </section>

      {/* Record Detail Modal */}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div className="eyebrow">INSTRUMENT RECORD</div>
                <h2 style={{ margin: 0 }}>{detail.id} · {detail.fdrNo}</h2>
              </div>
              <button className="icon-button" onClick={() => setDetail(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="panel" style={{ padding: '16px', background: 'var(--surface-subtle, #f8fafc)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.88rem' }}>
                <div><span>Institution:</span> <strong>{detail.institution}</strong></div>
                <div><span>Bank:</span> <strong>{detail.bank}</strong></div>
                <div><span>Amount:</span> <strong>{money(detail.amount)}</strong></div>
                <div><span>Evidence Grade:</span> <Badge tone="teal">{detail.grade}</Badge></div>
                <div><span>Issue Date:</span> <strong>{detail.issueDate}</strong></div>
                <div><span>Maturity Date:</span> <strong>{detail.maturityDate}</strong></div>
                <div><span>Status:</span> <strong>{detail.status}</strong></div>
                <div><span>Lien Endorsement:</span> <strong>{detail.lien ? 'Confirmed AICTE Lien' : 'Unconfirmed'}</strong></div>
                {detail.fileHash && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span>SHA-256 Hash:</span> <code style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{detail.fileHash}</code>
                  </div>
                )}
                {detail.finding && (
                  <div style={{ gridColumn: 'span 2', color: '#b45309' }}>
                    <span>Finding:</span> <strong>{detail.finding}</strong>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
              <Link to={`/evidence`} className="btn btn-primary">Review Evidence</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
