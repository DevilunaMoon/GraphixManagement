import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import { validateImeiFormat, isIPhoneProduct } from '../../../../../lib/imei';
import { logActivity } from '../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { device: true }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({
      purchaseId: purchase.id,
      imei: purchase.imei,
      isIPhone: isIPhoneProduct(purchase.device),
      deviceName: purchase.device?.name,
      status: purchase.status
    });
  } catch (error: any) {
    console.error('Error fetching IMEI:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const body = await req.json();
    const { imei } = body;

    // 1. Validate IMEI Format
    const validation = validateImeiFormat(imei);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const cleanImei = validation.cleanImei;

    // 2. Fetch target purchase
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { device: true, user: true }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 });
    }

    // 3. Prevent assigning IMEI to cancelled or failed transactions
    if (purchase.status?.toLowerCase() === 'cancelled') {
      return NextResponse.json({ 
        error: 'Cannot record an IMEI for a cancelled transaction. IMEI is only required for completed/active purchases.' 
      }, { status: 400 });
    }

    // 4. Ensure IMEI is unique across all purchases
    const duplicate = await prisma.purchase.findFirst({
      where: {
        imei: cleanImei,
        id: { not: purchase.id }
      },
      include: { device: true }
    });

    if (duplicate) {
      return NextResponse.json({
        error: `IMEI ${cleanImei} is already assigned to another unit (${duplicate.device?.name || 'Device'} - Order #${duplicate.referenceId || duplicate.id.slice(-6).toUpperCase()}). Each IMEI must be strictly unique.`
      }, { status: 409 });
    }

    // 5. Save IMEI to Purchase
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchase.id },
      data: { imei: cleanImei },
      include: { device: true, user: true }
    });

    // 6. Audit Log
    try {
      await logActivity({
        action: 'RECORD_IMEI',
        description: `Recorded IMEI ${cleanImei} for "${purchase.device?.name || 'iPhone'}" (Order #${purchase.referenceId || purchase.id.slice(-6).toUpperCase()})`,
        details: JSON.stringify({
          purchaseId: purchase.id,
          imei: cleanImei,
          deviceName: purchase.device?.name,
          customerName: purchase.user?.name || 'Walk-in Customer'
        }),
        branch: session?.branch || purchase.branch || 'Tagoloan'
      });
    } catch (logErr) {
      console.error('Failed to write activity log for IMEI record:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'IMEI successfully recorded and linked to order.',
      purchase: updatedPurchase
    });
  } catch (error: any) {
    console.error('Error recording IMEI:', error);
    return NextResponse.json({ error: error.message || 'Failed to record IMEI' }, { status: 500 });
  }
}
