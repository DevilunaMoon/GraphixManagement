export interface BestSellerProduct {
  rank: number;
  productId: string;
  productModel: string;
  variant: string;
  condition: 'New' | 'Pre-Owned';
  image: string | null;
  unitsSold: number;
  totalRevenue: number;
  percentage: number;
}

export interface BranchBestSellersSummary {
  branch: string;
  totalUnitsSold: number;
  totalRevenue: number;
  totalOrders: number;
  products: BestSellerProduct[];
}

export function parseVariantLabel(variations: string | null | undefined): string {
  if (!variations) return 'Standard';
  const trimmed = variations.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const parts: string[] = [];
      if (parsed.storage && parsed.storage !== '—') parts.push(parsed.storage);
      if (parsed.color && parsed.color !== '—') parts.push(parsed.color);
      if (parsed.name && !parts.includes(parsed.name)) parts.push(parsed.name);
      return parts.length > 0 ? parts.join(' • ') : 'Standard';
    } catch {
      return variations;
    }
  }
  return variations;
}

export function calculateBranchBestSellers(
  purchasesList: Array<{
    id: string;
    amount?: number | null;
    quantity?: number | null;
    branch?: string | null;
    variations?: string | null;
    deviceId?: string | null;
    device?: {
      id?: string;
      name?: string | null;
      image?: string | null;
      images?: string[] | null;
      isPreOwned?: boolean | null;
      price?: number | null;
    } | null;
  }>,
  allowedBranches: string[]
): Record<string, BranchBestSellersSummary> {
  const branchMap: Record<string, BranchBestSellersSummary> = {};

  allowedBranches.forEach(b => {
    branchMap[b] = {
      branch: b,
      totalUnitsSold: 0,
      totalRevenue: 0,
      totalOrders: 0,
      products: []
    };
  });

  const productAggregators: Record<string, Record<string, {
    productId: string;
    productModel: string;
    variant: string;
    condition: 'New' | 'Pre-Owned';
    image: string | null;
    unitsSold: number;
    totalRevenue: number;
  }>> = {};

  allowedBranches.forEach(b => {
    productAggregators[b] = {};
  });

  purchasesList.forEach(p => {
    const rawBranch = p.branch || 'Tagoloan';
    const matchBranch = allowedBranches.find(b => b.toLowerCase() === rawBranch.toLowerCase());
    if (!matchBranch) return;

    const branchSummary = branchMap[matchBranch];
    const branchAggregator = productAggregators[matchBranch];
    if (!branchSummary || !branchAggregator) return;

    const units = p.quantity || 1;
    const revenue = p.amount || 0;

    branchSummary.totalUnitsSold += units;
    branchSummary.totalRevenue += revenue;
    branchSummary.totalOrders += 1;

    const deviceId = p.deviceId || p.device?.id || 'unknown';
    const variantLabel = parseVariantLabel(p.variations);
    const key = `${deviceId}__${variantLabel}`;

    if (!branchAggregator[key]) {
      const img = p.device?.image || (p.device?.images && p.device?.images[0]) || null;
      branchAggregator[key] = {
        productId: deviceId,
        productModel: p.device?.name || 'Unknown Product',
        variant: variantLabel,
        condition: p.device?.isPreOwned ? 'Pre-Owned' : 'New',
        image: img,
        unitsSold: 0,
        totalRevenue: 0
      };
    }

    const item = branchAggregator[key];
    if (item) {
      item.unitsSold += units;
      item.totalRevenue += revenue;
    }
  });

  allowedBranches.forEach(b => {
    const branchSummary = branchMap[b];
    const branchAggregator = productAggregators[b];
    if (!branchSummary || !branchAggregator) return;

    const prods = Object.values(branchAggregator);
    prods.sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue);

    const branchTotalUnits = branchSummary.totalUnitsSold;
    branchSummary.products = prods.map((prod, idx) => ({
      rank: idx + 1,
      ...prod,
      percentage: branchTotalUnits > 0 ? Math.round((prod.unitsSold / branchTotalUnits) * 100) : 0
    }));
  });

  return branchMap;
}
