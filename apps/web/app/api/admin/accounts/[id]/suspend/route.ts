import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { duration } = await req.json();
    const { id } = await params;

    let suspendedUntil: Date | null = null;
    let status = 'Suspended';

    const now = new Date();

    switch (duration) {
      case '1_week':
        suspendedUntil = new Date(now.setDate(now.getDate() + 7));
        break;
      case '1_month':
        suspendedUntil = new Date(now.setMonth(now.getMonth() + 1));
        break;
      case '1_year':
        suspendedUntil = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      case 'permanent':
        // A date far in the future
        suspendedUntil = new Date('2099-12-31T23:59:59.000Z');
        break;
      case 'lift':
        suspendedUntil = null;
        status = 'Active';
        break;
      default:
        return NextResponse.json({ error: 'Invalid duration specified' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status,
        suspendedUntil,
      },
      select: { id: true, name: true, email: true, status: true, suspendedUntil: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error suspending account:', error);
    return NextResponse.json({ error: 'Failed to update account suspension status' }, { status: 500 });
  }
}
