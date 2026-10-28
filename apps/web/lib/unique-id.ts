/**
 * Unique Device ID Generator & Utilities
 * Format: [ACRONYM]-[BRANCH]-[SERIES][NUMBER]
 * Example: IP13PM-TAG-A01 (iPhone 13 Pro Max at Tagoloan, Unit 1)
 *
 * Sequence Rules:
 * - Number resets to 01 after 99 (A01 -> A99 -> B01 -> B99)
 * - Last 3 characters are always strictly 1 letter + 2 digits (e.g. A01)
 */

export function getBranchCode(branch?: string | null): string {
  if (!branch) return 'TAG';
  const clean = branch.trim().toLowerCase();
  if (clean.includes('villanueva') || clean === 'vil' || clean === 'v') return 'VIL';
  if (clean.includes('jasaan') || clean === 'jas' || clean === 'j') return 'JAS';
  return 'TAG';
}

export function getModelAcronym(modelName?: string | null): string {
  if (!modelName || !modelName.trim()) return 'DEV';

  const raw = modelName.trim();

  // Special handling for popular Apple iPhone naming
  const iphoneMatch = raw.match(/iphone\s*(\d+|x[rs]?|se)?\s*(pro\s*max|pro|max|plus|mini)?/i);
  if (iphoneMatch) {
    const gen = (iphoneMatch[1] || '').toUpperCase();
    const modRaw = (iphoneMatch[2] || '').toLowerCase().replace(/\s+/g, '');
    let mod = '';
    if (modRaw === 'promax') mod = 'PM';
    else if (modRaw === 'pro') mod = 'P';
    else if (modRaw === 'plus') mod = 'PL';
    else if (modRaw === 'mini') mod = 'M';
    else if (modRaw === 'max') mod = 'MAX';
    return `IP${gen}${mod}`;
  }

  // Samsung Galaxy naming
  const samsungMatch = raw.match(/samsung\s*(galaxy)?\s*([a-z])\s*(\d+)\s*(ultra|plus|\+)?/i);
  if (samsungMatch) {
    const series = (samsungMatch[2] || 'S').toUpperCase();
    const num = samsungMatch[3] || '';
    const mod = (samsungMatch[4] || '').toLowerCase().includes('ultra') ? 'U' : (samsungMatch[4] ? 'P' : '');
    return `SAM-${series}${num}${mod}`;
  }

  // General abbreviation fallback:
  // e.g. "Xiaomi Redmi Note 13" -> "XRN13"
  const tokens = raw.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0]!.slice(0, 6).toUpperCase();
  }

  let acronym = '';
  for (const token of tokens) {
    const numMatch = token.match(/\d+/);
    if (numMatch) {
      acronym += numMatch[0];
    } else {
      acronym += token[0]!.toUpperCase();
    }
  }

  return acronym.slice(0, 8).toUpperCase() || 'DEV';
}

/**
 * Returns the 3-character sequential suffix (e.g. A01, A02 ... A99 -> B01)
 * @param index 1-based unit index (e.g. 1, 2, 3...)
 */
export function getSequenceSuffix(index: number = 1): string {
  const safeIndex = Math.max(1, Math.floor(index || 1));
  const letterCode = 65 + Math.floor((safeIndex - 1) / 99);
  // Cap at 'Z' (code 90), loops if extraordinarily high
  const letter = String.fromCharCode(letterCode <= 90 ? letterCode : 65 + ((letterCode - 65) % 26));
  const num = ((safeIndex - 1) % 99) + 1;
  const numStr = String(num).padStart(2, '0');
  return `${letter}${numStr}`;
}

/**
 * Decodes a sequence suffix back to a 1-based numeric index.
 * Example: 'A01' -> 1, 'A10' -> 10, 'A99' -> 99, 'B01' -> 100
 */
export function parseSequenceSuffixToIndex(suffix: string): number {
  if (!suffix || suffix.length < 3) return 0;
  const letter = suffix.charAt(0).toUpperCase();
  const num = parseInt(suffix.slice(1), 10);
  if (isNaN(num)) return 0;
  const letterOffset = letter.charCodeAt(0) - 65;
  if (letterOffset < 0) return 0;
  return (letterOffset * 99) + num;
}

/**
 * Extracts the numeric sequence index from any complete Unique ID.
 * Example: 'IP11PM-TAG-A15' -> 15
 */
export function extractSequenceIndexFromId(id: string): number {
  if (!id) return 0;
  const match = id.trim().match(/-([A-Za-z]\d{2})$/);
  if (match && match[1]) {
    return parseSequenceSuffixToIndex(match[1]);
  }
  return 0;
}

/**
 * Generates the complete Unique Device ID
 * e.g. IP13PM-TAG-A01
 */
export function generateUniqueDeviceId(
  modelName: string,
  branchName?: string | null,
  unitIndex: number = 1
): string {
  const acronym = getModelAcronym(modelName);
  const branchCode = getBranchCode(branchName);
  const suffix = getSequenceSuffix(unitIndex);
  return `${acronym}-${branchCode}-${suffix}`;
}

/**
 * Resolves a standardized, alphanumeric Unique ID (e.g. IP11PM-TAG-A11 or SAM-S24U-TAG-A01)
 * for display on digital receipts, invoices, and transaction records.
 *
 * It guarantees that:
 * 1. If an ID is already an alphanumeric Unique ID (e.g. IP11PM-TAG-A01), it is formatted cleanly.
 * 2. If an ID is a numeric IMEI (e.g. 345678922367227) or empty:
 *    It converts it into the official store Unique ID format ([MODEL]-[BRANCH]-[A...]),
 *    using the invoice sequence (e.g. #GRPX-T-A11 -> A11) or unit index.
 * 3. Applies consistently to ALL devices (both iPhone and Android).
 */
export function resolveDisplayUniqueId(
  rawId?: string | null,
  modelName?: string | null,
  branchName?: string | null,
  unitIndex: number = 1,
  transactionId?: string | null
): string {
  const cleanId = String(rawId || '').trim();

  // If already a valid alphanumeric Unique ID (contains hyphen with letters/digits, e.g. IP11PM-TAG-A01)
  if (cleanId && /^[A-Za-z0-9]+(-[A-Za-z0-9]+)+$/.test(cleanId) && /[A-Za-z]/.test(cleanId)) {
    return cleanId.toUpperCase();
  }

  // Derive sequence index (e.g. from transaction #GRPX-T-A11 -> index 11)
  let seqIdx = unitIndex;
  if (transactionId) {
    const txMatch = String(transactionId).match(/-A(\d+)/i) || String(transactionId).match(/(\d+)$/);
    if (txMatch && txMatch[1]) {
      const parsed = parseInt(txMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        seqIdx = parsed;
      }
    }
  }

  return generateUniqueDeviceId(modelName || 'DEVICE', branchName, seqIdx);
}
