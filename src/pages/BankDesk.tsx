import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Copy, ExternalLink, Send, ShieldCheck, XCircle, AlertTriangle, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDhaarStore } from '../context/useDhaarStore';
import { money } from '../lib/format';
import Badge from '../components/Badge';
import { daysToMaturity, holderNameMatchScore } from '../lib/calculations';
import { canRequestBankConfirmation, canRespondToBankRequest, compareBankResponse, nextGradeAfterBankResponse } from '../lib/workflow';
import { defaultBankAdapter } from '../lib/bankAdapter';

export default function BankDesk() {
  const { t } = useTranslation();
  const deposits = useDhaarStore((s) => s.deposits);
  const update = useDhaarStore((s) => s.updateDeposit);
  const addEvent = useDhaarStore((s) => s.addEvent);
  const simulatedDate = useDhaarStore((s) => s.simulatedDate);
  const role = useDhaarStore((s) => s.role);
  const bankTokens = useDhaarStore((s) => s.bankTokens);
  const addBankToken = useDhaarStore((s) => s.addBankToken);

  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(deposits.find((x) => x.grade === 'E1')?.id || deposits[0]?.id || '');

  const rows = useMemo(
    () => deposits.filter((d) => filter === 'All' || (d.bankRequestStatus || 'Not requested') === filter),
    [deposits, filter]
  );
  const d = deposits.find((x) => x.id === selected) || rows[0];

  const [bankAmount, setBankAmount] = useState('');
  const [bankIssue, setBankIssue] = useState('');
  const [bankMaturity, setBankMaturity] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankLien, setBankLien] = useState(false);
  const [holderDiscrepancyAccepted, setHolderDiscrepancyAccepted] = useState(false);
  const [holderDiscrepancyReason, setHolderDiscrepancyReason] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const activeToken = useMemo(
    () => bankTokens.find((t) => t.depositId === d?.id && !t.used && t.expiresAt >= simulatedDate),
    [bankTokens, d?.id, simulatedDate]
  );

  const load = (id: string) => {
    setSelected(id);
    const x = deposits.find((y) => y.id === id);
    if (x) {
      setBankAmount(x.bankAmount !== undefined ? String(x.bankAmount) : '');
      setBankIssue(x.bankIssueDate ?? '');
      setBankMaturity(x.bankMaturityDate ?? '');
      setBankHolder(x.bankHolders ?? '');
      setBankLien(x.bankLien ?? false);
      setHolderDiscrepancyAccepted(false);
      setHolderDiscrepancyReason('');
    }
  };

  const expired = !!d?.requestExpiresAt && d.requestExpiresAt < simulatedDate;

  const request = () => {
    if (!d || !canRequestBankConfirmation(role, d.grade, expired, d.bankRequestStatus)) return;
    const isExpired = !!d.requestExpiresAt && d.requestExpiresAt < simulatedDate;

    // Use MockDeskAdapter to create a verification request & single-use token
    const tokenResp = defaultBankAdapter.requestVerification({
      depositId: d.id,
      fdrNo: d.fdrNo,
      bank: d.bank,
      simulatedDate
    });

    // Store only the SHA-256 tokenHash in token record
    addBankToken({
      tokenHash: tokenResp.tokenHash,
      depositId: d.id,
      bank: d.bank,
      demoOtp: tokenResp.demoOtp,
      createdAt: simulatedDate,
      expiresAt: tokenResp.expiresAt,
      used: false,
      rawTokenForDemo: tokenResp.token
    });

    update(d.id, {
      bankRequestStatus: 'Requested',
      requestExpiresAt: tokenResp.expiresAt
    });

    if (isExpired) {
      addEvent('Request re-issued', `${d.id} · new expiry ${tokenResp.expiresAt}`, 'info');
    } else {
      addEvent('Bank confirmation request queued', `${d.id} · expires ${tokenResp.expiresAt}`, 'info');
    }
  };

  const loadMatching = () => {
    if (!d || role !== 'Bank Verifier') return;
    setBankAmount(String(d.amount));
    setBankIssue(d.issueDate);
    setBankMaturity(d.maturityDate);
    setBankHolder(d.holder);
    setBankLien(d.lien);
  };

  const holderComparison = d ? holderNameMatchScore(d.holder, bankHolder) : { status: 'Mismatch', similarity: 0 };
  const holderValid = holderComparison.status === 'Match' || (holderComparison.status === 'Review' && holderDiscrepancyAccepted);

  const fields = d
    ? [
        { label: 'Amount', declared: String(d.amount), response: bankAmount, match: Number(bankAmount) === d.amount },
        { label: 'Issue date', declared: d.issueDate, response: bankIssue, match: bankIssue === d.issueDate },
        { label: 'Maturity date', declared: d.maturityDate, response: bankMaturity, match: bankMaturity === d.maturityDate },
        {
          label: 'Holder name(s)',
          declared: d.holder,
          response: bankHolder,
          match: !!bankHolder.trim() && holderValid,
          holderStatus: holderComparison.status,
          similarity: holderComparison.similarity
        },
        { label: 'Lien / encumbrance', declared: d.lien ? 'Confirmed' : 'Missing', response: bankLien ? 'Confirmed' : 'Missing', match: bankLien === d.lien && bankLien }
      ]
    : [];

  const respond = (forceMismatch: boolean) => {
    if (!d || !canRespondToBankRequest(role, d.grade, d.bankRequestStatus, expired)) return;
    const comparison = compareBankResponse(d, {
      amount: bankAmount,
      issueDate: bankIssue,
      maturityDate: bankMaturity,
      holder: bankHolder,
      lien: bankLien,
      holderDiscrepancyAccepted,
      holderDiscrepancyReason
    });
    const allMatch = comparison.matches && !forceMismatch;
    if (!allMatch) {
      update(d.id, {
        bankRequestStatus: 'Mismatch',
        bankAmount: Number(bankAmount) || 0,
        bankIssueDate: bankIssue,
        bankMaturityDate: bankMaturity,
        bankHolders: bankHolder,
        bankLien,
        finding: 'Bank confirmation field mismatch'
      });
      addEvent('Bank response mismatch', `${d.id} · field comparison did not match · no grade upgrade`, 'warning');
      return;
    }
    if (!bankLien) {
      update(d.id, { bankRequestStatus: 'Mismatch', finding: 'Bank lien confirmation missing' });
      addEvent('Bank response blocked', `${d.id} · lien not confirmed`, 'warning');
      return;
    }
    update(d.id, {
      bankRequestStatus: 'Attested',
      grade: nextGradeAfterBankResponse(d.grade, allMatch),
      bankAmount: Number(bankAmount),
      bankIssueDate: bankIssue,
      bankMaturityDate: bankMaturity,
      bankHolders: bankHolder,
      bankLien,
      lastAttestedDate: simulatedDate,
      requestExpiresAt: undefined,
      finding: undefined,
      status: daysToMaturity(d.maturityDate, simulatedDate) <= 0 ? 'Matured' : 'Active'
    });
    addEvent('Matching bank response received', `${d.id} · E1 → E2`, 'success');
    if (d.predecessorId) {
      update(d.predecessorId, { status: 'Replaced', replacedBy: d.id, finding: undefined });
      addEvent('Instrument lineage updated', `${d.predecessorId} replaced by ${d.id} after E2 confirmation`, 'success');
    }
  };

  const copyPortalLink = (token: string) => {
    const fullUrl = `${window.location.origin}/desk/${token}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">PHASE 6 · EXTERNAL CONFIRMATION</div>
          <h1>{t('bankDesk.title')}</h1>
          <p className="page-subtitle">
            {t('bankDesk.subtitle')}
          </p>
        </div>
        <Badge tone="amber">Mock integration</Badge>
      </div>

      <div className="notice-banner amber-banner">
        <div className="notice-symbol">
          <Building2 size={19} />
        </div>
        <div>
          <strong>Demo bank only</strong>
          <p>No real bank is contacted. Responses are synthetic and cannot be used as financial evidence.</p>
        </div>
      </div>

      <div className="stats-grid compact-stats">
        {[
          { label: 'Awaiting response', value: deposits.filter((x) => x.bankRequestStatus === 'Requested').length },
          { label: 'Attested', value: deposits.filter((x) => x.bankRequestStatus === 'Attested').length },
          { label: 'Mismatch', value: deposits.filter((x) => x.bankRequestStatus === 'Mismatch').length },
          { label: 'E1 request candidates', value: deposits.filter((x) => x.grade === 'E1').length }
        ].map((x) => (
          <div className="stat-card" key={x.label}>
            <div className="stat-top">{x.label}</div>
            <div className="stat-value">{x.value}</div>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="registry-toolbar">
          <div className="filter-control">
            <span>Status</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All</option>
              <option>Not requested</option>
              <option>Requested</option>
              <option>Attested</option>
              <option>Mismatch</option>
            </select>
          </div>
          <span className="result-count">{rows.length} instruments</span>
        </div>

        <div className="bank-desk-layout">
          <div className="bank-request-list">
            {rows.map((x) => (
              <button
                key={x.id}
                className={`bank-request-item ${d?.id === x.id ? 'selected' : ''}`}
                onClick={() => load(x.id)}
              >
                <span className="bank-request-icon">
                  <Building2 size={17} />
                </span>
                <span className="bank-request-copy">
                  <strong>{x.id}</strong>
                  <small>
                    {x.bank} · {x.fdrNo}
                  </small>
                  <small>{money(x.amount)}</small>
                </span>
                <Badge tone={x.bankRequestStatus === 'Attested' ? 'green' : x.bankRequestStatus === 'Mismatch' ? 'red' : x.bankRequestStatus === 'Requested' ? 'amber' : 'neutral'}>
                  {x.bankRequestStatus || 'Not requested'}
                </Badge>
              </button>
            ))}
          </div>

          {d ? (
            <div className="bank-detail">
              <div className="panel-head">
                <div>
                  <h2>{d.id}</h2>
                  <p>{d.institution}</p>
                </div>
                <Badge tone={d.grade === 'E2' || d.grade === 'E3' ? 'green' : 'blue'}>{d.grade}</Badge>
              </div>
              <p className="muted-note">
                Declared: {d.bank} · {d.fdrNo} · {money(d.amount)}
              </p>

              {/* Single-use Bank Portal Link Banner */}
              {activeToken && (
                <div className="notice-banner blue-banner" style={{ marginTop: 12, marginBottom: 16 }}>
                  <div className="notice-symbol">
                    <KeyRound size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <strong>Bank-Side Verification Portal Link (Single-Use)</strong>
                      <span className="badge badge-blue">Expires: {activeToken.expiresAt}</span>
                    </div>
                    <p style={{ margin: '4px 0 8px 0', fontSize: '0.85rem' }}>
                      Share this single-use demo link with the issuing bank verifier. Only its SHA-256 hash is stored on record.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="demo-otp-badge" style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                        demo OTP: <strong>{activeToken.demoOtp}</strong>
                      </span>
                      {activeToken.rawTokenForDemo && (
                        <>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => copyPortalLink(activeToken.rawTokenForDemo!)}
                          >
                            <Copy size={13} /> {copiedLink ? 'Copied Link!' : 'Copy demo link'}
                          </button>
                          <a
                            href={`/desk/${activeToken.rawTokenForDemo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            <ExternalLink size={13} /> Open bank portal
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="field-grid">
                <div className="field">
                  <label htmlFor="bank-amount">Bank response amount</label>
                  <input id="bank-amount" type="number" min="0" value={bankAmount} onChange={(e) => setBankAmount(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="bank-issue">Bank issue date</label>
                  <input id="bank-issue" type="date" value={bankIssue} onChange={(e) => setBankIssue(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="bank-maturity">Bank maturity date</label>
                  <input id="bank-maturity" type="date" value={bankMaturity} onChange={(e) => setBankMaturity(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="bank-holder">Bank holder name(s)</label>
                  <input id="bank-holder" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} />
                </div>
              </div>

              {holderComparison.status === 'Review' && (
                <div className="notice-banner amber-banner" style={{ marginTop: 8, marginBottom: 12 }}>
                  <div className="notice-symbol"><AlertTriangle size={17}/></div>
                  <div>
                    <strong>Holder Name Requires Officer Acceptance</strong>
                    <p>Similarity is {(holderComparison.similarity * 100).toFixed(0)}% (threshold 75%–90%). An officer must accept this discrepancy with an audit reason.</p>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label className="hold-toggle" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={holderDiscrepancyAccepted}
                          onChange={(e) => setHolderDiscrepancyAccepted(e.target.checked)}
                        /> Accept name variation with reason
                      </label>
                      {holderDiscrepancyAccepted && (
                        <input
                          placeholder="Enter reason for accepting name discrepancy (e.g. recognized abbreviation)"
                          value={holderDiscrepancyReason}
                          onChange={(e) => setHolderDiscrepancyReason(e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <label className="hold-toggle">
                <input type="checkbox" checked={bankLien} onChange={(e) => setBankLien(e.target.checked)} /> Bank confirms required lien / encumbrance
              </label>

              <div className="panel-head">
                <div>
                  <h3>Field-by-field comparison</h3>
                  <p>Comparison uses the values entered above</p>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Declared</th>
                      <th>Bank response</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.label}>
                        <td>{f.label}</td>
                        <td>{f.declared}</td>
                        <td>{f.response}</td>
                        <td>
                          <Badge tone={f.match ? 'green' : (f.holderStatus === 'Review' && !holderDiscrepancyAccepted) ? 'amber' : 'red'}>
                            {f.match ? 'Match' : (f.holderStatus === 'Review' && !holderDiscrepancyAccepted) ? 'Review' : 'Mismatch'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bank-status-box">
                <span>Request state</span>
                <strong>{expired ? 'Expired' : d.bankRequestStatus || 'Not requested'}</strong>
                <small>{d.requestExpiresAt ? `Expires ${d.requestExpiresAt}` : 'Requests expire seven days after creation.'}</small>
              </div>

              <div className="bank-actions">
                <button
                  className="btn btn-secondary"
                  disabled={!canRequestBankConfirmation(role, d.grade, expired, d.bankRequestStatus)}
                  onClick={request}
                >
                  <Send size={15} /> {expired ? (t('bankDesk.reIssue') || 'Re-issue request') : (t('bankDesk.sendRequest') || 'Send request')}
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={!canRespondToBankRequest(role, d.grade, d.bankRequestStatus, expired)}
                  onClick={loadMatching}
                >
                  Load matching demo response
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!canRespondToBankRequest(role, d.grade, d.bankRequestStatus, expired)}
                  onClick={() => respond(false)}
                >
                  <CheckCircle2 size={15} /> Apply entered response
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!canRespondToBankRequest(role, d.grade, d.bankRequestStatus, expired)}
                  onClick={() => respond(true)}
                >
                  <XCircle size={15} /> Force mismatch test
                </button>
              </div>

              {expired && (
                <p className="inline-warning">
                  <AlertTriangle size={15} /> Request expired. Regional Officer may re-issue a request above.
                </p>
              )}
              {role === 'Regional Officer' && (
                <p className="inline-warning">
                  Regional Officer can send or re-issue a request for E1 records. Switch to Bank Verifier to enter or submit the bank response.
                </p>
              )}
              {role !== 'Regional Officer' && role !== 'Bank Verifier' && (
                <p className="inline-warning">
                  Switch to Regional Officer to send a request, or Bank Verifier to submit the response.
                </p>
              )}
            </div>
          ) : (
            <div className="empty-state">No records in this filter.</div>
          )}
        </div>
      </section>

      <div className="demo-tip">
        <ShieldCheck size={16} />
        <div>
          <strong>Regional Officer request → Bank Verifier response → E2 only on match</strong>
          <span>All required fields must match, the lien must be confirmed, and the request must be active.</span>
        </div>
      </div>
    </div>
  );
}
