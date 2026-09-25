export interface BranchStockItem {
  id?: string;
  branch: string;
  stock: number;
  sold?: number;
  deviceId: string;
  variationId?: string | null;
}

export interface DeviceVariationData {
  id: string;
  name: string;
  type?: string;
  price?: number;
  stock?: number;
  branchStocks?: BranchStockItem[];
}

export interface DeviceData {
  id: string;
  name: string;
  price?: number;
  stock?: number;
  branch?: string;
  isPreOwned?: boolean;
  branchStocks?: BranchStockItem[];
  variations?: DeviceVariationData[];
}

export interface OrderItemForAvailability {
  deviceId: string;
  deviceName?: string;
  quantity: number;
  variations?: any[] | null;
  device?: DeviceData | null;
}

export interface BranchAvailabilityResult {
  branchId: string;
  branchName: string;
  displayName: string;
  isAvailable: boolean;
  reason: string | null;
  itemBreakdown: Array<{
    deviceId: string;
    deviceName: string;
    requestedQuantity: number;
    availableStock: number;
    isSufficient: boolean;
    reason: string | null;
  }>;
}

export function cleanBranchName(name: string): string {
  if (!name) return 'Tagoloan';
  return name.replace(/\s*Branch$/i, '').trim();
}

/**
 * Calculates available stock for a specific device item at a specific branch
 */
export function getBranchStockForItem(
  device: DeviceData,
  selectedVariations: any[] | null | undefined,
  branchName: string
): number {
  const targetBranch = cleanBranchName(branchName).toLowerCase();
  const branchStocks = device.branchStocks || [];

  // If variations are selected
  if (selectedVariations && Array.isArray(selectedVariations) && selectedVariations.length > 0) {
    const variationStocks: number[] = [];

    for (const v of selectedVariations) {
      const varId = v.id || v;
      // 1. Look for matching BranchStock record for this variation
      const matchingBranchStock = branchStocks.find(
        bs => bs.variationId === varId && cleanBranchName(bs.branch).toLowerCase() === targetBranch
      );

      if (matchingBranchStock !== undefined) {
        variationStocks.push(matchingBranchStock.stock);
      } else {
        // Look within variation's own nested branchStocks if present
        const varObj = device.variations?.find(dv => dv.id === varId);
        const nestedBs = varObj?.branchStocks?.find(
          bs => cleanBranchName(bs.branch).toLowerCase() === targetBranch
        );

        if (nestedBs !== undefined) {
          variationStocks.push(nestedBs.stock);
        } else if (cleanBranchName(device.branch || 'Tagoloan').toLowerCase() === targetBranch) {
          // Fallback to variation stock if this branch is device's default branch
          variationStocks.push(varObj?.stock ?? 0);
        } else {
          // No stock recorded for this branch
          variationStocks.push(0);
        }
      }
    }

    // Available stock for multi-variation combo is constrained by the minimum variation stock
    return variationStocks.length > 0 ? Math.min(...variationStocks) : 0;
  }

  // Device without variations
  // 1. Check device-level BranchStock where variationId is null or matching
  const matchingDeviceBranchStock = branchStocks.find(
    bs => (!bs.variationId || bs.variationId === null) && cleanBranchName(bs.branch).toLowerCase() === targetBranch
  );

  if (matchingDeviceBranchStock !== undefined) {
    return matchingDeviceBranchStock.stock;
  }

  // 2. Check if total variation stocks exist for this branch if device has variations but none explicitly selected
  if (device.variations && device.variations.length > 0) {
    const branchVarStocks = branchStocks
      .filter(bs => bs.variationId && cleanBranchName(bs.branch).toLowerCase() === targetBranch)
      .map(bs => bs.stock);

    if (branchVarStocks.length > 0) {
      return branchVarStocks.reduce((sum, s) => sum + s, 0);
    }
  }

  // 3. Fallback: If device default branch matches target branch
  if (cleanBranchName(device.branch || 'Tagoloan').toLowerCase() === targetBranch) {
    return device.stock || 0;
  }

  return 0;
}

/**
 * Checks availability of multiple order items across branches
 */
export function checkOrderAvailabilityAcrossBranches(
  items: OrderItemForAvailability[],
  branches: Array<{ id: string; name: string }>
): {
  branches: BranchAvailabilityResult[];
  hasAvailableBranch: boolean;
  firstAvailableBranch: string | null;
} {
  const results: BranchAvailabilityResult[] = branches.map(b => {
    const displayName = cleanBranchName(b.name);
    const fullName = b.name.includes('Branch') ? b.name : `${b.name} Branch`;
    const itemBreakdown: BranchAvailabilityResult['itemBreakdown'] = [];
    const reasons: string[] = [];

    for (const item of items) {
      if (!item.device) {
        itemBreakdown.push({
          deviceId: item.deviceId,
          deviceName: item.deviceName || 'Item',
          requestedQuantity: item.quantity,
          availableStock: 0,
          isSufficient: false,
          reason: `${item.deviceName || 'Item'} is unavailable.`
        });
        reasons.push(`${item.deviceName || 'Item'} is unavailable.`);
        continue;
      }

      const availableStock = getBranchStockForItem(item.device, item.variations, displayName);
      const isSufficient = availableStock >= item.quantity;
      const deviceLabel = item.deviceName || item.device.name;

      // Extract variation names if available for clear messaging
      let variationSuffix = '';
      if (item.variations && Array.isArray(item.variations) && item.variations.length > 0) {
        const varNames = item.variations.map((v: any) => v.name || v.value).filter(Boolean);
        if (varNames.length > 0) {
          variationSuffix = ` (${varNames.join(', ')})`;
        }
      }
      const fullItemName = `${deviceLabel}${variationSuffix}`;

      let itemReason: string | null = null;
      if (!isSufficient) {
        if (availableStock <= 0) {
          itemReason = `${fullItemName} is out of stock at this branch.`;
        } else {
          itemReason = `Only ${availableStock} ${availableStock === 1 ? 'unit' : 'units'} of ${fullItemName} ${availableStock === 1 ? 'is' : 'are'} available, but you requested ${item.quantity}.`;
        }
        reasons.push(itemReason);
      }

      itemBreakdown.push({
        deviceId: item.deviceId,
        deviceName: fullItemName,
        requestedQuantity: item.quantity,
        availableStock,
        isSufficient,
        reason: itemReason
      });
    }

    const isAvailable = itemBreakdown.every(i => i.isSufficient);

    return {
      branchId: b.id,
      branchName: fullName,
      displayName,
      isAvailable,
      reason: reasons.length > 0 ? reasons[0]! : null,
      itemBreakdown
    };
  });

  const availableBranches = results.filter(r => r.isAvailable);

  return {
    branches: results,
    hasAvailableBranch: availableBranches.length > 0,
    firstAvailableBranch: availableBranches.length > 0 ? availableBranches[0]!.branchName : null
  };
}
