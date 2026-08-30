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
      select: {
        id: true,
        name: true,
        stock: true,
        branch: true,
      }
    });

    if (!device) return;

    const branch = device.branch || 'Tagoloan';
    const stock = device.stock;

    let alertType: 'STOCK_OUT' | 'STOCK_LOW' | null = null;
    let title = '';
    let message = '';

    if (stock <= 0) {
      alertType = 'STOCK_OUT';
      title = `Out of Stock: ${device.name}`;
      message = `"${device.name}" is now OUT OF STOCK (0 units remaining) at ${branch} branch. Immediate restock required.`;
    } else if (stock <= 3) {
      alertType = 'STOCK_LOW';
      title = `Low Stock Warning: ${device.name}`;
      message = `"${device.name}" is running low on inventory (Only ${stock} unit${stock === 1 ? '' : 's'} remaining) at ${branch} branch.`;
    }

    if (!alertType) return;

    // Find all Admins and Cashiers assigned to this branch
    const staffMembers = await db.user.findMany({
      where: {
        role: { in: ['ADMIN', 'CASHIER'] },
        branch: branch,
      },
      select: { id: true, role: true }
    });

    if (staffMembers.length === 0) return;

    // Dispatch notification to staff members if an unread alert of the same title doesn't exist
    for (const staff of staffMembers) {
      const existing = await db.notification.findFirst({
        where: {
          userId: staff.id,
          title: title,
          isRead: false,
        }
      });

      if (!existing) {
        await db.notification.create({
          data: {
            userId: staff.id,
            title,
            message,
            type: alertType,
            branch,
          }
        });
      }
    }
  } catch (error) {
    console.error('Error triggering stock alert:', error);
  }
}
