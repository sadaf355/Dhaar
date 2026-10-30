import type { Deposit } from '../data/seed';
import { isAssured } from './assurance';
import { demoRulesConfig } from './rulesConfig';
import { validateAmountInWords } from './numberToWords';
import { isImageEditorProducer } from './pdfForensics';
import { getSimulatedExtraction, MOCK_TRUST_MASTER, MOCK_IFSC_MASTER, BANK_PREFIX_MAP } from './simulatedExtraction';
import { similarity } from './calculations';

export type RuleStatus = 'pass' | 'review' | 'unavailable';
export type RuleResult = { id: string; name: string; severity: 'Critical' | 'Warning' | 'Info'; status: RuleStatus; detail: string; nextAction: string };
type Context = { deposits: Deposit[]; simulatedDate: string };

const unavailable = (id: string, name: string, severity: RuleResult['severity'], why: string): RuleResult => ({
  id,
  name,
  severity,
  status: 'unavailable',
  detail: why,
  nextAction: 'Connect the relevant trusted document, APH parameter, bank, or case-management data source before evaluating this rule.'
});

const result = (id: string, name: string, severity: RuleResult['severity'], ok: boolean, detail: string, action: string): RuleResult => ({
  id,
  name,
  severity,
  status: ok ? 'pass' : 'review',
  detail,
  nextAction: action
});

/**
 * The TRD's 26-rule catalogue.
 * Evaluates rules supported by the intake and verification engine.
 */
export function evaluateRules(d: Deposit, { deposits, simulatedDate }: Context): RuleResult[] {
  const duplicate = deposits.some(x => x.id !== d.id && x.bank.trim().toLowerCase() === d.bank.trim().toLowerCase() && x.fdrNo.trim().toLowerCase() === d.fdrNo.trim().toLowerCase());
  const dateValid = !!d.issueDate && !!d.maturityDate && d.maturityDate > d.issueDate && d.issueDate <= simulatedDate;
  const tenureDays = d.issueDate && d.maturityDate ? Math.floor((Date.parse(`${d.maturityDate}T00:00:00Z`) - Date.parse(`${d.issueDate}T00:00:00Z`)) / 86400000) : 0;
  const tenureValid = Number.isFinite(tenureDays) && tenureDays >= demoRulesConfig.requiredTenureDays;
  const amountValid = Number.isFinite(d.amount) && d.amount >= demoRulesConfig.requiredAmount;
  const knownBanks = ['hdfc bank', 'state bank of india', 'icici bank', 'bank of baroda', 'union bank of india', 'axis bank'];
  const attestation = d.bankRequestStatus === 'Attested';
  const mismatch = d.bankRequestStatus === 'Mismatch';

  // R03: Real document hash deduplication
  const hashReused = d.fileHash ? deposits.some(x => x.id !== d.id && x.fileHash && x.fileHash === d.fileHash) : false;

  // Extraction fixture for R04, R08, R09, R10, R16
  const extraction = getSimulatedExtraction(d);

  // R04: Amount in words vs figures
  const wordsValidation = validateAmountInWords(d.amount, extraction.amountInWords.value);

  // R08: AICTE joint holder lien evidence
  const hasAicteHolder = extraction.holders.value.some(h => /aicte|member\s*secretary/i.test(h));
  const lienEvidenceValid = d.lien && (hasAicteHolder || extraction.lienToAicte.value);

  // R09: Fuzzy match against Mock Trust Master
  const primaryHolderName = d.holder || d.institution;
  const namesToMatch = [
    primaryHolderName,
    ...(extraction.holders.value || []).filter(h => !/aicte|member\s*secretary/i.test(h))
  ].filter(Boolean);

  let bestTrust: { trust: (typeof MOCK_TRUST_MASTER)[0]; score: number } | null = null;
  for (const name of namesToMatch) {
    for (const t of MOCK_TRUST_MASTER) {
      const score = similarity(name, t.legalName);
      if (!bestTrust || score > bestTrust.score) {
        bestTrust = { trust: t, score };
      }
    }
  }
  const trustMatchOk = bestTrust !== null && bestTrust.score >= 0.70;

  // R10: IFSC, bank, and branch validation
  const extIfsc = extraction.ifsc.value.trim().toUpperCase();
  const ifscFormatOk = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(extIfsc);
  const expectedPrefix = BANK_PREFIX_MAP[d.bank.trim().toLowerCase()];
  const prefixMatch = !expectedPrefix || extIfsc.startsWith(expectedPrefix);
  const ifscMasterHit = MOCK_IFSC_MASTER[extIfsc];
  const r10Ok = ifscFormatOk && prefixMatch;

  // R13: Document metadata anomaly (image editor or post-bank modification date)
  let r13Result: RuleResult;
  if (d.pdfMetadata) {
    const editorProducer = isImageEditorProducer(d.pdfMetadata.producer, d.pdfMetadata.creator);
    const modAnomaly = !!d.pdfMetadata.modificationDate && d.pdfMetadata.modificationDate.split('T')[0] > d.issueDate;
    const ok = !editorProducer && !modAnomaly;
    r13Result = result(
      'R13',
      'Document metadata anomaly',
      'Warning',
      ok,
      ok
        ? `PDF metadata verified: producer "${d.pdfMetadata.producer || 'PDF Generator'}" and modification dates are consistent.`
        : editorProducer
        ? `Suspicious image editor detected in PDF producer/creator: "${d.pdfMetadata.producer || d.pdfMetadata.creator}".`
        : `PDF modification date (${d.pdfMetadata.modificationDate?.split('T')[0]}) is after stated bank date (${d.issueDate}).`,
      'Review document authenticity with the issuing bank or require re-submission.'
    );
  } else {
    r13Result = unavailable('R13', 'Document metadata anomaly', 'Warning', 'No PDF metadata recorded for this instrument.');
  }

  // R16: Declared vs extracted comparison
  const fieldMismatches: string[] = [];
  if (extraction.amount.value !== d.amount) {
    fieldMismatches.push(`Amount (declared ₹${d.amount.toLocaleString('en-IN')} vs extracted ₹${extraction.amount.value.toLocaleString('en-IN')})`);
  }
  if (extraction.instrumentNumber.value.trim().toLowerCase() !== d.fdrNo.trim().toLowerCase()) {
    fieldMismatches.push(`FDR No (declared "${d.fdrNo}" vs extracted "${extraction.instrumentNumber.value}")`);
  }
  if (extraction.bank.value.trim().toLowerCase() !== d.bank.trim().toLowerCase()) {
    fieldMismatches.push(`Bank (declared "${d.bank}" vs extracted "${extraction.bank.value}")`);
  }
  const r16Ok = fieldMismatches.length === 0;

  const results: RuleResult[] = [
    result('R01', 'Instrument number format invalid for bank', 'Warning', !!d.fdrNo.trim() && /^[A-Za-z0-9/-]+$/.test(d.fdrNo), 'Basic reference syntax ' + (d.fdrNo.trim() && /^[A-Za-z0-9/-]+$/.test(d.fdrNo) ? 'looks valid; bank-specific template is not checked.' : 'is missing or contains unsupported characters.'), 'Confirm the number against the issuing bank’s official instrument format.'),
    result('R02', 'Instrument number already used by another institution', 'Critical', !duplicate, duplicate ? 'Same bank + instrument reference exists on another registry record.' : 'No duplicate bank + instrument reference found in the current demo registry.', 'Compare the original instrument and institution ownership; do not count a duplicate as additional cover.'),
    d.fileHash
      ? result('R03', 'Document hash reused', 'Critical', !hashReused, hashReused ? `Document SHA-256 hash (${d.fileHash.slice(0, 12)}...) is reused across another registry deposit record.` : `Document SHA-256 hash (${d.fileHash.slice(0, 12)}...) is unique in the registry.`, 'Flag for administrative review; reject duplicate document attachments.')
      : unavailable('R03', 'Document hash reused', 'Critical', 'File hashes and cross-institution document deduplication are not recorded on this record.'),
    result('R04', 'Amount in words differs from figures', 'Critical', wordsValidation.match, wordsValidation.detail, 'Resolve discrepancy between amount figures and words using source FDR.'),
    result('R05', 'Date logic invalid', 'Critical', dateValid, dateValid ? 'Issue date is not in the future and maturity follows issue date.' : 'Issue date is missing/future-dated or maturity is not after issue date.', 'Correct the dates using the source instrument and rerun validation.'),
    result('R06', 'Tenure shorter than configured minimum', 'Critical', tenureValid, tenureValid ? `Recorded tenure is ${tenureDays} days; demo minimum is ${demoRulesConfig.requiredTenureDays} days.` : `Recorded tenure is ${tenureDays} days; demo minimum is ${demoRulesConfig.requiredTenureDays} days. This blocks pre-flight approval.`, `Ensure the instrument meets the configured ${demoRulesConfig.requiredTenureDays}-day demo minimum. ${demoRulesConfig.label}.`),
    result('R07', 'Amount below configured required deposit', 'Critical', amountValid, amountValid ? `Declared amount ${d.amount.toLocaleString('en-IN')} meets the demo minimum of ${demoRulesConfig.requiredAmount.toLocaleString('en-IN')}.` : `Declared amount ${d.amount.toLocaleString('en-IN')} is below the demo minimum of ${demoRulesConfig.requiredAmount.toLocaleString('en-IN')}. This blocks pre-flight approval.`, `Confirm the required amount for the relevant institution/programme. ${demoRulesConfig.label}.`),
    result('R08', 'Joint holder / AICTE lien evidence missing', 'Critical', lienEvidenceValid, lienEvidenceValid ? 'Lien declared and AICTE joint holder confirmed in document extraction.' : 'Lien evidence or named beneficiary (Member Secretary, AICTE) is missing from document extraction.', 'Obtain and review the required joint-lien endorsement.'),
    result('R09', 'Holder / trust name mismatch', 'Warning', trustMatchOk, trustMatchOk ? `Holder matched approved trust master: "${bestTrust?.trust.legalName || 'none'}" (${Math.round((bestTrust?.score || 0) * 100)}% token match).` : `Holder "${primaryHolderName}" does not match approved trust master directory (best match "${bestTrust?.trust.legalName || 'none'}", ${Math.round((bestTrust?.score || 0) * 100)}%).`, 'Confirm institution legal society registration with state registrar.'),
    result('R10', 'IFSC, bank and branch mismatch', 'Warning', r10Ok, r10Ok ? `IFSC ${extIfsc} format valid for ${d.bank}${ifscMasterHit ? ` (${ifscMasterHit.branchName})` : ''}.` : !ifscFormatOk ? `IFSC "${extIfsc}" does not match standard 11-character format.` : `IFSC prefix "${extIfsc.slice(0, 4)}" does not match bank "${d.bank}".`, 'Verify branch IFSC code with the issuing bank directory.'),
    result('R11', 'Issuing bank not in accepted list', 'Warning', knownBanks.includes(d.bank.trim().toLowerCase()), knownBanks.includes(d.bank.trim().toLowerCase()) ? 'Bank appears in the prototype’s illustrative accepted-bank list.' : 'Bank is not in the prototype’s illustrative accepted-bank list. This list is not authoritative.', 'Confirm the current accepted-bank policy with the responsible authority.'),
    unavailable('R12', 'Signature invalid or PDF modified after signing', 'Critical', 'Digital-signature verification and post-signing PDF forensics are not implemented.'),
    r13Result,
    unavailable('R14', 'Visual tamper signal on scan', 'Warning', 'Image tamper analysis is not implemented.'),
    unavailable('R15', 'Layout differs from known bank template', 'Info', 'Bank-template classification is not implemented.'),
    result('R16', 'Declared vs extracted mismatch', 'Warning', r16Ok, r16Ok ? 'All declared fields (amount, FDR reference, issuing bank) match extracted document data.' : `Discrepancy detected: ${fieldMismatches.join('; ')}.`, 'Resolve discrepancy between declared data and document extraction before verification approval.'),
    mismatch ? result('R17', 'Bank attestation differs from declared data', 'Critical', false, 'A simulated bank response mismatch is recorded.', 'Keep the existing grade and resolve the field-level discrepancy before re-attestation.') : attestation ? result('R17', 'Bank attestation differs from declared data', 'Critical', true, 'A simulated matching response is recorded.', 'In production, preserve the signed attestation and field-level comparison.') : unavailable('R17', 'Bank attestation differs from declared data', 'Critical', 'No bank response is available to compare.'),
    d.lien ? unavailable('R18', 'Lien missing or other encumbrance present', 'Critical', 'Lien is declared, but other encumbrances are not modeled in the prototype.') : result('R18', 'Lien missing or other encumbrance present', 'Critical', false, 'Lien is not declared.', 'Obtain and review the required lien/encumbrance evidence before upgrading assurance.'),
    d.coverageGapDays !== undefined ? result('R19', 'Coverage gap between predecessor and successor', 'Warning', d.coverageGapDays === 0, d.coverageGapDays === 0 ? 'Recorded lineage has no coverage gap.' : `Recorded coverage gap: ${d.coverageGapDays} day(s).`, 'Review the successor instrument and escalate any positive coverage gap.') : unavailable('R19', 'Coverage gap between predecessor and successor', 'Warning', 'No successor/predecessor gap has been recorded for this instrument.'),
    d.predecessorId ? result('R20', 'Replacement without predecessor reference', 'Warning', true, `Predecessor reference ${d.predecessorId} is recorded.`, 'Keep predecessor and successor references intact in the instrument lineage.') : unavailable('R20', 'Replacement without predecessor reference', 'Warning', 'This record is not modeled as a replacement instrument.'),
    unavailable('R21', 'Re-attestation shows closure/change', 'Critical', 'Re-attestation history and premature-closure signals are not implemented.'),
    d.lastAttestedDate ? result('R22', 'Re-attestation overdue', 'Warning', isAssured(d.lastAttestedDate, simulatedDate), isAssured(d.lastAttestedDate, simulatedDate) ? `Attestation is within the illustrative 180-day freshness window (${d.lastAttestedDate}).` : `Attestation is outside the illustrative 180-day freshness window (${d.lastAttestedDate}).`, 'Request a fresh bank attestation when the configured assurance window expires.') : unavailable('R22', 'Re-attestation overdue', 'Warning', 'No attestation date is recorded.'),
    result('R23', 'Maturity passed without action', 'Critical', d.maturityDate > simulatedDate, d.maturityDate < simulatedDate ? `Maturity passed on ${d.maturityDate}; action should be reviewed.` : d.maturityDate === simulatedDate ? 'Matures on the selected demo date.' : 'Maturity date is in the future.', 'Record renewal, release, or another authorized disposition; do not assume the instrument remains valid.'),
    unavailable('R24', 'Sufficiency drift after intake/programme change', 'Warning', 'Programme intake history and versioned required-cover parameters are not configured.'),
    unavailable('R25', 'Release requested while complaint, legal hold or dispute lien is active', 'Critical', 'Complaint/legal-hold data is not linked to the instrument rule context. Release page has a separate demo hold control.'),
    unavailable('R26', 'Refund account name does not match trust', 'Critical', 'Refund account ownership and approved trust-name verification are not implemented.')
  ];

  return results;
}
