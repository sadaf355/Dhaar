import { useState } from 'react';
import { Banknote, CheckCircle2, CircleAlert, Download, FileText, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDhaarStore, type ReleaseCase } from '../context/useDhaarStore';
import { money } from '../lib/format';
import { assuranceState, isReleaseEligible } from '../lib/calculations';
import { canMakerCheck, canCheckerApprove, canAuthorityApprove, isReleaseBlocked, canToggleCaseHold, canVerifyRefund } from '../lib/workflow';
import { demoRulesConfig } from '../lib/rulesConfig';
import type { Deposit } from '../data/seed';

type ReleaseStage = 'Requested'|'Maker checked'|'Checker approved'|'Authority approved'|'Bank acknowledged'|'Reconciled'|'On hold';

export default function Release(){
 const { t } = useTranslation();
 const deposits=useDhaarStore(s=>s.deposits), updateDeposit=useDhaarStore(s=>s.updateDeposit), events=useDhaarStore(s=>s.addEvent), simulatedDate=useDhaarStore(s=>s.simulatedDate), cases=useDhaarStore(s=>s.releaseCases), upsertReleaseCase=useDhaarStore(s=>s.upsertReleaseCase), role=useDhaarStore(s=>s.role), currentUserId=useDhaarStore(s=>s.currentUserId), holds=useDhaarStore(s=>s.holds), upsertHold=useDhaarStore(s=>s.upsertHold);
 const [selected,setSelected]=useState('REL-1007');
 const active=cases.find(c=>c.id===selected)||cases[0];
 const dep=deposits.find(d=>d.id===active?.depositId);

 // B3: derive expectedRefundName from linked institution (read-only)
 const expectedRefundName = dep?.institution || '';
 const [refund,setRefund]=useState(active?.refundAccount || '•••• 4821');
 const [refundVerified,setRefundVerified]=useState(active?.refundVerified ?? false);
 const [hold,setHold]=useState(active?.hold ?? false);
 const [refundName,setRefundName]=useState(active?.refundName || '');
 const [holdReason,setHoldReason]=useState(active?.holdReason || '');
 const [createError,setCreateError]=useState('');
 const [newHoldReason,setNewHoldReason]=useState(''),[holdScope,setHoldScope]=useState<'Instrument'|'Institution'>('Instrument'),[holdTarget,setHoldTarget]=useState('');

 const selectCase = (c: ReleaseCase) => {
  setSelected(c.id);
  setRefund(c.refundAccount);
  setRefundVerified(c.refundVerified);
  setHold(c.hold);
  setRefundName(c.refundName || '');
  setHoldReason(c.holdReason || '');
 };

 const activeHoldsFor=(d?:Deposit)=>d?holds.filter(h=>h.status==='Active'&&((h.scope==='Instrument'&&h.targetId===d.id)||(h.scope==='Institution'&&h.targetId===d.institutionCode))):[];
 const eligible=(d?:Deposit)=>!!d && isReleaseEligible(d,simulatedDate,demoRulesConfig.assuranceWindowDays);

 const update=(patch:Partial<ReleaseCase>,label:string)=>{
  if(!active)return;
  // B2: gate the case-hold toggle in update()
  if(patch.hold !== undefined && !canToggleCaseHold(role, active.hold, patch.hold)) return;
  // B2: gate refund-verified checkbox in update()
  if(patch.refundVerified !== undefined && !canVerifyRefund(role)) return;

  // Segregation of duties: same user cannot perform more than one of maker, checker, authority
  if(patch.stage==='Maker checked'){
   if(!canMakerCheck(role, active.checker) || (active.checkerUserId && active.checkerUserId === currentUserId) || (active.approverUserId && active.approverUserId === currentUserId)) return;
   patch.makerUserId = currentUserId;
  }
  if(patch.stage==='Checker approved'){
   if(!canCheckerApprove(role, active.maker) || (active.makerUserId && active.makerUserId === currentUserId) || (active.approverUserId && active.approverUserId === currentUserId)) return;
   patch.checkerUserId = currentUserId;
  }
  if(patch.stage==='Authority approved'){
   if(!canAuthorityApprove(role, active.maker, active.checker) || (active.makerUserId && active.makerUserId === currentUserId) || (active.checkerUserId && active.checkerUserId === currentUserId)) return;
   patch.approverUserId = currentUserId;
  }
  if(patch.stage==='Reconciled'){
   patch.reconciledByUserId = currentUserId;
  }

  const updated={
   ...active,
   ...patch,
   expectedRefundName,
   refundName: patch.refundName !== undefined ? patch.refundName : refundName,
   updated:simulatedDate,
   userId: currentUserId
  };
  upsertReleaseCase(updated);

  // B6: On reconcile set status to 'Released'
  if(patch.stage==='Reconciled'){
   updateDeposit(active.depositId,{status:'Released',finding:undefined,releaseClosed:true});
  }
  events(label,`${active.id} · ${active.depositId}`,'success');
 };

 const create=()=>{
  const candidate=deposits.find(d=>eligible(d)&&activeHoldsFor(d).length===0&&!cases.some(c=>c.depositId===d.id&&c.stage!=='Reconciled'));
  if(!candidate){setCreateError('No eligible demo instrument is available. A release needs E2/E3 evidence, a declared lien, completed term, fresh attestation, and no open finding.');return}
  setCreateError('');
  const c:ReleaseCase={
   id:`REL-${Date.now()}`,
   depositId:candidate.id,
   stage:'Requested',
   hold:false,
   refundAccount:'Not verified',
   refundVerified:false,
   expectedRefundName: candidate.institution,
   refundName: candidate.institution,
   refundNameMatch: true,
   noc:false,
   updated:simulatedDate,
   userId: currentUserId
  };
  upsertReleaseCase(c);
  selectCase(c);
  events('Release request created',`${c.id} · ${candidate.id}`,'info');
 };

 const createHold=()=>{
  if(!['Regional Officer','Approving Authority'].includes(role))return;
  const target=holdTarget||(holdScope==='Instrument'?(dep?.id||''):(dep?.institutionCode||''));
  if(!target||!newHoldReason.trim())return;
  const h={id:`HOLD-${Date.now()}`,scope:holdScope,targetId:target,reason:newHoldReason.trim(),status:'Active' as const,createdAt:simulatedDate,createdBy:role,createdByUserId:currentUserId};
  upsertHold(h);
  events('Hold created',`${h.id} · ${h.scope} ${h.targetId} · ${h.reason}`,'warning');
  setNewHoldReason('');
 };

 const releaseHold=(hId:string)=>{
  if(role!=='Approving Authority')return;
  const h=holds.find(x=>x.id===hId);
  if(!h)return;
  upsertHold({...h,status:'Released',releasedAt:simulatedDate,releasedBy:role,releasedByUserId:currentUserId});
  events('Hold released',`${h.id} · ${h.targetId} · ${role}`,'success');
 };

 const exportReport=()=>{
  const rows=[['Release ID','Deposit ID','Stage','Hold','Refund account','Refund verified','NOC preview','Updated'],...cases.map(c=>[c.id,c.depositId,c.stage,String(c.hold),c.refundAccount,String(c.refundVerified),String(c.noc),c.updated])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download='dhaar-release-tracker.csv';a.click();URL.revokeObjectURL(a.href);
 };

 const nameMatches = refundName.trim().toLowerCase() === expectedRefundName.trim().toLowerCase();
 const matchingHolds = activeHoldsFor(dep);
 const blocked = !dep || isReleaseBlocked({eligible:dep?eligible(dep):false,caseHold:!!active?.hold||hold,activeHoldCount:matchingHolds.length,refundNameMatches:nameMatches,depositHoldCount:dep?.holds?.length||0});

 const canMaker = !blocked && active?.stage==='Requested' && !!refund.trim() && refundVerified && role==='Regional Officer' && (!active.checkerUserId || active.checkerUserId !== currentUserId) && (!active.approverUserId || active.approverUserId !== currentUserId);
 const canChecker = !blocked && active?.stage==='Maker checked' && role==='Checker' && role!==active.maker && (!active.makerUserId || active.makerUserId !== currentUserId) && (!active.approverUserId || active.approverUserId !== currentUserId);
 const canAuthority = !blocked && active?.stage==='Checker approved' && role==='Approving Authority' && role!==active.maker && role!==active.checker && (!active.makerUserId || active.makerUserId !== currentUserId) && (!active.checkerUserId || active.checkerUserId !== currentUserId);
 const canAcknowledge = !blocked && active?.stage==='Authority approved' && role==='Bank Verifier';
 const canReconcile = !blocked && active?.stage==='Bank acknowledged' && !!refund.trim() && refundVerified && role==='Approving Authority' && (!active.makerUserId || active.makerUserId !== currentUserId) && (!active.checkerUserId || active.checkerUserId !== currentUserId);

 return <div className="page-stack"><div className="page-heading-row"><div><div className="eyebrow">CLOSED-LOOP CONTROL</div><h1>{t('release.title')}</h1><p className="page-subtitle">{t('release.subtitle')}</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={exportReport}><Download size={15}/> Export tracker</button><button className="btn btn-primary" onClick={create}><RefreshCw size={15}/> New release request</button></div></div>
 <div className="notice-banner amber-banner"><div className="notice-symbol"><LockKeyhole size={18}/></div><div><strong>Release is intentionally gated</strong><p>Active instrument- or institution-level holds from the shared hold register block release. Production must enforce these controls server-side; this page simulates the workflow.</p></div></div>
 {createError&&<div className="notice-banner amber-banner" role="alert"><div className="notice-symbol"><CircleAlert size={18}/></div><div><strong>Release request not created</strong><p>{createError}</p></div></div>}<div className="stats-grid"><Stat label="Open release cases" value={cases.filter(c=>c.stage!=='Reconciled').length}/><Stat label="Awaiting approval" value={cases.filter(c=>['Requested','Maker checked','Checker approved'].includes(c.stage)).length}/><Stat label="On hold" value={cases.filter(c=>c.hold||c.stage==='On hold').length}/><Stat label="Reconciled" value={cases.filter(c=>c.stage==='Reconciled').length}/></div>
 <section className="panel"><div className="panel-head"><div><h2>Institution & instrument holds</h2><p>Active holds are shared records and block any linked release.</p></div><span className="badge badge-amber">{holds.filter(h=>h.status==='Active').length} active</span></div><div className="field-grid"><div className="field"><label htmlFor="hold-scope">Hold scope</label><select id="hold-scope" value={holdScope} onChange={e=>{setHoldScope(e.target.value as 'Instrument'|'Institution');setHoldTarget('')}}><option>Instrument</option><option>Institution</option></select></div><div className="field"><label htmlFor="hold-target">Target</label><select id="hold-target" value={holdTarget||(dep?(holdScope==='Instrument'?dep.id:dep.institutionCode):'')} onChange={e=>setHoldTarget(e.target.value)}>{holdScope==='Instrument'?deposits.map(x=><option key={x.id} value={x.id}>{x.id}</option>):Array.from(new Map(deposits.map(x=>[x.institutionCode,x.institution])).entries()).map(([code,name])=><option key={code} value={code}>{name} ({code})</option>)}</select></div><div className="field"><label htmlFor="hold-new-reason">Reason</label><input id="hold-new-reason" value={newHoldReason} onChange={e=>setNewHoldReason(e.target.value)} placeholder="Complaint, legal hold, dispute…"/></div><div className="field"><label>&nbsp;</label><button className="btn btn-secondary" disabled={!newHoldReason.trim()||!dep||!['Regional Officer','Approving Authority'].includes(role)} onClick={createHold}>Add hold</button></div></div><div className="table-wrap"><table><thead><tr><th>Hold ID</th><th>Scope / target</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>{holds.map(h=><tr key={h.id}><td>{h.id}</td><td>{h.scope} · {h.targetId}</td><td>{h.reason}</td><td><span className={`badge ${h.status==='Active'?'badge-amber':'badge-green'}`}>{h.status}</span></td><td>{h.status==='Active'?<button className="btn btn-ghost btn-sm" disabled={role!=='Approving Authority'} onClick={()=>releaseHold(h.id)}>Release hold</button>:<span className="muted-note">{h.releasedBy||'—'}</span>}</td></tr>)}</tbody></table></div><p className="muted-note">Only an Approving Authority can release a hold. Instrument holds match deposit ID; institution holds match institution code.</p></section>
 <div className="release-layout"><section className="panel"><div className="panel-head"><div><h2>Release cases</h2><p>Select a case to review its controls</p></div></div><div className="release-case-list">{cases.map(c=><button key={c.id} className={`release-case ${selected===c.id?'selected':''}`} onClick={()=>selectCase(c)}><span className="release-case-icon"><FileText size={17}/></span><span className="release-case-copy"><strong>{c.id}</strong><small>{c.depositId} · {c.updated}</small></span><span className={`badge ${c.stage==='Reconciled'?'badge-green':c.stage==='On hold'?'badge-red':'badge-amber'}`}>{c.stage}</span></button>)}</div></section>
 <section className="panel release-detail"><div className="panel-head"><div><div className="eyebrow">CASE REVIEW</div><h2>{active?.id||'No release selected'}</h2><p>{dep?.institution||'Linked instrument not found'}</p></div><span className={`badge ${blocked?'badge-red':'badge-green'}`}>{blocked?'Blocked / review':'Eligible for demo flow'}</span></div>
 {dep&&active?<><div className="release-summary"><div><span>Linked instrument</span><strong>{dep.id}</strong></div><div><span>Secured amount</span><strong>{money(dep.amount)}</strong></div><div><span>Evidence grade</span><strong>{dep.grade}</strong></div><div><span>Assured freshness</span><strong>{assuranceState(dep,simulatedDate,demoRulesConfig.assuranceWindowDays)==='Assured'?'Current':'Expired / unknown'}</strong></div></div>
 <div className="release-gates"><Gate done={eligible(dep)} title="Evidence, term & Assured status" detail={eligible(dep)?'E2/E3, lien present, term complete, no open finding, attestation within 180 days':'Requires E2/E3, lien, completed term, fresh attestation and no open finding'}/><Gate done={!active.hold&&!hold&&!dep.holds?.length&&!matchingHolds.length} title="Hold / dispute check" detail={active.hold||hold||dep.holds?.length||matchingHolds.length?'An active case, instrument or institution hold blocks progression':'No demo hold is active'}/><Gate done={active.refundVerified&&refundVerified&&nameMatches} title="Refund account verification" detail={!nameMatches?'Refund account name does not match institution':active.refundVerified&&refundVerified?'Masked refund reference marked verified in demo':'Verify the masked refund account before approval'}/><Gate done={['Checker approved','Authority approved','Bank acknowledged','Reconciled'].includes(active.stage)} title="Maker / checker review" detail="Regional Officer is the only maker; checker and authority must be different actors."/><Gate done={['Authority approved','Bank acknowledged','Reconciled'].includes(active.stage)} title="Competent authority approval" detail="Authority approval follows maker and checker review."/><Gate done={['Bank acknowledged','Reconciled'].includes(active.stage)} title="Bank acknowledgement" detail="Simulated acknowledgement must precede reconciliation."/><Gate done={active.stage==='Reconciled'} title="Refund reconciliation" detail="Close only after refund status is reconciled."/></div>
 <div className="field"><label>Refund account reference</label><input value={refund} onChange={e=>{setRefund(e.target.value);update({refundAccount:e.target.value},'Refund account reference updated')}} placeholder="Enter masked demo account reference"/><small>Use a masked placeholder only. Do not enter real bank details.</small></div>
 <div className="field-grid"><div className="field"><label>Refund account name</label><input value={refundName} onChange={e=>{setRefundName(e.target.value);update({refundName:e.target.value},'Refund account name updated')}}/></div><div className="field"><label>Expected institution / trust name (read-only)</label><input value={expectedRefundName} readOnly disabled className="read-only-input"/></div></div>{!nameMatches&&<p className="inline-warning">Refund name mismatch blocks release progression.</p>}
 <label className="hold-toggle"><input type="checkbox" checked={refundVerified} disabled={!canVerifyRefund(role)} onChange={e=>{setRefundVerified(e.target.checked);update({refundVerified:e.target.checked,refundAccount:refund},e.target.checked?'Refund account marked verified in demo':'Refund account verification removed')}}/> Confirm masked refund reference is verified (demo, Accounts Officer only)</label>
 {!canVerifyRefund(role)&&<p className="muted-note" style={{marginTop:-4,marginBottom:12}}>Refund verification is restricted to Accounts Officer role.</p>}
 <div className="field"><label>Hold reason</label><input value={holdReason} onChange={e=>setHoldReason(e.target.value)} placeholder="e.g. legal hold, complaint, dispute"/></div>
 <label className="hold-toggle"><input type="checkbox" checked={hold} disabled={!canToggleCaseHold(role, active.hold, !hold)} onChange={e=>{const newHold=e.target.checked;setHold(newHold);update({hold:newHold,holdReason:newHold?(holdReason||'Demo hold'):undefined,stage:newHold?'On hold':active.stage==='On hold'?'Requested':active.stage},newHold?'Release placed on hold':'Demo hold removed')}}/> Place this release on hold (RO or AA to hold; only AA to clear)</label>
 {!canToggleCaseHold(role, active.hold, !hold)&&<p className="muted-note" style={{marginTop:-4,marginBottom:12}}>Only Regional Officer or Approving Authority can set hold; only Approving Authority can clear hold.</p>}
 <div className="release-actions"><button className="btn btn-secondary" disabled={!canMaker} onClick={()=>update({stage:'Maker checked',refundAccount:refund,refundVerified,refundName,expectedRefundName,refundNameMatch:nameMatches,maker:role},'Maker review completed')}>Maker check</button><button className="btn btn-secondary" disabled={!canChecker} onClick={()=>update({stage:'Checker approved',checker:role},'Checker approved release')}>Checker approve</button><button className="btn btn-secondary" disabled={!canAuthority} onClick={()=>update({stage:'Authority approved',approver:role},'Competent authority approved release')}>Authority approve</button><button className="btn btn-secondary" disabled={!canAcknowledge} onClick={()=>update({stage:'Bank acknowledged',noc:true},'Bank acknowledgement simulated')}>Simulate bank acknowledgement</button><button className="btn btn-primary" disabled={!canReconcile} onClick={()=>update({stage:'Reconciled',refundAccount:refund,refundVerified,noc:true},'Refund reconciled; release case closed')}><CheckCircle2 size={15}/> Reconcile & close</button><button className="btn btn-ghost" disabled={!active.noc} onClick={()=>window.print()}><FileText size={15}/> Print NOC preview</button></div>
 {active.noc&&<div className="noc-preview"><div><ShieldCheck size={20}/><strong>DHAAR · No Objection / Release Preview</strong></div><p>Demo case {active.id} for instrument {dep.id}. This preview records a simulated bank acknowledgement. It is not an official NOC or authorization to release funds.</p><small>Institution: {dep.institution} · Amount: {money(dep.amount)} · Status: {active.stage}</small></div>}
 {role!=='Institution Admin'&&role!=='Regional Officer'&&active.stage==='Requested'&&<p className="muted-note">Maker action is restricted to Regional Officer. The checker and approver must be different actors.</p>}{blocked&&<p className="inline-warning"><CircleAlert size={14} style={{display:'inline',verticalAlign:'middle',marginRight:6}}/>Progression is blocked until the linked instrument is eligible and any hold is cleared. This is a demo gate, not a legal determination.</p>}
 </>:<p className="muted-note">Choose a release case from the list.</p>}</section></div></div>
}
function Stat({label,value}:{label:string;value:number}){return <div className="stat-card"><div className="stat-top">{label}<span className="stat-icon teal"><Banknote size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span>Current demo workspace</span></div></div>}
function Gate({done,title,detail}:{done:boolean;title:string;detail:string}){return <div className="release-gate"><span className={done?'gate-done':'gate-pending'}>{done?<CheckCircle2 size={17}/>:<CircleAlert size={17}/>}</span><div><strong>{title}</strong><p>{detail}</p></div><span className={`badge ${done?'badge-green':'badge-amber'}`}>{done?'Passed':'Pending'}</span></div>}
