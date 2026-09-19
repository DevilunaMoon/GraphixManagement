import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { logActivity } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');

    const activeBranch = isSuperAdmin
      ? (branchParam === 'all' ? undefined : (branchParam || undefined))
      : (session.branch || 'Tagoloan');

    const where: any = {
      discount: { gt: 0 }
    };

    if (activeBranch) {
      where.OR = [
        { branch: { equals: activeBranch, mode: 'insensitive' } },
        { branchStocks: { some: { branch: { equals: activeBranch, mode: 'insensitive' }, stock: { gt: 0 } } } }
      ];
    }

    const devices = await prisma.device.findMany({
      where,
      include: {
        category: true,
        variations: true,
        branchStocks: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const now = new Date();
    const formattedDiscounts = devices.map(d => {
      const isScheduled = d.discountStartDate && new Date(d.discountStartDate) > now;
      const isExpired = d.discountEndDate && new Date(d.discountEndDate) < now;
      const isActive = d.discount > 0 && !isScheduled && !isExpired;

      let status = 'Active';
      if (isExpired) status = 'Expired';
      else if (isScheduled) status = 'Scheduled';
      else if (d.discount <= 0) status = 'Deactivated';

      const originalPrice = d.price;
      const discountAmount = originalPrice * (d.discount / 100);
      const discountedPrice = Math.max(0, originalPrice - discountAmount);

      return {
        id: d.id,
        deviceId: d.id,
        deviceName: d.name,
        brand: d.category?.name || 'Brand',
        image: d.image || d.images?.[0] || null,
        isPreOwned: d.isPreOwned,
        branch: d.branch,
        originalPrice,
        discountPercent: d.discount,
        discountAmount,
        discountedPrice,
        startDate: d.discountStartDate,
        endDate: d.discountEndDate,
        status,
        isActive,
        isScheduled,
        isExpired
      };
    });

    return NextResponse.json({ discounts: formattedDiscounts }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error: any) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch discounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const body = await req.json();
    const {
      deviceId,
      variantId,
      branch,
      discountType = 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
      discountValue,
      discountStartDate,
      discountEndDate
    } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Please select a product.' }, { status: 400 });
    }

    const numValue = parseFloat(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json({ error: 'Please enter a valid positive discount value.' }, { status: 400 });
    }

    if (!discountStartDate || !discountEndDate) {
      return NextResponse.json({ error: 'Start date/time and End date/time are required.' }, { status: 400 });
    }

    const startDateTime = new Date(discountStartDate);
    const endDateTime = new Date(discountEndDate);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date or time format provided.' }, { status: 400 });
    }

    if (startDateTime >= endDateTime) {
      return NextResponse.json({ error: 'Start date and time must be earlier than End date and time.' }, { status: 400 });
    }

    // Fetch device to validate existence and calculate prices
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { variations: true, category: true }
    });

    if (!device) {
      return NextResponse.json({ error: 'Selected product not found.' }, { status: 404 });
    }

    // RBAC: Branch Admin can only discount devices belonging to their branch
    if (!isSuperAdmin) {
      const userBranch = session.branch || 'Tagoloan';
      if (device.branch && device.branch.toLowerCase() !== userBranch.toLowerCase()) {
        return NextResponse.json({ error: `Permission denied. You can only manage discounts for ${userBranch} Branch.` }, { status: 403 });
      }
    }

    // Determine target price (variant or base device)
    let targetPrice = device.price;
    let selectedVariant = null;
    if (variantId) {
      selectedVariant = device.variations.find(v => v.id === variantId);
      if (selectedVariant && selectedVariant.price > 0) {
        targetPrice = selectedVariant.price;
      }
    }

    let calculatedDiscountPercent = 0;
    let calculatedDiscountAmount = 0;
    let finalDiscountedPrice = 0;

    if (discountType === 'FIXED') {
      // Rule 5: Fixed discount must be LESS THAN ₱2,000
      if (numValue >= 2000) {
        return NextResponse.json({ error: 'Fixed discount amount must be less than ₱2,000.' }, { status: 400 });
      }

      if (numValue >= targetPrice) {
        return NextResponse.json({ error: 'Discount amount cannot be equal to or greater than the original price.' }, { status: 400 });
      }

      calculatedDiscountAmount = numValue;
      calculatedDiscountPercent = (numValue / targetPrice) * 100;
      finalDiscountedPrice = targetPrice - numValue;
    } else {
      // Percentage (%)
      if (numValue <= 0 || numValue >= 100) {
        return NextResponse.json({ error: 'Discount percentage must be between 1% and 99%.' }, { status: 400 });
      }

      calculatedDiscountPercent = numValue;
      calculatedDiscountAmount = targetPrice * (numValue / 100);
      finalDiscountedPrice = targetPrice - calculatedDiscountAmount;
    }

    if (finalDiscountedPrice <= 0) {
      return NextResponse.json({ error: 'Final discounted price must be greater than ₱0.' }, { status: 400 });
    }

    // Update Device record
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: {
        discount: calculatedDiscountPercent,
        discountStartDate: startDateTime,
        discountEndDate: endDateTime
      }
    });

    // If variant specified, sync variant price discount if needed
    if (variantId && selectedVariant) {
      await prisma.deviceVariation.update({
        where: { id: variantId },
        data: {
          price: selectedVariant.price // keep original variant price in db
        }
      });
    }

    const operatingBranch = isSuperAdmin ? (branch || device.branch || 'Tagoloan') : (session.branch || 'Tagoloan');

    await logActivity({
      action: 'ADD_DISCOUNT',
      description: `Applied ${discountType === 'FIXED' ? `₱${numValue.toLocaleString()}` : `${numValue}%`} discount on "${device.name}" (${operatingBranch})`,
      details: JSON.stringify({
        deviceId: device.id,
        deviceName: device.name,
        originalPrice: targetPrice,
        discountType,
        discountValue: numValue,
        discountedPrice: finalDiscountedPrice,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        branch: operatingBranch
      }),
      branch: operatingBranch,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({
      success: true,
      message: `Discount successfully applied to ${device.name}.`,
      device: updatedDevice,
      summary: {
        originalPrice: targetPrice,
        discountAmount: calculatedDiscountAmount,
        discountedPrice: finalDiscountedPrice,
        discountPercent: calculatedDiscountPercent,
        startDate: startDateTime,
        endDate: endDateTime
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error applying discount:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply discount' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    if (!isSuperAdmin) {
      const userBranch = session.branch || 'Tagoloan';
      if (device.branch && device.branch.toLowerCase() !== userBranch.toLowerCase()) {
        return NextResponse.json({ error: `Permission denied. You can only manage discounts for ${userBranch} Branch.` }, { status: 403 });
      }
    }

    await prisma.device.update({
      where: { id: deviceId },
      data: {
        discount: 0,
        discountStartDate: null,
        discountEndDate: null
      }
    });

    await logActivity({
      action: 'REMOVE_DISCOUNT',
      description: `Removed discount from "${device.name}"`,
      details: JSON.stringify({ deviceId: device.id, deviceName: device.name }),
      branch: device.branch || session.branch || 'Tagoloan',
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({ success: true, message: 'Discount removed successfully.' });
  } catch (error: any) {
    console.error('Error removing discount:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove discount' }, { status: 500 });
  }
}
