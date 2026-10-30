import { sha256 } from '../context/useDhaarStore';
import type { ReleaseCase } from '../context/useDhaarStore';
import type { Deposit } from '../data/seed';

/**
 * Computes the canonical hash digest for an approved release case and its NOC certificate.
 */
export function computeNocVerificationHash(c: ReleaseCase, dep?: Deposit): string {
  const parts = [
    'AICTE-DHAAR-NOC-V1',
    c.id,
    c.depositId,
    dep?.institution || '',
    dep?.amount || 0,
    dep?.bank || '',
    dep?.fdrNo || '',
    c.approver || '',
    c.approverUserId || '',
    c.updated
  ];
  return sha256(parts.join('|')).toUpperCase();
}

/**
 * Validates a verification code against the set of release cases.
 */
export function verifyNocCode(
  code: string,
  cases: ReleaseCase[],
  deposits: Deposit[]
): {
  valid: boolean;
  releaseCase?: ReleaseCase;
  deposit?: Deposit;
  computedHash: string;
  error?: string;
} {
  const cleanCode = code.trim().toUpperCase();
  for (const c of cases) {
    const dep = deposits.find(d => d.id === c.depositId);
    const computed = computeNocVerificationHash(c, dep);
    if (computed === cleanCode || c.id.toUpperCase() === cleanCode || (c.nocCode && c.nocCode.toUpperCase() === cleanCode)) {
      if (c.stage === 'Requested' || c.stage === 'Maker checked' || c.stage === 'Checker approved') {
        return {
          valid: false,
          releaseCase: c,
          deposit: dep,
          computedHash: computed,
          error: 'Certificate exists but is pending final Approving Authority sign-off.'
        };
      }
      return {
        valid: true,
        releaseCase: c,
        deposit: dep,
        computedHash: computed
      };
    }
  }

  return {
    valid: false,
    computedHash: '',
    error: 'No matching lien release or NOC record found with this cryptographic verification code.'
  };
}

/**
 * Self-contained pseudo-random but deterministic matrix generator for SVG QR code display.
 * Generates valid SVG without external network or heavy dependencies.
 */
export function generateSvgQrMatrix(inputString: string, size: number = 180): string {
  const hash = sha256(inputString);
  const matrixSize = 25; // 25x25 QR matrix
  const cellSize = size / matrixSize;

  // Build matrix
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  // Finder patterns at top-left, top-right, bottom-left (7x7)
  const placeFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(matrixSize - 7, 0);
  placeFinder(0, matrixSize - 7);

  // Timing lines
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Fill data cells from hash bits
  let bitIdx = 0;
  const hashBits = Array.from(hash)
    .map(c => parseInt(c, 16).toString(2).padStart(4, '0'))
    .join('');

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= matrixSize - 8;
      const inBottomLeft = r >= matrixSize - 8 && c < 8;
      const onTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !onTiming) {
        matrix[r][c] = hashBits[bitIdx % hashBits.length] === '1';
        bitIdx++;
      }
    }
  }

  // Generate SVG rects
  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="currentColor" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">${rects}</svg>`;
}
