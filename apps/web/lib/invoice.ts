/**
 * Client-safe Invoice utility functions for Graphix Management.
 * (Does NOT import prisma or any server-only modules so it can be safely used in Client Components)
 */

/**
 * Returns the single-letter branch code:
 * - 'T' for Tagoloan Branch
 * - 'V' for Villanueva Branch
 * - 'J' for Jasaan Branch
 */
export function getBranchCode(branch: string | null | undefined): string {
  if (!branch) return 'T';
  const clean = branch.toLowerCase().trim();
  if (clean.includes('villa')) return 'V';
  if (clean.includes('jasaan')) return 'J';
  if (clean.includes('tago')) return 'T';
  
  // Default to first character or 'T'
  const firstLetter = clean.replace(/[^a-z0-9]/gi, '').charAt(0).toUpperCase();
  return firstLetter || 'T';
}

/**
 * Formats a clean invoice reference ID:
 * e.g., GRPX-T-A1, GRPX-V-A1, GRPX-J-A1
 */
export function formatInvoiceNumber(branch: string | null | undefined, sequenceNumber: number): string {
  const code = getBranchCode(branch);
  const num = Math.max(1, Math.floor(sequenceNumber));
  return `GRPX-${code}-A${num}`;
}

/**
 * Formats any raw ID, reference ID, or old string into the official #GRPX-X-A... standard.
 * Automatically transforms old CMTPQ/CWTPQ/cuid codes into #GRPX-T-A1, #GRPX-V-A1, #GRPX-J-A1.
 */
export function formatDisplayInvoiceId(rawId: string | null | undefined, branch?: string | null | undefined): string {
  const code = getBranchCode(branch);

  if (!rawId) {
    return `#GRPX-${code}-A1`;
  }

  const clean = rawId.trim();
  const withoutHash = clean.replace(/^#/, '');

  // If already in standard format (e.g. GRPX-T-A1 or #GRPX-T-A1)
  const standardMatch = withoutHash.match(/^GRPX-([TVJ]|[A-Z])-A(\d+)$/i);
  if (standardMatch && standardMatch[1] && standardMatch[2]) {
    const bCode = standardMatch[1].toUpperCase();
    const seq = standardMatch[2];
    return `#GRPX-${bCode}-A${seq}`;
  }

  // If it ends with digits (e.g. from an old code or sequential ID), extract the number
  const digitsMatch = withoutHash.match(/(\d+)$/);
  const derivedSeq = digitsMatch && digitsMatch[1] ? Math.max(1, parseInt(digitsMatch[1].slice(-2), 10) || 1) : 1;
  
  return `#GRPX-${code}-A${derivedSeq}`;
}
