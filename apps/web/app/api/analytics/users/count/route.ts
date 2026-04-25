import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching user count:', error);
    return NextResponse.json({ error: 'Failed to fetch user count' }, { status: 500 });
  }
}
