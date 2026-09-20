import { prisma } from 'database';

interface TriggerStockAlertParams {
  deviceId: string;
  tx?: any;
}

export interface CreateRestockNotificationParams {
  deviceId?: string;
  variationId?: string | null;
  productName: string;
  branch: string;
  quantityAdded: number;
  previousStock: number;
  newStock: number;
  actorUserId: string;
  actorName?: string | null;
  actorRole: string; // 'SUPER_ADMIN' | 'ADMIN' | 'CASHIER'
  tx?: any;
}

/**
 * Creates role & branch targeted Restock notifications when a Super Admin, Branch Admin, or Cashier
 * restocks inventory.
 */
export async function createRestockNotifications({
  deviceId,
  variationId,
  productName,
  branch,
  quantityAdded,
  previousStock,
  newStock,
  actorUserId,
  actorName,
  actorRole,
  tx
}: CreateRestockNotificationParams) {
  const db = tx || prisma;
  try {
    const cleanBranch = branch.trim();

    // Determine the actor's display title/role
    let actorLabel = 'Staff';
    if (actorRole === 'SUPER_ADMIN') {
      actorLabel = 'Super Admin';
    } else if (actorRole === 'ADMIN') {
      actorLabel = `${cleanBranch} Branch Admin`;
    } else if (actorRole === 'CASHIER') {
      actorLabel = `${cleanBranch} Cashier`;
    }

    const title = 'Product Restocked';
    const message = `${actorLabel} restocked ${productName}. Stock increased from ${previousStock} → ${newStock} units (+${quantityAdded} unit${quantityAdded === 1 ? '' : 's'} added • ${cleanBranch} Branch).`;

    // Target user rules:
    // 1. If Super Admin restocks -> Notify Branch Admin + Cashier of affected branch (not actor, not other branches).
    // 2. If Branch Admin restocks -> Notify Super Admin + Cashier of this branch (not actor, not other branches).
    // 3. If Cashier restocks -> Notify Super Admin + Branch Admin of this branch (not actor, not other branches).
    let targetUsers: Array<{ id: string; role: string; branch: string | null }> = [];

    if (actorRole === 'SUPER_ADMIN') {
      const branchStaff = await db.user.findMany({
        where: {
          role: { in: ['ADMIN', 'CASHIER'] },
          branch: { equals: cleanBranch, mode: 'insensitive' },
          id: { not: actorUserId }
        },
        select: { id: true, role: true, branch: true }
      });
      targetUsers = branchStaff;
    } else if (actorRole === 'ADMIN') {
      const [superAdmins, branchCashiers] = await Promise.all([
        db.user.findMany({
          where: {
            role: 'SUPER_ADMIN',
            id: { not: actorUserId }
          },
          select: { id: true, role: true, branch: true }
        }),
        db.user.findMany({
          where: {
            role: 'CASHIER',
            branch: { equals: cleanBranch, mode: 'insensitive' },
            id: { not: actorUserId }
          },
          select: { id: true, role: true, branch: true }
        })
      ]);
      targetUsers = [...superAdmins, ...branchCashiers];
    } else if (actorRole === 'CASHIER') {
      const [superAdmins, branchAdmins] = await Promise.all([
        db.user.findMany({
          where: {
            role: 'SUPER_ADMIN',
            id: { not: actorUserId }
          },
          select: { id: true, role: true, branch: true }
        }),
        db.user.findMany({
          where: {
            role: 'ADMIN',
            branch: { equals: cleanBranch, mode: 'insensitive' },
            id: { not: actorUserId }
          },
          select: { id: true, role: true, branch: true }
        })
      ]);
      targetUsers = [...superAdmins, ...branchAdmins];
    } else {
      const superAdmins = await db.user.findMany({
        where: { role: 'SUPER_ADMIN', id: { not: actorUserId } },
        select: { id: true, role: true, branch: true }
      });
      targetUsers = superAdmins;
    }

    const uniqueUserIds = Array.from(new Set(targetUsers.map(u => u.id)));
    if (uniqueUserIds.length === 0) return;

    for (const userId of uniqueUserIds) {
      await db.notification.create({
        data: {
          userId,
          title,
          message,
          type: 'RESTOCK',
          branch: cleanBranch,
          isRead: false
        }
      });
    }

    // Clean up or resolve any existing out-of-stock / low-stock warnings for this item if stock is now > 3
    if (newStock > 3) {
      const stockAlertTitles = [
        `Out of Stock: ${productName}`,
        `Low Stock Warning: ${productName}`
      ];
      await db.notification.deleteMany({
        where: {
          title: { in: stockAlertTitles },
          branch: cleanBranch,
          type: { in: ['STOCK_OUT', 'STOCK_LOW'] }
        }
      });
    }
  } catch (error) {
    console.error('Error creating restock notifications:', error);
  }
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
 * Fully batched and deduplicated.
 */
export async function syncStockAlertsForUser(userId: string, role: string, userBranch?: string | null) {
  try {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isAdmin = role === 'ADMIN';
    const isCashier = role === 'CASHIER';

    if (!isSuperAdmin && !isAdmin && !isCashier) return;

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

    // 2. Fetch ALL existing notifications for this user (both read and unread) to never duplicate
    const allUserNotifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        title: true,
        branch: true,
        isRead: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Clean up any existing duplicate unread notifications that were created previously
    const seenKeyMap = new Map<string, string>();
    const duplicateIdsToDelete: string[] = [];

    for (const notif of allUserNotifications) {
      const key = `${notif.title}|${notif.branch || ''}`;
      if (seenKeyMap.has(key)) {
        duplicateIdsToDelete.push(notif.id);
      } else {
        seenKeyMap.set(key, notif.id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          id: { in: duplicateIdsToDelete }
        }
      });
    }

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
      if (!seenKeyMap.has(key)) {
        seenKeyMap.set(key, 'pending');
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
