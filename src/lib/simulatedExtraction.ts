import { amountToIndianWords } from './numberToWords';

export interface ExtractionBox {
  page: number;
  x: number; // percentage or pt
  y: number;
  width: number;
  height: number;
}

export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0.00 to 1.00
  box: ExtractionBox;
  confirmed?: boolean;
}

export interface SimulatedExtraction {
  depositId: string;
  sourceDocName: string;
  extractionEngine: string;
  extractedAt: string;
  instrumentNumber: ExtractedField<string>;
  bank: ExtractedField<string>;
  ifsc: ExtractedField<string>;
  branch: ExtractedField<string>;
  amount: ExtractedField<number>;
  amountInWords: ExtractedField<string>;
  issueDate: ExtractedField<string>;
  maturityDate: ExtractedField<string>;
  holders: ExtractedField<string[]>;
  lienToAicte: ExtractedField<boolean>;
  status: ExtractedField<'ACTIVE' | 'CLOSED' | 'MATURED'>;
}

/**
 * Mock Trust / Society Master Directory for fuzzy name matching (Rule R09).
 */
export interface TrustMasterRecord {
  trustCode: string;
  legalName: string;
  registrationNo: string;
  state: string;
  active: boolean;
}

export const MOCK_TRUST_MASTER: TrustMasterRecord[] = [
  { trustCode: 'TR-042', legalName: 'South Indian Education Society', registrationNo: 'F-1422(BOM)', state: 'Maharashtra', active: true },
  { trustCode: 'TR-038', legalName: 'North Valley Educational Foundation', registrationNo: 'MAH/582/PUNE', state: 'Maharashtra', active: true },
  { trustCode: 'TR-031', legalName: 'Deccan Progressive Education Society', registrationNo: 'F-920(NSK)', state: 'Maharashtra', active: true },
  { trustCode: 'TR-026', legalName: 'Konkan Rural Development Trust', registrationNo: 'E-412(RTG)', state: 'Maharashtra', active: true },
  { trustCode: 'TR-014', legalName: 'Western India Technical Education Board', registrationNo: 'F-3310(MUM)', state: 'Maharashtra', active: true },
  { trustCode: 'TR-019', legalName: 'Vidarbha Youth Welfare Society', registrationNo: 'MAH/102/NGP', state: 'Maharashtra', active: true },
  { trustCode: 'TR-055', legalName: 'Coastal Educational Trust Thane', registrationNo: 'F-1890(THN)', state: 'Maharashtra', active: true },
  { trustCode: 'TR-061', legalName: 'Marathwada Shikshan Prasarak Mandal', registrationNo: 'F-881(AUR)', state: 'Maharashtra', active: true }
];

/**
 * Mock IFSC Master Directory (Rule R10).
 * Validates IFSC format ^[A-Z]{4}0[A-Z0-9]{6}$, bank code prefix, and branch presence.
 */
export interface IfscMasterRecord {
  ifsc: string;
  bankName: string;
  bankPrefix: string;
  branchName: string;
  city: string;
  state: string;
}

export const MOCK_IFSC_MASTER: Record<string, IfscMasterRecord> = {
  'HDFC0000060': { ifsc: 'HDFC0000060', bankName: 'HDFC Bank', bankPrefix: 'HDFC', branchName: 'Fort Mumbai Branch', city: 'Mumbai', state: 'Maharashtra' },
  'HDFC0000240': { ifsc: 'HDFC0000240', bankName: 'HDFC Bank', bankPrefix: 'HDFC', branchName: 'Nerul Navi Mumbai Branch', city: 'Navi Mumbai', state: 'Maharashtra' },
  'SBIN0000300': { ifsc: 'SBIN0000300', bankName: 'State Bank of India', bankPrefix: 'SBIN', branchName: 'Pune Main Branch', city: 'Pune', state: 'Maharashtra' },
  'ICIC0000005': { ifsc: 'ICIC0000005', bankName: 'ICICI Bank', bankPrefix: 'ICIC', branchName: 'Nashik Main Branch', city: 'Nashik', state: 'Maharashtra' },
  'BARB0RATNAG': { ifsc: 'BARB0RATNAG', bankName: 'Bank of Baroda', bankPrefix: 'BARB', branchName: 'Ratnagiri Branch', city: 'Ratnagiri', state: 'Maharashtra' },
  'UTIB0000100': { ifsc: 'UTIB0000100', bankName: 'Axis Bank', bankPrefix: 'UTIB', branchName: 'Bandra Kurla Complex Branch', city: 'Mumbai', state: 'Maharashtra' },
  'UBIN0531235': { ifsc: 'UBIN0531235', bankName: 'Union Bank of India', bankPrefix: 'UBIN', branchName: 'Nagpur Main Branch', city: 'Nagpur', state: 'Maharashtra' },
  'UTIB0000450': { ifsc: 'UTIB0000450', bankName: 'Axis Bank', bankPrefix: 'UTIB', branchName: 'Thane West Branch', city: 'Thane', state: 'Maharashtra' },
  'UBIN0534567': { ifsc: 'UBIN0534567', bankName: 'Union Bank of India', bankPrefix: 'UBIN', branchName: 'Aurangabad Main Branch', city: 'Aurangabad', state: 'Maharashtra' }
};

export const BANK_PREFIX_MAP: Record<string, string> = {
  'hdfc bank': 'HDFC',
  'state bank of india': 'SBIN',
  'icici bank': 'ICIC',
  'bank of baroda': 'BARB',
  'union bank of india': 'UBIN',
  'axis bank': 'UTIB'
};

/**
 * Seed JSON Fixtures with clearly labelled 'SIMULATED EXTRACTION' details.
 */
export const SEED_EXTRACTIONS: Record<string, SimulatedExtraction> = {
  'DHAAR-24081': {
    depositId: 'DHAAR-24081',
    sourceDocName: 'FDR_783104_HDFC_Stamped.pdf',
    extractionEngine: 'DHAAR-OCR-Simulated-v2.1 (MOCK)',
    extractedAt: '2026-10-24T14:32:00Z',
    instrumentNumber: { value: 'FDR-783104', confidence: 0.99, box: { page: 1, x: 72, y: 140, width: 140, height: 22 } },
    bank: { value: 'HDFC Bank', confidence: 0.98, box: { page: 1, x: 72, y: 80, width: 180, height: 28 } },
    ifsc: { value: 'HDFC0000240', confidence: 0.97, box: { page: 1, x: 340, y: 80, width: 120, height: 20 } },
    branch: { value: 'Nerul Navi Mumbai Branch', confidence: 0.96, box: { page: 1, x: 72, y: 110, width: 220, height: 18 } },
    amount: { value: 2500000, confidence: 0.99, box: { page: 1, x: 380, y: 180, width: 130, height: 25 } },
    amountInWords: { value: 'Rupees Twenty Five Lakh Only', confidence: 0.97, box: { page: 1, x: 72, y: 215, width: 440, height: 22 } },
    issueDate: { value: '2025-02-14', confidence: 0.98, box: { page: 1, x: 72, y: 260, width: 110, height: 20 } },
    maturityDate: { value: '2027-02-14', confidence: 0.98, box: { page: 1, x: 340, y: 260, width: 110, height: 20 } },
    holders: { value: ['South Indian Education Society', 'Member Secretary, AICTE'], confidence: 0.95, box: { page: 1, x: 72, y: 310, width: 440, height: 40 } },
    lienToAicte: { value: true, confidence: 0.98, box: { page: 1, x: 72, y: 370, width: 350, height: 25 } },
    status: { value: 'ACTIVE', confidence: 0.99, box: { page: 1, x: 420, y: 370, width: 80, height: 25 } }
  },
  'DHAAR-24080': {
    depositId: 'DHAAR-24080',
    sourceDocName: 'SBI_FDR_440291_Scan.pdf',
    extractionEngine: 'DHAAR-OCR-Simulated-v2.1 (MOCK)',
    extractedAt: '2026-10-22T11:15:00Z',
    instrumentNumber: { value: 'SBI-440291', confidence: 0.96, box: { page: 1, x: 70, y: 135, width: 130, height: 22 } },
    bank: { value: 'State Bank of India', confidence: 0.97, box: { page: 1, x: 70, y: 75, width: 200, height: 28 } },
    ifsc: { value: 'SBIN0000300', confidence: 0.95, box: { page: 1, x: 340, y: 75, width: 120, height: 20 } },
    branch: { value: 'Pune Main Branch', confidence: 0.95, box: { page: 1, x: 70, y: 105, width: 200, height: 18 } },
    amount: { value: 1800000, confidence: 0.98, box: { page: 1, x: 380, y: 175, width: 130, height: 25 } },
    // Mismatch in words simulation for R04 test: figures 18,00,000 but words state 15 Lakh
    amountInWords: { value: 'Rupees Fifteen Lakh Only', confidence: 0.94, box: { page: 1, x: 70, y: 210, width: 440, height: 22 } },
    issueDate: { value: '2025-01-08', confidence: 0.97, box: { page: 1, x: 70, y: 255, width: 110, height: 20 } },
    maturityDate: { value: '2026-11-08', confidence: 0.97, box: { page: 1, x: 340, y: 255, width: 110, height: 20 } },
    // Missing AICTE lien holder in holders array for R08 testing
    holders: { value: ['North Valley Educational Foundation'], confidence: 0.93, box: { page: 1, x: 70, y: 300, width: 400, height: 35 } },
    lienToAicte: { value: false, confidence: 0.92, box: { page: 1, x: 70, y: 350, width: 300, height: 22 } },
    status: { value: 'ACTIVE', confidence: 0.98, box: { page: 1, x: 420, y: 350, width: 80, height: 25 } }
  },
  'DHAAR-24079': {
    depositId: 'DHAAR-24079',
    sourceDocName: 'ICICI_Receipt_928614.pdf',
    extractionEngine: 'DHAAR-OCR-Simulated-v2.1 (MOCK)',
    extractedAt: '2026-10-21T09:40:00Z',
    instrumentNumber: { value: 'ICICI-928614', confidence: 0.98, box: { page: 1, x: 75, y: 140, width: 140, height: 22 } },
    bank: { value: 'ICICI Bank', confidence: 0.99, box: { page: 1, x: 75, y: 80, width: 150, height: 28 } },
    ifsc: { value: 'ICIC0000005', confidence: 0.98, box: { page: 1, x: 340, y: 80, width: 120, height: 20 } },
    branch: { value: 'Nashik Main Branch', confidence: 0.97, box: { page: 1, x: 75, y: 110, width: 190, height: 18 } },
    // Declared is 32,00,000 but extracted is 28,00,000 for R16 testing
    amount: { value: 2800000, confidence: 0.97, box: { page: 1, x: 380, y: 180, width: 130, height: 25 } },
    amountInWords: { value: 'Rupees Twenty Eight Lakh Only', confidence: 0.96, box: { page: 1, x: 75, y: 215, width: 440, height: 22 } },
    issueDate: { value: '2024-12-01', confidence: 0.98, box: { page: 1, x: 75, y: 260, width: 110, height: 20 } },
    maturityDate: { value: '2026-12-01', confidence: 0.98, box: { page: 1, x: 340, y: 260, width: 110, height: 20 } },
    holders: { value: ['Deccan Progressive Education Society', 'Member Secretary, AICTE'], confidence: 0.96, box: { page: 1, x: 75, y: 310, width: 440, height: 40 } },
    lienToAicte: { value: true, confidence: 0.99, box: { page: 1, x: 75, y: 370, width: 350, height: 25 } },
    status: { value: 'ACTIVE', confidence: 0.99, box: { page: 1, x: 420, y: 370, width: 80, height: 25 } }
  },
  'DHAAR-24078': {
    depositId: 'DHAAR-24078',
    sourceDocName: 'BOB_Receipt_103877.pdf',
    extractionEngine: 'DHAAR-OCR-Simulated-v2.1 (MOCK)',
    extractedAt: '2026-10-19T16:00:00Z',
    instrumentNumber: { value: 'BOB-103877', confidence: 0.98, box: { page: 1, x: 72, y: 140, width: 135, height: 22 } },
    bank: { value: 'Bank of Baroda', confidence: 0.98, box: { page: 1, x: 72, y: 80, width: 160, height: 28 } },
    ifsc: { value: 'BARB0RATNAG', confidence: 0.97, box: { page: 1, x: 340, y: 80, width: 120, height: 20 } },
    branch: { value: 'Ratnagiri Branch', confidence: 0.96, box: { page: 1, x: 72, y: 110, width: 180, height: 18 } },
    amount: { value: 1250000, confidence: 0.99, box: { page: 1, x: 380, y: 180, width: 130, height: 25 } },
    amountInWords: { value: 'Rupees Twelve Lakh Fifty Thousand Only', confidence: 0.97, box: { page: 1, x: 72, y: 215, width: 440, height: 22 } },
    issueDate: { value: '2025-05-12', confidence: 0.98, box: { page: 1, x: 72, y: 260, width: 110, height: 20 } },
    maturityDate: { value: '2027-05-12', confidence: 0.98, box: { page: 1, x: 340, y: 260, width: 110, height: 20 } },
    holders: { value: ['Konkan Rural Development Trust', 'Member Secretary, AICTE'], confidence: 0.96, box: { page: 1, x: 72, y: 310, width: 440, height: 40 } },
    lienToAicte: { value: true, confidence: 0.99, box: { page: 1, x: 72, y: 370, width: 350, height: 25 } },
    status: { value: 'ACTIVE', confidence: 0.99, box: { page: 1, x: 420, y: 370, width: 80, height: 25 } }
  },
  'DHAAR-24076': {
    depositId: 'DHAAR-24076',
    sourceDocName: 'AXIS_FDR_207641.pdf',
    extractionEngine: 'DHAAR-OCR-Simulated-v2.1 (MOCK)',
    extractedAt: '2026-10-10T12:00:00Z',
    instrumentNumber: { value: 'AXIS-207641', confidence: 0.99, box: { page: 1, x: 72, y: 140, width: 135, height: 22 } },
    bank: { value: 'Axis Bank', confidence: 0.98, box: { page: 1, x: 72, y: 80, width: 150, height: 28 } },
    ifsc: { value: 'UTIB0000100', confidence: 0.98, box: { page: 1, x: 340, y: 80, width: 120, height: 20 } },
    branch: { value: 'Bandra Kurla Complex Branch', confidence: 0.97, box: { page: 1, x: 72, y: 110, width: 220, height: 18 } },
    amount: { value: 1100000, confidence: 0.99, box: { page: 1, x: 380, y: 180, width: 130, height: 25 } },
    amountInWords: { value: 'Rupees Eleven Lakh Only', confidence: 0.98, box: { page: 1, x: 72, y: 215, width: 440, height: 22 } },
    issueDate: { value: '2024-10-15', confidence: 0.98, box: { page: 1, x: 72, y: 260, width: 110, height: 20 } },
    maturityDate: { value: '2026-10-15', confidence: 0.98, box: { page: 1, x: 340, y: 260, width: 110, height: 20 } },
    holders: { value: ['Western India Technical Education Board', 'Member Secretary, AICTE'], confidence: 0.97, box: { page: 1, x: 72, y: 310, width: 440, height: 40 } },
    lienToAicte: { value: true, confidence: 0.99, box: { page: 1, x: 72, y: 370, width: 350, height: 25 } },
    status: { value: 'MATURED', confidence: 0.99, box: { page: 1, x: 420, y: 370, width: 80, height: 25 } }
  }
};

/**
 * Returns a simulated extraction for a deposit, creating a dynamic fixture if not in seed.
 */
export function getSimulatedExtraction(deposit: {
  id: string;
  fdrNo: string;
  bank: string;
  amount: number;
  issueDate: string;
  maturityDate: string;
  holder: string;
  institution: string;
  lien: boolean;
  finding?: string;
}): SimulatedExtraction {
  if (SEED_EXTRACTIONS[deposit.id]) {
    return SEED_EXTRACTIONS[deposit.id];
  }

  // Derive default mock branch and IFSC based on bank
  const bankLower = deposit.bank.trim().toLowerCase();
  const bankPrefix = BANK_PREFIX_MAP[bankLower] || 'BANK';
  let mockIfsc = `${bankPrefix}0000101`;
  if (deposit.finding && /ifsc/i.test(deposit.finding)) {
    mockIfsc = 'INVALID_IFSC_99'; // Invalid syntax & prefix fails R10 across all banks
  }
  const amountWords = amountToIndianWords(deposit.amount);

  return {
    depositId: deposit.id,
    sourceDocName: `${deposit.fdrNo}_DepositReceipt.pdf`,
    extractionEngine: 'DHAAR-OCR-Simulated-v2.1 (MOCK)',
    extractedAt: new Date().toISOString(),
    instrumentNumber: { value: deposit.fdrNo, confidence: 0.97, box: { page: 1, x: 70, y: 140, width: 140, height: 22 } },
    bank: { value: deposit.bank, confidence: 0.98, box: { page: 1, x: 70, y: 80, width: 160, height: 28 } },
    ifsc: { value: mockIfsc, confidence: 0.95, box: { page: 1, x: 340, y: 80, width: 120, height: 20 } },
    branch: { value: `${deposit.bank} City Branch`, confidence: 0.94, box: { page: 1, x: 70, y: 110, width: 180, height: 18 } },
    amount: { value: deposit.amount, confidence: 0.98, box: { page: 1, x: 380, y: 180, width: 130, height: 25 } },
    amountInWords: { value: amountWords, confidence: 0.96, box: { page: 1, x: 70, y: 215, width: 440, height: 22 } },
    issueDate: { value: deposit.issueDate, confidence: 0.97, box: { page: 1, x: 70, y: 260, width: 110, height: 20 } },
    maturityDate: { value: deposit.maturityDate, confidence: 0.97, box: { page: 1, x: 340, y: 260, width: 110, height: 20 } },
    holders: {
      value: deposit.lien
        ? [deposit.holder || deposit.institution, 'Member Secretary, AICTE']
        : [deposit.holder || deposit.institution],
      confidence: 0.95,
      box: { page: 1, x: 70, y: 310, width: 440, height: 40 }
    },
    lienToAicte: { value: deposit.lien, confidence: 0.98, box: { page: 1, x: 70, y: 370, width: 350, height: 25 } },
    status: { value: 'ACTIVE', confidence: 0.98, box: { page: 1, x: 420, y: 370, width: 80, height: 25 } }
  };
}
