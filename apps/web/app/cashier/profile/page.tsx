import CashierProfile from '../../CashierSide/CashierProfile';
import { getSession } from '../../../lib/session';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        gender: true,
        dateOfBirth: true,
        role: true,
        createdAt: true,
      }
    } as any);
  }

  // Calculate System POS operational stats for display on cashier profile
  let totalInStorePurchases = 0;
  let totalInStoreRevenue = 0;
  let activeRepairsCount = 0;

  try {
    totalInStorePurchases = await prisma.purchase.count({
      where: { source: 'In-Store' }
    });

    const revenueGroup = await prisma.purchase.aggregate({
      where: { source: 'In-Store' },
      _sum: {
        amount: true
      }
    });
    totalInStoreRevenue = revenueGroup._sum.amount || 0;

    activeRepairsCount = await prisma.repairRequest.count({
      where: {
        progress: {
          notIn: ['Completed', 'Cancelled', 'Picked Up', 'Ready for Pickup']
        }
      }
    });
  } catch (error) {
    console.error("Error calculating cashier operational stats:", error);
  }

  return (
    <CashierProfile 
      user={user} 
      stats={{
        salesCount: totalInStorePurchases,
        salesRevenue: totalInStoreRevenue,
        activeRepairs: activeRepairsCount
      }}
    />
  );
}
