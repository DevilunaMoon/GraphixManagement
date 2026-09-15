import { prisma } from 'database';

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
 * Generates the next sequential invoice reference ID from the database for a given branch.
 * Increments the integer sequence (A1 -> A2 -> A3...) per branch.
 */
export async function generateNextInvoiceId(branch: string | null | undefined): Promise<string> {
  const branchCode = getBranchCode(branch);
  const prefix = `GRPX-${branchCode}-A`;
  const cleanBranchName = (branch || 'Tagoloan').replace(/\s*Branch$/i, '').trim();

  try {
    // 1. Find all purchases matching this branch or prefix
    const purchases = await prisma.purchase.findMany({
      where: {
        OR: [
          { referenceId: { contains: prefix, mode: 'insensitive' } },
          { branch: { contains: cleanBranchName, mode: 'insensitive' } }
        ]
      },
      select: { referenceId: true }
    });

    let maxSeq = 0;
    for (const p of purchases) {
      if (p.referenceId) {
        const cleanRef = p.referenceId.replace(/^#/, '').trim().toUpperCase();
        if (cleanRef.startsWith(prefix)) {
          const numStr = cleanRef.replace(prefix, '');
          const parsed = parseInt(numStr, 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
    }

    if (maxSeq === 0 && purchases.length > 0) {
      maxSeq = purchases.length;
    }

    const nextSeq = maxSeq + 1;
    return `#${prefix}${nextSeq}`;
  } catch (error) {
    console.error('Error calculating next invoice sequence:', error);
    return `#${prefix}1`;
  }
}

/**
 * Formats any raw ID, reference ID, or old string into the official #GRPX-X-A... standard
 */
export function formatDisplayInvoiceId(rawId: string | null | undefined, branch?: string | null | undefined): string {
  if (!rawId) {
    const code = getBranchCode(branch);
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

  // If old CMTPQ / CHTP / CUID format, derive branch code and fallback number
  const code = getBranchCode(branch);
  return clean.startsWith('#') ? clean : `#${clean}`;
}
