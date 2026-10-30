import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Upload, CheckCircle2, FileCode, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { verifyOfflineAuditChain, type AuditAnchorReceipt } from '../lib/merkleAudit';

export default function VerifyAudit() {
  const [jsonText, setJsonText] = useState('');
  const [verificationResult, setVerificationResult] = useState<ReturnType<typeof verifyOfflineAuditChain> | null>(null);
  const [receiptMeta, setReceiptMeta] = useState<{ totalEvents: number; exportedAt: string; chainHead: string } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setJsonText(content);
      executeVerification(content);
    };
    reader.readAsText(file);
  };

  const executeVerification = (rawJson: string) => {
    setParseError(null);
    setVerificationResult(null);

    try {
      const parsed: AuditAnchorReceipt = JSON.parse(rawJson);
      if (!parsed.events || !Array.isArray(parsed.events)) {
        setParseError('Invalid receipt format: missing "events" array.');
        return;
      }

      setReceiptMeta({
        totalEvents: parsed.events.length,
        exportedAt: parsed.exportedAt || 'Unknown',
        chainHead: parsed.chainHeadHash || 'Unknown'
      });

      const digestsMap: Record<string, any> = {};
      (parsed.dailyDigests || []).forEach(d => {
        digestsMap[d.date] = d;
      });

      const res = verifyOfflineAuditChain(parsed.events, digestsMap);
      setVerificationResult(res);
    } catch (err: any) {
      setParseError(`JSON parse error: ${err.message || 'Malformed JSON payload'}`);
    }
  };

  return (
    <div className="bank-portal-container">
      <div className="bank-portal-card" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div className="bank-portal-brand">
            <ShieldCheck size={28} />
            <div>
              <div className="eyebrow">AICTE DHAAR CRYPTOGRAPHIC PROOF</div>
              <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Offline Audit Trail & Merkle Verifier</h1>
            </div>
          </div>
          <Link to="/audit" className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back to Audit
          </Link>
        </div>

        <div className="notice-banner info-banner" style={{ marginBottom: '20px' }}>
          <p style={{ margin: 0 }}>
            <strong>Offline Verification Notice:</strong> This verifier runs completely locally in your browser.
            Browser LocalStorage is a client-side prototype cache and not an immutable Byzantine-fault-tolerant ledger.
            In production, DHAAR daily Merkle roots are published to a public append-only transparency log.
          </p>
        </div>

        {/* Input Area */}
        <div className="panel" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label htmlFor="receipt-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Upload Anchor Receipt (.json)
              <input id="receipt-upload" type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button
              className="btn btn-primary btn-sm"
              disabled={!jsonText.trim()}
              onClick={() => executeVerification(jsonText)}
            >
              <RefreshCw size={14} /> Verify Chain & Merkle Roots
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder="Or paste the JSON contents of an Anchor Receipt here…"
            rows={6}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)'
            }}
          />
        </div>

        {/* Error Notification */}
        {parseError && (
          <div className="notice-banner amber-banner" style={{ marginBottom: '20px' }}>
            <div className="notice-symbol"><ShieldAlert size={18} /></div>
            <div>
              <strong>Parsing Error</strong>
              <p>{parseError}</p>
            </div>
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <div style={{ marginTop: '20px' }}>
            {verificationResult.valid ? (
              <div className="attestation-result match" style={{ padding: '20px' }}>
                <CheckCircle2 size={32} />
                <div>
                  <h2 style={{ margin: '0 0 6px 0' }}>✓ Cryptographic Hash Chain & Merkle Roots Verified</h2>
                  <p style={{ margin: 0 }}>
                    All {verificationResult.totalVerified} sequential events maintain cryptographic integrity.
                    Each event's SHA-256 payload and previous-hash pointers match, and all daily Merkle roots are mathematically verified.
                  </p>
                  {receiptMeta && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', opacity: 0.9 }}>
                      <span>Chain Head: <code style={{ fontFamily: 'monospace' }}>{receiptMeta.chainHead.slice(0, 16)}…</code></span>
                      <span style={{ marginLeft: '16px' }}>Exported: {receiptMeta.exportedAt}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="attestation-result mismatch" style={{ padding: '20px' }}>
                <ShieldAlert size={32} />
                <div>
                  <h2 style={{ margin: '0 0 6px 0' }}>✗ Chain Tampering or Merkle Discrepancy Detected</h2>
                  <p style={{ margin: 0 }}>{verificationResult.error}</p>
                  {verificationResult.brokenIndex !== undefined && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                      Integrity breached at Event Index <strong>#{verificationResult.brokenIndex}</strong>.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Daily Digests Breakdown */}
            {Object.keys(verificationResult.calculatedDigests).length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Verified Daily Merkle Roots</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Simulated Date</th>
                        <th>Events</th>
                        <th>Recomputed Merkle Root (SHA-256)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(verificationResult.calculatedDigests).map(d => (
                        <tr key={d.date}>
                          <td><strong>{d.date}</strong></td>
                          <td>{d.eventCount} events</td>
                          <td><code style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{d.merkleRoot}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
