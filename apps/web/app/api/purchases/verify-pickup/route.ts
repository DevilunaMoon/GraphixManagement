import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { validateImeiFormat, isIPhoneProduct } from '../../../../lib/imei';
import { logActivity } from '../../../../lib/logger';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      purchaseId, 
      referenceId, 
      amountTendered, 
      action = 'VERIFY', 
      rejectionReason,
      imei,
      imeis,
      variations: updatedVariations
    } = await req.json();

    if (!purchaseId && !referenceId) {
      return NextResponse.json({ error: 'Missing purchase identifier' }, { status: 400 });
    }

    // Locate the purchase
    const targetId = (purchaseId || referenceId || '').trim();
    const cleanRef = targetId.replace(/^#/, '');
    const codeSuffix = cleanRef.replace(/^CMTPQ/i, '').trim();

    const orConditions: any[] = [
      { id: targetId },
      { id: cleanRef },
      { referenceId: targetId },
      { referenceId: `#${cleanRef}` },
      { referenceId: cleanRef }
    ];

    if (codeSuffix.length >= 2) {
      orConditions.push({ id: { endsWith: codeSuffix, mode: 'insensitive' } });
      orConditions.push({ referenceId: { contains: codeSuffix, mode: 'insensitive' } });
    }

    const purchase = await prisma.purchase.findFirst({
      where: { OR: orConditions },
      include: {
        device: true,
        user: true
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Order reservation not found' }, { status: 404 });
    }

    // Branch check: ensure staff branch matches order branch (unless super admin)
    if (session.branch && purchase.branch && session.branch.toLowerCase() !== purchase.branch.toLowerCase() && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: `This reservation belongs to ${purchase.branch} Branch. You are logged into ${session.branch} Branch.` 
      }, { status: 403 });
    }

    // =========================================================================
    // 1. REJECT ACTION (For GCash Payment Rejection)
    // =========================================================================
    if (action === 'REJECT') {
      const formattedReason = rejectionReason?.trim() || 'Payment receipt could not be verified.';

      const rejectedPurchase = await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'Rejected',
          isSettled: false
        },
        include: {
          device: true,
          user: true
        }
      });

      // Dispatch rejection notification to the customer
      if (purchase.userId) {
        await prisma.notification.create({
          data: {
            userId: purchase.userId,
            title: `GCash Payment Rejected — Order ${purchase.referenceId || purchase.id}`,
            message: `Your submitted GCash payment proof for "${purchase.device?.name || 'Device'}" at ${purchase.branch || 'store'} was not approved. Reason: "${formattedReason}". Please review and resubmit your payment receipt.`,
            branch: purchase.branch,
            type: 'PAYMENT'
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Payment rejected for Order ${purchase.referenceId || purchase.id}. Customer has been notified.`,
        purchase: rejectedPurchase
      });
    }

    // =========================================================================
    // 2. COMPLETE_PICKUP ACTION (Device Handover & Physical IMEI Assignment)
    // =========================================================================
    if (action === 'COMPLETE_PICKUP') {
      const isIPhone = isIPhoneProduct(purchase.device);
      const qty = Math.max(1, purchase.quantity || 1);

      // Collect IMEIs to record
      let imeisToProcess: string[] = [];
      if (Array.isArray(imeis) && imeis.length > 0) {
        imeisToProcess = imeis.map(i => String(i).trim());
      } else if (imei) {
        imeisToProcess = String(imei).split(',').map(s => s.trim()).filter(Boolean);
      }

      // If iPhone/IMEI-tracked device, validate IMEI presence and format
      if (isIPhone || imeisToProcess.length > 0) {
        if (imeisToProcess.length === 0) {
          return NextResponse.json({ 
            error: 'IMEI is required before completing physical device handover.' 
          }, { status: 400 });
        }

        if (imeisToProcess.length < qty) {
          return NextResponse.json({ 
            error: `Please record all ${qty} IMEI number(s) for this order (currently provided ${imeisToProcess.length}).` 
          }, { status: 400 });
        }

        // Validate each IMEI
        const cleanImeis: string[] = [];
        const seenImeis = new Set<string>();

        for (let idx = 0; idx < imeisToProcess.length; idx++) {
          const raw = imeisToProcess[idx]!;
          const validation = validateImeiFormat(raw);
          if (!validation.valid) {
            return NextResponse.json({ 
              error: `Unit ${idx + 1}: ${validation.error || 'Invalid IMEI number.'}` 
            }, { status: 400 });
          }

          const clean = validation.cleanImei;
          if (seenImeis.has(clean)) {
            return NextResponse.json({ 
              error: `Duplicate IMEI ${clean} entered for multiple units in this order. Each unit must have a unique IMEI.` 
            }, { status: 400 });
          }
          seenImeis.add(clean);

          // Check if IMEI is already assigned to another completed purchase
          const duplicate = await prisma.purchase.findFirst({
            where: {
              id: { not: purchase.id },
              imei: { contains: clean }
            },
            include: { device: true }
          });

          if (duplicate) {
            return NextResponse.json({
              error: `IMEI ${clean} is already assigned to another completed purchase (${duplicate.device?.name || 'Device'} - Order #${duplicate.referenceId || duplicate.id.slice(-6).toUpperCase()}).`
            }, { status: 409 });
          }

          // Check against DeviceUnit table if unit is tracked in inventory
          const registeredUnit = await prisma.deviceUnit.findUnique({
            where: { imei: clean }
          });

          if (registeredUnit) {
            // Must belong to this branch
            if (registeredUnit.branch && purchase.branch && registeredUnit.branch.toLowerCase() !== purchase.branch.toLowerCase()) {
              return NextResponse.json({
                error: `IMEI ${clean} is registered to ${registeredUnit.branch} Branch, but this order is at ${purchase.branch} Branch.`
              }, { status: 400 });
            }

            // Must match product device
            if (registeredUnit.deviceId && purchase.deviceId && registeredUnit.deviceId !== purchase.deviceId) {
              return NextResponse.json({
                error: `IMEI ${clean} is registered for a different device model in inventory.`
              }, { status: 400 });
            }

            // Must not be already Sold
            if (registeredUnit.status === 'Sold' && registeredUnit.purchaseId !== purchase.id) {
              return NextResponse.json({
                error: `IMEI ${clean} is already marked as Sold in inventory.`
              }, { status: 409 });
            }
          }

          cleanImeis.push(clean);
        }

        const finalImeiString = cleanImeis.join(', ');

        // Handle Color / Variant Change if requested during pickup
        const originalVariations = purchase.variations || '';
        let finalVariations = originalVariations;
        let variantChanged = false;

        if (updatedVariations && typeof updatedVariations === 'string' && updatedVariations.trim() !== originalVariations.trim()) {
          finalVariations = updatedVariations.trim();
          variantChanged = true;

          // Record activity log for order variant update
          try {
            await logActivity({
              action: 'Updated Pickup Device',
              description: `Updated pickup device variant for Order ${purchase.referenceId || purchase.id}: Original "${originalVariations || 'Default'}" -> Final "${finalVariations}"`,
              details: JSON.stringify({
                purchaseId: purchase.id,
                referenceId: purchase.referenceId,
                originalVariations,
                finalVariations,
                changedBy: session.name || session.email || 'Cashier',
                branch: purchase.branch
              }),
              branch: purchase.branch
            });
          } catch (logErr) {
            console.error('Failed to log variant update:', logErr);
          }
        }

        // Update purchase record to Completed / Picked Up
        const completedPurchase = await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            status: 'Completed',
            isSettled: true,
            imei: finalImeiString,
            variations: finalVariations
          },
          include: {
            device: true,
            user: true
          }
        });

        // Update registered DeviceUnits in inventory to Sold
        for (const clean of cleanImeis) {
          try {
            const unit = await prisma.deviceUnit.findUnique({ where: { imei: clean } });
            if (unit) {
              await prisma.deviceUnit.update({
                where: { id: unit.id },
                data: {
                  status: 'Sold',
                  purchaseId: purchase.id
                }
              });
            }
          } catch (unitErr) {
            console.error(`Error updating DeviceUnit for IMEI ${clean}:`, unitErr);
          }
        }

        // Log pickup completion activity
        try {
          await logActivity({
            action: 'RECORD_IMEI',
            description: `Handed over "${purchase.device?.name || 'iPhone'}" and recorded IMEI ${finalImeiString} for Order #${purchase.referenceId || purchase.id}`,
            details: JSON.stringify({
              purchaseId: purchase.id,
              referenceId: purchase.referenceId,
              imei: finalImeiString,
              deviceName: purchase.device?.name,
              customerName: purchase.user?.name || 'Customer',
              branch: purchase.branch
            }),
            branch: session?.branch || purchase.branch || 'Tagoloan'
          });
        } catch (logErr) {
          console.error('Failed to log activity for IMEI record:', logErr);
        }

        // Dispatch customer handover notification
        if (purchase.userId) {
          await prisma.notification.create({
            data: {
              userId: purchase.userId,
              title: `Device Handed Over — Order ${purchase.referenceId || purchase.id}`,
              message: `Your ${purchase.device?.name || 'Device'} has been successfully picked up at GraphiX ${purchase.branch}! Recorded Serial/IMEI: ${finalImeiString}. Thank you for purchasing at GraphiX!`,
              branch: purchase.branch,
              type: 'SYSTEM'
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: `Pickup completed! IMEI ${finalImeiString} permanently linked to Order ${purchase.referenceId || purchase.id}.`,
          purchase: completedPurchase
        });
      } else {
        // Non-IMEI device pickup completion
        const completedPurchase = await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            status: 'Completed',
            isSettled: true
          },
          include: {
            device: true,
            user: true
          }
        });

        if (purchase.userId) {
          await prisma.notification.create({
            data: {
              userId: purchase.userId,
              title: `Device Handed Over — Order ${purchase.referenceId || purchase.id}`,
              message: `Your ${purchase.device?.name || 'Device'} has been picked up at GraphiX ${purchase.branch}. Thank you for choosing GraphiX!`,
              branch: purchase.branch,
              type: 'SYSTEM'
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: `Pickup completed for Order ${purchase.referenceId || purchase.id}.`,
          purchase: completedPurchase
        });
      }
    }

    // =========================================================================
    // 3. VERIFY ACTION (Payment Verification Only — NO IMEI Assigned Yet)
    // =========================================================================
    if (purchase.status === 'Paid') {
      return NextResponse.json({ 
        success: true, 
        message: 'This order has already been verified and paid.',
        purchase 
      });
    }

    // Update purchase status to Paid and settled (Ready for Pickup)
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        status: 'Paid',
        isSettled: true
      },
      include: {
        device: true,
        user: true
      }
    });

    // Mark any related cashier notifications as Paid and read
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          branch: purchase.branch,
          message: { contains: purchase.id }
        }
      });
      if (notifications.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: notifications.map(n => n.id) } },
          data: {
            isRead: true,
            title: 'Paid Checkout Alert'
          }
        });
      }
    } catch (e) {
      console.error('Error updating cashier notifications:', e);
    }

    // Dispatch automated confirmation notification to the customer
    if (purchase.userId) {
      const isGcash = purchase.paymentType?.toLowerCase().includes('gcash') || Boolean(purchase.receiptUrl);
      const notifTitle = isGcash 
        ? 'GCash Payment Verified & Ready for Pickup'
        : 'Payment Verified & Official Receipt Unlocked';
      const notifMessage = isGcash
        ? `Your GCash payment for "${purchase.device?.name || 'Device'}" (Order ${purchase.referenceId || purchase.id}) has been verified! Your order is now READY FOR PICKUP at GraphiX ${purchase.branch || 'store'}. IMEI will be recorded during physical pickup.`
        : `Your in-store cash payment for "${purchase.device?.name || 'Device'}" at GraphiX ${purchase.branch || 'store'} has been verified as PAID! Your order is ready for device handover.`;

      await prisma.notification.create({
        data: {
          userId: purchase.userId,
          title: notifTitle,
          message: notifMessage,
          branch: purchase.branch,
          type: 'PAYMENT'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payment verified for ${purchase.device?.name || 'Device'}. Official Graphix Store receipt is now issued and order is ready for pickup!`,
      purchase: updatedPurchase
    });
  } catch (error: any) {
    console.error('Error verifying pickup:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify pickup' }, { status: 500 });
  }
}
