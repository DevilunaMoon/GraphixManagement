import { prisma } from 'database';

/**
 * Generate a unique branch-specific and year-specific internal Question/Support ID.
 * Format: QST-[BRANCH CODE][YY]-[LETTER][NUMBER]
 * Examples:
 *   Tagoloan (2026): QST-T26-A1 .. QST-T26-A10, QST-T26-B1
 *   Villanueva (2026): QST-V26-A1
 *   Jasaan (2026): QST-J26-A1
 * 
 * IMPORTANT: This ID is strictly an internal database identifier and MUST NOT be
 * displayed anywhere in the UI.
 */
export async function generateQuestionId(branchName: string, date: Date = new Date()): Promise<string> {
  const normalizedBranch = (branchName || 'Tagoloan').trim().toLowerCase();
  
  let branchCode = 'T';
  if (normalizedBranch.startsWith('v')) {
    branchCode = 'V';
  } else if (normalizedBranch.startsWith('j')) {
    branchCode = 'J';
  } else if (normalizedBranch.startsWith('t')) {
    branchCode = 'T';
  } else {
    branchCode = (branchName.trim()[0] || 'T').toUpperCase();
  }

  const fullYear = date.getFullYear();
  const year2Digit = String(fullYear).slice(-2); // "26" for 2026

  // Use a transaction or atomic upsert to ensure no duplicate sequences
  let seqNumber = 1;
  try {
    const sequence = await prisma.$transaction(async (tx) => {
      const existing = await tx.questionSequence.findUnique({
        where: {
          branchCode_year: {
            branchCode,
            year: fullYear,
          },
        },
      });

      if (!existing) {
        return await tx.questionSequence.create({
          data: {
            branchCode,
            year: fullYear,
            lastNumber: 1,
          },
        });
      } else {
        return await tx.questionSequence.update({
          where: {
            branchCode_year: {
              branchCode,
              year: fullYear,
            },
          },
          data: {
            lastNumber: {
              increment: 1,
            },
          },
        });
      }
    });

    seqNumber = sequence.lastNumber;
  } catch (err) {
    console.error('Sequence transaction fallback for question ID:', err);
    // Fallback count in case of table transaction error
    const count = await prisma.customerQuestion.count({
      where: {
        branchName: {
          startsWith: branchName,
          mode: 'insensitive',
        },
        createdAt: {
          gte: new Date(fullYear, 0, 1),
          lt: new Date(fullYear + 1, 0, 1),
        },
      },
    });
    seqNumber = count + 1;
  }

  // Calculate [LETTER][NUMBER]
  // 1 -> A1, 10 -> A10, 11 -> B1, 20 -> B10, 21 -> C1
  const zeroIndex = Math.max(0, seqNumber - 1);
  const letterIndex = Math.floor(zeroIndex / 10);
  const letter = String.fromCharCode(65 + (letterIndex % 26)); // A-Z
  const num = (zeroIndex % 10) + 1; // 1-10

  return `QST-${branchCode}${year2Digit}-${letter}${num}`;
}
