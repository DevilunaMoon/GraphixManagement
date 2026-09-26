import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';
import { triggerStockAlert } from '../../../lib/stock-alerts';
import { generateNextInvoiceId } from '../../../lib/invoice-server';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      deviceId, 
      variationId,
      amount, 
      quantity, 
      variations, 
      cartItemIds, 
      paymentType, 
      paymentMethod,
      phoneNumber, 
      staffMessage, 
      source, 
      downpaymentAmount, 
      remainingBalance, 
      isSettled, 
      targetUserId,
      branch,
      referenceId,
      receiptUrl,
      status: requestedStatus
    } = await req.json();

    const actualUserId = targetUserId || session.userId;

    if (phoneNumber && actualUserId && !phoneNumber.includes('₱') && !phoneNumber.toLowerCase().includes('cash')) {
      await prisma.user.update({
        where: { id: actualUserId },
        data: { phone: phoneNumber }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: actualUserId },
      select: { name: true, email: true }
    });
    const userName = user?.name || user?.email || 'A customer';

    // Strictly resolve operating branch from the customer's selected branch
    const requestedBranch = typeof branch === 'string' ? branch.replace(/\s*Branch$/i, '').trim() : '';
    const operatingBranch = requestedBranch || ((session && (session.role === 'ADMIN' || session.role === 'CASHIER'))
      ? (session.branch || 'Tagoloan')
      : 'Tagoloan');

    // Unique Claim Code / Reference ID for the transaction (GRPX-T-A1, GRPX-V-A1, GRPX-J-A1 format)
    let cleanRefId = '';
    if (typeof referenceId === 'string' && referenceId.trim() && !referenceId.includes('CMTPQ') && !referenceId.includes('CWTPQ')) {
      cleanRefId = referenceId.trim().startsWith('#') ? referenceId.trim() : `#${referenceId.trim()}`;
    } else {
      cleanRefId = await generateNextInvoiceId(operatingBranch);
    }

    // Detect Cash on Pickup order
    const isCashOrder = Boolean(
      (paymentMethod && paymentMethod.toLowerCase().includes('cash')) ||
      (paymentType && paymentType.toLowerCase().includes('cash')) ||
      (staffMessage && staffMessage.toLowerCase().includes('cash on pickup'))
    );

    // Detect GCash order with receipt submitted for verification
    const isGcashOrder = Boolean(
      (paymentMethod && paymentMethod.toLowerCase().includes('gcash')) ||
      (paymentType && paymentType.toLowerCase().includes('gcash')) ||
      receiptUrl
    );

    // Exact 8-hour claim window calculation
    const CLAIM_LIMIT_HOURS = 8;
    const deadlineDate = new Date(Date.now() + CLAIM_LIMIT_HOURS * 60 * 60 * 1000);
    const formattedDeadline = deadlineDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' (' + deadlineDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ')';
    const deadlineIso = deadlineDate.toISOString();

    async function notifyCashiers(details: {
      paymentLabel: string;
      itemSummary: string;
      totalAmount: number;
      purchaseIds?: string[];
      isCash?: boolean;
      isGcash?: boolean;
    }) {
      // 1. Strictly isolate notifications to Cashiers in this operating branch
      const cashiers = await prisma.user.findMany({
        where: { 
          role: 'CASHIER', 
          branch: { equals: operatingBranch, mode: 'insensitive' } 
        },
        select: { id: true, name: true, branch: true }
      });

      let recipientIds = cashiers.map(c => c.id);
      // Fallback: If no cashier is assigned to this branch, alert branch staff
      if (recipientIds.length === 0) {
        const branchStaff = await prisma.user.findMany({
          where: {
            role: { in: ['CASHIER', 'ADMIN'] },
            branch: { equals: operatingBranch, mode: 'insensitive' }
          },
          select: { id: true }
        });
        recipientIds = branchStaff.map(s => s.id);
      }

      if (recipientIds.length > 0) {
        let title = `New Checkout Alert — ${operatingBranch} Branch`;
        if (details.isGcash) {
          title = `New GCash Payment for Verification — ${operatingBranch} Branch`;
        } else if (details.isCash) {
          title = `Cash on Pickup Order — ${operatingBranch} Branch`;
        }

        let msg = `${userName} just checked out via ${details.paymentLabel} at ${operatingBranch} Branch. Total: ₱${details.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
        if (details.isGcash) {
          msg = `A customer (${userName}) has submitted a GCash payment receipt for Order ${cleanRefId}. Total: ₱${details.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please verify payment proof.`;
        } else if (details.isCash) {
          msg = `${userName} reserved "${details.itemSummary}" for Cash on Pickup at ${operatingBranch} Branch. Total: ₱${details.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. ⏰ 8-Hour Limit: Must be claimed by ${formattedDeadline}.`;
        }

        if (cleanRefId && !details.isGcash) {
          msg += ` Claim Code: ${cleanRefId}.`;
        }
        if (phoneNumber) {
          msg += ` Phone: ${phoneNumber}.`;
        }
        if (staffMessage) {
          msg += ` Msg: "${staffMessage}".`;
        }
        if (details.purchaseIds && details.purchaseIds.length > 0) {
          msg += ` [PurchaseIds: ${details.purchaseIds.join(',')}]`;
        }
        if (details.isCash) {
          msg += ` [ClaimCode: ${cleanRefId}] [Deadline: ${deadlineIso}] [CustomerId: ${actualUserId}]`;
        }

        const notifications = recipientIds.map(userId => ({
          userId,
          title,
          message: msg,
          branch: operatingBranch,
          type: details.isGcash ? 'PAYMENT' : (details.isCash ? 'CASH_RESERVATION' : 'PAYMENT')
        }));

        await prisma.notification.createMany({ data: notifications });
      }

      // 2. Dispatch automated notification to customer
      if (actualUserId && details.isGcash) {
        await prisma.notification.create({
          data: {
            userId: actualUserId,
            title: `GCash Receipt Submitted — Order ${cleanRefId}`,
            message: `Your GCash payment receipt for "${details.itemSummary}" has been submitted for Cashier verification. Please wait while our cashier verifies your payment.`,
            branch: operatingBranch,
            type: 'PAYMENT'
          }
        });
      } else if (actualUserId && details.isCash) {
        await prisma.notification.create({
          data: {
            userId: actualUserId,
            title: 'Order Reserved — Cash on Pickup',
            message: `Your reservation for "${details.itemSummary}" at GraphiX ${operatingBranch} Branch is confirmed! Claim Code: ${cleanRefId}. Total: ₱${details.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please claim and pay in cash within 8 hours (before ${formattedDeadline}). Unclaimed reservations will automatically expire.`,
            branch: operatingBranch,
            type: 'SYSTEM'
          }
        });
      }
    }

    if (cartItemIds && Array.isArray(cartItemIds)) {
      const result = await prisma.$transaction(async (tx) => {
        // Fetch cart items to get their details
        const cartItems = await tx.cartItem.findMany({
          where: { id: { in: cartItemIds }, userId: session.userId }
        });

        if (cartItems.length === 0) {
          throw new Error('No items found in your cart to purchase');
        }

        // Fetch all target devices to verify stock
        const deviceIds = cartItems.map(item => item.deviceId);
        const devices = await tx.device.findMany({
          where: { id: { in: deviceIds } }
        });

        const deviceMap = new Map(devices.map(d => [d.id, d]));

        // Validate stock for all items at the selected branch
        for (const item of cartItems) {
          const device = deviceMap.get(item.deviceId);
          if (!device) {
            throw new Error('Product not found in inventory');
          }

          let parsedVars: any[] = [];
          if (item.variations) {
            try {
              parsedVars = typeof item.variations === 'string' ? JSON.parse(item.variations) : item.variations;
            } catch (e) {}
          }

          if (parsedVars.length > 0) {
            for (const pv of parsedVars) {
              const varId = pv.id || pv;
              const bStock = await tx.branchStock.findFirst({
                where: {
                  deviceId: item.deviceId,
                  variationId: varId,
                  branch: { equals: operatingBranch, mode: 'insensitive' }
                }
              });

              const availableStock = bStock ? bStock.stock : ((device.branch?.toLowerCase() === operatingBranch.toLowerCase()) ? (pv.stock ?? device.stock) : 0);
              const varName = pv.name ? ` (${pv.name})` : '';

              if (availableStock < item.quantity) {
                if (availableStock <= 0) {
                  throw new Error(`"${device.name}${varName}" is out of stock at ${operatingBranch} Branch. Please select another pickup branch.`);
                }
                throw new Error(`Only ${availableStock} ${availableStock === 1 ? 'unit' : 'units'} of "${device.name}${varName}" ${availableStock === 1 ? 'is' : 'are'} available at ${operatingBranch} Branch, but you requested ${item.quantity}.`);
              }
            }
          } else {
            const bStock = await tx.branchStock.findFirst({
              where: {
                deviceId: item.deviceId,
                variationId: null,
                branch: { equals: operatingBranch, mode: 'insensitive' }
              }
            });

            const availableStock = bStock ? bStock.stock : ((device.branch?.toLowerCase() === operatingBranch.toLowerCase()) ? device.stock : 0);
            if (availableStock < item.quantity) {
              if (availableStock <= 0) {
                throw new Error(`"${device.name}" is out of stock at ${operatingBranch} Branch. Please select another pickup branch.`);
              }
              throw new Error(`Only ${availableStock} ${availableStock === 1 ? 'unit' : 'units'} of "${device.name}" ${availableStock === 1 ? 'is' : 'are'} available at ${operatingBranch} Branch, but you requested ${item.quantity}.`);
            }
          }
        }

        // Decrement stock for all target devices and branch stocks
        for (const item of cartItems) {
          const device = deviceMap.get(item.deviceId);
          let parsedVars: any[] = [];
          if (item.variations) {
            try {
              parsedVars = typeof item.variations === 'string' ? JSON.parse(item.variations) : item.variations;
            } catch (e) {}
          }

          if (parsedVars.length > 0) {
            for (const pv of parsedVars) {
              const varId = pv.id || pv;
              const bStock = await tx.branchStock.findFirst({
                where: {
                  deviceId: item.deviceId,
                  variationId: varId,
                  branch: { equals: operatingBranch, mode: 'insensitive' }
                }
              });

              if (bStock) {
                await tx.branchStock.update({
                  where: { id: bStock.id },
                  data: {
                    stock: { decrement: item.quantity },
                    sold: { increment: item.quantity }
                  }
                });
              }
            }
          } else {
            const bStock = await tx.branchStock.findFirst({
              where: {
                deviceId: item.deviceId,
                variationId: null,
                branch: { equals: operatingBranch, mode: 'insensitive' }
              }
            });

            if (bStock) {
              await tx.branchStock.update({
                where: { id: bStock.id },
                data: {
                  stock: { decrement: item.quantity },
                  sold: { increment: item.quantity }
                }
              });
            }
          }

          // Decrement aggregate device stock
          await tx.device.update({
            where: { id: item.deviceId },
            data: {
              stock: { decrement: item.quantity },
              sold: { increment: item.quantity }
            }
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              type: 'SALE',
              deviceId: item.deviceId,
              variationId: parsedVars[0]?.id || null,
              productId: `${device?.name || 'Item'}-CART`,
              productName: device?.name || 'Item',
              branch: operatingBranch,
              quantity: item.quantity,
              previousStock: device?.stock || 0,
              newStock: Math.max(0, (device?.stock || 0) - item.quantity),
              notes: `Cart Purchase #${cleanRefId} (${source || 'Online'})`,
              performedBy: session.name || session.email || 'Customer',
              userRole: session.role
            }
          });
        }

        // Create purchases
        const now = new Date();
        const createdPurchases = [];
        for (let i = 0; i < cartItems.length; i++) {
          const item = cartItems[i]!;
          const device = deviceMap.get(item.deviceId);
          const vars = item.variations ? JSON.parse(item.variations) : [];
          const basePrice = (vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : device?.price) || 0;
          
          const isDiscountActive = Boolean(
            device && 
            device.discount > 0 &&
            (!device.discountStartDate || new Date(device.discountStartDate) <= now) &&
            (!device.discountEndDate || new Date(device.discountEndDate) >= now)
          );

          const discountedPrice = isDiscountActive ? (basePrice * (1 - (device?.discount || 0) / 100)) : basePrice;
          const resolvedPaymentType = isGcashOrder ? 'GCash' : (isCashOrder ? 'Cash' : (paymentType || 'Full'));
          const resolvedStatus = isGcashOrder 
            ? 'For Verification' 
            : (isCashOrder ? 'Pending Pickup' : (requestedStatus || 'Active'));
          const resolvedSettled = isGcashOrder ? false : (!isCashOrder);

          const p = await tx.purchase.create({
            data: {
              userId: session.userId,
              deviceId: item.deviceId,
              amount: discountedPrice * item.quantity,
              quantity: item.quantity,
              variations: item.variations,
              paymentType: resolvedPaymentType,
              source: source || 'Online',
              branch: operatingBranch,
              status: resolvedStatus,
              referenceId: cleanRefId,
              downpaymentAmount: 0,
              remainingBalance: 0,
              isSettled: resolvedSettled,
              receiptUrl: receiptUrl || null
            }
          });
          createdPurchases.push(p);
        }

        // Delete from cart
        await tx.cartItem.deleteMany({
          where: { id: { in: cartItemIds }, userId: session.userId }
        });

        return { 
          success: true,
          createdPurchases,
          totalCartAmount: createdPurchases.reduce((sum, p) => sum + p.amount, 0),
          itemNames: cartItems.map(i => deviceMap.get(i.deviceId)?.name || 'Device')
        };
      });

      if (result.success) {
        const pTypeLabel = isGcashOrder ? 'GCash (For Verification)' : (isCashOrder ? 'Cash on Pickup' : (paymentType === 'Downpayment' ? 'Downpayment' : 'Buy Now (Full Payment)'));
        const summary = result.itemNames.length > 1
          ? `${result.itemNames[0]} (+${result.itemNames.length - 1} more)`
          : (result.itemNames[0] || 'Cart Items');

        await notifyCashiers({
          paymentLabel: pTypeLabel,
          itemSummary: summary,
          totalAmount: result.totalCartAmount,
          purchaseIds: result.createdPurchases.map((p: any) => p.id),
          isCash: isCashOrder,
          isGcash: isGcashOrder
        });

        // Check and trigger stock alerts for all purchased cart items
        for (const cId of cartItemIds) {
          const cItem = await prisma.cartItem.findUnique({ where: { id: cId } }).catch(() => null);
          if (cItem?.deviceId) {
            await triggerStockAlert({ deviceId: cItem.deviceId });
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Cart items purchased',
          referenceId: cleanRefId,
          purchases: result.createdPurchases
        }, { status: 201 });
      }
    }

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    const purchase = await prisma.$transaction(async (tx) => {
      // Fetch target device to verify stock
      const device = await tx.device.findUnique({
        where: { id: deviceId },
        include: { variations: true }
      });

      if (!device) {
        throw new Error('Device not found in inventory');
      }

      const reqQty = quantity || 1;

      // Extract variation if present
      let parsedVars: any[] = [];
      if (variations) {
        try {
          parsedVars = typeof variations === 'string' ? JSON.parse(variations) : variations;
        } catch (e) {}
      }

      if (variationId && (!parsedVars || parsedVars.length === 0)) {
        const matchingVar = device.variations.find(v => v.id === variationId);
        if (matchingVar) {
          parsedVars = [matchingVar];
        }
      }

      const firstVar = Array.isArray(parsedVars) && parsedVars.length > 0 ? parsedVars[0] : null;
      const variationRecord = firstVar 
        ? device.variations.find(v => v.id === firstVar.id || (v.name && firstVar.name && v.name.toLowerCase() === firstVar.name.toLowerCase()))
        : (device.variations.length === 1 ? device.variations[0] : null);
      
      const varId = variationRecord?.id || null;
      const targetProdId = variationRecord?.productId || `${device.name}-STD`;
      const targetName = variationRecord && variationRecord.name !== 'Standard' ? `${device.name} (${variationRecord.name})` : device.name;

      // Validate all selected variations at the operating branch
      if (parsedVars.length > 0) {
        for (const pv of parsedVars) {
          const vRec = device.variations.find(v => v.id === pv.id || (v.name && pv.name && v.name.toLowerCase() === pv.name.toLowerCase()));
          const vId = vRec?.id || pv.id;
          const bStock = await tx.branchStock.findFirst({
            where: {
              deviceId: deviceId,
              variationId: vId,
              branch: { equals: operatingBranch, mode: 'insensitive' }
            }
          });

          const currentStock = bStock ? bStock.stock : ((device.branch?.toLowerCase() === operatingBranch.toLowerCase()) ? (pv.stock ?? device.stock) : 0);
          const vLabel = pv.name ? ` (${pv.name})` : '';

          if (currentStock < reqQty) {
            if (currentStock <= 0) {
              throw new Error(`"${device.name}${vLabel}" is out of stock at ${operatingBranch} Branch. Please select another pickup branch.`);
            }
            throw new Error(`Only ${currentStock} ${currentStock === 1 ? 'unit' : 'units'} of "${device.name}${vLabel}" ${currentStock === 1 ? 'is' : 'are'} available at ${operatingBranch} Branch, but you requested ${reqQty}.`);
          }
        }

        // Decrement branch stocks and variation stock for all variations
        for (const pv of parsedVars) {
          const vRec = device.variations.find(v => v.id === pv.id || (v.name && pv.name && v.name.toLowerCase() === pv.name.toLowerCase()));
          const vId = vRec?.id || pv.id;
          const bStock = await tx.branchStock.findFirst({
            where: {
              deviceId: deviceId,
              variationId: vId,
              branch: { equals: operatingBranch, mode: 'insensitive' }
            }
          });

          if (bStock) {
            await tx.branchStock.update({
              where: { id: bStock.id },
              data: {
                stock: { decrement: reqQty },
                sold: { increment: reqQty }
              }
            });
          }

          if (vId) {
            await tx.deviceVariation.update({
              where: { id: vId },
              data: {
                stock: { decrement: reqQty }
              }
            }).catch(() => {});
          }
        }
      } else {
        // No variations
        const bStock = await tx.branchStock.findFirst({
          where: {
            deviceId: deviceId,
            variationId: varId,
            branch: { equals: operatingBranch, mode: 'insensitive' }
          }
        });

        const currentStock = bStock ? bStock.stock : ((device.branch?.toLowerCase() === operatingBranch.toLowerCase()) ? device.stock : 0);
        if (currentStock < reqQty) {
          if (currentStock <= 0) {
            throw new Error(`"${device.name}" is out of stock at ${operatingBranch} Branch. Please select another pickup branch.`);
          }
          throw new Error(`Only ${currentStock} ${currentStock === 1 ? 'unit' : 'units'} of "${device.name}" ${currentStock === 1 ? 'is' : 'are'} available at ${operatingBranch} Branch, but you requested ${reqQty}.`);
        }

        if (bStock) {
          await tx.branchStock.update({
            where: { id: bStock.id },
            data: {
              stock: { decrement: reqQty },
              sold: { increment: reqQty }
            }
          });
        }

        if (varId) {
          await tx.deviceVariation.update({
            where: { id: varId },
            data: {
              stock: { decrement: reqQty }
            }
          }).catch(() => {});
        }
      }

      // Also update aggregate device stock
      await tx.device.update({
        where: { id: deviceId },
        data: {
          stock: { decrement: reqQty },
          sold: { increment: reqQty }
        }
      });

      // Record StockMovement audit log
      await tx.stockMovement.create({
        data: {
          type: 'SALE',
          deviceId,
          variationId: varId,
          productId: targetProdId,
          productName: targetName,
          branch: operatingBranch,
          quantity: reqQty,
          previousStock: device.stock || 0,
          newStock: Math.max(0, (device.stock || 0) - reqQty),
          notes: `Purchase #${cleanRefId} (${source || 'In-Store POS'})`,
          performedBy: session.name || session.email || 'Customer',
          userRole: session.role
        }
      });

      const now = new Date();
      const isDiscountActive = Boolean(
        device.discount && 
        device.discount > 0 &&
        (!device.discountStartDate || new Date(device.discountStartDate) <= now) &&
        (!device.discountEndDate || new Date(device.discountEndDate) >= now)
      );

      const varTotal = Array.isArray(parsedVars) && parsedVars.length > 0
        ? parsedVars.reduce((acc: number, v: any) => acc + (v.price || 0), 0)
        : 0;
      const basePrice = varTotal > 0 ? varTotal : (device.price || 0);

      const effectivePrice = isDiscountActive ? (basePrice * (1 - device.discount / 100)) : basePrice;
      const totalFullPrice = effectivePrice * reqQty;

      const isDp = paymentType === 'Downpayment';
      const dpAmt = isDp ? (downpaymentAmount || amount || 0) : (amount && amount > 0 ? amount : totalFullPrice);
      const remBal = isDp ? (remainingBalance ?? Math.max(0, totalFullPrice - dpAmt)) : 0;
      const settled = isDp ? (isSettled ?? (remBal === 0)) : true;

      const singleResolvedPaymentType = isGcashOrder ? 'GCash' : (isCashOrder ? 'Cash' : (paymentType || 'Full'));
      const singleResolvedStatus = isGcashOrder
        ? 'For Verification'
        : (isCashOrder ? 'Pending Pickup' : (requestedStatus || 'Active'));
      const singleResolvedSettled = isGcashOrder ? false : (isDp ? settled : (isCashOrder ? false : true));

      // Record the purchase
      return await tx.purchase.create({
        data: {
          userId: actualUserId,
          deviceId: deviceId,
          amount: dpAmt,
          quantity: reqQty,
          variations: variations ? (typeof variations === 'string' ? variations : JSON.stringify(variations)) : null,
          paymentType: singleResolvedPaymentType,
          source: source || 'Online',
          branch: operatingBranch,
          status: singleResolvedStatus,
          referenceId: cleanRefId,
          downpaymentAmount: isDp ? dpAmt : 0,
          remainingBalance: remBal,
          isSettled: singleResolvedSettled,
          receiptUrl: receiptUrl || null
        },
        include: {
          device: true
        }
      });
    });

    const singlePTypeLabel = isGcashOrder ? 'GCash (For Verification)' : (isCashOrder ? 'Cash on Pickup' : (paymentType === 'Downpayment' ? 'Downpayment' : 'Buy Now (Full Payment)'));
    await notifyCashiers({
      paymentLabel: singlePTypeLabel,
      itemSummary: purchase.device?.name || 'Device',
      totalAmount: purchase.amount,
      purchaseIds: [purchase.id],
      isCash: isCashOrder,
      isGcash: isGcashOrder
    });

    // Trigger stock alert check for single purchase
    await triggerStockAlert({ deviceId });

    if (actualUserId !== session.userId) {
      // If cashier created downpayment for a walk-in customer, create a notification for that customer
      const deviceObj = await prisma.device.findUnique({ where: { id: deviceId } });
      await prisma.notification.create({
        data: {
          userId: actualUserId,
          title: 'In-Store POS Downpayment Created',
          message: `Downpayment of ₱${(purchase.downpaymentAmount || 0).toLocaleString()} recorded for "${deviceObj?.name}". Remaining balance: ₱${(purchase.remainingBalance || 0).toLocaleString()}.`,
          type: 'PAYMENT'
        }
      });
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: any) {
    console.error('Error recording purchase:', error);
    return NextResponse.json({ error: error.message || 'Failed to record purchase' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');

    const sort = searchParams.get('sort') || 'desc';
    const orderByDir: 'asc' | 'desc' = sort === 'asc' ? 'asc' : 'desc';

    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
      const skip = (page - 1) * limit;

      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          where: { userId: session.userId },
          skip,
          take: limit,
          include: {
            device: true
          },
          orderBy: {
            createdAt: orderByDir
          }
        }),
        prisma.purchase.count({
          where: { userId: session.userId }
        })
      ]);

      return NextResponse.json({
        purchases,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    const purchases = await prisma.purchase.findMany({
      where: { userId: session.userId },
      include: {
        device: true
      },
      orderBy: {
        createdAt: orderByDir
      }
    });

    return NextResponse.json(purchases);
  } catch (error: any) {
    console.error('Error fetching customer purchases:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch purchases' }, { status: 500 });
  }
}
