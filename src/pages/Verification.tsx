import { useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, FileCheck2, Search, ShieldCheck, Ban } from 'lucide-react';
import { useDhaarStore } from '../context/useDhaarStore';
import { DEMO_USERS } from '../data/users';
import { canApproveWaiver } from '../lib/workflow';
import { money } from '../lib/format';
import Badge from '../components/Badge';

export default function Verification(){
 const allDeposits=useDhaarStore(s=>s.deposits);
 const currentUserId=useDhaarStore(s=>s.currentUserId);
 const currentUser=DEMO_USERS.find(u=>u.id===currentUserId);
 const deposits=useMemo(()=>{
  if(currentUser?.role==='Institution Admin'&&currentUser.institutionCode){
   return allDeposits.filter(d=>d.institutionCode===currentUser.institutionCode);
  }
  return allDeposits;
 },[allDeposits,currentUser]);

 const update=useDhaarStore(s=>s.updateDeposit);
 const addEvent=useDhaarStore(s=>s.addEvent);
 const simulatedDate=useDhaarStore(s=>s.simulatedDate);
 const allFindings=useDhaarStore(s=>s.findings);
 const findings=useMemo(()=>{
  if(currentUser?.role==='Institution Admin'&&currentUser.institutionCode){
   const allowedDepositIds=new Set(deposits.map(d=>d.id));
   return allFindings.filter(f=>allowedDepositIds.has(f.depositId));
  }
  return allFindings;
 },[allFindings,deposits,currentUser]);

 const addFinding=useDhaarStore(s=>s.addFinding);
 const updateFinding=useDhaarStore(s=>s.updateFinding);
 const role=useDhaarStore(s=>s.role);

 const [q,setQ]=useState(''),[waiveReason,setWaiveReason]=useState<Record<string,string>>({}),[waiveError,setWaiveError]=useState('');
 const queue=deposits.filter(d=>d.grade==='E0'||d.status==='Under review'||d.status==='Attention required').filter(d=>(d.id+' '+d.institution+' '+d.fdrNo).toLowerCase().includes(q.toLowerCase()));

 const officerReview=(id:string)=>{
  if(role!=='Regional Officer')return;
  const d=deposits.find(x=>x.id===id);
  if(!d||d.grade!=='E0')return;
  update(id,{grade:'E1',status:'Under review'});
  const f={id:`F-${id}-OFFICER`,depositId:id,ruleId:'OFFICER-REVIEW',title:'Officer review recorded',severity:'Medium' as const,status:'Resolved' as const,detail:'Officer reviewed the submitted document in this demo. This is not OCR or authenticity verification.',createdAt:simulatedDate,userId:currentUserId};
  addFinding(f);
  addEvent('Officer review completed',`${id} · E0 → E1`,'success');
 };

 const createFinding=(id:string)=>{
  const d=deposits.find(x=>x.id===id);
  if(!d)return;
  addFinding({id:`F-${id}-${Date.now()}`,depositId:id,ruleId:'MANUAL-REVIEW',title:d.finding||'Additional evidence required',severity:d.lien?'High':'Critical',status:'Open',detail:'Officer-created finding. Resolve with evidence or waive only with a documented reason.',createdAt:simulatedDate,userId:currentUserId});
  addEvent('Finding recorded',`${id} · ${d.finding||'Additional evidence required'}`,'warning');
 };

 const waive=(fid:string)=>{
  const finding=findings.find(f=>f.id===fid);
  if(!finding)return;
  setWaiveError('');
  if(finding.severity==='Critical'){
   if(finding.status==='Open'){
    if(role==='Approving Authority'){
     setWaiveError('Critical waiver requests must be raised by the Regional Officer or Checker; the Approving Authority provides the second approval.');
     return;
    }
    const reason=waiveReason[fid]?.trim();
    if(!reason){
     setWaiveError('Enter a reason before requesting a critical waiver.');
     return;
    }
    updateFinding(fid,{status:'Waiver pending approval',waiverReason:reason,waiverRequestedBy:role,waiverRequestedByUserId:currentUserId});
    addEvent('Critical waiver requested',`${fid} · requested by ${role} · ${reason}`,'warning');
    return;
   }
   if(finding.status==='Waiver pending approval'){
    if(role!=='Approving Authority'){
     setWaiveError('Only an Approving Authority can approve critical waivers.');
     return;
    }
    // Gating rule: waiver requester cannot approve
    if(!canApproveWaiver(currentUserId, finding.waiverRequestedByUserId, role)){
     setWaiveError('A waiver requester cannot approve their own waiver request. A different Approving Authority is required.');
     return;
    }
    updateFinding(fid,{status:'Waived',waiverApprovedBy:role,waiverApprovedByUserId:currentUserId});
    addEvent('Critical waiver approved',`${fid} · requested by ${finding.waiverRequestedBy} · approved by ${role}`,'warning');
   }
   return;
  }
  const reason=waiveReason[fid]?.trim();
  if(!reason){
   setWaiveError('Enter a reason before waiving a finding.');
   return;
  }
  updateFinding(fid,{status:'Waived',waiverReason:reason,waiverRequestedBy:role,waiverRequestedByUserId:currentUserId});
  addEvent('Finding waived with reason',`${fid} · ${role} · ${reason}`,'warning');
 };

 return <div className="page-stack"><div className="page-heading-row"><div><div className="eyebrow">REVIEW & ATTESTATION</div><h1>Verification queue</h1><p className="page-subtitle">Officer review moves E0 to E1. Only the bank desk can move E1 to E2 after a matching response.</p></div><Badge tone="amber">Simulation only</Badge></div>
 <div className="notice-banner amber-banner"><div className="notice-symbol"><CircleAlert size={19}/></div><div><strong>No E2 shortcut</strong><p>Only the Regional Officer can complete E0 → E1 review. Officer review never grants bank attestation; bank requests are available only after an instrument reaches E1.</p></div></div>
 <section className="panel"><div className="registry-toolbar"><div className="registry-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search verification queue"/></div><span className="result-count">{queue.length} cases</span></div><div className="verification-list">{queue.map(d=><article className="verification-card" key={d.id}><div className="verification-main"><div className="verification-file"><FileCheck2 size={20}/></div><div className="verification-title"><div><strong>{d.id}</strong> <Badge tone={d.grade==='E0'?'neutral':d.grade==='E1'?'blue':'green'}>{d.grade}</Badge> <Badge tone={d.status==='Attention required'?'amber':'blue'}>{d.status}</Badge></div><h3>{d.institution}</h3><p>{d.bank} · {d.fdrNo} · {money(d.amount)}</p></div></div><div className="verification-details"><div><span>Issue date</span><strong>{d.issueDate}</strong></div><div><span>Maturity date</span><strong>{d.maturityDate}</strong></div><div><span>Lien declaration</span><strong>{d.lien?'Declared':'Not confirmed'}</strong></div></div>{d.finding&&<div className="finding-box"><CircleAlert size={15}/><span><strong>Finding:</strong> {d.finding}</span></div>}<div className="verification-actions"><span className="muted-note">{d.grade==='E0'?'Officer review required before bank request':d.grade==='E1'?'Eligible to request bank confirmation':'Bank/system evidence already recorded'}</span><button className="btn btn-secondary btn-sm" onClick={()=>createFinding(d.id)}><CircleAlert size={14}/> Record finding</button><button className="btn btn-primary btn-sm" disabled={d.grade!=='E0'||role!=='Regional Officer'} onClick={()=>officerReview(d.id)}><ShieldCheck size={15}/> Officer review · E0 → E1</button></div></article>)}{queue.length===0&&<div className="empty-state"><CheckCircle2 size={26}/><strong>Queue is clear</strong></div>}</div></section>
 <section className="panel"><div className="panel-head"><div><h2>Findings register</h2><p>Critical findings require a reasoned waiver request and a different Approving Authority to approve it.</p></div><Badge>{findings.filter(f=>f.status==='Open').length} open</Badge></div>{waiveError&&<p className="inline-warning" role="alert">{waiveError}</p>}{findings.length===0?<div className="empty-state">No findings recorded yet. Use “Record finding” on a case.</div>:<div className="finding-register">{findings.map(f=><article className="verification-card" key={f.id}><div className="verification-main"><div className="verification-file"><Ban size={18}/></div><div className="verification-title"><div><strong>{f.title}</strong> <Badge tone={f.severity==='Critical'?'red':f.severity==='High'?'amber':'blue'}>{f.severity}</Badge> <Badge tone={f.status==='Open'||f.status==='Waiver pending approval'?'amber':f.status==='Waived'?'neutral':'green'}>{f.status}</Badge></div><p>{f.depositId} · {f.ruleId} · {f.detail}</p>{f.waiverReason&&<p><strong>Waiver reason:</strong> {f.waiverReason}</p>}{f.waiverRequestedBy&&<p><strong>Requested by:</strong> {f.waiverRequestedBy}{f.waiverApprovedBy?` · Approved by: ${f.waiverApprovedBy}`:''}</p>}</div></div>{(f.status==='Open'||f.status==='Waiver pending approval')&&<div className="verification-actions">{f.status==='Open'&&<><input value={waiveReason[f.id]||''} onChange={e=>setWaiveReason(s=>({...s,[f.id]:e.target.value}))} placeholder="Required reason to waive"/><button className="btn btn-secondary btn-sm" onClick={()=>waive(f.id)}>{f.severity==='Critical'?'Request waiver (2-person)':'Waive with reason'}</button><button className="btn btn-secondary btn-sm" onClick={()=>updateFinding(f.id,{status:'Resolved'})}>Mark resolved</button></>}{f.status==='Waiver pending approval'&&<><span className="muted-note">Second approval required; requester cannot approve their own waiver.</span><button className="btn btn-primary btn-sm" disabled={role!=='Approving Authority'||role===f.waiverRequestedBy} onClick={()=>waive(f.id)}>Approve critical waiver</button></>}</div>}</article>)}</div>}</section></div>
}
