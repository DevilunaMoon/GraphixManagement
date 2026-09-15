import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

function parseRepairDetails(repairHistory: string | null | undefined) {
  if (!repairHistory) return null;
  try {
    const parsed = JSON.parse(repairHistory);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    // Not JSON
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'full'; // 'full' or 'downpayment'
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const branchParam = searchParams.get('branch');

    // Build database AND conditions
    const andConditions: any[] = [];

    // 1. Branch condition:
    // For Super Admin: if 'all' or empty, no branch filter (fetch all branches). If specific branch, filter by it.
    // For regular Admin / Cashier: restrict strictly to session branch.
    if (isSuperAdmin) {
      if (branchParam && branchParam.toLowerCase() !== 'all') {
        andConditions.push({
          branch: { contains: branchParam, mode: 'insensitive' }
        });
      }
    } else {
      andConditions.push({
        branch: { equals: session.branch || 'Tagoloan', mode: 'insensitive' }
      });
    }

    // 2. Progress / Status condition
    if (type === 'downpayment') {
      andConditions.push({
        OR: [
          { progress: { in: ['25%', '50%', '75%', 'Diagnostic', 'Repairing'] } },
          { downpayment: { not: null } }
        ]
      });
    } else {
      andConditions.push({
        OR: [
          { status: { equals: 'Completed', mode: 'insensitive' } },
          { progress: { in: ['Completed', '100%'] } }
        ]
      });
    }

    // 3. Search condition
    if (search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { deviceName: { contains: q, mode: 'insensitive' } },
          { ownerName: { contains: q, mode: 'insensitive' } },
          { branch: { contains: q, mode: 'insensitive' } },
          { technician: { contains: q, mode: 'insensitive' } },
          { cause: { contains: q, mode: 'insensitive' } },
          {
            user: {
              name: { contains: q, mode: 'insensitive' }
            }
          },
          {
            user: {
              email: { contains: q, mode: 'insensitive' }
            }
          }
        ]
      });
    }

    // 4. Date condition
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      andConditions.push({
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      });
    }

    const whereClause: any = andConditions.length > 0 ? { AND: andConditions } : {};

    // Fetch all matching repair records from PostgreSQL Database
    const repairs = await prisma.repairRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, id: true, phone: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format DB repairs as transaction objects
    const dbTransactions = repairs.map((repair) => {
      const costStr = repair.repairCost || '0';
      let totalCost = parseFloat(costStr.replace(/[^0-9.]/g, '')) || 0;

      // If repairCost is 0, check materials JSON
      if (totalCost === 0 && repair.materials) {
        try {
          const mats = JSON.parse(repair.materials);
          if (mats && typeof mats === 'object') {
            const itemsSum = Array.isArray(mats.items)
              ? mats.items.reduce((acc: number, item: any) => acc + (parseFloat(item.cost || item.price || 0) * (parseInt(item.quantity || 1, 10) || 1)), 0)
              : 0;
            const labor = parseFloat(mats.laborCost || 0) || 0;
            totalCost = itemsSum + labor;
          }
        } catch (e) {
          // Ignore JSON error
        }
      }

      const parsedHistory = parseRepairDetails(repair.repairHistory);

      let downpaymentAmount = 0;
      if (repair.downpayment) {
        downpaymentAmount = parseFloat(repair.downpayment.replace(/[^0-9.]/g, '')) || 0;
      } else {
        downpaymentAmount = totalCost / 2;
      }

      const isDownpayment = type === 'downpayment';
      const remainingBalance = isDownpayment ? Math.max(0, totalCost - downpaymentAmount) : 0;
      const amount = isDownpayment ? (downpaymentAmount > 0 ? downpaymentAmount : totalCost) : totalCost;
      const repairBranch = repair.branch || session.branch || 'Tagoloan';

      const customerName = repair.user?.name || parsedHistory?.customerName || (repair.ownerName && repair.ownerName.trim() ? repair.ownerName : 'Walk-In Customer');
      const customerEmail = repair.user?.email || parsedHistory?.customerEmail || 'walkin@graphix.com';
      const customerPhone = repair.user?.phone || parsedHistory?.customerPhone || 'N/A';
      const photoUrl = repair.proofImage || repair.image || (parsedHistory?.photos && parsedHistory.photos[0]) || null;

      return {
        id: `rp_${repair.id.substring(0, 10)}`,
        repairId: repair.id,
        createdAt: repair.createdAt.toISOString(),
        amount,
        quantity: 1,
        variations: repair.cause || (parsedHistory?.problem ? `${parsedHistory.problem} - ${parsedHistory.problemDescription || ''}` : 'General Repair'),
        paymentType: isDownpayment ? 'Downpayment' : 'Full',
        source: 'In-Store',
        status: repair.status || 'Completed',
        isExpired: false,
        downpaymentAmount,
        remainingBalance,
        isSettled: !isDownpayment,
        address: 'Walk-In / Online Request',
        branch: repairBranch,
        user: {
          id: repair.userId || 'guest',
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        device: {
          id: repair.id,
          name: repair.deviceName,
          price: totalCost,
          image: photoUrl,
          technician: repair.technician || 'Lead Tech',
        },
      };
    });

    // Calculate Pagination directly from database items
    const total = dbTransactions.length;
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
    const skip = (page - 1) * limit;

    const paginatedTransactions = dbTransactions.slice(skip, skip + limit);

    // Calculate Total Sales
    const totalSales = dbTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return NextResponse.json({
      transactions: paginatedTransactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalSales,
    });
  } catch (error) {
    console.error('Error fetching repair transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch repair transactions' }, { status: 500 });
  }
}
