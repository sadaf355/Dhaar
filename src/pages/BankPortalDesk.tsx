import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, KeyRound, FileCheck2, ArrowLeft, Lock } from 'lucide-react';
import { useDhaarStore, sha256 } from '../context/useDhaarStore';
import {
  type StructuredAttestationPayload,
  canonicalPayloadString,
  hashAttestationPayload,
  compareStructuredAttestation
} from '../lib/bankAdapter';
import { money } from '../lib/format';
import Badge from '../components/Badge';

export default function BankPortalDesk() {
  const { token } = useParams<{ token: string }>();
  const simulatedDate = useDhaarStore((s) => s.simulatedDate);
  const deposits = useDhaarStore((s) => s.deposits);
  const updateDeposit = useDhaarStore((s) => s.updateDeposit);
  const addEvent = useDhaarStore((s) => s.addEvent);
  const addFinding = useDhaarStore((s) => s.addFinding);
  const currentUserId = useDhaarStore((s) => s.currentUserId);
  const bankTokens = useDhaarStore((s) => s.bankTokens);
  const markBankTokenUsed = useDhaarStore((s) => s.markBankTokenUsed);

  const rawToken = token || '';
  const tokenHash = sha256(rawToken);

  // Look up token record by its SHA-256 hash
  const tokenRecord = useMemo(
    () => bankTokens.find((t) => t.tokenHash === tokenHash),
    [bankTokens, tokenHash]
  );

  const deposit = useMemo(
    () => deposits.find((d) => d.id === tokenRecord?.depositId),
    [deposits, tokenRecord?.depositId]
  );

  // Verification step: 'otp' | 'form' | 'result'
  const [otpStep, setOtpStep] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // Structured form state
  const [fdrNo, setFdrNo] = useState(deposit?.fdrNo || '');
  const [bank, setBank] = useState(deposit?.bank || '');
  const [branchIfsc, setBranchIfsc] = useState('HDFC0000123');
  const [holders, setHolders] = useState(deposit?.holder || '');
  const [amount, setAmount] = useState<number>(deposit?.amount || 0);
  const [issueDate, setIssueDate] = useState(deposit?.issueDate || '');
  const [maturityDate, setMaturityDate] = useState(deposit?.maturityDate || '');
  const [rate, setRate] = useState<number>(7.25);
  const [maturityValue, setMaturityValue] = useState<number>(deposit ? Math.round(deposit.amount * 1.15) : 0);
  const [status, setStatus] = useState<'ACTIVE' | 'CLOSED' | 'MATURED'>('ACTIVE');
  const [jointLienMarked, setJointLienMarked] = useState(true);
  const [jointLienDate, setJointLienDate] = useState(deposit?.issueDate || simulatedDate);
  const [otherEncumbrance, setOtherEncumbrance] = useState(false);
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [prematureClosureRequiresAicteNoc, setPrematureClosureRequiresAicteNoc] = useState(true);
  const [signerName, setSignerName] = useState('Rohit Patil');
  const [employeeId, setEmployeeId] = useState('EMP-90214');
  const [designation, setDesignation] = useState('Chief Manager - Operations');
  const [eSignConfirmation, setESignConfirmation] = useState(false);
  const [typedSignerName, setTypedSignerName] = useState('');

  // Result state
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    mismatches: string[];
    findings: string[];
    payloadHash: string;
    fieldChecks: { field: string; declared: string; attested: string; match: boolean }[];
  } | null>(null);

  // Validate token constraints
  if (!rawToken || !tokenRecord) {
    return (
      <div className="bank-portal-container">
        <header className="bank-portal-header">
          <div className="bank-portal-brand">
            <Building2 size={24} />
            <div>
              <h2>PARTNER BANK CONFIRMATION GATEWAY</h2>
              <small>AICTE Security Deposit Attestation Interface (DEMO / MOCK)</small>
            </div>
          </div>
        </header>
        <main className="bank-portal-main">
          <div className="bank-portal-card error-card">
            <XCircle size={36} color="#ef4444" />
            <h3>Invalid or Unrecognized Verification Token</h3>
            <p>
              The provided token could not be verified against issued requests. Please verify the URL link provided by the AICTE Regional Officer.
            </p>
            <p className="muted-note">Token hash checked: {tokenHash.slice(0, 16)}…</p>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={15} /> Return to AICTE DHAAR Portal
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Token replay check
  if (tokenRecord.used) {
    return (
      <div className="bank-portal-container">
        <header className="bank-portal-header">
          <div className="bank-portal-brand">
            <Building2 size={24} />
            <div>
              <h2>PARTNER BANK CONFIRMATION GATEWAY</h2>
              <small>AICTE Security Deposit Attestation Interface (DEMO / MOCK)</small>
            </div>
          </div>
        </header>
        <main className="bank-portal-main">
          <div className="bank-portal-card error-card">
            <Lock size={36} color="#f59e0b" />
            <h3>Token Replay Error</h3>
            <p>
              This single-use verification token has already been used and cannot be replayed.
            </p>
            <p className="muted-note">
              Single-use tokens expire immediately upon submission to prevent duplicate attestation replay attacks.
            </p>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={15} /> Return to AICTE DHAAR Portal
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Expiry check
  if (tokenRecord.expiresAt < simulatedDate) {
    return (
      <div className="bank-portal-container">
        <header className="bank-portal-header">
          <div className="bank-portal-brand">
            <Building2 size={24} />
            <div>
              <h2>PARTNER BANK CONFIRMATION GATEWAY</h2>
              <small>AICTE Security Deposit Attestation Interface (DEMO / MOCK)</small>
            </div>
          </div>
        </header>
        <main className="bank-portal-main">
          <div className="bank-portal-card error-card">
            <AlertTriangle size={36} color="#ef4444" />
            <h3>Verification Token Expired</h3>
            <p>
              This verification token expired on <strong>{tokenRecord.expiresAt}</strong> (current simulated date: <strong>{simulatedDate}</strong>).
            </p>
            <p className="muted-note">
              A Regional Officer must re-issue a request before this instrument can be attested.
            </p>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={15} /> Return to AICTE DHAAR Portal
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Instrument binding check
  if (!deposit || deposit.bank.trim().toLowerCase() !== tokenRecord.bank.trim().toLowerCase()) {
    return (
      <div className="bank-portal-container">
        <header className="bank-portal-header">
          <div className="bank-portal-brand">
            <Building2 size={24} />
            <div>
              <h2>PARTNER BANK CONFIRMATION GATEWAY</h2>
              <small>AICTE Security Deposit Attestation Interface (DEMO / MOCK)</small>
            </div>
          </div>
        </header>
        <main className="bank-portal-main">
          <div className="bank-portal-card error-card">
            <XCircle size={36} color="#ef4444" />
            <h3>Wrong Instrument Binding Error</h3>
            <p>
              This token is bound to bank {tokenRecord.bank} and instrument {tokenRecord.depositId}, which does not match records.
            </p>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={15} /> Return to AICTE DHAAR Portal
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.trim() !== tokenRecord.demoOtp) {
      setOtpError('Invalid demo OTP. Please check the demo OTP displayed on the AICTE Regional Officer screen.');
      return;
    }
    setOtpError('');
    setOtpStep(true);
  };

  const payload: StructuredAttestationPayload = {
    fdrNo: fdrNo.trim(),
    bank: bank.trim(),
    branchIfsc: branchIfsc.trim().toUpperCase(),
    holders: holders.split(',').map((h) => h.trim()).filter(Boolean),
    amount: Number(amount) || 0,
    issueDate,
    maturityDate,
    rate: Number(rate) || 0,
    maturityValue: Number(maturityValue) || 0,
    status,
    jointLienMarked,
    jointLienDate,
    otherEncumbrance,
    autoRenewal,
    prematureClosureRequiresAicteNoc,
    signerName: signerName.trim(),
    employeeId: employeeId.trim(),
    designation: designation.trim(),
    eSignConfirmation
  };

  const canonicalPayload = canonicalPayloadString(payload);
  const currentPayloadHash = hashAttestationPayload(payload);

  const fillMatchingData = () => {
    if (!deposit) return;
    setFdrNo(deposit.fdrNo);
    setBank(deposit.bank);
    setBranchIfsc('HDFC0000123');
    setHolders(deposit.holder);
    setAmount(deposit.amount);
    setIssueDate(deposit.issueDate);
    setMaturityDate(deposit.maturityDate);
    setStatus('ACTIVE');
    setJointLienMarked(true);
    setJointLienDate(deposit.issueDate);
    setOtherEncumbrance(false);
    setAutoRenewal(true);
    setPrematureClosureRequiresAicteNoc(true);
    setSignerName('Rohit Patil');
    setTypedSignerName('Rohit Patil');
    setESignConfirmation(true);
  };

  const fillMismatchData = () => {
    if (!deposit) return;
    fillMatchingData();
    // Intentionally introduce an amount and lien discrepancy
    setAmount(deposit.amount + 50000);
    setJointLienMarked(false);
  };

  const handleSubmitAttestation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eSignConfirmation || typedSignerName.trim().toLowerCase() !== signerName.trim().toLowerCase()) {
      alert('Please complete the mock eSign confirmation by typing your matching name.');
      return;
    }

    // Compare field by field against declared deposit
    const comparison = compareStructuredAttestation(deposit, payload);

    // Consume the single-use token to prevent replay
    markBankTokenUsed(tokenHash);

    // Ensure session role is authenticated as Bank Verifier for tokenized bank-side portal
    useDhaarStore.getState().setRole('Bank Verifier');

    if (comparison.success) {
      // Raise evidence ladder E1 -> E2
      updateDeposit(deposit.id, {
        grade: 'E2',
        bankRequestStatus: 'Attested',
        lastAttestedDate: simulatedDate,
        requestExpiresAt: undefined,
        bankAmount: payload.amount,
        bankIssueDate: payload.issueDate,
        bankMaturityDate: payload.maturityDate,
        bankHolders: payload.holders.join(', '),
        bankLien: payload.jointLienMarked && !payload.otherEncumbrance,
        finding: undefined
      });

      addEvent(
        'Bank portal attestation verified (E1 → E2)',
        `${deposit.id} · Token verified · Bank: ${payload.bank} · Signer: ${payload.signerName} (${payload.employeeId})`,
        'success'
      );
    } else {
      // Keep E1, create finding R17 / R18
      const findingTitle = comparison.findings.includes('R18')
        ? 'Bank attestation: Joint lien missing or encumbrance present'
        : 'Bank attestation differs from declared data';
      const findingRuleId = comparison.findings.includes('R18') ? 'R18' : 'R17';

      updateDeposit(deposit.id, {
        grade: 'E1', // stays E1
        bankRequestStatus: 'Mismatch',
        finding: findingTitle,
        bankAmount: payload.amount,
        bankIssueDate: payload.issueDate,
        bankMaturityDate: payload.maturityDate,
        bankHolders: payload.holders.join(', '),
        bankLien: payload.jointLienMarked && !payload.otherEncumbrance
      });

      addFinding({
        id: `F-${deposit.id}-${Date.now()}`,
        depositId: deposit.id,
        ruleId: findingRuleId,
        title: findingTitle,
        severity: 'Critical',
        status: 'Open',
        detail: `Bank portal structured attestation mismatch: ${comparison.mismatches.join(', ')}. Payload hash: ${currentPayloadHash}`,
        createdAt: simulatedDate,
        userId: currentUserId
      });

      addEvent(
        'Bank portal attestation mismatch (Grade maintained at E1)',
        `${deposit.id} · Discrepancies in: ${comparison.mismatches.join(', ')} · Finding ${findingRuleId} created`,
        'warning'
      );
    }

    setSubmissionResult({
      success: comparison.success,
      mismatches: comparison.mismatches,
      findings: comparison.findings,
      payloadHash: currentPayloadHash,
      fieldChecks: comparison.fieldChecks
    });
  };

  return (
    <div className="bank-portal-container">
      {/* Standalone Bank Portal Header - NO AICTE Sidebar */}
      <header className="bank-portal-header">
        <div className="bank-portal-brand">
          <Building2 size={24} />
          <div>
            <h2>{tokenRecord.bank.toUpperCase()} ELECTRONIC ATTESTATION DESK</h2>
            <small>AICTE Security Deposit Verification Gateway · Secure Token Bound</small>
          </div>
        </div>
        <div className="bank-portal-tags">
          <Badge tone="blue">SECURE SINGLE-USE TOKEN</Badge>
          <span className="demo-pill">MOCK BANK INTEGRATION</span>
        </div>
      </header>

      <main className="bank-portal-main">
        {submissionResult ? (
          <div className="bank-portal-card">
            <div className="result-header">
              {submissionResult.success ? (
                <>
                  <CheckCircle2 size={44} color="#10b981" />
                  <div>
                    <h2>Attestation Verified & Accepted (E1 → E2)</h2>
                    <p>All structured banking fields matched declared values. The deposit assurance grade has been upgraded to E2.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle size={44} color="#ef4444" />
                  <div>
                    <h2>Attestation Discrepancy Recorded (Grade Kept at E1)</h2>
                    <p>Field-level comparison detected discrepancies. Finding {submissionResult.findings.join('/')} has been recorded in the AICTE audit trail.</p>
                  </div>
                </>
              )}
            </div>

            <div className="table-wrap" style={{ marginTop: 20 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Declared on AICTE Portal</th>
                    <th>Attested by Bank</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionResult.fieldChecks.map((f) => (
                    <tr key={f.field}>
                      <td><strong>{f.field}</strong></td>
                      <td>{f.declared}</td>
                      <td>{f.attested}</td>
                      <td>
                        <Badge tone={f.match ? 'green' : 'red'}>{f.match ? 'Match' : 'Mismatch'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hash-box" style={{ marginTop: 20 }}>
              <label>Canonical Signed Payload SHA-256 (Tamper-Proof Audit Vector):</label>
              <code>{submissionResult.payloadHash}</code>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <Link to="/bank-desk" className="btn btn-primary">
                Return to AICTE Bank Confirmation Desk
              </Link>
            </div>
          </div>
        ) : !otpStep ? (
          /* Step 1: Demo OTP Input */
          <div className="bank-portal-card otp-card">
            <div className="otp-icon-wrap">
              <KeyRound size={32} color="#0284c7" />
            </div>
            <h2>Verify Demo OTP</h2>
            <p>
              Please enter the one-time demo passcode issued for instrument <strong>{deposit.id}</strong> ({deposit.fdrNo}) at <strong>{deposit.bank}</strong>.
            </p>

            <div className="notice-banner blue-banner" style={{ textAlign: 'left', margin: '16px 0' }}>
              <p style={{ margin: 0 }}>
                <strong>Demo Mode OTP:</strong> Use <code>{tokenRecord.demoOtp}</code> (as displayed on the AICTE Regional Officer screen).
              </p>
            </div>

            {otpError && (
              <p className="inline-warning" style={{ textAlign: 'left' }} role="alert">
                <AlertTriangle size={15} /> {otpError}
              </p>
            )}

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field" style={{ textAlign: 'left' }}>
                <label htmlFor="demo-otp-input">Enter 6-Digit Demo OTP</label>
                <input
                  id="demo-otp-input"
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="e.g. 482910"
                  style={{ fontSize: '1.2rem', letterSpacing: 4, textAlign: 'center', padding: '10px' }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-wide">
                Verify OTP & Access Attestation Form
              </button>
            </form>
          </div>
        ) : (
          /* Step 2: Structured Attestation Form */
          <div className="bank-portal-card form-card">
            <div className="form-header">
              <div>
                <h2>Structured Fixed Deposit Attestation</h2>
                <p>
                  Instrument: <strong>{deposit.id}</strong> · Institution: <strong>{deposit.institution}</strong> · Declared Amount: <strong>{money(deposit.amount)}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={fillMatchingData}>
                  Pre-fill Matching Data (Demo)
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={fillMismatchData}>
                  Pre-fill Mismatch Data (Demo)
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitAttestation}>
              <h3 className="section-title">1. Deposit & Account Details</h3>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="fdr-no">Instrument (FDR) Number</label>
                  <input id="fdr-no" value={fdrNo} onChange={(e) => setFdrNo(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="bank-name">Issuing Bank</label>
                  <input id="bank-name" value={bank} onChange={(e) => setBank(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="branch-ifsc">Branch IFSC Code</label>
                  <input id="branch-ifsc" value={branchIfsc} onChange={(e) => setBranchIfsc(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="holders">Deposit Holders (comma separated)</label>
                  <input id="holders" value={holders} onChange={(e) => setHolders(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="amount">Principal Amount (₹)</label>
                  <input id="amount" type="number" min="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
                </div>
                <div className="field">
                  <label htmlFor="issue-date">Issue Date</label>
                  <input id="issue-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="maturity-date">Maturity Date</label>
                  <input id="maturity-date" type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="rate">Interest Rate (% p.a.)</label>
                  <input id="rate" type="number" step="0.01" value={rate} onChange={(e) => setRate(Number(e.target.value))} required />
                </div>
                <div className="field">
                  <label htmlFor="maturity-value">Maturity Value (₹)</label>
                  <input id="maturity-value" type="number" value={maturityValue} onChange={(e) => setMaturityValue(Number(e.target.value))} required />
                </div>
                <div className="field">
                  <label htmlFor="status">Instrument Lifecycle Status</label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="MATURED">MATURED</option>
                  </select>
                </div>
              </div>

              <h3 className="section-title">2. Lien & Encumbrance Confirmations</h3>
              <div className="checkbox-stack">
                <label className="hold-toggle">
                  <input
                    type="checkbox"
                    checked={jointLienMarked}
                    onChange={(e) => setJointLienMarked(e.target.checked)}
                  />
                  <span>
                    <strong>Joint Lien in favour of Member Secretary AICTE</strong> marked on CBS
                  </span>
                </label>
                {jointLienMarked && (
                  <div className="field" style={{ marginLeft: 26, maxWidth: 260 }}>
                    <label htmlFor="lien-date">Lien Registration Date</label>
                    <input id="lien-date" type="date" value={jointLienDate} onChange={(e) => setJointLienDate(e.target.value)} />
                  </div>
                )}
                <label className="hold-toggle">
                  <input
                    type="checkbox"
                    checked={otherEncumbrance}
                    onChange={(e) => setOtherEncumbrance(e.target.checked)}
                  />
                  <span>
                    Any other third-party encumbrance or court attachment present? (Must be NO for valid AICTE deposit)
                  </span>
                </label>
                <label className="hold-toggle">
                  <input
                    type="checkbox"
                    checked={autoRenewal}
                    onChange={(e) => setAutoRenewal(e.target.checked)}
                  />
                  <span>Automatic renewal clause recorded</span>
                </label>
                <label className="hold-toggle">
                  <input
                    type="checkbox"
                    checked={prematureClosureRequiresAicteNoc}
                    onChange={(e) => setPrematureClosureRequiresAicteNoc(e.target.checked)}
                  />
                  <span>Premature closure / liquidation strictly requires prior AICTE written NOC</span>
                </label>
              </div>

              <h3 className="section-title">3. Authorized Signer Details & Mock eSign</h3>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="signer-name">Signer Full Name</label>
                  <input id="signer-name" value={signerName} onChange={(e) => setSignerName(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="emp-id">Employee Identification Number</label>
                  <input id="emp-id" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="designation">Designation</label>
                  <input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
                </div>
              </div>

              {/* Mock eSign Section */}
              <div className="esign-panel">
                <div className="esign-head">
                  <FileCheck2 size={20} color="#059669" />
                  <div>
                    <h4>Mock Electronic Signature (DSC / eSign)</h4>
                    <small>Computes a deterministic SHA-256 hash across canonical attestation fields.</small>
                  </div>
                </div>

                <div className="canonical-preview">
                  <label>Canonical Payload String:</label>
                  <pre>{canonicalPayload}</pre>
                  <label>Canonical Payload SHA-256 Digest:</label>
                  <code>{currentPayloadHash}</code>
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor="typed-name">Type your full name to confirm eSign ({signerName})</label>
                  <input
                    id="typed-name"
                    value={typedSignerName}
                    onChange={(e) => setTypedSignerName(e.target.value)}
                    placeholder={`Type exact name: ${signerName}`}
                    required
                  />
                </div>

                <label className="hold-toggle" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={eSignConfirmation}
                    onChange={(e) => setESignConfirmation(e.target.checked)}
                  />
                  <span>
                    I confirm that I am authorized by {tokenRecord.bank} to issue this attestation, and the information matches Core Banking Records.
                  </span>
                </label>
              </div>

              <div className="form-actions" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!eSignConfirmation || typedSignerName.trim().toLowerCase() !== signerName.trim().toLowerCase()}
                >
                  <ShieldCheck size={16} /> Sign & Submit Bank Attestation
                </button>
                <Link to="/bank-desk" className="btn btn-secondary">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="bank-portal-footer">
        <p>AICTE Security Deposit Assurance System · DHAAR Prototype Bank Verification Gateway</p>
        <small>Synthetic Bank Portal Interface · No real banking credentials or financial transactions</small>
      </footer>
    </div>
  );
}
