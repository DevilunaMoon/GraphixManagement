import { prisma } from 'database';

export interface ParsedSparePartUsage {
  sparePartId: string;
  qty: number;
  description: string;
}

/**
 * Extracts items picked from the spare parts inventory (items containing a non-empty `sparePartId`).
 */
export function extractSparePartItems(materialsRaw?: string | null): ParsedSparePartUsage[] {
  if (!materialsRaw) return [];
  try {
    const parsed = typeof materialsRaw === 'string' ? JSON.parse(materialsRaw) : materialsRaw;
    const rawItems = Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed)
      ? parsed
      : [];

    const aggregated = new Map<string, ParsedSparePartUsage>();
    for (const item of rawItems) {
      const spId = item?.sparePartId ? String(item.sparePartId).trim() : '';
      if (!spId) continue;
      const qty = Math.max(0, parseInt(String(item.qty ?? item.quantity ?? 1), 10) || 0);
      if (qty <= 0) continue;

      const existing = aggregated.get(spId);
      if (existing) {
        existing.qty += qty;
      } else {
        aggregated.set(spId, {
          sparePartId: spId,
          qty,
          description: String(item.description || item.name || 'Spare Part').trim(),
        });
      }
    }
    return Array.from(aggregated.values());
  } catch {
    return [];
  }
}

/**
 * Deducts newly used spare part quantities from `prisma.sparePart` and notifies ONLY
 * active Branch Admin(s) assigned to `branch` (Super Admin is intentionally NOT notified).
 */
export async function processSparePartUsageAndNotify(params: {
  newMaterialsRaw?: string | null;
  previousMaterialsRaw?: string | null;
  branch: string;
  deviceName: string;
  ownerName?: string | null;
  technicianName?: string | null;
  technicianUserId?: string;
}) {
  const {
    newMaterialsRaw,
    previousMaterialsRaw,
    branch,
    deviceName,
    ownerName,
    technicianName,
    technicianUserId,
  } = params;

  const newItems = extractSparePartItems(newMaterialsRaw);
  if (newItems.length === 0) return;

  const prevItems = extractSparePartItems(previousMaterialsRaw);
  const prevQtyMap = new Map<string, number>();
  for (const p of prevItems) {
    prevQtyMap.set(p.sparePartId, p.qty);
  }

  // Compute newly added or increased quantities only (prevents double-deduction on edits)
  const newlyUsed: ParsedSparePartUsage[] = [];
  for (const item of newItems) {
    const prevQty = prevQtyMap.get(item.sparePartId) || 0;
    const delta = item.qty - prevQty;
    if (delta > 0) {
      newlyUsed.push({
        sparePartId: item.sparePartId,
        qty: delta,
        description: item.description,
      });
    }
  }

  if (newlyUsed.length === 0) return;

  const operatingBranch = (branch || 'Tagoloan').trim();
  const usedSummaryParts: string[] = [];

  // 1. Deduct stock safely for each newly used spare part
  for (const used of newlyUsed) {
    try {
      const part = await prisma.sparePart.findUnique({
        where: { id: used.sparePartId },
        select: { id: true, name: true, stock: true },
      });

      if (part) {
        const nextStock = Math.max(0, (part.stock || 0) - used.qty);
        const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock < 5 ? 'Low Stock' : 'In Stock';

        await prisma.sparePart.update({
          where: { id: part.id },
          data: {
            stock: nextStock,
            status: nextStatus,
          },
        });

        usedSummaryParts.push(`${used.qty}x ${part.name}`);
      } else {
        usedSummaryParts.push(`${used.qty}x ${used.description}`);
      }
    } catch (err) {
      console.error(`Failed to deduct spare part ${used.sparePartId}:`, err);
      usedSummaryParts.push(`${used.qty}x ${used.description}`);
    }
  }

  // 2. Resolve technician display name
  let resolvedTechName = (technicianName || '').trim();
  if (!resolvedTechName && technicianUserId) {
    try {
      const techUser = await prisma.user.findUnique({
        where: { id: technicianUserId },
        select: { name: true, email: true },
      });
      resolvedTechName = techUser?.name || techUser?.email || 'Technician';
    } catch {
      resolvedTechName = 'Technician';
    }
  }
  if (!resolvedTechName) resolvedTechName = 'Technician';

  // 3. Notify ONLY active Branch Admin(s) of the technician's assigned branch (NOT Super Admin)
  try {
    const branchAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        branch: { equals: operatingBranch, mode: 'insensitive' },
        status: 'Active',
      },
      select: { id: true },
    });

    if (branchAdmins.length === 0) return;

    const partsSummary = usedSummaryParts.join(', ');
    const customerLabel = ownerName && ownerName.trim() ? ownerName.trim() : 'Walk-in Customer';
    const message = `Technician ${resolvedTechName} used spare part(s) (${partsSummary}) for ${deviceName} (Customer: ${customerLabel}) at ${operatingBranch} Branch.`;

    await prisma.notification.createMany({
      data: branchAdmins.map((admin) => ({
        userId: admin.id,
        title: 'Spare Parts Used in Repair',
        message,
        type: 'SPARE_PART_USED',
        branch: operatingBranch,
        isRead: false,
      })),
    });
  } catch (notifErr) {
    console.error('Failed to notify branch admins of spare part usage:', notifErr);
  }
}

