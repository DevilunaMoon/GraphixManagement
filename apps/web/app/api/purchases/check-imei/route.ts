import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { validateImeiFormat } from '../../../../lib/imei';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawImei = searchParams.get('imei')?.trim() || '';
    const currentPurchaseId = searchParams.get('purchaseId')?.trim() || '';

    if (!rawImei) {
      return NextResponse.json({ error: 'IMEI query parameter is required' }, { status: 400 });
    }

    const validation = validateImeiFormat(rawImei);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        validFormat: false,
        error: validation.error || 'Invalid 15-digit IMEI format'
      });
    }

    const cleanImei = validation.cleanImei;

    // 1. Check if IMEI is already assigned to another purchase
    const duplicatePurchase = await prisma.purchase.findFirst({
      where: {
        imei: { contains: cleanImei },
        ...(currentPurchaseId ? { id: { not: currentPurchaseId } } : {})
      },
      include: {
        device: { select: { name: true } },
        user: { select: { name: true, phone: true } }
      }
    });

    if (duplicatePurchase) {
      return NextResponse.json({
        available: false,
        validFormat: true,
        conflict: {
          type: 'PURCHASE',
          orderRef: duplicatePurchase.referenceId || `#CMTPQ${duplicatePurchase.id.slice(-5).toUpperCase()}`,
          deviceName: duplicatePurchase.device?.name || 'Device',
          customerName: duplicatePurchase.user?.name || 'Customer',
          branch: duplicatePurchase.branch || 'Branch',
          status: duplicatePurchase.status
        }
      });
    }

    // 2. Check if IMEI is recorded in DeviceUnit inventory table as Sold
    const registeredUnit = await prisma.deviceUnit.findUnique({
      where: { imei: cleanImei },
      include: {
        device: { select: { name: true } }
      }
    });

    if (registeredUnit) {
      if (registeredUnit.status === 'Sold' && registeredUnit.purchaseId !== currentPurchaseId) {
        return NextResponse.json({
          available: false,
          validFormat: true,
          conflict: {
            type: 'INVENTORY_SOLD',
            deviceName: registeredUnit.device?.name || 'Device',
            branch: registeredUnit.branch || 'Branch',
            status: 'Sold'
          }
        });
      }
    }

    return NextResponse.json({
      available: true,
      validFormat: true,
      cleanImei
    });
  } catch (error: any) {
    console.error('Error checking IMEI:', error);
    return NextResponse.json({ error: error.message || 'Failed to check IMEI' }, { status: 500 });
  }
}
