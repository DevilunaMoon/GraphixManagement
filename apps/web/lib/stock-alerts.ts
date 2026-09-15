import { prisma } from 'database';

interface TriggerStockAlertParams {
  deviceId: string;
  tx?: any;
}

export async function triggerStockAlert({ deviceId, tx }: TriggerStockAlertParams) {
  const db = tx || prisma;
  try {
    const device = await db.device.findUnique({
      where: { id: deviceId },
      include: {
        variations: true,
        branchStocks: true,
      }
    });

    if (!device) return;

    // Determine alerts to generate per branch
    const alertsToDispatch: Array<{
      branch: string;
      stock: number;
      productName: string;
      alertType: 'STOCK_OUT' | 'STOCK_LOW';
      title: string;
      message: string;
    }> = [];

    if (device.branchStocks && device.branchStocks.length > 0) {
      for (const bs of device.branchStocks) {
        const branchName = bs.branch || 'Tagoloan';
        const currentStock = bs.stock;
        let varName = '';
        if (bs.variationId && device.variations) {
          const v = device.variations.find((item: any) => item.id === bs.variationId);
          if (v) varName = ` (${v.name})`;
        }
        const displayName = `${device.name}${varName}`;

        if (currentStock <= 0) {
          alertsToDispatch.push({
            branch: branchName,
            stock: currentStock,
            productName: displayName,
            alertType: 'STOCK_OUT',
            title: `Out of Stock: ${displayName}`,
            message: `"${displayName}" is now OUT OF STOCK (0 units remaining) at ${branchName} branch. Immediate restock required.`
          });
        } else if (currentStock <= 3) {
          alertsToDispatch.push({
            branch: branchName,
            stock: currentStock,
            productName: displayName,
            alertType: 'STOCK_LOW',
            title: `Low Stock Warning: ${displayName}`,
            message: `"${displayName}" is running low on inventory (Only ${currentStock} unit${currentStock === 1 ? '' : 's'} remaining) at ${branchName} branch.`
          });
        }
      }
    } else {
      const branchName = device.branch || 'Tagoloan';
      const currentStock = device.stock;
      if (currentStock <= 0) {
        alertsToDispatch.push({
          branch: branchName,
          stock: currentStock,
          productName: device.name,
          alertType: 'STOCK_OUT',
          title: `Out of Stock: ${device.name}`,
          message: `"${device.name}" is now OUT OF STOCK (0 units remaining) at ${branchName} branch. Immediate restock required.`
        });
      } else if (currentStock <= 3) {
        alertsToDispatch.push({
          branch: branchName,
          stock: currentStock,
          productName: device.name,
          alertType: 'STOCK_LOW',
          title: `Low Stock Warning: ${device.name}`,
          message: `"${device.name}" is running low on inventory (Only ${currentStock} unit${currentStock === 1 ? '' : 's'} remaining) at ${branchName} branch.`
        });
      }
    }

    if (alertsToDispatch.length === 0) return;

    // Fetch all Super Admins (global) and branch staff
    const superAdmins = await db.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true }
    });

    for (const alert of alertsToDispatch) {
      // Find branch Admins and Cashiers
      const branchStaff = await db.user.findMany({
        where: {
          role: { in: ['ADMIN', 'CASHIER'] },
          branch: alert.branch
        },
        select: { id: true }
      });

      // Target users: Super Admins (all branches) + Branch Staff (assigned branch)
      const targetUserIds = Array.from(new Set([
        ...superAdmins.map((u: any) => u.id),
        ...branchStaff.map((u: any) => u.id)
      ]));

      for (const userId of targetUserIds) {
        const existing = await db.notification.findFirst({
          where: {
            userId,
            title: alert.title,
            branch: alert.branch,
            isRead: false,
          }
        });

        if (!existing) {
          await db.notification.create({
            data: {
              userId,
              title: alert.title,
              message: alert.message,
              type: alert.alertType,
              branch: alert.branch,
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error triggering stock alert:', error);
  }
}

/**
 * Ensures all current low-stock and out-of-stock items across branches
 * have corresponding active notifications for the given user.
 * Fully batched for ultra-fast performance.
 */
export async function syncStockAlertsForUser(userId: string, role: string, userBranch?: string | null) {
  try {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isAdmin = role === 'ADMIN';

    if (!isSuperAdmin && !isAdmin) return;

    // 1. Fetch all low branch stocks in 1 fast query
    const lowBranchStocks = await prisma.branchStock.findMany({
      where: {
        stock: { lte: 3 },
        ...(!isSuperAdmin && userBranch ? { branch: userBranch } : {})
      },
      include: {
        device: {
          select: { id: true, name: true }
        },
        variation: {
          select: { id: true, name: true }
        }
      },
      take: 50
    });

    // 2. Fetch existing unread notifications for this user in 1 query
    const existingNotifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      select: {
        title: true,
        branch: true
      }
    });

    const existingKeySet = new Set(
      existingNotifications.map((n: any) => `${n.title}|${n.branch || ''}`)
    );

    const notificationsToCreate: Array<{
      userId: string;
      title: string;
      message: string;
      type: string;
      branch: string;
    }> = [];

    for (const bs of lowBranchStocks) {
      if (!bs.device) continue;
      const branchName = bs.branch || 'Tagoloan';
      const displayName = bs.variation ? `${bs.device.name} (${bs.variation.name})` : bs.device.name;
      const isOut = bs.stock <= 0;
      const alertType = isOut ? 'STOCK_OUT' : 'STOCK_LOW';
      const title = isOut ? `Out of Stock: ${displayName}` : `Low Stock Warning: ${displayName}`;
      const message = isOut 
        ? `"${displayName}" is now OUT OF STOCK (0 units remaining) at ${branchName} branch. Immediate restock required.`
        : `"${displayName}" is running low on inventory (Only ${bs.stock} unit${bs.stock === 1 ? '' : 's'} remaining) at ${branchName} branch.`;

      const key = `${title}|${branchName}`;
      if (!existingKeySet.has(key)) {
        existingKeySet.add(key);
        notificationsToCreate.push({
          userId,
          title,
          message,
          type: alertType,
          branch: branchName
        });
      }
    }

    // 3. Batch insert missing notifications in a single DB operation
    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({
        data: notificationsToCreate
      });
    }
  } catch (err) {
    console.error('Error syncing stock alerts for user:', err);
  }
}


