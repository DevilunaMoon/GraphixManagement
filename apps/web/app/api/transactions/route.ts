import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';
import { formatDisplayInvoiceId, getBranchCode } from '../../../lib/invoice';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const branchParam = searchParams.get('branch');
    const imeiStatus = searchParams.get('imeiStatus') || 'all';
    
    // Build where clause with clean AND conditions
    const andConditions: any[] = [];
    if (isSuperAdmin) {
      if (branchParam && branchParam !== 'all') {
        andConditions.push({ branch: branchParam });
      }
    } else {
      andConditions.push({ branch: session.branch || 'Tagoloan' });
    }

    if (type === 'downpayment') {
      andConditions.push({ paymentType: 'Downpayment' });
    } else if (type === 'full') {
      andConditions.push({ paymentType: { in: ['Full', 'Cash', 'GCash', 'Split', 'Online', 'Buy Now (Full Payment)'] } });
    }

    if (search) {
      andConditions.push({
        OR: [
          {
            id: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            imei: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            referenceId: {
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
            user: {
              email: {
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
        ]
      });
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      andConditions.push({
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      });
    }

    if (imeiStatus === 'assigned' || imeiStatus === 'IMEI: Assigned') {
      andConditions.push({
        imei: { not: null },
        NOT: [
          { imei: '' },
          { imei: 'Pending Pickup' },
          { imei: 'pending' },
          { imei: 'null' },
          { imei: 'undefined' }
        ]
      });
    } else if (imeiStatus === 'pending' || imeiStatus === 'IMEI: Pending Pickup') {
      andConditions.push({
        OR: [
          { imei: null },
          { imei: '' },
          { imei: 'Pending Pickup' },
          { imei: 'null' },
          { imei: 'undefined' }
        ],
        device: {
          OR: [
            { name: { contains: 'iPhone', mode: 'insensitive' } },
            { name: { contains: 'Apple', mode: 'insensitive' } }
          ]
        }
      });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    // Build branch sequence lookup map across all purchases ordered by createdAt ascending
    const branchSeqMap = new Map<string, string>();
    try {
      const allPurchasesAsc = await prisma.purchase.findMany({
        select: { id: true, branch: true, createdAt: true, referenceId: true },
        orderBy: { createdAt: 'asc' }
      });

      const branchCounters: Record<string, number> = {};
      for (const p of allPurchasesAsc) {
        const bCode = getBranchCode(p.branch);
        branchCounters[bCode] = (branchCounters[bCode] || 0) + 1;
        let ref = p.referenceId;
        const isStd = typeof ref === 'string' && ref.replace(/^#/, '').match(/^GRPX-([TVJ]|[A-Z])-A\d+$/i);
        if (isStd && ref) {
          branchSeqMap.set(p.id, ref.startsWith('#') ? ref : `#${ref}`);
        } else {
          branchSeqMap.set(p.id, `#GRPX-${bCode}-A${branchCounters[bCode]}`);
        }
      }
    } catch (seqErr) {
      console.warn("Could not build global sequence map:", seqErr);
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
              select: { name: true, price: true, image: true, id: true, isPreOwned: true }
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
        return { 
          ...tx, 
          referenceId: branchSeqMap.get(tx.id) || formatDisplayInvoiceId(tx.referenceId || tx.id, tx.branch),
          isExpired 
        };
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
          select: { name: true, price: true, image: true, id: true, isPreOwned: true }
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
      return { 
        ...tx, 
        referenceId: branchSeqMap.get(tx.id) || formatDisplayInvoiceId(tx.referenceId || tx.id, tx.branch),
        isExpired 
      };
    });

    return NextResponse.json(processedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
