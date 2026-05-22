import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    
    // Build where clause
    const whereClause: any = {};
    if (type === 'downpayment') {
      whereClause.paymentType = 'Downpayment';
    } else if (type === 'full') {
      whereClause.paymentType = 'Full';
    }

    if (search) {
      whereClause.OR = [
        {
          id: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          device: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
      const skip = (page - 1) * limit;

      const [transactions, total, aggregateSales] = await Promise.all([
        prisma.purchase.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: {
            user: {
              select: { name: true, email: true, id: true, phone: true }
            },
            device: {
              select: { name: true, price: true, image: true, id: true }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.purchase.count({ where: whereClause }),
        prisma.purchase.aggregate({
          where: whereClause,
          _sum: {
            amount: true
          }
        })
      ]);

      const now = Date.now();
      const THREE_DAYS_MS = 0;

      const processedTransactions = transactions.map((tx: any) => {
        let isExpired = false;
        if (tx.paymentType === 'Downpayment' && tx.status === 'Active') {
          const txAge = now - new Date(tx.createdAt).getTime();
          if (txAge > THREE_DAYS_MS) {
            isExpired = true;
          }
        }
        return { ...tx, isExpired };
      });

      return NextResponse.json({
        transactions: processedTransactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalSales: aggregateSales._sum.amount || 0
      });
    }

    const transactions = await prisma.purchase.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, id: true, phone: true }
        },
        device: {
          select: { name: true, price: true, image: true, id: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Check expiration dynamically for downpayments
    const now = Date.now();
    const THREE_DAYS_MS = 0; // Temporarily set to 0 to demonstrate the expired badge

    const processedTransactions = transactions.map((tx: any) => {
      let isExpired = false;
      if (tx.paymentType === 'Downpayment' && tx.status === 'Active') {
        const txAge = now - new Date(tx.createdAt).getTime();
        if (txAge > THREE_DAYS_MS) {
          isExpired = true;
        }
      }
      return { ...tx, isExpired };
    });

    return NextResponse.json(processedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
