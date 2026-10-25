export const STORE_PAPER_RECEIPTS: any[] = [];

export function extractRepairCost(repair: {
  repairCost?: string | null;
  materials?: string | null;
  downpayment?: string | null;
}): { totalCost: number; downpaymentAmount: number } {
  let totalCost = 0;
  if (repair.repairCost) {
    totalCost = parseFloat(repair.repairCost.replace(/[^0-9.]/g, '')) || 0;
  }

  if (totalCost === 0 && repair.materials) {
    try {
      const mats = JSON.parse(repair.materials);
      if (mats && typeof mats === 'object') {
        const itemsSum = Array.isArray(mats.items)
          ? mats.items.reduce(
              (acc: number, item: any) =>
                acc +
                (parseFloat(
                  item.total || (item.unitPrice || item.price || item.cost || 0) * (item.qty || item.quantity || 1)
                ) || 0),
              0
            )
          : 0;
        if (itemsSum > 0) totalCost = itemsSum;
      }
    } catch {
      // Ignore JSON error
    }
  }

  let downpaymentAmount = 0;
  if (repair.downpayment) {
    downpaymentAmount = parseFloat(repair.downpayment.replace(/[^0-9.]/g, '')) || 0;
  } else if (totalCost > 0) {
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
