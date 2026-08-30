import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { logActivity } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, address, phone, status } = body;

    const existingBranch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const trimmedName = name ? name.trim() : existingBranch.name;

    // If changing name, check uniqueness
    if (trimmedName !== existingBranch.name) {
      const nameConflict = await prisma.branch.findUnique({
        where: { name: trimmedName }
      });
      if (nameConflict) {
        return NextResponse.json({ error: `Branch name '${trimmedName}' is already in use` }, { status: 400 });
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        name: trimmedName,
        address: address !== undefined ? (address ? address.trim() : null) : existingBranch.address,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : existingBranch.phone,
        status: status || existingBranch.status
      }
    });

    // If branch name changed, update corresponding Users, Devices, Purchases, etc.
    if (trimmedName !== existingBranch.name) {
      await Promise.all([
        prisma.user.updateMany({
          where: { branch: existingBranch.name },
          data: { branch: trimmedName }
        }),
        prisma.device.updateMany({
          where: { branch: existingBranch.name },
          data: { branch: trimmedName }
        }),
        prisma.purchase.updateMany({
          where: { branch: existingBranch.name },
          data: { branch: trimmedName }
        }),
        prisma.repairRequest.updateMany({
          where: { branch: existingBranch.name },
          data: { branch: trimmedName }
        })
      ]);
    }

    await logActivity({
      action: 'UPDATE_BRANCH',
      description: `Updated branch '${existingBranch.name}'${existingBranch.name !== trimmedName ? ` to '${trimmedName}'` : ''} (Status: ${updated.status})`,
      details: JSON.stringify({ previous: existingBranch, updated }),
      branch: updated.name,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({ branch: updated, message: 'Branch updated successfully' });
  } catch (error) {
    console.error('Failed to update branch:', error);
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existingBranch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Check if branch has linked devices, staff, or purchases
    const [staffCount, devicesCount, purchasesCount] = await Promise.all([
      prisma.user.count({ where: { branch: existingBranch.name, role: { in: ['ADMIN', 'CASHIER'] } } }),
      prisma.device.count({ where: { branch: existingBranch.name } }),
      prisma.purchase.count({ where: { branch: existingBranch.name } })
    ]);

    if (staffCount > 0 || devicesCount > 0 || purchasesCount > 0) {
      // Instead of hard delete causing foreign key / orphaned records, deactivate it
      const deactivated = await prisma.branch.update({
        where: { id },
        data: { status: 'Inactive' }
      });

      await logActivity({
        action: 'DEACTIVATE_BRANCH',
        description: `Deactivated branch '${existingBranch.name}' (Contains ${staffCount} staff, ${devicesCount} devices, ${purchasesCount} orders)`,
        branch: existingBranch.name,
        userId: session.userId,
        userRole: session.role
      });

      return NextResponse.json({
        branch: deactivated,
        message: `Branch contains active records and was deactivated instead of deleted.`
      });
    }

    await prisma.branch.delete({
      where: { id }
    });

    await logActivity({
      action: 'DELETE_BRANCH',
      description: `Permanently deleted empty branch '${existingBranch.name}'`,
      branch: existingBranch.name,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Failed to delete branch:', error);
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 });
  }
}
