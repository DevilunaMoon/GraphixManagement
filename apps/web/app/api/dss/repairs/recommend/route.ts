import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';

export const dynamic = 'force-dynamic';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'phone', 'device', 'unit', 'problem', 'issue', 'repair', 'not', 'working', 'very',
]);

function tokenize(str?: string | null): string[] {
  if (!str) return [];
  return Array.from(
    new Set(
      str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    )
  );
}

function parseCost(raw?: string | null): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function extractMaterialNames(materialsRaw?: string | null): string[] {
  if (!materialsRaw) return [];
  const trimmed = materialsRaw.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
      return list
        .map((item: any) => item?.description || item?.name || item?.partName || '')
        .filter((s: string) => Boolean(s && s.trim()));
    } catch {
      // fall through to plain text
    }
  }
  return trimmed
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const deviceName = (searchParams.get('deviceName') || '').trim();
    const cause = (searchParams.get('cause') || '').trim();
    const requestedBranch = searchParams.get('branch') || session.branch || 'Tagoloan';
    const effectiveBranch = session.role === 'SUPER_ADMIN' ? requestedBranch : (session.branch || 'Tagoloan');

    const deviceTokens = tokenize(deviceName);
    const causeTokens = tokenize(cause);

    if (deviceTokens.length === 0 && causeTokens.length === 0) {
      return NextResponse.json({
        query: { deviceName, cause, branch: effectiveBranch },
        similarRepairs: [],
        costRange: null,
        turnaroundRange: null,
        recommendedParts: [],
      });
    }

    const [completedRepairs, branchSpareParts] = await Promise.all([
      prisma.repairRequest.findMany({
        where: {
          progress: { in: ['Completed', 'Released'] },
          status: { notIn: ['Cancelled', 'Deleted'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 250,
        select: {
          id: true,
          deviceName: true,
          cause: true,
          materials: true,
          repairCost: true,
          branch: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.sparePart.findMany({
        where: {
          branch: { equals: effectiveBranch, mode: 'insensitive' },
        },
        orderBy: { stock: 'desc' },
      }),
    ]);

    // Score completed repairs by device + cause similarity
    const scoredRepairs = completedRepairs
      .map((r) => {
        const rDeviceTokens = tokenize(r.deviceName);
        const rCauseTokens = tokenize(r.cause);

        let deviceOverlap = 0;
        for (const t of deviceTokens) {
          if (rDeviceTokens.some((rt) => rt.includes(t) || t.includes(rt))) deviceOverlap++;
        }

        let causeOverlap = 0;
        for (const t of causeTokens) {
          if (rCauseTokens.some((rt) => rt.includes(t) || t.includes(rt))) causeOverlap++;
        }

        const score = deviceOverlap * 3 + causeOverlap * 2;
        return { repair: r, score, deviceOverlap, causeOverlap };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const costs: number[] = [];
    const turnaroundHoursList: number[] = [];
    const historicalPartCounts = new Map<string, number>();

    const similarRepairs = scoredRepairs.map(({ repair, score }) => {
      const costNum = parseCost(repair.repairCost);
      if (costNum !== null) costs.push(costNum);

      const hours = Math.max(
        1,
        Math.round(
          (new Date(repair.updatedAt).getTime() - new Date(repair.createdAt).getTime()) / (1000 * 60 * 60)
        )
      );
      turnaroundHoursList.push(hours);

      const partsUsed = extractMaterialNames(repair.materials);
      partsUsed.forEach((p) => {
        const key = p.toLowerCase();
        historicalPartCounts.set(key, (historicalPartCounts.get(key) || 0) + 1);
      });

      return {
        id: repair.id,
        deviceName: repair.deviceName,
        cause: repair.cause || 'General Repair',
        repairCost: costNum,
        turnaroundHours: hours,
        completedAt: repair.updatedAt,
        branch: repair.branch,
        partsUsed,
        matchScore: score,
      };
    });

    const costRange =
      costs.length > 0
        ? {
            min: Math.min(...costs),
            max: Math.max(...costs),
            average: Math.round(costs.reduce((s, c) => s + c, 0) / costs.length),
            sampleSize: costs.length,
          }
        : null;

    const turnaroundRange =
      turnaroundHoursList.length > 0
        ? {
            minHours: Math.min(...turnaroundHoursList),
            maxHours: Math.max(...turnaroundHoursList),
            averageHours: Math.round(
              turnaroundHoursList.reduce((s, h) => s + h, 0) / turnaroundHoursList.length
            ),
          }
        : null;

    // Match live branch spare parts against device + cause + historically used part names
    const historicalPartNames = Array.from(historicalPartCounts.keys());
    const recommendedParts = branchSpareParts
      .map((part) => {
        const partHaystack = `${part.name} ${part.compatibleDevice || ''} ${part.category || ''}`.toLowerCase();
        let score = 0;
        const reasons: string[] = [];

        if (deviceTokens.some((t) => partHaystack.includes(t))) {
          score += 3;
          reasons.push('Matches device model');
        }
        if (causeTokens.some((t) => partHaystack.includes(t))) {
          score += 3;
          reasons.push('Matches reported issue');
        }
        if (historicalPartNames.some((hp) => partHaystack.includes(hp) || hp.includes(part.name.toLowerCase()))) {
          score += 4;
          reasons.push('Used in similar completed repairs');
        }

        // Common keyword bridge: "screen" <-> "lcd", "battery" <-> "batt", "charging" <-> "port/flex"
        const causeLower = cause.toLowerCase();
        if (
          (causeLower.includes('screen') || causeLower.includes('lcd')) &&
          (partHaystack.includes('lcd') || partHaystack.includes('screen') || partHaystack.includes('oled'))
        ) {
          score += 2;
          if (!reasons.includes('Matches reported issue')) reasons.push('Matches display issue');
        }
        if (causeLower.includes('battery') && partHaystack.includes('batt')) {
          score += 2;
          if (!reasons.includes('Matches reported issue')) reasons.push('Matches battery issue');
        }
        if (causeLower.includes('charg') && (partHaystack.includes('charg') || partHaystack.includes('port') || partHaystack.includes('flex'))) {
          score += 2;
          if (!reasons.includes('Matches reported issue')) reasons.push('Matches charging issue');
        }

        return {
          id: part.id,
          name: part.name,
          category: part.category,
          compatibleDevice: part.compatibleDevice,
          stock: part.stock,
          price: part.price,
          inStock: part.stock > 0,
          branch: part.branch,
          matchReason: reasons.join(' • ') || 'Related spare part',
          score,
        };
      })
      .filter((p) => p.score >= 2)
      .sort((a, b) => b.score - a.score || b.stock - a.stock)
      .slice(0, 6);

    return NextResponse.json({
      query: { deviceName, cause, branch: effectiveBranch },
      similarRepairs,
      costRange,
      turnaroundRange,
      recommendedParts,
    });
  } catch (error) {
    console.error('Error computing DSS repair recommendations:', error);
    return NextResponse.json({ error: 'Failed to compute repair recommendations' }, { status: 500 });
  }
}

