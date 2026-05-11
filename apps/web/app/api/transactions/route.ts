import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    // Build where clause
    const whereClause: any = {};
    if (type === 'downpayment') {
      whereClause.paymentType = 'Downpayment';
    } else if (type === 'full') {
      whereClause.paymentType = 'Full';
    }

    const transactions = await prisma.purchase.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, id: true }
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
