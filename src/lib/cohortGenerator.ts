import type { Deposit } from '../data/seed';
import { sha256 } from '../context/useDhaarStore';
import { amountToIndianWords } from './numberToWords';

export interface GeneratedCohort {
  institutions: Array<{
    code: string;
    name: string;
    region: string;
    state: string;
    trustName: string;
    instrumentsCount: number;
    verifiedCount: number;
    status: 'Action required' | 'Under review' | 'Compliant';
  }>;
  deposits: Deposit[];
  faultCounts: Record<string, number>;
  generatedAt: string;
  seedUsed: number;
}

export const FAULT_CLASSES = [
  { id: 'altered_amount', name: 'Altered Amount', description: 'Declared deposit amount differs from extracted instrument amount' },
  { id: 'missing_joint_holder', name: 'Missing Joint Holder', description: 'Mandatory joint holder "Member Secretary, AICTE" absent' },
  { id: 'short_tenure', name: 'Short Tenure', description: 'Deposit tenure below 10-year regulatory minimum' },
  { id: 'reused_document', name: 'Reused Document', description: 'Same document attachment/hash uploaded across multiple deposits' },
  { id: 'wrong_ifsc', name: 'Wrong IFSC', description: 'IFSC format invalid or bank prefix does not match issuing bank' },
  { id: 'tampered_pdf_metadata', name: 'Tampered PDF Metadata', description: 'PDF created/modified with image editors like Photoshop/Canva' },
  { id: 'name_mismatch', name: 'Name Mismatch', description: 'Holder name on deposit does not match approved trust registry' },
  { id: 'coverage_gap', name: 'Coverage Gap', description: 'Lineage replacement has an unbacked temporal gap > 0 days' },
  { id: 'silent_closure', name: 'Silent Closure', description: 'Deposit closed or encashed at bank without AICTE lien release' },
  { id: 'overdue_reattestation', name: 'Overdue Re-attestation', description: 'Periodic bank attestation older than 180-day freshness window' },
  { id: 'release_during_hold', name: 'Release During Hold', description: 'Release requested or processed while active legal/dispute hold exists' },
  { id: 'refund_name_mismatch', name: 'Refund Name Mismatch', description: 'Beneficiary account name does not match institution legal trust' }
] as const;

export type FaultClassId = typeof FAULT_CLASSES[number]['id'];

export const REGIONS = [
  { name: 'Western', states: ['Maharashtra', 'Goa'] },
  { name: 'Northern', states: ['Uttar Pradesh', 'Uttarakhand'] },
  { name: 'North-Western', states: ['Punjab', 'Haryana', 'Delhi', 'Rajasthan'] },
  { name: 'Southern', states: ['Tamil Nadu', 'Puducherry'] },
  { name: 'South-Western', states: ['Karnataka', 'Kerala'] },
  { name: 'Eastern', states: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand'] },
  { name: 'Central', states: ['Madhya Pradesh', 'Chhattisgarh', 'Gujarat'] },
  { name: 'North-Eastern', states: ['Assam', 'Meghalaya', 'Tripura', 'Manipur'] }
];

export const BANKS = [
  { name: 'State Bank of India', prefix: 'SBIN' },
  { name: 'HDFC Bank', prefix: 'HDFC' },
  { name: 'ICICI Bank', prefix: 'ICIC' },
  { name: 'Punjab National Bank', prefix: 'PUNB' },
  { name: 'Bank of Baroda', prefix: 'BARB' },
  { name: 'Canara Bank', prefix: 'CNRB' },
  { name: 'Union Bank of India', prefix: 'UBIN' },
  { name: 'Bank of India', prefix: 'BKID' },
  { name: 'Indian Bank', prefix: 'IDIB' },
  { name: 'Central Bank of India', prefix: 'CBIN' },
  { name: 'Axis Bank', prefix: 'UTIB' },
  { name: 'Kotak Mahindra Bank', prefix: 'KKBK' },
  { name: 'IndusInd Bank', prefix: 'INDB' },
  { name: 'Yes Bank', prefix: 'YESB' },
  { name: 'IDBI Bank', prefix: 'IBKL' },
  { name: 'Federal Bank', prefix: 'FDRL' },
  { name: 'Indian Overseas Bank', prefix: 'IOBA' },
  { name: 'UCO Bank', prefix: 'UCBA' },
  { name: 'Bank of Maharashtra', prefix: 'MAHB' },
  { name: 'Punjab & Sind Bank', prefix: 'PSIB' }
];

const INSTITUTION_PREFIXES = ['National', 'Indian', 'Institute of', 'Academy of', 'College of', 'Apex', 'Premier', 'Global', 'Universal', 'Bharatiya'];
const INSTITUTION_TYPES = ['Technology & Science', 'Engineering Studies', 'Polytechnic', 'Applied Management', 'Pharmaceutical Sciences', 'Architecture', 'Advanced Computing'];

/**
 * Seeded Mulberry32 PRNG for deterministic synthetic cohort generation.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic ~1,000 institutions and ~1,800 deposit instruments.
 */
export function generateDeterministicCohort(seed: number = 1337): GeneratedCohort {
  const prng = mulberry32(seed);

  const randInt = (min: number, max: number) => Math.floor(prng() * (max - min + 1)) + min;
  const pick = <T>(arr: T[]): T => arr[Math.floor(prng() * arr.length)];

  // 1. Generate ~1,000 Institutions
  const institutionCount = 1000;
  const institutions: GeneratedCohort['institutions'] = [];

  for (let i = 1; i <= institutionCount; i++) {
    const region = pick(REGIONS);
    const state = pick(region.states);
    const pfx = pick(INSTITUTION_PREFIXES);
    const typ = pick(INSTITUTION_TYPES);
    const code = `${state.slice(0, 2).toUpperCase()}-EDU-${String(i).padStart(4, '0')}`;
    const name = `${pfx} ${state} ${typ} ${String(i)}`;
    const trustName = `${name} Educational Trust`;

    institutions.push({
      code,
      name,
      region: region.name,
      state,
      trustName,
      instrumentsCount: 0,
      verifiedCount: 0,
      status: 'Under review'
    });
  }

  // 2. Generate ~1,800 Instruments across 12 fault classes
  const totalInstruments = 1800;
  const deposits: Deposit[] = [];
  const faultCounts: Record<string, number> = {};

  FAULT_CLASSES.forEach(f => {
    faultCounts[f.id] = 0;
  });
  faultCounts['clean'] = 0;

  // We assign faults to ~35% of instruments, keeping ~65% clean
  // 12 faults distributed evenly: ~50 instruments per fault class
  const faultAssignments: Array<FaultClassId | 'clean'> = [];
  FAULT_CLASSES.forEach(f => {
    const countForFault = 50; // 50 * 12 = 600 faults
    for (let k = 0; k < countForFault; k++) {
      faultAssignments.push(f.id);
    }
  });

  while (faultAssignments.length < totalInstruments) {
    faultAssignments.push('clean');
  }

  // Shuffle fault assignments deterministically with Fisher-Yates
  for (let i = faultAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [faultAssignments[i], faultAssignments[j]] = [faultAssignments[j], faultAssignments[i]];
  }

  // Known shared reused hash for 'reused_document' fault
  const SHARED_REUSED_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

  const amounts = [1000000, 1500000, 1800000, 2000000, 2500000, 3000000, 3500000, 5000000];

  for (let i = 1; i <= totalInstruments; i++) {
    const id = `DHAAR-${String(25000 + i)}`;
    const inst = pick(institutions);
    const bank = pick(BANKS);
    const fault = faultAssignments[i - 1];
    faultCounts[fault]++;

    inst.instrumentsCount++;

    const baseAmount = pick(amounts);
    let amount = baseAmount;
    let tenureYears = 10;
    let lien = true;
    let holder = inst.trustName;
    let fileHash = sha256(`SEED-FILE-${id}-${i}`);
    let fileName = `${bank.prefix}_FDR_${id}.pdf`;
    let fileSizeBytes = randInt(180000, 420000);
    let bankRequestStatus: Deposit['bankRequestStatus'] = 'Attested';
    let grade: Deposit['grade'] = 'E2';
    let status: Deposit['status'] = 'Active';
    let finding: string | undefined = undefined;
    let pdfMetadata: Deposit['pdfMetadata'] = {
      producer: `${bank.name} Core Banking PDF v4.2`,
      creator: 'Banking Daemon',
      creationDate: '2024-05-10T10:00:00Z',
      modificationDate: '2024-05-10T10:00:00Z'
    };
    let lastAttestedDate = '2026-08-15';
    let predecessorId: string | undefined = undefined;
    let coverageGapDays: number | undefined = undefined;
    let holds: string[] | undefined = undefined;
    let refundAccountName = inst.trustName;
    let maturityDateOverride: string | undefined = undefined;

    // Issue date between 2022 and 2025
    const issueYear = randInt(2022, 2024);
    const issueMonth = String(randInt(1, 12)).padStart(2, '0');
    const issueDay = String(randInt(1, 28)).padStart(2, '0');
    const issueDate = `${issueYear}-${issueMonth}-${issueDay}`;

    // Apply specific fault attributes
    switch (fault) {
      case 'altered_amount':
        // Declared amount is different from OCR extracted amount
        amount = baseAmount + 500000;
        finding = 'Declared amount exceeds OCR extracted figures';
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'missing_joint_holder':
        lien = false;
        holder = `${inst.name} Sole Account`;
        finding = 'Joint lien endorsement to Member Secretary, AICTE is missing';
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'short_tenure': {
        const issueDt = new Date(`${issueDate}T00:00:00Z`);
        issueDt.setDate(issueDt.getDate() + randInt(60, 180));
        maturityDateOverride = issueDt.toISOString().slice(0, 10);
        finding = `Tenure is shorter than the 10-year regulatory requirement (under 365 days)`;
        grade = 'E1';
        status = 'Attention required';
        break;
      }

      case 'reused_document':
        fileHash = SHARED_REUSED_HASH;
        fileName = 'Shared_Scanned_Deposit_Copy.pdf';
        finding = 'Document SHA-256 hash collision detected across unrelated institutions';
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'wrong_ifsc':
        finding = 'IFSC prefix does not match issuing bank master directory';
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'tampered_pdf_metadata':
        pdfMetadata = {
          producer: 'Adobe Photoshop 2024 (Windows)',
          creator: 'Adobe Illustrator CS6',
          creationDate: `${issueDate}T10:00:00Z`,
          modificationDate: '2026-01-15T18:40:00Z'
        };
        finding = 'Suspicious image manipulation software detected in PDF metadata';
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'name_mismatch':
        holder = `Unrelated Trust Of Maharashtra`;
        finding = 'Instrument beneficiary name does not match approved institution trust';
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'coverage_gap':
        predecessorId = `DHAAR-${String(24000 + i)}`;
        coverageGapDays = randInt(14, 90);
        finding = `Predecessor-successor coverage gap detected (${coverageGapDays} unbacked days)`;
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'silent_closure':
        bankRequestStatus = 'Mismatch';
        finding = 'Bank reports instrument marked closed / prematurely encashed';
        grade = 'E1';
        status = 'Attention required';
        break;

      case 'overdue_reattestation':
        lastAttestedDate = '2025-01-10'; // > 180 days from simulated 2026-10-30
        finding = 'Periodic bank confirmation overdue (> 180 days since last attestation)';
        grade = 'E2';
        status = 'Attention required';
        break;

      case 'release_during_hold':
        holds = ['Vigilance Inquiry Hold · CVC-2026-891'];
        finding = 'Active regulatory / dispute hold blocks lien release';
        grade = 'E2';
        status = 'Attention required';
        break;

      case 'refund_name_mismatch':
        refundAccountName = 'XYZ Private Contractors Ltd';
        finding = 'Target refund account name does not match institutional trust';
        grade = 'E2';
        status = 'Attention required';
        break;

      case 'clean':
      default:
        grade = 'E2';
        status = 'Active';
        inst.verifiedCount++;
        break;
    }

    const maturityYear = issueYear + tenureYears;
    const maturityDate = maturityDateOverride || `${maturityYear}-${issueMonth}-${issueDay}`;
    const fdrNo = `${bank.prefix}-${randInt(100000, 999999)}`;

    deposits.push({
      id,
      institution: inst.name,
      institutionCode: inst.code,
      region: inst.region,
      bank: bank.name,
      fdrNo,
      amount,
      issueDate,
      maturityDate,
      purpose: 'AICTE Security Deposit',
      grade,
      status,
      lien,
      holder,
      submitted: issueDate,
      finding,
      bankRequestStatus,
      lastAttestedDate,
      fileName,
      fileHash,
      fileSizeBytes,
      pdfMetadata,
      predecessorId,
      coverageGapDays,
      holds,
      refundAccountName,
      expectedRefundName: inst.trustName
    });
  }

  // Update institution status based on verified count
  institutions.forEach(inst => {
    if (inst.verifiedCount >= inst.instrumentsCount && inst.instrumentsCount > 0) {
      inst.status = 'Compliant';
    } else if (inst.verifiedCount > 0) {
      inst.status = 'Under review';
    } else {
      inst.status = 'Action required';
    }
  });

  return {
    institutions,
    deposits,
    faultCounts,
    generatedAt: new Date().toISOString(),
    seedUsed: seed
  };
}
