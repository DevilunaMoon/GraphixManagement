import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'full' or 'downpayment'
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';

    // Build where clause
    const whereClause: any = {
      repairCost: {
        not: null,
      },
    };

    // Filter by type: completed (100% progress) or active downpayment (25% - 75% progress)
    if (type === 'downpayment') {
      whereClause.progress = {
        in: ['25%', '50%', '75%'],
      };
    } else {
      // type === 'full'
      whereClause.progress = '100%';
    }

    // Filter by search query
    if (search) {
      whereClause.OR = [
        {
          id: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          deviceName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          ownerName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Filter by date
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
    const skip = (page - 1) * limit;

    // Fetch matching repair requests
    const [repairs, total] = await Promise.all([
      prisma.repairRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          user: {
            select: { name: true, email: true, id: true, phone: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.repairRequest.count({ where: whereClause }),
    ]);

    // Format repair requests as transaction objects
    const transactions = repairs.map((repair) => {
      // Parse cost
      const costStr = repair.repairCost || '0';
      const totalCost = parseFloat(costStr.replace(/[^0-9.]/g, '')) || 0;

      // In a 50% downpayment standard:
      const downpaymentAmount = totalCost / 2;
      const remainingBalance = type === 'downpayment' ? totalCost / 2 : 0;
      const amount = type === 'downpayment' ? downpaymentAmount : totalCost;

      return {
        id: `rp_${repair.id.substring(0, 10)}`,
        repairId: repair.id,
        createdAt: repair.createdAt,
        amount,
        quantity: 1,
        variations: repair.cause || 'General Repair',
        paymentType: type === 'downpayment' ? 'Downpayment' : 'Full',
        source: 'In-Store',
        status: repair.status || 'Active',
        isExpired: false, // Repair receipts do not expire in 3 days
        downpaymentAmount,
        remainingBalance,
        isSettled: type === 'full',
        user: {
          id: repair.userId || 'guest',
          name: repair.ownerName || repair.user?.name || 'Walk-In Customer',
          email: repair.user?.email || 'walkin@graphix.com',
          phone: repair.user?.phone || 'N/A',
        },
        device: {
          id: repair.id,
          name: repair.deviceName,
          price: totalCost,
          image: repair.image || null,
          technician: repair.technician || 'N/A',
        },
      };
    });

    // Calculate total sales
    const allRepairsOfCategory = await prisma.repairRequest.findMany({
      where: whereClause,
    });
    const totalSales = allRepairsOfCategory.reduce((sum, r) => {
      const costStr = r.repairCost || '0';
      const totalCost = parseFloat(costStr.replace(/[^0-9.]/g, '')) || 0;
      const amount = type === 'downpayment' ? totalCost / 2 : totalCost;
      return sum + amount;
    }, 0);

    return NextResponse.json({
      transactions,
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
