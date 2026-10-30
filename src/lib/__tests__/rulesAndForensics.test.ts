import { describe, it, expect } from 'vitest';
import { evaluateRules } from '../rules';
import { seedDeposits } from '../../data/seed';
import { amountToIndianWords, parseIndianWordsToAmount } from '../numberToWords';
import { isImageEditorProducer } from '../pdfForensics';
import { computeNocVerificationHash, verifyNocCode, generateSvgQrMatrix } from '../qrCode';
import type { ReleaseCase } from '../../context/useDhaarStore';

describe('Rules Engine & Forensics (R03, R04, R08, R09, R10, R13, R16)', () => {
  const simulatedDate = '2026-10-30';

  it('R04: validates amount in words vs figures using Indian numbering parser', () => {
    // 25 Lakhs
    expect(amountToIndianWords(2500000)).toBe('Rupees Twenty Five Lakh Only');
    expect(parseIndianWordsToAmount('Rupees Twenty Five Lakh Only')).toBe(2500000);
    expect(parseIndianWordsToAmount('Twenty Five Lakhs Only')).toBe(2500000);

    // Negative case: mismatch between figures and words in seed DHAAR-24080 (figures 18,00,000 vs words 15 Lakh)
    const resultsMismatch = evaluateRules(seedDeposits.find(d => d.id === 'DHAAR-24080')!, { deposits: seedDeposits, simulatedDate });
    const r04 = resultsMismatch.find(r => r.id === 'R04');
    expect(r04).toBeDefined();
    expect(r04?.status).toBe('review');

    // Positive case: matching figures and words in seed DHAAR-24081
    const resultsMatch = evaluateRules(seedDeposits.find(d => d.id === 'DHAAR-24081')!, { deposits: seedDeposits, simulatedDate });
    const r04Match = resultsMatch.find(r => r.id === 'R04');
    expect(r04Match?.status).toBe('pass');
  });

  it('R08: validates joint holder / AICTE lien endorsement', () => {
    // DHAAR-24081 has Member Secretary, AICTE -> passes
    const resPass = evaluateRules(seedDeposits.find(d => d.id === 'DHAAR-24081')!, { deposits: seedDeposits, simulatedDate });
    const r08Pass = resPass.find(r => r.id === 'R08');
    expect(r08Pass?.status).toBe('pass');

    // DHAAR-24080 lacks Member Secretary, AICTE -> review
    const resFail = evaluateRules(seedDeposits.find(d => d.id === 'DHAAR-24080')!, { deposits: seedDeposits, simulatedDate });
    const r08Fail = resFail.find(r => r.id === 'R08');
    expect(r08Fail?.status).toBe('review');
  });

  it('R09: validates holder / trust name against mock trust master with fuzzy matching', () => {
    // DHAAR-24081 has 'South Indian Education Society' which matches TR-042
    const res = evaluateRules(seedDeposits.find(d => d.id === 'DHAAR-24081')!, { deposits: seedDeposits, simulatedDate });
    const r09 = res.find(r => r.id === 'R09');
    expect(r09?.status).toBe('pass');
    expect(r09?.detail).toContain('South Indian Education Society');
  });

  it('R10: validates IFSC format, bank code prefix, and IFSC master', () => {
    // DHAAR-24081 has HDFC0000240 on HDFC Bank -> passes
    const res = evaluateRules(seedDeposits.find(d => d.id === 'DHAAR-24081')!, { deposits: seedDeposits, simulatedDate });
    const r10 = res.find(r => r.id === 'R10');
    expect(r10?.status).toBe('pass');
    expect(r10?.detail).toContain('HDFC0000240');
  });

  it('R13: detects suspicious image editor software in PDF producer or creator metadata', () => {
    expect(isImageEditorProducer('Adobe Photoshop 24.0', 'Adobe Illustrator')).toBe(true);
    expect(isImageEditorProducer('Canva Design Suite', '')).toBe(true);
    expect(isImageEditorProducer('CorelDRAW 2023', '')).toBe(true);
    expect(isImageEditorProducer('Finacle Banking Core PDF Export', 'Infosys Banking')).toBe(false);

    // Test with deposit having suspicious metadata
    const depositWithSuspiciousPdf = {
      ...seedDeposits[0],
      pdfMetadata: {
        producer: 'Adobe Photoshop 2024 (Windows)',
        creator: 'Photoshop',
        creationDate: '2025-01-08T10:00:00Z',
        modificationDate: '2025-01-08T10:30:00Z'
      }
    };
    const res = evaluateRules(depositWithSuspiciousPdf, { deposits: seedDeposits, simulatedDate });
    const r13 = res.find(r => r.id === 'R13');
    expect(r13?.status).toBe('review');
    expect(r13?.detail).toContain('Photoshop');
  });

  it('R03: flags document SHA-256 hash reused across different deposit records', () => {
    const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const dep1 = { ...seedDeposits[0], id: 'DEP-TEST-1', fileHash: hash };
    const dep2 = { ...seedDeposits[1], id: 'DEP-TEST-2', fileHash: hash };

    const res = evaluateRules(dep1, { deposits: [dep1, dep2], simulatedDate });
    const r03 = res.find(r => r.id === 'R03');
    expect(r03?.status).toBe('review');
    expect(r03?.detail).toContain('reused across another registry deposit record');
  });

  it('R16: flags declared vs extracted field discrepancies', () => {
    // DHAAR-24079 has declared amount 32,00,000 but extracted is 28,00,000
    const res = evaluateRules(seedDeposits.find(d => d.id === 'DHAAR-24079')!, { deposits: seedDeposits, simulatedDate });
    const r16 = res.find(r => r.id === 'R16');
    expect(r16?.status).toBe('review');
    expect(r16?.detail).toContain('Discrepancy detected');
  });

  it('keeps untestable rules R12, R14, R15, R21, R24-R26 as Not testable (unavailable status)', () => {
    const res = evaluateRules(seedDeposits[0], { deposits: seedDeposits, simulatedDate });
    const untestableIds = ['R12', 'R14', 'R15', 'R21', 'R24', 'R25', 'R26'];

    for (const id of untestableIds) {
      const rule = res.find(r => r.id === id);
      expect(rule).toBeDefined();
      expect(rule?.status).toBe('unavailable');
      expect(rule?.detail).toBeDefined();
    }
  });
});

describe('QR Code Generation & Cryptographic NOC Verification', () => {
  const mockDeposit = seedDeposits[0];
  const mockCase: ReleaseCase = {
    id: 'REL-TEST-NOC',
    depositId: mockDeposit.id,
    stage: 'Reconciled',
    hold: false,
    refundAccount: '•••• 4821',
    refundVerified: true,
    noc: true,
    approver: 'Approving Authority',
    approverUserId: 'usr-aa-1',
    updated: '2026-10-25'
  };

  it('computes deterministic SHA-256 hash for NOC verification', () => {
    const hash1 = computeNocVerificationHash(mockCase, mockDeposit);
    const hash2 = computeNocVerificationHash(mockCase, mockDeposit);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('verifies valid NOC code against approved release cases', () => {
    const hash = computeNocVerificationHash(mockCase, mockDeposit);
    const result = verifyNocCode(hash, [mockCase], [mockDeposit]);
    expect(result.valid).toBe(true);
    expect(result.releaseCase?.id).toBe(mockCase.id);
    expect(result.deposit?.id).toBe(mockDeposit.id);
  });

  it('rejects unapproved release cases or invalid verification codes', () => {
    const unapprovedCase: ReleaseCase = {
      ...mockCase,
      stage: 'Requested'
    };
    const hash = computeNocVerificationHash(unapprovedCase, mockDeposit);
    const unapprovedResult = verifyNocCode(hash, [unapprovedCase], [mockDeposit]);
    expect(unapprovedResult.valid).toBe(false);
    expect(unapprovedResult.error).toContain('pending final Approving Authority sign-off');

    const invalidResult = verifyNocCode('INVALID-CODE-XYZ', [mockCase], [mockDeposit]);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('No matching lien release');
  });

  it('generates an SVG QR code matrix without external network dependencies', () => {
    const svg = generateSvgQrMatrix('TEST-HASH-12345', 180);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<rect');
    expect(svg).toContain('viewBox="0 0 180 180"');
  });
});
