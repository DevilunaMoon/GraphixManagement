import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../../lib/session';
import { logActivity } from '../../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { duration } = await req.json();
    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, branch: true, status: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Only Super Admin can modify admin account status' }, { status: 403 });
    }

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
      select: { id: true, name: true, email: true, status: true, suspendedUntil: true, branch: true }
    });

    await logActivity({
      action: status === 'Active' ? 'LIFT_SUSPENSION' : 'SUSPEND_ACCOUNT',
      description: status === 'Active' 
        ? `Reactivated account for ${targetUser.name || targetUser.email}` 
        : `Suspended account for ${targetUser.name || targetUser.email} (Duration: ${duration})`,
      branch: targetUser.branch,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error suspending account:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update account suspension status' }, { status: 500 });
  }
}
