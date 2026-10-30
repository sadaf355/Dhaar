/**
 * Indian Numbering System Number-to-Words converter and parser.
 * Supports units, thousands, lakhs, crores.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertThreeDigits(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
}

/**
 * Converts an integer amount into Indian Rupees in words.
 * E.g. 2500000 -> "Rupees Twenty Five Lakh Only"
 */
export function amountToIndianWords(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return 'Rupees Zero Only';
  const num = Math.floor(Math.abs(amount));

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let parts: string[] = [];
  if (crore > 0) parts.push(`${convertThreeDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertThreeDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertThreeDigits(thousand)} Thousand`);
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  return `Rupees ${parts.join(' ')} Only`.replace(/\s+/g, ' ').trim();
}

/**
 * Parses an Indian number in words into a numeric value.
 * Handles words like: "Twenty Five Lakh Rupees Only", "INR 10 Lakhs", "One Crore Fifty Thousand", etc.
 */
export function parseIndianWordsToAmount(words: string): number | null {
  if (!words || typeof words !== 'string') return null;

  const normalized = words
    .toLowerCase()
    .replace(/[,\-./]/g, ' ')
    .replace(/\b(rupees|rupee|inr|rs|only|and)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;
  if (normalized === 'zero') return 0;

  const tokenValues: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };

  const tokens = normalized.split(' ').filter(Boolean);
  let total = 0;
  let currentGroup = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // Direct numeric digits inside words string (e.g. "25 Lakh")
    if (/^\d+$/.test(t)) {
      currentGroup += parseInt(t, 10);
      continue;
    }

    if (tokenValues[t] !== undefined) {
      currentGroup += tokenValues[t];
    } else if (t === 'hundred') {
      currentGroup = (currentGroup || 1) * 100;
    } else if (t === 'thousand' || t === 'thousands') {
      total += (currentGroup || 1) * 1000;
      currentGroup = 0;
    } else if (t === 'lakh' || t === 'lakhs' || t === 'lac' || t === 'lacs') {
      total += (currentGroup || 1) * 100000;
      currentGroup = 0;
    } else if (t === 'crore' || t === 'crores') {
      total += (currentGroup || 1) * 10000000;
      currentGroup = 0;
    }
  }

  total += currentGroup;
  return total > 0 ? total : null;
}

/**
 * Validates whether amount figures match amount in words (Rule R04).
 */
export function validateAmountInWords(figures: number, words: string): {
  match: boolean;
  parsedWordsAmount: number | null;
  detail: string;
} {
  const parsed = parseIndianWordsToAmount(words);
  if (parsed === null) {
    return {
      match: false,
      parsedWordsAmount: null,
      detail: `Could not parse amount in words: "${words}".`
    };
  }

  const match = Math.abs(parsed - figures) < 1;
  return {
    match,
    parsedWordsAmount: parsed,
    detail: match
      ? `Figures (₹${figures.toLocaleString('en-IN')}) match words ("${words}").`
      : `Mismatch: Figures state ₹${figures.toLocaleString('en-IN')} but words state ₹${parsed.toLocaleString('en-IN')}.`
  };
}
