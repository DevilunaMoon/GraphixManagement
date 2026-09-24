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
  if (
    !trimmed || 
    trimmed === '—' || 
    trimmed === '-' || 
    trimmed === 'null' || 
    trimmed === 'undefined' || 
    trimmed === '[]' || 
    trimmed === '{}'
  ) {
    return 'Standard';
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Array of variation objects (e.g. [{ type: 'Color', name: 'Red' }, { type: 'Storage', name: '128' }])
    if (Array.isArray(parsed)) {
      const labels: string[] = [];
      for (const item of parsed) {
        if (!item) continue;
        if (typeof item === 'string') {
          const cleanStr = item.trim();
          if (cleanStr && cleanStr !== '—' && cleanStr !== '-') labels.push(cleanStr);
        } else if (typeof item === 'object') {
          const type = (item.type || item.key || '').toLowerCase();
          let name = String(item.name ?? item.value ?? item.label ?? '').trim();
          if (!name || name === '—' || name === '-') continue;

          // If type is storage and name is numeric like "128" or "256", append "GB"
          if (type.includes('storage') && /^\d+$/.test(name)) {
            name = `${name}GB`;
          }
          labels.push(name);
        }
      }
      return labels.length > 0 ? labels.join(' • ') : 'Standard';
    }

    // Single object (e.g. { storage: '128GB', color: 'Red' })
    if (parsed && typeof parsed === 'object') {
      const labels: string[] = [];
      if (parsed.storage && parsed.storage !== '—' && parsed.storage !== '-') {
        let storage = String(parsed.storage).trim();
        if (/^\d+$/.test(storage)) storage = `${storage}GB`;
        labels.push(storage);
      }
      if (parsed.color && parsed.color !== '—' && parsed.color !== '-') {
        labels.push(String(parsed.color).trim());
      }
      if (parsed.name && !labels.includes(parsed.name) && parsed.name !== '—' && parsed.name !== '-') {
        labels.push(String(parsed.name).trim());
      }

      if (labels.length > 0) return labels.join(' • ');

      for (const val of Object.values(parsed)) {
        if (typeof val === 'string' && val !== '—' && val !== '-') labels.push(val.trim());
        else if (val && typeof val === 'object' && (val as any).name) labels.push(String((val as any).name).trim());
      }
      return labels.length > 0 ? labels.join(' • ') : 'Standard';
    }
  } catch {
    // If not valid JSON, clean up potential raw array/object fragments
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return 'Standard';
    }
    return trimmed;
  }

  return trimmed || 'Standard';
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
    variantSet: Set<string>;
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

    const deviceId = p.deviceId || p.device?.id || p.device?.name || 'unknown';
    const variantLabel = parseVariantLabel(p.variations);

    if (!branchAggregator[deviceId]) {
      const img = p.device?.image || (p.device?.images && p.device?.images[0]) || null;
      branchAggregator[deviceId] = {
        productId: deviceId,
        productModel: p.device?.name || 'Unknown Product',
        variantSet: new Set<string>(),
        condition: p.device?.isPreOwned ? 'Pre-Owned' : 'New',
        image: img,
        unitsSold: 0,
        totalRevenue: 0
      };
    }

    const item = branchAggregator[deviceId];
    if (item) {
      item.unitsSold += units;
      item.totalRevenue += revenue;
      if (variantLabel && variantLabel !== 'Standard') {
        item.variantSet.add(variantLabel);
      }
    }
  });

  allowedBranches.forEach(b => {
    const branchSummary = branchMap[b];
    const branchAggregator = productAggregators[b];
    if (!branchSummary || !branchAggregator) return;

    const prods = Object.values(branchAggregator);
    // Sort descending by units sold, then total revenue
    prods.sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue);

    const branchTotalUnits = branchSummary.totalUnitsSold;
    branchSummary.products = prods.map((prod, idx) => {
      const variantList = Array.from(prod.variantSet);
      const displayVariant = variantList.length > 0 ? variantList.join(', ') : 'Standard';

      return {
        rank: idx + 1,
        productId: prod.productId,
        productModel: prod.productModel,
        variant: displayVariant,
        condition: prod.condition,
        image: prod.image,
        unitsSold: prod.unitsSold,
        totalRevenue: prod.totalRevenue,
        percentage: branchTotalUnits > 0 ? Math.round((prod.unitsSold / branchTotalUnits) * 100) : 0
      };
    });
  });

  return branchMap;
}
