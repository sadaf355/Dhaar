import { describe, it, expect } from 'vitest';
import {
  computeMerkleRoot,
  computeDailyMerkleDigests,
  createAuditAnchorReceipt,
  verifyOfflineAuditChain,
  computeExtendedEventHash,
  type ExtendedAuditEvent,
  sha256
} from '../merkleAudit';

describe('Merkle Audit Trail & Offline Verification', () => {
  // Construct a minimal valid 3-event chain
  const makeValidChain = (): ExtendedAuditEvent[] => {
    const e1Base: Omit<ExtendedAuditEvent, 'hash'> = {
      id: 'EVT-1',
      action: 'Workspace initialized',
      details: 'Demo baseline created',
      actorRole: 'SYSTEM',
      userId: 'usr-sys-001',
      tone: 'info',
      isoTimestamp: '2026-10-25T09:00:00.000Z',
      simulatedDate: '2026-10-25',
      prevHash: 'GENESIS'
    };
    const e1Hash = computeExtendedEventHash(e1Base);
    const e1: ExtendedAuditEvent = { ...e1Base, hash: e1Hash };

    const e2Base: Omit<ExtendedAuditEvent, 'hash'> = {
      id: 'EVT-2',
      action: 'New instrument submitted',
      details: 'DHAAR-24101 · SIES Graduate School',
      actorRole: 'Institution Admin',
      userId: 'usr-inst-101',
      tone: 'info',
      isoTimestamp: '2026-10-25T11:30:00.000Z',
      simulatedDate: '2026-10-25',
      beforeHash: 'before-hash-1',
      afterHash: 'after-hash-1',
      prevHash: e1Hash
    };
    const e2Hash = computeExtendedEventHash(e2Base);
    const e2: ExtendedAuditEvent = { ...e2Base, hash: e2Hash };

    const e3Base: Omit<ExtendedAuditEvent, 'hash'> = {
      id: 'EVT-3',
      action: 'Bank confirmation requested',
      details: 'DHAAR-24101 sent to HDFC Bank',
      actorRole: 'Regional Officer',
      userId: 'usr-ro-mum',
      tone: 'info',
      isoTimestamp: '2026-10-26T14:00:00.000Z',
      simulatedDate: '2026-10-26',
      prevHash: e2Hash
    };
    const e3Hash = computeExtendedEventHash(e3Base);
    const e3: ExtendedAuditEvent = { ...e3Base, hash: e3Hash };

    return [e1, e2, e3];
  };

  it('computes deterministic Merkle root for list of hashes', () => {
    const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];
    const root1 = computeMerkleRoot(hashes);
    const root2 = computeMerkleRoot(hashes);

    expect(root1).toBe(root2);
    expect(root1.length).toBe(64); // SHA-256 hex length

    // Empty list returns 64 zeroes
    expect(computeMerkleRoot([])).toBe('0'.repeat(64));
    // Single item returns itself
    expect(computeMerkleRoot(['abc'])).toBe('abc');
  });

  it('builds daily digests with correct Merkle roots', () => {
    const events = makeValidChain();
    const digests = computeDailyMerkleDigests(events);

    expect(digests['2026-10-25']).toBeDefined();
    expect(digests['2026-10-25'].eventCount).toBe(2);
    expect(digests['2026-10-26']).toBeDefined();
    expect(digests['2026-10-26'].eventCount).toBe(1);

    // Verify Merkle root matches computeMerkleRoot on day's events
    const day1Events = events.filter(e => e.simulatedDate === '2026-10-25');
    const expectedRoot = computeMerkleRoot(day1Events.map(e => e.hash));
    expect(digests['2026-10-25'].merkleRoot).toBe(expectedRoot);
  });

  it('creates downloadable anchor receipt JSON', () => {
    const events = makeValidChain();
    const digests = computeDailyMerkleDigests(events);
    const receipt = createAuditAnchorReceipt(events, digests, '2026-10-26');

    expect(receipt.format).toBe('DHAAR-AUDIT-ANCHOR-RECEIPT-V1');
    expect(receipt.simulatedDate).toBe('2026-10-26');
    expect(receipt.totalEvents).toBe(3);
    expect(receipt.events.length).toBe(3);
    expect(receipt.dailyDigests.length).toBe(2);
    expect(receipt.securityNotice).toContain('Browser local storage is a demo workspace cache');
  });

  it('verifies a valid untouched audit chain offline', () => {
    const events = makeValidChain();
    const digests = computeDailyMerkleDigests(events);
    const result = verifyOfflineAuditChain(events, digests);

    expect(result.valid).toBe(true);
    expect(result.totalVerified).toBe(3);
    expect(result.error).toBeUndefined();
  });

  describe('Tamper Detection Tests', () => {
    it('detects tampering when an event details or action is modified', () => {
      const events = makeValidChain();
      const digests = computeDailyMerkleDigests(events);

      // Tamper event 2 details
      events[1].details = 'TAMPERED: Altered bank amount from 10L to 50L';

      const result = verifyOfflineAuditChain(events, digests);
      expect(result.valid).toBe(false);
      expect(result.brokenIndex).toBe(1);
      expect(result.error).toContain('Payload tamper detected');
    });

    it('detects tampering when an event prevHash link is severed', () => {
      const events = makeValidChain();
      const digests = computeDailyMerkleDigests(events);

      // Tamper event 3 prevHash
      events[2].prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

      const result = verifyOfflineAuditChain(events, digests);
      expect(result.valid).toBe(false);
      expect(result.brokenIndex).toBe(2);
      expect(result.error).toContain('Hash chain broken');
    });

    it('detects tampering when an event state diff hash (beforeHash/afterHash) is modified', () => {
      const events = makeValidChain();
      const digests = computeDailyMerkleDigests(events);

      // Tamper afterHash
      events[1].afterHash = 'tampered-state-hash';

      const result = verifyOfflineAuditChain(events, digests);
      expect(result.valid).toBe(false);
      expect(result.brokenIndex).toBe(1);
      expect(result.error).toContain('Payload tamper detected');
    });

    it('detects tampering when a daily digest Merkle root is modified', () => {
      const events = makeValidChain();
      const digests = computeDailyMerkleDigests(events);

      // Tamper daily digest Merkle root
      digests['2026-10-25'].merkleRoot = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      const result = verifyOfflineAuditChain(events, digests);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Daily Merkle root mismatch');
    });
  });
});
