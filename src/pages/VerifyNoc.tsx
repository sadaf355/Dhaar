import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, ShieldX, Search } from 'lucide-react';
import { useDhaarStore } from '../context/useDhaarStore';
import { verifyNocCode, computeNocVerificationHash, generateSvgQrMatrix } from '../lib/qrCode';
import { money } from '../lib/format';

export default function VerifyNoc() {
  const { code: urlCode } = useParams<{ code: string }>();
  const cases = useDhaarStore(s => s.releaseCases);
  const deposits = useDhaarStore(s => s.deposits);

  const [inputCode, setInputCode] = useState(urlCode || '');
  const [result, setResult] = useState<ReturnType<typeof verifyNocCode> | null>(
    urlCode ? verifyNocCode(urlCode, cases, deposits) : null
  );

  const verify = () => {
    setResult(verifyNocCode(inputCode.trim(), cases, deposits));
  };

  const dep = result?.deposit;
  const rc = result?.releaseCase;

  return (
    <div className="bank-portal-container">
      <div className="bank-portal-card" style={{ maxWidth: '680px' }}>
        <div className="bank-portal-brand">
          <ShieldCheck size={28} />
          <div>
            <div className="eyebrow">AICTE DHAAR</div>
            <h1 style={{ fontSize: '1.4rem', margin: '0' }}>NOC / Lien Release Verification</h1>
          </div>
        </div>

        <div className="bank-portal-otp-section" style={{ marginTop: '20px' }}>
          <label className="field">
            Enter Verification Code
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="Enter NOC hash or release case ID"
                style={{ fontFamily: 'monospace', letterSpacing: '0.05em', flex: 1 }}
              />
              <button className="btn btn-primary" onClick={verify}>
                <Search size={15} /> Verify
              </button>
            </div>
          </label>
        </div>

        {result && (
          <div style={{ marginTop: '24px' }}>
            {result.valid ? (
              <div className="attestation-result match">
                <CheckCircle2 size={28} />
                <div>
                  <h2 style={{ margin: 0 }}>✓ Valid Lien Release Certificate</h2>
                  <p>This AICTE DHAAR Lien Release / NOC is authentic and in force.</p>
                </div>
              </div>
            ) : (
              <div className="attestation-result mismatch">
                <ShieldX size={28} />
                <div>
                  <h2 style={{ margin: 0 }}>✗ Invalid or Unverified Certificate</h2>
                  <p>{result.error}</p>
                </div>
              </div>
            )}

            {dep && rc && (
              <div className="panel" style={{ marginTop: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div className="eyebrow" style={{ marginBottom: '12px' }}>CERTIFICATE DETAILS</div>
                    <div className="comparison-field"><span>Institution</span><strong>{dep.institution}</strong></div>
                    <div className="comparison-field"><span>Instrument</span><strong>{dep.fdrNo} — {dep.bank}</strong></div>
                    <div className="comparison-field"><span>Amount</span><strong>{money(dep.amount)}</strong></div>
                    <div className="comparison-field"><span>Release Case</span><strong>{rc.id}</strong></div>
                    <div className="comparison-field"><span>Stage</span><strong>{rc.stage}</strong></div>
                    {rc.approver && <div className="comparison-field"><span>Approved By</span><strong>{rc.approver}</strong></div>}
                    {rc.nocIssuedAt && <div className="comparison-field"><span>NOC Issued</span><strong>{rc.nocIssuedAt}</strong></div>}
                    {rc.bankAckRef && <div className="comparison-field"><span>Bank Ack Ref</span><strong>{rc.bankAckRef}</strong></div>}
                    <div className="comparison-field">
                      <span>Computed Hash</span>
                      <strong style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {result.computedHash}
                      </strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{ color: 'var(--text-primary)', width: '180px', height: '180px' }}
                      dangerouslySetInnerHTML={{ __html: generateSvgQrMatrix(result.computedHash) }}
                    />
                    <small className="muted-note" style={{ display: 'block', marginTop: '4px' }}>QR — SHA-256 hash</small>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="info-callout" style={{ marginTop: '24px' }}>
          <ShieldCheck size={17} />
          <p><strong>DEMO prototype:</strong> This is a simulated verification page. In production, the hash is recomputed server-side against a tamper-evident audit log. No real legal documents are associated with this demo.</p>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/" className="btn btn-ghost btn-sm">← Return to AICTE DHAAR</Link>
        </div>
      </div>
    </div>
  );
}
