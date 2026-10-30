import React, { useState, useMemo } from 'react';
import { Printer, Download, FileText, CalendarClock, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useDhaarStore } from '../context/useDhaarStore';
import { money } from '../lib/format';
import { exportToCsv } from '../lib/csvExport';

type ReportTemplate = 'pending_verifications' | 'upcoming_maturities' | 'missing_documents' | 'cases_needing_intervention';

export default function Reports() {
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate>('pending_verifications');
  const deposits = useDhaarStore(s => s.deposits);
  const releaseCases = useDhaarStore(s => s.releaseCases);
  const holds = useDhaarStore(s => s.holds);
  const simulatedDate = useDhaarStore(s => s.simulatedDate);

  // Template 1: Pending Verifications
  const pendingVerifications = useMemo(() => {
    return deposits.filter(d => d.grade === 'E0' || d.status === 'Under review' || d.status === 'Attention required');
  }, [deposits]);

  // Template 2: Upcoming Maturities (<= 180 days)
  const upcomingMaturities = useMemo(() => {
    const nowMs = Date.parse(`${simulatedDate}T00:00:00Z`);
    return deposits
      .filter(d => d.status !== 'Released' && d.maturityDate)
      .map(d => {
        const matMs = Date.parse(`${d.maturityDate}T00:00:00Z`);
        const days = Math.round((matMs - nowMs) / 86400000);
        return { ...d, daysToMaturity: days };
      })
      .filter(d => d.daysToMaturity <= 180)
      .sort((a, b) => a.daysToMaturity - b.daysToMaturity);
  }, [deposits, simulatedDate]);

  // Template 3: Missing Documents / Compliance Findings
  const missingDocuments = useMemo(() => {
    return deposits.filter(
      d => !d.lien || d.finding || d.pdfMetadata?.producer?.toLowerCase().includes('photoshop') || d.bankRequestStatus === 'Mismatch'
    );
  }, [deposits]);

  // Template 4: Cases Needing Intervention
  const casesNeedingIntervention = useMemo(() => {
    const activeHolds = holds.filter(h => h.status === 'Active');
    const casesWithHold = releaseCases.filter(c => c.hold || c.stage === 'On hold');
    const depositsWithGap = deposits.filter(d => (d.coverageGapDays || 0) > 0);

    return [
      ...activeHolds.map(h => ({
        id: h.id,
        type: 'Active Hold',
        target: `${h.scope} ${h.targetId}`,
        issue: h.reason,
        actionRequired: 'Approving Authority review and clearance'
      })),
      ...casesWithHold.map(c => ({
        id: c.id,
        type: 'Release On Hold',
        target: `Case ${c.id} (Deposit ${c.depositId})`,
        issue: c.holdReason || 'Blocked by case hold',
        actionRequired: 'Verify refund account details and clear hold'
      })),
      ...depositsWithGap.map(d => ({
        id: d.id,
        type: 'Coverage Gap',
        target: `${d.id} · ${d.institution}`,
        issue: `Unbacked lineage gap: ${d.coverageGapDays} days`,
        actionRequired: 'Request bank bridge explanation or financial penalty calculation'
      }))
    ];
  }, [holds, releaseCases, deposits]);

  const handleExportCsv = () => {
    if (activeTemplate === 'pending_verifications') {
      const headers = ['Deposit ID', 'Institution', 'Bank', 'FDR No', 'Amount', 'Grade', 'Status', 'Finding'];
      const rows = pendingVerifications.map(d => [d.id, d.institution, d.bank, d.fdrNo, d.amount, d.grade, d.status, d.finding || 'None']);
      exportToCsv('dhaar-pending-verifications-report', headers, rows);
    } else if (activeTemplate === 'upcoming_maturities') {
      const headers = ['Deposit ID', 'Institution', 'Bank', 'FDR No', 'Amount', 'Maturity Date', 'Days Remaining', 'Status'];
      const rows = upcomingMaturities.map(d => [d.id, d.institution, d.bank, d.fdrNo, d.amount, d.maturityDate, d.daysToMaturity, d.status]);
      exportToCsv('dhaar-upcoming-maturities-report', headers, rows);
    } else if (activeTemplate === 'missing_documents') {
      const headers = ['Deposit ID', 'Institution', 'Bank', 'Lien Declared', 'Bank Request Status', 'Finding'];
      const rows = missingDocuments.map(d => [d.id, d.institution, d.bank, d.lien ? 'Yes' : 'No', d.bankRequestStatus || 'Not requested', d.finding || 'Defect']);
      exportToCsv('dhaar-missing-documents-report', headers, rows);
    } else {
      const headers = ['Reference ID', 'Type', 'Target', 'Issue / Reason', 'Action Required'];
      const rows = casesNeedingIntervention.map(c => [c.id, c.type, c.target, c.issue, c.actionRequired]);
      exportToCsv('dhaar-cases-needing-intervention-report', headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">GOVERNANCE & AUDIT</div>
          <h1>Operational Reports & Intelligence</h1>
          <p className="page-subtitle">
            Exportable regulatory compliance reports, upcoming maturity schedules, and exception worklists.
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" onClick={handleExportCsv}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> Print Report
          </button>
        </div>
      </div>

      {/* Template Switcher Tabs */}
      <div className="subnav-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTemplate === 'pending_verifications'}
          className={`subnav-tab ${activeTemplate === 'pending_verifications' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('pending_verifications')}
        >
          <FileText size={16} /> Pending Verifications ({pendingVerifications.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTemplate === 'upcoming_maturities'}
          className={`subnav-tab ${activeTemplate === 'upcoming_maturities' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('upcoming_maturities')}
        >
          <CalendarClock size={16} /> Upcoming Maturities ({upcomingMaturities.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTemplate === 'missing_documents'}
          className={`subnav-tab ${activeTemplate === 'missing_documents' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('missing_documents')}
        >
          <AlertTriangle size={16} /> Missing Documents & Findings ({missingDocuments.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTemplate === 'cases_needing_intervention'}
          className={`subnav-tab ${activeTemplate === 'cases_needing_intervention' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('cases_needing_intervention')}
        >
          <ShieldAlert size={16} /> Cases Needing Intervention ({casesNeedingIntervention.length})
        </button>
      </div>

      {/* Report Body */}
      <section className="panel print-report-panel">
        <div className="panel-head">
          <div>
            <h2>
              {activeTemplate === 'pending_verifications' && 'Report Template 1: Pending Verifications Worklist'}
              {activeTemplate === 'upcoming_maturities' && 'Report Template 2: Upcoming Maturity Ladder & Renewal Schedule'}
              {activeTemplate === 'missing_documents' && 'Report Template 3: Missing Document Endorsements & Forensics Exceptions'}
              {activeTemplate === 'cases_needing_intervention' && 'Report Template 4: Supervisory Intervention & Hold Register'}
            </h2>
            <p>Generated for Simulated Date: {simulatedDate} · System: AICTE DHAAR Deposit Assurance Engine</p>
          </div>
        </div>

        {activeTemplate === 'pending_verifications' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Deposit ID</th>
                  <th>Institution</th>
                  <th>Bank & FDR</th>
                  <th>Amount</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Finding / Review Reason</th>
                </tr>
              </thead>
              <tbody>
                {pendingVerifications.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.id}</strong></td>
                    <td>{d.institution}</td>
                    <td>{d.bank} · <span className="mono">{d.fdrNo}</span></td>
                    <td>{money(d.amount)}</td>
                    <td><span className="badge badge-amber">{d.grade}</span></td>
                    <td>{d.status}</td>
                    <td>{d.finding || 'Awaiting initial Regional Officer review'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTemplate === 'upcoming_maturities' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Deposit ID</th>
                  <th>Institution</th>
                  <th>Maturity Date</th>
                  <th>Days Remaining</th>
                  <th>Secured Value</th>
                  <th>Ladder Stage</th>
                  <th>Action Required</th>
                </tr>
              </thead>
              <tbody>
                {upcomingMaturities.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.id}</strong></td>
                    <td>{d.institution}</td>
                    <td>{d.maturityDate}</td>
                    <td>
                      <span className={`badge ${d.daysToMaturity < 0 ? 'badge-red' : d.daysToMaturity <= 30 ? 'badge-amber' : 'badge-green'}`}>
                        {d.daysToMaturity < 0 ? `${Math.abs(d.daysToMaturity)}d OVERDUE` : `${d.daysToMaturity} days`}
                      </span>
                    </td>
                    <td>{money(d.amount)}</td>
                    <td>{d.daysToMaturity <= 0 ? 'T-0 / Overdue' : d.daysToMaturity <= 30 ? 'T-30 Urgent' : 'T-90 Advisory'}</td>
                    <td>{d.daysToMaturity <= 0 ? 'Issue encashment demand or secure renewal FDR' : 'Transmit multi-channel renewal alert'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTemplate === 'missing_documents' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Deposit ID</th>
                  <th>Institution</th>
                  <th>Bank</th>
                  <th>Lien Declared</th>
                  <th>Exception Finding</th>
                  <th>Remediation Step</th>
                </tr>
              </thead>
              <tbody>
                {missingDocuments.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.id}</strong></td>
                    <td>{d.institution}</td>
                    <td>{d.bank}</td>
                    <td>{d.lien ? <span className="badge badge-green">Yes</span> : <span className="badge badge-red">Missing</span>}</td>
                    <td>{d.finding || 'Document anomaly'}</td>
                    <td>Require institution upload re-stamped bank FDR certificate</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTemplate === 'cases_needing_intervention' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference ID</th>
                  <th>Intervention Category</th>
                  <th>Target Entity</th>
                  <th>Issue Details</th>
                  <th>Action Required</th>
                </tr>
              </thead>
              <tbody>
                {casesNeedingIntervention.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.id}</strong></td>
                    <td><span className="badge badge-red">{c.type}</span></td>
                    <td>{c.target}</td>
                    <td>{c.issue}</td>
                    <td>{c.actionRequired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
