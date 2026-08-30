import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import { logActivity } from '../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, branch: true }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Only Super Admin can delete other Admins/Super Admins
    if (session.role !== 'SUPER_ADMIN' && (userToDelete.role === 'ADMIN' || userToDelete.role === 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Only Super Admin can delete admin accounts' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id },
    });

    await logActivity({
      action: 'DELETE_ACCOUNT',
      description: `Deleted ${userToDelete.role} account ${userToDelete.name || userToDelete.email} (${userToDelete.branch || 'No branch'})`,
      branch: userToDelete.branch,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
