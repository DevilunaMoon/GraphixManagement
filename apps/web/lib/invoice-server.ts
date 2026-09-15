import { prisma } from 'database';
import { getBranchCode } from './invoice';

/**
 * Server-only helper:
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
