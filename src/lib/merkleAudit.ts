// Pure deterministic SHA-256 implementation without external store dependency
export function sha256(ascii: string): string {
  const math = Math, K: number[] = [];
  for (let n = 2, c = 0; c < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (prime) K[c++] = Math.floor((math.cbrt(n) % 1) * 0x100000000);
  }
  const bytes = Array.from(new TextEncoder().encode(ascii));
  const words: number[] = [];
  const bitLen = bytes.length * 8;
  for (let i = 0; i < bytes.length; i++) words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] & 255) << (24 - (i % 4) * 8);
  words[bitLen >> 5] = (words[bitLen >> 5] || 0) | 0x80 << (24 - bitLen % 32);
  words[((bitLen + 64 >> 9) << 4) + 15] = bitLen;
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const W = new Array(64);
  for (let j = 0; j < words.length; j += 16) {
    for (let i = 0; i < 16; i++) W[i] = words[j + i] | 0;
    for (let i = 16; i < 64; i++) {
      const x = W[i - 15], y = W[i - 2],
        s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3),
        s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)),
        ch = (e & f) ^ (~e & g),
        t1 = (h + S1 + ch + K[i] + W[i]) | 0,
        S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)),
        maj = (a & b) ^ (a & c) ^ (b & c),
        t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    const vals = [a, b, c, d, e, f, g, h];
    for (let i = 0; i < 8; i++) H[i] = (H[i] + vals[i]) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}


export interface ExtendedAuditEvent {
  id: string;
  action: string;
  details: string;
  actorRole: string;
  userId: string;
  tone: 'info' | 'warning' | 'success';
  isoTimestamp: string;
  simulatedDate: string;
  beforeHash?: string;
  afterHash?: string;
  prevHash: string;
  hash: string;
}

export interface DailyDigest {
  date: string;
  merkleRoot: string;
  eventCount: number;
  calculatedAt: string;
}

export interface AuditAnchorReceipt {
  format: 'DHAAR-AUDIT-ANCHOR-RECEIPT-V1';
  exportedAt: string;
  simulatedDate: string;
  totalEvents: number;
  dailyDigests: DailyDigest[];
  chainHeadHash: string;
  events: ExtendedAuditEvent[];
  securityNotice: string;
}

/**
 * Computes canonical SHA-256 hash for an extended audit event.
 */
export function computeExtendedEventHash(event: Omit<ExtendedAuditEvent, 'hash'>): string {
  const parts = [
    event.id,
    event.isoTimestamp,
    event.simulatedDate,
    event.actorRole,
    event.userId || '',
    event.action,
    event.details,
    event.beforeHash || 'NONE',
    event.afterHash || 'NONE',
    event.prevHash
  ];
  return sha256(parts.join('|')).toLowerCase();
}

/**
 * Computes a binary Merkle tree root hash from a list of leaf hashes.
 */
export function computeMerkleRoot(leafHashes: string[]): string {
  if (leafHashes.length === 0) return '0000000000000000000000000000000000000000000000000000000000000000';
  if (leafHashes.length === 1) return leafHashes[0];

  let currentLevel = [...leafHashes];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = sha256(`${left}:${right}`).toLowerCase();
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

/**
 * Computes daily Merkle roots grouped by simulated date.
 */
export function computeDailyMerkleDigests(events: ExtendedAuditEvent[]): Record<string, DailyDigest> {
  const grouped: Record<string, ExtendedAuditEvent[]> = {};

  events.forEach(e => {
    const dateKey = e.simulatedDate || e.isoTimestamp.split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(e);
  });

  const digests: Record<string, DailyDigest> = {};

  Object.entries(grouped).forEach(([date, dayEvents]) => {
    const leafHashes = dayEvents.map(e => e.hash);
    const root = computeMerkleRoot(leafHashes);
    digests[date] = {
      date,
      merkleRoot: root,
      eventCount: dayEvents.length,
      calculatedAt: new Date().toISOString()
    };
  });

  return digests;
}

/**
 * Offline cryptographic verification of the SHA-256 hash chain and Merkle roots.
 */
export function verifyOfflineAuditChain(
  events: ExtendedAuditEvent[],
  expectedDigests?: Record<string, DailyDigest>
): {
  valid: boolean;
  error?: string;
  brokenIndex?: number;
  calculatedDigests: Record<string, DailyDigest>;
  totalVerified: number;
} {
  if (!events || events.length === 0) {
    return {
      valid: true,
      calculatedDigests: {},
      totalVerified: 0
    };
  }

  // 1. Verify sequential hash link and event content hashes
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    // Check prevHash linkage
    if (i === 0) {
      if (ev.prevHash !== 'GENESIS') {
        return {
          valid: false,
          error: `Genesis event ${ev.id} prevHash is "${ev.prevHash}", expected "GENESIS"`,
          brokenIndex: 0,
          calculatedDigests: {},
          totalVerified: i
        };
      }
    } else {
      const prevEv = events[i - 1];
      if (ev.prevHash !== prevEv.hash) {
        return {
          valid: false,
          error: `Hash chain broken at event #${i} (${ev.id}). prevHash "${ev.prevHash}" does not match prior event hash "${prevEv.hash}"`,
          brokenIndex: i,
          calculatedDigests: {},
          totalVerified: i
        };
      }
    }

    // Recompute event hash
    const expectedHash = computeExtendedEventHash(ev);
    if (ev.hash.toLowerCase() !== expectedHash.toLowerCase()) {
      return {
        valid: false,
        error: `Payload tamper detected in event #${i} (${ev.id}). Recorded hash "${ev.hash}" does not match recomputed SHA-256 "${expectedHash}"`,
        brokenIndex: i,
        calculatedDigests: {},
        totalVerified: i
      };
    }
  }

  // 2. Recompute daily Merkle roots
  const calculatedDigests = computeDailyMerkleDigests(events);

  // 3. Verify against expected daily digests if provided
  if (expectedDigests) {
    for (const [date, exp] of Object.entries(expectedDigests)) {
      const calc = calculatedDigests[date];
      if (!calc) {
        return {
          valid: false,
          error: `Missing daily digest for date ${date}`,
          calculatedDigests,
          totalVerified: events.length
        };
      }
      if (calc.merkleRoot.toLowerCase() !== exp.merkleRoot.toLowerCase()) {
        return {
          valid: false,
          error: `Daily Merkle root mismatch on ${date}. Expected "${exp.merkleRoot}", calculated "${calc.merkleRoot}"`,
          calculatedDigests,
          totalVerified: events.length
        };
      }
    }
  }

  return {
    valid: true,
    calculatedDigests,
    totalVerified: events.length
  };
}

/**
 * Creates downloadable JSON anchor receipt.
 */
export function createAuditAnchorReceipt(
  events: ExtendedAuditEvent[],
  digests: Record<string, DailyDigest>,
  simulatedDate: string
): AuditAnchorReceipt {
  return {
    format: 'DHAAR-AUDIT-ANCHOR-RECEIPT-V1',
    exportedAt: new Date().toISOString(),
    simulatedDate,
    totalEvents: events.length,
    dailyDigests: Object.values(digests),
    chainHeadHash: events.length > 0 ? events[events.length - 1].hash : 'GENESIS',
    events,
    securityNotice:
      'Browser local storage is a demo workspace cache, not an immutable ledger. In production, DHAAR daily Merkle roots are anchored into an independent append-only transparency log.'
  };
}
