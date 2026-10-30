import type { Deposit } from '../data/seed';
import { sha256 } from '../context/useDhaarStore';
import { holderNameMatchScore } from './calculations';

export interface StructuredAttestationPayload {
  fdrNo: string;
  bank: string;
  branchIfsc: string;
  holders: string[];
  amount: number;
  issueDate: string;
  maturityDate: string;
  rate: number;
  maturityValue: number;
  status: 'ACTIVE' | 'CLOSED' | 'MATURED';
  jointLienMarked: boolean;
  jointLienDate: string;
  otherEncumbrance: boolean;
  autoRenewal: boolean;
  prematureClosureRequiresAicteNoc: boolean;
  signerName: string;
  employeeId: string;
  designation: string;
  eSignConfirmation: boolean;
}

export interface BankVerificationRequest {
  depositId: string;
  fdrNo: string;
  bank: string;
  simulatedDate: string;
  userId?: string;
}

export interface BankVerificationResponse {
  token: string;
  tokenHash: string;
  demoOtp: string;
  expiresAt: string;
  portalUrl: string;
}

export interface BankVerificationResult {
  tokenHash: string;
  verified: boolean;
  attestation?: StructuredAttestationPayload;
  payloadHash?: string;
  mismatches?: string[];
  findings?: string[];
  processedAt?: string;
}

/**
 * Deterministic canonical payload string for stable SHA-256 eSign hashing.
 * Keys are ordered alphabetically and numbers/booleans formatted strictly.
 */
export function canonicalPayloadString(p: StructuredAttestationPayload): string {
  const sortedHolders = [...p.holders].map((h) => h.trim()).sort().join(';');
  return [
    `amount=${p.amount}`,
    `autoRenewal=${p.autoRenewal}`,
    `bank=${p.bank.trim()}`,
    `branchIfsc=${p.branchIfsc.trim().toUpperCase()}`,
    `designation=${p.designation.trim()}`,
    `eSignConfirmation=${p.eSignConfirmation}`,
    `employeeId=${p.employeeId.trim()}`,
    `fdrNo=${p.fdrNo.trim()}`,
    `holders=${sortedHolders}`,
    `issueDate=${p.issueDate}`,
    `jointLienDate=${p.jointLienDate}`,
    `jointLienMarked=${p.jointLienMarked}`,
    `maturityDate=${p.maturityDate}`,
    `maturityValue=${p.maturityValue}`,
    `otherEncumbrance=${p.otherEncumbrance}`,
    `prematureClosureRequiresAicteNoc=${p.prematureClosureRequiresAicteNoc}`,
    `rate=${p.rate}`,
    `signerName=${p.signerName.trim()}`,
    `status=${p.status}`
  ].join('&');
}

export function hashAttestationPayload(p: StructuredAttestationPayload): string {
  return sha256(canonicalPayloadString(p));
}

export interface BankVerificationAdapter {
  name: string;
  type: 'MockDesk' | 'MockApi';
  requestVerification(req: BankVerificationRequest): BankVerificationResponse;
  getResult(token: string): BankVerificationResult | null;
}

/**
 * MOCK: MockDeskAdapter generates a single-use token (stores only SHA-256 in production flow)
 * and issues a demo OTP for bank-side portal attestation.
 */
export class MockDeskAdapter implements BankVerificationAdapter {
  name = 'Mock Desk Adapter (DEMO / MOCK)';
  type: 'MockDesk' = 'MockDesk';
  private results = new Map<string, BankVerificationResult>();

  requestVerification(req: BankVerificationRequest): BankVerificationResponse {
    // Generate a secure-looking synthetic token
    const rawToken = `dhaar_tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const tokenHash = sha256(rawToken);
    // 6-digit demo OTP
    const demoOtp = '482910';
    const exp = new Date(`${req.simulatedDate}T12:00:00`);
    exp.setDate(exp.getDate() + 7);
    const expiresAt = exp.toISOString().slice(0, 10);
    const portalUrl = `/desk/${rawToken}`;

    return {
      token: rawToken,
      tokenHash,
      demoOtp,
      expiresAt,
      portalUrl
    };
  }

  saveResult(tokenHash: string, result: BankVerificationResult) {
    this.results.set(tokenHash, result);
  }

  getResult(token: string): BankVerificationResult | null {
    const tokenHash = token.length === 64 ? token : sha256(token);
    return this.results.get(tokenHash) || null;
  }
}

/**
 * MOCK: MockApiAdapter simulates direct API banking integration (e.g. SFMS/Host-to-Host)
 */
export class MockApiAdapter implements BankVerificationAdapter {
  name = 'Mock Direct API Banking Adapter (MOCK)';
  type: 'MockApi' = 'MockApi';
  private results = new Map<string, BankVerificationResult>();

  requestVerification(req: BankVerificationRequest): BankVerificationResponse {
    const rawToken = `api_mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const tokenHash = sha256(rawToken);
    const demoOtp = '112233';
    const exp = new Date(`${req.simulatedDate}T12:00:00`);
    exp.setDate(exp.getDate() + 7);
    const expiresAt = exp.toISOString().slice(0, 10);
    const portalUrl = `/desk/${rawToken}`;

    return {
      token: rawToken,
      tokenHash,
      demoOtp,
      expiresAt,
      portalUrl
    };
  }

  getResult(token: string): BankVerificationResult | null {
    const tokenHash = token.length === 64 ? token : sha256(token);
    return this.results.get(tokenHash) || null;
  }
}

export const defaultBankAdapter = new MockDeskAdapter();

export function compareStructuredAttestation(
  declared: Deposit,
  attestation: StructuredAttestationPayload,
  holderDiscrepancyAccepted = false
): {
  success: boolean;
  mismatches: string[];
  findings: ('R17' | 'R18')[];
  fieldChecks: { field: string; declared: string; attested: string; match: boolean }[];
} {
  const holderMatches = attestation.holders.some((h) => {
    const res = holderNameMatchScore(declared.holder, h);
    return res.status === 'Match' || (res.status === 'Review' && holderDiscrepancyAccepted);
  });

  const fieldChecks = [
    {
      field: 'Instrument number',
      declared: declared.fdrNo,
      attested: attestation.fdrNo,
      match: attestation.fdrNo.trim().toLowerCase() === declared.fdrNo.trim().toLowerCase()
    },
    {
      field: 'Bank name',
      declared: declared.bank,
      attested: attestation.bank,
      match: attestation.bank.trim().toLowerCase() === declared.bank.trim().toLowerCase()
    },
    {
      field: 'Principal amount',
      declared: String(declared.amount),
      attested: String(attestation.amount),
      match: Number(attestation.amount) === declared.amount
    },
    {
      field: 'Issue date',
      declared: declared.issueDate,
      attested: attestation.issueDate,
      match: attestation.issueDate === declared.issueDate
    },
    {
      field: 'Maturity date',
      declared: declared.maturityDate,
      attested: attestation.maturityDate,
      match: attestation.maturityDate === declared.maturityDate
    },
    {
      field: 'Holder name(s)',
      declared: declared.holder,
      attested: attestation.holders.join(', '),
      match: holderMatches
    },
    {
      field: 'Instrument status',
      declared: 'Active',
      attested: attestation.status,
      match: attestation.status === 'ACTIVE'
    },
    {
      field: 'Joint lien in favour of AICTE',
      declared: declared.lien ? 'Confirmed' : 'Not marked',
      attested: attestation.jointLienMarked ? 'Confirmed' : 'Missing',
      match: attestation.jointLienMarked === true
    },
    {
      field: 'Other encumbrance',
      declared: 'No other encumbrance',
      attested: attestation.otherEncumbrance ? 'Present' : 'None',
      match: attestation.otherEncumbrance === false
    },
    {
      field: 'AICTE NOC for premature closure',
      declared: 'Required',
      attested: attestation.prematureClosureRequiresAicteNoc ? 'Required' : 'Missing',
      match: attestation.prematureClosureRequiresAicteNoc === true
    }
  ];

  const mismatches = fieldChecks.filter((c) => !c.match).map((c) => c.field);
  const findings: ('R17' | 'R18')[] = [];

  const lienOrEncumbranceMismatch =
    !fieldChecks.find((c) => c.field === 'Joint lien in favour of AICTE')?.match ||
    !fieldChecks.find((c) => c.field === 'Other encumbrance')?.match ||
    !fieldChecks.find((c) => c.field === 'AICTE NOC for premature closure')?.match;

  const dataMismatch = fieldChecks
    .filter((c) => !['Joint lien in favour of AICTE', 'Other encumbrance', 'AICTE NOC for premature closure'].includes(c.field))
    .some((c) => !c.match);

  if (dataMismatch) findings.push('R17');
  if (lienOrEncumbranceMismatch) findings.push('R18');

  return {
    success: mismatches.length === 0,
    mismatches,
    findings,
    fieldChecks
  };
}
