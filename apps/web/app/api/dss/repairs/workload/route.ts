import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';

export const dynamic = 'force-dynamic';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'phone', 'device', 'broken', 'problem', 'issue', 'repair', 'unit', 'not', 'working',
]);

function extractKeywords(text?: string | null): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && session.role !== 'ADMIN' && session.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedBranch = searchParams.get('branch') || (isSuperAdmin ? 'all' : (session.branch || 'Tagoloan'));
    const diagDaysRaw = parseInt(searchParams.get('diagnosticDays') || '2', 10);
    const diagnosticDays = Number.isFinite(diagDaysRaw) ? Math.min(30, Math.max(1, diagDaysRaw)) : 2;
    const repairDaysRaw = parseInt(searchParams.get('repairingDays') || '3', 10);
    const repairingDays = Number.isFinite(repairDaysRaw) ? Math.min(30, Math.max(1, repairDaysRaw)) : 3;

    const effectiveBranch = isSuperAdmin ? requestedBranch : (session.branch || 'Tagoloan');
    const branchWhere =
      effectiveBranch === 'all'
        ? {}
        : { branch: { equals: effectiveBranch, mode: 'insensitive' as const } };

    const [activeRepairs, inStockParts] = await Promise.all([
      prisma.repairRequest.findMany({
        where: {
          ...branchWhere,
          progress: { notIn: ['Completed', 'Released'] },
          status: { notIn: ['Cancelled', 'Deleted'] },
        },
        include: {
          timeline: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.sparePart.findMany({
        where: {
          ...branchWhere,
          stock: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          compatibleDevice: true,
          category: true,
          branch: true,
          stock: true,
          price: true,
        },
      }),
    ]);

    const nowMs = Date.now();
    const flaggedRepairs: any[] = [];
    const techMap = new Map<string, {
      technician: string;
      branch: string;
      activeCount: number;
      diagnosticCount: number;
      repairingCount: number;
      flaggedCount: number;
    }>();

    let stalledDiagnosticCount = 0;
    let stalledRepairingCount = 0;
    let unassignedCount = 0;
    let partReadyCount = 0;

    for (const repair of activeRepairs) {
      const progressLower = (repair.progress || '').toLowerCase();
      const isDiagnostic = progressLower.includes('diag');
      const isRepairing = progressLower.includes('repair') || progressLower.includes('progress');
      const lastTimelineAt = repair.timeline?.[0]?.createdAt || repair.updatedAt || repair.createdAt;

      const daysOpen = Math.floor((nowMs - new Date(repair.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceUpdate = Math.floor((nowMs - new Date(lastTimelineAt).getTime()) / (1000 * 60 * 60 * 24));

      // Check matching in-stock spare parts at the same branch
      const deviceTokens = extractKeywords(repair.deviceName);
      const causeTokens = extractKeywords(`${repair.cause || ''} ${repair.materials || ''}`);
      const branchParts = inStockParts.filter(
        (p) => p.branch.toLowerCase() === (repair.branch || 'Tagoloan').toLowerCase()
      );

      const matchingParts = branchParts.filter((part) => {
        const partText = `${part.name} ${part.compatibleDevice || ''} ${part.category || ''}`.toLowerCase();
        const deviceMatch = deviceTokens.length > 0 && deviceTokens.some((t) => partText.includes(t));
        const causeMatch = causeTokens.length > 0 && causeTokens.some((t) => partText.includes(t));
        // If cause mentions screen/lcd/battery/charging, match category or name + device if possible
        return (deviceMatch && causeMatch) || (deviceMatch && causeTokens.length === 0) || (causeMatch && partText.includes('lcd') && `${repair.cause || ''}`.toLowerCase().includes('lcd'));
      });

      const flags: Array<{ code: string; label: string; severity: 'HIGH' | 'MEDIUM' }> = [];

      if (isDiagnostic && daysSinceUpdate >= diagnosticDays) {
        stalledDiagnosticCount++;
        flags.push({
          code: 'STALLED_DIAGNOSTIC',
          label: `In Diagnostic for ${daysSinceUpdate}d without update`,
          severity: 'HIGH',
        });
      } else if (isRepairing && daysSinceUpdate >= repairingDays) {
        stalledRepairingCount++;
        flags.push({
          code: 'STALLED_REPAIRING',
          label: `In Repairing for ${daysSinceUpdate}d without update`,
          severity: 'HIGH',
        });
      }

      if (!repair.technician || !repair.technician.trim()) {
        unassignedCount++;
        flags.push({
          code: 'UNASSIGNED',
          label: 'No technician assigned',
          severity: 'MEDIUM',
        });
      }

      const hasMatchingPartInStock = matchingParts.length > 0;
      if (flags.length > 0 && hasMatchingPartInStock) {
        partReadyCount++;
      }

      // Technician workload aggregation
      const techName = repair.technician?.trim() || 'Unassigned';
      const techKey = `${techName}::${repair.branch}`;
      const existingTech = techMap.get(techKey) || {
        technician: techName,
        branch: repair.branch,
        activeCount: 0,
        diagnosticCount: 0,
        repairingCount: 0,
        flaggedCount: 0,
      };
      existingTech.activeCount++;
      if (isDiagnostic) existingTech.diagnosticCount++;
      if (isRepairing) existingTech.repairingCount++;
      if (flags.length > 0) existingTech.flaggedCount++;
      techMap.set(techKey, existingTech);

      if (flags.length > 0) {
        const primaryFlag = flags[0]!;
        const topPart = matchingParts[0];
        const partNote = topPart
          ? ` Matching spare part is in stock (${topPart.name}: ${topPart.stock} left).`
          : '';
        flaggedRepairs.push({
          id: repair.id,
          deviceName: repair.deviceName,
          ownerName: repair.ownerName || 'Walk-in Customer',
          branch: repair.branch,
          progress: repair.progress,
          technician: repair.technician || 'Unassigned',
          cause: repair.cause || 'Not specified',
          createdAt: repair.createdAt,
          lastUpdatedAt: lastTimelineAt,
          daysOpen,
          daysSinceUpdate,
          priority: primaryFlag.severity,
          flags,
          hasMatchingPartInStock,
          matchingParts: matchingParts.slice(0, 3).map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            price: p.price,
          })),
          recommendation: `${primaryFlag.label}.${partNote} Flagged for technician/admin review (status not changed automatically).`,
        });
      }
    }

    flaggedRepairs.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'HIGH' ? -1 : 1;
      if (a.hasMatchingPartInStock !== b.hasMatchingPartInStock) return a.hasMatchingPartInStock ? -1 : 1;
      return b.daysSinceUpdate - a.daysSinceUpdate;
    });

    const technicianWorkload = Array.from(techMap.values()).sort(
      (a, b) => b.activeCount - a.activeCount
    );

    return NextResponse.json({
      summary: {
        totalActive: activeRepairs.length,
        flaggedCount: flaggedRepairs.length,
        stalledDiagnosticCount,
        stalledRepairingCount,
        unassignedCount,
        partReadyCount,
        diagnosticDays,
        repairingDays,
        scopeBranch: effectiveBranch,
      },
      flaggedRepairs,
      technicianWorkload,
    });
  } catch (error) {
    console.error('Error computing DSS repair workload:', error);
    return NextResponse.json({ error: 'Failed to compute repair workload analysis' }, { status: 500 });
  }
}

