import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET() {
  try {
    const transactions = await prisma.purchase.findMany({
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

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
