export const STORE_PAPER_RECEIPTS: any[] = [];

export function extractRepairCost(repair: {
  repairCost?: string | number | null;
  materials?: string | null;
  downpayment?: string | number | null;
  price?: string | number | null;
  cost?: string | number | null;
}): { totalCost: number; downpaymentAmount: number } {
  let totalCost = 0;

  // 1. Direct repairCost
  if (repair.repairCost !== null && repair.repairCost !== undefined) {
    const cleaned = String(repair.repairCost).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      totalCost = parsed;
    }
  }

  // 2. Direct price or cost fields
  if (totalCost === 0 && (repair.price || repair.cost)) {
    const raw = repair.price || repair.cost;
    const cleaned = String(raw).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      totalCost = parsed;
    }
  }

  // 3. Materials JSON parsing
  if (repair.materials) {
    try {
      const mats = typeof repair.materials === 'string' ? JSON.parse(repair.materials) : repair.materials;
      if (mats && typeof mats === 'object') {
        const rawItems = Array.isArray(mats.items) ? mats.items : (Array.isArray(mats) ? mats : []);
        const itemsSum = rawItems.reduce((acc: number, item: any) => {
          const qty = Math.max(1, parseInt(String(item.qty || item.quantity || 1), 10) || 1);
          const unitPrice = Math.max(0, parseFloat(String(item.unitPrice ?? item.price ?? item.cost ?? 0).replace(/[^0-9.]/g, '')) || 0);
          const itemTotal = parseFloat(String(item.total).replace(/[^0-9.]/g, ''));
          const lineTotal = !isNaN(itemTotal) && itemTotal > 0 ? itemTotal : (qty * unitPrice);
          return acc + (isNaN(lineTotal) ? 0 : lineTotal);
        }, 0);

        if (itemsSum > 0) {
          if (totalCost === 0 || itemsSum > totalCost) {
            totalCost = itemsSum;
          }
        }

        // Check totalPaid / cashAmount / gcashAmount recorded in materials
        const matTotalPaid = parseFloat(String(mats.totalPaid || mats.total || 0).replace(/[^0-9.]/g, '')) || 0;
        const matCash = parseFloat(String(mats.cashAmount || 0).replace(/[^0-9.]/g, '')) || 0;
        const matGcash = parseFloat(String(mats.gcashAmount || 0).replace(/[^0-9.]/g, '')) || 0;
        const matCombined = matCash + matGcash;

        if (totalCost === 0) {
          if (matTotalPaid > 0) totalCost = matTotalPaid;
          else if (matCombined > 0) totalCost = matCombined;
        }
      }
    } catch {
      // Ignore JSON error
    }
  }

  // 4. Downpayment calculation
  let downpaymentAmount = 0;
  if (repair.downpayment !== null && repair.downpayment !== undefined) {
    const cleaned = String(repair.downpayment).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      downpaymentAmount = parsed;
    }
  }

  // If totalCost is still 0, but downpayment/cash paid was recorded, totalCost must at least equal that
  if (totalCost === 0 && downpaymentAmount > 0) {
    totalCost = downpaymentAmount;
  }

  if (downpaymentAmount === 0 && totalCost > 0) {
    downpaymentAmount = totalCost / 2;
  }

  return { totalCost, downpaymentAmount };
}

export type NormalizedRepairStatus = 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Cancelled';

export function normalizeRepairStatus(status?: string | null, progress?: string | null): NormalizedRepairStatus {
  const p = (progress || '').trim().toLowerCase();
  const s = (status || '').trim().toLowerCase();

  if (p === 'cancelled' || s === 'cancelled') return 'Cancelled';
  if (p === 'completed' || p === '100%' || s === 'completed') return 'Completed';
  if (
    p === 'diagnostic' ||
    p === 'repairing' ||
    p === 'in progress' ||
    p === '25%' ||
    p === '50%' ||
    p === '75%'
  ) {
    return 'In Progress';
  }
  if (p === 'accepted' || s === 'accepted') return 'Accepted';
  if (p === 'pending' || s === 'pending') return 'Pending';

  // Default fallback
  if (s === 'active' && p) {
    if (p === 'accepted') return 'Accepted';
    if (p === 'completed') return 'Completed';
    return 'In Progress';
  }
  return 'Pending';
}
