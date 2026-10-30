import { useMemo, useState } from 'react';
import { BookOpen, Calculator, ChevronDown, ChevronRight, Edit2, Info, Plus, Save, Settings2, X } from 'lucide-react';
import { useDhaarStore } from '../context/useDhaarStore';
import { computeInstitutionMetrics, simulateWhatIf, type AphCategoryRequirement, type PenaltyRuleConfig, type AphEdition } from '../lib/aphParameters';
import { institutions } from '../data/seed';
import { money } from '../lib/format';
import Badge from '../components/Badge';

export default function Parameters() {
  const deposits = useDhaarStore(s => s.deposits);
  const simulatedDate = useDhaarStore(s => s.simulatedDate);
  const aphEditions = useDhaarStore(s => s.aphEditions);
  const activeEditionId = useDhaarStore(s => s.activeEditionId);
  const setActiveEdition = useDhaarStore(s => s.setActiveEdition);
  const upsertAphEdition = useDhaarStore(s => s.upsertAphEdition);

  const activeEdition = aphEditions.find(e => e.id === activeEditionId) || aphEditions[0];

  const [editingCat, setEditingCat] = useState<AphCategoryRequirement | null>(null);
  const [editingPen, setEditingPen] = useState<PenaltyRuleConfig | null>(null);
  const [selectedInst, setSelectedInst] = useState(institutions[0]?.code || '');

  // What-if simulator state
  const [whatIfIntake, setWhatIfIntake] = useState(0);
  const [whatIfClosureCount, setWhatIfClosureCount] = useState(0);
  const [whatIfClosureAmount, setWhatIfClosureAmount] = useState(0);

  const metrics = useMemo(() => {
    return institutions.map(inst => computeInstitutionMetrics(
      inst.code,
      inst.name,
      deposits,
      activeEdition,
      simulatedDate
    ));
  }, [deposits, activeEdition, simulatedDate]);

  const instMetrics = metrics.find(m => m.institutionCode === selectedInst) || metrics[0];

  const whatIf = useMemo(() => {
    if (!instMetrics) return null;
    return simulateWhatIf(instMetrics, activeEdition, {
      intakeChangePercent: whatIfIntake,
      earlyClosureCount: whatIfClosureCount,
      earlyClosureAmount: whatIfClosureAmount
    });
  }, [instMetrics, activeEdition, whatIfIntake, whatIfClosureCount, whatIfClosureAmount]);

  const saveCategory = (cat: AphCategoryRequirement) => {
    const updated: AphEdition = {
      ...activeEdition,
      categories: activeEdition.categories.map(c => c.id === cat.id ? cat : c)
    };
    upsertAphEdition(updated);
    setEditingCat(null);
  };

  const savePenalty = (pen: PenaltyRuleConfig) => {
    const updated: AphEdition = {
      ...activeEdition,
      penalties: activeEdition.penalties.map(p => p.id === pen.id ? pen : p)
    };
    upsertAphEdition(updated);
    setEditingPen(null);
  };

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">POLICY CONFIGURATION</div>
          <h1>APH Parameters Table</h1>
          <p className="page-subtitle">Versioned Approval Process Handbook parameters by institution category. Changing a parameter immediately updates all coverage calculations and compliance views.</p>
        </div>
        <Badge tone="amber">DEMO — values to be supplied by AICTE</Badge>
      </div>

      <div className="notice-banner amber-banner">
        <div className="notice-symbol"><Info size={19} /></div>
        <div>
          <strong>DEMO parameters only — not official AICTE policy</strong>
          <p>All amounts, tenures, penalty percentages, and clause references are illustrative demonstration values. The "Clause Reference" fields are intentionally blank — to be populated with authorised APH clause numbers by AICTE before use in any official process.</p>
        </div>
      </div>

      {/* Edition Switcher */}
      <section className="panel">
        <div className="panel-head">
          <div><h2>APH Edition</h2><p>Switch editions to see how changing parameters affects all calculations.</p></div>
          <BookOpen size={20} />
        </div>
        <div className="form-grid">
          <label className="field field-full">
            Active APH Edition
            <select value={activeEditionId} onChange={e => setActiveEdition(e.target.value)}>
              {aphEditions.map(e => (
                <option key={e.id} value={e.id}>{e.editionName} (effective {e.effectiveFrom})</option>
              ))}
            </select>
          </label>
        </div>
        <div className="info-callout">
          <Info size={17} />
          <p><strong>{activeEdition.editionName}:</strong> {activeEdition.description}</p>
        </div>
      </section>

      {/* Category Requirements Table */}
      <section className="panel">
        <div className="panel-head">
          <div><h2>Required Amount &amp; Tenure by Category</h2><p>Edit to see real-time impact on institution metrics.</p></div>
          <Settings2 size={20} />
        </div>
        <div className="rule-results">
          {activeEdition.categories.map(cat => (
            <div key={cat.id} className="rule-result">
              <div className="rule-result-icon ok"><BookOpen size={15} /></div>
              <div className="rule-result-copy">
                <strong>{cat.categoryName}</strong>
                <span>{cat.programmeType}</span>
                <small>
                  Required: <strong>{money(cat.requiredAmount)}</strong> · Tenure: <strong>{cat.requiredTenureDays} days</strong> ·{' '}
                  Clause Ref: <em>{cat.clauseRef || '(to be supplied by AICTE)'}</em>
                </small>
                <small className="muted-note">{cat.demoLabel}</small>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingCat({ ...cat })}>
                <Edit2 size={13} /> Edit
              </button>
            </div>
          ))}
        </div>

        {editingCat && (
          <div className="modal-overlay" onClick={() => setEditingCat(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Edit Category — {editingCat.categoryName}</h3>
                <button className="icon-button" onClick={() => setEditingCat(null)}><X size={16} /></button>
              </div>
              <div className="form-grid" style={{ marginTop: '16px' }}>
                <label className="field field-full">
                  Category Name
                  <input value={editingCat.categoryName} onChange={e => setEditingCat({ ...editingCat, categoryName: e.target.value })} />
                </label>
                <label className="field">
                  Required Amount (INR) — DEMO
                  <div className="input-prefix"><span>₹</span>
                    <input type="number" value={editingCat.requiredAmount}
                      onChange={e => setEditingCat({ ...editingCat, requiredAmount: Number(e.target.value) })} />
                  </div>
                </label>
                <label className="field">
                  Required Tenure (days) — DEMO
                  <input type="number" value={editingCat.requiredTenureDays}
                    onChange={e => setEditingCat({ ...editingCat, requiredTenureDays: Number(e.target.value) })} />
                </label>
                <label className="field field-full">
                  Clause Reference (leave blank — to be supplied by AICTE)
                  <input value={editingCat.clauseRef}
                    onChange={e => setEditingCat({ ...editingCat, clauseRef: e.target.value })}
                    placeholder="e.g. APH 2025-26 § 4.2.1" />
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setEditingCat(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => saveCategory(editingCat!)}>
                  <Save size={14} /> Save &amp; Update All Views
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Penalty Rules Table */}
      <section className="panel">
        <div className="panel-head">
          <div><h2>Penalty Rules</h2><p>Late creation, premature encashment, and custom penalties.</p></div>
        </div>
        <div className="rule-results">
          {activeEdition.penalties.map(pen => (
            <div key={pen.id} className="rule-result">
              <div className="rule-result-icon amber"><Calculator size={15} /></div>
              <div className="rule-result-copy">
                <strong>{pen.name}</strong>
                <span>{pen.condition}</span>
                <small>
                  {pen.percent !== undefined ? `${pen.percent}% of applicable base` : ''}
                  {pen.fixedAmount !== undefined ? `Fixed ₹${pen.fixedAmount.toLocaleString('en-IN')}` : ''}
                  {pen.deadlineDays !== undefined ? ` · Deadline window: ${pen.deadlineDays} days` : ''}
                  {' · '}Clause Ref: <em>{pen.clauseRef || '(to be supplied by AICTE)'}</em>
                </small>
                <small className="muted-note">{pen.demoLabel}</small>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPen({ ...pen })}>
                <Edit2 size={13} /> Edit
              </button>
            </div>
          ))}
        </div>

        {editingPen && (
          <div className="modal-overlay" onClick={() => setEditingPen(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Edit Penalty — {editingPen.name}</h3>
                <button className="icon-button" onClick={() => setEditingPen(null)}><X size={16} /></button>
              </div>
              <div className="form-grid" style={{ marginTop: '16px' }}>
                <label className="field field-full">
                  Penalty Name
                  <input value={editingPen.name} onChange={e => setEditingPen({ ...editingPen, name: e.target.value })} />
                </label>
                {editingPen.percent !== undefined && (
                  <label className="field">
                    Rate (%) — DEMO
                    <input type="number" step="0.1" value={editingPen.percent}
                      onChange={e => setEditingPen({ ...editingPen, percent: Number(e.target.value) })} />
                  </label>
                )}
                {editingPen.fixedAmount !== undefined && (
                  <label className="field">
                    Fixed Amount (INR) — DEMO
                    <div className="input-prefix"><span>₹</span>
                      <input type="number" value={editingPen.fixedAmount}
                        onChange={e => setEditingPen({ ...editingPen, fixedAmount: Number(e.target.value) })} />
                    </div>
                  </label>
                )}
                {editingPen.deadlineDays !== undefined && (
                  <label className="field">
                    Deadline Window (days) — DEMO
                    <input type="number" value={editingPen.deadlineDays}
                      onChange={e => setEditingPen({ ...editingPen, deadlineDays: Number(e.target.value) })} />
                  </label>
                )}
                <label className="field field-full">
                  Clause Reference (to be supplied by AICTE)
                  <input value={editingPen.clauseRef}
                    onChange={e => setEditingPen({ ...editingPen, clauseRef: e.target.value })}
                    placeholder="e.g. APH 2025-26 § 5.3.4" />
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setEditingPen(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => savePenalty(editingPen!)}>
                  <Save size={14} /> Save &amp; Update All Views
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Per-Institution Coverage Metrics */}
      <section className="panel">
        <div className="panel-head">
          <div><h2>Institution Coverage Dashboard</h2><p>Required vs verified-held, gap, penalty exposure. Parameters update all values immediately.</p></div>
        </div>
        <div className="form-grid">
          <label className="field field-full">
            Select Institution
            <select value={selectedInst} onChange={e => setSelectedInst(e.target.value)}>
              {institutions.map(i => <option key={i.code} value={i.code}>{i.name} ({i.code})</option>)}
            </select>
          </label>
        </div>
        {instMetrics && (
          <>
            <div className="review-summary" style={{ marginTop: '16px' }}>
              <div><span>Required Amount</span><strong>{money(instMetrics.requiredAmount)}</strong></div>
              <div><span>Verified Held (E2+, assured, deduped)</span><strong style={{ color: instMetrics.coverageGap > 0 ? 'var(--red)' : 'var(--green)' }}>{money(instMetrics.verifiedHeldAmount)}</strong></div>
              <div><span>Coverage Gap</span><strong style={{ color: instMetrics.coverageGap > 0 ? 'var(--red)' : 'var(--green)' }}>{money(instMetrics.coverageGap)}</strong></div>
              <div><span>Tenure Remaining</span><strong>{instMetrics.tenureRemainingDays} days</strong></div>
              <div><span>Next Deadline</span><strong>{instMetrics.nextDeadline || 'None'}</strong></div>
              <div><span>Penalty Exposure</span><strong style={{ color: instMetrics.penaltyExposure > 0 ? 'var(--red)' : 'var(--green)' }}>{money(instMetrics.penaltyExposure)}</strong></div>
            </div>
            {instMetrics.penaltyBreakdown.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong>Penalty Breakdown:</strong>
                {instMetrics.penaltyBreakdown.map(p => (
                  <div key={p.ruleId} className="rule-result" style={{ marginTop: '8px' }}>
                    <div className="rule-result-icon amber"><Calculator size={14} /></div>
                    <div className="rule-result-copy">
                      <strong>{p.name}</strong>
                      <span>{p.basis}</span>
                      <small className="muted-note">{p.clauseRefNote}</small>
                    </div>
                    <Badge tone="amber">{money(p.amount)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* What-If Simulator */}
      <section className="panel">
        <div className="panel-head">
          <div><h2>What-If Simulator</h2><p>Model intake changes and early closures against the active APH edition parameters.</p></div>
          <Calculator size={20} />
        </div>
        <div className="form-grid">
          <label className="field">
            Intake Change (%)
            <input type="number" step="1" value={whatIfIntake} onChange={e => setWhatIfIntake(Number(e.target.value))}
              placeholder="e.g. +20 or -10" />
          </label>
          <label className="field">
            Early Closure Count
            <input type="number" min="0" value={whatIfClosureCount} onChange={e => setWhatIfClosureCount(Number(e.target.value))} />
          </label>
          <label className="field">
            Early Closure Amount (INR)
            <div className="input-prefix"><span>₹</span>
              <input type="number" min="0" value={whatIfClosureAmount} onChange={e => setWhatIfClosureAmount(Number(e.target.value))} />
            </div>
          </label>
        </div>
        {whatIf && (
          <div className="review-summary" style={{ marginTop: '16px' }}>
            <div><span>Simulated Required</span><strong>{money(whatIf.simulatedRequired)}</strong></div>
            <div><span>Simulated Held</span><strong>{money(whatIf.simulatedHeld)}</strong></div>
            <div><span>Simulated Gap</span><strong style={{ color: whatIf.simulatedGap > 0 ? 'var(--red)' : 'var(--green)' }}>{money(whatIf.simulatedGap)}</strong></div>
            <div><span>Gap Change vs Current</span><strong style={{ color: whatIf.deltaGap > 0 ? 'var(--red)' : whatIf.deltaGap < 0 ? 'var(--green)' : undefined }}>{whatIf.deltaGap > 0 ? '+' : ''}{money(whatIf.deltaGap)}</strong></div>
            <div><span>Simulated Penalty</span><strong style={{ color: whatIf.simulatedPenalty > 0 ? 'var(--red)' : 'var(--green)' }}>{money(whatIf.simulatedPenalty)}</strong></div>
          </div>
        )}
        <div className="info-callout" style={{ marginTop: '12px' }}>
          <Info size={17} />
          <p>All values computed against active APH edition parameters. Premature encashment penalty is computed per the configured rate ({activeEdition.penalties.find(p => p.type === 'prematureEncashment')?.percent || 0}%).</p>
        </div>
      </section>
    </div>
  );
}
