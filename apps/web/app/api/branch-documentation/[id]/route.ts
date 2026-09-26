import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    // Super Admin is VIEW ONLY for branch documentation
    if (session.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin has view-only permissions for branch documentation.' },
        { status: 403 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, branch: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const userBranch = dbUser.branch || session.branch || 'Tagoloan';

    // Find the photo
    const doc = await prisma.branchDocumentation.findUnique({
      where: { id }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Branch Admin can only delete photos belonging to their assigned branch
    if (doc.branch.toLowerCase() !== userBranch.toLowerCase()) {
      return NextResponse.json(
        { error: `Forbidden: You can only delete photos from ${userBranch} branch.` },
        { status: 403 }
      );
    }

    await prisma.branchDocumentation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting branch documentation:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
