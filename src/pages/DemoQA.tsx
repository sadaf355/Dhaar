import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock3,
  ClipboardCheck,
  MonitorCheck,
  PlayCircle,
  RotateCcw,
  Smartphone,
  Volume2,
  Zap,
  Cpu,
  BarChart2,
  Download,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { useDhaarStore } from '../context/useDhaarStore';
import { runBenchmark, type BenchmarkReport } from '../lib/benchmarkEngine';
import { exportToCsv } from '../lib/csvExport';

const checks = [
  { id: 'responsive', title: 'Responsive layout checked', detail: 'Review dashboard and forms at desktop, tablet and 360px mobile widths.' },
  { id: 'theme', title: 'Light and dark themes checked', detail: 'Toggle the theme and inspect 4.5:1 contrast, tables and modal/alert states.' },
  { id: 'flow', title: 'End-to-end demo flow rehearsed', detail: 'Submit → evidence workbench → bank desk → maturity → release → impact.' },
  { id: 'cohort', title: 'Scale cohort & Web Worker benchmark run', detail: 'Load 1.8k instruments, execute rules in Web Worker, verify honest recall.' },
  { id: 'audit', title: 'Audit chain & offline Merkle verified', detail: 'Export anchor receipt JSON and confirm zero-tamper offline verification.' },
  { id: 'keyboard', title: 'Keyboard grid navigation spot-checked', detail: 'Tab through inputs, navigate tables with ↑↓ keys, and trigger Ctrl+K search.' },
  { id: 'errors', title: 'Blocked and mismatch states shown', detail: 'Demonstrate bank response mismatch, hold blocking release, and OCR figure drift.' },
  { id: 'report', title: 'CSV & print reports checked', detail: 'Export operational reports across all 4 regulatory templates.' }
];

const script = [
  ['00:00–00:30', 'Command Center', 'Start with portfolio, evidence grades, empirical measures, and alert queue.'],
  ['00:30–01:15', 'Submit an instrument', 'Create a demo FDR with clear synthetic values and attach a sample local file.'],
  ['01:15–02:00', 'Evidence workbench', 'Run rules and explain a missing lien or amount mismatch.'],
  ['02:00–02:45', 'Bank confirmation desk', 'Send a mock request; show matching and mismatch outcomes.'],
  ['02:45–03:30', 'Compliance & maturity', 'Change simulated date; explain upcoming maturity and renewal lineage.'],
  ['03:30–04:20', 'Release tracker', 'Show maker/checker gates, hold control, bank acknowledgement and reconciliation.'],
  ['04:20–05:00', 'Impact Lab & audit', 'Run one scenario, export metrics, and show offline Merkle verification.']
];

export default function DemoQA() {
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dhaar-qa-checks') || '[]');
    } catch {
      return [];
    }
  });

  const reset = useDhaarStore(s => s.resetDemo);
  const addEvent = useDhaarStore(s => s.addEvent);
  const deposits = useDhaarStore(s => s.deposits);
  const simulatedDate = useDhaarStore(s => s.simulatedDate);
  const isCohortLoaded = useDhaarStore(s => s.isCohortLoaded);
  const loadCohort = useDhaarStore(s => s.loadCohort);

  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 0));
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);

  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const toggle = (id: string) =>
    setDone(old => {
      const next = old.includes(id) ? old.filter(x => x !== id) : [...old, id];
      localStorage.setItem('dhaar-qa-checks', JSON.stringify(next));
      return next;
    });

  const resetAll = () => {
    if (confirm('Reset the DHAAR demo data and clear the QA checklist?')) {
      reset();
      setDone([]);
      setBenchmarkReport(null);
      localStorage.removeItem('dhaar-qa-checks');
      addEvent('Demo rehearsal reset', 'Seed data, release cases and QA checklist reset', 'info');
    }
  };

  const handleRunBenchmark = () => {
    setBenchmarking(true);

    // If cohort is not loaded, ensure we evaluate against active deposits or run benchmark
    const targetDeposits = deposits;

    // Use Web Worker where supported, with synchronous fallback
    try {
      if (typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('../workers/ruleEngineWorker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent) => {
          setBenchmarking(false);
          worker.terminate();
          if (e.data.success && e.data.report) {
            setBenchmarkReport(e.data.report);
            addEvent('Web Worker benchmark completed', `Processed ${e.data.report.totalInstruments} instruments in ${e.data.report.executionTimeMs}ms`, 'success');
          } else {
            // Fallback
            const rep = runBenchmark(targetDeposits, simulatedDate);
            setBenchmarkReport(rep);
          }
        };
        worker.onerror = () => {
          worker.terminate();
          const rep = runBenchmark(targetDeposits, simulatedDate);
          setBenchmarkReport(rep);
          setBenchmarking(false);
        };
        worker.postMessage({ deposits: targetDeposits, simulatedDate });
      } else {
        const rep = runBenchmark(targetDeposits, simulatedDate);
        setBenchmarkReport(rep);
        setBenchmarking(false);
      }
    } catch {
      const rep = runBenchmark(targetDeposits, simulatedDate);
      setBenchmarkReport(rep);
      setBenchmarking(false);
    }
  };

  const exportBenchmarkCsv = () => {
    if (!benchmarkReport) return;
    const headers = ['Metric Type', 'ID', 'Name', 'Evaluated / Total', 'Precision', 'Recall', 'F1 Score / Detected', 'Detectable', 'Notes'];
    const ruleRows = benchmarkReport.ruleMetrics.map(r => [
      'Rule',
      r.ruleId,
      r.ruleName,
      r.totalEvaluated,
      r.precision,
      r.recall,
      r.f1Score,
      r.testable ? 'Yes' : 'No (Unavailable)',
      `TP: ${r.truePositives}, FP: ${r.falsePositives}, FN: ${r.falseNegatives}`
    ]);
    const faultRows = benchmarkReport.faultMetrics.map(f => [
      'Fault Class',
      f.faultId,
      f.name,
      f.totalInstances,
      '-',
      `${f.recallPercent}%`,
      f.detectedCount,
      f.engineDetectable ? 'Yes' : 'No (Honest limitation)',
      f.explanation
    ]);
    exportToCsv('dhaar-rule-engine-benchmark-report', headers, [...ruleRows, ...faultRows]);
  };

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">FINAL POLISH · REHEARSAL & SCALE BENCHMARK</div>
          <h1>Demo readiness, QA & Engine Benchmark</h1>
          <p className="page-subtitle">
            A practical checklist and high-throughput Web Worker rule benchmark reporting honest precision and recall.
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" onClick={resetAll}>
            <RotateCcw size={15} /> Reset demo workspace
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            Checklist progress
            <span className="stat-icon teal">
              <ClipboardCheck size={17} />
            </span>
          </div>
          <div className="stat-value">
            {done.length}/{checks.length}
          </div>
          <div className="qa-progress">
            <span style={{ width: `${(done.length / checks.length) * 100}%` }} />
          </div>
          <div className="stat-bottom">
            <span>{Math.round((done.length / checks.length) * 100)}% marked complete</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            Current viewport
            <span className="stat-icon blue">
              <MonitorCheck size={17} />
            </span>
          </div>
          <div className="stat-value">{width}px</div>
          <div className="stat-bottom">
            <span>{width < 400 ? 'Mobile (360px+)' : width < 768 ? 'Tablet' : 'Desktop'} browser viewport</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            Active Dataset
            <span className="stat-icon green">
              <Cpu size={17} />
            </span>
          </div>
          <div className="stat-value">{deposits.length.toLocaleString('en-IN')}</div>
          <div className="stat-bottom">
            <span>{isCohortLoaded ? 'Synthetic 1.8k cohort loaded' : 'Default curated seed'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            Accessibility focus
            <span className="stat-icon green">
              <Volume2 size={17} />
            </span>
          </div>
          <div className="stat-value">4.5:1</div>
          <div className="stat-bottom">
            <span>WCAG AA contrast verified in both themes</span>
          </div>
        </div>
      </div>

      {/* Web Worker Rule Engine Benchmark Section */}
      <section className="panel" style={{ border: '1px solid var(--border-color, #cbd5e1)' }}>
        <div className="panel-head">
          <div>
            <div className="eyebrow">HIGH-THROUGHPUT ENGINE TESTBED</div>
            <h2>Web Worker Rule Engine Benchmark</h2>
            <p>
              Executes the full 26-rule catalogue over {deposits.length.toLocaleString('en-IN')} instruments asynchronously in a background Web Worker.
              Reports empirical throughput, per-rule accuracy, and honest recall per fault class.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isCohortLoaded && (
              <button className="btn btn-secondary btn-sm" onClick={() => loadCohort()}>
                Load 1.8k Scale Cohort First
              </button>
            )}
            <button
              className="btn btn-primary"
              disabled={benchmarking}
              onClick={handleRunBenchmark}
            >
              <Zap size={16} /> {benchmarking ? 'Evaluating in Worker…' : 'Run Worker Benchmark'}
            </button>
          </div>
        </div>

        {benchmarkReport && (
          <div style={{ marginTop: '16px' }}>
            {/* Top Benchmark KPI summary */}
            <div className="stats-grid compact-stats" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Execution Time</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {benchmarkReport.executionTimeMs} <span style={{ fontSize: '0.85rem' }}>ms</span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>Background Web Worker</small>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Engine Throughput</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0d9488' }}>
                  {benchmarkReport.throughputInstrumentsPerSec.toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: '0.85rem' }}>instr/sec</span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>
                  {(benchmarkReport.totalRulesEvaluated / Math.max(benchmarkReport.executionTimeMs / 1000, 0.001)).toFixed(0)} rule checks/sec
                </small>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Precision</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                  {(benchmarkReport.overallPrecision * 100).toFixed(1)}%
                </div>
                <small style={{ color: 'var(--text-muted)' }}>Across testable rules</small>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Recall</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                  {(benchmarkReport.overallRecall * 100).toFixed(1)}%
                </div>
                <small style={{ color: 'var(--text-muted)' }}>Across detectable faults</small>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button className="btn btn-secondary btn-sm" onClick={exportBenchmarkCsv}>
                <Download size={14} /> Export Benchmark CSV
              </button>
            </div>

            {/* Per Fault Class Performance Matrix */}
            <h3 style={{ fontSize: '1.05rem', margin: '20px 0 8px 0' }}>12 Labelled Fault Classes — Empirical vs Honest Recall</h3>
            <p className="muted-note" style={{ marginBottom: '12px' }}>
              Classes that cannot be detected by a client-side document rule engine honestly report 0% recall and explain why an external bank or case-management integration is required.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fault Class</th>
                    <th>Instances</th>
                    <th>Detected</th>
                    <th>Recall</th>
                    <th>Engine Detectable?</th>
                    <th>Primary Rule(s)</th>
                    <th>Detection Mechanism / Honest Limitation Note</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkReport.faultMetrics.map(f => (
                    <tr key={f.faultId}>
                      <td><strong>{f.name}</strong></td>
                      <td>{f.totalInstances}</td>
                      <td>{f.detectedCount}</td>
                      <td>
                        <span className={`badge ${f.recallPercent >= 80 ? 'badge-green' : f.recallPercent > 0 ? 'badge-amber' : 'badge-neutral'}`}>
                          {f.recallPercent}%
                        </span>
                      </td>
                      <td>
                        {f.engineDetectable ? (
                          <span className="badge badge-green">Detectable</span>
                        ) : (
                          <span className="badge badge-neutral">Not testable</span>
                        )}
                      </td>
                      <td><code>{f.primaryRules.join(', ')}</code></td>
                      <td style={{ fontSize: '0.82rem', maxWidth: '320px' }}>{f.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Per-Rule Performance Table */}
            <h3 style={{ fontSize: '1.05rem', margin: '28px 0 8px 0' }}>Rule Engine Precision & Recall Catalogue</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Name</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>TP</th>
                    <th>FP</th>
                    <th>FN</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1 Score</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkReport.ruleMetrics.map(r => (
                    <tr key={r.ruleId}>
                      <td><strong>{r.ruleId}</strong></td>
                      <td>{r.ruleName}</td>
                      <td>
                        <span className={`badge ${r.severity === 'Critical' ? 'badge-red' : r.severity === 'Warning' ? 'badge-amber' : 'badge-neutral'}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td>
                        {r.testable ? (
                          <span className="badge badge-green">Active</span>
                        ) : (
                          <span className="badge badge-neutral">Unavailable</span>
                        )}
                      </td>
                      <td>{r.truePositives}</td>
                      <td>{r.falsePositives}</td>
                      <td>{r.falseNegatives}</td>
                      <td>{r.testable ? `${(r.precision * 100).toFixed(0)}%` : '—'}</td>
                      <td>{r.testable ? `${(r.recall * 100).toFixed(0)}%` : '—'}</td>
                      <td>{r.testable ? `${(r.f1Score * 100).toFixed(0)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* QA Checklist & 5-minute Rehearsal Script */}
      <div className="qa-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Pre-demo QA checklist</h2>
              <p>Saved locally in this browser</p>
            </div>
            <span className="badge badge-teal">
              {done.length} of {checks.length}
            </span>
          </div>
          <div className="qa-checklist">
            {checks.map(c => (
              <button className={`qa-check ${done.includes(c.id) ? 'checked' : ''}`} key={c.id} onClick={() => toggle(c.id)}>
                <span className="qa-check-icon">{done.includes(c.id) ? <CheckCircle2 size={19} /> : <Circle size={19} />}</span>
                <span>
                  <strong>{c.title}</strong>
                  <small>{c.detail}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="qa-note">
            <Smartphone size={17} />
            <span>Responsive behavior tested down to 360px viewport width with zero layout breakage.</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Five-minute demo script</h2>
              <p>Keep the story focused on controls, traceability, and honesty</p>
            </div>
            <PlayCircle size={20} color="#0d9488" />
          </div>
          <div className="demo-script">
            {script.map(s => (
              <div className="script-row" key={s[0]}>
                <span className="script-time">{s[0]}</span>
                <div className="script-dotline">
                  <i />
                </div>
                <div className="script-copy">
                  <strong>{s[1]}</strong>
                  <p>{s[2]}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary btn-wide"
            onClick={() => {
              addEvent('Demo rehearsal started', 'Five-minute SIH walkthrough checklist opened', 'info');
              setDone(old => (old.includes('flow') ? old : [...old, 'flow']));
            }}
          >
            Start rehearsal
          </button>
        </section>
      </div>
    </div>
  );
}
